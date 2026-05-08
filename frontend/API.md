# Weather API Contract

## Endpoint

```
GET /readWeather?lat={lat}&lon={lon}
```

**Query parameters**

| Parameter | Type | Constraints | Example |
|---|---|---|---|
| `lat` | number | -90 to 90 | `40.71` |
| `lon` | number | -180 to 180 | `-74.01` |

**Cache-Control:** `max-age=60` (responses are cacheable for 1 minute)

---

## Success Response — 200

```jsonc
{
  "lat": 40.71,
  "lon": -74.01,
  "as_of": "2026-05-07T18:00:00.000Z",   // ISO 8601 UTC

  "location": {
    "state": "NY",                          // 2-letter US state code
    "county_zone": "NYZ072",
    "forecast_zone": "NYZ072",
    "time_zone": "America/New_York"         // IANA timezone
  },

  // null on the very first request for a new location (cold start).
  // Subsequent requests will have data once the background fetch completes.
  "weather": {
    // --- Current conditions ---
    "currentTemp": 68.4,          // °F
    "apparentTemp": 65.1,         // °F (feels like)
    "high": 74.0,                 // °F, today's forecasted high
    "low": 58.2,                  // °F, today's forecasted low
    "humidity": 62,               // % (0–100)
    "precipitation": 0.0,         // mm, current precipitation
    "windSpeed": 12.3,            // km/h
    "windDirection": 180,         // degrees (0–360, 0 = North)
    "weatherCode": 2,             // WMO weather interpretation code (see table below)
    "isDay": true,                // true = daytime, false = night

    // --- Daily summary ---
    "sunrise": "2026-05-07T05:47",   // local time (ISO, no timezone suffix)
    "sunset": "2026-05-07T19:58",    // local time (ISO, no timezone suffix)
    "dailyWeatherCode": 3,           // WMO code for today's overall conditions

    // --- Hourly forecast (next 5 hours) ---
    // Array of exactly 5 entries, one per hour starting from current hour.
    // May be absent on cached records fetched before this field was added.
    "forecast": [
      {
        "time": "2026-05-07T18:00",     // local time (ISO, no timezone suffix)
        "temp": 68.4,                    // °F
        "weatherCode": 2,                // WMO code
        "isDay": true,
        "precipProbability": 10          // % (0–100)
      }
      // ... 4 more entries
    ],

    // --- Metadata ---
    "source": "open-meteo",           // "open-meteo" | "google"
    "fetchedAt": "2026-05-07T18:00:00.000Z",  // ISO 8601 UTC
    "fetched_at": 1746640800,         // Unix timestamp (seconds)
    "is_stale": false                 // true if data is older than 2 hours
  },

  // NWS weather alerts for the location. Empty array if none active.
  "alerts": [
    {
      "alert_id": "urn:oid:2.49.0.1.840.0.abc123",
      "state": "NY",
      "event": "Wind Advisory",
      "severity": "Moderate",           // "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown"
      "headline": "Wind Advisory issued...",   // string | null
      "description": "...full text...",        // string | null
      "affected_zones": ["NYZ072"],
      "is_state_wide": false,
      "effective": "2026-05-07T12:00:00-05:00",  // ISO 8601
      "expires": "2026-05-07T21:00:00-05:00",
      "source": "nws"
    }
  ],

  // USGS earthquakes within 300 km of the requested location. Empty array if none.
  "earthquakes": [
    {
      "quake_id": "us7000abcd",
      "magnitude": 4.2,
      "place": "15 km NNE of Somewhere, NY",
      "time": 1746640000,     // Unix timestamp (ms)
      "lat": 41.1,
      "lon": -73.8
    }
  ]
}
```

---

## Error Responses

| Status | `code` | Cause |
|---|---|---|
| 400 | `invalid_query` | Missing or out-of-range `lat`/`lon` |
| 404 | `not_found` | Location not resolvable (outside US NWS coverage) |
| 502 | `open_meteo_error` | Upstream weather fetch failed |
| 500 | `config_error` | Server misconfiguration |

Error body:
```json
{ "error": "human-readable message" }
```

---

## WMO Weather Interpretation Codes

Used in `weatherCode`, `dailyWeatherCode`, and `forecast[].weatherCode`.

| Code | Description |
|---|---|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Overcast |
| 45, 48 | Fog |
| 51, 53, 55 | Drizzle (light / moderate / dense) |
| 61, 63, 65 | Rain (slight / moderate / heavy) |
| 71, 73, 75 | Snow (slight / moderate / heavy) |
| 77 | Snow grains |
| 80, 81, 82 | Rain showers (slight / moderate / violent) |
| 85, 86 | Snow showers (slight / heavy) |
| 95 | Thunderstorm |
| 96, 99 | Thunderstorm with hail |

Full reference: https://open-meteo.com/en/docs#weathervariables

---

## Notes

- `weather` is `null` on the first-ever request for a new lat/lon. Poll again after a few seconds.
- `weatherCode`, `isDay`, `sunrise`, `sunset`, `dailyWeatherCode`, and `forecast` may be absent on old cached records — treat them as optional.
- Temperatures are always **Fahrenheit**.
- Wind speed is **km/h**.
- `sunrise` / `sunset` / `forecast[].time` are local times in the location's timezone with no UTC offset suffix.
