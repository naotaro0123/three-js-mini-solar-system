import { addDays, format } from 'date-fns';

type ResponseData = {
  result: string;
  signature: {
    version: string;
    source: string;
  };
};

export const getCurrentPosition = async () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const startDate = format(today, 'yyyy-MM-dd');
  const stopDate = format(tomorrow, 'yyyy-MM-dd');
  // APIエンドポイントのURL(bun-mini-solar-systemリポジトリのサーバーを想定)
  const url = `http://localhost:3000/api/v1/earth-current-position?START_TIME=${startDate}&STOP_TIME=${stopDate}`;

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
        const parts = line.split(/[=,]/).map((p) => p.trim());
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[3]);
        const z = parseFloat(parts[5]);
        console.log(`X: ${x}, Y: ${y}, Z: ${z} (AU)`);
      });
    } else {
      console.error('データの取得に失敗しました:', data);
    }
  } catch (error) {
    console.error('API呼び出し中にエラーが発生しました:', error);
  }
};
