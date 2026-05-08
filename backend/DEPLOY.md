# Deploy

Deployment uses AWS SAM CLI. All commands are run from this directory (`backend/`).
SAM auto-discovers `template.yaml` and `samconfig.toml` here — no `-t`/`--config-file`
flags needed.

The default deploy region is `us-east-1` (set in `samconfig.toml`).

---

## First-time deploy

```bash
sam build
sam deploy --guided
```

`--guided` walks through every parameter interactively and writes your answers
back to `samconfig.toml` so subsequent deploys can omit them. After this you
can deploy with:

```bash
sam build && sam deploy
```

---

## Parameters

All four parameters are declared in `template.yaml` under `Parameters:`. You
override them at deploy time with `--parameter-overrides "Key=Value Key=Value"`,
or interactively via `sam deploy --guided`.

### `WeatherProviderParam`

Selects the weather provider strategy.

- **Type**: `String`
- **Allowed values**: `open-meteo`, `google`
- **Default**: `open-meteo`
- **When to change**: switch to `google` once a Google Weather API key is
  available and you want higher-fidelity forecasts. Free Open-Meteo is fine
  for staging.

```bash
sam deploy --parameter-overrides "WeatherProviderParam=google"
```

### `NwsUserAgentParam`

Sent as the `User-Agent` header on every NWS API call. **NWS rejects requests
without a polite User-Agent**, and `lib/config.ts` enforces it at cold start
(min 5 chars) — Lambda will crash on boot if this is empty.

- **Type**: `String` (min length 5)
- **Default**: *none — must be supplied*
- **Recommended format**: `weather-backend (ops@yourdomain.com)` — NWS asks for
  an identifier plus a contact.

```bash
sam deploy --parameter-overrides \
  "NwsUserAgentParam='weather-backend (ops@example.com)'"
```

### `GoogleWeatherApiKeyParam`

API key for Google Weather. Only consulted when `WeatherProviderParam=google`.

- **Type**: `String` (NoEcho — never logged or echoed by CloudFormation)
- **Default**: `''` (empty)
- **When to change**: required when switching the provider to `google`.
  Otherwise leave at the default.

```bash
sam deploy --parameter-overrides \
  "WeatherProviderParam=google GoogleWeatherApiKeyParam=AIza..."
```

### `CorsAllowOriginParam`

The single allowed CORS origin returned by `Access-Control-Allow-Origin`.
**Note the single-quote wrapping** — API Gateway requires CORS values to be
single-quoted strings inside the YAML/JSON.

- **Type**: `String`
- **Default**: `"'*'"` (permissive — fine for early development; the API key
  still gates access)
- **When to change**: before exposing to the field, set it to your
  CloudFront distribution's URL.

```bash
sam deploy --parameter-overrides \
  "CorsAllowOriginParam=\"'https://d1example.cloudfront.net'\""
```

---

## Combining overrides for a real prod deploy

```bash
sam build && sam deploy \
  --parameter-overrides \
  "NwsUserAgentParam='weather-backend (ops@example.com)' \
   WeatherProviderParam=google \
   GoogleWeatherApiKeyParam=AIza... \
   CorsAllowOriginParam=\"'https://d1example.cloudfront.net'\""
```

After the first run with `--guided`, these values are persisted in
`samconfig.toml` under `[default.deploy.parameters].parameter_overrides`, so
re-deploys reuse them automatically.

---

## After deploy

CloudFormation outputs the resources you'll need next:

| Output | Use |
|---|---|
| `ApiUrl` | Base URL for the REST API |
| `UsagePlanId` | Pass to the Phase 9 bootstrap script to create + attach an API key |
| `GeocodeTableName`, `WeatherTableName`, `AlertsTableName` | Seed scripts, ad-hoc queries |
| `WeatherQueueUrl`, `WeatherQueueArn`, `WeatherDLQUrl` | Monitoring, replay tooling |

Retrieve them any time with:

```bash
aws cloudformation describe-stacks \
  --stack-name weather-backend \
  --query 'Stacks[0].Outputs'
```

---

## Smoke test

Once the bootstrap script (Phase 9) has issued an API key:

```bash
curl -H "x-api-key: $RAW_KEY" "$API_URL/weather?lat=40.71&lon=-74.01"
```

First call for an unseen cell returns 200 with `weather: null` and enqueues a
fetch on the FIFO queue. Second call (after the worker drains, ~1–2 s) returns
the populated payload.

---

## Tearing down

```bash
sam delete
```

Removes the stack and all its resources. The DynamoDB tables are *not*
PITR-protected against deletion via stack delete — back up first if the data
matters.
