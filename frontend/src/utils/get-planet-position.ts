import { addDays, format, getDayOfYear } from 'date-fns';
import * as THREE from 'three';
import { planetPositionEndpoint, type RequestQueryBody, type ResponseData } from '../../../common';
import { deleteFromIndexedDB, getFromIndexedDB, saveToIndexedDB } from './indexed-db';
import { getOrbitalPeriod, getRotationPeriod } from './planet-periods';
import { AU_IN_UNITS, getStepSize } from './settings';
import { sleep } from './utils';

const API_HOST = import.meta.env.VITE_API_HOST.replace(/\/+$/, '');
const PLANET_POSITION_CACHE_PREFIX = 'planet-position-cache:v2';
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_FETCH_RETRIES = 3;

const closeOrbitPath = (points: THREE.Vector3[]): THREE.Vector3[] => {
  if (points.length === 0) return points;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (firstPoint.equals(lastPoint)) {
    return points;
  }

  return [...points, firstPoint.clone()];
};

export type PlanetPositionsRes = {
  todayRow: number;
  pathPoints: THREE.Vector3[];
};

const fetchPlanetPosition = async (url: string): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_FETCH_RETRIES) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_FETCH_RETRIES) {
        await sleep(300 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error('Planet position request failed');
};

type PlanetPositionCache = {
  pathPoints: Array<{ x: number; y: number; z: number }>;
};

const getTodayRow = (): number => {
  return getDayOfYear(new Date());
};

const getCacheKey = (
  commandKey: RequestQueryBody['COMMAND'],
  startDate: string,
  stopDate: string,
  stepSize: string,
) => {
  return `${PLANET_POSITION_CACHE_PREFIX}:${commandKey}:${startDate}:${stopDate}:${stepSize}`;
};

const loadPlanetPositionCache = async (cacheKey: string): Promise<PlanetPositionsRes | null> => {
  try {
    const record = await getFromIndexedDB<PlanetPositionCache>(cacheKey);
    if (!record) return null;
    if (!Array.isArray(record.pathPoints)) {
      await deleteFromIndexedDB(cacheKey);
      return null;
    }

    const pathPoints = record.pathPoints.map((point) => {
      return new THREE.Vector3(point.x, point.y, point.z);
    });

    return {
      todayRow: getTodayRow(),
      pathPoints,
    };
  } catch {
    return null;
  }
};

const savePlanetPositionCache = async (
  cacheKey: string,
  data: PlanetPositionsRes,
): Promise<void> => {
  const serializable: PlanetPositionCache = {
    pathPoints: data.pathPoints.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
    })),
  };

  await saveToIndexedDB(cacheKey, serializable);
};

export { getOrbitalPeriod, getRotationPeriod };

export const getPlanetPositions = async (
  commandKey: RequestQueryBody['COMMAND'],
): Promise<PlanetPositionsRes> => {
  const currentYear = new Date().getFullYear();
  const _startDate = new Date(`${currentYear}-01-01`);
  const startDate = format(_startDate, 'yyyy-MM-dd');
  const stopDateDays = getOrbitalPeriod(commandKey);

  const _endDate = addDays(_startDate, stopDateDays);
  const stopDate = format(_endDate, 'yyyy-MM-dd');
  const stepSize = getStepSize(commandKey);
  const cacheKey = getCacheKey(commandKey, startDate, stopDate, stepSize);
  const cachedResult = await loadPlanetPositionCache(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // 複数回同時にAPIを叩くと503エラーになるので少し待機する
  await sleep(50);
  // APIエンドポイントのURL(bun-mini-solar-systemリポジトリのサーバーを想定)
  const url = `${API_HOST}${planetPositionEndpoint}?START_TIME=${startDate}&STOP_TIME=${stopDate}&STEP_SIZE=${stepSize}&COMMAND=${commandKey}`;

  const result: PlanetPositionsRes = { todayRow: 0, pathPoints: [] };

  try {
    const response = await fetchPlanetPosition(url);
    const data = (await response.json()) as ResponseData;

    // データ解析
    if (data.result) {
      // 'result' キーの下にデータが含まれています
      const ephemerisData = data.result;
      // console.log('JPL Horizons APIから取得した地球の位置データ:');
      // console.log(ephemerisData);

      // ここでデータを解析・利用
      // 例: 'x'、'y'、'z' 座標を抽出
      const vectors = ephemerisData.split('\n').filter((line: string) => line.includes('X ='));
      const pathPoints: { x: number; y: number; z: number; day: number }[] = [];
      vectors.forEach((line: string, i: number) => {
        const parts = line.split(/[X,Y,Z, =]/).filter((p: string) => p.trim());
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        const z = parseFloat(parts[2]);
        pathPoints.push({ x, y, z, day: i + 1 });
      });

      // 座標を正規化する
      const transformedData = pathPoints.map((point) => {
        return new THREE.Vector3(
          point.x * AU_IN_UNITS,
          point.z * AU_IN_UNITS,
          // Three.jsはY軸が上方向なので、Z軸とY軸を入れ替える
          point.y * AU_IN_UNITS,
        );
      });
      result.pathPoints = closeOrbitPath(transformedData.reverse()); // 日付順にした上で始点と終点をつなげる

      result.todayRow = getTodayRow();
      await savePlanetPositionCache(cacheKey, result);
    } else {
      console.error('データの取得に失敗しました:', data);
    }
  } catch (error) {
    console.error('API呼び出し中にエラーが発生しました:', error);
  } finally {
    return result;
  }
};
