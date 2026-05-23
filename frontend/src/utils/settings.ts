import type { RequestQueryBody } from '../../../common';

export const settings = {
  lerpFrame: 60, // 1日を何フレームで補間するか
  accelerationOrbit: 1, // 公転スピード
  accelerationRotation: 1, // 自転スピード
  sunIntensity: 2.1, // 太陽の明るさ
  zoomMinDistance: 5, // ズームの最小距離
  zoomMaxDistance: 4500, // ズームの最大距離
  isAnimating: true, // アニメーション全体の再生/停止
  isOrbitPausedByZoom: false, // 惑星ズーム中のみ公転アニメーションを停止
  showOrbits: true, // 公転軌道の表示/非表示
  showLabels: true, // 惑星名ラベルの表示/非表示
  showPlanets: true, // 惑星の表示/非表示
};

export const ZOOM_DISTANCE_LIMIT_MIN = 1;
export const ZOOM_DISTANCE_LIMIT_MAX = 5000;
export const ZOOM_DISTANCE_STEP = 1;

// 地球のサイズと自転軸の傾き
export const EARTH_SIZE = 6.4;
export const EARTH_TILT = 23.4;
export const EARTH_NAME = 'Earth';
const EARTH_ORBIT_COLOR = 0xffffff;
// 月は地球の約1/4（1/3.7）の大きさ
export const EARTH_MOON_SIZE = EARTH_SIZE / 3.7;
export const EARTH_MOON_ORBITAL_TILT = 5; // 月の軌道傾斜角（度）
export const EARTH_MOON_ORBITAL_PERIOD_DAYS = 27.322; // 月の公転周期（恒星月）
export const EARTH_ATMOSPHERE_ROTATION_OFFSET = 0.00002; // 大気の回転オフセット
export const VENUS_ATMOSPHERE_ROTATION_MULTIPLIER = 60; // 金星スーパーローテーション倍率

// 太陽は地球の約109倍の大きさ（他の惑星が豆粒になるため、1/40縮小版で表示）
export const SUN_SIZE = (EARTH_SIZE * 109) / 40;
export const SUN_ROTATION_SPEED = 0.001; // 太陽の自転速度
export const SUN_EMISSIVE_COLOR = 0xfff88f; // 太陽の発光色

// 太陽の光源設定
export const SUN_POINT_LIGHT_COLOR = 0xfdffd3; // 近距離の惑星向けの主光源色
export const SUN_POINT_LIGHT_INTENSITY = 100;
export const SUN_POINT_LIGHT_DECAY = 1.4;
export const SUN_FILL_LIGHT_COLOR = 0xe8efff; // 外惑星向けの補助光源色
export const SUN_FILL_LIGHT_INTENSITY = 20;
export const SUN_FILL_LIGHT_DISTANCE = 80000;
export const SUN_FILL_LIGHT_DECAY = 0.5;

// AU変換係数（1AUを何単位にするか）
export const AU_IN_UNITS = 90;

// 水星のサイズと自転軸の傾き
export const MERCURY_SIZE = 2.4;
export const MERCURY_TILT = 2.1;
export const MERCURY_NAME = 'Mercury';
const MERCURY_ORBIT_COLOR = 0x0099ff;

// 金星のサイズと自転軸の傾き
export const VENUS_SIZE = 6.1;
export const VENUS_TILT = 177.4;
export const VENUS_NAME = 'Venus';
const VENUS_ORBIT_COLOR = 0xffd700;

// 火星のサイズと自転軸の傾き
export const MARS_SIZE = EARTH_SIZE * 0.53; // 火星は地球の約0.53倍の大きさ
export const MARS_TILT = 25.2;
export const MARS_NAME = 'Mars';
const MARS_ORBIT_COLOR = 0xff4500;

// 木星のサイズと自転軸の傾き
export const JUPITER_SIZE = EARTH_SIZE * 11; // 木星は地球の約11倍の大きさ
export const JUPITER_TILT = 3.13;
export const JUPITER_NAME = 'Jupiter';
const JUPITER_ORBIT_COLOR = 0x009900;

// 土星のサイズと自転軸の傾き
export const SATURN_SIZE = EARTH_SIZE * 9.4; // 土星は地球の約9.4倍の大きさ
export const SATURN_TILT = 26.7;
export const SATURN_NAME = 'Saturn';
const SATURN_ORBIT_COLOR = 0x996600;

// 天王星のサイズと自転軸の傾き
export const URANUS_SIZE = EARTH_SIZE * 4; // 天王星は地球の約4倍の大きさ
export const URANUS_TILT = 97.8;
export const URANUS_NAME = 'Uranus';
const URANUS_ORBIT_COLOR = 0x660099;

// 海王星のサイズと自転軸の傾き
export const NEPTUNE_SIZE = EARTH_SIZE * 3.9; // 海王星は地球の約3.9倍の大きさ
export const NEPTUNE_TILT = 28.3;
export const NEPTUNE_NAME = 'Neptune';
const NEPTUNE_ORBIT_COLOR = 0x3366ff;

const DEFAULT_STEP_DAYS = 1;
const MARS_STEP_DAYS = 5;
const JUPITER_STEP_DAYS = 30; // 木星は公転周期が約12年と長いため、1日のフレーム数を減らす
const SATURN_STEP_DAYS = 90; // 土星は公転周期が約29年と長いため、1日のフレーム数を減らす
const URANUS_STEP_DAYS = 120; // 天王星は公転周期が約84年と長いため、1日のフレーム数を減らす
const NEPTUNE_STEP_DAYS = 180; // 海王星は公転周期が約165年と長いため、1日のフレーム数を減らす

export const getStepDays = (commandKey: RequestQueryBody['COMMAND']) => {
  switch (commandKey) {
    case 'JUPITER':
      return JUPITER_STEP_DAYS;
    case 'MARS':
      return MARS_STEP_DAYS;
    case 'SATURN':
      return SATURN_STEP_DAYS;
    case 'URANUS':
      return URANUS_STEP_DAYS;
    case 'NEPTUNE':
      return NEPTUNE_STEP_DAYS;
    default:
      return DEFAULT_STEP_DAYS;
  }
};

export const getStepSize = (commandKey: RequestQueryBody['COMMAND']) => {
  return `${getStepDays(commandKey)}days`;
};

export const getOrbitColor = (commandKey: RequestQueryBody['COMMAND']): number => {
  switch (commandKey) {
    case 'EARTH':
      return EARTH_ORBIT_COLOR;
    case 'MERCURY':
      return MERCURY_ORBIT_COLOR;
    case 'VENUS':
      return VENUS_ORBIT_COLOR;
    case 'MARS':
      return MARS_ORBIT_COLOR;
    case 'JUPITER':
      return JUPITER_ORBIT_COLOR;
    case 'SATURN':
      return SATURN_ORBIT_COLOR;
    case 'URANUS':
      return URANUS_ORBIT_COLOR;
    case 'NEPTUNE':
      return NEPTUNE_ORBIT_COLOR;
    default:
      return EARTH_ORBIT_COLOR;
  }
};
