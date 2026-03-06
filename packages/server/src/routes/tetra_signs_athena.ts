import type { Express, Request, Response } from "express";
import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-athena";

/**
 * TetraScience Signals / Athena-backed SQL API
 *
 * Endpoints:
 *   GET /api/health
 *   GET /api/catalog
 *   GET /api/search?q=...
 *   GET /api/data/:experimentId?source=roche_cedex|novaflex|mfcs2|aster|all
 *   GET /api/tags/:experimentId
 *
 * Notes:
 * - In local dev, .env.server is injected by dotenvx (root yarn dev script).
 * - In production (TDP), provide env vars via the Data App environment settings.
 */

type AthenaEnv = {
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION: string;
  ATHENA_WORKGROUP: string;
  ATHENA_S3_OUTPUT_LOCATION?: string;
  ATHENA_DATABASE: string;
};

function getEnv(): AthenaEnv {
  // ────────────────────────────────────────────────────────────────
  // Credential resolution order:
  //   1. ATHENA_ACCESS_KEY_ID / ATHENA_SECRET_KEY  (production — won't
  //      pollute the default AWS credential chain used by SSM/HealthService)
  //   2. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  (local dev via .env.server)
  //   3. TDP Provider-prefixed vars (e.g. ATHENA_SQL_AWS_ACCESS_KEY_ID)
  // ────────────────────────────────────────────────────────────────
  return {
    AWS_ACCESS_KEY_ID:
      process.env.ATHENA_ACCESS_KEY_ID        // ← production (supervisord.conf)
      || process.env.AWS_ACCESS_KEY_ID        // ← local dev (.env.server)
      || undefined,
    AWS_SECRET_ACCESS_KEY:
      process.env.ATHENA_SECRET_KEY           // ← production (supervisord.conf)
      || process.env.AWS_SECRET_ACCESS_KEY    // ← local dev (.env.server)
      || undefined,
    AWS_REGION:
      process.env.ATHENA_REGION
      || process.env.AWS_REGION
      || "us-east-1",
    ATHENA_WORKGROUP:
      process.env.ATHENA_WORKGROUP
      || (process.env.ORG_SLUG || "takeda-gxp-dev"),
    ATHENA_S3_OUTPUT_LOCATION:
      process.env.ATHENA_S3_OUTPUT_LOCATION || undefined,
    ATHENA_DATABASE:
      process.env.ATHENA_DATABASE
      || "takeda_gxp_dev__tss__external",
  };
}

function hasCreds(e: AthenaEnv): boolean {
  return Boolean(e.AWS_ACCESS_KEY_ID && e.AWS_SECRET_ACCESS_KEY);
}

function normalizeS3Output(s?: string): string | undefined {
  if (!s) return undefined;
  const out = s.trim();
  if (!out) return undefined;
  return out.startsWith("s3://") ? out : `s3://${out}`;
}

