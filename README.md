# Lab Automation System — fermtesting vsql

**TetraScience Self-Service React Data App**
Queries 4 instrument data sources (Roche CEDEX, NovaFlex, MFCS2, Aster HPLC) from AWS Athena via the TetraScience Data Platform.

## Architecture

```
┌─────────────────┐     cookies      ┌─────────────────┐    env vars    ┌──────────────────┐
│   TDP User      │ ───────────────► │   TDP Platform   │ ────────────► │  Docker Container │
│   (browser)     │                  │   (proxy)        │               │  (your app)       │
└─────────────────┘                  └─────────────────┘               └──────────────────┘
                                           │                                  │
                                    Injects Provider                  Express backend reads
                                    env vars into                     process.env.AWS_*
                                    container at startup              and queries Athena
```

## Quick Start (Local Development)

```bash
# 1. Install dependencies
yarn install

# 2. Create your local env file
cp .env.example .env.server
# Edit .env.server — fill in your TS_AUTH_TOKEN, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

# 3. Start dev server
yarn dev
# → http://localhost:3000
```

## Deploy to TetraScience

### Prerequisites
- Node.js 20+, Yarn
- `ts-cli` installed: `npm install -g @tetrascience/ts-cli`
- `auth.json` with your Service User JWT (get from TDP Organization Settings)

### Deploy Steps

```bash
# 1. Fill in auth.json with your Service User JWT
# 2. Build
yarn build

# 3. Deploy to TDP
ts-cli deploy data-app --config-file auth.json

# 4. In TDP: Data & AI Workspace → Gallery → Activate new version
```

### Setting Up Athena SQL Access in Production

The app needs AWS credentials to query Athena. In production, these come from a **TDP Data App Provider** — NOT from `.env.server`.

**Ask your TDP admin to:**

1. **Create a Data App Provider** (Organization Settings → Data App Providers):
   - Name: `Athena SQL` (or any name)
   - Fields:
     - `AWS_ACCESS_KEY_ID` = your IAM access key
     - `AWS_SECRET_ACCESS_KEY` = your IAM secret key
     - `AWS_REGION` = `us-east-1`
     - `ATHENA_WORKGROUP` = `takeda-gxp-dev`
     - `ATHENA_DATABASE` = `takeda_gxp_dev__tss__external`
     - `ATHENA_S3_OUTPUT_LOCATION` = `s3://takeda-dev-prod-athena-results/takeda_gxp_dev/`

2. **Attach the Provider to the Data App** (Manage Data Apps → your app → Add Provider)

The TDP will inject these as environment variables into the container at startup. The app's `getEnv()` function resolves them automatically.

### Verifying the Fix

After deployment, open the app and check:
- Connection panel should show **green "CONNECTED"** (not the red Athena error)
- Hit `GET /api/health` — should return `{"ok": true, "credentialSource": "TDP Provider"}`
- Load an experiment (e.g., T0792551) — all 4 sources should return data

## File Structure

```
├── manifest.json                  # TDP artifact metadata (v0.5.0)
├── Dockerfile                     # Multi-stage Docker build
├── conf/
│   ├── supervisord.conf           # Production: inherits container env vars
│   └── supervisord-local.conf     # Local Docker testing
├── packages/
│   ├── client/                    # React frontend (Vite + Recharts)
│   │   └── src/App.tsx            # Main dashboard component (9K+ lines)
│   └── server/                    # Express backend
│       └── src/
│           ├── app.ts             # Express setup + middleware
│           ├── config.ts          # Environment config class
│           ├── index.ts           # Server entry point
│           ├── routes/
│           │   └── tetra_signs_athena.ts  # Athena SQL queries + API routes
│           └── services/
│               └── health-service.ts      # TDP health heartbeat
├── .env.example                   # Template for local dev credentials
├── .env.server                    # YOUR local credentials (git-ignored)
└── auth.json                      # Deployment JWT (git-ignored)
```

## SQL Tables Queried

| Source | Athena Table | Key Columns |
|--------|-------------|-------------|
| Roche CEDEX BIO HT | `roche_diagnostics_bioht_gold_vienna_v1` | sample_name, run_analyte, result_measured_value |
| NovaFlex BioProfile | `cell_culture_analyzer_nova_biomedical_bioprofile_flex2_v4_samples/results` | sample_id, viable_density_value, glucose_value |
| MFCS2 ambr250 | `mfcs_gold_vienna_v2` | batchname, tag, numerical_value, reading_date |
| Aster HPLC | `aster_isf_gold_table` | sampledescription, analyte, result.original |

## Troubleshooting

**Error: "Athena credentials missing"**
→ The app cannot find `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in the environment.
→ In local dev: check your `.env.server` file.
→ In TDP: attach a Data App Provider with the AWS credentials.

**App loads but SQL returns 0 rows**
→ Check the experiment ID format (must match `^[TA][A-Za-z0-9]{4,15}$`).
→ Verify the experiment exists in the Athena tables via TDP SQL Search.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.5.0 | Mar 2026 | **FIX**: supervisord.conf now inherits container env vars (Provider support). Enhanced getEnv() with Provider-prefixed var resolution. Startup diagnostics logging. |
| v0.4.0 | Mar 2026 | Initial deployment. SQL works locally but fails in TDP (credentials not passed through supervisord). |
