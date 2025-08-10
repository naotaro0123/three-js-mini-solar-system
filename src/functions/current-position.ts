type ResponseData = {
  result: string;
  signature: {
    version: string;
    source: string;
  };
};

// https://gemini.google.com/app/61be90ce2865bec9
// TODO: ブラウザで実行時は返ってくるがFetchでエラーになる
export const getCurrentPosition = async () => {
  const url =
    "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='399'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='@sun'&START_TIME='2025-08-10'&STOP_TIME='2025-08-11'&STEP_SIZE='1 h'&VEC_TABLE='1'";

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
