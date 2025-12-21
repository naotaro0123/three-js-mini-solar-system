import { addDays, format, getDayOfYear } from 'date-fns';
import * as THREE from 'three';
import { planetPositionEndpoint, type RequestQueryBody, type ResponseData } from './common';

const API_HOST = import.meta.env.VITE_API_HOST;

export type PlanetPositionRes = {
  todayRow: number;
  pathPoints: THREE.Vector3[];
};

export const getPlanetPosition = async (
  commandKey: RequestQueryBody['COMMAND'],
): Promise<PlanetPositionRes> => {
  const currentYear = new Date().getFullYear();
  const _startDate = new Date(`${currentYear}-01-01`);
  const startDate = format(_startDate, 'yyyy-MM-dd');

  // 公転日数
  const orbitalPeriod = () => {
    switch (commandKey) {
      case 'EARTH':
        return 365;
      case 'MERCURY':
        return 88;
      default:
        return 364;
    }
  };

  const _endDate = addDays(_startDate, orbitalPeriod());
  console.log(_endDate);
  const stopDate = format(_endDate, 'yyyy-MM-dd');
  const StepSize = '1d'; // '1d': 1日ごと, '1 mo: 1ヶ月ごと
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
      console.log('JPL Horizons APIから取得した地球の位置データ:');
      console.log(ephemerisData);

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

      // 座標を正規化する（太陽から地球の距離を90とする）
      {
        // 座標範囲を設定
        const newRangeX = 90;
        const newRangeZ = 90;
        // 最大絶対値を計算
        const maxAbsX = Math.max(...pathPoints.map((p) => Math.abs(p.x)));
        const maxAbsY = Math.max(...pathPoints.map((p) => Math.abs(p.y)));
        const transformedData = pathPoints.map((point) => {
          return new THREE.Vector3(
            // X軸は-90から90の範囲に変換
            (point.x / maxAbsX) * newRangeX,
            // Z軸は-90から90の範囲に変換
            // Three.jsはY軸が上方向なので、Z軸とY軸を入れ替える
            (point.y / maxAbsY) * newRangeZ,
          );
        });
        result.pathPoints = transformedData.reverse(); // 日付順にするため反転
      }

      const today = new Date();
      const dayOfYearWithDfs = getDayOfYear(today);
      result.todayRow = dayOfYearWithDfs;
    } else {
      console.error('データの取得に失敗しました:', data);
    }
  } catch (error) {
    console.error('API呼び出し中にエラーが発生しました:', error);
  } finally {
    return result;
  }
};
