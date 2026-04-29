import { addDays, format, getDayOfYear } from 'date-fns';
import * as THREE from 'three';
import { planetPositionEndpoint, type RequestQueryBody, type ResponseData } from '../../../common';
import { deleteFromIndexedDB, getFromIndexedDB, saveToIndexedDB } from './indexed-db';
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
  todayRow: number;
  pathPoints: Array<{ x: number; y: number; z: number }>;
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
    if (!Array.isArray(record.pathPoints) || typeof record.todayRow !== 'number') {
      await deleteFromIndexedDB(cacheKey);
      return null;
    }

    const pathPoints = record.pathPoints.map((point) => {
      return new THREE.Vector3(point.x, point.y, point.z);
    });

    return {
      todayRow: record.todayRow,
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
    todayRow: data.todayRow,
    pathPoints: data.pathPoints.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
    })),
  };

  await saveToIndexedDB(cacheKey, serializable);
};

// 公転日数
const getOrbitalPeriod = (commandKey: RequestQueryBody['COMMAND']) => {
  switch (commandKey) {
    case 'EARTH': // 地球(約1年)
      return 365;
    case 'MERCURY': // 水星(約0.24年)
      return 88;
    case 'VENUS': // 金星(約0.615年)
      return 225;
    case 'MARS': // 火星(約1.88年)
      return 687;
    case 'JUPITER': // 木星(約11.86年)
      return 4333;
    case 'SATURN': // 土星(約29.46年)
      return 10759;
    case 'URANUS': // 天王星(約84年)
      return 30687;
    case 'NEPTUNE': // 海王星(約165年)
      return 60190;
    default:
      return 364;
  }
};

// 自転日数
export const getRotationPeriod = (commandKey: RequestQueryBody['COMMAND']) => {
  switch (commandKey) {
    case 'EARTH': // 地球（約1日 = 約24時間）
      return 1;
    case 'MERCURY': // 水星（約58.6日 = 約1406.4時間）
      return 58.6;
    case 'VENUS': // 金星（約243日 = 約5832時間）
      return 243; // 自転が逆向きでVENUS_TILTで回転させるため、マイナスでなくプラスで計算する
    case 'MARS': // 火星（約1.03日 = 約24.7時間）
      return 1.03;
    case 'JUPITER': // 木星（約0.41日 = 約9.9時間）
      return 0.41;
    case 'SATURN': // 土星（約0.45日 = 約10.7時間）
      return 0.45;
    case 'URANUS': // 天王星（約0.72日 = 約17.2時間）
      return 0.72;
    case 'NEPTUNE': // 海王星（約0.67日 = 約16.1時間）
      return 0.67;
    default:
      return 1;
  }
};

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
      const vectors = ephemerisData.split('\n').filter((line) => line.includes('X ='));
      const pathPoints: { x: number; y: number; z: number; day: number }[] = [];
      vectors.forEach((line, i) => {
        const parts = line.split(/[X,Y,Z, =]/).filter((p) => p.trim());
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

      const today = new Date();
      const dayOfYearWithDfs = getDayOfYear(today);
      result.todayRow = dayOfYearWithDfs;
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