function validateExperimentId(id: string): boolean {
  if (!id) return false;
  return /^[TA][A-Za-z0-9]{4,15}$/.test(id);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runQuery(client: AthenaClient, env: AthenaEnv, sql: string): Promise<Record<string, any>[]> {
  const s3Output = normalizeS3Output(env.ATHENA_S3_OUTPUT_LOCATION);

  const start = await client.send(
    new StartQueryExecutionCommand({
      QueryString: sql,
      QueryExecutionContext: { Database: env.ATHENA_DATABASE },
      WorkGroup: env.ATHENA_WORKGROUP,
      ...(s3Output ? { ResultConfiguration: { OutputLocation: s3Output } } : {}),
    }),
  );

  const execId = start.QueryExecutionId;
  if (!execId) throw new Error("Athena: missing QueryExecutionId");

  // Poll up to ~3 minutes
  for (let i = 0; i < 120; i++) {
    await sleep(1500);
    const { QueryExecution: qe } = await client.send(
      new GetQueryExecutionCommand({ QueryExecutionId: execId }),
    );
    const state = qe?.Status?.State;
    if (state === "SUCCEEDED") break;
    if (state === "FAILED" || state === "CANCELLED") {
      throw new Error(`Athena ${state}: ${qe?.Status?.StateChangeReason || ""}`);
    }
  }

  const rows: Record<string, any>[] = [];
  let columns: string[] | null = null;
  let nextToken: string | undefined;

  do {
    const res = await client.send(
      new GetQueryResultsCommand({ QueryExecutionId: execId, NextToken: nextToken }),
    );

    const rsRows = res.ResultSet?.Rows || [];
    for (const row of rsRows) {
      const data = row.Data || [];
      if (columns === null) {
        columns = data.map((d) => d.VarCharValue || "");
        continue;
      }
      const obj: Record<string, any> = {};
      data.forEach((d, i) => {
        obj[columns![i]] = d.VarCharValue ?? null;
      });
      rows.push(obj);
    }
    nextToken = res.NextToken;
  } while (nextToken);

  return rows;
}

// SQL builders — copied from your working prototype (server.js)
function sqlRoche(expId: string) {
  return `
SELECT
  "uuid", "file_metadata", "@idstype", "@idsversion", "@idsnamespace", "site",
  "system_uuid", "system_serial_number", "system_vendor", "system_model", "system_type",
  "system_software_name", "system_software_version",
  "sample_uuid", "sample_id", "sample_name", "sample_barcode",
  "sample_batch_id", "sample_batch_name", "sample_set_id", "sample_set_name",
  "sample_lot_id", "sample_lot_name",
  "sample_location_position", "sample_location_row", "sample_location_column", "sample_location_index",
  "sample_holder_name", "sample_holder_type", "sample_holder_barcode",
  "user_uuid", "user_id", "user_name", "user_type",
  "method_uuid", "method_operation_type", "method_calibrator",
  "run_uuid", "run_time_acquired", "run_time_raw_acquired", "run_analyte",
  "run_target_value", "run_target_unit",
  "run_allowed_derivation_value", "run_allowed_derivation_unit",
  "run_allowed_deviation_value", "run_allowed_deviation_unit",
  "sample_type", "valid_result",
  "result_uuid", "result_classification", "result_measured_value", "result_measured_unit",
  "result_std_dev_value", "result_std_dev_unit",
  "result_absorbance", "run_date"
FROM "roche_diagnostics_bioht_gold_vienna_v1"
WHERE TRIM("sample_name") LIKE '${expId}%'
ORDER BY "run_time_acquired" ASC, "sample_name" ASC
  `;
}

function sqlMFCS2(expId: string) {
  return `
SELECT
  "scan_id", "timestamp", "reading_date", "tag", "value_data_type",
  "numerical_value", "string_value", "boolean_value",
  "batchname", "unittypename", "unitname", "unitdisplayname", "site"
FROM (
  SELECT
    t.*,
    ROW_NUMBER() OVER (
      PARTITION BY "batchname", CAST("reading_date" AS DATE), "tag"
      ORDER BY "timestamp" DESC, "scan_id" DESC
    ) AS rn
  FROM "mfcs_gold_vienna_v2" t
  WHERE "batchname" LIKE '${expId}%'
) x
WHERE rn = 1
ORDER BY "batchname" ASC, CAST("reading_date" AS DATE) ASC, "tag" ASC
  `;
}

function sqlAster(expId: string) {
  return `
SELECT
    TRIM(a.sampledescription) AS sample_description,
    TRIM(a.sampleid)          AS sample_id,
    a.samplebarcode           AS sample_barcode,
    a.logdate                 AS results_log_date,
    a.analyzeddate            AS analyzed_date,
    a.approveddate            AS approved_date,
    a.runno                   AS analytical_run_number,
    a.emanifestid             AS emanifest_id,
    a.retestflag              AS sample_retest_flag,
    CONCAT(
        TRIM(a.testrequested), ' - ',
        TRIM(a.analyte),       ' [',
        TRIM(a.units),         ']'
    ) AS test_analyte_units,
    CASE
        WHEN a.result.original IS NULL THEN NULL
        WHEN regexp_replace(a.result.original, '[^0-9\\.-]+', '') = '' THEN NULL
        ELSE CAST(regexp_replace(a.result.original, '[^0-9\\.-]+', '') AS DOUBLE)
    END AS numeric_result,
    CASE
        WHEN a.result.comment IS NULL
          OR TRIM(LOWER(a.result.comment)) IN ('', 'null')
        THEN NULL
        ELSE a.result.comment
    END AS comment
FROM awsdatacatalog.takeda_gxp_dev__tss__external."aster_isf_gold_table" a
WHERE TRIM(a.sampledescription) LIKE '%${expId}%'
  AND COALESCE(TRIM(a.analyte), '') <> 'Comment'
ORDER BY a.logdate ASC, a.sampledescription ASC
  `;
}

function sqlNovaFlex(expId: string) {
  return `
WITH sample_names AS (
  SELECT
    "uuid", "parent_uuid", "pk",
    "id"                   AS sample_id,
    "name",
    "batch_id",
    "location_holder_id"   AS vessel_id,
    "time_in_tray_raw_value", "time_in_tray_unit",
    "type"                 AS sample_type,
    "cell_type"
  FROM awsdatacatalog.takeda_gxp_dev."cell_culture_analyzer_nova_biomedical_bioprofile_flex2_v4_samples"
  WHERE TRIM("id") LIKE '%${expId}%'
),
sample_results AS (
  SELECT
    "fk_sample",
    "glutamine_value",  "glutamine_unit",
    "glutamate_value",  "glutamate_unit",
    "glucose_value",    "glucose_unit",
    "lactate_value",    "lactate_unit",
    "ammonium_ion_value","ammonium_ion_unit",
    "sodium_ion_value", "sodium_ion_unit",
    "potassium_ion_value","potassium_ion_unit",
    "calcium_ion_value","calcium_ion_unit",
    "ph_value",         "ph_unit",
    "po2_value",        "po2_unit",
    "pco2_value",       "pco2_unit",
    "osmolality_value", "osmolality_unit",
    "total_density_value",   "total_density_unit",
    "viable_density_value",  "viable_density_unit",
    "viability_value",       "viability_unit",
    "average_live_diameter_value", "average_live_diameter_unit",
    "total_live_count_value",      "total_live_count_unit",
    "total_cell_count_value",      "total_cell_count_unit",
    "live_cell_standard_deviation_value", "live_cell_standard_deviation_unit",
    "ph_temperature_value",  "ph_temperature_unit",
    "pco2_temperature_value","pco2_temperature_unit",
    "po2_temperature_value", "po2_temperature_unit",
    "o2_saturation_value",   "o2_saturation_unit",
    "co2_saturation_value",  "co2_saturation_unit",
    "bicarbonate_ion_value", "bicarbonate_ion_unit",
    "chemistry_flow_time_value", "chemistry_flow_time_unit",
    "ph_gas_flow_time_value",    "ph_gas_flow_time_unit",
    "cell_density_flow_value",   "cell_density_flow_unit",
    "valid_images_value",        "valid_images_unit",
    "sample_time_start", "sample_time_created", "sample_time_stop",
    "sample_time_duration", "sample_time_last_updated",
    "sample_time_acquired", "sample_time_modified", "sample_time_lookup"
  FROM awsdatacatalog.takeda_gxp_dev."cell_culture_analyzer_nova_biomedical_bioprofile_flex2_v4_results"
)
SELECT
  s.sample_id,
  s."name",
  s.batch_id,
  s.vessel_id,
  s.time_in_tray_raw_value,
  s.time_in_tray_unit,
  s.sample_type,
  s.cell_type,
  r.*
FROM sample_results r
JOIN sample_names s ON s."pk" = r."fk_sample"
ORDER BY s.sample_id ASC, r.sample_time_acquired ASC
  `;
}

const PROJECT_CATALOG = [
  {
    projectName: "TAK-079",
    experiments: [
      { id: "T0792551", label: "T0792551 — Cell Culture Run 1" },
      { id: "T0792545", label: "T0792545 — Cell Culture Run 2" },
    ],
  },
  {
    projectName: "TAK-755",
    experiments: [
      { id: "A132517", label: "A132517 — Upstream Run 1" },
      { id: "A132518", label: "A132518 — Upstream Run 2" },
    ],
  },
];

export function registerTetraSignsAthenaRoutes(app: Express) {
  const env = getEnv();

  // ── Startup diagnostics ──────────────────────────────────────
  const creds = hasCreds(env);
  console.log(`[Athena] Credentials: ${creds ? "OK ✓" : "MISSING ✗"}`);
  console.log(`[Athena] Database: ${env.ATHENA_DATABASE}`);
  console.log(`[Athena] Region: ${env.AWS_REGION} | Workgroup: ${env.ATHENA_WORKGROUP}`);
  if (!creds) {
    console.warn("[Athena] ⚠  AWS_ACCESS_KEY_ID and/or AWS_SECRET_ACCESS_KEY not found.");
    console.warn("[Athena]    Attach a TDP Data App Provider or set them in the container env.");
    // List all env vars that contain AWS or ATHENA for debugging
    const relevant = Object.keys(process.env).filter(k => k.includes("AWS") || k.includes("ATHENA")).sort();
    console.warn(`[Athena]    Relevant env vars found: ${relevant.length > 0 ? relevant.join(", ") : "(none)"}`);
  }
  // Health
  app.get("/api/health", (_req: Request, res: Response) => {
    const e = getEnv();
    // Count how many env vars look like they came from a TDP Provider
    const providerVars = Object.keys(process.env).filter(
      k => k.includes("ATHENA_SQL_") || (k.startsWith("AWS_") && !["AWS_REGION"].includes(k)),
    );
    res.json({
      ok: hasCreds(e),
      database: e.ATHENA_DATABASE,
      region: e.AWS_REGION,
      workgroup: e.ATHENA_WORKGROUP,
      s3_output: normalizeS3Output(e.ATHENA_S3_OUTPUT_LOCATION) || null,
      credentialSource: hasCreds(e)
        ? (providerVars.length > 2 ? "TDP Provider" : "environment")
        : "none",
      missing: hasCreds(e) ? [] : ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
      hint: hasCreds(e) ? null : "Attach a TDP Data App Provider with AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or set them in the container environment.",
      tables: {
        roche_cedex: "roche_diagnostics_bioht_gold_vienna_v1",
        mfcs2: "mfcs_gold_vienna_v2",
        aster: "awsdatacatalog.takeda_gxp_dev__tss__external.aster_isf_gold_table",
        novaflex_samples: "awsdatacatalog.takeda_gxp_dev.cell_culture_analyzer_nova_biomedical_bioprofile_flex2_v4_samples",
        novaflex_results: "awsdatacatalog.takeda_gxp_dev.cell_culture_analyzer_nova_biomedical_bioprofile_flex2_v4_results",
      },
    });
  });

  app.get("/api/catalog", (_req: Request, res: Response) => {
    res.json({ catalog: PROJECT_CATALOG });
  });

  app.get("/api/search", (req: Request, res: Response) => {
    const q = String(req.query.q || "").trim().toUpperCase();
    if (!q) return res.json({ results: [] });

    const results: any[] = [];
    PROJECT_CATALOG.forEach((project) => {
      project.experiments.forEach((exp) => {
        if (
          exp.id.toUpperCase().includes(q) ||
          exp.label.toUpperCase().includes(q) ||
          project.projectName.toUpperCase().includes(q)
        ) {
          results.push({ projectName: project.projectName, ...exp });
        }
      });
    });
    res.json({ results });
  });

  app.get("/api/data/:experimentId", async (req: Request, res: Response) => {
    const experimentId = String(req.params.experimentId || "").trim();
    const source = String(req.query.source || "all").toLowerCase();

    if (!validateExperimentId(experimentId)) {
      return res.status(400).json({
        error: "Invalid experimentId format. Expected e.g. T0792545 or A132517.",
      });
    }

    const e = getEnv();
    if (!hasCreds(e)) {
      return res.status(500).json({
        error: "Athena credentials missing. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY in env.",
      });
    }

    const client = new AthenaClient({
      region: e.AWS_REGION,
      credentials: {
        accessKeyId: e.AWS_ACCESS_KEY_ID!,
        secretAccessKey: e.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const SOURCES: Record<string, { label: string; fn: (id: string) => string }> = {
      roche_cedex: { label: "Roche CEDEX BIO HT", fn: sqlRoche },
      novaflex: { label: "NovaFlex BioProfile Flex²", fn: sqlNovaFlex },
      mfcs2: { label: "MFCS2 ambr250 (online)", fn: sqlMFCS2 },
      aster: { label: "Aster HPLC (Protein A)", fn: sqlAster },
    };

    if (source !== "all") {
      const cfg = SOURCES[source];
      if (!cfg) {
        return res.status(400).json({
          error: `Unknown source: ${source}. Use one of: ${Object.keys(SOURCES).join(", ")}, or all`,
        });
      }
      try {
        const rows = await runQuery(client, e, cfg.fn(experimentId));
        return res.json({ rows, count: rows.length, experimentId, source });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || String(err), source });
      }
    }

    // all sources in parallel
    const start = Date.now();
    const results: Record<string, { rows: any[]; count: number; ok: boolean; ms: number; error?: string }> = {};

    await Promise.all(
      Object.entries(SOURCES).map(async ([key, cfg]) => {
        const t0 = Date.now();
        try {
          const rows = await runQuery(client, e, cfg.fn(experimentId));
          results[key] = { rows, count: rows.length, ok: true, ms: Date.now() - t0 };
        } catch (err: any) {
          results[key] = { rows: [], count: 0, ok: false, ms: Date.now() - t0, error: err.message || String(err) };
        }
      }),
    );

    const totalRows = Object.values(results).reduce((s, r) => s + (r.count || 0), 0);
    res.json({ results, experimentId, source: "all", totalRows, ms: Date.now() - start });
  });

  app.get("/api/tags/:experimentId", async (req: Request, res: Response) => {
    const experimentId = String(req.params.experimentId || "").trim();
    if (!validateExperimentId(experimentId)) {
      return res.status(400).json({ error: "Invalid experimentId." });
    }

    const e = getEnv();
    if (!hasCreds(e)) {
      return res.status(500).json({ error: "Athena credentials missing." });
    }

    const client = new AthenaClient({
      region: e.AWS_REGION,
      credentials: {
        accessKeyId: e.AWS_ACCESS_KEY_ID!,
        secretAccessKey: e.AWS_SECRET_ACCESS_KEY!,
      },
    });

    try {
      const rows = await runQuery(
        client,
        e,
        `
      SELECT DISTINCT "tag", COUNT(*) AS reading_count
      FROM "mfcs_gold_vienna_v2"
      WHERE "batchname" LIKE '${experimentId}%'
        AND "value_data_type" = 'number'
      GROUP BY "tag"
      ORDER BY "tag"
      `,
      );
      res.json({ tags: rows, experimentId });
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });
}
