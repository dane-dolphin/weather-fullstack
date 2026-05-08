import { jest, describe, test, expect, beforeAll, afterEach } from '@jest/globals';

// ── mocks (before any dynamic import) ────────────────────────────────────────

jest.unstable_mockModule('../../lib/config.js', () => ({
  config: {
    NWS_USER_AGENT: 'test-agent/1.0 (test@example.com)',
  },
}));

const mockFetch = jest.fn<typeof fetch>();

// ── module bindings ───────────────────────────────────────────────────────────

let fetchActiveAlertsForState: typeof import('../../providers/nws.js').fetchActiveAlertsForState;
let UpstreamError: typeof import('../../lib/errors.js').UpstreamError;

beforeAll(async () => {
  globalThis.fetch = mockFetch;
  ({ fetchActiveAlertsForState } = await import('../../providers/nws.js'));
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
  properties: {
    id: 'urn:oid:2.49.0.1.840.0.abc123def456',
    event: 'Tornado Warning',
    severity: 'Extreme',
    areaDesc: 'Eastern Texas',
    effective: '2026-01-01T18:00:00Z',
    expires: '2026-01-02T00:00:00Z',
    headline: 'Tornado Warning issued for Eastern Texas',
    description: 'A tornado was observed near the area.',
    affectedZones: [
      'https://api.weather.gov/zones/forecast/TXZ192',
      'https://api.weather.gov/zones/county/TXC453',
    ],
    geocode: {
      UGC: ['TXZ192', 'TXC453'],
      SAME: ['048453', '048113'],
    },
  },
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe('fetchActiveAlertsForState', () => {
  test('maps NWS feature to canonical Alert field-by-field', async () => {
    mockFetch.mockResolvedValue(okResponse({ features: [BASE_FEATURE] }));

    const alerts = await fetchActiveAlertsForState('TX');

    expect(alerts).toHaveLength(1);
    const alert = alerts[0];
    expect(alert.alert_id).toBe('urn:oid:2.49.0.1.840.0.abc123def456');
    expect(alert.state).toBe('TX');
    expect(alert.event).toBe('Tornado Warning');
    expect(alert.severity).toBe('Extreme');
    expect(alert.headline).toBe('Tornado Warning issued for Eastern Texas');
    expect(alert.description).toBe('A tornado was observed near the area.');
    expect(alert.is_state_wide).toBe(false);
    expect(alert.source).toBe('nws');
    expect(alert.effective).toBe('2026-01-01T18:00:00Z');
    expect(alert.expires).toBe('2026-01-02T00:00:00Z');
  });

  test('maps multiple features to multiple Alerts', async () => {
    const second = {
      properties: {
        ...BASE_FEATURE.properties,
        id: 'urn:oid:second-alert',
        event: 'Flash Flood Warning',
        severity: 'Severe',
      },
    };
    mockFetch.mockResolvedValue(okResponse({ features: [BASE_FEATURE, second] }));

    const alerts = await fetchActiveAlertsForState('TX');

    expect(alerts).toHaveLength(2);
    expect(alerts[0].event).toBe('Tornado Warning');
    expect(alerts[1].event).toBe('Flash Flood Warning');
    expect(alerts[1].severity).toBe('Severe');
  });

  test('empty features array returns []', async () => {
    mockFetch.mockResolvedValue(okResponse({ features: [] }));

    const alerts = await fetchActiveAlertsForState('TX');

    expect(alerts).toEqual([]);
  });

  test('non-2xx response throws UpstreamError', async () => {
    mockFetch.mockResolvedValue(errorResponse(503));

    await expect(fetchActiveAlertsForState('TX')).rejects.toBeInstanceOf(UpstreamError);
  });

  test('affected_zones unions affectedZones URLs with geocode.UGC and deduplicates', async () => {
    // TXZ192 appears in both URL list and UGC list → only once in union
    // TXF001 appears in URL only
    // TXC453 appears in UGC only
    const feature = {
      properties: {
        ...BASE_FEATURE.properties,
        affectedZones: [
          'https://api.weather.gov/zones/forecast/TXZ192',
          'https://api.weather.gov/zones/fire/TXF001',
        ],
        geocode: {
          UGC: ['TXZ192', 'TXC453'],
          SAME: ['048453'],
        },
      },
    };
    mockFetch.mockResolvedValue(okResponse({ features: [feature] }));

    const alerts = await fetchActiveAlertsForState('TX');

    expect(alerts).toHaveLength(1);
    const zones = alerts[0].affected_zones;
    expect(zones).toContain('TXZ192');
    expect(zones).toContain('TXF001');
    expect(zones).toContain('TXC453');
    // TXZ192 must appear exactly once despite being in both sources
    expect(zones.filter((z) => z === 'TXZ192')).toHaveLength(1);
  });

  describe('is_state_wide detection', () => {
    test('areaDesc exactly matches state full name → is_state_wide true (empty zones kept)', async () => {
      const feature = {
        properties: {
          ...BASE_FEATURE.properties,
          areaDesc: 'Texas',
          affectedZones: [],
          geocode: { UGC: [], SAME: [] },
        },
      };
      mockFetch.mockResolvedValue(okResponse({ features: [feature] }));

      const alerts = await fetchActiveAlertsForState('TX');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].is_state_wide).toBe(true);
    });

    test('geocode.SAME contains county-000 entry → is_state_wide true (empty zones kept)', async () => {
      const feature = {
        properties: {
          ...BASE_FEATURE.properties,
          areaDesc: 'Eastern Texas',
          affectedZones: [],
          geocode: {
            UGC: [],
            SAME: ['048000'], // county FIPS 000 = entire state
          },
        },
      };
      mockFetch.mockResolvedValue(okResponse({ features: [feature] }));

      const alerts = await fetchActiveAlertsForState('TX');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].is_state_wide).toBe(true);
    });

    test('no state-wide signals → is_state_wide false', async () => {
      // areaDesc is not the full state name; no SAME-000 entry
      mockFetch.mockResolvedValue(okResponse({ features: [BASE_FEATURE] }));

      const alerts = await fetchActiveAlertsForState('TX');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].is_state_wide).toBe(false);
    });
  });

  test('empty affected_zones post-union and not state-wide → alert dropped (fail closed)', async () => {
    const feature = {
      properties: {
        ...BASE_FEATURE.properties,
        areaDesc: 'Some Local Area',
        affectedZones: [],
        geocode: {
          UGC: [],
          SAME: ['048453'], // non-000 county → not state-wide
        },
      },
    };
    mockFetch.mockResolvedValue(okResponse({ features: [feature] }));

    const alerts = await fetchActiveAlertsForState('TX');

    // Alert is dropped: could not determine zones, not explicitly state-wide
    expect(alerts).toEqual([]);
  });
});
