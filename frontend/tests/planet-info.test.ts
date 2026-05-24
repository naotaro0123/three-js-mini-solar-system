import { describe, expect, it } from 'vitest';
import { getPlanetInfoPanelData } from '../src/utils/planet-info';

describe('planet-info', () => {
  it('地球はサイズをkm表記で返す', () => {
    const result = getPlanetInfoPanelData('EARTH', 1.0028);

    expect(result.name).toBe('Earth（地球）');
    expect(result.items).toEqual([
      { label: '太陽からの距離', value: '1.003 AU' },
      { label: '公転周期', value: '365日（1年）' },
      { label: '自転周期', value: '1日' },
      { label: 'サイズ', value: '約12,742 km' },
    ]);
  });

  it('地球以外はサイズを地球比とkmで返す', () => {
    const result = getPlanetInfoPanelData('JUPITER', 5.2044);

    expect(result.name).toBe('Jupiter（木星）');
    expect(result.items).toEqual([
      { label: '太陽からの距離', value: '5.204 AU' },
      { label: '公転周期', value: '4,333日（11.87年）' },
      { label: '自転周期', value: '0.41日' },
      { label: 'サイズ', value: '地球の10.97倍（約139,820 km）' },
    ]);
  });
});
