import { describe, expect, it } from 'vitest';
import { getPlanetZoomDistanceMultiplier } from '../src/utils/rimLight';

describe('rimLight', () => {
  it('PC幅でも惑星クリック時のズーム距離を少し遠めにする', () => {
    expect(getPlanetZoomDistanceMultiplier(1024)).toBe(1.65);
  });

  it('スマホ幅では惑星クリック時のズーム距離を少し遠めにする', () => {
    expect(getPlanetZoomDistanceMultiplier(375)).toBe(2.85);
    expect(getPlanetZoomDistanceMultiplier(767)).toBe(2.85);
  });
});
