import { jest, describe, test, expect, beforeAll, afterEach } from '@jest/globals';

// ── mocks (before any dynamic import) ────────────────────────────────────────

jest.unstable_mockModule('../../lib/config.js', () => ({
  config: {
    USGS_FEED_URL:
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson',
    ALERTS_TABLE: 'test-alerts',
  },
}));

const mockFetch = jest.fn<typeof fetch>();

// ── module bindings ───────────────────────────────────────────────────────────

let fetchSignificantQuakes: typeof import('../../providers/usgs.js').fetchSignificantQuakes;
let UpstreamError: typeof import('../../lib/errors.js').UpstreamError;

beforeAll(async () => {
  globalThis.fetch = mockFetch;
  ({ fetchSignificantQuakes } = await import('../../providers/usgs.js'));
  ({ UpstreamError } = await import('../../lib/errors.js'));
});

afterEach(() => {
  mockFetch.mockReset();
});

// ── helpers ───────────────────────────────────────────────────────────────────

function okResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function errorResponse(status: number): Response {
  return { ok: false, status, json: () => Promise.resolve(null) } as unknown as Response;
}

// ── fixtures ──────────────────────────────────────────────────────────────────

const BASE_FEATURE = {
  id: 'us7000n0bl',
  properties: {
    mag: 6.1,
    place: '150 km ENE of Kamaishi, Japan',
    time: 1735689600000,
  },
  geometry: {
    coordinates: [142.5, 39.2, 10.0],
  },
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe('fetchSignificantQuakes', () => {
  test('maps USGS feature to canonical Earthquake field-by-field', async () => {
    mockFetch.mockResolvedValue(okResponse({ features: [BASE_FEATURE] }));

    const quakes = await fetchSignificantQuakes();

    expect(quakes).toHaveLength(1);
    const q = quakes[0];
    expect(q.quake_id).toBe('us7000n0bl');
    expect(q.magnitude).toBe(6.1);
    expect(q.place).toBe('150 km ENE of Kamaishi, Japan');
    expect(q.time).toBe(1735689600000);
    expect(q.lon).toBe(142.5);  // coordinates[0] = lon
    expect(q.lat).toBe(39.2);   // coordinates[1] = lat
  });

  test('maps multiple features to multiple Earthquakes', async () => {
    const second = {
      id: 'us7000n0bm',
      properties: { mag: 7.4, place: '80 km NW of Tokyo, Japan', time: 1735689700000 },
      geometry: { coordinates: [138.1, 35.8, 20.0] },
    };
    mockFetch.mockResolvedValue(okResponse({ features: [BASE_FEATURE, second] }));

    const quakes = await fetchSignificantQuakes();

    expect(quakes).toHaveLength(2);
    expect(quakes[0].quake_id).toBe('us7000n0bl');
    expect(quakes[1].quake_id).toBe('us7000n0bm');
    expect(quakes[1].magnitude).toBe(7.4);
  });

  test('empty features array returns []', async () => {
    mockFetch.mockResolvedValue(okResponse({ features: [] }));

    const quakes = await fetchSignificantQuakes();

    expect(quakes).toEqual([]);
  });

  test('bad geometry (coordinates: []) → that quake skipped, others succeed', async () => {
    const badGeom = {
      id: 'bad-geom',
      properties: { mag: 5.5, place: 'Somewhere', time: 1735689600000 },
      geometry: { coordinates: [] },
    };
    const good = {
      id: 'good-after-bad',
      properties: { mag: 7.0, place: 'Good place', time: 1735689700000 },
      geometry: { coordinates: [120.0, 35.0, 5.0] },
    };
    mockFetch.mockResolvedValue(okResponse({ features: [badGeom, good] }));

    const quakes = await fetchSignificantQuakes();

    expect(quakes).toHaveLength(1);
    expect(quakes[0].quake_id).toBe('good-after-bad');
  });

  test('null magnitude → that quake skipped, others succeed', async () => {
    const nullMag = {
      id: 'null-mag',
      properties: { mag: null, place: 'Somewhere', time: 1735689600000 },
      geometry: { coordinates: [100.0, 30.0, 10.0] },
    };
    mockFetch.mockResolvedValue(okResponse({ features: [nullMag, BASE_FEATURE] }));

    const quakes = await fetchSignificantQuakes();

    expect(quakes).toHaveLength(1);
    expect(quakes[0].quake_id).toBe('us7000n0bl');
  });

  test('null place falls back to empty string', async () => {
    const nullPlace = {
      id: 'null-place',
      properties: { mag: 5.0, place: null, time: 1735689600000 },
      geometry: { coordinates: [100.0, 30.0, 10.0] },
    };
    mockFetch.mockResolvedValue(okResponse({ features: [nullPlace] }));

    const quakes = await fetchSignificantQuakes();

    expect(quakes).toHaveLength(1);
    expect(quakes[0].place).toBe('');
  });

  test('non-2xx response throws UpstreamError', async () => {
    mockFetch.mockResolvedValue(errorResponse(503));

    await expect(fetchSignificantQuakes()).rejects.toBeInstanceOf(UpstreamError);
  });

  test('invalid response schema throws UpstreamError', async () => {
    mockFetch.mockResolvedValue(okResponse({ not_features: [] }));

    await expect(fetchSignificantQuakes()).rejects.toBeInstanceOf(UpstreamError);
  });
});
