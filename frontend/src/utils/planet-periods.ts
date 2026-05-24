import type { RequestQueryBody } from '../../../common';

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
