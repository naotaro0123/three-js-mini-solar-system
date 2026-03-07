import { addDays, format, getDayOfYear } from 'date-fns';
import * as THREE from 'three';
import { planetPositionEndpoint, type RequestQueryBody, type ResponseData } from '../../../common';
import { sleep } from './utils';

const API_HOST = import.meta.env.VITE_API_HOST;
const PLANET_POSITION_CACHE_PREFIX = 'planet-position-cache:v1';

export type PlanetPositionRes = {
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
) => {
  return `${PLANET_POSITION_CACHE_PREFIX}:${commandKey}:${startDate}:${stopDate}`;
};

const loadPlanetPositionCache = (cacheKey: string): PlanetPositionRes | null => {
  const cached = localStorage.getItem(cacheKey);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as PlanetPositionCache;
    if (!Array.isArray(parsed.pathPoints) || typeof parsed.todayRow !== 'number') {
      localStorage.removeItem(cacheKey);
      return null;
    }

    const pathPoints = parsed.pathPoints.map((point) => {
      return new THREE.Vector3(point.x, point.y, point.z);
    });

    return {
      todayRow: parsed.todayRow,
      pathPoints,
    };
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
};

const savePlanetPositionCache = (cacheKey: string, data: PlanetPositionRes) => {
  const serializable: PlanetPositionCache = {
    todayRow: data.todayRow,
    pathPoints: data.pathPoints.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
    })),
  };

  localStorage.setItem(cacheKey, JSON.stringify(serializable));
};
// 公転日数
export const getOrbitalPeriod = (commandKey: RequestQueryBody['COMMAND']) => {
  switch (commandKey) {
    case 'EARTH':
      return 365;
    case 'MERCURY': // 水星
      return 88;
    case 'VENUS': // 金星
      return 225;
    case 'MARS': // 火星
      return 687;
    case 'JUPITER': // 木星
      return 4333; // 約11.86年
    default:
      return 364;
  }
};
// 自転日数
export const getRotationPeriod = (commandKey: RequestQueryBody['COMMAND']) => {
  switch (commandKey) {
    case 'EARTH':
      return 1;
    case 'MERCURY': // 水星
      return 58.6;
    case 'VENUS': // 金星
      return 243; // 金星は自転が逆向きで約243日。VENUS_TILTで回転させてるので、ここでは243日で計算する
    case 'MARS': // 火星
      return 1.03; // 約24.6時間
    case 'JUPITER': // 木星
      return 0.41; // 約9.9時間
    default:
      return 1;
  }
};
const getStepSize = (commandKey: RequestQueryBody['COMMAND']) => {
  // TODO: 木星以降は日数を検討する
  // https://ssd-api.jpl.nasa.gov/doc/horizons.html#stepping
  switch (commandKey) {
    case 'JUPITER': // 木星
      return '1months';
    case 'MARS': // 火星
      return '5days';
    default:
      return '1days';
  }
};

export const getPlanetPosition = async (
  commandKey: RequestQueryBody['COMMAND'],
): Promise<PlanetPositionRes> => {
  const currentYear = new Date().getFullYear();
  const _startDate = new Date(`${currentYear}-01-01`);
  const startDate = format(_startDate, 'yyyy-MM-dd');

  const _endDate = addDays(_startDate, getOrbitalPeriod(commandKey));
  const stopDate = format(_endDate, 'yyyy-MM-dd');
  const StepSize = getStepSize(commandKey);
  const cacheKey = getCacheKey(commandKey, startDate, stopDate);
  const cachedResult = loadPlanetPositionCache(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // 複数回同時にAPIを叩くと503エラーになるので少し待機する
  await sleep(50);
  // APIエンドポイントのURL(bun-mini-solar-systemリポジトリのサーバーを想定)
  const url = `${API_HOST}${planetPositionEndpoint}?START_TIME=${startDate}&STOP_TIME=${stopDate}&STEP_SIZE=${StepSize}&COMMAND=${commandKey}`;

  const result: PlanetPositionRes = { todayRow: 0, pathPoints: [] };

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
      result.pathPoints = transformedData.reverse(); // 日付順にするため反転

      const today = new Date();
      const dayOfYearWithDfs = getDayOfYear(today);
      result.todayRow = dayOfYearWithDfs;
      savePlanetPositionCache(cacheKey, result);
    } else {
      console.error('データの取得に失敗しました:', data);
    }
  } catch (error) {
    console.error('API呼び出し中にエラーが発生しました:', error);
  } finally {
    return result;
  }
};
