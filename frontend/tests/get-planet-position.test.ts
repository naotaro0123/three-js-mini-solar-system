import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFromIndexedDB: vi.fn(),
  deleteFromIndexedDB: vi.fn(),
  saveToIndexedDB: vi.fn(),
  sleep: vi.fn(() => Promise.resolve()),
}));

vi.mock('../src/utils/indexed-db', () => ({
  deleteFromIndexedDB: mocks.deleteFromIndexedDB,
  getFromIndexedDB: mocks.getFromIndexedDB,
  saveToIndexedDB: mocks.saveToIndexedDB,
}));

vi.mock('../src/utils/utils', () => ({
  sleep: mocks.sleep,
}));

describe('get-planet-position', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T12:00:00Z'));
    vi.stubEnv('VITE_API_HOST', 'https://example.com/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('returns rotation periods for supported planets', async () => {
    const { getRotationPeriod } = await import('../src/utils/get-planet-position');

    expect(getRotationPeriod('EARTH')).toBe(1);
    expect(getRotationPeriod('MERCURY')).toBe(58.6);
    expect(getRotationPeriod('NEPTUNE')).toBe(0.67);
  });

  it('returns cached positions without fetching', async () => {
    const cachedResult = {
      todayRow: 123,
      pathPoints: [{ x: 1, y: 2, z: 3 }],
    };
    mocks.getFromIndexedDB.mockResolvedValueOnce(cachedResult);

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { getPlanetPositions } = await import('../src/utils/get-planet-position');

    const result = await getPlanetPositions('EARTH');

    expect(result).toEqual({
      todayRow: 123,
      pathPoints: [new THREE.Vector3(1, 2, 3)],
    });
    expect(mocks.getFromIndexedDB).toHaveBeenCalledWith(
      'planet-position-cache:v2:EARTH:2026-01-01:2027-01-01:1days',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mocks.saveToIndexedDB).not.toHaveBeenCalled();
  });

  it('parses API results, normalizes coordinates, and saves cache', async () => {
    mocks.getFromIndexedDB.mockResolvedValueOnce(null);
    mocks.saveToIndexedDB.mockResolvedValueOnce(undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          result: [
            'X = 1, Y = 2, Z = 3',
            'X = 4, Y = 5, Z = 6',
          ].join('\n'),
          signature: {
            version: '1',
            source: 'test',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const { getPlanetPositions } = await import('../src/utils/get-planet-position');
    const result = await getPlanetPositions('EARTH');

    expect(result.todayRow).toBe(124);
    expect(result.pathPoints).toHaveLength(3);
    expect(result.pathPoints[0]).toEqual(new THREE.Vector3(360, 540, 450));
    expect(result.pathPoints[1]).toEqual(new THREE.Vector3(90, 270, 180));
    expect(result.pathPoints[2]).toEqual(new THREE.Vector3(360, 540, 450));
    expect(mocks.saveToIndexedDB).toHaveBeenCalledWith(
      'planet-position-cache:v2:EARTH:2026-01-01:2027-01-01:1days',
      expect.objectContaining({
        todayRow: 124,
        pathPoints: [
          { x: 360, y: 540, z: 450 },
          { x: 90, y: 270, z: 180 },
          { x: 360, y: 540, z: 450 },
        ],
      }),
    );
  });
});
