import type { RequestQueryBody } from '../../../common';
import { getOrbitalPeriod, getRotationPeriod } from './planet-periods';

type PlanetInfoItem = {
  label: string;
  value: string;
};

export type PlanetInfoPanelData = {
  name: string;
  items: PlanetInfoItem[];
};

const EARTH_DIAMETER_KM = 12742;

const planetDisplayNameMap: Record<RequestQueryBody['COMMAND'], string> = {
  MERCURY: 'Mercury（水星）',
  VENUS: 'Venus（金星）',
  EARTH: 'Earth（地球）',
  MARS: 'Mars（火星）',
  JUPITER: 'Jupiter（木星）',
  SATURN: 'Saturn（土星）',
  URANUS: 'Uranus（天王星）',
  NEPTUNE: 'Neptune（海王星）',
  PLUTO: 'Pluto（冥王星）',
};

const planetDiameterKmMap: Record<RequestQueryBody['COMMAND'], number> = {
  MERCURY: 4879,
  VENUS: 12104,
  EARTH: EARTH_DIAMETER_KM,
  MARS: 6779,
  JUPITER: 139820,
  SATURN: 116460,
  URANUS: 50724,
  NEPTUNE: 49244,
  PLUTO: 2377,
};

const formatNumber = (value: number, maximumFractionDigits = 2): string => {
  return value.toLocaleString('ja-JP', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
};

const formatDistanceAu = (distanceAu: number): string => {
  const maximumFractionDigits = distanceAu >= 10 ? 2 : 3;
  return `${formatNumber(distanceAu, maximumFractionDigits)} AU`;
};

const formatDays = (days: number): string => {
  return `${formatNumber(days, 2)}日`;
};

const formatOrbitalPeriod = (days: number): string => {
  const dayText = formatDays(days);
  if (days < 365) return dayText;

  return `${dayText}（${formatNumber(days / 365, 2)}年）`;
};

const formatPlanetSize = (commandKey: RequestQueryBody['COMMAND']): string => {
  const diameterKm = planetDiameterKmMap[commandKey];
  if (commandKey === 'EARTH') {
    return `約${formatNumber(diameterKm, 0)} km`;
  }

  const earthRatio = diameterKm / EARTH_DIAMETER_KM;
  return `地球の${formatNumber(earthRatio, 2)}倍（約${formatNumber(diameterKm, 0)} km）`;
};

export const getPlanetInfoPanelData = (
  commandKey: RequestQueryBody['COMMAND'],
  distanceAu: number,
): PlanetInfoPanelData => {
  return {
    name: planetDisplayNameMap[commandKey],
    items: [
      {
        label: '太陽からの距離',
        value: formatDistanceAu(distanceAu),
      },
      {
        label: '公転周期',
        value: formatOrbitalPeriod(getOrbitalPeriod(commandKey)),
      },
      {
        label: '自転周期',
        value: formatDays(getRotationPeriod(commandKey)),
      },
      {
        label: 'サイズ',
        value: formatPlanetSize(commandKey),
      },
    ],
  };
};
