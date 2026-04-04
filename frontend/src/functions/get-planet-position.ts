import { addDays, format, getDayOfYear } from 'date-fns';
import * as THREE from 'three';
import { planetPositionEndpoint, type RequestQueryBody, type ResponseData } from '../../../common';
import { deleteFromIndexedDB, getFromIndexedDB, saveToIndexedDB } from './indexed-db';
import { getStepSize } from './settings';
import { sleep } from './utils';

const API_HOST = import.meta.env.VITE_API_HOST;
const PLANET_POSITION_CACHE_PREFIX = 'planet-position-cache:v1';
const TARGET_POINTS_PER_YEAR = 367; // 地球の場合に始点と終点をつなぐために365点以上必要になるため、少し余裕を持たせて367点にする

const normalizePathPointsToYear = (points: THREE.Vector3[]): THREE.Vector3[] => {
  if (points.length === 0) return points;
  if (points.length >= TARGET_POINTS_PER_YEAR) {
    return points.slice(0, TARGET_POINTS_PER_YEAR);
  }

  const normalized: THREE.Vector3[] = [];
  for (let i = 0; i < TARGET_POINTS_PER_YEAR; i++) {
    normalized.push(points[i % points.length].clone());
  }
  return normalized;
};

export type PlanetPositionsRes = {
  todayRow: number;
  pathPoints: THREE.Vector3[];
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

const savePlanetPositionCache = async (cacheKey: string, data: PlanetPositionsRes): Promise<void> => {
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
export const getOrbitalPeriod = (commandKey: RequestQueryBody['COMMAND']) => {
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
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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
      const AU_IN_UNITS = 90; // 1AUを90に設定
      const transformedData = pathPoints.map((point) => {
        return new THREE.Vector3(
          point.x * AU_IN_UNITS,
          point.z * AU_IN_UNITS,
          // Three.jsはY軸が上方向なので、Z軸とY軸を入れ替える
          point.y * AU_IN_UNITS,
        );
      });
      result.pathPoints = normalizePathPointsToYear(transformedData.reverse()); // 日付順にした上で365列に揃える

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
