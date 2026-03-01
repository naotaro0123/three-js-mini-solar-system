export const settings = {
  lerpFrame: 60, // 1日を何フレームで補間するか
  accelerationOrbit: 1, // 公転スピード
  accelerationRotation: 1, // 自転スピード
  sunIntensity: 2.1, // 太陽の明るさ
  isAnimating: false, // アニメーションの再生/停止
};

// 地球のサイズと自転軸の傾き
export const EARTH_SIZE = 6.4;
export const EARTH_TILT = 23.4;
export const EARTH_NAME = 'Earth';
export const EARTH_ORBIT_COLOR = 0xffffff;
// 月は地球の約1/4（1/3.7）の大きさ
export const EARTH_MOON_SIZE = EARTH_SIZE / 3.7;

// 太陽は地球の約109倍の大きさ（他の惑星が豆粒になるため、1/40縮小版で表示）
export const SUN_SIZE = (EARTH_SIZE * 109) / 40;

// 水星のサイズと自転軸の傾き
export const MERCURY_SIZE = 2.4;
export const MERCURY_TILT = 40;
export const MERCURY_NAME = 'Mercury';
export const MERCURY_ORBIT_COLOR = 0x0099ff;

// 金星のサイズと自転軸の傾き
export const VENUS_SIZE = 6.1;
export const VENUS_TILT = 177.4;
export const VENUS_NAME = 'Venus';
export const VENUS_ORBIT_COLOR = 0xffd700;

// 火星のサイズと自転軸の傾き
export const MARS_SIZE = 3.4;
export const MARS_TILT = 25.2;
export const MARS_NAME = 'Mars';
export const MARS_ORBIT_COLOR = 0xff4500;
