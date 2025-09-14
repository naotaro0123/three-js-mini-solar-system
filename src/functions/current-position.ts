import { addDays, format } from 'date-fns';

type ResponseData = {
  result: string;
  signature: {
    version: string;
    source: string;
  };
};

type ResponseResults = { x: number; y: number; z: number }[];

export const getCurrentPosition = async (): Promise<ResponseResults> => {
  const today = new Date('2025-01-01');
  const tomorrow = addDays(today, 365);
  const startDate = format(today, 'yyyy-MM-dd');
  const stopDate = format(tomorrow, 'yyyy-MM-dd');
  const StepSize = '1d'; // '1d': 1日ごと, '1 mo: 1ヶ月ごと
  // APIエンドポイントのURL(bun-mini-solar-systemリポジトリのサーバーを想定)
  const url = `http://localhost:3000/api/v1/earth-current-position?START_TIME=${startDate}&STOP_TIME=${stopDate}&STEP_SIZE=${StepSize}`;
  const result: ResponseResults = [];

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
      vectors.forEach((line) => {
        const parts = line.split(/[X,Y,Z, =]/).filter((p) => p.trim());
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        const z = parseFloat(parts[2]);
        result.push({ x, y, z });
      });
    } else {
      console.error('データの取得に失敗しました:', data);
    }
  } catch (error) {
    console.error('API呼び出し中にエラーが発生しました:', error);
  } finally {
    console.log('result:', result);
    return result;
  }
};
