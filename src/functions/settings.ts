export const settings = {
  lerpFrame: 60, // 1日を何フレームで補間するか
  accelerationOrbit: 1, // 公転スピード
  accelerationRotation: 1, // 自転スピード
  sunIntensity: 2.1, // 太陽の明るさ
  isAnimating: false, // アニメーションの再生/停止
};

export const EARTH_SIZE = 6.4;
// 月は地球の約1/4（1/3.7）の大きさ
export const MOON_SIZE = EARTH_SIZE / 3.7;
// 太陽は地球の約109倍の大きさ（他の惑星が豆粒になるため、1/40縮小版で表示）
export const SUN_SIZE = (EARTH_SIZE * 109) / 40;
