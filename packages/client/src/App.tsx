// @ts-nocheck
/* eslint-disable */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine, ReferenceArea, BarChart, Bar, Cell, LabelList, ErrorBar, Scatter, ScatterChart
} from 'recharts';
import {
  Activity, BarChart3, BookOpen, ChevronRight, Upload, Download,
  Settings, Sliders, Palette, X, Eye, EyeOff, FileJson, Beaker,
  CheckCircle2, AlertCircle, LayoutDashboard, Zap, Calendar, FlaskConical,
  TestTube2, ArrowUpDown, AlignLeft, Layers, ToggleLeft, ToggleRight,
  Maximize2, Minimize2, ZoomOut, Table as TableIcon, CheckSquare, Info, Filter, Library,
  Microscope, Scale, Gauge, Link, RefreshCw, TrendingUp, Calculator, FileText, Trash2, Database, LayoutGrid as Grid3x3, Plus, Edit3, Wifi,
  Copy, FileDown, GripVertical, Search, Bookmark, ChevronDown, ChevronUp, RotateCcw, Printer, Image, Star, FolderOpen, Save, ArrowRight, GitCompare
} from 'lucide-react';

const MotionDiv = ({
  initial,
  animate,
  exit,
  transition,
  whileHover,
  whileTap,
  children,
  ...props
}) => <div {...props}>{children}</div>;

const motion = { div: MotionDiv };
const AnimatePresence = ({ children }) => <>{children}</>;

// No embedded data – users upload CEDEX CSV or JSON files directly
const DEFAULT_DATA = null;
// ─────────────────────────────────────────────────────────────────
// CEDEX BIO HT → Internal JSON Converter
// Handles CSV files exported from the Roche CEDEX Cell Culture Analyzer
// Sample name format: T0792531X15K11  → batch=T0792531, vessel=X15, culture_day=11
// ─────────────────────────────────────────────────────────────────

// Maps CEDEX analyte codes → internal series keys + metadata
const CEDEX_ANALYTE_MAP = {
  // Glucose
  GLU2B: { key: 'gluc_g_per_l',  label: 'Glucose',     unit: 'g/L'  },
  GLU2D: { key: 'gluc_g_per_l',  label: 'Glucose',     unit: 'g/L'  },
  // Glutamine
  GLN2B: { key: 'gln_g_per_l',   label: 'Glutamine',   unit: 'g/L'  },
  // Ammonia / Ammonium
  NH3B:  { key: 'nh3_mg_per_l',  label: 'Ammonia',     unit: 'mg/L' },
  NAB:   { key: 'nab_g_per_l',   label: 'NAB (Na)',    unit: 'g/L'  },
  // LDH
  LDH2D: { key: 'ldh_u_per_l',   label: 'LDH',         unit: 'U/L'  },
  LDH2B: { key: 'ldh_u_per_l',   label: 'LDH',         unit: 'U/L'  },
  // IgG Titer
  IGGHD: { key: 'igg_mg_per_l',  label: 'IgG',         unit: 'mg/L' },
  IGGHB: { key: 'igg_mg_per_l',  label: 'IgG',         unit: 'mg/L' },
  // Asparagine
  ASNHB: { key: 'asn_mg_per_l',  label: 'Asparagine',  unit: 'mg/L' },
  ASNLB: { key: 'asn_mg_per_l',  label: 'Asparagine',  unit: 'mg/L' },
  // Aspartate
  ASPB:  { key: 'asp_mg_per_l',  label: 'Aspartate',   unit: 'mg/L' },
  // Pyruvate
  PYRB:  { key: 'pyr_mg_per_l',  label: 'Pyruvate',    unit: 'mg/L' },
  PYRD:  { key: 'pyr_mg_per_l',  label: 'Pyruvate',    unit: 'mg/L' },
};

// ─────────────────────────────────────────────────────────────────
// NovaFlex BioProfile Flex² column → internal series key map
// ─────────────────────────────────────────────────────────────────
const NOVAFLEX_COLUMN_MAP = {
  glucose_value:              { key: 'novaflex_gluc_g_per_l',       label: 'Glucose (NovaFlex)',     unit: 'g/L'         },
  lactate_value:              { key: 'novaflex_lac_g_per_l',        label: 'Lactate (NovaFlex)',     unit: 'g/L'         },
  glutamine_value:            { key: 'novaflex_gln_mmol_per_l',     label: 'Glutamine (NovaFlex)',   unit: 'mmol/L'      },
  glutamate_value:            { key: 'novaflex_glu_mmol_per_l',     label: 'Glutamate (NovaFlex)',   unit: 'mmol/L'      },
  ammonium_ion_value:         { key: 'novaflex_nh4_mmol_per_l',     label: 'Ammonium (NovaFlex)',    unit: 'mmol/L'      },
  sodium_ion_value:           { key: 'novaflex_na_mmol_per_l',      label: 'Sodium (NovaFlex)',      unit: 'mmol/L'      },
  potassium_ion_value:        { key: 'novaflex_k_mmol_per_l',       label: 'Potassium (NovaFlex)',   unit: 'mmol/L'      },
  calcium_ion_value:          { key: 'novaflex_ca_mmol_per_l',      label: 'Calcium (NovaFlex)',     unit: 'mmol/L'      },
  ph_value:                   { key: 'ph_offline',                  label: 'pH (NovaFlex offline)',  unit: ''            },
  po2_value:                  { key: 'po2_offline_pct',             label: 'pO2 offline',            unit: '%'           },
  pco2_value:                 { key: 'pco2_offline_mmhg',           label: 'pCO2 offline',           unit: 'mmHg'        },
  osmolality_value:           { key: 'osm_mosm_per_kg',             label: 'Osmolality',             unit: 'mOsm/kg'     },
  viable_density_value:       { key: 'viable_cells_x106_c_per_ml',  label: 'VCD',                   unit: '10⁶ cells/mL'},
  total_density_value:        { key: 'total_cells_x106_c_per_ml',   label: 'TCD',                   unit: '10⁶ cells/mL'},
  viability_value:            { key: 'cell_viability_pct',          label: 'Viability',              unit: '%'           },
  average_live_diameter_value:{ key: 'avg_diam_um',                 label: 'Avg Cell Diameter',      unit: 'µm'          },
  o2_saturation_value:        { key: 'o2_saturation_pct',           label: 'O2 Saturation',          unit: '%'           },
  co2_saturation_value:       { key: 'co2_saturation_pct',          label: 'CO2 Saturation',         unit: '%'           },
  bicarbonate_ion_value:      { key: 'bicarb_mmol_per_l',           label: 'Bicarbonate',            unit: 'mmol/L'      },
};

// ─────────────────────────────────────────────────────────────────
// MFCS2 (ambr250 SCADA) tag → internal series key map
// ─────────────────────────────────────────────────────────────────
const MFCS2_TAG_MAP = {
  // ── ambr250 / BIOSTAT STR tags (original) ─────────────────────────────────
  'pH_Value':                              { key: 'mfcs_ph_online',          label: 'pH (online)',           unit: ''         },
  'DO_Value [%]':                          { key: 'mfcs_do_pct',             label: 'DO (online)',            unit: '%'        },
  'Temperature_Value [°C]':               { key: 'mfcs_temp_degc',           label: 'Temperature (online)',   unit: '°C'       },
  'Agitation_Value [rpm]':                 { key: 'mfcs_agitation_rpm',      label: 'Agitation',              unit: 'rpm'      },
  'Volume_Value [mL]':                     { key: 'mfcs_volume_ml',          label: 'Working Volume',         unit: 'mL'       },
  'Air (headspace) flow_Value [mL/min]':   { key: 'mfcs_air_flow_ml_per_min',label: 'Air Flow',              unit: 'mL/min'   },
  'O2 (headspace) flow_Value [mL/min]':    { key: 'mfcs_o2_flow_ml_per_min', label: 'O2 Flow',               unit: 'mL/min'   },
  'N2 (headspace) flow_Value [mL/min]':    { key: 'mfcs_n2_flow_ml_per_min', label: 'N2 Flow',               unit: 'mL/min'   },
  'CO2 (headspace) flow_Value [mL/min]':   { key: 'mfcs_co2_flow_ml_per_min',label: 'CO2 Flow',              unit: 'mL/min'   },
  'Base volume pumped_Value [mL]':          { key: 'mfcs_base_vol_ml',        label: 'Base Pumped',           unit: 'mL'       },
  'Acid volume pumped_Value [mL]':          { key: 'mfcs_acid_vol_ml',        label: 'Acid Pumped',           unit: 'mL'       },
  'Glucose concentration_Value [g/L]':      { key: 'mfcs_gluc_online_g_per_l',label: 'Glucose (online)',       unit: 'g/L'      },
  'Air (headspace) valve open.SP_Value [%]':{ key: 'mfcs_air_valve_pct',     label: 'Air Valve',              unit: '%'        },
  // ── BIOSTAT B RM Twin (rocking bag) tags ──────────────────────────────────
  // Core process parameters
  'pH_Value [pH]':         { key: 'mfcs_ph_online',             label: 'pH (online)',           unit: ''            },
  'pO2_Value [%sat]':      { key: 'mfcs_do_pct',                label: 'pO2 / DO (online)',     unit: '%sat'        },
  'TEMP_Value [°C]':       { key: 'mfcs_temp_degc',             label: 'Temperature',           unit: '°C'          },
  // Rocking bag mechanics
  'ROCKS_Value [r]':       { key: 'mfcs_agitation_rpm',         label: 'Rocking Rate',          unit: 'r/min'       },
  'ANGLE_Value [°]':       { key: 'mfcs_rocking_angle_deg',     label: 'Rocking Angle',         unit: '°'           },
  // Gas overlays
  'AIROV_Value [lpm]':     { key: 'mfcs_air_flow_ml_per_min',   label: 'Air Overlay',           unit: 'lpm'         },
  'O2OV_Value [lpm]':      { key: 'mfcs_o2_flow_ml_per_min',    label: 'O2 Overlay',            unit: 'lpm'         },
  'N2OV_Value [lpm]':      { key: 'mfcs_n2_flow_ml_per_min',    label: 'N2 Overlay',            unit: 'lpm'         },
  'CO2OV_Value [ccm]':     { key: 'mfcs_co2_flow_ml_per_min',   label: 'CO2 Overlay',           unit: 'ccm'         },
  // pH control
  'BASET_Value [ml]':      { key: 'mfcs_base_vol_ml',           label: 'Base Pumped',           unit: 'mL'          },
  // Glucose / substrates
  'Glucose_Value [gL]':    { key: 'mfcs_gluc_online_g_per_l',   label: 'Glucose (online)',      unit: 'g/L'         },
  'SUBST_A_Value [ml]':    { key: 'mfcs_subst_a_ml',            label: 'Substrate A Added',     unit: 'mL'          },
  'SUBST_B_Value [ml]':    { key: 'mfcs_subst_b_ml',            label: 'Substrate B Added',     unit: 'mL'          },
  'SUBST_C_Value [ml]':    { key: 'mfcs_subst_c_ml',            label: 'Substrate C Added',     unit: 'mL'          },
  // Biomass / capacitance
  'BMASS_Value [E6C/ml]':  { key: 'mfcs_biomass_e6c_per_ml',    label: 'Biomass (cap. probe)',  unit: 'E6 cells/mL' },
  'CAP_Value [pF/cm]':     { key: 'mfcs_capacitance_pf_per_cm', label: 'Capacitance',           unit: 'pF/cm'       },
  // Weight / pressure
  'RWEIGHT_Value [kg]':    { key: 'mfcs_rweight_kg',            label: 'Vessel Weight',         unit: 'kg'          },
  'FWEIGHT_A_Value [kg]':  { key: 'mfcs_fweight_a_kg',          label: 'Feed Weight A',         unit: 'kg'          },
  'FWEIGHT_B_Value [kg]':  { key: 'mfcs_fweight_b_kg',          label: 'Feed Weight B',         unit: 'kg'          },
  'PRESS_Value [mbar]':    { key: 'mfcs_pressure_mbar',         label: 'Pressure',              unit: 'mbar'        },
  // Flow / conductivity
  'FLOW_A_Value [kg/h]':   { key: 'mfcs_flow_a_kg_per_h',       label: 'Flow A',                unit: 'kg/h'        },
  'FLOW_B_Value [kg/h]':   { key: 'mfcs_flow_b_kg_per_h',       label: 'Flow B',                unit: 'kg/h'        },
  'COND_Value [mS/cm]':    { key: 'mfcs_conductivity_ms',       label: 'Conductivity',          unit: 'mS/cm'       },
};

// ─────────────────────────────────────────────────────────────────
// Aster HPLC analyte label → internal series key
// ─────────────────────────────────────────────────────────────────
const ASTER_ANALYTE_MAP = {
  'HPLC (ProteinA mAb PF) - Titer [mg/ml]': { key: 'protein_a_hplc_mg_per_l', label: 'ProteinA Titer (HPLC)', unit: 'mg/mL' },
};

// ─────────────────────────────────────────────────────────────────
// Detect which instrument a CSV belongs to by scanning its header
// ─────────────────────────────────────────────────────────────────
const detectCSVInstrument = (header) => {
  const h = header.join(',').toLowerCase();
  if (h.includes('run_analyte') && h.includes('result_measured_value')) return 'roche_cedex';
  if (h.includes('viable_density_value') || h.includes('novaflex') || h.includes('glucose_value') && h.includes('sample_time_acquired')) return 'novaflex';
  if (h.includes('batchname') && h.includes('unittypename') && h.includes('tag')) return 'mfcs2';
  if (h.includes('test_analyte_units') && h.includes('numeric_result') && h.includes('sample_barcode')) return 'aster';
  return 'unknown';
};

/**
 * Parse a NovaFlex BioProfile Flex² CSV into the internal fermentation JSON.
 * Sample ID format: T0792545X11K-5  → vessel=X11, culture_day=5
 */
const parseNovaFlexCSV = (csvText, fileName = '') => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('NovaFlex CSV appears empty.');
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const getIdx = (name) => header.findIndex(h => h === name || h.includes(name));
  const sampleIdx = getIdx('sample_id');
  if (sampleIdx === -1) throw new Error('NovaFlex CSV: sample_id column not found.');
  const SAMPLE_RE = /^(T\d+)(X\d+)K-(\d+)$/i;
  const vessels = {};
  let batchId = '';
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
    if (!cols[sampleIdx]) continue;
    const match = SAMPLE_RE.exec(cols[sampleIdx]);
    if (!match) continue;
    const thisBatch = match[1];
    const vessel = match[2].toUpperCase();
    const cultureDay = parseInt(match[3], 10);
    if (!batchId) batchId = thisBatch;
    if (!vessels[vessel]) vessels[vessel] = { condition: vessel, timepointMeta: new Map(), series: {} };
    const vEntry = vessels[vessel];
    const acqIdx = getIdx('sample_time_acquired');
    if (!vEntry.timepointMeta.has(cultureDay)) {
      vEntry.timepointMeta.set(cultureDay, { date: acqIdx >= 0 ? cols[acqIdx]?.split('T')[0] : null });
    }
    // Map each NovaFlex column
    Object.entries(NOVAFLEX_COLUMN_MAP).forEach(([colName, mapping]) => {
      const colI = header.findIndex(h => h === colName);
      if (colI === -1) return;
      const raw = cols[colI];
      const val = raw === '' || raw === undefined ? null : parseFloat(raw);
      if (val !== null && !isNaN(val)) {
        if (!vEntry.series[mapping.key]) vEntry.series[mapping.key] = new Map();
        if (!vEntry.series[mapping.key].has(cultureDay)) {
          vEntry.series[mapping.key].set(cultureDay, val);
        }
      }
    });
  }
  if (Object.keys(vessels).length === 0) {
    console.warn('NovaFlex: no valid rows matched sample_id pattern T…X…K-…. Skipping.');
    return null;
  }
  if (!batchId && fileName) { const m = fileName.match(/[A-Z]\d+/i); if (m) batchId = m[0]; }
  if (!batchId) batchId = 'T_UNKNOWN';
  const bioreactors = {};
  Object.entries(vessels).forEach(([vesselId, vEntry]) => {
    const vDays = Array.from(vEntry.timepointMeta.keys()).sort((a, b) => a - b);
    const timepoints = vDays.map(d => {
      const meta = vEntry.timepointMeta.get(d);
      return { culture_day: d, export_dt: meta?.date ? `${meta.date}T00:00:00` : null, date: meta?.date || null, sample_code_id: null };
    });
    const series = {};
    Object.entries(vEntry.series).forEach(([sk, dayMap]) => {
      series[sk] = vDays.map(d => dayMap.has(d) ? dayMap.get(d) : null);
    });
    bioreactors[vesselId] = { condition: vesselId, timepoints, series };
  });
  return { run: { run_id: batchId, product: 'Cell Culture (NovaFlex)', site: 'AT-Vienna', analyzer: 'Nova Biomedical BioProfile Flex²' }, bioreactors, _source: 'novaflex_csv', _fileName: fileName };
};

/**
 * Parse MFCS2 (ambr250 SCADA) "latest value" CSV into the internal fermentation JSON.
 * batchname format: T0792545X11 → batch=T0792545, vessel=X11
 * Culture day is inferred from reading_date offset from earliest reading per vessel.
 */
const parseMFCS2CSV = (csvText, fileName = '') => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('MFCS2 CSV appears empty.');
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const getIdx = (name) => header.findIndex(h => h === name);
  const batchIdx = getIdx('batchname');
  const tagIdx   = getIdx('tag');
  const valIdx   = getIdx('numerical_value');
  const dateIdx  = getIdx('reading_date');
  if (batchIdx === -1 || tagIdx === -1 || valIdx === -1) throw new Error('MFCS2 CSV: required columns missing (batchname, tag, numerical_value).');
  const // Matches T0792545X11, A132517R01, A132517R01a (trailing letter normalised)
  BATCH_RE = /^([A-Z]\d+)([XR]\d+)[a-z]*$/i;
  // First pass: collect all dates per vessel to compute day offsets
  const vesselDates = {};
  const rawRows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const batchname = cols[batchIdx];
    const match = BATCH_RE.exec(batchname);
    if (!match) continue;
    const vessel = match[2].toUpperCase();
    const dateStr = dateIdx >= 0 ? cols[dateIdx] : null;
    if (dateStr) {
      if (!vesselDates[vessel]) vesselDates[vessel] = [];
      vesselDates[vessel].push(dateStr);
    }
    rawRows.push({ vessel, batchId: match[1], tag: cols[tagIdx], val: cols[valIdx], dateStr });
  }
  // Compute day 0 = earliest date per vessel
  const vesselDay0 = {};
  Object.entries(vesselDates).forEach(([v, dates]) => {
    const sorted = [...new Set(dates)].sort();
    vesselDay0[v] = sorted[0]; // earliest date = day 0 for this vessel
  });
  const msPerDay = 86400000;
  const vessels = {};
  let batchId = '';
  rawRows.forEach(({ vessel, batchId: bid, tag, val, dateStr }) => {
    if (!batchId) batchId = bid;
    const mapping = MFCS2_TAG_MAP[tag];
    if (!mapping) return;
    const numVal = val === '' || val === undefined ? null : parseFloat(val);
    if (numVal === null || isNaN(numVal)) return;
    // Compute culture day from date offset
    const day0 = vesselDay0[vessel];
    let cultureDay = 0;
    if (dateStr && day0) {
      const d0 = new Date(day0).getTime();
      const d1 = new Date(dateStr).getTime();
      cultureDay = Math.round((d1 - d0) / msPerDay);
    }
    if (!vessels[vessel]) vessels[vessel] = { condition: vessel, timepointMeta: new Map(), series: {} };
    const vEntry = vessels[vessel];
    if (!vEntry.timepointMeta.has(cultureDay)) {
      vEntry.timepointMeta.set(cultureDay, { date: dateStr });
    }
    if (!vEntry.series[mapping.key]) vEntry.series[mapping.key] = new Map();
    if (!vEntry.series[mapping.key].has(cultureDay)) {
      vEntry.series[mapping.key].set(cultureDay, numVal);
    }
  });
  if (Object.keys(vessels).length === 0) {
    console.warn('MFCS2: no valid rows matched batchname pattern T…X… or A…X…. Skipping.');
    return null;
  }
  if (!batchId && fileName) { const m = fileName.match(/[A-Z]\d+/i); if (m) batchId = m[0]; }
  if (!batchId) batchId = 'T_UNKNOWN';
  const bioreactors = {};
  Object.entries(vessels).forEach(([vesselId, vEntry]) => {
    const vDays = Array.from(vEntry.timepointMeta.keys()).sort((a, b) => a - b);
    const timepoints = vDays.map(d => {
      const meta = vEntry.timepointMeta.get(d);
      return { culture_day: d, export_dt: meta?.date ? `${meta.date}T00:00:00` : null, date: meta?.date || null, sample_code_id: null };
    });
    const series = {};
    Object.entries(vEntry.series).forEach(([sk, dayMap]) => {
      series[sk] = vDays.map(d => dayMap.has(d) ? dayMap.get(d) : null);
    });
    bioreactors[vesselId] = { condition: vesselId, timepoints, series };
  });
  // Detect instrument type from batchname suffix: R-vessels = BIOSTAT B RM Twin, X-vessels = ambr250
  const vesselKeys = Object.keys(bioreactors);
  const isRockerBag = vesselKeys.some(v => /^R\d+/i.test(v));
  const productLabel = isRockerBag ? 'Cell Culture (BIOSTAT B RM Twin)' : 'Cell Culture (MFCS2)';
  const analyzerLabel = isRockerBag ? 'BIOSTAT B RM Twin / MFCS SCADA' : 'ambr250 / MFCS2 SCADA';
  return { run: { run_id: batchId, product: productLabel, site: 'AT-Vienna', analyzer: analyzerLabel }, bioreactors, _source: 'mfcs2_csv', _fileName: fileName };
};

/**
 * Parse an Aster HPLC CSV into the internal fermentation JSON.
 * sample_description format: T0792545X11K14 → vessel=X11, culture_day=14
 */
const parseAsterCSV = (csvText, fileName = '') => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('Aster CSV appears empty.');
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const getIdx = (name) => header.findIndex(h => h.includes(name));
  const descIdx   = getIdx('sample_description');
  const resultIdx = getIdx('numeric_result');
  const analyteIdx= getIdx('test_analyte_units');
  if (descIdx === -1 || resultIdx === -1) throw new Error('Aster CSV: required columns missing (sample_description, numeric_result).');
  const SAMPLE_RE = /^(T\d+)(X\d+)K(\d+)$/i;
  const vessels = {};
  let batchId = '';
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const desc    = cols[descIdx];
    const match   = SAMPLE_RE.exec(desc);
    if (!match) continue;
    const thisBatch  = match[1];
    const vessel     = match[2].toUpperCase();
    const cultureDay = parseInt(match[3], 10);
    if (!batchId) batchId = thisBatch;
    const rawVal = cols[resultIdx];
    const numVal = rawVal === '' ? null : parseFloat(rawVal);
    if (numVal === null || isNaN(numVal)) continue;
    // Determine which key from analyte label
    const analyteLabel = analyteIdx >= 0 ? cols[analyteIdx] : '';
    const mapping = ASTER_ANALYTE_MAP[analyteLabel] || { key: 'protein_a_hplc_mg_per_l', label: 'Protein A Titer (HPLC)', unit: 'mg/mL' };
    if (!vessels[vessel]) vessels[vessel] = { condition: vessel, timepointMeta: new Map(), series: {} };
    const vEntry = vessels[vessel];
    if (!vEntry.timepointMeta.has(cultureDay)) {
      const dateIdx = getIdx('results_log_date');
      const dateStr = dateIdx >= 0 ? (cols[dateIdx] || '').split(' ')[0] : null;
      vEntry.timepointMeta.set(cultureDay, { date: dateStr });
    }
    if (!vEntry.series[mapping.key]) vEntry.series[mapping.key] = new Map();
    if (!vEntry.series[mapping.key].has(cultureDay)) {
      vEntry.series[mapping.key].set(cultureDay, numVal);
    }
  }
  if (Object.keys(vessels).length === 0) {
    console.warn('Aster: no valid rows matched sample_description pattern T…X…K… Skipping.');
    return null;
  }
  if (!batchId && fileName) { const m = fileName.match(/[A-Z]\d+/i); if (m) batchId = m[0]; }
  if (!batchId) batchId = 'T_UNKNOWN';
  const bioreactors = {};
  Object.entries(vessels).forEach(([vesselId, vEntry]) => {
    const vDays = Array.from(vEntry.timepointMeta.keys()).sort((a, b) => a - b);
    const timepoints = vDays.map(d => {
      const meta = vEntry.timepointMeta.get(d);
      return { culture_day: d, export_dt: meta?.date ? `${meta.date}T00:00:00` : null, date: meta?.date || null, sample_code_id: null };
    });
    const series = {};
    Object.entries(vEntry.series).forEach(([sk, dayMap]) => {
      series[sk] = vDays.map(d => dayMap.has(d) ? dayMap.get(d) : null);
    });
    bioreactors[vesselId] = { condition: vesselId, timepoints, series };
  });
  return { run: { run_id: batchId, product: 'Cell Culture (Aster HPLC)', site: 'AT-Vienna', analyzer: 'Aster HPLC Protein A' }, bioreactors, _source: 'aster_csv', _fileName: fileName };
};

/**
 * Merge multiple parsed instrument datasets into a single unified JSON.
 * Vessels are matched by vessel ID (X11, X12, …).
 * Culture days from different instruments are unioned; missing values are null.
 */
const mergeInstrumentDatasets = (datasets) => {
  // Filter out null/undefined results from parsers that found no valid data
  const valid = (datasets || []).filter(Boolean);
  if (valid.length === 0) throw new Error('No datasets to merge — all instrument parsers returned empty results.');
  if (valid.length === 1) return valid[0];
  // Use the first dataset's run metadata as base
  const baseRun = valid[0].run || {};
  // Collect all vessels across all datasets
  const allVessels = new Set();
  valid.forEach(ds => Object.keys(ds.bioreactors || {}).forEach(v => allVessels.add(v)));
  const mergedBioreactors = {};
  allVessels.forEach(vessel => {
    // Collect all culture days and series across instruments
    const allDays = new Set();
    const allSeries = {};  // seriesKey → Map<cultureDay, value>
    const dayToDate = {};  // cultureDay → date string
    valid.forEach(ds => {
      const br = ds.bioreactors?.[vessel];
      if (!br) return;
      br.timepoints?.forEach(tp => {
        const d = tp.culture_day;
        if (d !== null && d !== undefined) {
          allDays.add(d);
          if (tp.date && !dayToDate[d]) dayToDate[d] = tp.date;
        }
      });
      if (br.series) {
        Object.entries(br.series).forEach(([sk, vals]) => {
          if (!allSeries[sk]) allSeries[sk] = new Map();
          br.timepoints?.forEach((tp, idx) => {
            const d = tp.culture_day;
            if (d !== null && d !== undefined && vals[idx] !== null && vals[idx] !== undefined && !allSeries[sk].has(d)) {
              allSeries[sk].set(d, vals[idx]);
            }
          });
        });
      }
    });
    const sortedDays = Array.from(allDays).sort((a, b) => a - b);
    const timepoints = sortedDays.map(d => ({
      culture_day: d,
      export_dt: dayToDate[d] ? `${dayToDate[d]}T00:00:00` : null,
      date: dayToDate[d] || null,
      sample_code_id: null,
    }));
    const series = {};
    Object.entries(allSeries).forEach(([sk, dayMap]) => {
      series[sk] = sortedDays.map(d => dayMap.has(d) ? dayMap.get(d) : null);
    });
    mergedBioreactors[vessel] = { condition: vessel, timepoints, series };
  });
  const sources = valid.map(ds => ds._source).filter(Boolean);
  return {
    run: { ...baseRun, product: 'Cell Culture (Multi-Instrument)', analyzer: sources.join(' + ') },
    bioreactors: mergedBioreactors,
    _source: 'multi_instrument',
    _sources: sources,
    _rawDatasets: valid,
  };
};

/**
 * Parse a CSV file — auto-detects instrument type and routes to the right parser.
 */
const parseCSVByInstrument = (csvText, fileName = '') => {
  const header = csvText.split(/\r?\n/)[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const instrument = detectCSVInstrument(header);
  switch (instrument) {
    case 'roche_cedex': return parseCedexCSV(csvText, fileName);
    case 'novaflex':    return parseNovaFlexCSV(csvText, fileName);
    case 'mfcs2':       return parseMFCS2CSV(csvText, fileName);
    case 'aster':       return parseAsterCSV(csvText, fileName);
    default:            return parseCedexCSV(csvText, fileName); // fallback
  }
};

/**
 * Parse multiple uploaded files (mixed instrument types) and merge them.
 */
const parseMultipleFiles = async (files) => {
  // Use allSettled so a single bad file doesn't block the rest
  const results = await Promise.allSettled(
    Array.from(files).map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const name = file.name || '';
        try {
          if (name.toLowerCase().endsWith('.json')) { resolve(JSON.parse(text)); return; }
          resolve(parseCSVByInstrument(text, name));
        } catch (err) { reject(new Error(`${name}: ${err.message}`)); }
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsText(file);
    }))
  );

  const datasets = [];
  const errors   = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) datasets.push(r.value);
    else if (r.status === 'rejected') errors.push(r.reason?.message || `File ${i + 1} failed`);
  });

  if (datasets.length === 0) {
    const errDetail = errors.length > 0 ? `\n${errors.join('\n')}` : '';
    throw new Error(`None of the uploaded files could be parsed.${errDetail}`);
  }

  const merged = mergeInstrumentDatasets(datasets);
  // Attach partial-load warnings so UI can display them
  if (errors.length > 0) merged._parseWarnings = errors;
  return merged;
};

/**
 * Parse a single uploaded file (JSON or any supported CSV).
 */
/**
 * Parse a CEDEX BIO HT CSV text into the internal fermentation JSON format.
 * Handles duplicates (same measurement in two source files) by keeping the
 * first occurrence (deduplicate on vessel + culture_day + analyte_key).
 *
 * @param {string} csvText  Raw CSV file content
 * @param {string} [fileName]  Original file name (used to extract batch ID hint)
 * @returns {Object}  Internal JSON data structure consumed by the dashboards
 */
// Safe date parser – returns null for invalid/empty strings, never throws
const safeParseDate = (str) => {
  if (!str || typeof str !== 'string') return null;
  // Normalise common date formats to ISO-compatible:
  // "DD/MM/YYYY" → "YYYY-MM-DD", "MM/DD/YYYY" → try both
  let s = str.trim();
  // Replace slash-separated dates: handle MM/DD/YYYY or DD/MM/YYYY by trying to parse
  // If the string has a time component after 'T', preserve it
  const timePartMatch = s.match(/T(.+)$/);
  const timePart = timePartMatch ? timePartMatch[1] : null;
  const datePart = s.replace(/T.+$/, '').trim();

  // Try slash format
  const slashMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    // Assume MM/DD/YYYY (most CEDEX US exports) – but verify with range
    const month = parseInt(a, 10);
    const day   = parseInt(b, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      s = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    } else {
      // Try DD/MM/YYYY
      s = `${year}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
    }
    if (timePart) s += `T${timePart}`;
  }

  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

const parseCedexCSV = (csvText, fileName = '') => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV file appears empty or has no data rows.');

  // Parse header
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const colIdx = (name) => {
    const idx = header.findIndex(h => h === name || h.includes(name));
    return idx;
  };

  const sampleNameIdx   = colIdx('sample_name');
  const analyteIdx      = colIdx('run_analyte');
  const valueIdx        = colIdx('result_measured_value');
  const runDateIdx      = colIdx('run_date');
  const runTimeIdx      = colIdx('run_time_acquired');
  const siteIdx         = colIdx('site');
  const modelIdx        = colIdx('system_model');
  const systemTypeIdx   = colIdx('system_type');

  if (sampleNameIdx === -1 || analyteIdx === -1 || valueIdx === -1) {
    throw new Error(
      'CSV format not recognized. Expected columns: sample_name, run_analyte, result_measured_value.\n' +
      `Found: ${header.slice(0, 15).join(', ')}...`
    );
  }

  // ── Parse rows ──────────────────────────────────────────────────────────
  // sample_name pattern: T0792531X15K11 → batch=T0792531, vessel=X15, culture_day=11
  const SAMPLE_RE = /^(T\d+)(X\d+)K(\d+)$/i;

  // vessel → { condition, timepoints: Map<culture_day, {date, time}>, series: Map<seriesKey, Map<culture_day, value>> }
  const vessels = {};
  let batchId = '';
  let site = '';
  let systemModel = 'CEDEX BIO HT';

  // Seen set for deduplication: vessel_cultureday_seriesKey
  const seen = new Set();

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    // Proper CSV parse: handle quoted fields
    const cols = raw.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || raw.split(',');
    const get = (idx) => idx >= 0 ? (cols[idx] || '').replace(/^"|"$/g, '').trim() : '';

    const sampleName = get(sampleNameIdx);
    const analyte    = get(analyteIdx).toUpperCase();
    const rawValue   = get(valueIdx);
    const runDate    = get(runDateIdx);
    const runTime    = get(runTimeIdx);

    if (siteIdx >= 0 && !site)       site        = get(siteIdx);
    if (modelIdx >= 0 && !systemModel) systemModel = get(modelIdx);

    const match = SAMPLE_RE.exec(sampleName);
    if (!match) continue; // skip rows like calibrators / controls

    const thisBatch  = match[1];
    const vessel     = match[2].toUpperCase();   // e.g. X15
    const cultureDay = parseInt(match[3], 10);   // e.g. 11

    if (!batchId) batchId = thisBatch;

    const mapping = CEDEX_ANALYTE_MAP[analyte];
    if (!mapping) continue; // unmapped analyte – skip

    const seriesKey = mapping.key;
    const dedupKey  = `${vessel}_${cultureDay}_${seriesKey}`;
    if (seen.has(dedupKey)) continue; // duplicate – first occurrence wins
    seen.add(dedupKey);

    const numericValue = rawValue === '' ? null : parseFloat(rawValue);
    if (numericValue !== null && isNaN(numericValue)) continue; // unparseable

    // Initialise vessel entry
    if (!vessels[vessel]) {
      vessels[vessel] = {
        condition: vessel,
        timepointMeta: new Map(),   // culture_day → { date, time }
        series: {},                 // seriesKey → Map<culture_day, value>
      };
    }
    const vEntry = vessels[vessel];

    // Record timepoint metadata
    if (!vEntry.timepointMeta.has(cultureDay)) {
      vEntry.timepointMeta.set(cultureDay, { date: runDate, time: runTime });
    }

    // Record measurement
    if (!vEntry.series[seriesKey]) vEntry.series[seriesKey] = new Map();
    vEntry.series[seriesKey].set(cultureDay, numericValue);
  }

  if (Object.keys(vessels).length === 0) {
    console.warn('Roche CEDEX: no valid rows matched sample_name pattern T…X…K…. Skipping.');
    return null;
  }

  // Hint: if batchId not found in rows, try extracting from fileName
  if (!batchId && fileName) {
    const m = fileName.match(/[A-Z]\d+/i);
    if (m) batchId = m[0];
  }
  if (!batchId) batchId = 'T_UNKNOWN';

  // ── Assemble internal JSON ───────────────────────────────────────────────
  // Collect all culture days across all vessels and all analytes
  const allDaysSet = new Set();
  Object.values(vessels).forEach(v => v.timepointMeta.forEach((_, d) => allDaysSet.add(d)));
  const allDays = Array.from(allDaysSet).sort((a, b) => a - b);

  const bioreactors = {};
  Object.entries(vessels).forEach(([vesselId, vEntry]) => {
    // Build sorted unique culture days for this vessel
    const vDays = Array.from(vEntry.timepointMeta.keys()).sort((a, b) => a - b);

    const timepoints = vDays.map(d => {
      const meta = vEntry.timepointMeta.get(d);
      return {
        culture_day: d,
        export_dt: (() => {
          if (!meta?.date) return null;
          // Normalise date from CEDEX (may be MM/DD/YYYY or DD/MM/YYYY or YYYY-MM-DD)
          const d = safeParseDate(meta.date);
          if (!d) return null;
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}T${meta.time || '00:00:00'}`;
        })(),
        date: meta?.date || null,
        sample_code_id: null,
      };
    });

    const series = {};
    Object.entries(vEntry.series).forEach(([sk, dayMap]) => {
      series[sk] = vDays.map(d => dayMap.has(d) ? dayMap.get(d) : null);
    });

    // Fill any series with nulls for days that exist in the vessel but not in the series
    Object.keys(series).forEach(sk => {
      if (series[sk].length !== vDays.length) {
        series[sk] = vDays.map(d => vEntry.series[sk]?.get(d) ?? null);
      }
    });

    bioreactors[vesselId] = { condition: vesselId, timepoints, series };
  });

  return {
    run: {
      run_id: batchId,
      product: 'Cell Culture (CEDEX BIO HT)',
      site: site || 'AT-Vienna',
      analyzer: systemModel || 'CEDEX BIO HT',
    },
    bioreactors,
    _source: 'cedex_csv',
    _fileName: fileName,
  };
};

/**
 * Attempt to load and parse any supported file type (JSON or CEDEX CSV).
 * Returns the internal JSON data object or throws with a user-friendly message.
 */
const parseUploadedFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const name = file.name || '';
      // ── JSON file ──
      if (name.toLowerCase().endsWith('.json')) {
        try { resolve(JSON.parse(text)); } catch { reject(new Error('Invalid JSON file.')); }
        return;
      }
      // ── CSV file — auto-detect instrument type ──
      if (name.toLowerCase().endsWith('.csv')) {
        try { resolve(parseCSVByInstrument(text, name)); } catch (err) { reject(new Error(`CSV parse error: ${err.message}`)); }
        return;
      }
      // ── Unknown extension ──
      try { resolve(JSON.parse(text)); return; } catch {}
      try { resolve(parseCSVByInstrument(text, name)); return; } catch {}
      reject(new Error('Unsupported file format. Please upload a Roche CEDEX, NovaFlex, MFCS2, Aster, or JSON file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
};

// --- PERSISTENT STORAGE KEY ---
const STORAGE_KEY_DATA = 'fermentation_dashboard_uploaded_data';
const STORAGE_KEY_EXCLUSIONS = 'fermentation_dashboard_exclusions';
const STORAGE_KEY_EDITS = 'fermentation_dashboard_data_edits';

// --- CONFIG: PREDEFINED CHART LIBRARY ---
const CHART_LIBRARY = [
  {
    category: 'Cell Growth',
    items: [
      { id: 'vcd', label: 'VCD (Viable Cell Concentration)', patterns: ['vcd', 'vcc', 'viable_cell_concentration', 'viable_cells'], unit: '10^6 cells/mL', description: 'Viable Cell Concentration', source: 'Vi-Cell' },
      { id: 'tcd', label: 'TCD (Total Cell Concentration)', patterns: ['tcd', 'tcc', 'total_cell_concentration', 'total_cells'], unit: '10^6 cells/mL', description: 'Total Cell Concentration', source: 'Vi-Cell' },
      { id: 'viab', label: 'Viability', patterns: ['viability', 'viab_pct'], unit: '%', description: 'Cell Viability', source: 'Vi-Cell' },
      { id: 'ivca', label: 'IVCA (In-Vitro-Cell-Age)', patterns: ['ivca', 'in_vitro_cell_age', 'cell_age'], unit: 'days', description: 'In-Vitro Cell Age', source: 'Calculated' },
      { id: 'mu', label: 'Growth Rate (µ)', patterns: ['u_d', 'growth_rate', 'mu'], unit: '1/d', description: 'Specific Growth Rate', source: 'Calculated' },
      { id: 'spec_prod', label: 'Specific Productivity', patterns: ['specific_productivity', 'specific_prod', 'q_p', 'qp'], unit: 'pg/cell/day', description: 'Specific Productivity', source: 'Calculated' }
    ]
  },
  {
    category: 'Metabolites',
    items: [
      { id: 'gluc', label: 'Glucose', patterns: ['gluc', 'glucose'], unit: 'g/L', description: 'Glucose Concentration', compareWith: 'lac', source: 'Flex2' },
      { id: 'lac', label: 'Lactate', patterns: ['lac', 'lactate'], unit: 'g/L', description: 'Lactate Concentration', source: 'Flex2' },
      { id: 'gln', label: 'Glutamine', patterns: ['gln', 'glutamine'], unit: 'mM', description: 'Glutamine Concentration', source: 'Flex2' },
      { id: 'glu', label: 'Glutamate', patterns: ['glu', 'glutamate'], unit: 'mM', description: 'Glutamate Concentration', source: 'Flex2' },
      { id: 'nh4', label: 'Ammonium', patterns: ['nh4', 'ammonium'], unit: 'mM', description: 'Ammonium Concentration', source: 'Flex2' },
      { id: 'osm', label: 'Osmolarity', patterns: ['osm', 'osmolarity', 'osmolality'], unit: 'mOsm/kg', description: 'Osmolarity', source: 'Flex2' },
      { id: 'qglu_2pt', label: '2-point qGlu Consumed', patterns: ['qglu', 'q_glu', 'qglu_2pt', 'qglu_2_point', 'specific_glucose', 'glucose_consumed'], unit: 'g/10^6 cells/day', description: '2-Point Specific Glucose Consumed', source: 'Calculated' },
      { id: 'ldh', label: 'LDH', patterns: ['ldh'], unit: 'U/L', description: 'Lactate Dehydrogenase', source: 'Flex2' }
    ]
  },
  {
    category: 'Process Parameters',
    items: [
      { id: 'ph', label: 'pH', patterns: ['ph_online', 'ph'], unit: '', description: 'Online pH', source: 'Online Probe' },
      { id: 'ph_offline', label: 'pH (offline)', patterns: ['ph_offline', 'ph_off', 'ph_offline_meas'], unit: '', description: 'Offline pH', source: 'Offline' },
      { id: 'po2_offline', label: 'pO2 (offline)', patterns: ['po2_offline', 'po2_off', 'do_offline'], unit: '%', description: 'Offline pO2', source: 'Offline' },
      { id: 'pco2_offline', label: 'pCO2 (offline)', patterns: ['pco2_offline', 'pco2_off'], unit: 'mmHg', description: 'Offline pCO2', source: 'Offline' },
      { id: 'ph_brx', label: 'pH (BRX)', patterns: ['ph_brx', 'brx_ph'], unit: '', description: 'BRX pH', source: 'BRX' },
      { id: 'o2_brx', label: 'O2 (BRX)', patterns: ['o2_brx', 'brx_o2', 'brx_do'], unit: '%', description: 'BRX O2', source: 'BRX' },
      { id: 'vessel_weight', label: 'Vessel weight', patterns: ['vessel_weight', 'weight_vessel'], unit: 'g', description: 'Vessel Weight', source: 'Scale' },
      { id: 'cwv', label: 'CWV (Compensated working volume)', patterns: ['cwv', 'compensated_working_volume'], unit: 'mL', description: 'Compensated Working Volume', source: 'Calculated' },
      { id: 'cwvinc', label: 'CWVinc (Compensated working volume increase)', patterns: ['cwvinc', 'cwv_inc', 'compensated_working_volume_increase'], unit: 'mL', description: 'Compensated Working Volume Increase', source: 'Calculated' },
      { id: 'ph_off', label: 'pH Offset', patterns: ['ph_offset'], unit: '', description: 'pH Calibration Offset', source: 'Offline' },
      { id: 'pco2', label: 'pCO2', patterns: ['pco2'], unit: 'mmHg', description: 'Partial Pressure CO2', source: 'Online Probe' }
    ]
  },
  {
    category: 'Consumption & Feeds',
    items: [
      { id: 'base', label: 'Base Consumption', patterns: ['base', 'naoh'], unit: 'mL/d', description: 'Base Addition', source: 'Scale' },
      { id: 'titrant', label: 'Titrant (Cumulative titrant addition)', patterns: ['titrant', 'cumulative_titrant', 'titrant_addition'], unit: 'mL', description: 'Cumulative Titrant Addition', source: 'Scale' },
      { id: 'feed', label: 'Feed', patterns: ['feed', 'feed_a'], unit: 'mL', description: 'Feed Volume', source: 'Scale' },
      { id: 'feed_1', label: 'Feed-1 (Cumulative Feed-1 addition)', patterns: ['feed_1', 'feed1', 'feednum1', 'cumulative_feed_1'], unit: 'mL', description: 'Cumulative Feed-1 Addition', source: 'Scale' },
      { id: 'gluc_feed', label: 'Glucose Feed', patterns: ['glucose_feed', 'feed_gluc'], unit: 'mL', description: 'Glucose Feed Volume', source: 'Scale' },
      { id: 'gluc_add', label: 'Glucose addition amount', patterns: ['glucose_addition', 'glucose_addition_amount', 'gluc_add', 'glucose_add'], unit: 'mL', description: 'Glucose Addition Amount', source: 'Scale' },
      { id: 'antifoam', label: 'Antifoam (Cumulative Antifoam Addition)', patterns: ['antifoam', 'cum_antifoam', 'cumulative_antifoam'], unit: 'mL', description: 'Cumulative Antifoam Addition', source: 'Scale' }
    ]
  },
  {
    category: 'Product Quality',
    items: [
      { id: 'titer', label: 'Titer', patterns: ['protein_a', 'hplc', 'titer', 'prot_a'], unit: 'µg/mL', description: 'Product Titer', source: 'HPLC' },
      { id: 'igg', label: 'IgG', patterns: ['igg'], unit: 'mg/L', description: 'Immunoglobulin G', source: 'Cedex' }
    ]
  },
  {
    category: 'NovaFlex — Cell Growth',
    items: [
      { id: 'nf_vcd', label: 'VCD (NovaFlex)', patterns: ['viable_cells_x106', 'vcd', 'viable_density'], unit: '10⁶ cells/mL', description: 'Viable Cell Density', source: 'NovaFlex' },
      { id: 'nf_tcd', label: 'TCD (NovaFlex)', patterns: ['total_cells_x106', 'tcd', 'total_density'], unit: '10⁶ cells/mL', description: 'Total Cell Density', source: 'NovaFlex' },
      { id: 'nf_viab', label: 'Viability % (NovaFlex)', patterns: ['cell_viability_pct', 'viability_pct', 'viability'], unit: '%', description: 'Cell Viability', source: 'NovaFlex' },
      { id: 'nf_diam', label: 'Avg Cell Diameter (NovaFlex)', patterns: ['avg_diam_um', 'diam'], unit: 'µm', description: 'Average Live Cell Diameter', source: 'NovaFlex' },
    ]
  },
  {
    category: 'NovaFlex — Metabolites',
    items: [
      { id: 'nf_gluc', label: 'Glucose (NovaFlex)', patterns: ['novaflex_gluc'], unit: 'g/L', description: 'Glucose (NovaFlex offline)', source: 'NovaFlex' },
      { id: 'nf_lac', label: 'Lactate (NovaFlex)', patterns: ['novaflex_lac'], unit: 'g/L', description: 'Lactate (NovaFlex)', source: 'NovaFlex' },
      { id: 'nf_gln', label: 'Glutamine (NovaFlex)', patterns: ['novaflex_gln'], unit: 'mmol/L', description: 'Glutamine (NovaFlex)', source: 'NovaFlex' },
      { id: 'nf_glu', label: 'Glutamate (NovaFlex)', patterns: ['novaflex_glu'], unit: 'mmol/L', description: 'Glutamate (NovaFlex)', source: 'NovaFlex' },
      { id: 'nf_nh4', label: 'Ammonium (NovaFlex)', patterns: ['novaflex_nh4'], unit: 'mmol/L', description: 'Ammonium (NovaFlex)', source: 'NovaFlex' },
      { id: 'nf_osm', label: 'Osmolality (NovaFlex)', patterns: ['osm_mosm_per_kg', 'osm'], unit: 'mOsm/kg', description: 'Osmolality', source: 'NovaFlex' },
    ]
  },
  {
    category: 'NovaFlex — Ions & Gases',
    items: [
      { id: 'nf_na', label: 'Sodium (NovaFlex)', patterns: ['novaflex_na_mmol'], unit: 'mmol/L', description: 'Sodium Ion', source: 'NovaFlex' },
      { id: 'nf_k', label: 'Potassium (NovaFlex)', patterns: ['novaflex_k_mmol'], unit: 'mmol/L', description: 'Potassium Ion', source: 'NovaFlex' },
      { id: 'nf_ca', label: 'Calcium (NovaFlex)', patterns: ['novaflex_ca_mmol'], unit: 'mmol/L', description: 'Calcium Ion', source: 'NovaFlex' },
      { id: 'nf_ph', label: 'pH offline (NovaFlex)', patterns: ['ph_offline'], unit: '', description: 'Offline pH', source: 'NovaFlex' },
      { id: 'nf_po2', label: 'pO2 offline (NovaFlex)', patterns: ['po2_offline_pct'], unit: '%', description: 'Offline pO2', source: 'NovaFlex' },
      { id: 'nf_pco2', label: 'pCO2 offline (NovaFlex)', patterns: ['pco2_offline_mmhg'], unit: 'mmHg', description: 'Offline pCO2', source: 'NovaFlex' },
      { id: 'nf_o2sat', label: 'O2 Saturation (NovaFlex)', patterns: ['o2_saturation_pct'], unit: '%', description: 'O2 Saturation', source: 'NovaFlex' },
      { id: 'nf_bicarb', label: 'Bicarbonate (NovaFlex)', patterns: ['bicarb_mmol_per_l'], unit: 'mmol/L', description: 'Bicarbonate Ion', source: 'NovaFlex' },
    ]
  },
  {
    category: 'MFCS2 — Online Process',
    items: [
      { id: 'mfcs_ph', label: 'pH online (MFCS2)', patterns: ['mfcs_ph_online'], unit: '', description: 'Online pH', source: 'MFCS2' },
      { id: 'mfcs_do', label: 'DO % (MFCS2)', patterns: ['mfcs_do_pct'], unit: '%', description: 'Dissolved Oxygen', source: 'MFCS2' },
      { id: 'mfcs_temp', label: 'Temperature (MFCS2)', patterns: ['mfcs_temp_degc'], unit: '°C', description: 'Temperature', source: 'MFCS2' },
      { id: 'mfcs_agit', label: 'Agitation (MFCS2)', patterns: ['mfcs_agitation_rpm'], unit: 'rpm', description: 'Agitation Speed', source: 'MFCS2' },
      { id: 'mfcs_vol', label: 'Volume (MFCS2)', patterns: ['mfcs_volume_ml'], unit: 'mL', description: 'Working Volume', source: 'MFCS2' },
    ]
  },
  {
    category: 'MFCS2 — Gas Flows',
    items: [
      { id: 'mfcs_air', label: 'Air Flow (MFCS2)', patterns: ['mfcs_air_flow'], unit: 'mL/min', description: 'Air Flow (headspace)', source: 'MFCS2' },
      { id: 'mfcs_o2f', label: 'O2 Flow (MFCS2)', patterns: ['mfcs_o2_flow'], unit: 'mL/min', description: 'O2 Flow (headspace)', source: 'MFCS2' },
      { id: 'mfcs_n2f', label: 'N2 Flow (MFCS2)', patterns: ['mfcs_n2_flow'], unit: 'mL/min', description: 'N2 Flow (headspace)', source: 'MFCS2' },
      { id: 'mfcs_co2f', label: 'CO2 Flow (MFCS2)', patterns: ['mfcs_co2_flow'], unit: 'mL/min', description: 'CO2 Flow (headspace)', source: 'MFCS2' },
      { id: 'mfcs_base', label: 'Base Pumped (MFCS2)', patterns: ['mfcs_base_vol_ml'], unit: 'mL', description: 'Base Volume Pumped', source: 'MFCS2' },
      { id: 'mfcs_acid', label: 'Acid Pumped (MFCS2)', patterns: ['mfcs_acid_vol_ml'], unit: 'mL', description: 'Acid Volume Pumped', source: 'MFCS2' },
      { id: 'mfcs_gluc_online', label: 'Glucose online (MFCS2)', patterns: ['mfcs_gluc_online'], unit: 'g/L', description: 'Online Glucose', source: 'MFCS2' },
    ]
  },
  {
    category: 'BIOSTAT B RM Twin — Rocking Mechanics',
    items: [
      { id: 'rm_rocking_rate',  label: 'Rocking Rate (RM)',  patterns: ['mfcs_agitation_rpm'], unit: 'r/min', description: 'Rocking speed', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_rocking_angle', label: 'Rocking Angle (RM)', patterns: ['mfcs_rocking_angle_deg'], unit: '°', description: 'Rocking angle', source: 'MFCS2/BIOSTAT RM' },
    ]
  },
  {
    category: 'BIOSTAT B RM Twin — Biomass & Process',
    items: [
      { id: 'rm_biomass',       label: 'Biomass — capacitance probe', patterns: ['mfcs_biomass_e6c_per_ml'], unit: 'E6 cells/mL', description: 'Online biomass via capacitance', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_capacitance',   label: 'Capacitance (RM)',             patterns: ['mfcs_capacitance_pf_per_cm'], unit: 'pF/cm', description: 'Raw capacitance signal', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_pressure',      label: 'Pressure (RM)',                patterns: ['mfcs_pressure_mbar'], unit: 'mbar', description: 'Headspace pressure', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_conductivity',  label: 'Conductivity (RM)',            patterns: ['mfcs_conductivity_ms'], unit: 'mS/cm', description: 'Media conductivity', source: 'MFCS2/BIOSTAT RM' },
    ]
  },
  {
    category: 'BIOSTAT B RM Twin — Feeds & Weights',
    items: [
      { id: 'rm_subst_a',    label: 'Substrate A Added (RM)', patterns: ['mfcs_subst_a_ml'], unit: 'mL', description: 'Cumulative substrate A', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_subst_b',    label: 'Substrate B Added (RM)', patterns: ['mfcs_subst_b_ml'], unit: 'mL', description: 'Cumulative substrate B', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_subst_c',    label: 'Substrate C Added (RM)', patterns: ['mfcs_subst_c_ml'], unit: 'mL', description: 'Cumulative substrate C', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_rweight',    label: 'Vessel Weight (RM)',      patterns: ['mfcs_rweight_kg'], unit: 'kg', description: 'Rocker bag weight', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_fweight_a',  label: 'Feed Weight A (RM)',      patterns: ['mfcs_fweight_a_kg'], unit: 'kg', description: 'Feed bag A weight', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_fweight_b',  label: 'Feed Weight B (RM)',      patterns: ['mfcs_fweight_b_kg'], unit: 'kg', description: 'Feed bag B weight', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_flow_a',     label: 'Flow A (RM)',             patterns: ['mfcs_flow_a_kg_per_h'], unit: 'kg/h', description: 'Feed flow A', source: 'MFCS2/BIOSTAT RM' },
      { id: 'rm_flow_b',     label: 'Flow B (RM)',             patterns: ['mfcs_flow_b_kg_per_h'], unit: 'kg/h', description: 'Feed flow B', source: 'MFCS2/BIOSTAT RM' },
    ]
  },
  {
    category: 'Cross-Instrument Comparison',
    items: [
      { id: 'cx_gluc', label: 'Glucose: NovaFlex vs CEDEX', patterns: ['novaflex_gluc', 'gluc_g_per_l'], unit: 'g/L', description: 'Glucose comparison', source: 'NovaFlex + CEDEX' },
      { id: 'cx_nh4', label: 'Ammonium: NovaFlex vs CEDEX', patterns: ['novaflex_nh4', 'nh3_mg_per_l'], unit: 'mM / mg/L', description: 'Ammonium comparison', source: 'NovaFlex + CEDEX' },
      { id: 'cx_ph', label: 'pH: NovaFlex offline vs MFCS2 online', patterns: ['ph_offline', 'mfcs_ph_online'], unit: '', description: 'pH cross-check', source: 'NovaFlex + MFCS2' },
      { id: 'cx_titer', label: 'Titer: Aster HPLC vs CEDEX IgG', patterns: ['protein_a_hplc', 'igg_mg_per_l'], unit: 'mg/mL', description: 'Titer cross-validation', source: 'Aster + CEDEX' },
    ]
  }
];

// --- CONFIG: METRIC GROUPS & FORMATTING ---
const METRIC_CONFIG = {
  'Metabolites': { patterns: ['gluc', 'lac', 'gln', 'glu', 'nh4', 'nh3', 'nab', 'asn', 'asp', 'pyr', 'novaflex_gluc', 'novaflex_lac', 'novaflex_gln', 'novaflex_glu', 'novaflex_nh4', 'mfcs_gluc_online', 'bicarb'], color: '#e11d48' },
  'Physical': { patterns: ['temp', 'stir', 'rpm', 'volume', 'feed', 'antifoam', 'base', 'hcl', 'split', 'mfcs_temp', 'mfcs_agitation', 'mfcs_volume', 'mfcs_base', 'mfcs_acid', 'osm_mosm', 'mfcs_rocking', 'mfcs_rweight', 'mfcs_fweight', 'mfcs_subst', 'mfcs_flow', 'mfcs_pressure', 'mfcs_conductivity'], color: '#2563eb' },
  'Gases/pH': { patterns: ['do_pct', 'ph', 'co2', 'o2', 'air', 'pco2', 'po2', 'saturation', 'mfcs_ph', 'mfcs_do', 'mfcs_air_flow', 'mfcs_o2_flow', 'mfcs_n2_flow', 'mfcs_co2_flow', 'ph_offline', 'pco2_offline', 'po2_offline', 'o2_saturation', 'co2_saturation', 'mfcs_capacitance', 'mfcs_biomass'], color: '#16a34a' },
  'Cell State': { patterns: ['viable_cells', 'total_cells', 'viability', 'vcc', 'tcc', 'diam', 'u_d', 'cell_viability', 'avg_diam'], color: '#d97706' },
  'Titer/Analysis': { patterns: ['protein_a', 'igg', 'ldh', 'osm', 'protein_a_hplc', 'hplc_mg'], color: '#9333ea' },
  'Ions': { patterns: ['na_g', 'k_g', 'ca_g', 'novaflex_na', 'novaflex_k', 'novaflex_ca'], color: '#0891b2' },
  'MFCS2 Online': { patterns: ['mfcs_'], color: '#7c3aed' },
  'NovaFlex': { patterns: ['novaflex_', 'ph_offline', 'pco2_offline', 'po2_offline', 'osm_mosm', 'o2_saturation', 'bicarb_mmol'], color: '#0d9488' },
};

const METRIC_CATEGORY_ORDER = ['Metabolites', 'Physical', 'Gases/pH', 'Cell State', 'Titer/Analysis', 'Ions', 'MFCS2 Online', 'NovaFlex', 'Other'];

const EXCLUDED_PATTERNS = [
  'bioreactor_flex2', 'flex2_samplecode', 'sampling_time', 'flex2_chemistry',
  'flex_2_cellcount', 'ph_before_sample', 'sample_vol',
  'aliquot_br', 'dilution_factor',
  'unnamed',
  '_2$', 'glu2b', 'glu2d', 'lac2b', 'lac2d', 'igghb', 'igghd', 'ldh2b', 'ldh2d',
  'unnamed_11', 'unnamed_12', 'unnamed_13', 'unnamed_14', 'unnamed_15',
  'unnamed_16', 'unnamed_17', 'unnamed_18', 'unnamed_19', 'unnamed_20'
];

const shouldExcludeSeries = (key) => {
  return EXCLUDED_PATTERNS.some(pattern => {
    if (pattern.endsWith('$')) return new RegExp(pattern).test(key);
    return key.toLowerCase().includes(pattern.toLowerCase());
  });
};

const formatMetricName = (key) => {
  if (!key) return '';
  const lower = key.toLowerCase();
  let unit = '';
  if (lower.includes('_g_per_l') || lower.includes('g/l')) unit = '(g/L)';
  else if (lower.includes('_mg_per_l') || lower.includes('mg/l')) unit = '(mg/L)';
  else if (lower.includes('_u_per_l') || lower.includes('u/l')) unit = '(U/L)';
  else if (lower.includes('_mm')) unit = '(mM)';
  else if (lower.includes('degc') || lower.includes('°c')) unit = '(°C)';
  else if (lower.includes('rpm')) unit = '(rpm)';
  else if (lower.includes('_pct') || lower.includes('%')) unit = '(%)';
  else if (lower.includes('_ppm')) unit = '(ppm)';
  else if (lower.includes('_ml')) unit = '(mL)';
  else if (lower.includes('x106') || lower.includes('1e06')) unit = '(?10? cells/mL)';
  else if (lower.includes('mmhg')) unit = '(mmHg)';
  else if (lower.includes('mosm')) unit = '(mOsm/kg)';
  else if (lower.includes('_um')) unit = '(µm)';
  else if (lower.includes('d_1') || lower.includes('d^-1')) unit = '(d??)';

  let name = key.replace(/_g_per_l|_mg_per_l|_u_per_l|_mm|_degc|_rpm|_pct|_ppm|_ml|_x106_c_per_ml|_1e06c_per_ml|_mmhg|_mosm_per_kg|_um|_d_1/gi, '')
                .replace(/_/g, ' ');

  const replacements = {
    'gluc': 'Glucose', 'lac': 'Lactate', 'gln': 'Glutamine', 'glu ': 'Glutamate ',
    'nh4': 'Ammonium', 'nh3': 'Ammonia', 'nab': 'NAB', 'protein a hplc': 'Protein A (HPLC)',
    'igg': 'IgG', 'ldh': 'LDH', 'temp': 'Temperature', 'stir speed': 'Stir Speed',
    'volume': 'Volume', 'vcc vicell': 'VCC', 'tcc vicell': 'TCC', 'viable cells': 'VCD',
    'total cells': 'TCD', 'cell viability': 'Viability', 'avg diam': 'Avg Diameter',
    'do': 'DO', 'po2': 'pO2', 'pco2': 'pCO2', 'o2 saturation': 'O2 Saturation',
    'co2 saturation': 'CO2 Saturation', 'air flow': 'Air Flow', 'co2 flow': 'CO2 Flow',
    'total o2 flow': 'Total O2 Flow', 'base consumption': 'Base Consumption',
    'hcl consumption': 'HCl Consumption', 'cum antifoam in': 'Cumulative Antifoam',
    'antifom': 'Antifoam', 'feednum1': 'Feed #1', 'feednum2': 'Feed #2',
    'u flex2': 'µ (Flex2)', 'osm': 'Osmolality',
    // CEDEX BIO HT analyte labels
    'asn': 'Asparagine', 'asp': 'Aspartate', 'pyr': 'Pyruvate',
    // NovaFlex labels
    'novaflex gluc': 'Glucose (NovaFlex)', 'novaflex lac': 'Lactate (NovaFlex)',
    'novaflex gln': 'Glutamine (NovaFlex)', 'novaflex glu': 'Glutamate (NovaFlex)',
    'novaflex nh4': 'Ammonium (NovaFlex)', 'novaflex na': 'Sodium (NovaFlex)',
    'novaflex k': 'Potassium (NovaFlex)', 'novaflex ca': 'Calcium (NovaFlex)',
    'ph offline': 'pH (offline)', 'po2 offline': 'pO2 (offline)', 'pco2 offline': 'pCO2 (offline)',
    'osm mosm': 'Osmolality', 'bicarb': 'Bicarbonate',
    // MFCS2 labels
    'mfcs ph online': 'pH (MFCS2 online)', 'mfcs do': 'DO% (MFCS2)', 'mfcs temp': 'Temp (MFCS2)',
    'mfcs agitation': 'Agitation (MFCS2)', 'mfcs volume': 'Volume (MFCS2)',
    'mfcs air flow': 'Air Flow (MFCS2)', 'mfcs o2 flow': 'O2 Flow (MFCS2)',
    'mfcs n2 flow': 'N2 Flow (MFCS2)', 'mfcs co2 flow': 'CO2 Flow (MFCS2)',
    'mfcs base vol': 'Base Pumped (MFCS2)', 'mfcs acid vol': 'Acid Pumped (MFCS2)',
    'mfcs gluc online': 'Glucose Online (MFCS2)',
  };

  let lowerName = name.toLowerCase();
  for (const [key, replacement] of Object.entries(replacements)) {
    if (lowerName.includes(key)) {
      name = lowerName.replace(key, replacement.toLowerCase());
      break;
    }
  }
  return unit ? `${name.charAt(0).toUpperCase() + name.slice(1)} ${unit}` : name.charAt(0).toUpperCase() + name.slice(1);
};

const getMetricCategory = (metric) => {
  const lower = metric.toLowerCase();
  for (const [cat, config] of Object.entries(METRIC_CONFIG)) {
    if (config.patterns.some(pattern => lower.includes(pattern))) {
      return cat;
    }
  }
  return 'Other';
};

const sortMetricsByPriority = (metrics) => {
  return [...metrics].sort((a, b) => {
    const categoryA = METRIC_CATEGORY_ORDER.indexOf(getMetricCategory(a));
    const categoryB = METRIC_CATEGORY_ORDER.indexOf(getMetricCategory(b));
    if (categoryA !== categoryB) return categoryA - categoryB;
    return a.localeCompare(b);
  });
};

// --- ANALYTICS UTILITIES ---
const linearRegression = (x, y) => {
  const n = x.length;
  if (n < 2) return null;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTotal = y.reduce((total, yi) => total + (yi - yMean) ** 2, 0);
  const ssResidual = y.reduce((total, yi, i) => total + (yi - (slope * x[i] + intercept)) ** 2, 0);
  const rSquared = 1 - (ssResidual / ssTotal);
  return { slope, intercept, rSquared };
};

const calculateStats = (values) => {
  if (!values || values.length === 0) return { mean: 0, std: 0, min: 0, max: 0, n: 0 };
  const validValues = values.filter(v => v !== null && !isNaN(v));
  const n = validValues.length;
  if (n === 0) return { mean: 0, std: 0, min: 0, max: 0, n: 0 };
  const mean = validValues.reduce((a, b) => a + b, 0) / n;
  const variance = validValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  return { mean, std, min: Math.min(...validValues), max: Math.max(...validValues), n };
};

const calculateIVCD = (timepoints, vccData) => {
  const ivcd = [0];
  let cumulative = 0;
  for (let i = 1; i < timepoints.length; i++) {
    const day1 = timepoints[i - 1];
    const day2 = timepoints[i];
    const vcc1 = vccData[i - 1];
    const vcc2 = vccData[i];
    if (day1 !== null && day2 !== null && vcc1 !== null && vcc2 !== null) {
      const deltaTime = day2 - day1;
      const avgVCC = (vcc1 + vcc2) / 2;
      cumulative += avgVCC * deltaTime;
    }
    ivcd.push(cumulative);
  }
  return ivcd;
};


// --- EXCLUSION UTILITY ---
const isDataExcluded = (exclusions, bioreactor, day, metric) => {
  if (!exclusions) return false;
  const key = `${bioreactor}_${day}_${metric}`;
  return exclusions[key] === true;
};

/**
 * parseAthenaRows — converts raw Athena/TetroScience API rows into the same
 * internal fermentation JSON format that parseCedexCSV produces.
 *
 * Athena rows have the exact same columns as the CEDEX CSV file
 * (sample_name, run_analyte, result_measured_value, run_date, run_time_acquired)
 * so we can reuse all the same parsing logic.
 *
 * @param {Object[]} rows        Rows from GET /api/data/:projectId
 * @param {string}   [projectId] Batch ID hint (e.g. "T0792531")
 * @returns {Object}             Internal JSON consumed by all dashboards
 */
const parseAthenaRows = (rows, projectId = '') => {
  if (!rows || rows.length === 0) throw new Error('No data rows returned from TetroScience.');

  // Same sample_name pattern as CEDEX CSV: T0792531X15K11
  const SAMPLE_RE = /^(T\d+)(X\d+)K(\d+)$/i;

  const vessels = {};
  const seen    = new Set();
  let   batchId = projectId || '';

  for (const row of rows) {
    const sampleName = (row.sample_name || '').trim();
    const analyte    = (row.run_analyte || '').toUpperCase();
    const rawValue   = row.result_measured_value;
    const runDate    = row.run_date    || null;
    const runTime    = row.run_time_acquired || null;

    const match = SAMPLE_RE.exec(sampleName);
    if (!match) continue;

    const thisBatch  = match[1];
    const vessel     = match[2].toUpperCase();
    const cultureDay = parseInt(match[3], 10);

    if (!batchId) batchId = thisBatch;

    const mapping = CEDEX_ANALYTE_MAP[analyte];
    if (!mapping) continue;

    const seriesKey = mapping.key;
    const dedupKey  = `${vessel}_${cultureDay}_${seriesKey}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const numericValue = rawValue === '' || rawValue === null ? null : parseFloat(String(rawValue).replace(',', '.'));
    if (numericValue !== null && isNaN(numericValue)) continue;

    if (!vessels[vessel]) {
      vessels[vessel] = { condition: vessel, timepointMeta: new Map(), series: {} };
    }
    const vEntry = vessels[vessel];

    if (!vEntry.timepointMeta.has(cultureDay)) {
      vEntry.timepointMeta.set(cultureDay, { date: runDate, time: runTime });
    }
    if (!vEntry.series[seriesKey]) vEntry.series[seriesKey] = new Map();
    vEntry.series[seriesKey].set(cultureDay, numericValue);
  }

  if (Object.keys(vessels).length === 0) {
    throw new Error('No valid bioreactor measurements found. Check sample_name format (T0792531X15K11).');
  }

  if (!batchId) batchId = 'T_UNKNOWN';

  const bioreactors = {};
  Object.entries(vessels).forEach(([vesselId, vEntry]) => {
    const vDays = Array.from(vEntry.timepointMeta.keys()).sort((a, b) => a - b);

    const timepoints = vDays.map(d => {
      const meta = vEntry.timepointMeta.get(d);
      const d2 = meta?.date ? safeParseDate(meta.date) : null;
      let exportDt = null;
      if (d2) {
        const yyyy = d2.getFullYear();
        const mm   = String(d2.getMonth() + 1).padStart(2, '0');
        const dd   = String(d2.getDate()).padStart(2, '0');
        exportDt = `${yyyy}-${mm}-${dd}T${meta.time ? meta.time.substring(0, 8) : '00:00:00'}`;
      }
      return { culture_day: d, export_dt: exportDt, date: meta?.date || null, sample_code_id: null };
    });

    const series = {};
    Object.entries(vEntry.series).forEach(([sk, dayMap]) => {
      series[sk] = vDays.map(d => dayMap.has(d) ? dayMap.get(d) : null);
    });

    bioreactors[vesselId] = { condition: vesselId, timepoints, series };
  });

  return {
    run: {
      run_id:   batchId,
      product:  'Cell Culture (TetroScience / CEDEX BIO HT)',
      site:     'AT-Vienna',
      analyzer: 'Roche CEDEX BIO HT via TetroScience Athena',
    },
    bioreactors,
    _source:    'tetroscience_athena',
    _projectId: batchId,
  };
};

const parseBioreactorData = (jsonData, exclusions = {}) => {
  const bioreactors = {};
  if (!jsonData || !jsonData.bioreactors) return {};
  Object.keys(jsonData.bioreactors).forEach(brId => {
    const br = jsonData.bioreactors[brId];
    if (!br || !Array.isArray(br.timepoints) || !br.series) return;
    const cultureDays = br.timepoints.map(tp => tp.culture_day).filter(d => d !== null && d !== undefined);
    const vcc = br.series.viable_cells_x106_c_per_ml ? br.series.viable_cells_x106_c_per_ml.filter((v, i) => br.timepoints[i]?.culture_day !== null) : [];
    const titer = br.series.igg_mg_per_l ? br.series.igg_mg_per_l.filter((v, i) => br.timepoints[i]?.culture_day !== null) : [];
    const proteinA = br.series.protein_a_hplc ? br.series.protein_a_hplc.filter((v, i) => br.timepoints[i]?.culture_day !== null) : [];
    const ivcd = vcc.length > 0 ? calculateIVCD(cultureDays, vcc) : [];
    bioreactors[brId] = {
      id: brId,
      condition: br.condition,
      timepoints: br.timepoints,
      cultureDays,
      vcc,
      titer,
      proteinA,
      ivcd,
      finalVCC: vcc.length > 0 ? vcc[vcc.length - 1] : 0,
      finalIVCD: ivcd.length > 0 ? ivcd[ivcd.length - 1] : 0,
      finalTiter: proteinA.filter(t => t !== null).slice(-1)[0] || titer.filter(t => t !== null).slice(-1)[0] || 0,
      allSeries: br.series
    };
  });
  return bioreactors;
};

const groupByCondition = (bioreactors) => {
  const groups = {};
  Object.values(bioreactors).forEach(br => {
    if (!groups[br.condition]) groups[br.condition] = [];
    groups[br.condition].push(br);
  });
  return groups;
};

const parseFermentationData = (jsonData, exclusions = {}) => {
  if (!jsonData || !jsonData.bioreactors) return null;
  const reactorKeys = Object.keys(jsonData.bioreactors);
  const dataMap = new Map();
  const groups = {};
  const finalTiters = [];
  let minDate = null;
  let maxDate = null;
  const categorizedMetrics = { 'Metabolites': new Set(), 'Physical': new Set(), 'Gases/pH': new Set(), 'Cell State': new Set(), 'Titer/Analysis': new Set(), 'Ions': new Set(), 'Other': new Set() };

  reactorKeys.forEach(brKey => {
    const brData = jsonData.bioreactors[brKey];
    const condition = brData.condition || 'Ungrouped';
    if (!groups[condition]) groups[condition] = [];
    groups[condition].push(brKey);

    Object.keys(brData.series).forEach(m => {
        if (shouldExcludeSeries(m)) return;
        const values = brData.series[m];
        if (!values.some(v => v !== null && v !== undefined)) return;
        let placed = false;
        for (const [cat, config] of Object.entries(METRIC_CONFIG)) {
            if (config.patterns.some(p => m.toLowerCase().includes(p))) { categorizedMetrics[cat].add(m); placed = true; break; }
        }
        if (!placed) categorizedMetrics['Other'].add(m);
    });

    brData.timepoints.forEach((tp, index) => {
      const day = tp.culture_day;
      if (day !== null && day !== undefined) {
         if (!dataMap.has(day)) dataMap.set(day, { day, _count: 0 });
         const entry = dataMap.get(day);
         if (tp.sample_code_id) {
           entry[`${brKey}__sample_id`] = tp.sample_code_id;
         }
         Object.keys(brData.series).forEach(metric => {
           if (shouldExcludeSeries(metric)) return;
           const val = brData.series[metric][index];
           // Check if this point is excluded
           const excludeKey = `${brKey}_${day}_${metric}`;
           if (val !== null && val !== undefined && !exclusions[excludeKey]) {
             entry[`${brKey}_${metric}`] = val;
           }
         });
         const rawDateStr = tp.export_dt || tp.date || null;
         const date = rawDateStr ? safeParseDate(rawDateStr) : null;
         if (date) {
           if (!minDate || date < minDate) minDate = date;
           if (!maxDate || date > maxDate) maxDate = date;
         }
      }
    });
  });

  const customColumns = Array.isArray(jsonData?.custom_columns) ? jsonData.custom_columns : [];
  customColumns.forEach(column => {
    const metricKey = column?.key;
    if (!metricKey || shouldExcludeSeries(metricKey)) return;
    let placed = false;
    for (const [cat, config] of Object.entries(METRIC_CONFIG)) {
      if (config.patterns.some(p => metricKey.toLowerCase().includes(p))) {
        categorizedMetrics[cat].add(metricKey);
        placed = true;
        break;
      }
    }
    if (!placed) categorizedMetrics['Other'].add(metricKey);
  });

  const sortedDays = Array.from(dataMap.values()).sort((a, b) => a.day - b.day);
  const allMetricsFlat = METRIC_CATEGORY_ORDER.flatMap(cat => Array.from(categorizedMetrics[cat] || []));

  sortedDays.forEach(entry => {
    const day = entry.day;
    Object.keys(groups).forEach(groupName => {
      const ids = groups[groupName];
      allMetricsFlat.forEach(metric => {
        let sum = 0; let count = 0;
        ids.forEach(id => {
          const key = `${id}_${metric}`;
          const excludeKey = `${id}_${day}_${metric}`;
          // Only include if not excluded
          if (entry[key] !== undefined && !exclusions[excludeKey]) {
            sum += entry[key];
            count++;
          }
        });
        if (count > 0) { entry[`GRP_${groupName}_${metric}`] = sum / count; }
      });
    });
  });

  reactorKeys.forEach(brKey => {
      const brData = jsonData.bioreactors[brKey];
      const seriesKeys = Object.keys(brData.series);
      const titerKey = seriesKeys.find(k => k.toLowerCase().includes('protein_a_hplc')) || seriesKeys.find(k => k.toLowerCase().includes('igg_mg_per_l'));
      let finalVal = 0;
      if (titerKey) {
          for (let i = sortedDays.length - 1; i >= 0; i--) {
              const val = sortedDays[i][`${brKey}_${titerKey}`];
              if (val !== undefined && val !== null) { finalVal = Number(val); break; }
          }
      }
      const mockPrediction = null; // Prediction computed dynamically in Titer Analysis Control
      const diffPct = 0;
      finalTiters.push({ id: brKey, value: finalVal, prediction: mockPrediction, diff: diffPct, condition: brData.condition || 'Ungrouped' });
  });

  const metricsTree = {};
  METRIC_CATEGORY_ORDER.forEach(cat => {
    if (categorizedMetrics[cat]?.size > 0) {
      metricsTree[cat] = sortMetricsByPriority(Array.from(categorizedMetrics[cat]));
    }
  });

  return {
    chartData: sortedDays,
    metricsTree,
    allMetrics: sortMetricsByPriority(Array.from(new Set(allMetricsFlat))),
    groups,
    finalTiters,
    metadata: {
      runId: jsonData.run?.run_id || 'Unknown Run',
      product: jsonData.run?.product || jsonData.experimental_design?.product || 'Biopharmaceutical Product',
      startDate: minDate,
      endDate: maxDate,
      duration: sortedDays.length > 0 ? sortedDays[sortedDays.length - 1].day : 0,
      bioreactorCount: reactorKeys.length
    }
  };
};

// Parse data by bioreactor (for Batch Dashboard)
const parseBioreactorChartData = (jsonData, exclusions = {}) => {
  if (!jsonData || !jsonData.bioreactors) return null;
  const bioreactors = parseBioreactorData(jsonData, exclusions);
  const allDays = new Set();
  Object.values(bioreactors).forEach(br => br.cultureDays.forEach(d => allDays.add(d)));
  const sortedDays = Array.from(allDays).sort((a, b) => a - b);

  const allMetrics = new Set();
  Object.values(bioreactors).forEach(br => Object.keys(br.allSeries).forEach(m => allMetrics.add(m)));
  const metricsArray = sortMetricsByPriority(Array.from(allMetrics).filter(m => !shouldExcludeSeries(m)));

  const chartData = sortedDays.map(day => {
    const point = { day };
    Object.keys(bioreactors).forEach(brId => {
      const br = bioreactors[brId];
      const idx = br.cultureDays.indexOf(day);
      if (idx !== -1) {
        Object.keys(br.allSeries).forEach(metric => {
          const key = `${brId}_${metric}`;
          point[key] = br.allSeries[metric][idx];
        });
      }
    });
    return point;
  });

  return {
    chartData,
    bioreactors,
    allMetrics: metricsArray,
    metadata: {
      runId: jsonData.run?.run_id || jsonData.run_id || 'Unknown Run',
      duration: sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : 0,
      bioreactorCount: Object.keys(bioreactors).length
    }
  };
};


// --- SHARED COMPONENTS ---
const CustomDot = (props) => {
  const { cx, cy, stroke, shapeType, isGroup } = props;
  if (cx === undefined || cy === undefined || cx === null || cy === null) return null;
  if (isGroup) {
     if (shapeType === 'square') return <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={stroke} stroke="none" />;
     if (shapeType === 'circle') return <circle cx={cx} cy={cy} r={5} fill={stroke} stroke="none" />;
     return <path d={`M${cx},${cy-6} L${cx+6},${cy+6} L${cx-6},${cy+6} Z`} fill={stroke} stroke="none" />;
  }
  if (shapeType === 'square') return <rect x={cx - 3} y={cy - 3} width={6} height={6} fill="white" stroke={stroke} strokeWidth={2} />;
  if (shapeType === 'diamond') return <polygon points={`${cx},${cy-4} ${cx+4},${cy} ${cx},${cy+4} ${cx-4},${cy}`} fill="white" stroke={stroke} strokeWidth={2} />;
  return <circle cx={cx} cy={cy} r={3} fill="white" stroke={stroke} strokeWidth={2} />;
};

const CustomTooltip = ({ active, payload, label, zoomDomain }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-lg text-xs z-50 min-w-[200px]">
      <div className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1 flex justify-between">
         <span>Day {label}</span>
         {zoomDomain && <span className="text-[9px] text-slate-400 font-normal"> (Rel: {Number(label) - zoomDomain.left})</span>}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
           const rawKey = entry.dataKey;
           const metricPart = rawKey ? rawKey.substring(rawKey.indexOf('_') + 1) : '';
           const seriesId = rawKey ? rawKey.substring(0, rawKey.indexOf('_')) : '';
           const displayName = formatMetricName(metricPart);
           const sampleId = seriesId ? entry.payload?.[`${seriesId}__sample_id`] : null;
           return (
             <div key={index} className="flex flex-col mb-1 last:mb-0">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                   <span className="font-bold text-slate-700 flex-1 truncate">{entry.name}</span>
                </div>
                <div className="flex justify-between items-baseline pl-4">
                   <span className="text-[10px] text-slate-500 mr-2">{displayName}</span>
                   <span className="font-mono font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
                </div>
                {sampleId && (
                  <div className="pl-4 text-[9px] text-slate-400">SampleID: {sampleId}</div>
                )}
             </div>
           );
        })}
      </div>
    </div>
  );
};

const CustomizedLabel = (props) => {
  const { x, y, stroke, index, name, chartData, seriesIndex, color, value, dataKey } = props;
  const finalColor = color || stroke || '#64748b';

  if (!chartData || chartData.length === 0) return null;
  if (x === undefined || y === undefined || x === null || y === null) return null;
  if (value === null || value === undefined) return null;

  // Find the last index where this series has a non-null value.
  // Falls back to checking by index position if dataKey is unavailable.
  const lastNonNullIndex = dataKey
    ? chartData.reduce((last, row, i) => (row[dataKey] != null ? i : last), -1)
    : chartData.length - 1;

  if (index !== lastNonNullIndex) return null;

  const stagger = ((seriesIndex || 0) % 6) * 13 - 32;
  return (
    <g>
      {/* White outline for readability */}
      <text
        x={x + 8}
        y={y + stagger}
        dy={4}
        fill="none"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinejoin="round"
        fontSize={10}
        fontWeight="bold"
        textAnchor="start"
      >
        {name}
      </text>
      {/* Coloured label */}
      <text
        x={x + 8}
        y={y + stagger}
        dy={4}
        fill={finalColor}
        fontSize={10}
        fontWeight="bold"
        textAnchor="start"
      >
        {name}
      </text>
    </g>
  );
};

const StyleEditor = ({ isOpen, onClose, groups, bioreactors, settings, updateSettings, updateConditionGroup, stages, updateStage, customRefGroups, updateCustomRefGroups }) => {
  if (!isOpen) return null;
  const uniqueConditions = useMemo(() => {
    if (!bioreactors) return [];
    const set = new Set();
    Object.values(bioreactors).forEach(b => { if (b.condition) set.add(b.condition); });
    return Array.from(set).sort();
  }, [bioreactors]);

  const allBioreactorIds = useMemo(() => {
    if (!bioreactors) return [];
    return Object.keys(bioreactors).sort();
  }, [bioreactors]);

  const getConditionStyle = (cond) => {
    if (!bioreactors) return {};
    const firstBioId = Object.keys(bioreactors).find(id => bioreactors[id].condition === cond);
    if (firstBioId && settings[firstBioId]) return settings[firstBioId];
    return { color: '#000000', shape: 'circle', strokeDash: '0', secondaryColor: '#000000', secondaryStrokeWidth: 1 };
  };

  const renderStyleRow = (label, id, currentStyle, onChangeHandler) => (
      <div key={id} className="mb-4 last:mb-0 pb-3 border-b border-slate-100/50">
         <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 truncate mr-2" title={label}>{label}</span>
            <div className="flex gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest"><span>Primary</span><span>Compare (2nd)</span></div>
         </div>
         <div className="flex gap-2 items-center">
            <div className="flex gap-1 items-center bg-slate-50 p-1 rounded border border-slate-100">
               <input type="color" value={currentStyle.color || '#000000'} onChange={(e) => onChangeHandler(id, 'color', e.target.value)} className="h-6 w-8 rounded cursor-pointer border border-slate-200" title="Primary Color" />
               <select className="text-[10px] border rounded px-1 py-1 w-16 bg-white" value={currentStyle.strokeDash || '0'} onChange={(e) => onChangeHandler(id, 'strokeDash', e.target.value)} title="Primary Dash">
                 <option value="0">Solid</option><option value="10 5">L.Dash</option><option value="5 5">Dash</option><option value="2 2">Dot</option>
               </select>
               <select className="text-[10px] border rounded px-1 py-1 w-16 bg-white" value={currentStyle.shape || 'circle'} onChange={(e) => onChangeHandler(id, 'shape', e.target.value)} title="Primary Shape">
                  <option value="triangle">Tri.</option><option value="circle">Circ.</option><option value="square">Sqr.</option><option value="diamond">Dia.</option>
               </select>
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <div className="flex gap-1 items-center bg-indigo-50/50 p-1 rounded border border-indigo-100">
                <input type="color" value={currentStyle.secondaryColor || currentStyle.color || '#000000'} onChange={(e) => onChangeHandler(id, 'secondaryColor', e.target.value)} className="h-6 w-8 rounded cursor-pointer border border-slate-200" title="Secondary Color" />
                <select className="text-[10px] border rounded px-1 py-1 w-16 bg-white" value={currentStyle.secondaryStrokeWidth || 1} onChange={(e) => onChangeHandler(id, 'secondaryStrokeWidth', Number(e.target.value))} title="Secondary Line Width">
                   <option value={1}>Thin</option><option value={2}>Med</option><option value={3}>Thick</option><option value={4}>X-Thick</option>
                </select>
            </div>
         </div>
      </div>
  );

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 overflow-y-auto border-l border-slate-200">
      <div className="p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Palette className="w-5 h-5 text-rose-600" /> Visualization Control</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="mb-8 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
             <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-4 flex items-center gap-2"><Sliders className="w-3 h-3" /> Global Condition Styles</h3>
             {uniqueConditions.map(cond => renderStyleRow(cond, cond, getConditionStyle(cond), updateConditionGroup))}
        </div>
        <div className="mb-8 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
             <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-2"><Layers className="w-3 h-3" /> Process Stages Configuration</h3>
             <div className="space-y-3">
               {stages.map((stage, idx) => (
                 <div key={stage.id} className="flex items-center gap-2 text-xs">
                   <div className="w-20 font-bold text-slate-600 truncate" title={stage.label}>{stage.label}</div>
                   <div className="flex items-center gap-1">
                     <input type="number" className="w-12 p-1 border rounded text-center" value={stage.start} onChange={(e) => updateStage(idx, 'start', Number(e.target.value))} />
                     <span className="text-slate-400">-</span>
                     <input type="number" className="w-12 p-1 border rounded text-center" value={stage.end} onChange={(e) => updateStage(idx, 'end', Number(e.target.value))} />
                   </div>
                   <div className="ml-auto flex items-center gap-2">
                     <input
                       type="color"
                       value={stage.color || '#e2e8f0'}
                       onChange={(e) => updateStage(idx, 'color', e.target.value)}
                       className="h-6 w-8 rounded cursor-pointer border border-slate-200"
                       title="Stage Color"
                     />
                   </div>
                 </div>
               ))}
             </div>
        </div>
        <div className="mb-8 bg-rose-50 p-4 rounded-xl border border-rose-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-4 flex items-center gap-2"><Zap className="w-3 h-3" /> Batch Group Styles</h3>
          {Object.keys(groups).map(groupName => renderStyleRow(groupName, `GRP_${groupName}`, settings[`GRP_${groupName}`] || {}, updateSettings))}
        </div>

        {/* ── Custom Reference Groups Config ────────────────────── */}
        <div className="mb-8 bg-red-50 p-4 rounded-xl border border-red-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-800 mb-1 flex items-center gap-2">
            <Layers className="w-3 h-3" /> Custom Reference Groups
          </h3>
          <p className="text-[10px] text-red-600 mb-4 leading-relaxed">
            Define up to 3 named groups. Assign bioreactors to each. When visible, the chart shows the average of the assigned reactors as a bold reference line.
          </p>
          {(customRefGroups || []).map((grp, grpIdx) => {
            const crefKey = `CREF_${grp.id}`;
            const crefStyle = settings[crefKey] || {};
            const crefColors = ['#dc2626', '#16a34a', '#2563eb'];
            const defaultColor = crefColors[grpIdx] || '#6b7280';
            return (
              <div key={grp.id} className="mb-5 pb-4 border-b border-red-100 last:border-0 last:mb-0 last:pb-0">
                {/* Group name + style swatch */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: crefStyle.color || defaultColor }} />
                  <input
                    type="text"
                    value={grp.name}
                    onChange={e => updateCustomRefGroups(prev => prev.map((g, i) => i === grpIdx ? { ...g, name: e.target.value } : g))}
                    className="flex-1 text-xs font-bold bg-white border border-red-200 rounded px-2 py-1 text-slate-800"
                    placeholder={`Reference Group ${grpIdx + 1}`}
                  />
                  <input
                    type="color"
                    value={crefStyle.color || defaultColor}
                    onChange={e => { updateSettings(crefKey, 'color', e.target.value); updateSettings(crefKey, 'secondaryColor', e.target.value); }}
                    className="h-7 w-8 rounded cursor-pointer border border-slate-200"
                    title="Group color"
                  />
                  <select
                    value={crefStyle.strokeDash || '8 4'}
                    onChange={e => updateSettings(crefKey, 'strokeDash', e.target.value)}
                    className="text-[10px] border rounded px-1 py-1 w-16 bg-white"
                  >
                    <option value="0">Solid</option>
                    <option value="8 4">L.Dash</option>
                    <option value="5 5">Dash</option>
                    <option value="2 2">Dot</option>
                  </select>
                </div>
                {/* Bioreactor assignment */}
                <div className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-1.5 pl-1">
                  Assigned bioreactors ({grp.bios.length})
                </div>
                {/* Selected bioreactors pills */}
                {grp.bios.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {grp.bios.map(bioId => (
                      <span key={bioId} className="flex items-center gap-1 text-[9px] font-mono font-bold bg-white border border-red-200 text-red-700 px-1.5 py-0.5 rounded-full">
                        {bioId}
                        <button
                          onClick={() => updateCustomRefGroups(prev => prev.map((g, i) => i === grpIdx ? { ...g, bios: g.bios.filter(b => b !== bioId) } : g))}
                          className="hover:text-red-900 ml-0.5"
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Add bioreactor dropdown */}
                <select
                  value=""
                  onChange={e => {
                    if (!e.target.value) return;
                    const bioId = e.target.value;
                    updateCustomRefGroups(prev => prev.map((g, i) =>
                      i === grpIdx && !g.bios.includes(bioId) ? { ...g, bios: [...g.bios, bioId] } : g
                    ));
                    e.target.value = '';
                  }}
                  className="w-full text-[10px] border border-red-200 rounded px-2 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-red-400 focus:border-red-400"
                >
                  <option value="">＋ Add bioreactor…</option>
                  {allBioreactorIds
                    .filter(id => !grp.bios.includes(id))
                    .map(id => (
                      <option key={id} value={id}>{id}</option>
                    ))
                  }
                </select>
              </div>
            );
          })}
        </div>

        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Bioreactor overrides</h3>
        <div className="space-y-2">{Object.keys(bioreactors || {}).map(brId => renderStyleRow(brId, brId, settings[brId] || {}, updateSettings))}</div>
      </div>
    </motion.div>
  );
};


const OperatorGuides = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [language, setLanguage] = useState('en');
  const content = {
    en: {
      title: 'Operator Guides',
      subtitle: 'Complete System Documentation',
      back: 'Back to Home',
      contents: 'Contents',
      nav: [
        { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
        { id: 'batch', label: 'Batch Dashboard', icon: TableIcon },
        { id: 'usp', label: 'USP Acceptability', icon: CheckSquare },
        { id: 'yield', label: 'Yield Analytics', icon: BarChart3 },
        { id: 'statistical', label: 'Statistical', icon: TrendingUp },
        { id: 'library', label: 'Chart Library', icon: Library },
        { id: 'customization', label: 'Customization', icon: Palette },
        { id: 'export', label: 'Export', icon: Download },
        { id: 'practices', label: 'Best Practices', icon: CheckCircle2 }
      ],
      overview: {
        title: 'System Overview',
        subtitle: 'Lab Automation System v2.0 — end-to-end fermentation analysis',
        body: 'The platform combines data import, quality control, visual monitoring, group comparisons, statistical analytics, and exports. It supports bioreactor data plus Vi-Cell, Flex2, HPLC, and other sources.',
        included: {
          title: 'What is included',
          items: [
            '4 core modules: Batch, USP Acceptability, Yield Analytics, Statistical',
            'Preset chart library (14 presets)',
            '5 statistical analysis modes',
            'Full line/marker styling',
            'CSV export tools'
          ]
        },
        quick: {
          title: 'Quick start',
          steps: [
            'Import JSON fermentation data',
            'Choose a module from the home screen',
            'Configure axes, metrics, and groups',
            'Compare conditions and spot deviations',
            'Export results'
          ]
        },
        persistenceTitle: 'Data persistence',
        persistenceBody: 'Data is stored in localStorage and stays available while switching modules. Use Clear Data on the home screen to reset.'
      },
      batch: {
        title: 'Batch Dashboard',
        subtitle: 'Complete dataset table control',
        purposeTitle: 'Purpose',
        purposeBody: 'A full day-by-day table across all bioreactors and metrics. Ideal for auditing, spotting outliers, and creating dataset columns.',
        featuresTitle: 'Features & options',
        tableTitle: 'Table controls',
        tableItems: [
          'Sort by bioreactor or day',
          'Filter by bioreactor and day',
          'Inline cell editing',
          'Highlight exclusions and edits'
        ],
        calcTitle: 'Dataset Columns',
        calcItems: [
          'Create new columns based on existing metrics',
          'Supports +, -, *, /, parentheses, and power (^) formulas',
          'Columns appear in the main table automatically'
        ],
        seeTitle: 'What you can see',
        seeItems: [
          'Full time-series for VCC, Viability, pH, Glucose, Lactate, etc.',
          'Outliers, missing values, edited cells',
          'Custom dataset columns'
        ]
      },
      usp: {
        title: 'USP Acceptability Assessment',
        subtitle: 'Rapid deviation and viability checks',
        purposeTitle: 'Purpose',
        purposeBody: 'Assess process stability using measured vs expected parameters, percent deviation, and synchronized trend views.',
        includedTitle: 'What is included',
        tableTitle: 'Parameter table',
        tableItems: ['Measured vs Expected', 'Δ% with traffic-light coloring', 'Table export'],
        chartTitle: '4-panel trend view',
        chartItems: ['VCD & viability focus', 'Synchronized time axis', 'Critical zone markers'],
        usageTitle: 'How to use',
        usageItems: ['Review deviations on key parameters', 'Confirm VCD/Viability stays in range', 'Export the table for reporting']
      },
      yield: {
        title: 'Yield Analytics',
        subtitle: 'Interactive time-series and condition comparisons',
        controlsTitle: 'Control panel',
        controlsPrimary: 'Plot Axes: choose Primary/Secondary metrics, Dual Axis, labels',
        controlsExtra: 'Additional Metrics: add extra series with optional axis',
        controlsGroups: 'Reference Groups: auto group by condition with averages',
        controlsBio: 'Bioreactors: select vessels, group filter, ALL',
        libraryTitle: 'Chart Library',
        libraryBody: 'Presets for quick overviews: growth, metabolites, process params, feeds, product quality.',
        toolsTitle: 'Analysis tools',
        zoomTitle: 'Zoom',
        zoomBody: 'Select a day range for detailed view.',
        stagesTitle: 'Stages',
        stagesBody: 'Colored phases for the process timeline.',
        exportTitle: 'CSV Export',
        exportBody: 'Export selected metrics and bioreactors.',
        seeTitle: 'What you can see',
        seeItems: ['Group comparisons', 'Multi-axis metric dynamics', 'Peaks, stages, and events']
      },
      statistical: {
        title: 'Statistical Analytics',
        subtitle: 'Advanced analysis modes',
        modes: [
          { title: 'Mode 1: IVCD Analysis', body: 'Integrated VCD, linear regression, qP and R².' },
          { title: 'Mode 2: Control Chart (SPC)', body: 'UCL/Mean/LCL control charts for stability.' },
          { title: 'Mode 3: Compare All', body: 'Overlay all bioreactors to assess reproducibility.' },
          { title: 'Mode 4: Regression Analysis', body: 'Correlation between two metrics with trend and R².' },
          { title: 'Mode 5: Summary Statistics', body: 'N, Mean, Std, Min, Max across runs.' }
        ]
      },
      library: {
        title: 'Chart Library Reference',
        subtitle: 'Ready-made presets for quick analysis',
        body: 'Use presets for standard reporting. Each preset defines metrics, axes, and legends for instant insights.'
      },
      customization: {
        title: 'Customization & Styling',
        subtitle: 'Deep visual configuration',
        body: 'Style & Config allows per-metric, per-group, and per-bioreactor styling.',
        optionsTitle: 'Available options',
        options: ['Line and point colors', 'Stroke style (solid, dash, dot)', 'Point shapes (circle, square, diamond, triangle)', 'Group-level and per-bioreactor overrides'],
        hierarchyTitle: 'Style hierarchy',
        hierarchyBody: '1) Global condition styles, 2) group styles, 3) individual bioreactors.'
      },
      export: {
        title: 'Export & Integration',
        subtitle: 'Export data',
        csvTitle: 'CSV Export',
        csvBody: 'Export selected bioreactors and metrics from Yield Analytics and USP tables.',
        integrationTitle: 'Integrations',
        integrationBody: 'Import into R (read_csv), Python (pandas), Excel, or BI tools.'
      },
      practices: {
        title: 'Best Practices',
        subtitle: 'Recommended workflow',
        flowTitle: 'Analysis sequence',
        flowSteps: [
          'Batch Dashboard — verify and correct data',
          'USP Acceptability — detect critical deviations',
          'Yield Analytics — compare conditions and metrics',
          'Statistical Analytics — regressions and summaries',
          'Export — deliver results'
        ],
        lookTitle: 'What to look for',
        lookItems: [
          'Process development: condition comparisons, qP, IVCD, regressions',
          'Monitoring: deviation control and stability',
          'Tech transfer: reproducibility across batches',
          'QA/QC: full audit and exports'
        ],
        troubleTitle: 'Troubleshooting',
        troubleItems: [
          'Empty charts: select at least one bioreactor or group',
          'No regression: need ≥ 3 data points',
          'Zoom not working: select at least 1 day',
          'Performance: avoid selecting >6 bioreactors'
        ]
      },
      footer: {
        title: 'Lab Automation System v2.0',
        subtitle: 'Comprehensive fermentation analytics platform',
        doc: 'Documentation',
        status: 'Updated',
        modulesTitle: 'Modules',
        modules: ['Batch Dashboard', 'USP Acceptability', 'Yield Analytics', 'Statistical Analytics and Reports'],
        capabilitiesTitle: 'Capabilities',
        capabilities: ['Chart customization', 'Dataset formulas', 'CSV export'],
        statsTitle: 'Statistics',
        stats: ['SPC Control Charts', 'IVCD Analysis', 'Regression & Summary']
      }
    },
    ja: {
      title: 'オペレーターガイド',
      subtitle: 'システムドキュメント',
      back: 'ホームに戻る',
      contents: '目次',
      nav: [
        { id: 'overview', label: 'システム概要', icon: LayoutDashboard },
        { id: 'batch', label: 'バッチダッシュボード', icon: TableIcon },
        { id: 'usp', label: 'USP適合性', icon: CheckSquare },
        { id: 'yield', label: 'Yield分析', icon: BarChart3 },
        { id: 'statistical', label: '統計分析', icon: TrendingUp },
        { id: 'library', label: 'チャートライブラリ', icon: Library },
        { id: 'customization', label: 'カスタマイズ', icon: Palette },
        { id: 'export', label: 'エクスポート', icon: Download },
        { id: 'practices', label: 'ベストプラクティス', icon: CheckCircle2 }
      ],
      overview: {
        title: 'システム概要',
        subtitle: 'Lab Automation System v2.0 — 発酵解析のエンドツーエンド',
        body: '本プラットフォームはデータ取込み、品質管理、可視化、条件比較、統計解析、エクスポートを統合します。バイオリアクターに加え、Vi-Cell、Flex2、HPLCなどに対応します。',
        included: {
          title: '含まれる機能',
          items: [
            '4つの主要モジュール: Batch, USP適合性, Yield分析, 統計分析',
            'プリセットチャート (14種)',
            '5つの統計解析モード',
            'ライン/マーカーの詳細スタイル',
            'CSV出力と計算テーブル'
          ]
        },
        quick: {
          title: 'クイックスタート',
          steps: [
            'JSON発酵データをインポート',
            'ホームでモジュールを選択',
            '軸・指標・グループを設定',
            '条件比較と逸脱検出',
            '結果をエクスポート'
          ]
        },
        persistenceTitle: 'データ保持',
        persistenceBody: 'データはlocalStorageに保存され、モジュール切替後も保持されます。初期化はホームのClear Dataから行います。'
      },
      batch: {
        title: 'バッチダッシュボード',
        subtitle: '完全なデータテーブル管理',
        purposeTitle: '目的',
        purposeBody: '全バイオリアクター/全指標の時系列テーブル。監査、外れ値検出、数式作成に適します。',
        featuresTitle: '機能とオプション',
        tableTitle: 'テーブル操作',
        tableItems: ['リアクター/日付でソート', 'リアクター/日付でフィルタ', 'セル編集', '除外・編集のハイライト'],
        calcTitle: '計算',
        calcItems: ['指標ベースの数式作成', '例: Ammonium (g/L) * Ph', '全行に計算列を生成'],
        seeTitle: '確認できる内容',
        seeItems: ['VCC/Viability/pH/Glucose/Lactate等の時系列', '外れ値・欠損・編集セル', 'カスタム計算列']
      },
      usp: {
        title: 'USP適合性評価',
        subtitle: '逸脱とViabilityの迅速チェック',
        purposeTitle: '目的',
        purposeBody: '測定値と期待値の比較、逸脱率、同期トレンドを用いて安定性を評価します。',
        includedTitle: '含まれる内容',
        tableTitle: 'パラメータテーブル',
        tableItems: ['Measured vs Expected', 'Δ%の信号色表示', 'テーブル出力'],
        chartTitle: '4パネルのトレンド',
        chartItems: ['VCD/Viabilityの監視', '同期時間軸', 'クリティカルゾーン表示'],
        usageTitle: '使い方',
        usageItems: ['重要パラメータの逸脱を確認', 'VCD/Viabilityが範囲内か確認', 'レポート用に出力']
      },
      yield: {
        title: 'Yield分析',
        subtitle: '時系列の可視化と条件比較',
        controlsTitle: 'コントロールパネル',
        controlsPrimary: 'Plot Axes: Primary/Secondary指標、Dual Axis、ラベル',
        controlsExtra: 'Additional Metrics: 追加系列と軸',
        controlsGroups: 'Reference Groups: 条件別自動グループ',
        controlsBio: 'Bioreactors: リアクター選択、グループフィルタ、ALL',
        libraryTitle: 'チャートライブラリ',
        libraryBody: '成長、代謝、プロセス、フィード、品質のプリセット。',
        toolsTitle: '分析ツール',
        zoomTitle: 'ズーム',
        zoomBody: '日付範囲を選択して詳細表示。',
        stagesTitle: 'ステージ',
        stagesBody: '工程フェーズの色分け。',
        exportTitle: 'CSV出力',
        exportBody: '選択した指標とリアクターを出力。',
        seeTitle: '確認できる内容',
        seeItems: ['条件比較', '複数軸の指標推移', 'ピーク、ステージ、イベント']
      },
      statistical: {
        title: '統計分析',
        subtitle: '高度な分析モード',
        modes: [
          { title: 'モード1: IVCD解析', body: '統合VCD、線形回帰、qPとR²。' },
          { title: 'モード2: 管理図(SPC)', body: 'UCL/Mean/LCLによる安定性評価。' },
          { title: 'モード3: Compare All', body: '全リアクター重ね合わせで再現性確認。' },
          { title: 'モード4: 回帰分析', body: '2指標の相関とトレンド。' },
          { title: 'モード5: 要約統計', body: 'N/平均/標準偏差/最小/最大。' }
        ]
      },
      library: {
        title: 'チャートライブラリ',
        subtitle: '迅速分析のためのプリセット',
        body: '標準レポート用のプリセット。指標・軸・凡例を即時に設定します。'
      },
      customization: {
        title: 'カスタマイズ',
        subtitle: '詳細なスタイル設定',
        body: 'Style & Configで指標/グループ/リアクター単位のスタイルを設定できます。',
        optionsTitle: '設定項目',
        options: ['ライン/ポイント色', '線種 (solid/dash/dot)', 'ポイント形状 (circle/square/diamond/triangle)', 'グループ/リアクター別の上書き'],
        hierarchyTitle: 'スタイル階層',
        hierarchyBody: '1) 条件別、2) グループ別、3) 個別リアクター。'
      },
      export: {
        title: 'エクスポート',
        subtitle: 'データと計算の出力',
        csvTitle: 'CSV出力',
        csvBody: 'Yield分析やUSPテーブルから指標と計算結果を出力できます。',
        integrationTitle: '連携',
        integrationBody: 'R(read_csv)、Python(pandas)、Excel、BIツールに取り込み可能。'
      },
      practices: {
        title: 'ベストプラクティス',
        subtitle: '推奨ワークフロー',
        flowTitle: '解析の流れ',
        flowSteps: ['Batch — データ確認', 'USP — 逸脱チェック', 'Yield — 条件比較', 'Statistical — 回帰と要約', 'Export — 出力'],
        lookTitle: '確認ポイント',
        lookItems: ['開発: 条件比較、qP、IVCD、回帰', '監視: 逸脱と安定性', '技術移管: 再現性', 'QA/QC: 監査と出力'],
        troubleTitle: 'トラブルシューティング',
        troubleItems: ['チャートが空: リアクター/グループを選択', '回帰が出ない: 3点以上必要', 'ズーム不可: 1日以上選択', '性能: 6以上の選択を避ける']
      },
      footer: {
        title: 'Lab Automation System v2.0',
        subtitle: '発酵解析の包括的プラットフォーム',
        doc: 'ドキュメント',
        status: '更新済み',
        modulesTitle: 'モジュール',
        modules: ['Batch Dashboard', 'USP Acceptability', 'Yield Analytics', 'Statistical Analytics and Reports'],
        capabilitiesTitle: '機能',
        capabilities: ['チャートカスタマイズ', '数式と計算', 'CSV出力'],
        statsTitle: '統計',
        stats: ['SPC Control Charts', 'IVCD Analysis', 'Regression & Summary']
      }
    }
  };

  const labels = content[language];
  const sections = labels.nav;
  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-rose-600 transition-colors"><ChevronRight className="w-5 h-5 rotate-180" /><span className="font-bold">{labels.back}</span></button>
          <div className="flex items-center gap-3"><BookOpen className="w-6 h-6 text-rose-600" /><div><h1 className="text-xl font-extrabold text-slate-900">{labels.title}</h1><p className="text-xs text-slate-500">{labels.subtitle}</p></div></div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Language</span>
            <div className="flex items-center bg-slate-100 rounded-full p-1">
              <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${language === 'en' ? 'bg-white text-slate-700 shadow' : 'text-slate-500'}`} type="button">EN</button>
              <button onClick={() => setLanguage('ja')} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${language === 'ja' ? 'bg-white text-slate-700 shadow' : 'text-slate-500'}`} type="button">JA</button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        <aside className="w-64 shrink-0 sticky top-24 h-fit"><div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{labels.contents}</h3><nav className="space-y-1">{sections.map(s => (<button key={s.id} onClick={() => scrollTo(s.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeSection === s.id ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-slate-600 hover:bg-slate-50'}`}><s.icon className="w-4 h-4" />{s.label}</button>))}</nav></div></aside>
        <main className="flex-1 space-y-12">
          <section id="overview" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl"><LayoutDashboard className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.overview.title}</h2><p className="text-sm text-slate-500">{labels.overview.subtitle}</p></div></div><div className="prose prose-slate max-w-none"><p className="text-slate-700 leading-relaxed">{labels.overview.body}</p><div className="grid md:grid-cols-2 gap-4 mt-6 not-prose"><div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-lg p-5"><div className="flex items-center gap-2 mb-3"><Activity className="w-5 h-5 text-rose-600" /><h3 className="font-bold text-slate-900">{labels.overview.included.title}</h3></div><ul className="text-sm text-slate-700 space-y-2">{labels.overview.included.items.map(item => (<li key={item} className="flex items-start gap-2"><span className="text-rose-500 mt-1">•</span><span>{item}</span></li>))}</ul></div><div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5"><div className="flex items-center gap-2 mb-3"><Zap className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-slate-900">{labels.overview.quick.title}</h3></div><ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">{labels.overview.quick.steps.map(step => (<li key={step}>{step}</li>))}</ol></div></div><div className="bg-slate-50 border-l-4 border-slate-400 p-5 rounded-r-lg mt-6"><h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2"><Info className="w-5 h-5" /> {labels.overview.persistenceTitle}</h3><p className="text-sm text-slate-700 mb-0">{labels.overview.persistenceBody}</p></div></div></section>
          <section id="batch" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl"><TableIcon className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.batch.title}</h2><p className="text-sm text-slate-500">{labels.batch.subtitle}</p></div></div><div className="prose prose-slate max-w-none"><h3 className="text-lg font-bold text-slate-800">{labels.batch.purposeTitle}</h3><p className="text-slate-700">{labels.batch.purposeBody}</p><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.batch.featuresTitle}</h3><div className="grid md:grid-cols-2 gap-4 not-prose"><div className="bg-slate-50 rounded-lg p-4 border border-slate-200"><h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Layers className="w-4 h-4 text-slate-600" /> {labels.batch.tableTitle}</h4><ul className="text-sm text-slate-700 space-y-1">{labels.batch.tableItems.map(item => (<li key={item}>• {item}</li>))}</ul></div><div className="bg-slate-50 rounded-lg p-4 border border-slate-200"><h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Database className="w-4 h-4 text-slate-600" /> {labels.batch.calcTitle}</h4><ul className="text-sm text-slate-700 space-y-1">{labels.batch.calcItems.map(item => (<li key={item}>• {item}</li>))}</ul></div></div><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.batch.seeTitle}</h3><div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 not-prose"><ul className="text-sm text-slate-700 space-y-1">{labels.batch.seeItems.map(item => (<li key={item}>• {item}</li>))}</ul></div></div></section>
          <section id="usp" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl"><CheckSquare className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.usp.title}</h2><p className="text-sm text-slate-500">{labels.usp.subtitle}</p></div></div><div className="prose prose-slate max-w-none"><h3 className="text-lg font-bold text-slate-800">{labels.usp.purposeTitle}</h3><p className="text-slate-700">{labels.usp.purposeBody}</p><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.usp.includedTitle}</h3><div className="grid md:grid-cols-2 gap-4 not-prose"><div className="bg-slate-50 rounded-lg p-4 border border-slate-200"><h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><TableIcon className="w-4 h-4 text-slate-600" /> {labels.usp.tableTitle}</h4><ul className="text-sm text-slate-700 space-y-1">{labels.usp.tableItems.map(item => (<li key={item}>• {item}</li>))}</ul></div><div className="bg-slate-50 rounded-lg p-4 border border-slate-200"><h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-600" /> {labels.usp.chartTitle}</h4><ul className="text-sm text-slate-700 space-y-1">{labels.usp.chartItems.map(item => (<li key={item}>• {item}</li>))}</ul></div></div><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.usp.usageTitle}</h3><ul className="text-sm text-slate-700 space-y-1">{labels.usp.usageItems.map(item => (<li key={item}>• {item}</li>))}</ul></div></section>
          <section id="yield" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl"><BarChart3 className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.yield.title}</h2><p className="text-sm text-slate-500">{labels.yield.subtitle}</p></div></div><div className="prose prose-slate max-w-none"><h3 className="text-lg font-bold text-slate-800">{labels.yield.controlsTitle}</h3><div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg not-prose mb-4"><h4 className="font-bold text-rose-900 mb-2">Tab 1: Controls</h4><div className="text-sm text-slate-700 space-y-2"><div><strong>{labels.yield.controlsPrimary.split(':')[0]}:</strong> {labels.yield.controlsPrimary.split(':')[1]}</div><div><strong>{labels.yield.controlsExtra.split(':')[0]}:</strong> {labels.yield.controlsExtra.split(':')[1]}</div><div><strong>{labels.yield.controlsGroups.split(':')[0]}:</strong> {labels.yield.controlsGroups.split(':')[1]}</div><div><strong>{labels.yield.controlsBio.split(':')[0]}:</strong> {labels.yield.controlsBio.split(':')[1]}</div></div></div><div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg not-prose"><h4 className="font-bold text-blue-900 mb-2">Tab 2: {labels.yield.libraryTitle}</h4><p className="text-sm text-slate-700 mb-3">{labels.yield.libraryBody}</p></div><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.yield.toolsTitle}</h3><div className="grid md:grid-cols-3 gap-4 not-prose"><div className="bg-slate-50 rounded-lg p-4 border border-slate-200"><Maximize2 className="w-5 h-5 text-slate-600 mb-2" /><h4 className="font-bold text-slate-900 text-sm mb-1">{labels.yield.zoomTitle}</h4><p className="text-xs text-slate-600">{labels.yield.zoomBody}</p></div><div className="bg-slate-50 rounded-lg p-4 border border-slate-200"><Layers className="w-5 h-5 text-slate-600 mb-2" /><h4 className="font-bold text-slate-900 text-sm mb-1">{labels.yield.stagesTitle}</h4><p className="text-xs text-slate-600">{labels.yield.stagesBody}</p></div><div className="bg-slate-50 rounded-lg p-4 border border-slate-200"><Download className="w-5 h-5 text-slate-600 mb-2" /><h4 className="font-bold text-slate-900 text-sm mb-1">{labels.yield.exportTitle}</h4><p className="text-xs text-slate-600">{labels.yield.exportBody}</p></div></div><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.yield.seeTitle}</h3><ul className="text-sm text-slate-700 space-y-1">{labels.yield.seeItems.map(item => (<li key={item}>• {item}</li>))}</ul></div></section>
          <section id="statistical" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl"><TrendingUp className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.statistical.title}</h2><p className="text-sm text-slate-500">{labels.statistical.subtitle}</p></div></div><div className="space-y-4">{labels.statistical.modes.map(mode => (<div key={mode.title} className="bg-slate-50 rounded-lg p-4 border border-slate-200"><h3 className="font-bold text-slate-900 mb-2">{mode.title}</h3><p className="text-sm text-slate-700">{mode.body}</p></div>))}</div></section>
          <section id="library" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl"><Library className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.library.title}</h2><p className="text-sm text-slate-500">{labels.library.subtitle}</p></div></div><div className="prose prose-slate max-w-none"><p className="text-slate-700">{labels.library.body}</p></div><div className="space-y-4">{CHART_LIBRARY.map((cat, idx) => (<div key={idx} className="border border-slate-200 rounded-lg overflow-hidden"><div className={`px-4 py-3 font-bold text-white ${idx === 0 ? 'bg-amber-600' : idx === 1 ? 'bg-rose-600' : idx === 2 ? 'bg-green-600' : idx === 3 ? 'bg-blue-600' : 'bg-purple-600'}`}>{cat.category}</div><div className="p-4 space-y-3">{cat.items.map((item, i) => (<div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-200"><div className="flex items-start justify-between mb-2"><div><h4 className="font-bold text-slate-900">{item.label}</h4><p className="text-xs text-slate-500 mt-1"><Microscope className="w-3 h-3 inline" /> Source: {item.source}</p></div><span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded">{item.unit}</span></div><p className="text-sm text-slate-600">{item.description}</p></div>))}</div></div>))}</div></section>
          <section id="customization" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl"><Palette className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.customization.title}</h2><p className="text-sm text-slate-500">{labels.customization.subtitle}</p></div></div><div className="prose prose-slate max-w-none"><p className="text-slate-700">{labels.customization.body}</p><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.customization.optionsTitle}</h3><ul className="text-sm text-slate-700 space-y-1">{labels.customization.options.map(item => (<li key={item}>• {item}</li>))}</ul><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.customization.hierarchyTitle}</h3><p className="text-sm text-slate-700">{labels.customization.hierarchyBody}</p></div></section>
          <section id="export" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-green-600 to-green-700 rounded-xl"><Download className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.export.title}</h2><p className="text-sm text-slate-500">{labels.export.subtitle}</p></div></div><div className="prose prose-slate max-w-none"><h3 className="text-lg font-bold text-slate-800">{labels.export.csvTitle}</h3><p className="text-slate-700">{labels.export.csvBody}</p><div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 not-prose">Day,H01 - VCC,H01 - IgG,...<br/>0,0.50,0.00,...<br/>1,1.20,0.10,...</div><h3 className="text-lg font-bold text-slate-800 mt-6">{labels.export.integrationTitle}</h3><p className="text-sm text-slate-700">{labels.export.integrationBody}</p></div></section>
          <section id="practices" className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl"><CheckCircle2 className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-extrabold text-slate-900">{labels.practices.title}</h2><p className="text-sm text-slate-500">{labels.practices.subtitle}</p></div></div><div className="space-y-6"><div className="bg-blue-50 rounded-lg p-5 border border-blue-200"><h3 className="font-bold text-slate-900 mb-3">{labels.practices.flowTitle}</h3><ol className="space-y-2 text-sm text-slate-700">{labels.practices.flowSteps.map(step => (<li key={step}>{step}</li>))}</ol></div><div className="bg-green-50 rounded-lg p-5 border border-green-200"><h3 className="font-bold text-slate-900 mb-3">{labels.practices.lookTitle}</h3><div className="grid md:grid-cols-2 gap-3 text-sm">{labels.practices.lookItems.map(item => (<div key={item} className="bg-white rounded p-3 border border-green-100">{item}</div>))}</div></div><div className="bg-amber-50 rounded-lg p-5 border border-amber-200"><h3 className="font-bold text-slate-900 mb-3">{labels.practices.troubleTitle}</h3><div className="space-y-2 text-sm text-slate-700">{labels.practices.troubleItems.map(item => (<div key={item}>{item}</div>))}</div></div></div></section>
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white"><div className="flex items-center justify-between"><div><h3 className="text-xl font-bold mb-2">{labels.footer.title}</h3><p className="text-slate-300 text-sm">{labels.footer.subtitle}</p></div><div className="text-right"><div className="text-sm text-slate-400">{labels.footer.doc}</div><div className="text-2xl font-bold">{labels.footer.status}</div></div></div><div className="mt-6 pt-6 border-t border-slate-700 grid md:grid-cols-3 gap-4 text-sm text-slate-300"><div><div className="font-semibold text-white mb-1">{labels.footer.modulesTitle}</div>{labels.footer.modules.map(item => (<div key={item}>{item}</div>))}</div><div><div className="font-semibold text-white mb-1">{labels.footer.capabilitiesTitle}</div>{labels.footer.capabilities.map(item => (<div key={item}>{item}</div>))}</div><div><div className="font-semibold text-white mb-1">{labels.footer.statsTitle}</div>{labels.footer.stats.map(item => (<div key={item}>{item}</div>))}</div></div></div>
        </main>
      </div>
    </div>
  );
};


// --- FILE UPLOAD SCREEN ---
const FileUploadScreen = ({ onFileLoaded, dashboardName }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parseSuccess, setParseSuccess] = useState(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsLoading(true);
    setParseError(null);
    setParseSuccess(null);
    try {
      const json = await parseUploadedFile(file);
      // Save to localStorage
      try { localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(json)); } catch {}
      const vesselCount = Object.keys(json.bioreactors || {}).length;
      const runId = json.run?.run_id || json.run_id || 'Unknown';
      setParseSuccess(`✓ Loaded "${runId}" — ${vesselCount} vessel(s) detected`);
      setTimeout(() => onFileLoaded(json), 600);
    } catch (err) {
      setParseError(err.message || 'Unknown parse error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{dashboardName}</h1>
          <p className="text-slate-500">Upload your CEDEX CSV or JSON fermentation data to begin analysis</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`bg-white rounded-2xl shadow-xl p-12 border-2 border-dashed transition-all ${isDragging ? 'border-rose-500 bg-rose-50' : 'border-slate-300 hover:border-slate-400'}`}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="p-6 bg-slate-100 rounded-full">
              {isLoading
                ? <RefreshCw className="w-12 h-12 text-rose-500 animate-spin" />
                : parseSuccess
                  ? <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  : <Upload className="w-12 h-12 text-slate-600" />}
            </div>

            {parseSuccess && (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800 font-semibold text-center">
                {parseSuccess}
              </div>
            )}

            {parseError && (
              <div className="w-full bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700 font-medium">
                <div className="font-bold mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Parse Error</div>
                {parseError}
              </div>
            )}

            {!parseSuccess && !isLoading && (
              <>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Drop your data file here</h3>
                  <p className="text-sm text-slate-500 mb-1">Supported formats:</p>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-full text-xs font-bold text-rose-700">CEDEX CSV</span>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-700">JSON</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  className="hidden"
                  accept=".csv,.json"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  <Upload className="w-5 h-5" />
                  Select File
                </button>
              </>
            )}

            {isLoading && (
              <p className="text-sm text-slate-500 animate-pulse">Parsing file…</p>
            )}

            {/* Format reference */}
            <div className="w-full mt-2 grid grid-cols-2 gap-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Beaker className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-rose-800">CEDEX BIO HT CSV</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Raw export from Roche CEDEX analyzer.<br/>
                  Sample name: <span className="font-mono bg-white px-1 rounded">T0792531X15K11</span><br/>
                  Analytes: GLU2B, GLN2B, NH3B, LDH2D, IGGHD…<br/>
                  <strong>Duplicates auto-removed.</strong>
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">Fermentation JSON</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Structured JSON with <span className="font-mono bg-white px-1 rounded">bioreactors</span>, <span className="font-mono bg-white px-1 rounded">timepoints</span>, and <span className="font-mono bg-white px-1 rounded">series</span> arrays.<br/>
                  Compatible with ambrHT / standard fermentation exports.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- FEATURE 1: YIELD ANALYTICS ---


// Custom label component for showing metric names on the right side of lines
const CustomLineLabel = ({ viewBox, value, fill }) => {
  const { x, y, width } = viewBox;
  return (
    <text
      x={x + width + 10}
      y={y}
      fill={fill || '#64748b'}
      fontSize="11"
      fontWeight="600"
      textAnchor="start"
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
};

// Error Boundary for catching React errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-slate-900">Component Error</h1>
            </div>
            <p className="text-slate-600 mb-4">
              Something went wrong while loading this dashboard.
            </p>
            <details className="mb-4">
              <summary className="text-sm font-bold text-slate-700 cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Utility functions for data normalization
const normalizeArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object');
};

  const normalizeObject = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value;
  };

  const YieldAnalytics = ({ onBack, initialData, exclusions, onExclusionChange, batchOperations = [], addToReportDraft, onToast, storageNamespace = 'fermentation_dashboard_' }) => {
  const fileInputRef = useRef(null);
  const EMPTY_DATA = { chartData: [], metricsTree: {}, allMetrics: [], groups: {}, finalTiters: [], metadata: { runId: 'Ready to Import', product: '-', startDate: null, endDate: null, duration: 0, bioreactorCount: 0 } };
  const [parsedData, setParsedData] = useState(EMPTY_DATA);
  const [rawData, setRawData] = useState(initialData);
  const STORAGE_KEY_PREFIX = storageNamespace || 'fermentation_dashboard_';
  const saveState = (key, value) => { try { localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value)); } catch (e) {} };
  const loadState = (key, defaultValue) => { try { const saved = localStorage.getItem(STORAGE_KEY_PREFIX + key); return saved ? JSON.parse(saved) : defaultValue; } catch (e) { return defaultValue; } };

  // Helper function to get display name (reduces code duplication)
  const getDisplayName = (id, isGroup) => {
    return isGroup ? id.replace('GRP_', 'AVG: ') : id;
  };

  const normalizeStringArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value.filter(item => typeof item === 'string');
  };
  const [selectedIds, setSelectedIds] = useState(() => normalizeStringArray(loadState('selectedIds', [])));
  const [leftMetric, setLeftMetric] = useState(() => loadState('leftMetric', 'viable_cells_x106_c_per_ml'));
  const [rightMetric, setRightMetric] = useState(() => loadState('rightMetric', 'igg_mg_per_l'));
  const [enableDualAxis, setEnableDualAxis] = useState(() => loadState('enableDualAxis', true));
  const normalizeExtraMetrics = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .filter(item => item && typeof item.metric === 'string')
      .map(item => ({
        metric: item.metric,
        useAxis: item.useAxis !== false,
        showRefGroupsOnly: item.showRefGroupsOnly === true
      }));
  };
  const [extraMetrics, setExtraMetrics] = useState(() => normalizeExtraMetrics(loadState('extraMetrics', [])));
  const [onlyRefSecondary, setOnlyRefSecondary] = useState(false);
  const [showPrimaryLabels, setShowPrimaryLabels] = useState(() => loadState('showPrimaryLabels', true));
  const [showSecondaryLabels, setShowSecondaryLabels] = useState(() => loadState('showSecondaryLabels', true));
  const [showTiterChart, setShowTiterChart] = useState(false);
  const [showDataTable, setShowDataTable] = useState(false);
  const [showExcludeTable, setShowExcludeTable] = useState(false);
  const [excludeSelectedBioreactor, setExcludeSelectedBioreactor] = useState('');
  const [excludeSelectedDay, setExcludeSelectedDay] = useState('');
  const [excludeSelectedVariables, setExcludeSelectedVariables] = useState([]);
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [zoomDomain, setZoomDomain] = useState(null);
  const [panelZoomDomains, setPanelZoomDomains] = useState({});
  const [panelRefAreas, setPanelRefAreas] = useState({});
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('controls');
  const [showStages, setShowStages] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [showPeak, setShowPeak] = useState(false);
  const defaultStages = [
    { id: 'inoc', label: 'Inoculation', start: 0, end: 2, color: '#dcfce7' },
    { id: 'growth', label: 'Growth Init', start: 2, end: 5, color: '#dbeafe' },
    { id: 'feed', label: 'Feeding Phase', start: 5, end: 12, color: '#fef9c3' },
    { id: 'harvest', label: 'Harvesting', start: 12, end: 15, color: '#fee2e2' }
  ];
  const [stages, setStages] = useState(() => {
    const saved = normalizeArray(loadState('stages', defaultStages));
    return saved.map((stage, index) => {
      const fallback = defaultStages.find(item => item.id === stage.id) || defaultStages[index];
      return {
        ...fallback,
        ...stage,
        color: stage.color || fallback?.color || '#e2e8f0'
      };
    });
  });
  const [titerSort, setTiterSort] = useState('id');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [yieldToast, setYieldToast] = useState(null);
  useEffect(() => { if (yieldToast) { const t = setTimeout(() => setYieldToast(null), 3000); return () => clearTimeout(t); } }, [yieldToast]);

  const captureChartConfig = () => {
    const leftM = getCurrentLeftMetric();
    const rightM = getCurrentDualAxis() ? getCurrentRightMetric() : null;
    const activeBios = splitByGroup && activeGroupPanel
      ? (groupPanelSettings[activeGroupPanel]?.selectedBioreactors || [])
      : selectedIds.filter(id => !id.startsWith('GRP_'));
    const config = {
      title: formatMetricName(leftM) + (rightM ? ` vs ${formatMetricName(rightM)}` : ''),
      yMetrics: [leftM, ...(rightM ? [rightM] : [])],
      xAxis: 'day',
      chartType: 'line',
      yMin: '', yMax: '', xMin: '', xMax: '',
      bioreactors: activeBios.length > 0 ? activeBios : Object.keys(parsedData?.groups || {}).flatMap(g => parsedData.groups[g] || []).slice(0, 8),
      groupingMode: splitByGroup ? 'group' : 'bioreactor',
      showLegend: true, showGrid: true, showPoints: true, showLines: true,
      showStages, showOperations,
      stages: showStages ? stages : [],
      enableDualAxis: getCurrentDualAxis(),
      panelConfig: {},
      styleMode: 'auto',
      annotations: false,
    };
    if (addToReportDraft) {
      addToReportDraft(config);
      setYieldToast('Chart added to Report Builder');
      if (onToast) onToast('Chart added to Report Builder');
    }
  };

  const [plotSettings, setPlotSettings] = useState(() => normalizeObject(loadState('plotSettings', {})));
  const [titerConfig, setTiterConfig] = useState({ metric: '', day: 14, useZoom: false });
  const [splitByGroup, setSplitByGroup] = useState(false);
  const [matrixMode, setMatrixMode] = useState(false); // 2x2 matrix mode
  const [selectedMatrixPanel, setSelectedMatrixPanel] = useState(null); // which panel is selected
  // Preserve main chart state when switching to split/matrix and back
  const savedMainStateRef = useRef(null);

  // ── Custom Reference Groups (user-defined bioreactor averages) ──────────────
  const DEFAULT_CUSTOM_REF_GROUPS = [
    { id: 'cref1', name: 'Reference Group 1', bios: [] },
    { id: 'cref2', name: 'Reference Group 2', bios: [] },
    { id: 'cref3', name: 'Reference Group 3', bios: [] },
  ];
  const normalizeCustomRefGroups = (val) => {
    if (!Array.isArray(val)) return DEFAULT_CUSTOM_REF_GROUPS;
    return val.map((g, i) => ({
      id: g?.id || `cref${i + 1}`,
      name: typeof g?.name === 'string' ? g.name : `Reference Group ${i + 1}`,
      bios: Array.isArray(g?.bios) ? g.bios.filter(b => typeof b === 'string') : [],
    }));
  };
  const [customRefGroups, setCustomRefGroups] = useState(() => normalizeCustomRefGroups(loadState('customRefGroups', DEFAULT_CUSTOM_REF_GROUPS)));
  const updateCustomRefGroups = (updater) => {
    setCustomRefGroups(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveState('customRefGroups', next);
      return next;
    });
  };
  const [matrixPanels, setMatrixPanels] = useState({
    panel1: null, // can be chartLibrary preset ID or null
    panel2: null,
    panel3: null,
    panel4: null
  });
  const [matrixPanelMetrics, setMatrixPanelMetrics] = useState({});
  const [matrixPanelSelections, setMatrixPanelSelections] = useState({});
  const [matrixPanelGroups, setMatrixPanelGroups] = useState({});
  const [activeGroupPanel, setActiveGroupPanel] = useState('');
  const normalizeGroupPanelSettings = (value) => {
    if (!value || typeof value !== 'object') return {};
    const normalized = {};
    Object.entries(value).forEach(([key, settings]) => {
      if (!settings || typeof settings !== 'object') return;
      normalized[key] = {
        ...settings,
        leftMetric: typeof settings.leftMetric === 'string' ? settings.leftMetric : undefined,
        rightMetric: typeof settings.rightMetric === 'string' ? settings.rightMetric : undefined,
        enableDualAxis: settings.enableDualAxis !== false,
        showGroupAverage: settings.showGroupAverage !== false,
        selectedBioreactors: normalizeStringArray(settings.selectedBioreactors),
        extraMetrics: normalizeExtraMetrics(settings.extraMetrics || [])
      };
    });
    return normalized;
  };
  const [groupPanelSettings, setGroupPanelSettings] = useState(() => normalizeGroupPanelSettings(loadState('groupPanelSettings', {})));
  const [selectedPoint, setSelectedPoint] = useState(null);

  const defaultColors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#4f46e5', '#ca8a04', '#be123c', '#15803d', '#ec4899', '#8b5cf6'];

  const findTiterMetricKey = (data, preferredMetric, usePreferred = true) => {
    const seriesKeys = new Set();
    Object.values(data?.bioreactors || {}).forEach(br => {
      Object.keys(br?.series || {}).forEach(key => seriesKeys.add(key));
    });
    if (usePreferred && preferredMetric && seriesKeys.has(preferredMetric)) return preferredMetric;
    const preferredMatches = [
      (key) => key.toLowerCase().includes('igg_mg_per_l'),
      (key) => key.toLowerCase().includes('protein_a_hplc'),
      (key) => key.toLowerCase().includes('titer')
    ];
    for (const matcher of preferredMatches) {
      const match = Array.from(seriesKeys).find(matcher);
      if (match) return match;
    }
    return '';
  };

  useEffect(() => {
    if (initialData) {
      initializeDashboard(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (!rawData) return;
    const fallbackMetric = findTiterMetricKey(rawData, titerConfig.metric);
    if (fallbackMetric && fallbackMetric !== titerConfig.metric) {
      setTiterConfig(prev => ({ ...prev, metric: fallbackMetric }));
    }
  }, [rawData, titerConfig.metric]);

  // Rebuild data when exclusions change
  useEffect(() => {
    if (rawData) {
      const parsed = parseFermentationData(rawData, exclusions);
      setParsedData(parsed);
    }
  }, [exclusions]);

  // ── Inject CREF_ averages into chartData ─────────────────────────────────
  // We compute this as a derived value so it doesn't require re-parsing
  const chartDataWithCustomGroups = useMemo(() => {
    if (!parsedData?.chartData || parsedData.chartData.length === 0) return parsedData?.chartData || [];
    const activeGroups = customRefGroups.filter(g => g.bios.length > 0);
    if (activeGroups.length === 0) return parsedData.chartData;
    // Get all metric keys available in chartData
    const sampleRow = parsedData.chartData[0] || {};
    const allMetricKeys = new Set();
    Object.keys(sampleRow).forEach(k => {
      if (k === 'day') return;
      const parts = k.split('_');
      if (parts.length >= 2) {
        // metric is everything after the first "_"-delimited token
        allMetricKeys.add(parts.slice(1).join('_'));
      }
    });
    return parsedData.chartData.map(row => {
      const newRow = { ...row };
      activeGroups.forEach(grp => {
        const prefix = `CREF_${grp.id}`;
        allMetricKeys.forEach(metric => {
          let sum = 0; let count = 0;
          grp.bios.forEach(bioId => {
            const val = row[`${bioId}_${metric}`];
            if (val !== undefined && val !== null && !isNaN(Number(val))) { sum += Number(val); count++; }
          });
          if (count > 0) newRow[`${prefix}_${metric}`] = sum / count;
        });
      });
      return newRow;
    });
  }, [parsedData?.chartData, customRefGroups]);



  const resolvePresetMetric = (item) => {
    let foundMetric = null;
    for (const pattern of item.patterns) {
      foundMetric = parsedData.allMetrics.find(m => m.toLowerCase().includes(pattern));
      if (foundMetric) break;
    }
    return foundMetric;
  };

  // Render single matrix panel

  const handleChartLibraryClick = (preset) => {
    if (matrixMode && selectedMatrixPanel) {
      setMatrixPanels(prev => ({ ...prev, [selectedMatrixPanel]: preset.id }));
    } else {
      setExtraMetrics([]);
      saveState('extraMetrics', []);
      // Resolve the actual available metric from the preset patterns
      const resolvedLeft = resolvePresetMetric(preset) || leftMetric;
      setLeftMetric(resolvedLeft);
      saveState('leftMetric', resolvedLeft);
      if (preset.rightMetric && preset.enableDualAxis) {
        const rightItem = CHART_LIBRARY.flatMap(c => c.items).find(i => i.id === preset.rightMetric);
        const resolvedRight = rightItem ? resolvePresetMetric(rightItem) : null;
        if (resolvedRight) { setRightMetric(resolvedRight); setEnableDualAxis(true); }
        else setEnableDualAxis(false);
      } else {
        setEnableDualAxis(false);
      }
    }
  };


  // Render individual matrix panel
  const renderMatrixPanel = (panelId) => {
    const presetId = matrixPanels[panelId];

    if (!presetId) {
      // Empty panel
      return (
        <div className="h-full flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
          <div className="text-center p-4">
            <Grid3x3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Select panel in Chart Library</p>
            <p className="text-[10px] text-slate-400">Panel {panelId.replace('panel', '')}</p>
          </div>
        </div>
      );
    }

    // Find preset
    const preset = CHART_LIBRARY.flatMap(cat => cat.items).find(item => item.id === presetId);
    if (!preset) return null;

    const panelZoom = panelZoomDomains[panelId];
    const panelMetric = matrixPanelMetrics[panelId] || resolvePresetMetric(preset) || leftMetric;
    const panelSelection = matrixPanelSelections[panelId] || selectedIds;
    const panelGroupLabel = matrixPanelGroups[panelId] ? ` ${matrixPanelGroups[panelId]}` : '';
    const panelPeakRange = getPeakRange(panelZoom);
    const panelPeakPoints = showPeak ? getPeakPoints(panelSelection, panelMetric, panelPeakRange) : [];

    return (
      <div className="h-full min-h-0 bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-2 py-1.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h4 className="text-[10px] font-bold text-slate-700">
            {preset.label}
            {panelGroupLabel}
          </h4>
          <div className="flex items-center gap-1">
            {panelZoom && (
              <button
                onClick={() => resetMatrixZoom(panelId)}
                className="p-0.5 hover:bg-slate-200 rounded"
                title="Reset Zoom"
              >
                <ZoomOut className="w-3 h-3 text-slate-400" />
              </button>
            )}
            <button
              onClick={() => {
                setMatrixPanels(prev => ({ ...prev, [panelId]: null }));
                setMatrixPanelMetrics(prev => {
                  const { [panelId]: _removed, ...rest } = prev;
                  return rest;
                });
                setMatrixPanelSelections(prev => {
                  const { [panelId]: _removed, ...rest } = prev;
                  return rest;
                });
                setMatrixPanelGroups(prev => {
                  const { [panelId]: _removed, ...rest } = prev;
                  return rest;
                });
              }}
              className="p-0.5 hover:bg-slate-200 rounded"
              title="Clear Panel"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="h-[calc(100%-28px)] min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 8, left: 5, bottom: 5 }}
              onMouseDown={(e) => e && setPanelRefAreas(prev => ({ ...prev, [panelId]: { start: e.activeLabel } }))}
              onMouseMove={(e) => panelRefAreas[panelId]?.start && e && setPanelRefAreas(prev => ({ ...prev, [panelId]: { ...prev[panelId], end: e.activeLabel } }))}
              onMouseUp={() => {
                const area = panelRefAreas[panelId];
                if (area && area.start && area.end && area.start !== area.end) {
                  const left = Math.min(Number(area.start), Number(area.end));
                  const right = Math.max(Number(area.start), Number(area.end));
                  if (right - left >= 1) {
                    setPanelZoomDomains(prev => ({ ...prev, [panelId]: { left, right } }));
                  }
                }
                setPanelRefAreas(prev => ({ ...prev, [panelId]: null }));
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                domain={panelZoom ? [panelZoom.left, panelZoom.right] : ['dataMin', 'auto']}
                type="number"
                allowDataOverflow
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fill: '#64748b', fontSize: 8 }}
                tickFormatter={(val) => panelZoom ? `${(val - panelZoom.left).toFixed(0)}(${val})` : val}
              />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 8 }} width={28}
              />
              {preset.enableDualAxis && preset.rightMetric && (
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 8 }} width={28}
                />
              )}
              <Tooltip content={<CustomTooltip zoomDomain={panelZoom} />} />
              <Legend verticalAlign="top" height={20} iconType="plainline" wrapperStyle={{ fontSize: '9px' }} />

              {showStages && stages.map(stage => {
                const range = getStageRange(stage, panelZoom);
                if (!range) return null;
                return (
                  <ReferenceArea
                    key={`${panelId}-${stage.id}`}
                    yAxisId="left"
                    x1={range.start}
                    x2={range.end}
                    fill={stage.color}
                    fillOpacity={0.5}
                  />
                );
              })}

              {showOperations && batchOperations.map((op, opIdx) => {
                const zd = panelZoom;
                if (zd && (op.day < zd.left || op.day > zd.right)) return null;
                return (
                  <ReferenceLine key={`matop-${panelId}-${op.id || opIdx}`} x={op.day} yAxisId="left" stroke="#0d9488" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: op.description, position: 'insideTopRight', fontSize: 8, fill: '#0d9488', angle: -90, offset: 5 }} />
                );
              })}

              {panelSelection.map((id, idx) => {
                const settings = plotSettings[id] || { color: defaultColors[idx % defaultColors.length], shape: 'circle', strokeDash: '0', secondaryColor: defaultColors[idx % defaultColors.length], secondaryStrokeWidth: 1 };
                const isGroup = id.startsWith('GRP_');
                const displayName = getDisplayName(id, isGroup);

                return (
                  <React.Fragment key={id}>
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={`${id}_${panelMetric}`}
                      name={displayName}
                      stroke={settings.color}
                      strokeWidth={isGroup ? 2 : 1.5}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      onClick={(data) => handlePointClick(id, data, matrixPanelGroups[panelId] || '')}
                      label={showPrimaryLabels ? <CustomizedLabel name={displayName} chartData={chartData} seriesIndex={idx} color={settings.color} dataKey={`${id}_${panelMetric}`} /> : null}
                    />
                    {preset.enableDualAxis && preset.rightMetric && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey={`${id}_${preset.rightMetric}`}
                        name={`${displayName} (${formatMetricName(preset.rightMetric)})`}
                        stroke={settings.secondaryColor || settings.color}
                        strokeWidth={1}
                      strokeOpacity={0.7}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      onClick={(data) => handlePointClick(id, data, matrixPanelGroups[panelId] || '')}
                      label={showSecondaryLabels ? <CustomizedLabel name={`${displayName} (${formatMetricName(preset.rightMetric)})`} chartData={chartData} seriesIndex={idx + 100} color={settings.secondaryColor || settings.color} dataKey={`${id}_${preset.rightMetric}`} /> : null}
                    />
                    )}
                  </React.Fragment>
                );
              })}
              {panelPeakPoints.length > 0 && (
                <Scatter data={panelPeakPoints} yAxisId="left" dataKey="value" name="Peak" shape="circle">
                  {panelPeakPoints.map((point, idx) => (
                    <Cell key={`peak-${panelId}-${point.id}-${idx}`} fill={point.fill} />
                  ))}
                </Scatter>
              )}

              {panelRefAreas[panelId]?.start && panelRefAreas[panelId]?.end && (
                <ReferenceArea yAxisId="left" x1={panelRefAreas[panelId].start} x2={panelRefAreas[panelId].end}
                  strokeOpacity={0.3} fill="#8884d8" fillOpacity={0.1} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

const initializeDashboard = (json) => {
    if (!json || !json.bioreactors) {
      console.error('Invalid data structure');
      setParsedData(EMPTY_DATA);
      return;
    }
    setRawData(json);
    try {
      const parsed = parseFermentationData(json, exclusions || {});
      if (!parsed) {
        setParsedData(EMPTY_DATA);
        return;
      }
    setParsedData(parsed);
    const likelyTiter = findTiterMetricKey(json, parsed.allMetrics.find(m => m.includes('igg_mg_per_l') || m.includes('protein_a') || m.includes('igg') || m.includes('titer')));
    setTiterConfig(prev => ({ ...prev, metric: likelyTiter || parsed.allMetrics[0], day: 14 }));
    const newSettings = { ...plotSettings };
    let needsSave = false;
    let initialSelection = [...selectedIds];
    const availableBioreactors = json.bioreactors ? Object.keys(json.bioreactors) : [];
    const availableGroups = parsed.groups ? Object.keys(parsed.groups).map(grp => `GRP_${grp}`) : [];
    const availableCustomGroups = customRefGroups.map(grp => `CREF_${grp.id}`);
    const availableSelectionIds = new Set([...availableBioreactors, ...availableGroups, ...availableCustomGroups]);
    initialSelection = initialSelection.filter(id => availableSelectionIds.has(id));

    if (json.bioreactors) Object.keys(json.bioreactors).forEach((key, index) => {
        const baseColor = defaultColors[index % defaultColors.length];
        const existing = newSettings[key] || {};
        const normalized = {
          color: existing.color || baseColor,
          shape: existing.shape || 'circle',
          strokeDash: existing.strokeDash || '0',
          secondaryColor: existing.secondaryColor || existing.color || baseColor,
          secondaryStrokeWidth: Number.isFinite(existing.secondaryStrokeWidth) ? existing.secondaryStrokeWidth : 1
        };
        if (JSON.stringify(existing) !== JSON.stringify(normalized)) {
          newSettings[key] = normalized;
          needsSave = true;
        }
        // Auto-select first 3 bioreactors (never GRP_ on first load)
        if (initialSelection.length === 0 && index < 3) initialSelection.push(key);
    });
    if (parsed.groups) Object.keys(parsed.groups).forEach((grp, index) => {
        const grpKey = `GRP_${grp}`;
        const grpColor = index === 0 ? '#334155' : index === 1 ? '#64748b' : '#94a3b8';
        const existing = newSettings[grpKey] || {};
        const normalized = {
          color: existing.color || grpColor,
          shape: existing.shape || 'triangle',
          strokeDash: existing.strokeDash || '5 5',
          secondaryColor: existing.secondaryColor || existing.color || grpColor,
          secondaryStrokeWidth: Number.isFinite(existing.secondaryStrokeWidth) ? existing.secondaryStrokeWidth : 1
        };
        if (JSON.stringify(existing) !== JSON.stringify(normalized)) {
          newSettings[grpKey] = normalized;
          needsSave = true;
        }
        // NOTE: GRP_ groups are NOT auto-selected — user activates them manually via Reference Groups sidebar
    });
    // Default styles for custom reference groups
    const crefColors = ['#dc2626', '#16a34a', '#2563eb'];
    customRefGroups.forEach((grp, index) => {
      const crefKey = `CREF_${grp.id}`;
      if (!newSettings[crefKey]) { newSettings[crefKey] = { color: crefColors[index] || '#6b7280', shape: 'diamond', strokeDash: '8 4', secondaryColor: crefColors[index] || '#6b7280', secondaryStrokeWidth: 2 }; needsSave = true; }
    });
    if (needsSave) { setPlotSettings(newSettings); saveState('plotSettings', newSettings); }
    if (initialSelection.length > selectedIds.length) { setSelectedIds(initialSelection); saveState('selectedIds', initialSelection); }
    // Smart metric auto-selection: try preferred patterns, fallback to first available
    if (!parsed.allMetrics.includes(leftMetric)) {
      const best = parsed.allMetrics.find(m => m.toLowerCase().includes('viable_cells'))
        || parsed.allMetrics.find(m => m.toLowerCase().includes('gluc'))
        || parsed.allMetrics.find(m => m.toLowerCase().includes('igg'))
        || parsed.allMetrics.find(m => m.toLowerCase().includes('ldh'))
        || parsed.allMetrics[0] || '';
      setLeftMetric(best);
      saveState('leftMetric', best);
    }
    if (!parsed.allMetrics.includes(rightMetric)) {
      const best = parsed.allMetrics.find(m => m.toLowerCase().includes('igg'))
        || parsed.allMetrics.find(m => m.toLowerCase().includes('ldh'))
        || parsed.allMetrics.find(m => m.toLowerCase().includes('nh3'))
        || parsed.allMetrics[1] || parsed.allMetrics[0] || '';
      setRightMetric(best);
      saveState('rightMetric', best);
    }
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      setParsedData(EMPTY_DATA);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const json = await parseUploadedFile(file);
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(json));
      initializeDashboard(json);
    } catch (error) {
      alert('Error parsing file: ' + error.message);
    }
  };

  const updateSetting = (id, field, value) => { const safeSettings = normalizeObject(plotSettings); const updated = { ...safeSettings, [id]: { ...safeSettings[id], [field]: value }}; setPlotSettings(updated); saveState('plotSettings', updated); };
  const updateConditionGroup = (condition, field, value) => { if (!rawData?.bioreactors) return; const targetIds = Object.keys(rawData.bioreactors).filter(id => rawData.bioreactors[id].condition === condition); const newSettings = { ...normalizeObject(plotSettings) }; targetIds.forEach(id => { if (newSettings[id]) { newSettings[id] = { ...newSettings[id], [field]: value }; } else { newSettings[id] = { color: '#000000', shape: 'circle', strokeDash: '0', secondaryColor: '#000000', secondaryStrokeWidth: 1, [field]: value }; } }); setPlotSettings(newSettings); saveState('plotSettings', newSettings); };
  const updateStage = (idx, field, value) => { const newStages = [...stages]; newStages[idx][field] = value; setStages(newStages); saveState('stages', newStages); };
  const selectBioreactorGroup = (groupName) => { const groupIds = parsedData.groups[groupName] || []; const currentRefGroups = selectedIds.filter(id => id.startsWith('GRP_')); const newSelection = [...currentRefGroups, ...groupIds]; setSelectedIds(newSelection); saveState('selectedIds', newSelection); setIsGroupFilterOpen(false); };
  const toggleVisibility = (id) => {
    // In split mode, handle groups and bioreactors differently
    if (splitByGroup && activeGroupPanel && !id.startsWith('GRP_')) {
      // Toggle bioreactor in active panel
      toggleBioreactorInPanel(activeGroupPanel, id);
    } else {
      // Normal mode or group selection
      const updated = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id];
      setSelectedIds(updated);
      saveState('selectedIds', updated);
    }
  };

  // Split by Group functionality
  const toggleSplitByGroup = () => {
    if (!splitByGroup) {
      // SAVE current main chart state before switching to split mode
      savedMainStateRef.current = {
        selectedIds: [...selectedIds],
        leftMetric,
        rightMetric,
        enableDualAxis,
        extraMetrics: [...extraMetrics],
        zoomDomain: zoomDomain ? { ...zoomDomain } : null,
        showStages,
        showOperations,
        showPeak,
      };

      // Initialize panel settings for each group
      const groupNames = Object.keys(parsedData.groups || {});
      const newSettings = {};
      const groupIds = [];

      groupNames.forEach(grp => {
        const grpId = `GRP_${grp}`;
        groupIds.push(grpId);

        if (!groupPanelSettings[grp]) {
          newSettings[grp] = {
            leftMetric: leftMetric,
            rightMetric: rightMetric,
            enableDualAxis: enableDualAxis,
            extraMetrics: extraMetrics,
            selectedBioreactors: parsedData.groups[grp] || [],
            showGroupAverage: true
          };
        }
      });

      // Update settings
        if (Object.keys(newSettings).length > 0) {
          const merged = { ...groupPanelSettings, ...newSettings };
          const normalized = normalizeGroupPanelSettings(merged);
          setGroupPanelSettings(normalized);
          saveState('groupPanelSettings', normalized);
        }

      // Auto-select all groups in split mode
      if (groupIds.length > 0) {
        setSelectedIds(groupIds);
        saveState('selectedIds', groupIds);
        setActiveGroupPanel(groupNames[0]);
      }
    } else {
      // RESTORE main chart state when switching back to Main
      if (savedMainStateRef.current) {
        const saved = savedMainStateRef.current;
        setSelectedIds(saved.selectedIds);
        saveState('selectedIds', saved.selectedIds);
        setLeftMetric(saved.leftMetric);
        setRightMetric(saved.rightMetric);
        setEnableDualAxis(saved.enableDualAxis);
        setExtraMetrics(saved.extraMetrics);
        setZoomDomain(saved.zoomDomain);
        setShowStages(saved.showStages);
        setShowOperations(saved.showOperations);
        setShowPeak(saved.showPeak);
        savedMainStateRef.current = null;
      }
      setMatrixMode(false);
      setActiveGroupPanel('');
    }
    setSplitByGroup(!splitByGroup);
  };

  const updateGroupPanelSetting = (groupName, key, value) => {
    const safeSettings = normalizeObject(groupPanelSettings);
    const updated = {
      ...safeSettings,
      [groupName]: {
        ...(safeSettings[groupName] || {}),
        [key]: value
      }
    };
    const normalized = normalizeGroupPanelSettings(updated);
    setGroupPanelSettings(normalized);
    saveState('groupPanelSettings', normalized);
  };

  const toggleBioreactorInPanel = (groupName, brId) => {
    const current = groupPanelSettings[groupName]?.selectedBioreactors || [];
    const updated = current.includes(brId) ? current.filter(id => id !== brId) : [...current, brId];
    updateGroupPanelSetting(groupName, 'selectedBioreactors', updated);
  };

  // Handlers for metric changes (work in both unified and split mode)
  const handleLeftMetricChange = (value) => {
    if (splitByGroup && activeGroupPanel) {
      updateGroupPanelSetting(activeGroupPanel, 'leftMetric', value);
    } else {
      setLeftMetric(value);
    }
  };

  const handleRightMetricChange = (value) => {
    if (splitByGroup && activeGroupPanel) {
      updateGroupPanelSetting(activeGroupPanel, 'rightMetric', value);
    } else {
      setRightMetric(value);
    }
  };

  const handleDualAxisToggle = () => {
    if (splitByGroup && activeGroupPanel) {
      const current = groupPanelSettings[activeGroupPanel]?.enableDualAxis ?? enableDualAxis;
      updateGroupPanelSetting(activeGroupPanel, 'enableDualAxis', !current);
    } else {
      setEnableDualAxis(!enableDualAxis);
    }
  };

  const getCurrentExtraMetrics = () => {
    if (splitByGroup && activeGroupPanel) {
      return normalizeExtraMetrics(groupPanelSettings[activeGroupPanel]?.extraMetrics);
    }
    return normalizeExtraMetrics(extraMetrics);
  };

  const updateExtraMetrics = (updated) => {
    const normalized = normalizeExtraMetrics(updated);
    if (splitByGroup && activeGroupPanel) {
      updateGroupPanelSetting(activeGroupPanel, 'extraMetrics', normalized);
    } else {
      setExtraMetrics(normalized);
      saveState('extraMetrics', normalized);
    }
  };

  const addExtraMetric = () => {
    const current = getCurrentExtraMetrics();
    const inUse = new Set([getCurrentLeftMetric(), getCurrentRightMetric(), ...current.map(item => item.metric)]);
    const available = parsedData.allMetrics.filter(metric => !inUse.has(metric));
    if (available.length === 0) return;
    updateExtraMetrics([...current, { metric: available[0], useAxis: true }]);
  };

  const updateExtraMetric = (index, key, value) => {
    const current = getCurrentExtraMetrics();
    const updated = current.map((item, idx) => idx === index ? { ...item, [key]: value } : item);
    updateExtraMetrics(updated);
  };

  const removeExtraMetric = (index) => {
    const current = getCurrentExtraMetrics();
    updateExtraMetrics(current.filter((_, idx) => idx !== index));
  };

  // Get current metric values (from panel or global)
  const getCurrentLeftMetric = () => {
    if (splitByGroup && activeGroupPanel) {
      return groupPanelSettings[activeGroupPanel]?.leftMetric || leftMetric;
    }
    return leftMetric;
  };

  const getCurrentRightMetric = () => {
    if (splitByGroup && activeGroupPanel) {
      return groupPanelSettings[activeGroupPanel]?.rightMetric || rightMetric;
    }
    return rightMetric;
  };

  const getCurrentDualAxis = () => {
    if (splitByGroup && activeGroupPanel) {
      return groupPanelSettings[activeGroupPanel]?.enableDualAxis ?? enableDualAxis;
    }
    return enableDualAxis;
  };

  // Check if bioreactor is selected (for sidebar display)
  const isBioreactorSelected = (id) => {
    if (splitByGroup && activeGroupPanel && !id.startsWith('GRP_')) {
      // In split mode, check if bioreactor is in active panel
      const panelBioreactors = groupPanelSettings[activeGroupPanel]?.selectedBioreactors || [];
      return panelBioreactors.includes(id);
    }
    // Normal mode or group selection
    return selectedIds.includes(id);
  };

  // Get bioreactors to display in sidebar
  const getBioreactorsToDisplay = () => {
    if (!rawData?.bioreactors) return [];
    const allBioreactors = Object.keys(rawData.bioreactors);

    if (splitByGroup && activeGroupPanel) {
      // In split mode, show only bioreactors from active group
      const groupBioreactors = parsedData.groups[activeGroupPanel] || [];
      return allBioreactors.filter(id => groupBioreactors.includes(id));
    }

    // Normal mode, show all
    return allBioreactors;
  };

  const toggleAllBioreactors = () => {
    if (!rawData?.bioreactors) return;
    if (splitByGroup && activeGroupPanel) {
      const groupBioreactors = parsedData.groups[activeGroupPanel] || [];
      const currentSelected = groupPanelSettings[activeGroupPanel]?.selectedBioreactors || [];
      const areAllSelected = groupBioreactors.every(id => currentSelected.includes(id));
      const updated = areAllSelected ? [] : [...groupBioreactors];
      updateGroupPanelSetting(activeGroupPanel, 'selectedBioreactors', updated);
      return;
    }
    const allBioIds = Object.keys(rawData.bioreactors);
    const areAllSelected = allBioIds.every(id => selectedIds.includes(id));
    const updated = areAllSelected ? selectedIds.filter(id => !allBioIds.includes(id)) : Array.from(new Set([...selectedIds, ...allBioIds]));
    setSelectedIds(updated);
    saveState('selectedIds', updated);
  };

  const calculatedTiterData = useMemo(() => {
    if (!rawData?.bioreactors) return [];
    const targetDay = titerConfig.day;
    const computeResults = (seriesKey) => {
      const results = [];
      Object.entries(rawData.bioreactors).forEach(([id, br]) => {
        const timepoints = br?.timepoints || [];
        const values = br?.series?.[seriesKey] || [];
        let maxVal = null;
        let maxDay = -1;
        // Collect all valid data points for linear extrapolation
        const dataPoints = [];
        timepoints.forEach((tp, index) => {
          const day = tp?.culture_day;
          if (day === null || day === undefined || day > targetDay) return;
          const rawValue = values[index];
          if (rawValue === null || rawValue === undefined) return;
          const numericVal = Number(rawValue);
          if (Number.isNaN(numericVal)) return;
          dataPoints.push({ day, value: numericVal });
          if (maxVal === null || numericVal > maxVal) {
            maxVal = numericVal;
            maxDay = day;
          }
        });
        if (maxDay !== -1) {
          const condition = br?.condition || 'Ungrouped';
          // Linear extrapolation from last N data points (use last 3-5 points for stability)
          let prediction = null;
          if (dataPoints.length >= 2) {
            const sorted = dataPoints.sort((a, b) => a.day - b.day);
            const usePoints = sorted.slice(-Math.min(5, sorted.length));
            const n = usePoints.length;
            const sumX = usePoints.reduce((s, p) => s + p.day, 0);
            const sumY = usePoints.reduce((s, p) => s + p.value, 0);
            const sumXY = usePoints.reduce((s, p) => s + p.day * p.value, 0);
            const sumX2 = usePoints.reduce((s, p) => s + p.day * p.day, 0);
            const denom = n * sumX2 - sumX * sumX;
            if (Math.abs(denom) > 1e-10) {
              const slope = (n * sumXY - sumX * sumY) / denom;
              const intercept = (sumY - slope * sumX) / n;
              prediction = slope * targetDay + intercept;
              if (prediction < 0) prediction = 0;
            }
          }
          const diff = prediction != null && prediction > 0 ? ((maxVal - prediction) / prediction) * 100 : 0;
          results.push({ id, value: maxVal, prediction, diff, condition, foundDay: maxDay });
        }
      });
      return results;
    };

    const preferredKey = findTiterMetricKey(rawData, titerConfig.metric);
    const defaultKey = findTiterMetricKey(rawData, '', false);
    const activeKey = preferredKey || defaultKey;
    if (!activeKey) return [];

    const results = computeResults(activeKey);
    if (results.length === 0 && defaultKey && defaultKey !== activeKey) {
      return computeResults(defaultKey);
    }
    if (titerSort === 'val_asc') results.sort((a, b) => a.value - b.value);
    if (titerSort === 'val_desc') results.sort((a, b) => b.value - a.value);
    if (titerSort === 'id') results.sort((a, b) => a.id.localeCompare(b.id));
    return results;
  }, [rawData, titerConfig, titerSort]);

  useEffect(() => {
    if (!rawData?.bioreactors) return;
    if (calculatedTiterData.length > 0) return;
    const strictKey = findTiterMetricKey(rawData, '', false);
    if (strictKey && strictKey !== titerConfig.metric) {
      setTiterConfig(prev => ({ ...prev, metric: strictKey }));
    }
  }, [rawData, calculatedTiterData.length, titerConfig.metric]);

  useEffect(() => { if (titerConfig.useZoom && zoomDomain) { setTiterConfig(prev => ({ ...prev, day: Math.ceil(zoomDomain.right) })); } else if (titerConfig.useZoom && !zoomDomain && parsedData.metadata.duration) { setTiterConfig(prev => ({ ...prev, day: parsedData.metadata.duration })); } }, [zoomDomain, titerConfig.useZoom, parsedData.metadata.duration]);
  const applyPresetGroup = (item, groupName) => {
    const foundMetric = resolvePresetMetric(item);
    if (!foundMetric) {
      alert(`No data found for "${item.label}"`);
      return;
    }

    const groupIds = parsedData.groups[groupName] || [];
    const averageId = `GRP_${groupName}`;
    const newSelection = [...groupIds];
    if (parsedData.chartData.some(row => row[`${averageId}_${foundMetric}`] !== undefined)) {
      newSelection.push(averageId);
    }

    if (matrixMode && selectedMatrixPanel) {
      setMatrixPanels(prev => ({
        ...prev,
        [selectedMatrixPanel]: item.id
      }));
      setMatrixPanelMetrics(prev => ({
        ...prev,
        [selectedMatrixPanel]: foundMetric
      }));
      setMatrixPanelSelections(prev => ({
        ...prev,
        [selectedMatrixPanel]: newSelection
      }));
      setMatrixPanelGroups(prev => ({
        ...prev,
        [selectedMatrixPanel]: groupName
      }));
      return;
    }

    setExtraMetrics([]);
    saveState('extraMetrics', []);
    setLeftMetric(foundMetric);
    saveState('leftMetric', foundMetric);
    setEnableDualAxis(false);
    saveState('enableDualAxis', false);
    setSelectedIds(newSelection);
    saveState('selectedIds', newSelection);
  };
  const applyPresetAll = (item) => {
    const foundMetric = resolvePresetMetric(item);
    if (!foundMetric) {
      alert(`No data found for "${item.label}"`);
      return;
    }

    // "All" = all bioreactors only, no GRP_ averages (user activates those manually)
    const allBioreactors = Object.keys(rawData?.bioreactors || parsedData.bioreactors || {});
    const newSelection = [...allBioreactors];

    if (matrixMode && selectedMatrixPanel) {
      setMatrixPanels(prev => ({ ...prev, [selectedMatrixPanel]: item.id }));
      setMatrixPanelMetrics(prev => ({ ...prev, [selectedMatrixPanel]: foundMetric }));
      setMatrixPanelSelections(prev => ({ ...prev, [selectedMatrixPanel]: newSelection }));
      setMatrixPanelGroups(prev => ({ ...prev, [selectedMatrixPanel]: '' }));
      return;
    }

    if (splitByGroup) { setSplitByGroup(false); setMatrixMode(false); setActiveGroupPanel(''); }
    setExtraMetrics([]); saveState('extraMetrics', []);
    setLeftMetric(foundMetric); saveState('leftMetric', foundMetric);
    setEnableDualAxis(false); saveState('enableDualAxis', false);
    setSelectedIds(newSelection); saveState('selectedIds', newSelection);
  };

  /**
   * Apply a preset while restricting bioreactor selection to one Custom Ref Group.
   * Used by the Chart Library group buttons.
   */
  const applyPresetCustomRef = (item, crefGroup) => {
    const foundMetric = resolvePresetMetric(item);
    if (!foundMetric) { alert(`No data found for "${item.label}"`); return; }
    if (!crefGroup || crefGroup.bios.length === 0) return;

    const crefId = `CREF_${crefGroup.id}`;
    // All bioreactors belonging to this custom group
    const bioSelection = [...crefGroup.bios];
    // Also add the CREF_ average line if its data exists in chartData
    const hasCrefData = chartDataWithCustomGroups.some(row => row[`${crefId}_${foundMetric}`] !== undefined);
    const newSelection = hasCrefData ? [...bioSelection, crefId] : bioSelection;

    if (matrixMode && selectedMatrixPanel) {
      setMatrixPanels(prev => ({ ...prev, [selectedMatrixPanel]: item.id }));
      setMatrixPanelMetrics(prev => ({ ...prev, [selectedMatrixPanel]: foundMetric }));
      setMatrixPanelSelections(prev => ({ ...prev, [selectedMatrixPanel]: newSelection }));
      setMatrixPanelGroups(prev => ({ ...prev, [selectedMatrixPanel]: crefGroup.name }));
      return;
    }

    if (splitByGroup) { setSplitByGroup(false); setMatrixMode(false); setActiveGroupPanel(''); }
    setExtraMetrics([]); saveState('extraMetrics', []);
    setLeftMetric(foundMetric); saveState('leftMetric', foundMetric);
    setEnableDualAxis(false); saveState('enableDualAxis', false);
    setSelectedIds(newSelection); saveState('selectedIds', newSelection);
  };
  const exportTable = () => {
      if (!parsedData?.chartData) return;
      const headers = ['Bioreactor', 'Day', ...dataTableMetrics.map(metric => formatMetricName(metric))];
      const csvRows = [headers.join(',')];
      dataTableRows.forEach(row => {
        const rowData = [row.bioreactor, row.day, ...dataTableMetrics.map(metric => row[metric] ?? '')];
        csvRows.push(rowData.join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `fermentation_data.csv`; link.click();
  };

  const getPointMetrics = (bioreactorId, day) => {
    const br = rawData?.bioreactors?.[bioreactorId];
    if (!br) return [];
    const timeIndex = br.timepoints.findIndex(tp => tp.culture_day === day);
    if (timeIndex === -1) return [];
    const metrics = Object.keys(br.series || {}).filter(metric => !shouldExcludeSeries(metric));
    const sortedMetrics = sortMetricsByPriority(metrics);
    return sortedMetrics.map(metric => ({
      metric,
      value: br.series?.[metric]?.[timeIndex]
    }));
  };

  const handlePointClick = (seriesId, data, groupName = '') => {
    if (!data?.payload || seriesId.startsWith('GRP_')) return;
    const day = data.payload.day;
    const sampleId = data.payload?.[`${seriesId}__sample_id`];
    const metrics = getPointMetrics(seriesId, day);
    setSelectedPoint({ seriesId, day, sampleId, groupName, metrics });
  };
  const handleZoom = () => { if (refAreaLeft === refAreaRight || refAreaRight === '') { setRefAreaLeft(''); setRefAreaRight(''); return; } let left = Math.min(Number(refAreaLeft), Number(refAreaRight)); let right = Math.max(Number(refAreaLeft), Number(refAreaRight)); if (right - left < 1) right = left + 1; setZoomDomain({ left, right }); setRefAreaLeft(''); setRefAreaRight(''); };
  const resetZoom = () => { setZoomDomain(null); setRefAreaLeft(''); setRefAreaRight(''); };

  const startPanelZoom = (groupName, event) => {
    if (!event?.activeLabel) return;
    setPanelRefAreas(prev => ({
      ...prev,
      [groupName]: { left: event.activeLabel, right: event.activeLabel }
    }));
  };

  const movePanelZoom = (groupName, event) => {
    if (!event?.activeLabel) return;
    setPanelRefAreas(prev => {
      if (!prev[groupName]?.left) return prev;
      return { ...prev, [groupName]: { ...prev[groupName], right: event.activeLabel } };
    });
  };

  const endPanelZoom = (groupName) => {
    const range = panelRefAreas[groupName];
    if (!range?.left || !range?.right || range.left === range.right) {
      setPanelRefAreas(prev => ({ ...prev, [groupName]: { left: '', right: '' } }));
      return;
    }
    let left = Math.min(Number(range.left), Number(range.right));
    let right = Math.max(Number(range.left), Number(range.right));
    if (right - left < 1) right = left + 1;
    setPanelZoomDomains(prev => ({ ...prev, [groupName]: { left, right } }));
    setPanelRefAreas(prev => ({ ...prev, [groupName]: { left: '', right: '' } }));
  };

  const resetPanelZoom = (groupName) => {
    setPanelZoomDomains(prev => ({ ...prev, [groupName]: null }));
  };
  const resetMatrixZoom = (panelId) => {
    setPanelZoomDomains(prev => ({ ...prev, [panelId]: null }));
  };
  const getStageRange = (stage, zoom) => {
    const start = Number(stage.start);
    const end = Number(stage.end);
    if (!zoom) {
      return { start, end };
    }
    const clampedStart = Math.max(start, zoom.left);
    const clampedEnd = Math.min(end, zoom.right);
    if (clampedEnd <= clampedStart) return null;
    return { start: clampedStart, end: clampedEnd };
  };
  const getPeakRange = (zoom) => {
    if (zoom?.left !== undefined && zoom?.right !== undefined) {
      return { start: zoom.left, end: zoom.right };
    }
    const feedStage = stages.find(stage => stage.id === 'feed' || stage.label?.toLowerCase().includes('feed'));
    if (!feedStage) return null;
    return { start: Number(feedStage.start), end: Number(feedStage.end) };
  };
  const getPeakPoints = (ids, metric, range) => {
    if (!chartData || chartData.length === 0) return [];
    return ids.flatMap(id => {
      const key = `${id}_${metric}`;
      let maxPoint = null;
      chartData.forEach(row => {
        const day = Number(row.day);
        if (!Number.isFinite(day)) return;
        if (range && (day < range.start || day > range.end)) return;
        const value = row[key];
        if (typeof value !== 'number' || Number.isNaN(value)) return;
        if (!maxPoint || value > maxPoint.value) {
          maxPoint = { day, value, id };
        }
      });
      if (!maxPoint) return [];
      const color = plotSettings?.[id]?.color || '#f97316';
      return [{ ...maxPoint, fill: color }];
    });
  };
  useEffect(() => { if (leftMetric) saveState('leftMetric', leftMetric); }, [leftMetric]);
  useEffect(() => { if (rightMetric) saveState('rightMetric', rightMetric); }, [rightMetric]);
  useEffect(() => { saveState('enableDualAxis', enableDualAxis); }, [enableDualAxis]);
  useEffect(() => { saveState('extraMetrics', extraMetrics); }, [extraMetrics]);
  useEffect(() => { saveState('showPrimaryLabels', showPrimaryLabels); }, [showPrimaryLabels]);
  useEffect(() => { saveState('showSecondaryLabels', showSecondaryLabels); }, [showSecondaryLabels]);

  useEffect(() => {
    if (!splitByGroup) return;
    const activeGroups = selectedIds.filter(id => id.startsWith('GRP_')).map(id => id.replace('GRP_', ''));
    if (activeGroups.length === 0) {
      setActiveGroupPanel('');
      return;
    }
    if (!activeGroups.includes(activeGroupPanel)) {
      setActiveGroupPanel(activeGroups[0]);
    }
  }, [splitByGroup, selectedIds, activeGroupPanel]);

  // Get available metrics from selected bioreactors ONLY
  const getActivePanelSettings = () => {
    if (splitByGroup && activeGroupPanel) {
      return groupPanelSettings[activeGroupPanel] || null;
    }
    return null;
  };

  const getActivePanelBioreactors = () => {
    if (splitByGroup && activeGroupPanel) {
      return groupPanelSettings[activeGroupPanel]?.selectedBioreactors || [];
    }
    return selectedIds.filter(id => !id.startsWith('GRP_'));
  };

  const getActivePanelDisplayIds = () => {
    if (splitByGroup && activeGroupPanel) {
      const panelSettings = groupPanelSettings[activeGroupPanel];
      if (!panelSettings) return [];
      const grpId = `GRP_${activeGroupPanel}`;
      return [
        ...(panelSettings.showGroupAverage ? [grpId] : []),
        ...panelSettings.selectedBioreactors
      ];
    }
    return selectedIds;
  };

  const availableMetrics = useMemo(() => {
    if (!rawData || !rawData.bioreactors) return [];
    const metrics = new Set();
    getActivePanelBioreactors().forEach(brId => {
      const brData = rawData.bioreactors[brId];
      if (brData && brData.series) {
        Object.keys(brData.series).forEach(metric => {
          if (!shouldExcludeSeries(metric)) {
            metrics.add(metric);
          }
        });
      }
    });
    return sortMetricsByPriority(Array.from(metrics));
  }, [rawData, selectedIds, splitByGroup, activeGroupPanel, groupPanelSettings]);

  // Get days for selected bioreactor
  const availableDaysForExclusion = useMemo(() => {
    if (!excludeSelectedBioreactor || !rawData?.bioreactors[excludeSelectedBioreactor]) return [];
    const brData = rawData.bioreactors[excludeSelectedBioreactor];
    if (!brData.timepoints) return [];
    return brData.timepoints
      .map(tp => tp.culture_day)
      .filter(day => day !== null && day !== undefined)
      .filter((day, idx, arr) => arr.indexOf(day) === idx)
      .sort((a, b) => a - b);
  }, [excludeSelectedBioreactor, rawData]);

  const dataTableMetrics = useMemo(() => {
    const metrics = [getCurrentLeftMetric()];
    if (getCurrentDualAxis()) {
      metrics.push(getCurrentRightMetric());
    }
    getCurrentExtraMetrics().forEach(item => metrics.push(item.metric));
    return Array.from(new Set(metrics));
  }, [leftMetric, rightMetric, enableDualAxis, extraMetrics, splitByGroup, activeGroupPanel, groupPanelSettings]);

  const dataTableRows = useMemo(() => {
    if (!parsedData.chartData || parsedData.chartData.length === 0) return [];
    const bioreactors = getActivePanelBioreactors();
    const rows = [];
    parsedData.chartData.forEach(entry => {
      bioreactors.forEach(brId => {
        const row = {
          bioreactor: brId,
          day: entry.day
        };
        dataTableMetrics.forEach(metric => {
          row[metric] = entry[`${brId}_${metric}`];
        });
        rows.push(row);
      });
    });
    return rows;
  }, [parsedData.chartData, splitByGroup, activeGroupPanel, groupPanelSettings, dataTableMetrics]);

  // Add/remove variables for exclusion
  const addExcludeVariable = () => {
    if (excludeSelectedVariables.length === 0 && availableMetrics.length > 0) {
      setExcludeSelectedVariables([availableMetrics[0]]);
    } else if (availableMetrics.length > excludeSelectedVariables.length) {
      const unused = availableMetrics.filter(m => !excludeSelectedVariables.includes(m));
      if (unused.length > 0) {
        setExcludeSelectedVariables([...excludeSelectedVariables, unused[0]]);
      }
    }
  };

  const removeExcludeVariable = (variable) => {
    setExcludeSelectedVariables(excludeSelectedVariables.filter(v => v !== variable));
  };

  const updateExcludeVariable = (oldVar, newVar) => {
    setExcludeSelectedVariables(excludeSelectedVariables.map(v => v === oldVar ? newVar : v));
  };

  // FIXED: excludeTableData - ALWAYS show excluded + selected variables (like BatchDashboard)
  const excludeTableData = useMemo(() => {
    if (!rawData || !rawData.bioreactors) return [];
    const data = [];

    // FIRST: Show ALL excluded points
    Object.keys(exclusions).forEach(key => {
      if (exclusions[key] === true) {
        const parts = key.split('_');
        if (parts.length >= 3) {
          const brId = parts[0];
          const day = parseInt(parts[1]);
          const variable = parts.slice(2).join('_');

          const brData = rawData.bioreactors[brId];
          if (brData && brData.series && brData.series[variable] && brData.timepoints) {
            const tpIdx = brData.timepoints.findIndex(tp => tp.culture_day === day);
            if (tpIdx !== -1) {
              const value = brData.series[variable][tpIdx];
              if (value !== null && value !== undefined) {
                data.push({
                  key,
                  bioreactor: brId,
                  day,
                  metric: variable,
                  value,
                  excluded: true
                });
              }
            }
          }
        }
      }
    });

    // SECOND: Add selected variables from selected bioreactor (if any)
    if (excludeSelectedBioreactor && excludeSelectedVariables.length > 0) {
      const brData = rawData.bioreactors[excludeSelectedBioreactor];
      if (brData && brData.series && brData.timepoints) {
        brData.timepoints.forEach((tp, idx) => {
          const day = tp.culture_day;
          if (day === null || day === undefined) return;

          excludeSelectedVariables.forEach(variable => {
            if (brData.series[variable]) {
              const value = brData.series[variable][idx];
              if (value !== null && value !== undefined) {
                const key = `${excludeSelectedBioreactor}_${day}_${variable}`;
                if (!data.find(d => d.key === key)) {
                  data.push({
                    key,
                    bioreactor: excludeSelectedBioreactor,
                    day,
                    metric: variable,
                    value,
                    excluded: exclusions && exclusions[key] === true
                  });
                }
              }
            }
          });
        });
      }
    }

    // Sort by bioreactor, then day
    data.sort((a, b) => {
      if (a.bioreactor !== b.bioreactor) return a.bioreactor.localeCompare(b.bioreactor);
      return a.day - b.day;
    });

    // Filter by selected day if specified
    if (excludeSelectedDay !== '') {
      return data.filter(d => d.day === Number(excludeSelectedDay));
    }

    return data;
  }, [rawData, exclusions, excludeSelectedBioreactor, excludeSelectedDay, excludeSelectedVariables]);

  const toggleExclusion = (key) => {
    if (!onExclusionChange) return;
    const newExclusions = { ...exclusions };
    if (newExclusions[key]) {
      delete newExclusions[key];
    } else {
      newExclusions[key] = true;
    }
    onExclusionChange(newExclusions);
  };


  if (!parsedData) return <div className="p-10 text-slate-400">Loading Dashboard...</div>;
  const { chartData: _rawChartData, metricsTree, groups, metadata } = parsedData; const chartData = chartDataWithCustomGroups; const hasData = chartData && chartData.length > 0; const formatDate = (date) => { if (!date) return '-'; try { if (isNaN(date.getTime())) return '-'; return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date); } catch { return '-'; } };
  const unifiedExtraMetrics = getCurrentExtraMetrics();
  const shouldCompressMain = showTiterChart || showDataTable || showExcludeTable;
  const panelOverlay = false;
  const unifiedMetricLabels = [
    formatMetricName(leftMetric),
    ...(enableDualAxis ? [formatMetricName(rightMetric)] : []),
    ...unifiedExtraMetrics.map(item => formatMetricName(item.metric))
  ];
  const hasExtraMetrics = unifiedExtraMetrics.length > 0;
  const splitGroupIds = selectedIds.filter(id => id.startsWith('GRP_')).slice(0, 4);
  const splitPanels = [...splitGroupIds, ...Array.from({ length: Math.max(0, 4 - splitGroupIds.length) }).map(() => null)];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"><ChevronRight className="w-5 h-5 rotate-180" /></button>
          <div><div className="flex items-center gap-4"><h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{metadata.runId}</h1>{hasData && <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-rose-200">Active</span>}</div><div className="flex items-center gap-6 text-xs text-slate-500 mt-1.5 font-medium"><span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />{formatDate(metadata.startDate)} - {formatDate(metadata.endDate)}</span><span className="flex items-center gap-1.5"><TestTube2 className="w-3.5 h-3.5 text-slate-400" />{metadata.product}</span><span className="flex items-center gap-1.5"><Beaker className="w-3.5 h-3.5 text-slate-400" />{metadata.bioreactorCount} Bioreactors</span></div></div>
        </div>
        <div className="flex items-center gap-3"><button onClick={() => setShowStages(!showStages)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-colors ${showStages ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Layers className="w-3.5 h-3.5" />{showStages ? 'Hide Stages' : 'Show Stages'}</button><button onClick={() => setShowOperations(!showOperations)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-colors ${showOperations ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} title="Show operation events from Batch Dashboard"><Calendar className="w-3.5 h-3.5" />{showOperations ? 'Hide Operations' : 'Operations'}{batchOperations.length > 0 && <span className="ml-1 bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full text-[9px]">{batchOperations.length}</span>}</button><button onClick={() => setShowPeak(!showPeak)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-colors ${showPeak ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><TrendingUp className="w-3.5 h-3.5" />{showPeak ? 'Hide Peak' : 'Show Peak'}</button><input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.json" /><button onClick={() => setIsPaletteOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-bold shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5"><Palette className="w-3.5 h-3.5" /> Style & Config</button>{addToReportDraft && <button onClick={captureChartConfig} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"><FileDown className="w-3.5 h-3.5" /> Add to Report</button>}</div>
        {yieldToast && (<div className="fixed top-6 right-6 z-[9999] animate-[slideIn_0.3s_ease-out]"><div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl shadow-emerald-200 flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="w-4 h-4" />{yieldToast}</div></div>)}
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-96 bg-white border-r border-slate-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="flex border-b border-slate-200">
             <button onClick={() => setActiveSidebarTab('controls')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeSidebarTab === 'controls' ? 'text-rose-600 bg-rose-50 border-b-2 border-rose-600' : 'text-slate-500 hover:bg-slate-50'}`}><Settings className="w-3.5 h-3.5" /> Controls</button>
             <button onClick={() => setActiveSidebarTab('library')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeSidebarTab === 'library' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}><Library className="w-3.5 h-3.5" /> Chart Library</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            {activeSidebarTab === 'controls' && (<><div className="p-5 border-b border-slate-100 bg-white"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Plot Axes</h3><div className="space-y-3"><div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><label className="block text-[10px] font-bold text-slate-600 mb-1.5">Primary Metric (Left)</label><div className="relative"><select className="w-full text-xs font-medium bg-white border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-rose-50 outline-none shadow-sm appearance-none" value={getCurrentLeftMetric()} onChange={e => handleLeftMetricChange(e.target.value)}>{Object.entries(metricsTree).length > 0 ? Object.entries(metricsTree).map(([cat, list]) => (<optgroup key={cat} label={cat}>{list.map(m => <option key={m} value={m}>{formatMetricName(m)}</option>)}</optgroup>)) : <option>No metrics available</option>}</select></div><div className="flex items-center justify-between py-1 mt-1"><label className="text-[10px] font-bold text-slate-500">Name</label><button onClick={() => setShowPrimaryLabels(!showPrimaryLabels)} className="text-slate-500 hover:text-rose-600">{showPrimaryLabels ? <ToggleRight className="w-5 h-5 text-rose-600" /> : <ToggleLeft className="w-5 h-5" />}</button></div></div><div className="flex items-center justify-between py-1"><label className="text-[10px] font-bold text-slate-500">Compare (Dual Axis)</label><button onClick={handleDualAxisToggle} className={`w-8 h-4 rounded-full transition-colors relative ${getCurrentDualAxis() ? 'bg-rose-500' : 'bg-slate-300'}`}><div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${getCurrentDualAxis() ? 'left-4.5' : 'left-0.5'}`} /></button></div>{getCurrentDualAxis() && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}><div className="bg-sky-50 border border-sky-200 rounded-lg p-3"><label className="block text-[10px] font-bold text-slate-600 mb-1.5">Secondary Metric (Right)</label><div className="relative mb-2"><select className="w-full text-xs font-medium bg-white border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-rose-50 outline-none shadow-sm appearance-none" value={getCurrentRightMetric()} onChange={e => handleRightMetricChange(e.target.value)}>{Object.entries(metricsTree).length > 0 ? Object.entries(metricsTree).map(([cat, list]) => (<optgroup key={cat} label={cat}>{list.map(m => <option key={m} value={m}>{formatMetricName(m)}</option>)}</optgroup>)) : <option>No metrics available</option>}</select></div><div className="flex items-center justify-between py-1 mb-1"><label className="text-[10px] font-bold text-slate-500">Name</label><button onClick={() => setShowSecondaryLabels(!showSecondaryLabels)} className="text-slate-500 hover:text-rose-600">{showSecondaryLabels ? <ToggleRight className="w-5 h-5 text-rose-600" /> : <ToggleLeft className="w-5 h-5" />}</button></div><div className="flex items-center justify-between py-1 px-1 bg-white rounded border border-slate-200"><label className="text-[10px] font-bold text-slate-600 cursor-pointer" onClick={() => setOnlyRefSecondary(!onlyRefSecondary)}>Show Ref Groups Only</label><button onClick={() => setOnlyRefSecondary(!onlyRefSecondary)} className="text-slate-500 hover:text-rose-600">{onlyRefSecondary ? <ToggleRight className="w-5 h-5 text-rose-600" /> : <ToggleLeft className="w-5 h-5" />}</button></div></div></motion.div>)}
<div className={hasExtraMetrics ? "border border-rose-200 bg-rose-50 rounded-lg p-3" : "border-t border-slate-100 pt-3"}>
  <div className="flex items-center justify-between mb-2">
    <label className="text-[10px] font-bold text-slate-500">Additional Metrics</label>
    <button onClick={addExtraMetric} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200" type="button">
      <Plus className="w-3 h-3" /> Add
    </button>
  </div>
  {getCurrentExtraMetrics().length === 0 ? (
    <div className="text-[10px] text-slate-400 italic">No extra metrics yet.</div>
  ) : (
    <div className={`space-y-2 border rounded-lg p-3 ${hasExtraMetrics ? 'bg-rose-100/60 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
      {getCurrentExtraMetrics().map((item, idx) => (
        <div key={`${item.metric}-${idx}`} className="flex items-start gap-2">
          <select
            className="w-44 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 focus:ring-2 focus:ring-rose-50 outline-none shadow-sm appearance-none"
            value={item.metric}
            onChange={e => updateExtraMetric(idx, 'metric', e.target.value)}
          >
            {Object.entries(metricsTree).length > 0 ? Object.entries(metricsTree).map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map(m => (
                  <option key={m} value={m} disabled={[getCurrentLeftMetric(), getCurrentRightMetric(), ...getCurrentExtraMetrics().filter((_, i) => i !== idx).map(it => it.metric)].includes(m)}>
                    {formatMetricName(m)}
                  </option>
                ))}
              </optgroup>
            )) : <option>No metrics available</option>}
          </select>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => updateExtraMetric(idx, 'useAxis', !item.useAxis)}
              className={`text-[9px] font-bold px-2 py-1 rounded border ${item.useAxis ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200'}`}
              type="button"
              title="Toggle extra Y-axis"
            >
              {item.useAxis ? 'Axis On' : 'Axis Off'}
            </button>
            <button
              onClick={() => updateExtraMetric(idx, 'showRefGroupsOnly', !item.showRefGroupsOnly)}
              className="flex items-center justify-between gap-1 px-2 py-1 rounded border border-slate-200 text-[9px] font-bold text-slate-500 hover:text-rose-600"
              type="button"
              title="Show ref groups only"
            >
              <span>Ref</span>
              {item.showRefGroupsOnly ? <ToggleRight className="w-3 h-3 text-rose-600" /> : <ToggleLeft className="w-3 h-3" />}
            </button>
          </div>
          <button onClick={() => removeExtraMetric(idx)} className="p-1 text-slate-400 hover:text-rose-600" type="button">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )}
</div>
</div></div><div className="p-4"><div className="mb-6"><div className="flex items-center justify-between mb-2"><h3 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest pl-1">Reference Groups</h3><div className="flex items-center gap-2"><button onClick={toggleSplitByGroup} className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold transition-all ${splitByGroup ? "bg-rose-500 text-white" : "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"}`} title="Split charts by groups"><Grid3x3 className="w-3 h-3" />{splitByGroup ? "Unified" : "Split"}</button>{splitByGroup && (<button onClick={() => setMatrixMode(!matrixMode)} className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold transition-all ${matrixMode ? "bg-indigo-500 text-white" : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50"}`} title="Matrix 2x2 mode"><Grid3x3 className="w-3 h-3" />Matrix</button>)}</div></div>
{/* Custom Reference Groups — the only groups shown here */}
{customRefGroups.some(g => g.bios.length > 0) ? (
  <div className="space-y-1">
    {customRefGroups.filter(g => g.bios.length > 0).map(grp => {
      const crefId = `CREF_${grp.id}`;
      const isSelected = isBioreactorSelected(crefId);
      const style = plotSettings[crefId] || {};
      const crefColors = ['#dc2626', '#16a34a', '#2563eb'];
      const grpIdx = customRefGroups.findIndex(g => g.id === grp.id);
      const dotColor = style.color || crefColors[grpIdx] || '#6b7280';
      return (
        <div key={crefId} onClick={() => toggleVisibility(crefId)}
          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all border ${isSelected ? 'bg-red-50 border-red-200' : 'bg-transparent border-transparent hover:bg-slate-50'}`}>
          {isSelected
            ? <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" />
            : <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0" />}
          <div className="flex flex-col flex-1 min-w-0">
            <span className={`text-xs font-bold truncate ${isSelected ? 'text-red-900' : 'text-slate-700'}`}>{grp.name}</span>
            <span className="text-[8px] text-slate-400 truncate">{grp.bios.join(' · ')}</span>
          </div>
          <div className="w-8 h-0.5 flex-shrink-0" style={{ backgroundColor: dotColor, borderStyle: 'dashed', borderWidth: '0 0 2.5px 0', borderColor: dotColor }} />
        </div>
      );
    })}
  </div>
) : (
  <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 p-3 text-center">
    <p className="text-[10px] text-rose-400 font-medium leading-relaxed">
      No reference groups yet.
    </p>
    <button onClick={() => setIsPaletteOpen(true)}
      className="mt-1.5 text-[9px] font-bold text-rose-600 underline underline-offset-2 hover:text-rose-800">
      Open Style Config to create groups →
    </button>
  </div>
)}
</div><div><div className="flex items-center justify-between mb-2 pl-1 pr-2 relative">{splitByGroup && activeGroupPanel && (<div className="mb-2 px-2 py-1.5 bg-rose-50 border border-rose-200 rounded-lg"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div><span className="text-[9px] font-bold text-rose-700 uppercase">Editing: {activeGroupPanel}</span></div></div>)}<h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bioreactors{splitByGroup && activeGroupPanel ? ` (${activeGroupPanel})` : ""}</h3><div className="flex items-center gap-1"><div className="relative"><button onClick={() => setIsGroupFilterOpen(!isGroupFilterOpen)} className={`flex items-center justify-center w-6 h-5 rounded border transition-colors ${isGroupFilterOpen ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:border-slate-300'}`} title="Quick Select Group"><Filter size={10} className="text-slate-500" /></button><AnimatePresence>{isGroupFilterOpen && (<motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"><div className="bg-slate-50 px-3 py-2 border-b border-slate-100"><span className="text-[10px] font-bold text-slate-500 uppercase">Select Only:</span></div><div className="max-h-48 overflow-y-auto">{customRefGroups.filter(g => g.bios.length > 0).length > 0 ? customRefGroups.filter(g => g.bios.length > 0).map(grp => (<button key={grp.id} onClick={() => { const newSel = [...grp.bios]; setSelectedIds(newSel); saveState('selectedIds', newSel); setIsGroupFilterOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors truncate block">{grp.name}</button>)) : Object.keys(groups).map(g => (<button key={g} onClick={() => selectBioreactorGroup(g)} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors truncate block">{g}</button>))}</div></motion.div>)}</AnimatePresence></div><button onClick={toggleAllBioreactors} className="text-[9px] font-bold text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-1.5 py-0.5 rounded transition-all bg-white h-5">ALL</button></div></div><div className="space-y-1">{getBioreactorsToDisplay().length > 0 ? getBioreactorsToDisplay().map(id => { const isSelected = isBioreactorSelected(id); const style = plotSettings[id] || {}; const condition = rawData.bioreactors[id].condition; return (<div key={id} onClick={() => toggleVisibility(id)} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all border ${isSelected ? 'bg-white border-slate-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}`}>{isSelected ? <CheckCircle2 className="w-4 h-4 text-blue-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200" />}<div className="flex flex-col flex-1"><span className={`text-xs font-mono font-medium ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>{id}</span><span className="text-[9px] text-slate-400">{condition}</span></div><div className="w-3 h-3 rounded-full" style={{ backgroundColor: style.color }} /></div>); }) : <div className="text-[10px] text-slate-400 italic px-2">No bioreactors loaded</div>}</div></div></div></>)}
            {activeSidebarTab === 'library' && (<div className="p-4 space-y-6"><div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-[10px] text-blue-700 leading-relaxed shadow-sm">Select a preset below to instantly configure the main chart with standard analytics views. Click All to see every group together, or choose a group button to filter instantly.</div>

              {/* Matrix Panel Selector */}
              {matrixMode && (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3 mb-4">
                  <p className="text-[9px] font-bold text-indigo-700 mb-2 uppercase tracking-wider">📐 SELECT TARGET PANEL:</p>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {['panel1', 'panel2', 'panel3', 'panel4'].map((panel, idx) => (
                      <button
                        key={panel}
                        onClick={() => setSelectedMatrixPanel(panel)}
                        className={`px-3 py-2 rounded text-[10px] font-bold transition-all ${
                          selectedMatrixPanel === panel
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        Panel {idx + 1}
                      </button>
                    ))}
                  </div>
                  {selectedMatrixPanel && (
                    <p className="text-[9px] text-indigo-600 font-bold mt-2 text-center">
                      ← Click preset below to apply to Panel {selectedMatrixPanel.replace('panel', '')}
                    </p>
                  )}
                </div>
              )}
              {CHART_LIBRARY.map((category) => (
                <div key={category.category}>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">
                    {category.category}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {category.items.map((item) => {
                      const resolvedMetric = resolvePresetMetric(item);
                      const hasData = !!resolvedMetric;
                      return (
                      <div
                        key={item.id}
                        className={`group relative border rounded-lg p-3 transition-all ${hasData ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md' : 'bg-slate-50/50 border-slate-100 opacity-60'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold group-hover:text-blue-700 flex items-center gap-1 ${hasData ? 'text-slate-700' : 'text-slate-400'}`}>
                              {item.label}
                              {hasData
                                ? <span className="text-[8px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 rounded">✓ data</span>
                                : <span className="text-[8px] font-mono bg-slate-100 text-slate-400 border border-slate-200 px-1 rounded">no data</span>}
                            </span>
                            {item.source && (
                              <span className="text-[9px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                                <Microscope className="w-2.5 h-2.5" /> Source: {item.source}
                              </span>
                            )}
                          </div>
                          {item.unit && (
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                              {item.unit}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mb-3 leading-tight">
                          {item.description}
                        </p>
                        {hasData ? (
                        <div className="flex flex-wrap gap-1">
                          {/* ALL button — always shown */}
                          <button
                            onClick={() => applyPresetAll(item)}
                            className="text-[9px] font-bold py-1.5 px-2 rounded transition-colors border bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                            title="Show all bioreactors"
                          >
                            All
                          </button>
                          {/* Custom Reference Group buttons — only shown when groups are configured */}
                          {customRefGroups.filter(g => g.bios.length > 0).length > 0 ? (
                            (() => {
                              const crefColors = [
                                { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', hover: 'hover:bg-red-100', dot: '#dc2626' },
                                { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', hover: 'hover:bg-teal-100', dot: '#0d9488' },
                                { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', hover: 'hover:bg-indigo-100', dot: '#4f46e5' },
                              ];
                              return customRefGroups.filter(g => g.bios.length > 0).map((grp, idx) => {
                                const cref = crefColors[idx] || crefColors[2];
                                const style = plotSettings[`CREF_${grp.id}`] || {};
                                const dotColor = style.color || cref.dot;
                                return (
                                  <button
                                    key={grp.id}
                                    onClick={() => applyPresetCustomRef(item, grp)}
                                    className={`text-[9px] font-bold py-1.5 px-2 rounded truncate transition-colors border flex items-center gap-1 ${cref.bg} ${cref.text} ${cref.border} ${cref.hover}`}
                                    title={`Show only: ${grp.bios.join(', ')}`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                                    {grp.name}
                                  </button>
                                );
                              });
                            })()
                          ) : (
                            <div className="text-[9px] text-slate-400 italic py-1 px-1 leading-relaxed">
                              Create Reference Groups in
                              <button onClick={() => setIsPaletteOpen(true)} className="ml-1 underline text-indigo-500 hover:text-indigo-700 font-bold">Style Config</button>
                            </div>
                          )}
                        </div>
                        ) : (
                          <div className="text-[9px] text-slate-400 italic py-1 bg-slate-50 rounded px-2">
                            Not available in current dataset
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </aside>
        <main className="flex-1 relative bg-white flex flex-col overflow-hidden">
          <div className={`${shouldCompressMain ? 'flex-[1.5]' : 'flex-[3]'} min-h-[320px] relative border-b border-slate-200 transition-all duration-500 ease-in-out`}>
              {splitByGroup && matrixMode ? (
                // Matrix 2x2 Mode
                <div className="absolute inset-0 p-4 pb-0">
                  <div className="grid gap-4 h-full grid-cols-2 grid-rows-2 auto-rows-fr">
                    {['panel1', 'panel2', 'panel3', 'panel4'].map(panelId => (
                      <div key={panelId} className="min-h-0 h-full">
                        {renderMatrixPanel(panelId)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : splitByGroup ? (
                /* SPLIT VIEW - Individual Charts per Group */
                <div className="absolute inset-0 p-4 pb-0">
                  <div className="grid gap-4 h-full grid-cols-2 grid-rows-2 auto-rows-fr">
                    {splitPanels.map((grpId, panelIdx) => {
                      if (!grpId) {
                        return (
                          <div key={`placeholder-${panelIdx}`} className="border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/70 flex items-center justify-center text-xs text-slate-400">
                            Empty Slot
                          </div>
                        );
                      }
                      const groupName = grpId.replace('GRP_', '');
                      const groupBioreactors = parsedData.groups[groupName] || [];
                      const panelSettings = groupPanelSettings[groupName] || {
                        leftMetric: leftMetric,
                        rightMetric: rightMetric,
                        enableDualAxis: enableDualAxis,
                        extraMetrics: extraMetrics,
                        selectedBioreactors: groupBioreactors,
                        showGroupAverage: true
                      };
                      const panelExtraMetrics = normalizeExtraMetrics(panelSettings.extraMetrics);
                      const isActive = activeGroupPanel === groupName;
                      const panelZoom = panelZoomDomains[groupName];
                      const panelRef = panelRefAreas[groupName] || {};
                      const panelPeakRange = getPeakRange(panelZoom);
                      const panelMetricLabels = [
                        formatMetricName(panelSettings.leftMetric),
                        ...(panelSettings.enableDualAxis ? [formatMetricName(panelSettings.rightMetric)] : []),
                        ...panelExtraMetrics.map(item => formatMetricName(item.metric))
                      ];

                      // Get IDs to display: group average + selected bioreactors
                      const displayIds = [
                        ...(panelSettings.showGroupAverage ? [grpId] : []),
                        ...panelSettings.selectedBioreactors
                      ];
                      const panelPeakPoints = showPeak ? getPeakPoints(displayIds, panelSettings.leftMetric, panelPeakRange) : [];

                      return (
                        <div
                          key={grpId}
                          onClick={() => setActiveGroupPanel(groupName)}
                          className={`relative border-2 rounded-lg overflow-hidden transition-all cursor-pointer ${
                            isActive ? 'border-rose-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={`absolute top-2 left-2 z-10 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm ${
                            isActive ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-700 border border-slate-200'
                          }`}>
                            {groupName}
                          </div>
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                            {panelZoom && (
                              <button onClick={(e) => { e.stopPropagation(); resetPanelZoom(groupName); }} className="flex items-center gap-1 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-600 hover:text-rose-600">
                                <ZoomOut className="w-3 h-3" /> Reset
                              </button>
                            )}
                          </div>
                          <div className="absolute top-10 left-2 z-10 text-[9px] text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-slate-100">
                            {panelMetricLabels.join(' vs ')}
                          </div>

                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={chartData}
                              margin={{ top: 6, right: 8, left: 6, bottom: 6 }}
                              onMouseDown={(e) => startPanelZoom(groupName, e)}
                              onMouseMove={(e) => movePanelZoom(groupName, e)}
                              onMouseUp={() => endPanelZoom(groupName)}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="day" type="number" domain={panelZoom ? [panelZoom.left, panelZoom.right] : ['dataMin', 'auto']} allowDataOverflow tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 8 }} tickFormatter={(val) => panelZoom ? `${(val - panelZoom.left).toFixed(0)}(${val})` : val} />
                              <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 8 }} width={30} />
                              {panelSettings.enableDualAxis && <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 8 }} width={30} />}
                              {panelExtraMetrics.map((item, idx) => item.useAxis && (
                                <YAxis
                                  key={`panel-extra-axis-${groupName}-${idx}`}
                                  yAxisId={`extra-${groupName}-${idx}`}
                                  orientation="right"
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fill: '#64748b', fontSize: 7 }}
                                  width={24}
                                  offset={(idx + 1) * 24}
                                />
                              ))}
                              <Tooltip content={<CustomTooltip zoomDomain={panelZoom || null} />} />
                              <Legend verticalAlign="top" height={20} iconType="line" wrapperStyle={{ fontSize: '9px', fontWeight: 600, paddingTop: '5px' }} />
                              {showStages && stages.map(stage => {
                                const range = getStageRange(stage, panelZoom);
                                if (!range) return null;
                                return (
                                  <ReferenceArea
                                    key={`${groupName}-${stage.id}`}
                                    yAxisId="left"
                                    x1={range.start}
                                    x2={range.end}
                                    fill={stage.color}
                                    fillOpacity={0.35}
                                  />
                                );
                              })}

                              {showOperations && batchOperations.map((op, opIdx) => {
                                if (panelZoom && (op.day < panelZoom.left || op.day > panelZoom.right)) return null;
                                return (
                                  <ReferenceLine key={`splitop-${groupName}-${op.id || opIdx}`} x={op.day} yAxisId="left" stroke="#0d9488" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: op.description, position: 'insideTopRight', fontSize: 8, fill: '#0d9488', angle: -90, offset: 5 }} />
                                );
                              })}

                              {displayIds.map((id, idx) => {
                                const settings = plotSettings[id] || { color: defaultColors[idx % defaultColors.length], shape: 'circle', strokeDash: '0', secondaryColor: defaultColors[idx % defaultColors.length], secondaryStrokeWidth: 1 };
                                const isGrp = id.startsWith('GRP_');
                                const displayName = isGrp ? `AVG: ${groupName}` : id;
                                const showSecondary = panelSettings.enableDualAxis && (!onlyRefSecondary || isGrp);
                                const fallbackAxisId = panelSettings.enableDualAxis ? 'right' : 'left';

                                return (
                                  <React.Fragment key={id}>
                                    <Line
                                      yAxisId="left"
                                      type="monotone"
                                      dataKey={`${id}_${panelSettings.leftMetric}`}
                                      name={displayName}
                                      stroke={settings.color}
                                      strokeWidth={isGrp ? 3.5 : 2.5}
                                      strokeDasharray={settings.strokeDash}
                                      dot={<CustomDot shapeType={settings.shape} isGroup={isGrp} />}
                                      activeDot={{ r: isGrp ? 6 : 4 }}
                                      connectNulls
                                      isAnimationActive={false}
                                      onClick={(data) => handlePointClick(id, data, groupName)}
                                      label={showPrimaryLabels ? <CustomizedLabel name={displayName} chartData={chartData} seriesIndex={idx} color={settings.color} dataKey={`${id}_${panelSettings.leftMetric}`} /> : null}
                                    />
                                    {showSecondary && (
                                      <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey={`${id}_${panelSettings.rightMetric}`}
                                        name={`${displayName} (${formatMetricName(panelSettings.rightMetric)})`}
                                        stroke={settings.secondaryColor || settings.color}
                                        strokeWidth={settings.secondaryStrokeWidth || 1}
                                        strokeOpacity={0.7}
                                        strokeDasharray={isGrp ? '2 2' : '0'}
                                        dot={false}
                                        connectNulls
                                        isAnimationActive={false}
                                        onClick={(data) => handlePointClick(id, data, groupName)}
                                        label={showSecondaryLabels ? <CustomizedLabel name={`${displayName} (${formatMetricName(panelSettings.rightMetric)})`} chartData={chartData} seriesIndex={idx + 100} color={settings.secondaryColor || settings.color} dataKey={`${id}_${panelSettings.rightMetric}`} /> : null}
                                      />
                                    )}
                                    {panelExtraMetrics.map((item, extraIdx) => (
                                      item.showRefGroupsOnly && !isGrp ? null : (
                                        <Line
                                          key={`${id}-${item.metric}-${extraIdx}`}
                                          yAxisId={item.useAxis ? `extra-${groupName}-${extraIdx}` : fallbackAxisId}
                                          type="monotone"
                                          dataKey={`${id}_${item.metric}`}
                                          name={`${displayName} (${formatMetricName(item.metric)})`}
                                          stroke={settings.secondaryColor || settings.color}
                                          strokeWidth={1}
                                          strokeOpacity={0.55}
                                          strokeDasharray="3 3"
                                          dot={false}
                                          connectNulls
                                          isAnimationActive={false}
                                        onClick={(data) => handlePointClick(id, data, groupName)}
                                          label={showSecondaryLabels ? <CustomizedLabel name={`${displayName} (${formatMetricName(item.metric)})`} chartData={chartData} seriesIndex={idx + 200 + extraIdx} color={settings.secondaryColor || settings.color} dataKey={`${id}_${item.metric}`} /> : null}
                                        />
                                      )
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                              {panelPeakPoints.length > 0 && (
                                <Scatter data={panelPeakPoints} yAxisId="left" dataKey="value" name="Peak" shape="circle">
                                  {panelPeakPoints.map((point, idx) => (
                                    <Cell key={`peak-${groupName}-${point.id}-${idx}`} fill={point.fill} />
                                  ))}
                                </Scatter>
                              )}
                              {panelRef?.left && panelRef?.right ? (
                                <ReferenceArea yAxisId="left" x1={panelRef.left} x2={panelRef.right} strokeOpacity={0.3} fill="#8884d8" fillOpacity={0.1} />
                              ) : null}
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* MAIN CHART - Unified View with All Bioreactors */
                <div className="absolute inset-0 p-4 pb-0">
                  <div className="absolute top-4 left-16 z-10 pointer-events-none">
                      <h2 className="text-sm font-bold text-slate-700 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-100 shadow-sm inline-flex items-center gap-2">
                        {unifiedMetricLabels.map((label, idx) => (
                          <React.Fragment key={`${label}-${idx}`}>
                            {idx > 0 && <span className="text-slate-400 text-xs">vs</span>}
                            <span className={idx === 0 ? 'text-slate-900' : 'text-slate-500'}>{label}</span>
                          </React.Fragment>
                        ))}
                      </h2>
                  </div>
                  {showPeak && <div className="absolute top-4 right-48 z-10 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Peak highlighted</div>}
                  {zoomDomain && <button onClick={resetZoom} className="absolute top-6 right-16 z-20 flex items-center gap-2 bg-white/90 border border-slate-300 shadow-lg px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 hover:text-rose-600 hover:border-rose-300 transition-all"><ZoomOut className="w-3.5 h-3.5" /> Reset Zoom</button>}
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 100, left: 10, bottom: 20 }} onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel)} onMouseMove={(e) => refAreaLeft && e && setRefAreaRight(e.activeLabel)} onMouseUp={handleZoom}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" domain={zoomDomain ? [zoomDomain.left, zoomDomain.right] : ['dataMin', 'auto']} type="number" allowDataOverflow tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 10 }} interval={0} tickFormatter={(val) => zoomDomain ? `${(val - zoomDomain.left).toFixed(0)} (${val})` : val} label={{ value: zoomDomain ? `Relative Day (Absolute Day)` : 'Culture Day', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: formatMetricName(leftMetric), angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 12 }} />
                      {enableDualAxis && <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: formatMetricName(rightMetric), angle: -90, position: 'insideRight', offset: 10, fill: '#94a3b8', fontSize: 12 }} />}
                      {unifiedExtraMetrics.map((item, idx) => item.useAxis && (
                        <YAxis
                          key={`extra-axis-${item.metric}-${idx}`}
                          yAxisId={`extra-${idx}`}
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          label={{ value: formatMetricName(item.metric), angle: -90, position: 'insideRight', offset: 10 + (idx + 1) * 24, fill: '#94a3b8', fontSize: 10 }}
                          offset={(idx + 1) * 36}
                        />
                      ))}
                      <Tooltip content={<CustomTooltip zoomDomain={zoomDomain} />} />
                      <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
                      {showStages && stages.map(stage => {
                        const range = getStageRange(stage, zoomDomain);
                        if (!range) return null;
                        return (
                          <ReferenceArea
                            key={stage.id}
                            yAxisId="left"
                            x1={range.start}
                            x2={range.end}
                            fill={stage.color}
                            fillOpacity={0.5}
                            label={{ value: stage.label, position: 'insideTop', fontSize: 10, fill: '#64748b' }}
                          />
                        );
                      })}
{showOperations && batchOperations.map((op, opIdx) => {
                        if (zoomDomain && (op.day < zoomDomain.left || op.day > zoomDomain.right)) return null;
                        return (
                          <ReferenceLine key={`mainop-${op.id || opIdx}`} x={op.day} yAxisId="left" stroke="#0d9488" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: op.description, position: 'insideTopRight', fontSize: 9, fill: '#0d9488', angle: -90, offset: 8 }} />
                        );
                      })}
{selectedIds.map((id, sIdx) => {
                        const settings = plotSettings[id] || { color: defaultColors[sIdx % defaultColors.length], shape: 'circle', strokeDash: '0', secondaryColor: defaultColors[sIdx % defaultColors.length], secondaryStrokeWidth: 1 };
                        const isGroup = id.startsWith('GRP_');
                        const isCRef  = id.startsWith('CREF_');
                        const isAnyGroup = isGroup || isCRef;
                        const displayName = isCRef
                          ? (() => { const grp = customRefGroups.find(g => `CREF_${g.id}` === id); return grp ? `REF: ${grp.name}` : id; })()
                          : getDisplayName(id, isGroup);
                        const showSecondary = enableDualAxis && (!onlyRefSecondary || isAnyGroup);
                        const fallbackAxisId = enableDualAxis ? 'right' : 'left';
                        return (
                          <React.Fragment key={id}>
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey={`${id}_${leftMetric}`}
                              name={displayName}
                              stroke={settings.color}
                              strokeWidth={isAnyGroup ? 3 : 1.5}
                              strokeDasharray={settings.strokeDash}
                              dot={false}
                              activeDot={{ r: isAnyGroup ? 6 : 4 }}
                              connectNulls
                              isAnimationActive={false}
                              label={showPrimaryLabels ? <CustomizedLabel name={displayName} chartData={chartData} seriesIndex={sIdx} color={settings.color} dataKey={`${id}_${leftMetric}`} /> : null}
                                      onClick={(data) => handlePointClick(id, data, '')}
                            />
                            {showSecondary && (
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey={`${id}_${rightMetric}`}
                                name={`${displayName} (${formatMetricName(rightMetric)})`}
                                stroke={settings.secondaryColor || settings.color}
                                strokeWidth={settings.secondaryStrokeWidth || 1}
                                strokeOpacity={0.7}
                                strokeDasharray={isAnyGroup ? '2 2' : '0'}
                                dot={false}
                                connectNulls
                                isAnimationActive={false}
                                onClick={(data) => handlePointClick(id, data)}
                                label={showSecondaryLabels ? <CustomizedLabel name={`${displayName} (${formatMetricName(rightMetric)})`} chartData={chartData} seriesIndex={sIdx + 100} color={settings.secondaryColor || settings.color} dataKey={`${id}_${rightMetric}`} /> : null}
                              />
                            )}
                            {unifiedExtraMetrics.map((item, extraIdx) => {
                              // Apply showRefGroupsOnly filter
                              if (item.showRefGroupsOnly && !isAnyGroup) return null;

                              return (
                                <Line
                                  key={`${id}-${item.metric}-${extraIdx}`}
                                  yAxisId={item.useAxis ? `extra-${extraIdx}` : fallbackAxisId}
                                  type="monotone"
                                  dataKey={`${id}_${item.metric}`}
                                  name={`${displayName} (${formatMetricName(item.metric)})`}
                                  stroke={settings.secondaryColor || settings.color}
                                  strokeWidth={1}
                                  strokeOpacity={0.55}
                                  strokeDasharray="3 3"
                                  dot={false}
                                  connectNulls
                                  isAnimationActive={false}
                                  onClick={(data) => handlePointClick(id, data)}
                                  label={showSecondaryLabels ? <CustomizedLabel name={`${displayName} (${formatMetricName(item.metric)})`} chartData={chartData} seriesIndex={sIdx + 200 + extraIdx} color={settings.secondaryColor || settings.color} dataKey={`${id}_${item.metric}`} /> : null}
                                />
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                      {showPeak && (() => {
                        const peakRange = getPeakRange(zoomDomain);
                        const peakPoints = getPeakPoints(selectedIds, leftMetric, peakRange);
                        if (peakPoints.length === 0) return null;
                        return (
                          <Scatter data={peakPoints} yAxisId="left" dataKey="value" name="Peak" shape="circle">
                            {peakPoints.map((point, idx) => (
                              <Cell key={`peak-main-${point.id}-${idx}`} fill={point.fill} />
                            ))}
                          </Scatter>
                        );
                      })()}
                      {refAreaLeft && refAreaRight ? <ReferenceArea yAxisId="left" x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#8884d8" fillOpacity={0.1} /> : null}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )
          }
          {selectedPoint && (
            <div className="bg-white border-t border-slate-200 px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Selected Point Details</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedPoint.seriesId} · Day {selectedPoint.day}
                    {selectedPoint.groupName && <span className="ml-2 text-slate-400">({selectedPoint.groupName})</span>}
                    {selectedPoint.sampleId && <span className="ml-2 text-slate-400">SampleID: {selectedPoint.sampleId}</span>}
                  </p>
                </div>
                <button onClick={() => setSelectedPoint(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-48 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-slate-500">Metric</th>
                      <th className="px-3 py-2 text-slate-500">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPoint.metrics.map(item => (
                      <tr key={item.metric}>
                        <td className="px-3 py-2 text-slate-600">{formatMetricName(item.metric)}</td>
                        <td className="px-3 py-2 font-mono text-slate-800">{item.value !== null && item.value !== undefined ? Number(item.value).toFixed(3) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 right-6 z-20 flex flex-col gap-2 items-end">
              {!showTiterChart && !showDataTable && !showExcludeTable && (<><button onClick={() => setShowExcludeTable(true)} className="flex items-center gap-2 bg-white border border-slate-200 shadow-lg px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-rose-600 transition-all"><Trash2 className="w-3.5 h-3.5" /> Exclude Data</button><button onClick={() => setShowDataTable(true)} className="flex items-center gap-2 bg-white border border-slate-200 shadow-lg px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-rose-600 transition-all"><TableIcon className="w-3.5 h-3.5" /> Show Data Table</button><button onClick={() => setShowTiterChart(true)} className="flex items-center gap-2 bg-white border border-slate-200 shadow-lg px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-rose-600 transition-all"><Maximize2 className="w-3.5 h-3.5" /> Show Titer Chart</button></>)}
              {(showTiterChart && !showDataTable) && <button onClick={() => setShowDataTable(true)} className="flex items-center gap-2 bg-white border border-slate-200 shadow-lg px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-rose-600 transition-all"><TableIcon className="w-3.5 h-3.5" /> Show Data Table</button>}
              {(showDataTable && !showTiterChart) && <button onClick={() => setShowTiterChart(true)} className="flex items-center gap-2 bg-white border border-slate-200 shadow-lg px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-rose-600 transition-all"><Maximize2 className="w-3.5 h-3.5" /> Show Titer Chart</button>}
          </div>
        </div>
        <div className={`flex flex-col ${panelOverlay ? '' : 'relative'} ${panelOverlay ? '' : 'bg-white'}`}>
          <AnimatePresence>
            {showTiterChart && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', flex: panelOverlay ? undefined : 1, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`bg-slate-50 px-6 py-4 flex flex-col overflow-hidden border-t border-slate-200 ${
                  panelOverlay ? 'absolute inset-x-0 bottom-0 z-20 max-h-[45%]' : 'relative'
                }`}
              >
                  <div className="flex justify-between items-end mb-4 shrink-0 border-b border-slate-200 pb-3">
                    <div className="flex flex-col gap-2"><h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2"><FlaskConical className="w-3 h-3 text-rose-500" /> Titer Analysis Control</h3><p className="text-[9px] text-slate-400 italic">Prediction source: Linear extrapolation (last 5 data points, OLS fit to Day {titerConfig.day})</p><div className="flex items-center gap-3"><div className="flex flex-col"><label className="text-[9px] font-bold text-slate-400 mb-0.5">Variable</label><select className="text-xs bg-white border border-slate-300 rounded px-2 py-1 shadow-sm focus:ring-1 focus:ring-rose-500 outline-none w-40" value={titerConfig.metric} onChange={(e) => setTiterConfig(p => ({ ...p, metric: e.target.value}))}>{Object.entries(metricsTree).length > 0 ? Object.entries(metricsTree).map(([cat, list]) => (<optgroup key={cat} label={cat}>{list.map(m => <option key={m} value={m}>{formatMetricName(m)}</option>)}</optgroup>)) : <option>No metrics available</option>}</select></div><div className="flex flex-col w-48"><label className="text-[9px] font-bold text-slate-400 mb-0.5 flex justify-between"><span>Cutoff Day</span><span className="text-rose-600">Day {titerConfig.day}</span></label><input type="range" min="0" max={metadata.duration} step="1" value={titerConfig.day || metadata.duration} onChange={(e) => setTiterConfig(p => ({ ...p, day: Number(e.target.value)}))} className="h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600" /></div><button onClick={() => setTiterConfig(p => ({ ...p, useZoom: !p.useZoom}))} className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-all text-[10px] font-bold mt-3 ${titerConfig.useZoom ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-slate-500 border-slate-200'}`}><RefreshCw className={`w-3 h-3 ${titerConfig.useZoom ? 'animate-spin-slow' : ''}`} /> Sync with Plot</button></div></div>
                    <div className="flex items-center gap-3"><div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5"><button onClick={() => setTiterSort('id')} className={`p-1 rounded ${titerSort === 'id' ? 'bg-slate-100' : 'text-slate-400'}`}><AlignLeft className="w-3.5 h-3.5" /></button><button onClick={() => setTiterSort('val_desc')} className={`p-1 rounded ${titerSort === 'val_desc' ? 'bg-slate-100' : 'text-slate-400'}`}><ArrowUpDown className="w-3.5 h-3.5" /></button></div><button onClick={() => setShowTiterChart(false)} className="p-1 text-slate-400 hover:text-slate-600"><Minimize2 className="w-4 h-4" /></button></div>
                  </div>
                  <div className="flex-1 min-h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={calculatedTiterData} margin={{ top: 15, right: 30, left: 0, bottom: 5 }} barSize={30}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="id" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} label={{ value: formatMetricName(titerConfig.metric), angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontSize: '11px' }} labelFormatter={(label) => `${label} (Day ${titerConfig.day})`} />
                            <Bar dataKey="value" name={`Max ${formatMetricName(titerConfig.metric)} up to Day ${titerConfig.day}`} radius={[4, 4, 0, 0]}>{calculatedTiterData.map((entry, index) => (<Cell key={`cell-${index}`} fill={plotSettings[entry.id]?.color || '#cbd5e1'} />))}<LabelList dataKey="value" position="top" formatter={(val) => val.toFixed(1)} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 'bold' }} /></Bar>
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showDataTable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', flex: panelOverlay ? undefined : 1, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`bg-white border-t border-slate-200 flex flex-col overflow-hidden shadow-inner ${
                  panelOverlay ? 'absolute inset-x-0 bottom-0 z-20 max-h-[45%]' : 'relative'
                }`}
              >
                  <div className="flex justify-between items-center px-6 py-2 bg-slate-50 border-b border-slate-100 shrink-0"><h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2"><TableIcon className="w-3 h-3 text-slate-500" /> Selected Data Points{splitByGroup && activeGroupPanel ? ` (${activeGroupPanel})` : ''}</h3><div className="flex items-center gap-3"><button onClick={exportTable} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 transition-colors shadow-sm"><Download className="w-3 h-3" /> Export CSV</button><button onClick={() => setShowDataTable(false)} className="p-1 text-slate-400 hover:text-slate-600"><Minimize2 className="w-4 h-4" /></button></div></div>
                  <div className="flex-1 overflow-auto p-0"><table className="w-full text-xs text-left border-collapse"><thead className="bg-slate-50 sticky top-0 z-10 text-slate-500 font-semibold shadow-sm"><tr><th className="p-3 border-b border-slate-200 w-28">Bioreactor</th><th className="p-3 border-b border-slate-200 w-20">Day</th>{dataTableMetrics.map(metric => (<th key={metric} className="p-3 border-b border-slate-200 whitespace-nowrap"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{formatMetricName(metric)}</span></th>))}</tr></thead><tbody className="divide-y divide-slate-100">{dataTableRows.map((row) => (<tr key={`${row.bioreactor}_${row.day}`} className="hover:bg-slate-50"><td className="p-3 font-mono text-slate-700 font-bold border-r border-slate-100 bg-slate-50/30">{row.bioreactor}</td><td className="p-3 font-mono text-slate-600 font-bold border-r border-slate-100 bg-slate-50/30">{row.day}</td>{dataTableMetrics.map(metric => (<td key={metric} className="p-3 font-mono text-slate-700">{row[metric] !== undefined && row[metric] !== null ? Number(row[metric]).toFixed(2) : '-'}</td>))}</tr>))}</tbody></table></div>
              </motion.div>
            )}

          </AnimatePresence>
          <AnimatePresence>
            {showExcludeTable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', flex: panelOverlay ? undefined : 1, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`bg-gradient-to-br from-rose-50 via-white to-rose-50/30 border-t border-rose-200 flex flex-col overflow-hidden shadow-inner ${
                  panelOverlay ? 'absolute inset-x-0 bottom-0 z-20 max-h-[45%]' : 'relative'
                }`}
              >
                  <div className="flex justify-between items-center px-6 py-3 bg-white border-b border-slate-200 shrink-0">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-500" /> Exclude Data Management
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {excludeTableData.filter(d => d.excluded).length} excluded of {excludeTableData.length} points
                      </span>
                      <button onClick={() => setShowExcludeTable(false)} className="p-1 text-slate-400 hover:text-slate-600">
                        <Minimize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Controls */}
                      <div className="space-y-4">
                        {/* 1. Select Bioreactor */}
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-2 block">1. Select Bioreactor (from selected)</label>
                          <select
                            value={excludeSelectedBioreactor}
                            onChange={(e) => {
                              setExcludeSelectedBioreactor(e.target.value);
                              setExcludeSelectedDay('');
                              setExcludeSelectedVariables([]);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                          >
                            <option value="">-- Select Bioreactor --</option>
                            {getActivePanelBioreactors().map(brId => (
                              <option key={brId} value={brId}>{brId}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Filter by Day */}
                        {excludeSelectedBioreactor && (
                          <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">2. Filter by Day (Optional)</label>
                            <select
                              value={excludeSelectedDay}
                              onChange={(e) => setExcludeSelectedDay(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                            >
                              <option value="">All Days</option>
                              {availableDaysForExclusion.map(day => (
                                <option key={day} value={day}>Day {day}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* 3. Select Variables */}
                        {excludeSelectedBioreactor && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-bold text-slate-500">3. Select Variables (from analysis)</label>
                              <button
                                onClick={addExcludeVariable}
                                className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600 transition-colors"
                                disabled={excludeSelectedVariables.length >= availableMetrics.length}
                              >
                                <span className="text-sm">+</span> Add
                              </button>
                            </div>

                            {excludeSelectedVariables.length === 0 ? (
                              <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded border border-slate-200">
                                Click "+ Add" to start
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {excludeSelectedVariables.map((variable, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <select
                                      value={variable}
                                      onChange={(e) => updateExcludeVariable(variable, e.target.value)}
                                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-rose-500 outline-none font-mono"
                                    >
                                      {availableMetrics.map(m => (
                                        <option key={m} value={m} disabled={excludeSelectedVariables.includes(m) && m !== variable}>
                                          {formatMetricName(m)}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => removeExcludeVariable(variable)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Data Display */}
                      <div className="lg:col-span-2">
                        <div className="text-xs text-slate-500 mb-2 flex items-center justify-between">
                          <span>Showing {excludeTableData.length} data points</span>
                          <span className="text-rose-600 font-bold">
                            {excludeTableData.filter(d => d.excluded).length} excluded
                          </span>
                        </div>

                        {excludeTableData.length === 0 ? (
                          <div className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded border border-slate-200">
                            No data to display. Select a bioreactor and add variables to manage exclusions.
                          </div>
                        ) : (
                          <div className="overflow-auto border border-slate-200 rounded-lg" style={{ maxHeight: '400px' }}>
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                  <th className="px-3 py-2 text-left font-bold text-slate-700">Bioreactor</th>
                                  <th className="px-3 py-2 text-left font-bold text-slate-700">Day</th>
                                  <th className="px-3 py-2 text-left font-bold text-slate-700">Variable</th>
                                  <th className="px-3 py-2 text-right font-bold text-slate-700">Value</th>
                                  <th className="px-3 py-2 text-center font-bold text-slate-700">Status</th>
                                  <th className="px-3 py-2 text-center font-bold text-slate-700">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {excludeTableData.map(point => (
                                  <tr
                                    key={point.key}
                                    className={`hover:bg-slate-50 transition-colors ${point.excluded ? 'bg-red-50' : ''}`}
                                  >
                                    <td className={`px-3 py-2 font-mono font-bold ${point.excluded ? 'text-red-600 line-through' : 'text-slate-800'}`}>{point.bioreactor}</td>
                                    <td className={`px-3 py-2 font-mono ${point.excluded ? 'text-red-600 line-through font-bold' : ''}`}>{point.day}</td>
                                    <td className={`px-3 py-2 ${point.excluded ? 'text-red-600 line-through font-bold' : 'text-slate-600'}`}>{formatMetricName(point.metric)}</td>
                                    <td className={`px-3 py-2 text-right font-mono ${point.excluded ? 'text-red-600 line-through font-bold' : 'font-bold'}`}>{point.value.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-center">
                                      {point.excluded ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                                          ✕ Excluded
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                                          ✓ Active
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        onClick={() => toggleExclusion(point.key)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                          point.excluded
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                        }`}
                                      >
                                        {point.excluded ? 'Include' : 'Exclude'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </main>
      </div>
      <AnimatePresence>
        {isPaletteOpen && (<StyleEditor isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} groups={parsedData.groups} bioreactors={rawData?.bioreactors} settings={plotSettings} updateSettings={updateSetting} updateConditionGroup={updateConditionGroup} stages={stages} updateStage={updateStage} customRefGroups={customRefGroups} updateCustomRefGroups={updateCustomRefGroups} />)}
      </AnimatePresence>
    </div>
  );
};

// --- FEATURE 2: BATCH DASHBOARD (All Bioreactors Table + Exclusion Below) ---
// ─────────────────────────────────────────────────────────────────────────────
// RAW DATA PANEL  — tabbed view of all 4 instrument raw data sets in the Batch Record
// ─────────────────────────────────────────────────────────────────────────────
const INSTRUMENT_TAB_CONFIG = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    bg: 'bg-slate-600',
    source: null,
    description: 'Vessel statistics across all instruments',
  },
  {
    id: 'roche_cedex',
    label: 'Roche CEDEX',
    icon: Beaker,
    bg: 'bg-purple-600',
    source: 'roche_cedex',
    description: 'CEDEX BIO HT: Glucose, Glutamine, Ammonium, LDH, IgG',
    seriesPatterns: ['gluc_g_per_l', 'gln_g_per_l', 'nh3_mg_per_l', 'ldh_u_per_l', 'igg_mg_per_l', 'asn_mg_per_l', 'asp_mg_per_l', 'pyr_mg_per_l'],
  },
  {
    id: 'novaflex',
    label: 'NovaFlex',
    icon: TestTube2,
    bg: 'bg-teal-600',
    source: 'novaflex',
    description: 'BioProfile Flex²: VCD, Viability, Metabolites, Ions, Gases',
    seriesPatterns: ['viable_cells_x106', 'total_cells_x106', 'cell_viability', 'novaflex_gluc', 'novaflex_lac', 'novaflex_gln', 'novaflex_nh4', 'ph_offline', 'pco2_offline', 'osm_mosm', 'novaflex_na', 'novaflex_k', 'novaflex_ca', 'bicarb_mmol', 'avg_diam', 'o2_saturation'],
  },
  {
    id: 'mfcs2',
    label: 'MFCS2',
    icon: Gauge,
    bg: 'bg-amber-600',
    source: 'mfcs2',
    description: 'ambr250 online: pH, DO, Temp, Agitation, Volume, Gas Flows',
    seriesPatterns: ['mfcs_ph', 'mfcs_do', 'mfcs_temp', 'mfcs_agit', 'mfcs_volume', 'mfcs_air', 'mfcs_o2', 'mfcs_n2', 'mfcs_co2', 'mfcs_base', 'mfcs_acid', 'mfcs_gluc_online'],
  },
  {
    id: 'aster',
    label: 'Aster HPLC',
    icon: Microscope,
    bg: 'bg-blue-600',
    source: 'aster',
    description: 'Protein A HPLC: mAb Titer',
    seriesPatterns: ['protein_a_hplc'],
  },
];

const RawDataPanel = ({ initialData }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isOpen, setIsOpen] = useState(true);

  // Build vessel statistics for overview
  const vesselStats = useMemo(() => {
    if (!initialData?.bioreactors) return [];
    return Object.entries(initialData.bioreactors).map(([vessel, br]) => {
      const seriesKeys = Object.keys(br.series || {});
      const hasRoche = seriesKeys.some(k => k.includes('gluc_g_per_l') || k.includes('igg_mg_per_l') || k.includes('nh3_mg_per_l'));
      const hasNova  = seriesKeys.some(k => k.includes('viable_cells_x106') || k.includes('novaflex_') || k.includes('cell_viability'));
      const hasMFCS  = seriesKeys.some(k => k.includes('mfcs_'));
      const hasAster = seriesKeys.some(k => k.includes('protein_a_hplc'));
      const vcdKey = seriesKeys.find(k => k.includes('viable_cells_x106'));
      const titrKey = seriesKeys.find(k => k.includes('protein_a_hplc') || k.includes('igg_mg_per_l'));
      const viabKey = seriesKeys.find(k => k.includes('cell_viability'));
      const getDayValue = (key, fn = 'last') => {
        if (!key || !br.series[key]) return null;
        const vals = br.series[key].filter(v => v !== null && v !== undefined);
        if (vals.length === 0) return null;
        return fn === 'max' ? Math.max(...vals) : vals[vals.length - 1];
      };
      return {
        vessel,
        days: br.timepoints?.length || 0,
        seriesCount: seriesKeys.length,
        hasRoche, hasNova, hasMFCS, hasAster,
        maxVCD: vcdKey ? getDayValue(vcdKey, 'max') : null,
        finalTiter: titrKey ? getDayValue(titrKey, 'last') : null,
        finalViab: viabKey ? getDayValue(viabKey, 'last') : null,
        sources: [hasRoche && 'CEDEX', hasNova && 'NovaFlex', hasMFCS && 'MFCS2', hasAster && 'Aster'].filter(Boolean),
      };
    }).sort((a, b) => a.vessel.localeCompare(b.vessel));
  }, [initialData]);

  // Build table data for a specific instrument tab
  const getInstrumentTableData = useCallback((tabConfig) => {
    if (!initialData?.bioreactors || !tabConfig.seriesPatterns) return { columns: [], rows: [] };
    // Find matching series keys across all vessels
    const matchingKeys = new Set();
    Object.values(initialData.bioreactors).forEach(br => {
      Object.keys(br.series || {}).forEach(sk => {
        if (tabConfig.seriesPatterns.some(p => sk.includes(p))) matchingKeys.add(sk);
      });
    });
    const columns = ['Vessel', 'Day', 'Date', ...Array.from(matchingKeys).sort()];
    const rows = [];
    Object.entries(initialData.bioreactors).forEach(([vessel, br]) => {
      if (br.series && Object.keys(br.series).some(sk => tabConfig.seriesPatterns.some(p => sk.includes(p)))) {
        (br.timepoints || []).forEach((tp, idx) => {
          const row = { Vessel: vessel, Day: tp.culture_day, Date: tp.date || '' };
          matchingKeys.forEach(sk => {
            row[sk] = br.series[sk]?.[idx] ?? null;
          });
          rows.push(row);
        });
      }
    });
    rows.sort((a, b) => a.Vessel.localeCompare(b.Vessel) || (a.Day - b.Day));
    return { columns, rows };
  }, [initialData]);

  const downloadCSV = (columns, rows, fileName) => {
    const csv = [
      columns.join(','),
      ...rows.map(r => columns.map(c => r[c] === null || r[c] === undefined ? '' : r[c]).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const currentTab = INSTRUMENT_TAB_CONFIG.find(t => t.id === activeTab);
  const tableData = useMemo(() => currentTab?.seriesPatterns ? getInstrumentTableData(currentTab) : null, [currentTab, getInstrumentTableData]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-slate-300" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Raw Instrument Data</h2>
              {initialData?.run?.run_id && (
                <span className="text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  {initialData.run.run_id}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">Browse parsed data by instrument · Download CSVs</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(o => !o)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
          {isOpen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Instrument Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
            {INSTRUMENT_TAB_CONFIG.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? `border-current text-white ${tab.bg} border-b-0 rounded-t-lg -mb-px shadow-sm`
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Panel Content */}
          <div className="p-4">
            {activeTab === 'overview' && (
              <div>
                <p className="text-xs text-slate-500 mb-4">{INSTRUMENT_TAB_CONFIG[0].description}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        {['Vessel','Culture Days','Variables','Max VCD (10⁶/mL)','Final Titer (mg/mL)','Final Viability (%)','CEDEX','NovaFlex','MFCS2','Aster','Data Sources'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-bold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vesselStats.map((row, i) => (
                        <tr key={row.vessel} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2 font-mono font-bold text-slate-800">{row.vessel}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{row.days}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{row.seriesCount}</td>
                          <td className="px-3 py-2 text-center font-mono">{row.maxVCD !== null ? row.maxVCD.toFixed(2) : '—'}</td>
                          <td className="px-3 py-2 text-center font-mono">{row.finalTiter !== null ? row.finalTiter.toFixed(1) : '—'}</td>
                          <td className="px-3 py-2 text-center font-mono">{row.finalViab !== null ? row.finalViab.toFixed(1) : '—'}</td>
                          {[row.hasRoche, row.hasNova, row.hasMFCS, row.hasAster].map((has, j) => (
                            <td key={j} className="px-3 py-2 text-center">
                              <span className={`inline-block w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${has ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                {has ? '✓' : '—'}
                              </span>
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.sources.map(s => (
                                <span key={s} className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">{s}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentTab?.seriesPatterns && tableData && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500">{currentTab.description} · {tableData.rows.length} rows × {tableData.columns.length} columns</p>
                  <button
                    onClick={() => downloadCSV(tableData.columns, tableData.rows, `${initialData?.run?.run_id || 'data'}_${currentTab.id}.csv`)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors ${currentTab.bg} hover:opacity-90`}
                  >
                    <Download className="w-3 h-3" />
                    Download CSV
                  </button>
                </div>
                {tableData.rows.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    <Database className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No {currentTab.label} data in this dataset</p>
                    <p className="text-xs mt-1">Upload a {currentTab.label} CSV file to populate this tab.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-[10px] border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className={`${currentTab.bg} text-white`}>
                          {tableData.columns.map(col => (
                            <th key={col} className="px-2.5 py-2 text-left font-bold whitespace-nowrap border-r border-white/10">
                              {formatMetricName(col) || col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row, i) => (
                          <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-yellow-50 transition-colors`}>
                            {tableData.columns.map(col => (
                              <td key={col} className="px-2.5 py-1.5 border-b border-slate-100 whitespace-nowrap font-mono text-slate-700">
                                {row[col] === null || row[col] === undefined ? <span className="text-slate-300">—</span> :
                                  typeof row[col] === 'number' ? row[col].toFixed(3) : row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const BatchDashboard = ({
  onBack,
  initialData,
  exclusions,
  onExclusionChange,
  dataEdits,
  onDataEditsChange,
  onDataChange,
  batchOperations = [],
  onBatchOperationsChange
}) => {
  const [showExcludePanel, setShowExcludePanel] = useState(false);
  const [sortBy, setSortBy] = useState('bioreactor'); // 'bioreactor' or 'day'
  const [filterProjectName, setFilterProjectName] = useState('');
  const [filterBioreactor, setFilterBioreactor] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [newDatasetColumnName, setNewDatasetColumnName] = useState('');
  const [newDatasetColumnFormula, setNewDatasetColumnFormula] = useState('');
  const [newDatasetColumnGroup, setNewDatasetColumnGroup] = useState('all');
  const initialCustomColumns = useMemo(() => {
    if (!Array.isArray(initialData?.custom_columns)) return [];
    return initialData.custom_columns
      .filter(column => column && typeof column.key === 'string')
      .map(column => ({
        key: column.key,
        name: typeof column.name === 'string' ? column.name : formatMetricName(column.key),
        formula: typeof column.formula === 'string' ? column.formula : '',
        group: typeof column.group === 'string' ? column.group : null
      }));
  }, [initialData]);
  const [customDatasetColumns, setCustomDatasetColumns] = useState(initialCustomColumns);

  // Exclusion panel state
  const [selectedExclusionBioreactor, setSelectedExclusionBioreactor] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedVariables, setSelectedVariables] = useState([]);

  const parsedData = useMemo(() => parseBioreactorChartData(initialData, exclusions), [initialData, exclusions]);

  if (!parsedData) return null;

  const { bioreactors, allMetrics: rawMetrics, metadata } = parsedData;
  const datasetColumnGroups = useMemo(() => {
    if (!initialData?.bioreactors) return [];
    const groups = new Set();
    Object.values(initialData.bioreactors).forEach(br => {
      if (br?.condition) groups.add(br.condition);
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [initialData]);
  const sourceColumnAliases = useMemo(() => {
    const columnMap = initialData?.schema?.fermdata?.column_key_map || {};
    const aliasMap = {};
    Object.entries(columnMap).forEach(([sourceName, metricKey]) => {
      if (!metricKey) return;
      if (!aliasMap[metricKey]) aliasMap[metricKey] = new Set();
      aliasMap[metricKey].add(sourceName);
    });
    return Object.fromEntries(
      Object.entries(aliasMap).map(([metricKey, aliasSet]) => [metricKey, Array.from(aliasSet)])
    );
  }, [initialData]);
  const editsByKey = dataEdits || {};
  const editList = useMemo(() => {
    return Object.values(editsByKey).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [editsByKey]);
  const orderedMetrics = useMemo(() => {
    const customKeys = customDatasetColumns.map(column => column.key);
    const baseMetrics = rawMetrics.filter(metric => !customKeys.includes(metric));
    const appended = customKeys.filter(metric => rawMetrics.includes(metric));
    return [...baseMetrics, ...appended];
  }, [rawMetrics, customDatasetColumns]);
  const formulaOptions = useMemo(() => {
    return orderedMetrics
      .map(metric => ({
        metric,
        label: formatMetricName(metric)
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [orderedMetrics]);
  const [activeFormulaKey, setActiveFormulaKey] = useState(null);
  const [formulaMatches, setFormulaMatches] = useState([]);

  useEffect(() => {
    setCustomDatasetColumns(initialCustomColumns);
  }, [initialCustomColumns]);

  // Get all days across all bioreactors
  const allDays = useMemo(() => {
    const daysSet = new Set();
    Object.values(bioreactors).forEach(br => {
      br.cultureDays.forEach(day => daysSet.add(day));
    });
    return Array.from(daysSet).sort((a, b) => a - b);
  }, [bioreactors]);

  const projectNameOptions = useMemo(() => {
    const names = new Set();
    Object.values(initialData?.bioreactors || {}).forEach(br => {
      if (br?.project_name) names.add(br.project_name);
      if (br?.project) names.add(br.project);
    });
    if (initialData?.run?.project_name) names.add(initialData.run.project_name);
    if (initialData?.project_name) names.add(initialData.project_name);
    if (initialData?.run?.run_id) names.add(initialData.run.run_id);
    if (initialData?.run_id) names.add(initialData.run_id);
    if (names.size === 0) names.add('Unknown Project');
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [initialData]);

  // Create table data: ALL bioreactors, all days
  const tableData = useMemo(() => {
    const data = [];
    Object.keys(bioreactors).forEach(brId => {
      const br = bioreactors[brId];
      (br.timepoints || []).forEach((tp, index) => {
        const day = tp?.culture_day;
        if (day === null || day === undefined) return;
        const projectName = br.project_name
          || br.project
          || initialData?.run?.project_name
          || initialData?.project_name
          || initialData?.run?.run_id
          || initialData?.run_id
          || 'Unknown Project';
        const row = {
          projectName,
          bioreactor: brId,
          condition: br.condition,
          day
        };
        Object.keys(br.allSeries).forEach(metric => {
          row[metric] = br.allSeries[metric][index];
        });
        data.push(row);
      });
    });

    // Apply filters
    let filtered = data;
    if (filterProjectName) {
      filtered = filtered.filter(row => row.projectName === filterProjectName);
    }
    if (filterBioreactor) {
      filtered = filtered.filter(row => row.bioreactor === filterBioreactor);
    }
    if (filterDay !== '') {
      filtered = filtered.filter(row => row.day === Number(filterDay));
    }

    // Sort
    if (sortBy === 'bioreactor') {
      filtered.sort((a, b) => {
        if (a.bioreactor !== b.bioreactor) return a.bioreactor.localeCompare(b.bioreactor);
        return a.day - b.day;
      });
    } else {
      filtered.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.bioreactor.localeCompare(b.bioreactor);
      });
    }

    return filtered;
  }, [bioreactors, filterProjectName, filterBioreactor, filterDay, sortBy, initialData]);

  const editsList = useMemo(() => {
    return Object.values(dataEdits || {}).sort((a, b) => {
      if (a.bioreactor !== b.bioreactor) return a.bioreactor.localeCompare(b.bioreactor);
      if (a.day !== b.day) return a.day - b.day;
      return a.metric.localeCompare(b.metric);
    });
  }, [dataEdits]);

  const startEdit = (row, metric) => {
    const key = `${row.bioreactor}_${row.day}_${metric}`;
    setEditingCell({ key, bioreactorId: row.bioreactor, day: row.day, metric });
    setEditingValue(typeof row[metric] === 'number' ? String(row[metric]) : '');
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const trimmed = editingValue.trim();
    let newValue = null;
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        setEditingCell(null);
        setEditingValue('');
        return;
      }
      newValue = parsed;
    }
    onDataEdit({
      bioreactorId: editingCell.bioreactorId,
      day: editingCell.day,
      metric: editingCell.metric,
      value: newValue
    });
    setEditingCell(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  // Get all days for exclusion panel
  const availableDays = useMemo(() => {
    if (!selectedExclusionBioreactor || !bioreactors[selectedExclusionBioreactor]) return [];
    return bioreactors[selectedExclusionBioreactor].cultureDays;
  }, [selectedExclusionBioreactor, bioreactors]);

  // FIXED: Get exclusion data - ALWAYS show excluded + selected variables
  const exclusionDisplayData = useMemo(() => {
    const data = [];

    // FIRST: Show ALL excluded points from ALL bioreactors
    Object.keys(exclusions).forEach(key => {
      if (exclusions[key] === true) {
        // Parse key: "BIOREACTOR_DAY_VARIABLE"
        const parts = key.split('_');
        if (parts.length >= 3) {
          const brId = parts[0];
          const day = parseInt(parts[1]);
          const variable = parts.slice(2).join('_');

          // Get value from original data
          const brData = initialData.bioreactors[brId];
          if (brData && brData.series && brData.series[variable] && brData.timepoints) {
            const tpIdx = brData.timepoints.findIndex(tp => tp.culture_day === day);
            if (tpIdx !== -1) {
              const value = brData.series[variable][tpIdx];
              if (value !== null && value !== undefined) {
                data.push({
                  key,
                  bioreactor: brId,
                  day,
                  variable,
                  value,
                  excluded: true
                });
              }
            }
          }
        }
      }
    });

    // SECOND: Add selected variables (if any selected)
    if (selectedExclusionBioreactor && selectedVariables.length > 0) {
      const brData = initialData.bioreactors[selectedExclusionBioreactor];
      if (brData && brData.series && brData.timepoints) {
        brData.timepoints.forEach((tp, idx) => {
          const day = tp.culture_day;
          if (day === null || day === undefined) return;

          selectedVariables.forEach(variable => {
            if (brData.series[variable]) {
              const value = brData.series[variable][idx];
              if (value !== null && value !== undefined) {
                const key = `${selectedExclusionBioreactor}_${day}_${variable}`;
                // Add only if not already in data
                if (!data.find(d => d.key === key)) {
                  data.push({
                    key,
                    bioreactor: selectedExclusionBioreactor,
                    day,
                    variable,
                    value,
                    excluded: exclusions[key] === true
                  });
                }
              }
            }
          });
        });
      }
    }

    // Sort by bioreactor, then day
    data.sort((a, b) => {
      if (a.bioreactor !== b.bioreactor) return a.bioreactor.localeCompare(b.bioreactor);
      return a.day - b.day;
    });

    // Filter by selected day if specified
    if (selectedDay !== '') {
      return data.filter(d => d.day === Number(selectedDay));
    }

    return data;
  }, [selectedExclusionBioreactor, selectedDay, selectedVariables, exclusions, initialData]);

  const toggleExclusion = (key) => {
    const newExclusions = { ...exclusions };
    if (newExclusions[key]) {
      delete newExclusions[key];
    } else {
      newExclusions[key] = true;
    }
    onExclusionChange(newExclusions);
  };

  const addVariable = () => {
    if (selectedVariables.length === 0 && orderedMetrics.length > 0) {
      setSelectedVariables([orderedMetrics[0]]);
    } else if (orderedMetrics.length > selectedVariables.length) {
      const unusedMetrics = orderedMetrics.filter(m => !selectedVariables.includes(m));
      if (unusedMetrics.length > 0) {
        setSelectedVariables([...selectedVariables, unusedMetrics[0]]);
      }
    }
  };

  const removeVariable = (variable) => {
    setSelectedVariables(selectedVariables.filter(v => v !== variable));
  };

  const updateVariable = (oldVar, newVar) => {
    setSelectedVariables(selectedVariables.map(v => v === oldVar ? newVar : v));
  };

  const escapeFormulaToken = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stripMetricUnits = (value) => value.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const stripSourceUnits = (value) => value.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
  const getFormulaToken = (value, cursorIndex = value.length) => {
    const uptoCursor = value.slice(0, cursorIndex);
    const match = uptoCursor.match(/[^+\-*/()^]+$/);
    return match ? match[0].trim() : '';
  };
  const replaceFormulaToken = (value, replacement, cursorIndex = value.length) => {
    const uptoCursor = value.slice(0, cursorIndex);
    const afterCursor = value.slice(cursorIndex);
    const match = uptoCursor.match(/[^+\-*/()^]+$/);
    if (!match) return `${value}${replacement}`;
    const startIndex = uptoCursor.length - match[0].length;
    return `${value.slice(0, startIndex)}${replacement}${afterCursor}`;
  };
  const updateFormulaMatches = (value, key, cursorIndex = value.length) => {
    const token = getFormulaToken(value, cursorIndex);
    if (!token) {
      setActiveFormulaKey(key);
      setFormulaMatches([]);
      return;
    }
    const matches = formulaOptions.filter(option => option.label.toLowerCase().includes(token.toLowerCase())).slice(0, 6);
    setActiveFormulaKey(key);
    setFormulaMatches(matches);
  };
  const toMetricKey = (value) => {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || `custom_${Date.now()}`;
  };

  const buildRowData = (br, index) => {
    const row = {};
    Object.keys(br.series || {}).forEach(metric => {
      row[metric] = br.series?.[metric]?.[index];
    });
    return row;
  };

  const addDatasetColumn = () => {
    if (!newDatasetColumnName.trim()) return;
    const baseKey = toMetricKey(newDatasetColumnName);
    const formulaValue = newDatasetColumnFormula.trim();
    const targetGroup = newDatasetColumnGroup === 'all' ? null : newDatasetColumnGroup;
    const newColumn = {
      key: baseKey,
      name: newDatasetColumnName.trim(),
      formula: formulaValue,
      group: targetGroup
    };
    onDataChange(prev => {
      const updated = { ...prev, bioreactors: { ...prev.bioreactors } };
      const existingKeys = new Set();
      Object.values(updated.bioreactors).forEach(br => {
        Object.keys(br.series || {}).forEach(key => existingKeys.add(key));
      });
      let metricKey = baseKey;
      let counter = 1;
      while (existingKeys.has(metricKey)) {
        metricKey = `${baseKey}_${counter}`;
        counter += 1;
      }
      newColumn.key = metricKey;
      Object.keys(updated.bioreactors).forEach(brId => {
        const br = updated.bioreactors[brId];
        const nextBr = { ...br, series: { ...br.series } };
        const timepoints = br.timepoints || [];
        const values = timepoints.map((_, index) => {
          if (!formulaValue) return null;
          if (targetGroup && br.condition !== targetGroup) return null;
          const rowData = buildRowData(br, index);
          const result = evaluateFormula(formulaValue, rowData);
          return typeof result === 'number' ? result : null;
        });
        nextBr.series[metricKey] = values;
        updated.bioreactors[brId] = nextBr;
      });
      const existingCustomColumns = Array.isArray(updated.custom_columns) ? updated.custom_columns : [];
      updated.custom_columns = [...existingCustomColumns, { ...newColumn }];
      return updated;
    });
    setCustomDatasetColumns(prev => [...prev, newColumn]);
    setNewDatasetColumnName('');
    setNewDatasetColumnFormula('');
    setNewDatasetColumnGroup('all');
    setFormulaMatches([]);
    setActiveFormulaKey(null);
  };
  const removeDatasetColumn = (metricKey) => {
    setCustomDatasetColumns(prev => prev.filter(column => column.key !== metricKey));
    onDataChange(prev => {
      const updated = { ...prev, bioreactors: { ...prev.bioreactors } };
      Object.keys(updated.bioreactors).forEach(brId => {
        const br = updated.bioreactors[brId];
        const nextBr = { ...br, series: { ...br.series } };
        delete nextBr.series?.[metricKey];
        updated.bioreactors[brId] = nextBr;
      });
      if (Array.isArray(updated.custom_columns)) {
        updated.custom_columns = updated.custom_columns.filter(column => column?.key !== metricKey);
      }
      return updated;
    });
  };

  const normalizedCalculationFormula = (formula) => {
    if (!formula) return '';
    const collapseSpaces = (value) => value?.replace(/\s+/g, ' ').trim();
    const placeholders = [];
    let normalized = formula.replace(/\{[^}]+\}/g, (match) => {
      placeholders.push(match);
      return `__CALC_PLACEHOLDER_${placeholders.length - 1}__`;
    });
    normalized = collapseSpaces(normalized);

    const metricAliases = orderedMetrics.flatMap(metric => {
      const formatted = formatMetricName(metric);
      const stripped = stripMetricUnits(formatted);
      const formattedCollapsed = collapseSpaces(formatted);
      const strippedCollapsed = collapseSpaces(stripped);
      const sourceAliases = sourceColumnAliases[metric] || [];
      const sourceCollapsed = sourceAliases.map(alias => collapseSpaces(alias));
      const sourceStripped = sourceAliases.map(alias => stripSourceUnits(alias));
      const sourceStrippedCollapsed = sourceStripped.map(alias => collapseSpaces(alias));
      return {
        metric,
        aliases: [
          formatted,
          stripped,
          formattedCollapsed,
          strippedCollapsed,
          metric,
          ...sourceAliases,
          ...sourceCollapsed,
          ...sourceStripped,
          ...sourceStrippedCollapsed
        ].filter(Boolean)
      };
    });

    metricAliases
      .flatMap(({ metric, aliases }) => aliases.map(alias => ({ metric, alias })))
      .sort((a, b) => b.alias.length - a.alias.length)
      .forEach(({ metric, alias }) => {
        if (!alias) return;
        const escaped = escapeFormulaToken(alias);
        const matcher = new RegExp(`(^|[^\\p{L}\\p{N}_{])${escaped}(?=$|[^\\p{L}\\p{N}_}])`, 'giu');
        normalized = normalized.replace(matcher, (match, prefix) => `${prefix}{${metric}}`);
      });

    normalized = normalized.replace(/__CALC_PLACEHOLDER_(\d+)__/g, (match, index) => {
      return placeholders[Number(index)] || match;
    });

    return normalized;
  };

  const evaluateFormula = (formula, row) => {
    if (!formula) return null;
    const normalized = normalizedCalculationFormula(formula);
    const interpolated = normalized.replace(/\{([^}]+)\}/g, (match, metric) => {
      const value = row[metric];
      if (value === null || value === undefined || value === '') {
        return 'NaN';
      }
      return Number.isFinite(Number(value)) ? String(Number(value)) : 'NaN';
    });
    const expression = interpolated.replace(/\^/g, '**');
    if (!/^[0-9+\-*/().\sNaN*]+$/.test(expression)) {
      return null;
    }
    try {
      const result = Function(`"use strict"; return (${expression});`)();
      if (Number.isFinite(result)) return result;
      return null;
    } catch (e) {
      return null;
    }
  };

  const findTimepointIndex = (brData, day) => {
    if (!brData?.timepoints) return -1;
    return brData.timepoints.findIndex(tp => tp.culture_day === day);
  };

  const applyResetEdits = (editsToReset) => {
    if (!editsToReset.length) return;
    onDataChange(prev => {
      const updated = { ...prev, bioreactors: { ...prev.bioreactors } };
      editsToReset.forEach(edit => {
        const br = updated.bioreactors?.[edit.bioreactor];
        if (!br) return;
        const index = findTimepointIndex(br, edit.day);
        if (index === -1) return;
        const nextBr = { ...br, series: { ...br.series } };
        const seriesValues = [...(nextBr.series?.[edit.metric] || [])];
        seriesValues[index] = edit.previousValue ?? null;
        nextBr.series[edit.metric] = seriesValues;
        updated.bioreactors[edit.bioreactor] = nextBr;
      });
      return updated;
    });
    onDataEditsChange(prev => {
      const next = { ...(prev || {}) };
      editsToReset.forEach(edit => {
        const key = edit.key || `${edit.bioreactor}_${edit.day}_${edit.metric}`;
        delete next[key];
      });
      return next;
    });
  };

  const resetEdit = (edit) => applyResetEdits([edit]);
  const resetAllEdits = () => applyResetEdits(editList);

  const startEditCell = (row, metric) => {
    const value = row[metric];
    setEditingCell({ bioreactor: row.bioreactor, day: row.day, metric });
    setEditingValue(value === null || value === undefined ? '' : String(value));
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const commitCellEdit = () => {
    if (!editingCell) return;
    const { bioreactor, day, metric } = editingCell;
    const raw = editingValue.trim();
    if (!initialData?.bioreactors?.[bioreactor]) {
      cancelCellEdit();
      return;
    }
    const brData = initialData.bioreactors[bioreactor];
    const index = findTimepointIndex(brData, day);
    if (index === -1) {
      cancelCellEdit();
      return;
    }
    const nextValue = raw === '' ? null : Number(raw);
    if (raw !== '' && Number.isNaN(nextValue)) return;
    const prevValue = brData.series?.[metric]?.[index];
    if (prevValue === nextValue || (Number.isNaN(prevValue) && Number.isNaN(nextValue))) {
      cancelCellEdit();
      return;
    }
    onDataChange(prev => {
      const updated = { ...prev, bioreactors: { ...prev.bioreactors } };
      const updatedBr = { ...updated.bioreactors[bioreactor] };
      const updatedSeries = { ...updatedBr.series };
      const seriesValues = [...(updatedSeries[metric] || [])];
      seriesValues[index] = nextValue;
      updatedSeries[metric] = seriesValues;
      updatedBr.series = updatedSeries;
      updated.bioreactors[bioreactor] = updatedBr;
      return updated;
    });
    onDataEditsChange(prev => {
      const current = prev || {};
      const key = `${bioreactor}_${day}_${metric}`;
      const existing = current[key];
      const previousValue = existing ? existing.previousValue : prevValue;
      if (nextValue === previousValue) {
        const { [key]: _removed, ...rest } = current;
        return rest;
      }
      return {
        ...current,
        [key]: {
          key,
          bioreactor,
          day,
          metric,
          previousValue,
          nextValue,
          updatedAt: Date.now()
        }
      };
    });
    cancelCellEdit();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-800">Batch Dashboard</h1>
              {metadata.runId && metadata.runId !== 'Unknown Run' && (
                <span className="bg-indigo-100 text-indigo-800 text-sm font-mono font-bold px-3 py-1 rounded-full border border-indigo-200">
                  {metadata.runId}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">All Bioreactors Data Table · {metadata.bioreactorCount} vessels</p>
          </div>
        </div>
        <button
          onClick={() => setShowExcludePanel(!showExcludePanel)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${showExcludePanel ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'}`}
        >
          <Filter className="w-4 h-4" />
          {showExcludePanel ? 'Hide' : 'Show'} Data Exclusion
        </button>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        {/* Main Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6">
          {/* Filters and Controls */}
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="bioreactor">Bioreactor</option>
                  <option value="day">Day</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Filter Project:</label>
                <select
                  value={filterProjectName}
                  onChange={(e) => setFilterProjectName(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="">All Projects</option>
                  {projectNameOptions.map(projectName => (
                    <option key={projectName} value={projectName}>{projectName}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Filter Bioreactor:</label>
                <select
                  value={filterBioreactor}
                  onChange={(e) => setFilterBioreactor(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                >
                  <option value="">All Bioreactors</option>
                  {Object.keys(bioreactors).map(brId => (
                    <option key={brId} value={brId}>{brId}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Filter Day:</label>
                <select
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="">All Days</option>
                  {allDays.map(day => (
                    <option key={day} value={day}>Day {day}</option>
                  ))}
                </select>
              </div>

              {(filterProjectName || filterBioreactor || filterDay !== '') && (
                <button
                  onClick={() => { setFilterProjectName(''); setFilterBioreactor(''); setFilterDay(''); }}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
                >
                  Clear Filters
                </button>
              )}

              <div className="ml-auto text-xs text-slate-500 flex items-center gap-3">
                <span>Click a cell to edit.</span>
                <span>Showing {tableData.length} rows × {orderedMetrics.length} metrics</span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-bold sticky left-0 bg-slate-100 z-30 border-r border-slate-200 w-[160px]">Project name</th>
                  <th className="px-4 py-3 font-bold sticky left-[160px] bg-slate-100 z-20 border-r border-slate-200 w-[100px]">Bioreactor</th>
                  <th className="px-4 py-3 font-bold sticky left-[260px] bg-slate-100 z-20 border-r border-slate-200 w-[80px]">Day</th>
                  {orderedMetrics.map(metric => (
                    <th key={metric} className="px-4 py-3 whitespace-nowrap border-r border-slate-100 last:border-0">
                      {formatMetricName(metric)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableData.map((row, idx) => (
                  <tr key={`${row.bioreactor}_${row.day}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 sticky left-0 bg-white z-20 border-r border-slate-200">
                      {row.projectName}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 sticky left-[160px] bg-white z-10 border-r border-slate-200 font-mono">
                      {row.bioreactor}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 sticky left-[260px] bg-white z-10 border-r border-slate-200">
                      {row.day}
                    </td>
                    {orderedMetrics.map(metric => {
                      const key = `${row.bioreactor}_${row.day}_${metric}`;
                      const isExcluded = exclusions[key] === true;
                      const editEntry = editsByKey[key];
                      const isEdited = Boolean(editEntry);
                      const isEditing = editingCell?.bioreactor === row.bioreactor
                        && editingCell?.day === row.day
                        && editingCell?.metric === metric;
                      return (
                        <td
                          key={metric}
                          className={`px-4 py-3 border-r border-slate-100 last:border-0 font-mono ${
                            isExcluded ? 'bg-red-50 text-red-600 line-through font-bold' : ''
                          } ${isEdited && !isExcluded ? 'bg-purple-50 text-purple-700 font-bold' : ''}`}
                          onClick={() => !isEditing && startEditCell(row, metric)}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={commitCellEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitCellEdit();
                                if (e.key === 'Escape') cancelCellEdit();
                              }}
                              className="w-full px-2 py-1 border border-purple-300 rounded text-xs font-mono focus:ring-2 focus:ring-purple-400 outline-none"
                              autoFocus
                            />
                          ) : (
                            typeof row[metric] === 'number' ? row[metric].toFixed(2) : (row[metric] ?? '-')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Dataset Columns
            </h2>
            <span className="text-xs text-slate-500">Add columns to the Batch dataset</span>
          </div>
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Column Name</label>
                <input
                  value={newDatasetColumnName}
                  onChange={(e) => setNewDatasetColumnName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400 outline-none"
                  placeholder="e.g. Specific Productivity"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Apply to Group</label>
                <select
                  value={newDatasetColumnGroup}
                  onChange={(e) => setNewDatasetColumnGroup(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400 outline-none bg-white"
                >
                  <option value="all">All bioreactors</option>
                  {datasetColumnGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Formula (optional)</label>
                <div className="relative">
                  <input
                    value={newDatasetColumnFormula}
                    onChange={(e) => {
                      setNewDatasetColumnFormula(e.target.value);
                      updateFormulaMatches(e.target.value, 'dataset', e.target.selectionStart ?? e.target.value.length);
                    }}
                    onFocus={(e) => updateFormulaMatches(e.target.value, 'dataset', e.target.selectionStart ?? e.target.value.length)}
                    onBlur={() => setTimeout(() => setActiveFormulaKey(null), 120)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && activeFormulaKey === 'dataset' && formulaMatches.length > 0) {
                        e.preventDefault();
                        const nextValue = replaceFormulaToken(newDatasetColumnFormula, formulaMatches[0].label, e.currentTarget.selectionStart ?? newDatasetColumnFormula.length);
                        setNewDatasetColumnFormula(nextValue);
                        setFormulaMatches([]);
                      }
                    }}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400 outline-none font-mono"
                    placeholder="Use metric names like Ammonia (mg/L) * Base consumption per d (mL)"
                  />
                  {activeFormulaKey === 'dataset' && formulaMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-40 overflow-auto">
                      {formulaMatches.map(option => (
                        <button
                          key={option.metric}
                          type="button"
                          onMouseDown={() => {
                            const nextValue = replaceFormulaToken(newDatasetColumnFormula, option.label);
                            setNewDatasetColumnFormula(nextValue);
                            setFormulaMatches([]);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400">
                  Adds a new column to the Batch dataset (and the main table). Supports +, -, *, /, parentheses, and ^ for power. Use display names or original column names from the import.
                </p>
                <div className="text-[10px] text-slate-500">
                  <div className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Formula examples</div>
                  <ul className="space-y-1 font-mono">
                    <li>Ammonia (mg/L) * Base consumption per d (mL)</li>
                    <li>VCC (10^6 cells/mL) ^ 2</li>
                    <li>Glucose (g/L) + Lactate (g/L)</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={addDatasetColumn}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Add Dataset Column
              </button>
            </div>
          </div>
          {customDatasetColumns.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Created Columns</div>
              <div className="flex flex-wrap gap-2">
                {customDatasetColumns.map(column => (
                  <div key={column.key} className="flex items-center gap-2 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-semibold text-emerald-700">
                    <div className="flex flex-col">
                      <span>{column.name}</span>
                      {column.group && (
                        <span className="text-[9px] font-semibold text-emerald-600">{column.group}</span>
                      )}
                      {column.formula && (
                        <span className="text-[9px] font-mono text-emerald-500">{column.formula}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDatasetColumn(column.key)}
                      className="text-emerald-500 hover:text-emerald-700"
                      aria-label={`Delete ${column.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-purple-600" />
              Data Change Log
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{editList.length} changes</span>
              {editList.length > 0 && (
                <button
                  type="button"
                  onClick={resetAllEdits}
                  className="px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-[10px] font-bold hover:bg-purple-50 transition-colors"
                >
                  Reset All
                </button>
              )}
            </div>
          </div>
          {editList.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 italic">
              No edits yet. Click a table cell to update a value.
            </div>
          ) : (
            <div className="overflow-auto" style={{ maxHeight: '240px' }}>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-slate-700">Bioreactor</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-700">Day</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-700">Variable</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-700">Previous</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-700">Updated</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-700">Reset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editList.map(edit => (
                    <tr key={edit.key} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{edit.bioreactor}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{edit.day}</td>
                      <td className="px-3 py-2 text-slate-600">{formatMetricName(edit.metric)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-500">
                        {typeof edit.previousValue === 'number' ? edit.previousValue.toFixed(2) : (edit.previousValue ?? '-')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-purple-700">
                        {typeof edit.nextValue === 'number' ? edit.nextValue.toFixed(2) : (edit.nextValue ?? '-')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => resetEdit(edit)}
                          className="px-2 py-1 bg-white border border-purple-200 text-purple-700 rounded text-[10px] font-bold hover:bg-purple-50 transition-colors"
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Exclusion Panel - AT BOTTOM */}
        <AnimatePresence>
          {showExcludePanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                  Data Exclusion Manager
                </h2>
                <button
                  onClick={() => setShowExcludePanel(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Selection Controls */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">1. Select Bioreactor</label>
                    <select
                      value={selectedExclusionBioreactor}
                      onChange={(e) => {
                        setSelectedExclusionBioreactor(e.target.value);
                        setSelectedDay('');
                        setSelectedVariables([]);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                    >
                      <option value="">-- Select Bioreactor --</option>
                      {Object.keys(bioreactors).map(brId => (
                        <option key={brId} value={brId}>{brId} - {bioreactors[brId].condition}</option>
                      ))}
                    </select>
                  </div>

                  {selectedExclusionBioreactor && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-2 block">2. Filter by Day (Optional)</label>
                      <select
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="">All Days</option>
                        {availableDays.map(day => (
                          <option key={day} value={day}>Day {day}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedExclusionBioreactor && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500">3. Select Variables</label>
                        <button
                          onClick={addVariable}
                          className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600 transition-colors"
                          disabled={selectedVariables.length >= orderedMetrics.length}
                        >
                          <span className="text-sm">+</span> Add
                        </button>
                      </div>

                      {selectedVariables.length === 0 ? (
                        <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded border border-slate-200">
                          Click "+ Add" to start
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedVariables.map((variable, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <select
                                value={variable}
                                onChange={(e) => updateVariable(variable, e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                              >
                                {orderedMetrics.map(metric => (
                                  <option key={metric} value={metric}>{formatMetricName(metric)}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => removeVariable(variable)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Data Display */}
                <div className="lg:col-span-2">
                  <div className="text-xs text-slate-500 mb-2 flex items-center justify-between">
                    <span>Showing {exclusionDisplayData.length} data points</span>
                    <span className="text-rose-600 font-bold">
                      {exclusionDisplayData.filter(d => d.excluded).length} excluded
                    </span>
                  </div>

                  {exclusionDisplayData.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded border border-slate-200">
                      No data to display. Select a bioreactor and add variables to manage exclusions.
                    </div>
                  ) : (
                    <div className="overflow-auto border border-slate-200 rounded-lg" style={{ maxHeight: '400px' }}>
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold text-slate-700">Bioreactor</th>
                            <th className="px-3 py-2 text-left font-bold text-slate-700">Day</th>
                            <th className="px-3 py-2 text-left font-bold text-slate-700">Variable</th>
                            <th className="px-3 py-2 text-right font-bold text-slate-700">Value</th>
                            <th className="px-3 py-2 text-center font-bold text-slate-700">Status</th>
                            <th className="px-3 py-2 text-center font-bold text-slate-700">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {exclusionDisplayData.map(point => (
                            <tr
                              key={point.key}
                              className={`hover:bg-slate-50 transition-colors ${point.excluded ? 'bg-red-50' : ''}`}
                            >
                              <td className={`px-3 py-2 font-mono font-bold ${point.excluded ? 'text-red-600 line-through' : 'text-slate-800'}`}>{point.bioreactor}</td>
                              <td className={`px-3 py-2 font-mono ${point.excluded ? 'text-red-600 line-through font-bold' : ''}`}>{point.day}</td>
                              <td className={`px-3 py-2 ${point.excluded ? 'text-red-600 line-through font-bold' : 'text-slate-600'}`}>{formatMetricName(point.variable)}</td>
                              <td className={`px-3 py-2 text-right font-mono ${point.excluded ? 'text-red-600 line-through font-bold' : 'font-bold'}`}>{point.value.toFixed(2)}</td>
                                <td className="px-3 py-2 text-center">
                                  {point.excluded ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                                      ✕ Excluded
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                                      ✓ Active
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => toggleExclusion(point.key)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                      point.excluded
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                    }`}
                                  >
                                    {point.excluded ? 'Include' : 'Exclude'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── BATCH OPERATIONS (day + description) ─────────────────── */}
        {onBatchOperationsChange && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Batch Operations / Events
                  <span className="text-[10px] font-normal text-slate-500 ml-2">
                    (Visible as overlay on Yield Analytics plots)
                  </span>
                </h3>
                <span className="text-xs text-slate-500">{batchOperations.length} event{batchOperations.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-3 mb-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 mb-1">Day</label>
                  <input
                    type="number"
                    min="0"
                    max={metadata.duration || 30}
                    id="opsDayInput"
                    placeholder="0"
                    className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] font-bold text-slate-500 mb-1">Description</label>
                  <input
                    type="text"
                    id="opsDescInput"
                    placeholder="e.g., Bolus Feed, Media Exchange, pH Shift..."
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    const dayEl = document.getElementById('opsDayInput');
                    const descEl = document.getElementById('opsDescInput');
                    const day = Number(dayEl?.value);
                    const desc = (descEl?.value || '').trim();
                    if (isNaN(day) || day < 0 || !desc) return;
                    onBatchOperationsChange(prev => [...prev, { day, description: desc, id: Date.now() }]);
                    if (dayEl) dayEl.value = '';
                    if (descEl) descEl.value = '';
                  }}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {batchOperations.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold w-20">Day</th>
                        <th className="px-3 py-2 text-left font-bold">Description</th>
                        <th className="px-3 py-2 text-right font-bold w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...batchOperations].sort((a, b) => a.day - b.day).map((op) => (
                        <tr key={op.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-bold text-indigo-700">Day {op.day}</td>
                          <td className="px-3 py-2 text-slate-700">{op.description}</td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => onBatchOperationsChange(prev => prev.filter(o => o.id !== op.id))} className="text-rose-500 hover:text-rose-700 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 italic">No operations defined yet. Add events above to see them on Yield Analytics plots.</div>
              )}
            </div>
          </div>
        )}

        {/* ─── RAW DATA PANEL ─────────────────────────────────────────── */}
        <RawDataPanel initialData={initialData} />
      </div>
    </div>
  );
};



// --- FEATURE 2.5: USP ACCEPTABILITY ASSESSMENT DASHBOARD ---
const USPAssessmentDashboard = ({ onBack, initialData, exclusions }) => {
  const [parsedData, setParsedData] = useState(() => parseFermentationData(initialData, exclusions));
  const [xDomain, setXDomain] = useState(null);
  const [refArea, setRefArea] = useState({ left: '', right: '' });
  const STORAGE_KEY_PREFIX = 'fermentation_dashboard_';
  const saveState = (key, value) => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {}
  };
  const loadState = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };
  const [isAuthorized, setIsAuthorized] = useState(() => {
    try {
      return localStorage.getItem('usp_admin_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showUspDataTable, setShowUspDataTable] = useState(false);
  const defaultColors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#4f46e5', '#ca8a04', '#be123c', '#15803d', '#ec4899', '#8b5cf6'];
  const [plotSettings, setPlotSettings] = useState(() => normalizeObject(loadState('plotSettings', {})));
  const [stages, setStages] = useState(() => normalizeArray(loadState('stages', [
    { id: 'inoc', label: 'Inoculation', start: 0, end: 2, color: '#dcfce7' },
    { id: 'growth', label: 'Growth Init', start: 2, end: 5, color: '#dbeafe' },
    { id: 'feed', label: 'Feeding Phase', start: 5, end: 12, color: '#fef9c3' },
    { id: 'harvest', label: 'Harvesting', start: 12, end: 15, color: '#fee2e2' }
  ])));

  useEffect(() => {
    setParsedData(parseFermentationData(initialData, exclusions));
  }, [initialData, exclusions]);

  useEffect(() => {
    if (!initialData?.bioreactors) return;
    const current = normalizeObject(plotSettings);
    const updated = { ...current };
    let needsSave = false;
    Object.keys(initialData.bioreactors).forEach((id, index) => {
      if (!updated[id]) {
        updated[id] = {
          color: defaultColors[index % defaultColors.length],
          shape: 'circle',
          strokeDash: '0',
          secondaryColor: defaultColors[index % defaultColors.length],
          secondaryStrokeWidth: 1
        };
        needsSave = true;
      }
    });
    if (needsSave) {
      setPlotSettings(updated);
      saveState('plotSettings', updated);
    }
  }, [initialData, plotSettings]);

  const updateSetting = (id, field, value) => {
    const safeSettings = normalizeObject(plotSettings);
    const updated = { ...safeSettings, [id]: { ...safeSettings[id], [field]: value } };
    setPlotSettings(updated);
    saveState('plotSettings', updated);
  };

  const updateConditionGroup = (condition, field, value) => {
    if (!initialData?.bioreactors) return;
    const targetIds = Object.keys(initialData.bioreactors).filter(id => initialData.bioreactors[id].condition === condition);
    const newSettings = { ...normalizeObject(plotSettings) };
    targetIds.forEach(id => {
      if (newSettings[id]) {
        newSettings[id] = { ...newSettings[id], [field]: value };
      } else {
        newSettings[id] = { color: '#000000', shape: 'circle', strokeDash: '0', secondaryColor: '#000000', secondaryStrokeWidth: 1, [field]: value };
      }
    });
    setPlotSettings(newSettings);
    saveState('plotSettings', newSettings);
  };

  const updateStage = (idx, field, value) => {
    const nextStages = [...stages];
    nextStages[idx][field] = value;
    setStages(nextStages);
    saveState('stages', nextStages);
  };

  const unlockUspAccess = () => {
    if (passwordInput.trim() === 'ferm-admin') {
      setIsAuthorized(true);
      setPasswordError('');
      try {
        localStorage.setItem('usp_admin_unlocked', 'true');
      } catch (e) {}
      return;
    }
    setPasswordError('Invalid password. Please try again.');
  };

  if (!parsedData) return null;

  const { chartData, metadata, allMetrics, groups } = parsedData;
  const bioreactorIds = Object.keys(initialData?.bioreactors || {});
  const groupIds = Object.keys(groups || {}).map(groupName => `GRP_${groupName}`);
  const [useGroupReference, setUseGroupReference] = useState(false);
  const seriesKeys = useMemo(() => allMetrics || [], [allMetrics]);

  const metricAvailability = useMemo(() => {
    const availability = {};
    if (!chartData?.length || seriesKeys.length === 0) return availability;
    seriesKeys.forEach(metric => {
      let count = 0;
      let earliestDay = Number.POSITIVE_INFINITY;
      chartData.forEach(row => {
        bioreactorIds.forEach(id => {
          const value = row[`${id}_${metric}`];
          if (value !== null && value !== undefined && !Number.isNaN(value)) {
            count += 1;
            if (row.day < earliestDay) earliestDay = row.day;
          }
        });
      });
      availability[metric] = { count, earliestDay };
    });
    return availability;
  }, [chartData, seriesKeys, bioreactorIds]);

  const pickMetricKey = useCallback((patterns) => {
    const candidates = seriesKeys.filter(metric => patterns.some(pattern => metric.toLowerCase().includes(pattern)));
    if (candidates.length === 0) return '';
    const scored = candidates.map(metric => ({
      metric,
      count: metricAvailability[metric]?.count ?? 0,
      earliestDay: metricAvailability[metric]?.earliestDay ?? Number.POSITIVE_INFINITY
    }));
    scored.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.earliestDay - b.earliestDay;
    });
    return scored[0]?.metric || '';
  }, [metricAvailability, seriesKeys]);

  const metricKeys = useMemo(() => {
    const preferredTiter = pickMetricKey(['igg_mg_per_l']);
    return ({
    titer: preferredTiter || pickMetricKey(['protein_a_hplc', 'titer']),
    vcd: pickMetricKey(['viable_cells_x106', 'vcd', 'vcc']),
    viability: pickMetricKey(['cell_viability_pct', 'viability_pct']),
    glucose: pickMetricKey(['gluc_g_per_l', 'glu_g_per_l', 'glucose', 'gluc_']),
    lactate: pickMetricKey(['lac_g_per_l', 'lactate', 'lac_']),
    ph: pickMetricKey(['ph']),
    po2: pickMetricKey(['po2']),
    temperature: pickMetricKey(['temp']),
    airFlow: pickMetricKey(['air_flow_ml_per_min']),
    o2Flow: pickMetricKey(['total_o2_flow_ml_per_min', 'o2_flow']),
    co2Flow: pickMetricKey(['co2_flow_ml_per_min']),
    base: pickMetricKey(['total_base_volume_pumped_ml'])
    });
  }, [pickMetricKey]);

  const uspChartConfigs = useMemo(() => ([
    {
      id: 'usp-chart-1',
      title: 'VCD + Viability + Titer + Temperature',
      axes: [
        { id: 'left' },
        { id: 'right', orientation: 'right' },
        { id: 'titer', orientation: 'right', label: 'Titer', offset: 36 }
      ],
      lines: [
        { key: metricKeys.vcd, axis: 'left', label: 'VCD', color: '#2563eb', dash: '0' },
        { key: metricKeys.viability, axis: 'left', label: 'Viability', color: '#16a34a', dash: '0' },
        { key: metricKeys.titer, axis: 'titer', label: 'Titer', color: '#f97316', dash: '4 4' },
        { key: metricKeys.temperature, axis: 'right', label: 'Temp', color: '#dc2626', dash: '4 4' }
      ]
    },
    {
      id: 'usp-chart-2',
      title: 'VCD + Viability + Titer + Glucose + Lactate',
      axes: [
        { id: 'left' },
        { id: 'right', orientation: 'right' },
        { id: 'titer', orientation: 'right', label: 'Titer', offset: 36 }
      ],
      lines: [
        { key: metricKeys.vcd, axis: 'left', label: 'VCD', color: '#2563eb', dash: '0' },
        { key: metricKeys.viability, axis: 'left', label: 'Viability', color: '#16a34a', dash: '0' },
        { key: metricKeys.titer, axis: 'titer', label: 'Titer', color: '#f97316', dash: '4 4' },
        { key: metricKeys.glucose, axis: 'right', label: 'Glucose', color: '#a855f7', dash: '2 2' },
        { key: metricKeys.lactate, axis: 'right', label: 'Lactate', color: '#f472b6', dash: '6 2 2 2' }
      ]
    },
    {
      id: 'usp-chart-3',
      title: 'VCD + Viability + pH + pO2',
      axes: [
        { id: 'left' },
        { id: 'right', orientation: 'right' }
      ],
      lines: [
        { key: metricKeys.vcd, axis: 'left', label: 'VCD', color: '#2563eb', dash: '0' },
        { key: metricKeys.viability, axis: 'left', label: 'Viability', color: '#16a34a', dash: '0' },
        { key: metricKeys.ph, axis: 'right', label: 'pH', color: '#facc15', dash: '4 4' },
        { key: metricKeys.po2, axis: 'right', label: 'pO2', color: '#38bdf8', dash: '6 2 2 2' }
      ],
      referenceBands: [{ axis: 'right', y1: 6.8, y2: 7.2, fill: '#fef3c7', fillOpacity: 0.35 }]
    },
    {
      id: 'usp-chart-4',
      title: 'VCD + Viability + pH + Lactate + Base + CO2',
      axes: [
        { id: 'left' },
        { id: 'right', orientation: 'right' }
      ],
      lines: [
        { key: metricKeys.vcd, axis: 'left', label: 'VCD', color: '#2563eb', dash: '0' },
        { key: metricKeys.viability, axis: 'left', label: 'Viability', color: '#16a34a', dash: '0' },
        { key: metricKeys.ph, axis: 'right', label: 'pH', color: '#facc15', dash: '4 4' },
        { key: metricKeys.lactate, axis: 'right', label: 'Lactate', color: '#f472b6', dash: '6 2 2 2' },
        { key: metricKeys.base, axis: 'right', label: 'Base', color: '#a16207', dash: '2 2' },
        { key: metricKeys.co2Flow, axis: 'right', label: 'CO2', color: '#64748b', dash: '0' }
      ],
      referenceBands: [{ axis: 'right', y1: 6.8, y2: 7.2, fill: '#fef3c7', fillOpacity: 0.35 }]
    }
  ]), [metricKeys]);
  const uspTableMetrics = useMemo(() => ([
    { key: metricKeys.vcd, label: 'VCD' },
    { key: metricKeys.viability, label: 'Viability' },
    { key: metricKeys.titer, label: 'Titer' },
    { key: metricKeys.glucose, label: 'Glucose' },
    { key: metricKeys.lactate, label: 'Lactate' },
    { key: metricKeys.temperature, label: 'Temperature' },
    { key: metricKeys.ph, label: 'pH' },
    { key: metricKeys.po2, label: 'pO2' },
    { key: metricKeys.base, label: 'Base' },
    { key: metricKeys.co2Flow, label: 'CO2' }
  ]).filter(metric => metric.key), [metricKeys]);
  const expectedValues = {
    titer: 2.5,
    vcd: 12,
    viability: 90,
    glucose: 4,
    lactate: 2,
    ph: 7,
    po2: 60,
    temperature: 37,
    airFlow: 30,
    o2Flow: 20,
    co2Flow: 15,
    base: 100
  };

  const findLatestValue = (metricKey) => {
    if (!metricKey) return null;
    const values = [];
    const idsToCheck = useGroupReference ? groupIds : bioreactorIds;
    idsToCheck.forEach(id => {
      for (let i = chartData.length - 1; i >= 0; i -= 1) {
        const value = chartData[i][`${id}_${metricKey}`];
        if (value !== null && value !== undefined) {
          values.push(Number(value));
          break;
        }
      }
    });
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const parameterRows = [
    { id: 'titer', label: 'Titer [g/L]' },
    { id: 'vcd', label: 'VCD [10^6 cells/mL]' },
    { id: 'viability', label: 'Viability [%]' },
    { id: 'glucose', label: 'Glucose [g/L]' },
    { id: 'lactate', label: 'Lactate [mmol/L]' },
    { id: 'ph', label: 'pH' },
    { id: 'po2', label: 'pO2' },
    { id: 'temperature', label: 'Temperature [°C]' },
    { id: 'airFlow', label: 'Air-flow [mL/min]' },
    { id: 'o2Flow', label: 'O2 flow [mL/min]' },
    { id: 'co2Flow', label: 'CO2 flow [mL/min]' },
    { id: 'base', label: 'Total base added [mL]' }
  ].map(row => {
    const measured = findLatestValue(metricKeys[row.id]);
    const expected = expectedValues[row.id];
    const delta = measured !== null && expected ? ((measured - expected) / expected) * 100 : null;
    return {
      ...row,
      measured,
      expected,
      delta
    };
  });

  const acceptanceStatus = useMemo(() => {
    const outOfSpec = parameterRows.filter(row => row.delta !== null);
    const failed = outOfSpec.some(row => Math.abs(row.delta) > 15) || (parameterRows.find(row => row.id === 'viability')?.measured ?? 100) < 80;
    if (failed) return { status: 'FAILED', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
    const warnings = outOfSpec.filter(row => Math.abs(row.delta) > 10 && Math.abs(row.delta) <= 15);
    if (warnings.length > 2) return { status: 'FAILED', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
    if (warnings.length >= 1) return { status: 'WARNING', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
    return { status: 'PASSED', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  }, [parameterRows]);

  const deltaClass = (delta) => {
    if (delta === null) return 'text-slate-400';
    const abs = Math.abs(delta);
    if (abs <= 5) return 'text-emerald-600';
    if (abs <= 10) return 'text-amber-600';
    return 'text-rose-600';
  };

  const formatValue = (value) => (value === null || value === undefined ? '-' : Number(value).toFixed(2));

  const allDays = chartData.map(row => row.day);
  const minDay = 0;
  const maxDay = allDays.length ? Math.max(...allDays) : 0;
  const maxRange = Math.max(maxDay, 14);

  const applyZoom = () => {
    if (refArea.left === '' || refArea.right === '' || refArea.left === refArea.right) {
      setRefArea({ left: '', right: '' });
      return;
    }
    const left = Math.min(Number(refArea.left), Number(refArea.right));
    const right = Math.max(Number(refArea.left), Number(refArea.right));
    setXDomain({ left, right });
    setRefArea({ left: '', right: '' });
  };

  const resetZoom = () => {
    setXDomain(null);
    setRefArea({ left: '', right: '' });
  };

  const syncZoomHandlers = {
    onMouseDown: (e) => e?.activeLabel !== undefined && setRefArea({ left: e.activeLabel, right: e.activeLabel }),
    onMouseMove: (e) => refArea.left !== '' && e?.activeLabel !== undefined && setRefArea(prev => ({ ...prev, right: e.activeLabel })),
    onMouseUp: applyZoom
  };

  const exportAssessmentCsv = () => {
    const headers = ['Variable', 'Measured', 'Expected', 'Δ%'];
    const rows = parameterRows.map(row => [
      row.label,
      formatValue(row.measured),
      formatValue(row.expected),
      row.delta === null ? '-' : row.delta.toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'usp_acceptability.csv';
    link.click();
  };

  const exportChartPng = (containerId, filename) => {
    const container = document.getElementById(containerId);
    const svg = container?.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const { width, height } = svg.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 600);
      canvas.height = Math.max(height, 400);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = pngUrl;
      link.click();
    };
    img.src = url;
  };

  const exportAllCharts = () => {
    exportChartPng('usp-chart-1', 'usp_chart_1.png');
    exportChartPng('usp-chart-2', 'usp_chart_2.png');
    exportChartPng('usp-chart-3', 'usp_chart_3.png');
    exportChartPng('usp-chart-4', 'usp_chart_4.png');
  };

  const generateReport = () => {
    const outOfSpec = parameterRows.filter(row => row.delta !== null && Math.abs(row.delta) > 10);
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    reportWindow.document.write(`
      <html>
        <head><title>USP Acceptability Report</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>USP Acceptability Assessment</h1>
          <p><strong>Batch ID:</strong> ${metadata.runId}</p>
          <p><strong>Date range:</strong> ${(metadata.startDate && !isNaN(metadata.startDate.getTime()) ? metadata.startDate.toDateString() : '-')} - ${(metadata.endDate && !isNaN(metadata.endDate.getTime()) ? metadata.endDate.toDateString() : '-')}</p>
          <p><strong>Final acceptance status:</strong> ${acceptanceStatus.status}</p>
          <h2>Out-of-spec parameters</h2>
          <ul>
            ${outOfSpec.length ? outOfSpec.map(row => `<li>${row.label} (${row.delta.toFixed(2)}%)</li>`).join('') : '<li>None</li>'}
          </ul>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.print();
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const filteredPayload = payload.filter(entry => typeof entry.dataKey === 'string' && entry.dataKey.includes('_'));
    if (filteredPayload.length === 0) return null;
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-xs">
        <div className="font-bold text-slate-700 mb-2">Process Time: Day {label}</div>
        <div className="space-y-1">
          {filteredPayload.map((entry, idx) => {
            const dataKey = entry.dataKey || '';
            const lastUnderscore = dataKey.indexOf('_');
            const seriesId = lastUnderscore >= 0 ? dataKey.slice(0, lastUnderscore) : '';
            const key = lastUnderscore >= 0 ? dataKey.slice(lastUnderscore + 1) : '';
            const expectedEntry = key ? Object.entries(metricKeys).find(([, metricKey]) => metricKey === key) : null;
            const expected = expectedEntry ? expectedValues[expectedEntry[0]] : null;
            const delta = expected && typeof entry.value === 'number' ? ((entry.value - expected) / expected) * 100 : null;
            const metricLabel = expectedEntry ? parameterRows.find(row => row.id === expectedEntry[0])?.label : formatMetricName(key);
            const seriesLabel = seriesId.startsWith('GRP_') ? seriesId.replace('GRP_', '') : seriesId;
            const labelText = seriesLabel ? `${metricLabel} ${seriesLabel}` : metricLabel;
            return (
              <div key={`${entry.name}-${idx}`} className="flex items-center justify-between gap-2">
                <span className="text-slate-600">{labelText}</span>
                <span className="font-mono text-slate-800">
                  {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                  {delta !== null && <span className="ml-2 text-[10px] text-slate-400">Δ {delta.toFixed(1)}%</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const buildSeries = (metricKey, labelPrefix, stroke, dash, axisId) => {
    if (!metricKey) return [];
    const ids = useGroupReference ? groupIds : bioreactorIds;
    return ids.map(id => {
      const settings = plotSettings?.[id] || {};
      const strokeColor = settings.color || stroke;
      const strokeDasharray = settings.strokeDash && settings.strokeDash !== '0' ? settings.strokeDash : dash;
      return {
        id,
        dataKey: `${id}_${metricKey}`,
        name: labelPrefix,
        stroke: strokeColor,
        strokeDasharray,
        axisId,
        settings
      };
    });
  };

  const ChartContainer = ({ id, title, children }) => (
    <div id={id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h4>
        {xDomain && (
          <button onClick={resetZoom} className="text-[10px] font-bold text-rose-600 hover:text-rose-700">Reset Zoom</button>
        )}
      </div>
      {children}
    </div>
  );

  const renderUspChart = (config) => (
    <ChartContainer key={config.id} id={config.id} title={config.title}>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }} {...syncZoomHandlers}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" type="number" domain={xDomain ? [xDomain.left, xDomain.right] : [minDay, maxRange]} tick={{ fontSize: 10 }} />
          {config.axes.map(axis => (
            <YAxis
              key={axis.id}
              yAxisId={axis.id}
              orientation={axis.orientation}
              tick={{ fontSize: 10 }}
              label={axis.label ? { value: axis.label, angle: -90, position: 'insideRight', offset: 12, fontSize: 10 } : undefined}
              offset={axis.offset}
            />
          ))}
          {stages.map(stage => (
            <ReferenceArea key={stage.id} x1={stage.start} x2={stage.end} fill={stage.color} fillOpacity={0.3} />
          ))}
          {config.referenceBands?.map((band, idx) => (
            <ReferenceArea
              key={`${config.id}-band-${idx}`}
              yAxisId={band.axis}
              y1={band.y1}
              y2={band.y2}
              fill={band.fill}
              fillOpacity={band.fillOpacity}
            />
          ))}
          <Tooltip content={<CustomTooltip />} />
          {config.lines.filter(line => line.key).flatMap(line =>
            buildSeries(line.key, line.label, line.color, line.dash, line.axis).map(series => {
              const isGroup = series.id.startsWith('GRP_');
              return (
                <Line
                  key={`${line.key}-${series.dataKey}`}
                  yAxisId={line.axis}
                  type="monotone"
                  dataKey={series.dataKey}
                  stroke={series.stroke}
                  strokeWidth={isGroup ? 2.5 : 1.5}
                  strokeDasharray={series.strokeDasharray}
                  connectNulls
                  dot={<CustomDot shapeType={series.settings?.shape} isGroup={isGroup} />}
                  activeDot={{ r: isGroup ? 5 : 3 }}
                />
              );
            })
          )}
          {refArea.left && refArea.right && <ReferenceArea x1={refArea.left} x2={refArea.right} strokeOpacity={0.3} />}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">USP Acceptability Assessment</h1>
              <p className="text-xs text-slate-500">Restricted access</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Enter Admin Password</h2>
            <p className="text-xs text-slate-500 mb-6">This dashboard is restricted while in development.</p>
            <div className="space-y-3">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') unlockUspAccess();
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                placeholder="Enter password"
              />
              {passwordError && (
                <p className="text-xs text-rose-600">{passwordError}</p>
              )}
              <button
                type="button"
                onClick={unlockUspAccess}
                className="w-full px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800"
              >
                Unlock Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">USP Acceptability Assessment</h1>
            <p className="text-xs text-slate-500">Rapid viability assessment and critical parameter deviations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-bold shadow-lg shadow-slate-900/10 transition-all"
          >
            <Palette className="w-3.5 h-3.5" /> Style & Config
          </button>
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${acceptanceStatus.bg}`}>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Acceptance</span>
            <div className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${acceptanceStatus.status === 'FAILED' ? 'bg-rose-500' : 'bg-rose-200'}`} />
              <span className={`h-2 w-2 rounded-full ${acceptanceStatus.status === 'WARNING' ? 'bg-amber-500' : 'bg-amber-200'}`} />
              <span className={`h-2 w-2 rounded-full ${acceptanceStatus.status === 'PASSED' ? 'bg-emerald-500' : 'bg-emerald-200'}`} />
            </div>
            <span className={`text-xs font-extrabold ${acceptanceStatus.color}`}>{acceptanceStatus.status}</span>
          </div>
        </div>
      </header>

          <div className="flex flex-1 gap-6 p-6 h-[calc(100vh-88px)]">
        <aside className="w-80 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Parameters</h3>
            <button onClick={exportAssessmentCsv} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">Export CSV</button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-2">
              <span>Variable</span>
              <span className="text-right">Measured</span>
              <span className="text-right">Expected</span>
              <span className="text-right">Δ%</span>
            </div>
            <div className="max-h-[520px] overflow-auto divide-y divide-slate-100 text-xs">
              {parameterRows.map(row => (
                <div key={row.id} className="grid grid-cols-4 px-3 py-2 items-center">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="text-right font-mono text-slate-800">{formatValue(row.measured)}</span>
                  <span className="text-right font-mono text-slate-500">{formatValue(row.expected)}</span>
                  <span className={`text-right font-mono ${deltaClass(row.delta)}`}>{row.delta === null ? '-' : row.delta.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
            <div><strong>Batch ID:</strong> {metadata.runId}</div>
            <div><strong>Date range:</strong> {(metadata.startDate && !isNaN(metadata.startDate.getTime()) ? metadata.startDate.toDateString() : '-')} - {(metadata.endDate && !isNaN(metadata.endDate.getTime()) ? metadata.endDate.toDateString() : '-')}</div>
            <div><strong>Out-of-spec:</strong> {parameterRows.filter(row => row.delta !== null && Math.abs(row.delta) > 10).map(row => row.label).join(', ') || 'None'}</div>
          </div>
          <div className="space-y-2">
            <button onClick={exportAllCharts} className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800">Export Charts (PNG)</button>
            <button onClick={generateReport} className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Generate PDF Report</button>
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Time Range</span>
              <input
                type="number"
                min={minDay}
                max={maxRange}
                value={xDomain ? xDomain.left : minDay}
                onChange={(e) => setXDomain(prev => ({ left: Number(e.target.value), right: prev?.right ?? maxRange }))}
                className="w-16 border border-slate-200 rounded px-2 py-1 text-xs"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="number"
                min={minDay}
                max={maxRange}
                value={xDomain ? xDomain.right : maxRange}
                onChange={(e) => setXDomain(prev => ({ left: prev?.left ?? minDay, right: Number(e.target.value) }))}
                className="w-16 border border-slate-200 rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Plot Mode</span>
              <button
                onClick={() => setUseGroupReference(false)}
                className={`text-[10px] px-2 py-1 rounded border ${!useGroupReference ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                Show Plots based on Bioreactors
              </button>
              <button
                onClick={() => setUseGroupReference(true)}
                className={`text-[10px] px-2 py-1 rounded border ${useGroupReference ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                Show Plots based on Group Reference
              </button>
              <button
                onClick={() => setShowUspDataTable(prev => !prev)}
                className="text-[10px] px-2 py-1 rounded border bg-white border-slate-200 text-slate-500 hover:text-rose-600"
              >
                {showUspDataTable ? 'Hide Data Table' : 'Show Data Table'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            {uspChartConfigs.map(renderUspChart)}
          </div>
          {showUspDataTable && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Acceptability Assessment Data Table</h3>
                <button
                  onClick={() => setShowUspDataTable(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3 border-b border-slate-200 w-28">Bioreactor</th>
                      <th className="p-3 border-b border-slate-200 w-20">Day</th>
                      {uspTableMetrics.map(metric => (
                        <th key={metric.key} className="p-3 border-b border-slate-200 whitespace-nowrap">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chartData.flatMap(entry => (
                      bioreactorIds.map(brId => (
                        <tr key={`${brId}_${entry.day}`} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-700 font-bold border-r border-slate-100 bg-slate-50/30">{brId}</td>
                          <td className="p-3 font-mono text-slate-600 font-bold border-r border-slate-100 bg-slate-50/30">{entry.day}</td>
                          {uspTableMetrics.map(metric => {
                            const value = entry[`${brId}_${metric.key}`];
                            return (
                              <td key={`${brId}_${entry.day}_${metric.key}`} className="p-3 font-mono text-slate-700">
                                {value !== undefined && value !== null ? Number(value).toFixed(2) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
      {isPaletteOpen && (
        <StyleEditor
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          groups={groups || {}}
          bioreactors={initialData?.bioreactors || {}}
          settings={plotSettings}
          updateSettings={updateSetting}
          updateConditionGroup={updateConditionGroup}
          stages={stages}
          updateStage={updateStage}
          customRefGroups={[]}
          updateCustomRefGroups={() => {}}
        />
      )}
    </div>
  );
};

// --- FEATURE 3: STATISTICAL ANALYTICS (5 Tabs) ---
const StatisticalAnalytics = ({ onBack, initialData, exclusions, reportDraft, setReportDraft, addToReportDraft, updateReportDraftChart, removeReportDraftChart, clearReportDraft, batchOperations = [] }) => {
  const [activeTab, setActiveTab] = useState("ivcd");
  const [selectedBio, setSelectedBio] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [comparisonMetric, setComparisonMetric] = useState("");
  const [selectedBioreactors, setSelectedBioreactors] = useState([]);
  const [showRegressionLines, setShowRegressionLines] = useState(true);
  const [showIvcdLines, setShowIvcdLines] = useState(true);

  const bioreactors = useMemo(() => parseBioreactorData(initialData, exclusions), [initialData, exclusions]);
  const conditionGroups = useMemo(() => groupByCondition(bioreactors), [bioreactors]);
  const allMetrics = useMemo(() => {
    if (Object.keys(bioreactors).length === 0) return [];
    const metricSet = new Set();
    Object.values(bioreactors).forEach(br => {
      Object.keys(br.allSeries || {}).forEach(metric => {
        if (!shouldExcludeSeries(metric)) {
          metricSet.add(metric);
        }
      });
    });
    return sortMetricsByPriority(Array.from(metricSet));
  }, [bioreactors]);

  // Dynamic color map built from actual condition names
  const conditionColorPalette = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#4f46e5', '#ca8a04'];
  const conditionColorMap = useMemo(() => {
    const map = {};
    Object.keys(conditionGroups).forEach((cond, i) => {
      map[cond] = conditionColorPalette[i % conditionColorPalette.length];
    });
    return map;
  }, [conditionGroups]);
  // alias for backwards-compat code that used `colors`
  const colors = conditionColorMap;
  const dashArrays = useMemo(() => {
    const dashes = ['8 4', '4 4', '0', '2 6', '12 3'];
    const map = {};
    Object.keys(conditionGroups).forEach((cond, i) => { map[cond] = dashes[i % dashes.length]; });
    return map;
  }, [conditionGroups]);

  const metricsByCategory = useMemo(() => {
    const grouped = {};
    allMetrics.forEach(metric => {
      const category = getMetricCategory(metric);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(metric);
    });
    return grouped;
  }, [allMetrics]);

  // Auto-initialize selected metrics once we have data
  useEffect(() => {
    if (allMetrics.length === 0) return;
    setSelectedMetric(prev => {
      if (prev && allMetrics.includes(prev)) return prev;
      return allMetrics.find(m => m.includes('gluc') || m.includes('viable')) || allMetrics[0];
    });
    setComparisonMetric(prev => {
      if (prev && allMetrics.includes(prev)) return prev;
      return allMetrics.find(m => m.includes('igg') || m.includes('ldh') || m.includes('nh3')) || allMetrics[1] || allMetrics[0];
    });
  }, [allMetrics]);

  // Auto-initialize bioreactor selections
  useEffect(() => {
    const brIds = Object.keys(bioreactors);
    if (brIds.length > 0 && !selectedBio) setSelectedBio(brIds[0]);
    if (brIds.length > 0 && selectedBioreactors.length === 0) setSelectedBioreactors(brIds);
  }, [bioreactors]);

  const renderMetricOptions = () => {
    return METRIC_CATEGORY_ORDER.filter(category => metricsByCategory[category]?.length).map(category => (
      <optgroup key={category} label={category}>
        {metricsByCategory[category].map(metric => (
          <option key={metric} value={metric}>
            {formatMetricName(metric)}
          </option>
        ))}
      </optgroup>
    ));
  };

  // Control Chart Data
  const controlChartData = useMemo(() => {
    if (!selectedBio || !selectedMetric || !bioreactors[selectedBio]) return { data: [], stats: { mean: 0, std: 0 } };
    const br = bioreactors[selectedBio];
    const values = br.allSeries[selectedMetric]?.filter((v, i) => br.cultureDays[i] !== null && v !== null) || [];
    const days = br.cultureDays;
    const data = days.map((day, i) => ({ time: day, value: br.allSeries[selectedMetric]?.[i] })).filter(d => d.value !== null);
    const stats = calculateStats(values);
    return { data, stats };
  }, [selectedBio, selectedMetric, bioreactors]);

  // Comparison Data (all bioreactors, keyed by actual culture day)
  const comparisonData = useMemo(() => {
    if (!selectedMetric) return [];
    const allDays = new Set();
    selectedBioreactors.forEach(id => {
      const br = bioreactors[id];
      if (br) br.cultureDays.forEach(d => { if (d != null) allDays.add(d); });
    });
    const sortedDays = Array.from(allDays).sort((a, b) => a - b);
    return sortedDays.map(day => {
      const point = { time: day };
      selectedBioreactors.forEach(id => {
        const br = bioreactors[id];
        if (!br) return;
        const idx = br.cultureDays.indexOf(day);
        if (idx !== -1) {
          const val = br.allSeries[selectedMetric]?.[idx];
          if (val != null) point[id] = val;
        }
      });
      return point;
    });
  }, [bioreactors, selectedMetric, selectedBioreactors]);

  // Regression Data
  const regressionData = useMemo(() => {
    if (!selectedBio || !selectedMetric || !comparisonMetric) return { data: [], stats: { slope: 0, intercept: 0, rSquared: 0 } };
    const br = bioreactors[selectedBio];
    const xArr = br.allSeries[selectedMetric] || [];
    const yArr = br.allSeries[comparisonMetric] || [];
    const data = xArr.map((x, i) => ({ x, y: yArr[i] })).filter(p => p.x != null && p.y != null);
    const stats = linearRegression(data.map(p => p.x), data.map(p => p.y)) || { slope: 0, intercept: 0, rSquared: 0 };
    return { data, stats };
  }, [selectedBio, selectedMetric, comparisonMetric, bioreactors]);

  // IVCD Analysis
  const ivcdChartData = useMemo(() => {
    const scatterPoints = [];
    const conditionPoints = {};
    const linePoints = {};

    Object.values(bioreactors).filter(br => selectedBioreactors.includes(br.id)).forEach(br => {
      if (!conditionPoints[br.condition]) conditionPoints[br.condition] = { ivcd: [], titer: [] };
      if (!linePoints[br.condition]) linePoints[br.condition] = [];
      br.cultureDays.forEach((day, i) => {
        const titerVal = br.proteinA[i] || br.titer[i];
        if (titerVal !== null && br.ivcd[i] > 0) {
          const ivcdValue = br.ivcd[i] / 1000;
          const titerValue = titerVal / 1000;
          scatterPoints.push({ ivcd: ivcdValue, titer: titerValue, bioreactor: br.id, condition: br.condition, day: day });
          conditionPoints[br.condition].ivcd.push(ivcdValue);
          conditionPoints[br.condition].titer.push(titerValue);
          linePoints[br.condition].push({ ivcd: ivcdValue, titer: titerValue, day, bioreactor: br.id });
        }
      });
    });

    Object.keys(linePoints).forEach(condition => {
      linePoints[condition].sort((a, b) => a.day - b.day);
    });

    const stats = {};
    Object.keys(conditionPoints).forEach(condition => {
      const { ivcd, titer } = conditionPoints[condition];
      if (ivcd.length > 2) {
        const regression = linearRegression(ivcd, titer);
        if (regression) stats[condition] = regression;
      }
    });

    const regressionLines = {};
    Object.keys(stats).forEach(condition => {
      const { slope, intercept } = stats[condition];
      const conditionData = scatterPoints.filter(p => p.condition === condition);
      if (conditionData.length > 0) {
        const minIVCD = Math.min(...conditionData.map(p => p.ivcd));
        const maxIVCD = Math.max(...conditionData.map(p => p.ivcd));
        regressionLines[condition] = [];
        for (let i = 0; i <= 50; i++) {
          const ivcd = minIVCD + (maxIVCD - minIVCD) * (i / 50);
          regressionLines[condition].push({ ivcd, [`${condition}_regression`]: slope * ivcd + intercept, condition });
        }
      }
    });

    return { scatterPoints, regressionLines, stats, linePoints };
  }, [bioreactors, selectedBioreactors]);

  const ivcdTimeSeries = useMemo(() => {
    const days = new Set();
    selectedBioreactors.forEach(id => {
      const br = bioreactors[id];
      if (!br) return;
      br.cultureDays.forEach(day => {
        if (day !== null && day !== undefined) {
          days.add(day);
        }
      });
    });
    const sortedDays = Array.from(days).sort((a, b) => a - b);
    return sortedDays.map(day => {
      const entry = { day };
      selectedBioreactors.forEach(id => {
        const br = bioreactors[id];
        if (!br) return;
        const idx = br.cultureDays.indexOf(day);
        if (idx !== -1 && br.ivcd[idx] !== null && br.ivcd[idx] !== undefined) {
          entry[id] = br.ivcd[idx] / 1000;
        }
      });
      return entry;
    });
  }, [bioreactors, selectedBioreactors]);

  const toggleBioreactor = (id) => setSelectedBioreactors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleCondition = (condition) => {
    const brsInCondition = conditionGroups[condition].map(br => br.id);
    const allSelected = brsInCondition.every(id => selectedBioreactors.includes(id));
    setSelectedBioreactors(prev => allSelected ? prev.filter(id => !brsInCondition.includes(id)) : [...new Set([...prev, ...brsInCondition])]);
  };

  const selectedCountByCondition = useMemo(() => {
    const counts = {};
    Object.entries(conditionGroups).forEach(([condition, brs]) => {
      counts[condition] = brs.filter(br => selectedBioreactors.includes(br.id)).length;
    });
    return counts;
  }, [conditionGroups, selectedBioreactors]);

  // ── Report Generation Builder State ──────────────────────────────
  const reportDefaultColors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#4f46e5', '#ca8a04', '#be123c', '#15803d', '#ec4899', '#8b5cf6'];
  const [reportCharts, setReportCharts] = useState([]);
  const [reportEditIdx, setReportEditIdx] = useState(null);
  const [reportStep, setReportStep] = useState('variables'); // 'variables' | 'configure' | 'preview'
  const [reportTitle, setReportTitle] = useState('Experiment Report');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportSelectedVars, setReportSelectedVars] = useState([]);
  const [reportActivePreset, setReportActivePreset] = useState(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportGenStatus, setReportGenStatus] = useState(null); // null | 'generating' | 'completed' | 'warnings' | 'failed'
  const [reportGenWarnings, setReportGenWarnings] = useState([]);
  const [reportDragIdx, setReportDragIdx] = useState(null);
  const [reportUserTemplates, setReportUserTemplates] = useState(() => {
    try { const s = localStorage.getItem('report_user_templates'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [reportSaveDialogOpen, setReportSaveDialogOpen] = useState(false);
  const [reportTemplateName, setReportTemplateName] = useState('');
  const [reportStyleScope, setReportStyleScope] = useState('current'); // current | global
  const [reportGlobalPanelConfig, setReportGlobalPanelConfig] = useState({});
  const [reportShowChartList, setReportShowChartList] = useState(true);
  const [reportShowChartSetup, setReportShowChartSetup] = useState(true);
  const reportEmptyChart = { title: '', yMetrics: [], xAxis: 'day', chartType: 'line', yMin: '', yMax: '', xMin: '', xMax: '', bioreactors: [], groupingMode: 'bioreactor', showLegend: true, showGrid: true, showPoints: true, showLines: true, styleMode: 'auto', annotations: false, showStages: false, showOperations: false, stages: [], enableDualAxis: false, panelConfig: {}, source: 'manual', createdAt: null };

  const renderMarkerShape = (marker, color, cx, cy, size = 5) => {
    if (cx == null || cy == null) return null;
    const half = size / 2;
    if (marker === 'square') {
      return <rect x={cx - half} y={cy - half} width={size} height={size} fill={color} stroke={color} />;
    }
    if (marker === 'triangle') {
      const p1 = `${cx},${cy - half}`;
      const p2 = `${cx - half},${cy + half}`;
      const p3 = `${cx + half},${cy + half}`;
      return <polygon points={`${p1} ${p2} ${p3}`} fill={color} stroke={color} />;
    }
    if (marker === 'diamond') {
      const p1 = `${cx},${cy - half}`;
      const p2 = `${cx - half},${cy}`;
      const p3 = `${cx},${cy + half}`;
      const p4 = `${cx + half},${cy}`;
      return <polygon points={`${p1} ${p2} ${p3} ${p4}`} fill={color} stroke={color} />;
    }
    return <circle cx={cx} cy={cy} r={Math.max(2, half)} fill={color} stroke={color} />;
  };

  const getDotRenderer = (chart, id, color) => ({ cx, cy }) => {
    const marker = getEffectivePanelConfig(chart, id)?.marker || 'circle';
    return renderMarkerShape(marker, color, cx, cy, 6);
  };


  const getEffectivePanelConfig = (chart, brId) => {
    const local = chart?.panelConfig?.[brId] || {};
    const global = reportGlobalPanelConfig?.[brId] || {};
    return { ...global, ...local };
  };

  const updatePanelConfig = (chartIdx, brId, key, value) => {
    if (reportStyleScope === 'global') {
      setReportGlobalPanelConfig(prev => ({
        ...prev,
        [brId]: { ...(prev[brId] || {}), [key]: value }
      }));
      return;
    }
    const chart = reportCharts[chartIdx];
    const local = chart?.panelConfig?.[brId] || {};
    const updated = { ...(chart?.panelConfig || {}), [brId]: { ...local, [key]: value } };
    updateReportChart(chartIdx, 'panelConfig', updated);
  };

  // Load from shared reportDraft when charts are empty and draft has content
  useEffect(() => {
    if (reportCharts.length === 0 && reportDraft?.charts?.length > 0 && reportStep === 'variables') {
      setReportCharts(reportDraft.charts.map(c => ({ ...reportEmptyChart, ...c })));
      setReportTitle(reportDraft.title || 'Experiment Report');
      setReportStep('configure');
      setReportEditIdx(0);
    }
  }, []);

  // Report Presets
  const REPORT_PRESETS = [
    { id: 'standard', name: 'Standard Process Report', icon: '📋', description: 'Complete overview of cell growth, metabolites, and product', vars: ['viable_cells', 'viab', 'gluc', 'lac', 'gln', 'nh4', 'igg', 'ph', 'protein_a'] },
    { id: 'cell_growth', name: 'Cell Growth & Viability', icon: '🧬', description: 'VCD, TCD, viability, and growth rate', vars: ['viable_cells', 'total_cells', 'viab', 'mu'] },
    { id: 'metabolites', name: 'Metabolites Panel', icon: '⚗️', description: 'Glucose, lactate, glutamine, ammonium, osmolarity', vars: ['gluc', 'lac', 'gln', 'glu', 'nh4', 'osm'] },
    { id: 'product', name: 'Product / Titer Overview', icon: '🎯', description: 'IgG, Protein A HPLC, specific productivity', vars: ['igg', 'protein_a', 'spec_prod'] },
    { id: 'process', name: 'pH / Gas / Control', icon: '🔬', description: 'pH, DO, pCO2, temperature monitoring', vars: ['ph', 'ph_offline', 'po2_offline', 'pco2_offline'] },
  ];

  // Variable categories for quick-filter chips
  const VAR_CATEGORIES = [
    { id: 'cell_growth', label: 'Cell Growth', patterns: ['viable', 'total_cell', 'viab', 'vcd', 'tcd', 'diam', 'mu', 'ivca'] },
    { id: 'metabolites', label: 'Metabolites', patterns: ['gluc', 'lac', 'gln', 'glu', 'nh4', 'nh3', 'osm', 'asn', 'asp'] },
    { id: 'product', label: 'Product', patterns: ['igg', 'protein_a', 'hplc', 'titer', 'spec_prod', 'ldh'] },
    { id: 'process', label: 'Process', patterns: ['ph', 'do_pct', 'po2', 'pco2', 'temp', 'agit', 'volume'] },
    { id: 'feeds', label: 'Feeds', patterns: ['feed', 'base', 'titrant', 'antifoam', 'subst'] },
  ];
  const [reportActiveCategory, setReportActiveCategory] = useState(null);

  const filteredReportVars = useMemo(() => {
    let vars = allMetrics;
    if (reportSearchTerm) {
      const term = reportSearchTerm.toLowerCase();
      vars = vars.filter(m => m.toLowerCase().includes(term) || formatMetricName(m).toLowerCase().includes(term));
    }
    if (reportActiveCategory) {
      const cat = VAR_CATEGORIES.find(c => c.id === reportActiveCategory);
      if (cat) vars = vars.filter(m => cat.patterns.some(p => m.toLowerCase().includes(p)));
    }
    return vars;
  }, [allMetrics, reportSearchTerm, reportActiveCategory]);

  const toggleReportVar = (metric) => {
    setReportSelectedVars(prev => prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]);
  };

  const applyReportPreset = (preset) => {
    setReportActivePreset(preset.id);
    const matchedVars = [];
    preset.vars.forEach(pattern => {
      const found = allMetrics.find(m => m.toLowerCase().includes(pattern));
      if (found && !matchedVars.includes(found)) matchedVars.push(found);
    });
    setReportSelectedVars(matchedVars);
  };

  const generateChartsFromVars = () => {
    const newCharts = reportSelectedVars.map((metric) => ({
      ...reportEmptyChart,
      title: formatMetricName(metric),
      yMetrics: [metric],
      bioreactors: Object.keys(bioreactors).slice(0, 8),
    }));
    setReportCharts(prev => {
      const existingMetrics = new Set(prev.map(c => c.yMetrics?.[0]).filter(Boolean));
      const deduped = newCharts.filter(c => !existingMetrics.has(c.yMetrics?.[0]));
      const merged = [...prev, ...deduped];
      if (merged.length > 0) setReportEditIdx(prev.length > 0 ? prev.length : 0);
      return merged;
    });
    setReportStep('configure');
  };

  const addReportChart = () => {
    const firstMetric = allMetrics[0] || '';
    const newChart = { ...reportEmptyChart, title: `Chart ${reportCharts.length + 1}`, yMetrics: [firstMetric], bioreactors: Object.keys(bioreactors).slice(0, 6) };
    setReportCharts(prev => [...prev, newChart]);
    setReportEditIdx(reportCharts.length);
  };

  const duplicateReportChart = (idx) => {
    const copy = { ...reportCharts[idx], title: reportCharts[idx].title + ' (copy)' };
    setReportCharts(prev => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    setReportEditIdx(idx + 1);
  };

  const updateReportChart = (idx, key, value) => {
    setReportCharts(prev => prev.map((c, i) => i === idx ? { ...c, [key]: value } : c));
  };

  const removeReportChart = (idx) => {
    setReportCharts(prev => prev.filter((_, i) => i !== idx));
    if (reportEditIdx === idx) setReportEditIdx(null);
    else if (reportEditIdx > idx) setReportEditIdx(reportEditIdx - 1);
  };

  const moveReportChart = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= reportCharts.length) return;
    const arr = [...reportCharts];
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    setReportCharts(arr);
    if (reportEditIdx === fromIdx) setReportEditIdx(toIdx);
  };

  const getReportChartData = (chartConfig) => {
    const metric = chartConfig.yMetrics?.[0] || chartConfig.yMetric;
    if (!metric || chartConfig.bioreactors.length === 0) return [];
    const allDays = new Set();
    chartConfig.bioreactors.forEach(id => {
      const br = bioreactors[id];
      if (br) br.cultureDays.forEach(d => { if (d != null) allDays.add(d); });
    });
    const sortedDays = Array.from(allDays).sort((a, b) => a - b);
    return sortedDays.map(day => {
      const point = { day };
      chartConfig.bioreactors.forEach(id => {
        const br = bioreactors[id];
        if (!br) return;
        const idx = br.cultureDays.indexOf(day);
        if (idx !== -1) {
          const val = br.allSeries[metric]?.[idx];
          if (val != null) point[id] = val;
        }
      });
      return point;
    });
  };

  const saveReportTemplate = () => {
    if (!reportTemplateName.trim()) return;
    const template = { id: Date.now().toString(), name: reportTemplateName, createdAt: new Date().toISOString(), charts: reportCharts, title: reportTitle };
    const updated = [...reportUserTemplates, template];
    setReportUserTemplates(updated);
    try { localStorage.setItem('report_user_templates', JSON.stringify(updated)); } catch {}
    setReportSaveDialogOpen(false);
    setReportTemplateName('');
  };

  const loadReportTemplate = (template) => {
    setReportCharts(template.charts || []);
    setReportTitle(template.title || 'Experiment Report');
    setReportStep('configure');
    if (template.charts?.length > 0) setReportEditIdx(0);
  };

  const deleteReportTemplate = (id) => {
    const updated = reportUserTemplates.filter(t => t.id !== id);
    setReportUserTemplates(updated);
    try { localStorage.setItem('report_user_templates', JSON.stringify(updated)); } catch {}
  };

  // Sync local reportCharts to shared reportDraft
  useEffect(() => {
    if (reportCharts.length > 0 && setReportDraft) {
      setReportDraft(prev => ({ ...prev, charts: reportCharts, title: reportTitle, updatedAt: new Date().toISOString() }));
    }
  }, [reportCharts, reportTitle]);

  const generateReport = async () => {
    setReportGenerating(true);
    setReportGenStatus('generating');
    setReportGenWarnings([]);
    // Simulate generation delay
    await new Promise(r => setTimeout(r, 800));
    const warnings = [];
    reportCharts.forEach((chart, idx) => {
      const data = getReportChartData(chart);
      if (data.length === 0) warnings.push(`Chart ${idx + 1}: "${chart.title}" — No data available`);
    });
    if (warnings.length === reportCharts.length && reportCharts.length > 0) {
      setReportGenStatus('failed');
    } else if (warnings.length > 0) {
      setReportGenStatus('warnings');
    } else {
      setReportGenStatus('completed');
    }
    setReportGenWarnings(warnings);
    setReportGenerating(false);
    setReportStep('preview');
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const chartsHtml = reportCharts.map((chart, idx) => {
      const canvas = document.getElementById(`report-chart-${idx}`);
      const svgEl = canvas?.querySelector('svg');
      const svgHtml = svgEl ? svgEl.outerHTML : '<p style="color:#94a3b8;font-style:italic;">No data available for this chart</p>';
      return `<div style="page-break-inside:avoid;margin-bottom:32px;"><h3 style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px;">${chart.title || 'Chart ' + (idx+1)}</h3><div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:white;">${svgHtml}</div></div>`;
    }).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${reportTitle}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:40px;color:#1e293b;max-width:900px;margin:0 auto;}h1{font-size:24px;margin-bottom:4px;}h2{font-size:14px;color:#64748b;font-weight:400;margin-bottom:24px;}.meta{display:flex;gap:24px;font-size:12px;color:#64748b;margin-bottom:32px;padding:12px;background:#f8fafc;border-radius:8px;}svg{max-width:100%;height:auto;}@media print{body{padding:20px;}}</style></head><body><h1>${reportTitle}</h1><h2>Experiment: ${initialData?.run?.run_id || 'N/A'}</h2><div class="meta"><span>Generated: ${new Date().toLocaleDateString()}</span><span>Charts: ${reportCharts.length}</span><span>Bioreactors: ${Object.keys(bioreactors).length}</span></div>${chartsHtml}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Statistical Analytics and Reports</h1>
            <p className="text-xs text-slate-500 mt-1">Run: {initialData?.run?.run_id || 'Data Loaded'} | Advanced Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg">
          {[
            { id: 'ivcd', label: 'IVCD Analysis', icon: TrendingUp },
            { id: 'control', label: 'Control Chart', icon: Activity },
            { id: 'compare', label: 'Compare All', icon: Maximize2 },
            { id: 'regression', label: 'Regression', icon: Calculator },
            { id: 'stats', label: 'Summary', icon: FileText },
            { id: 'report', label: 'Report Builder', icon: LayoutDashboard, badge: reportDraft?.charts?.length || reportCharts.length || 0 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge > 0 && <span className="bg-indigo-100 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        {activeTab === 'ivcd' ? (
          <div className="grid grid-cols-12 gap-6 h-full max-w-7xl mx-auto">
            <aside className="col-span-3 bg-white rounded-2xl shadow-xl p-6 border border-slate-200 h-full overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Select Bioreactors
              </h3>
              <div className="space-y-4">
                {Object.entries(conditionGroups).map(([condition, brs]) => {
                  const allSelected = brs.every(br => selectedBioreactors.includes(br.id));
                  const selectedCount = selectedCountByCondition[condition];
                  const hasRegression = ivcdChartData.stats[condition] !== undefined;
                  return (
                    <div key={condition} className="border-2 border-slate-200 rounded-lg p-3" style={{ borderColor: selectedCount > 0 ? colors[condition] : '#e2e8f0' }}>
                      <div onClick={() => toggleCondition(condition)} className="flex items-center gap-3 cursor-pointer mb-3 pb-2 border-b border-slate-100">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${allSelected ? 'border-transparent' : 'border-slate-300'}`} style={{ backgroundColor: allSelected ? colors[condition] : 'transparent' }}>
                          {allSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">{condition}</div>
                          <div className="text-xs text-slate-500">{selectedCount}/{brs.length} selected {hasRegression && <span className="ml-2 text-green-600">? Regression</span>}</div>
                        </div>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors[condition] || '#94a3b8' }} />
                      </div>
                      <div className="space-y-1 ml-2">
                        {brs.map(br => {
                          const isSelected = selectedBioreactors.includes(br.id);
                          return (
                            <div key={br.id} onClick={() => toggleBioreactor(br.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${isSelected ? 'border border-slate-300 shadow-sm' : 'hover:bg-slate-50'}`} style={{ backgroundColor: isSelected ? `${colors[condition]}15` : 'transparent' }}>
                              <div className={`w-3 h-3 rounded-full border-2`} style={{ backgroundColor: isSelected ? colors[condition] : 'transparent', borderColor: isSelected ? colors[condition] : '#cbd5e1' }} />
                              <span className="text-sm font-mono text-slate-700">{br.id}</span>
                              {isSelected ? <Eye className="w-3 h-3 text-slate-400 ml-auto" /> : <EyeOff className="w-3 h-3 text-slate-300 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <span className="text-sm font-semibold text-slate-700">Show QP Line</span>
                  <button onClick={() => setShowIvcdLines(!showIvcdLines)} className="text-slate-500 hover:text-rose-600">
                    {showIvcdLines ? <ToggleRight className="w-5 h-5 text-rose-600" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <span className="text-sm font-semibold text-slate-700">Show Linear QP</span>
                  <button onClick={() => setShowRegressionLines(!showRegressionLines)} className="text-slate-500 hover:text-rose-600">
                    {showRegressionLines ? <ToggleRight className="w-5 h-5 text-rose-600" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </aside>
            <main className="col-span-9 bg-white rounded-2xl shadow-xl p-6 border border-slate-200 flex flex-col overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                IgG Titer vs IVCD — qP &amp; Linear QP
                <span className="ml-2 text-sm font-normal text-slate-400">({ivcdChartData.scatterPoints.length} data points)</span>
              </h2>
              {ivcdChartData.scatterPoints.length === 0 && (
                <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    <strong>IVCD analysis requires Viable Cell Concentration (VCC) data.</strong> Your dataset (CEDEX BIO HT) contains metabolite and titer measurements but no VCC series, so this scatter plot will be empty.
                    The <strong>IgG vs Day</strong> chart below uses your available titer data instead.
                  </p>
                </div>
              )}
              <div className="flex-1 min-h-0" style={{ minHeight: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" dataKey="ivcd" domain={[0, 'auto']} label={{ value: 'IVCD (10? cells·day·mL??)', position: 'insideBottom', offset: -10, style: { fontSize: 12, fontWeight: 600, fill: '#64748b' } }} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis type="number" domain={[0, 'auto']} label={{ value: 'Protein titer (g/L)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12, fontWeight: 600, fill: '#64748b' } }} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                    {Object.entries(conditionGroups).map(([condition, brs]) => {
                      const conditionData = ivcdChartData.scatterPoints.filter(p => p.condition === condition);
                      if (conditionData.length === 0) return null;
                      return <Scatter key={`scatter-${condition}`} name={`${condition} (${conditionData.length} pts)`} data={conditionData} dataKey="titer" fill={colors[condition] || '#000000'} shape="circle" />;
                    })}
                    {showIvcdLines && Object.entries(ivcdChartData.linePoints).map(([condition, lineData]) => {
                      if (lineData.length === 0) return null;
                      return <Line key={`qp-${condition}`} type="monotone" data={lineData} dataKey="titer" name={`${condition} (QP)`} stroke={colors[condition] || '#000000'} strokeWidth={1.5} dot={false} />;
                    })}
                    {showRegressionLines && Object.entries(ivcdChartData.regressionLines).map(([condition, lineData]) => {
                      if (lineData.length === 0) return null;
                      return <Line key={`line-${condition}`} type="monotone" data={lineData} dataKey={`${condition}_regression`} name={`${condition} (trend)`} stroke={colors[condition] || '#000000'} strokeWidth={2} strokeDasharray={dashArrays[condition] || '0'} dot={false} legendType="line" />;
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 h-64">
                <h3 className="text-sm font-bold text-slate-800 mb-2">
                  {(() => {
                    const titerKey = allMetrics.find(m => m.includes('igg') || m.includes('protein_a') || m.includes('titer'));
                    return titerKey ? `${formatMetricName(titerKey)} vs Culture Day` : 'IVCD vs Day';
                  })()}
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    const titerKey = allMetrics.find(m => m.includes('igg') || m.includes('protein_a') || m.includes('titer'));
                    if (titerKey) {
                      // Build day-indexed data for titer
                      const allDays = new Set();
                      selectedBioreactors.forEach(id => { bioreactors[id]?.cultureDays?.forEach(d => allDays.add(d)); });
                      const sortedDays = Array.from(allDays).sort((a, b) => a - b);
                      const titerData = sortedDays.map(day => {
                        const pt = { day };
                        selectedBioreactors.forEach(id => {
                          const br = bioreactors[id];
                          if (!br) return;
                          const idx = br.cultureDays.indexOf(day);
                          if (idx !== -1) {
                            const val = br.allSeries[titerKey]?.[idx];
                            if (val != null) pt[id] = val;
                          }
                        });
                        return pt;
                      });
                      return (
                        <LineChart data={titerData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="day" type="number" tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Culture Day', position: 'insideBottom', offset: -10, style: { fontSize: 11, fontWeight: 600, fill: '#64748b' } }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: formatMetricName(titerKey), angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fontWeight: 600, fill: '#64748b' } }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          {selectedBioreactors.map(id => (
                            <Line key={id} type="monotone" dataKey={id} name={id} stroke={colors[bioreactors[id]?.condition] || conditionColorPalette[selectedBioreactors.indexOf(id) % conditionColorPalette.length]} strokeWidth={1.5} dot={{ r: 3 }} connectNulls />
                          ))}
                        </LineChart>
                      );
                    }
                    return (
                      <LineChart data={ivcdTimeSeries} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" type="number" tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Culture Day', position: 'insideBottom', offset: -10, style: { fontSize: 11, fontWeight: 600, fill: '#64748b' } }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'IVCD (10⁶ cells·day/mL)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fontWeight: 600, fill: '#64748b' } }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        {selectedBioreactors.map(id => (
                          <Line key={id} type="monotone" dataKey={id} name={id} stroke={colors[bioreactors[id]?.condition] || '#64748b'} strokeWidth={1.5} dot={false} />
                        ))}
                      </LineChart>
                    );
                  })()}
                </ResponsiveContainer>
              </div>
              {Object.keys(ivcdChartData.stats).length > 0 && (
                <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 shrink-0">
                  <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><Info className="w-5 h-5" />Dynamic Regression Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(ivcdChartData.stats).map(([condition, stats]) => {
                      const pointCount = ivcdChartData.scatterPoints.filter(p => p.condition === condition).length;
                      return (
                        <div key={condition} className="bg-white p-4 rounded-lg border-2 shadow-sm" style={{ borderColor: colors[condition] || '#e2e8f0' }}>
                          <div className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors[condition] || '#000000' }} />
                            {condition}
                            <span className="ml-auto text-xs text-slate-500">n={pointCount}</span>
                          </div>
                          <div className="text-xs space-y-2 text-slate-700">
                            <div className="flex justify-between"><strong>Slope (qP):</strong><span className="font-mono">{stats.slope.toFixed(4)}</span></div>
                            <div className="flex justify-between"><strong>Intercept:</strong><span className="font-mono">{stats.intercept.toFixed(4)}</span></div>
                            <div className="flex justify-between"><strong>R?:</strong><span className="font-mono font-bold" style={{ color: stats.rSquared > 0.95 ? '#16a34a' : stats.rSquared > 0.8 ? '#d97706' : '#dc2626' }}>{stats.rSquared.toFixed(4)}</span></div>
                            <div className="pt-2 mt-2 border-t border-slate-200"><div className="font-mono text-[10px] bg-slate-50 p-2 rounded text-center">y = {stats.slope.toFixed(2)}x + {stats.intercept.toFixed(2)}</div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </main>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Metric</label>
                <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {renderMetricOptions()}
                </select>
              </div>
              {activeTab !== 'compare' && activeTab !== 'stats' && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Bioreactor</label>
                  <select value={selectedBio} onChange={(e) => setSelectedBio(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.keys(bioreactors).map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </div>
              )}
              {activeTab === 'regression' && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Y Axis</label>
                  <select value={comparisonMetric} onChange={(e) => setComparisonMetric(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {renderMetricOptions()}
                  </select>
                </div>
              )}
            </div>

            {activeTab === 'control' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mean (CL)</p>
                    <p className="text-2xl font-bold mt-1 text-slate-600">{controlChartData.stats.mean.toFixed(3)}</p>
                    <p className="text-xs text-slate-400 mt-1">Center Line</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Std Dev (?)</p>
                    <p className="text-2xl font-bold mt-1 text-slate-600">{controlChartData.stats.std.toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">UCL (+3?)</p>
                    <p className="text-2xl font-bold mt-1 text-rose-600">{(controlChartData.stats.mean + 3 * controlChartData.stats.std).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">LCL (-3?)</p>
                    <p className="text-2xl font-bold mt-1 text-rose-600">{(controlChartData.stats.mean - 3 * controlChartData.stats.std).toFixed(3)}</p>
                  </div>
                </div>
                <div className="h-[400px] w-full bg-white p-4 rounded-lg border border-slate-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={controlChartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" type="number" label={{ value: 'Culture Day', position: 'insideBottomRight', offset: -10 }} domain={['auto', 'auto']} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis domain={['auto', 'auto']} label={{ value: formatMetricName(selectedMetric), angle: -90, position: 'insideLeft' }} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <ReferenceLine y={controlChartData.stats.mean} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Mean', fill: '#10b981', fontSize: 12 }} />
                      <ReferenceLine y={controlChartData.stats.mean + 3 * controlChartData.stats.std} stroke="#ef4444" label={{ value: 'UCL', fill: '#ef4444', fontSize: 12 }} />
                      <ReferenceLine y={controlChartData.stats.mean - 3 * controlChartData.stats.std} stroke="#ef4444" label={{ value: 'LCL', fill: '#ef4444', fontSize: 12 }} />
                      <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} name={`${selectedBio} Data`} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800 border border-blue-100 flex gap-2">
                  <AlertCircle size={16} className="mt-0.5" />
                  <p><strong>Interpretation:</strong> Points outside Red lines (UCL/LCL) are statistical anomalies indicating process variation.</p>
                </div>
              </div>
            )}

            {activeTab === 'compare' && (
              <div className="space-y-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vessels:</span>
                  <button onClick={() => setSelectedBioreactors(Object.keys(bioreactors))} className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100">All</button>
                  <button onClick={() => setSelectedBioreactors([])} className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded hover:bg-slate-100">None</button>
                  {Object.keys(bioreactors).map((id, index) => (
                    <button key={id} onClick={() => setSelectedBioreactors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                      className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${selectedBioreactors.includes(id) ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                      style={selectedBioreactors.includes(id) ? { backgroundColor: `hsl(${(index * 360) / Object.keys(bioreactors).length}, 65%, 50%)` } : {}}
                    >{id}</button>
                  ))}
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4">
                    {formatMetricName(selectedMetric)} — All Selected Vessels Overlay
                    <span className="ml-2 text-xs font-normal text-slate-400">({selectedBioreactors.length} vessels, {comparisonData.length} time points)</span>
                  </h4>
                  {comparisonData.length === 0 ? (
                    <div className="flex items-center justify-center h-[460px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm">No data — select vessels above and choose a metric</p>
                    </div>
                  ) : (
                  <div className="h-[460px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="time" type="number" label={{ value: 'Culture Day', position: 'insideBottom', offset: -15 }} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis label={{ value: formatMetricName(selectedMetric), angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        {selectedBioreactors.map((id, index) => (
                          <Line key={id} type="monotone" dataKey={id} stroke={`hsl(${(index * 360) / Math.max(selectedBioreactors.length, 1)}, 65%, 50%)`} strokeWidth={1.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} connectNulls name={id} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'regression' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">R-Squared</p>
                    <p className={`text-2xl font-bold mt-1 ${regressionData.stats.rSquared > 0.8 ? "text-emerald-600" : "text-slate-600"}`}>{(regressionData.stats.rSquared * 100).toFixed(1)}%</p>
                    <p className="text-xs text-slate-400 mt-1">Correlation Strength</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Slope</p>
                    <p className="text-2xl font-bold mt-1 text-slate-600">{regressionData.stats.slope.toExponential(3)}</p>
                    <p className="text-xs text-slate-400 mt-1">Rate of Change</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Intercept</p>
                    <p className="text-2xl font-bold mt-1 text-slate-600">{regressionData.stats.intercept.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">Value at X=0</p>
                  </div>
                </div>
                <div className="h-[400px] w-full bg-white p-4 rounded-lg border border-slate-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="x" name={formatMetricName(selectedMetric)} label={{ value: formatMetricName(selectedMetric), position: 'insideBottom', offset: -10 }} domain={['auto', 'auto']} />
                      <YAxis type="number" dataKey="y" name={formatMetricName(comparisonMetric)} label={{ value: formatMetricName(comparisonMetric), angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Data" data={regressionData.data} fill="#6366f1" />
                      <Line dataKey="trend" data={regressionData.data.map(d => ({ x: d.x, y: regressionData.stats.slope * d.x + regressionData.stats.intercept }))} stroke="#ef4444" strokeWidth={2} dot={false} activeDot={false} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                    <tr><th className="px-6 py-3">Bioreactor</th><th className="px-6 py-3">N</th><th className="px-6 py-3">Mean</th><th className="px-6 py-3">StDev</th><th className="px-6 py-3">Min</th><th className="px-6 py-3">Max</th></tr>
                  </thead>
                  <tbody>
                    {Object.keys(bioreactors).map(id => {
                      const vals = bioreactors[id].allSeries[selectedMetric]?.filter(v => v !== null);
                      if (!vals) return null;
                      const s = calculateStats(vals);
                      return (
                        <tr key={id} className="bg-white border-b hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{id}</td>
                          <td className="px-6 py-4">{s.n}</td>
                          <td className="px-6 py-4">{s.mean.toFixed(3)}</td>
                          <td className="px-6 py-4">{s.std.toFixed(3)}</td>
                          <td className="px-6 py-4">{s.min.toFixed(3)}</td>
                          <td className="px-6 py-4">{s.max.toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'report' && (
              <div className="h-full flex flex-col">
                {/* Report Builder Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-800">Report Generation</h2>
                        <p className="text-[11px] text-slate-500">Build custom report charts — select variables, configure, generate & export</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {reportCharts.length > 0 && (
                        <button
                          onClick={() => { setReportCharts([]); setReportEditIdx(null); setReportStep('variables'); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete current charts
                        </button>
                      )}
                      {['variables', 'configure', 'preview'].map((step, i) => {
                        const labels = ['1. Variables', '2. Configure', '3. Preview'];
                        const isCurrent = reportStep === step;
                        const isPast = ['variables', 'configure', 'preview'].indexOf(reportStep) > i;
                        return (
                          <button key={step} onClick={() => {
                            if (step === 'variables') setReportStep('variables');
                            else if (step === 'configure' && reportCharts.length > 0) setReportStep('configure');
                            else if (step === 'preview' && reportCharts.length > 0) setReportStep('preview');
                          }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isCurrent ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300' : isPast ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                            {isPast && !isCurrent ? <CheckCircle2 className="w-3 h-3" /> : null}
                            {labels[i]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 1: Variables Selection */}
                {reportStep === 'variables' && (
                  <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                    {/* Left: Presets & Templates */}
                    <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-y-auto">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Star className="w-3 h-3" /> Quick Presets</h3>
                      <div className="space-y-2 mb-5">
                        {REPORT_PRESETS.map(preset => (
                          <button key={preset.id} onClick={() => applyReportPreset(preset)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${reportActivePreset === preset.id ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-white'}`}>
                            <div className="flex items-center gap-2 mb-1"><span className="text-sm">{preset.icon}</span><span className="text-xs font-bold text-slate-700">{preset.name}</span></div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{preset.description}</p>
                          </button>
                        ))}
                      </div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><FolderOpen className="w-3 h-3" /> Saved Templates</h3>
                      {reportUserTemplates.length === 0 ? (
                        <div className="text-center py-4 px-2"><p className="text-[10px] text-slate-400 italic">No saved templates yet.</p></div>
                      ) : (
                        <div className="space-y-1.5">
                          {reportUserTemplates.map(t => (
                            <div key={t.id} className="flex items-center gap-2 group">
                              <button onClick={() => loadReportTemplate(t)} className="flex-1 text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors truncate"><Bookmark className="w-3 h-3 inline mr-1.5" />{t.name}</button>
                              <button onClick={() => deleteReportTemplate(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Center: Variable Selection */}
                    <div className="col-span-9 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col overflow-hidden">
                      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" /><input type="text" value={reportSearchTerm} onChange={e => setReportSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 outline-none" placeholder="Search variables..." /></div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full whitespace-nowrap">{reportSelectedVars.length} selected</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
                        <button onClick={() => setReportActiveCategory(null)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${!reportActiveCategory ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>All</button>
                        {VAR_CATEGORIES.map(cat => (<button key={cat.id} onClick={() => setReportActiveCategory(reportActiveCategory === cat.id ? null : cat.id)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${reportActiveCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{cat.label}</button>))}
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                          {filteredReportVars.map(metric => {
                            const isSelected = reportSelectedVars.includes(metric);
                            return (<button key={metric} onClick={() => toggleReportVar(metric)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all border ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />}
                              <div className="min-w-0 flex-1"><span className={`text-xs font-medium block truncate ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>{formatMetricName(metric)}</span><span className="text-[9px] text-slate-400 font-mono block truncate">{metric}</span></div>
                            </button>);
                          })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 flex-shrink-0">
                        <div className="flex gap-2">
                          <button onClick={() => setReportSelectedVars(allMetrics)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50">Select All</button>
                          <button onClick={() => { setReportSelectedVars([]); setReportActivePreset(null); }} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-50">Clear All</button>
                        </div>
                        <button onClick={generateChartsFromVars} disabled={reportSelectedVars.length === 0} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all ${reportSelectedVars.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Generate / Add Charts <ArrowRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Configure Charts */}
                {reportStep === 'configure' && (
                  <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-3 overflow-y-auto ${reportShowChartList ? "col-span-3" : "hidden"}`}>
                      <div className="flex items-center justify-between mb-3"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Charts ({reportCharts.length})</h3><div className="flex items-center gap-1"><button onClick={() => setReportShowChartList(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded"><Minimize2 className="w-3 h-3" /></button><button onClick={addReportChart} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"><Plus className="w-3.5 h-3.5" /></button></div></div>
                      <div className="space-y-1.5">
                        {reportCharts.map((chart, idx) => (
                          <div key={idx} draggable onDragStart={() => setReportDragIdx(idx)} onDragOver={e => e.preventDefault()} onDrop={() => { if (reportDragIdx !== null && reportDragIdx !== idx) moveReportChart(reportDragIdx, idx); setReportDragIdx(null); }} onClick={() => setReportEditIdx(idx)}
                            className={`group flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${reportEditIdx === idx ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <GripVertical className="w-3 h-3 text-slate-300 cursor-grab flex-shrink-0" />
                            <div className="flex-1 min-w-0"><span className="text-xs font-bold text-slate-700 block truncate">{chart.title || `Chart ${idx + 1}`}</span><span className="text-[9px] text-slate-400 truncate block">{formatMetricName(chart.yMetrics?.[0] || '')} · {chart.bioreactors.length} BR</span></div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={e => { e.stopPropagation(); duplicateReportChart(idx); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Copy className="w-3 h-3" /></button>
                              <button onClick={e => { e.stopPropagation(); removeReportChart(idx); }} className="p-1 text-slate-400 hover:text-rose-500 rounded"><X className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <button onClick={() => setReportSaveDialogOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"><Save className="w-3.5 h-3.5" /> Save as Template</button>
                        <button onClick={() => setReportStep('variables')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"><RotateCcw className="w-3.5 h-3.5" /> Add More Variables</button>
                      </div>
                      {reportSaveDialogOpen && (
                        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                          <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1.5">Template Name</label>
                          <input type="text" value={reportTemplateName} onChange={e => setReportTemplateName(e.target.value)} className="w-full px-2.5 py-1.5 border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 outline-none mb-2" placeholder="My Custom Report" />
                          <div className="flex gap-2"><button onClick={saveReportTemplate} className="flex-1 px-2 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Save</button><button onClick={() => setReportSaveDialogOpen(false)} className="px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button></div>
                        </div>
                      )}
                    </div>
                    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col overflow-hidden ${reportShowChartList && reportShowChartSetup ? "col-span-5" : (reportShowChartList || reportShowChartSetup ? "col-span-9" : "col-span-12")}`}>
                      {reportEditIdx !== null && reportCharts[reportEditIdx] ? (() => {
                        const chart = reportCharts[reportEditIdx];
                        const chartData = getReportChartData(chart);
                        const metric = chart.yMetrics?.[0] || '';
                        return (<>
                          <div className="flex items-center justify-between mb-2 flex-shrink-0"><h3 className="text-sm font-bold text-slate-800 truncate">{chart.title || 'Preview'}</h3><div className="flex items-center gap-1">{!reportShowChartList && <button onClick={() => setReportShowChartList(true)} className="p-1 text-slate-400 hover:text-slate-700 rounded"><Maximize2 className="w-3 h-3" /></button>}{!reportShowChartSetup && <button onClick={() => setReportShowChartSetup(true)} className="p-1 text-slate-400 hover:text-slate-700 rounded"><Maximize2 className="w-3 h-3" /></button>}<span className="text-[10px] text-slate-400">{formatMetricName(metric)}</span></div></div>
                          <div className="flex-1 min-h-0" id={`report-chart-${reportEditIdx}`}>
                            {chartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                {chart.chartType === 'bar' ? (
                                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                                    {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
                                    <XAxis dataKey="day" type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis domain={[chart.yMin !== '' ? Number(chart.yMin) : 'auto', chart.yMax !== '' ? Number(chart.yMax) : 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                                    {chart.showLegend && <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '9px' }} />}
                                    {chart.showStages && (chart.stages || []).map((stage, idx) => (<ReferenceArea key={`cfg-stage-${idx}`} x1={stage.start} x2={stage.end} y1="auto" y2="auto" fill={stage.color || '#e2e8f0'} fillOpacity={0.15} strokeOpacity={0} />))}
                                    {chart.showOperations && batchOperations.map((op, idx) => (<ReferenceLine key={`cfg-op-${idx}`} x={op.day} stroke="#0f766e" strokeDasharray="4 3" strokeWidth={1.2} label={{ value: op.description || 'Operation', position: 'top', fill: '#0f766e', fontSize: 9 }} />))}
                                    {chart.bioreactors.map((id) => <Bar key={id} dataKey={id} name={id} fill={reportDefaultColors[Object.keys(bioreactors).indexOf(id) % reportDefaultColors.length]} />)}
                                  </BarChart>
                                ) : (
                                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                                    {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
                                    <XAxis dataKey="day" type="number" domain={[chart.xMin !== '' ? Number(chart.xMin) : 'auto', chart.xMax !== '' ? Number(chart.xMax) : 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Culture Day', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 10 }} />
                                    <YAxis domain={[chart.yMin !== '' ? Number(chart.yMin) : 'auto', chart.yMax !== '' ? Number(chart.yMax) : 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: formatMetricName(metric), angle: -90, position: 'insideLeft', offset: 5, fill: '#94a3b8', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                                    {chart.showLegend && <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '9px' }} />}
                                    {chart.bioreactors.map((id) => {
                                      const colorIdx = Object.keys(bioreactors).indexOf(id);
                                      const pc = getEffectivePanelConfig(chart, id);
                                      const color = pc.color || reportDefaultColors[colorIdx % reportDefaultColors.length];
                                      const dash = pc.lineType === 'dashed' ? '8 4' : pc.lineType === 'dotted' ? '2 4' : '0';
                                      return <Line key={id} type="monotone" dataKey={id} name={id} stroke={color} strokeWidth={2} strokeDasharray={dash} dot={chart.showPoints ? getDotRenderer(chart, id, color) : false} connectNulls isAnimationActive={false} />;
                                    })}
                                  </LineChart>
                                )}
                              </ResponsiveContainer>
                            ) : (<div className="flex items-center justify-center h-full"><div className="text-center"><BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-xs text-slate-400">Select a metric and bioreactors</p></div></div>)}
                          </div>
                        </>);
                      })() : (<div className="flex items-center justify-center h-full"><div className="text-center"><BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-2" /><p className="text-sm text-slate-400 font-medium">Select a chart to edit</p></div></div>)}
                    </div>
                    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-y-auto ${reportShowChartSetup ? "col-span-4" : "hidden"}`}>
                      {reportEditIdx !== null && reportCharts[reportEditIdx] ? (() => {
                        const chart = reportCharts[reportEditIdx];
                        return (
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Settings className="w-3 h-3" /> Chart Setup</h3><button onClick={() => setReportShowChartSetup(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded"><Minimize2 className="w-3 h-3" /></button></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Title</label><input type="text" value={chart.title} onChange={e => updateReportChart(reportEditIdx, 'title', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 outline-none" placeholder="Chart title" /></div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Chart Type</label><select value={chart.chartType} onChange={e => updateReportChart(reportEditIdx, 'chartType', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 outline-none bg-white"><option value="line">Line</option><option value="scatter">Scatter</option><option value="bar">Bar</option></select></div>
                              <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">X-Axis</label><select value={chart.xAxis} onChange={e => updateReportChart(reportEditIdx, 'xAxis', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 outline-none bg-white"><option value="day">Culture Day</option></select></div>
                            </div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Y-Axis Metric</label><select value={chart.yMetrics?.[0] || ''} onChange={e => updateReportChart(reportEditIdx, 'yMetrics', [e.target.value])} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 outline-none bg-white">{renderMetricOptions()}</select></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Axis Ranges</label><div className="grid grid-cols-2 gap-2"><input type="number" value={chart.yMin} onChange={e => updateReportChart(reportEditIdx, 'yMin', e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none" placeholder="Y Min (auto)" /><input type="number" value={chart.yMax} onChange={e => updateReportChart(reportEditIdx, 'yMax', e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none" placeholder="Y Max (auto)" /><input type="number" value={chart.xMin} onChange={e => updateReportChart(reportEditIdx, 'xMin', e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none" placeholder="X Min (auto)" /><input type="number" value={chart.xMax} onChange={e => updateReportChart(reportEditIdx, 'xMax', e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none" placeholder="X Max (auto)" /></div></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Display Options</label><div className="grid grid-cols-2 gap-2">{[{key:'showLegend',label:'Legend'},{key:'showGrid',label:'Grid'},{key:'showPoints',label:'Data Points'},{key:'showLines',label:'Lines'},{key:'showStages',label:'Show Stages'},{key:'showOperations',label:'Operations'}].map(opt => (<label key={opt.key} className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer p-1.5 rounded hover:bg-slate-50"><input type="checkbox" checked={chart[opt.key] || false} onChange={e => updateReportChart(reportEditIdx, opt.key, e.target.checked)} className="accent-indigo-600 w-3.5 h-3.5" />{opt.label}</label>))}</div></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Panel Configuration <span className="text-slate-400 font-normal">(per bioreactor)</span></label>
                              <div className="flex items-center gap-1.5 mb-2">
                                <button onClick={() => setReportStyleScope('current')} className={`px-2 py-1 rounded text-[9px] font-bold border ${reportStyleScope === 'current' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200'}`}>Current Chart</button>
                                <button onClick={() => setReportStyleScope('global')} className={`px-2 py-1 rounded text-[9px] font-bold border ${reportStyleScope === 'global' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}>Global Charts</button>
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-100 rounded-lg p-2">
                                {chart.bioreactors.map((brId, bi) => {
                                  const pc = getEffectivePanelConfig(chart, brId);
                                  const lineTypes = ['solid','dashed','dotted'];
                                  const markerTypes = ['circle','square','triangle','diamond'];
                                  return (
                                    <div key={brId} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50">
                                      <span className="text-[9px] font-mono font-bold text-slate-600 w-14 truncate">{brId}</span>
                                      <input type="color" value={pc.color || reportDefaultColors[bi % reportDefaultColors.length]} onChange={e => updatePanelConfig(reportEditIdx, brId, 'color', e.target.value)} className="w-5 h-5 rounded border border-slate-200 cursor-pointer p-0" />
                                      <select value={pc.lineType || 'solid'} onChange={e => updatePanelConfig(reportEditIdx, brId, 'lineType', e.target.value)} className="text-[9px] px-1 py-0.5 border border-slate-200 rounded bg-white">
                                        {lineTypes.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                                      </select>
                                      <select value={pc.marker || 'circle'} onChange={e => updatePanelConfig(reportEditIdx, brId, 'marker', e.target.value)} className="text-[9px] px-1 py-0.5 border border-slate-200 rounded bg-white">
                                        {markerTypes.map(mt => <option key={mt} value={mt}>{mt}</option>)}
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bioreactors</label><div className="flex gap-1"><button onClick={() => updateReportChart(reportEditIdx, 'bioreactors', Object.keys(bioreactors))} className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">All</button><button onClick={() => updateReportChart(reportEditIdx, 'bioreactors', [])} className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-200">None</button></div></div>
                              <div className="max-h-36 overflow-y-auto space-y-0.5 border border-slate-100 rounded-lg p-2">
                                {Object.entries(conditionGroups).map(([condition, brs]) => (<div key={condition}><div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-1 mt-1">{condition}</div>{brs.map(br => { const isSelected = chart.bioreactors.includes(br.id); const colorIdx = Object.keys(bioreactors).indexOf(br.id); return (<button key={br.id} onClick={() => { const updated = isSelected ? chart.bioreactors.filter(b => b !== br.id) : [...chart.bioreactors, br.id]; updateReportChart(reportEditIdx, 'bioreactors', updated); }} className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isSelected ? reportDefaultColors[colorIdx % reportDefaultColors.length] : '#cbd5e1' }} /><span className="font-mono text-[10px]">{br.id}</span></button>); })}</div>))}
                              </div>
                            </div>
                            <button onClick={generateReport} disabled={reportCharts.length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"><FileDown className="w-4 h-4" /> Generate Report</button>
                          </div>
                        );
                      })() : (<div className="flex items-center justify-center h-full"><div className="text-center"><Settings className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-xs text-slate-400">Select a chart to configure</p></div></div>)}
                    </div>
                  </div>
                )}

                {/* Step 3: Preview & Export */}
                {reportStep === 'preview' && (
                  <div className="flex-1 overflow-y-auto">
                    <div className={`rounded-xl p-4 mb-4 flex items-center justify-between ${reportGenStatus === 'completed' ? 'bg-emerald-50 border border-emerald-200' : reportGenStatus === 'warnings' ? 'bg-amber-50 border border-amber-200' : reportGenStatus === 'failed' ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        {reportGenStatus === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                        {reportGenStatus === 'warnings' && <AlertCircle className="w-5 h-5 text-amber-600" />}
                        {reportGenStatus === 'failed' && <AlertCircle className="w-5 h-5 text-rose-600" />}
                        <div><p className="text-sm font-bold text-slate-800">{reportGenStatus === 'completed' && 'Report Generated Successfully'}{reportGenStatus === 'warnings' && `Completed with ${reportGenWarnings.length} warning(s)`}{reportGenStatus === 'failed' && 'Generation Failed'}</p>{reportGenWarnings.length > 0 && <div className="mt-1 space-y-0.5">{reportGenWarnings.map((w, i) => <p key={i} className="text-[10px] text-slate-500">{w}</p>)}</div>}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setReportStep('configure')} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"><Edit3 className="w-3 h-3" /> Edit</button>
                        <button onClick={printReport} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"><Printer className="w-3.5 h-3.5" /> Export PDF</button>
                      </div>
                    </div>
                    <div className="mb-4 bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Report Title</label>
                      <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-300 outline-none" />
                    </div>
                    <div className={`grid gap-4 ${reportCharts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {reportCharts.map((chart, idx) => {
                        const chartData = getReportChartData(chart);
                        const metric = chart.yMetrics?.[0] || '';
                        return (
                          <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4" id={`report-chart-${idx}`}>
                            <div className="flex items-center justify-between mb-2"><h4 className="text-xs font-bold text-slate-700">{chart.title || `Chart ${idx + 1}`}</h4><span className="text-[9px] text-slate-400">{formatMetricName(metric)}</span></div>
                            <div className="h-64">
                              {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 20 }}>
                                    {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
                                    <XAxis dataKey="day" type="number" tick={{ fontSize: 9 }} label={{ value: 'Day', position: 'insideBottom', offset: -12, fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 9 }} domain={[chart.yMin !== '' ? Number(chart.yMin) : 'auto', chart.yMax !== '' ? Number(chart.yMax) : 'auto']} />
                                    <Tooltip contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)', fontSize: '9px' }} />
                                    {chart.showLegend && <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '8px' }} />}
                                    {chart.showStages && (chart.stages || []).map((stage, sIdx) => (<ReferenceArea key={`pv-stage-${idx}-${sIdx}`} x1={stage.start} x2={stage.end} y1="auto" y2="auto" fill={stage.color || '#e2e8f0'} fillOpacity={0.15} strokeOpacity={0} />))}
                                    {chart.showOperations && batchOperations.map((op, oIdx) => (<ReferenceLine key={`pv-op-${idx}-${oIdx}`} x={op.day} stroke="#0f766e" strokeDasharray="4 3" strokeWidth={1.1} label={{ value: op.description || 'Operation', position: 'top', fill: '#0f766e', fontSize: 8 }} />))}
                                    {chart.bioreactors.map(id => { const colorIdx = Object.keys(bioreactors).indexOf(id); const pc = getEffectivePanelConfig(chart, id); const color = pc.color || reportDefaultColors[colorIdx % reportDefaultColors.length]; const dash = pc.lineType === 'dashed' ? '8 4' : pc.lineType === 'dotted' ? '2 4' : '0'; return <Line key={id} type="monotone" dataKey={id} name={id} stroke={color} strokeWidth={1.5} strokeDasharray={dash} dot={chart.showPoints ? getDotRenderer(chart, id, color) : false} connectNulls isAnimationActive={false} />; })}
                                  </LineChart>
                                </ResponsiveContainer>
                              ) : (<div className="flex items-center justify-center h-full bg-slate-50 rounded-lg border-2 border-dashed border-slate-200"><p className="text-xs text-slate-400 italic">No data available for this chart</p></div>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- LANDING PAGE ---
// ─── HOMEPAGE UPLOADER (compact drop-zone for the landing page) ───────────────
// ──────────────────────────────────────────────────────────────────────────────
// ATHENA ROW PARSERS — convert raw Athena rows into internal format
// One function per instrument, mirroring the CSV parsers
// ──────────────────────────────────────────────────────────────────────────────

/** Parse Roche CEDEX rows from Athena (same format as CSV) */
const parseRocheAthenaRows = (rows, experimentId = '') => parseAthenaRows(rows, experimentId);

/** Parse NovaFlex rows from Athena JOIN result */
const parseNovaFlexAthenaRows = (rows, experimentId = '') => {
  if (!rows || rows.length === 0) return null;
  // sample_id format: T0792545X11K-5
  const SAMPLE_RE = /^(T\d+|[A-Z]\d+)(X\d+)K-(\d+)$/i;
  const vessels = {};
  let batchId = experimentId || '';
  for (const row of rows) {
    const sampleId = (row.sample_id || '').trim();
    const match = SAMPLE_RE.exec(sampleId);
    if (!match) continue;
    const thisBatch  = match[1];
    const vessel     = match[2].toUpperCase();
    const cultureDay = parseInt(match[3], 10);
    if (!batchId) batchId = thisBatch;
    if (!vessels[vessel]) vessels[vessel] = { condition: vessel, timepointMeta: new Map(), series: {} };
    const vEntry = vessels[vessel];
    const acqDate = row.sample_time_acquired ? row.sample_time_acquired.split('T')[0] : null;
    if (!vEntry.timepointMeta.has(cultureDay)) vEntry.timepointMeta.set(cultureDay, { date: acqDate });
    // Map all _value columns
    Object.entries(NOVAFLEX_COLUMN_MAP).forEach(([colName, mapping]) => {
      const raw = row[colName];
      if (raw === null || raw === undefined || raw === '') return;
      const val = parseFloat(raw);
      if (isNaN(val)) return;
      if (!vEntry.series[mapping.key]) vEntry.series[mapping.key] = new Map();
      if (!vEntry.series[mapping.key].has(cultureDay)) vEntry.series[mapping.key].set(cultureDay, val);
    });
  }
  if (Object.keys(vessels).length === 0) return null;
  const bioreactors = {};
  Object.entries(vessels).forEach(([vesselId, vEntry]) => {
    const vDays = Array.from(vEntry.timepointMeta.keys()).sort((a, b) => a - b);
    const timepoints = vDays.map(d => {
      const m = vEntry.timepointMeta.get(d);
      return { culture_day: d, export_dt: m?.date ? `${m.date}T00:00:00` : null, date: m?.date || null, sample_code_id: null };
    });
    const series = {};
    Object.entries(vEntry.series).forEach(([sk, dm]) => { series[sk] = vDays.map(d => dm.has(d) ? dm.get(d) : null); });
    bioreactors[vesselId] = { condition: vesselId, timepoints, series };
  });
  return { run: { run_id: batchId, product: 'Cell Culture (NovaFlex)', site: 'AT-Vienna', analyzer: 'Nova Biomedical BioProfile Flex²' }, bioreactors, _source: 'novaflex_athena' };
};

/** Parse MFCS2 rows from Athena (latest-value-per-day already done by SQL ROW_NUMBER) */
const parseMFCS2AthenaRows = (rows, experimentId = '') => {
  if (!rows || rows.length === 0) return null;
  // batchname: T0792545X11  (no K suffix)
  const // Matches T0792545X11, A132517R01, A132517R01a (trailing letter normalised)
  BATCH_RE = /^([A-Z]\d+)([XR]\d+)[a-z]*$/i;
  const vesselDates = {};
  const rawRows = [];
  for (const row of rows) {
    const batchname = (row.batchname || '').trim();
    const match = BATCH_RE.exec(batchname);
    if (!match) continue;
    const vessel = match[2].toUpperCase();
    const dateStr = row.reading_date || null;
    if (dateStr) { if (!vesselDates[vessel]) vesselDates[vessel] = []; vesselDates[vessel].push(dateStr); }
    rawRows.push({ vessel, batchId: match[1], tag: row.tag, val: row.numerical_value, dateStr });
  }
  const vesselDay0 = {};
  Object.entries(vesselDates).forEach(([v, dates]) => { vesselDay0[v] = [...new Set(dates)].sort()[0]; });
  const msPerDay = 86400000;
  const vessels = {};
  let batchId = experimentId || '';
  rawRows.forEach(({ vessel, batchId: bid, tag, val, dateStr }) => {
    if (!batchId) batchId = bid;
    const mapping = MFCS2_TAG_MAP[tag]; if (!mapping) return;
    const numVal = val === '' || val === null ? null : parseFloat(val);
    if (numVal === null || isNaN(numVal)) return;
    const day0 = vesselDay0[vessel];
    let cultureDay = 0;
    if (dateStr && day0) cultureDay = Math.round((new Date(dateStr).getTime() - new Date(day0).getTime()) / msPerDay);
    if (!vessels[vessel]) vessels[vessel] = { condition: vessel, timepointMeta: new Map(), series: {} };
    const vEntry = vessels[vessel];
    if (!vEntry.timepointMeta.has(cultureDay)) vEntry.timepointMeta.set(cultureDay, { date: dateStr });
    if (!vEntry.series[mapping.key]) vEntry.series[mapping.key] = new Map();
    if (!vEntry.series[mapping.key].has(cultureDay)) vEntry.series[mapping.key].set(cultureDay, numVal);
  });
  if (Object.keys(vessels).length === 0) return null;
  const bioreactors = {};
  Object.entries(vessels).forEach(([vesselId, vEntry]) => {
    const vDays = Array.from(vEntry.timepointMeta.keys()).sort((a, b) => a - b);
    const timepoints = vDays.map(d => { const m = vEntry.timepointMeta.get(d); return { culture_day: d, export_dt: m?.date ? `${m.date}T00:00:00` : null, date: m?.date || null, sample_code_id: null }; });
    const series = {};
    Object.entries(vEntry.series).forEach(([sk, dm]) => { series[sk] = vDays.map(d => dm.has(d) ? dm.get(d) : null); });
    bioreactors[vesselId] = { condition: vesselId, timepoints, series };
  });
  const vesselKeys2 = Object.keys(bioreactors);
  const isRockerBag2 = vesselKeys2.some(v => /^R\d+/i.test(v));
  return { run: { run_id: batchId, product: isRockerBag2 ? 'Cell Culture (BIOSTAT B RM Twin)' : 'Cell Culture (MFCS2)', site: 'AT-Vienna', analyzer: isRockerBag2 ? 'BIOSTAT B RM Twin / MFCS SCADA' : 'ambr250 / MFCS2 SCADA' }, bioreactors, _source: 'mfcs2_athena' };
};

/** Parse Aster HPLC rows from Athena */
const parseAsterAthenaRows = (rows, experimentId = '') => {
  if (!rows || rows.length === 0) return null;
  // sample_description: T0792545X11K14
  const SAMPLE_RE = /^(T\d+|[A-Z]\d+)(X\d+)K(\d+)$/i;
  const vessels = {};
  let batchId = experimentId || '';
  for (const row of rows) {
    const desc  = (row.sample_description || '').trim();
    const match = SAMPLE_RE.exec(desc);
    if (!match) continue;
    const thisBatch  = match[1];
    const vessel     = match[2].toUpperCase();
    const cultureDay = parseInt(match[3], 10);
    if (!batchId) batchId = thisBatch;
    const mapping = ASTER_ANALYTE_MAP[row.test_analyte_units] || { key: 'protein_a_hplc_mg_per_l', label: 'Protein A Titer (HPLC)', unit: 'mg/mL' };
    const numVal = row.numeric_result === null ? null : parseFloat(row.numeric_result);
    if (numVal === null || isNaN(numVal)) continue;
    if (!vessels[vessel]) vessels[vessel] = { condition: vessel, timepointMeta: new Map(), series: {} };
    const vEntry = vessels[vessel];
    const dateStr = row.results_log_date ? row.results_log_date.split(' ')[0] : null;
    if (!vEntry.timepointMeta.has(cultureDay)) vEntry.timepointMeta.set(cultureDay, { date: dateStr });
    if (!vEntry.series[mapping.key]) vEntry.series[mapping.key] = new Map();
    if (!vEntry.series[mapping.key].has(cultureDay)) vEntry.series[mapping.key].set(cultureDay, numVal);
  }
  if (Object.keys(vessels).length === 0) return null;
  const bioreactors = {};
  Object.entries(vessels).forEach(([vesselId, vEntry]) => {
    const vDays = Array.from(vEntry.timepointMeta.keys()).sort((a, b) => a - b);
    const timepoints = vDays.map(d => { const m = vEntry.timepointMeta.get(d); return { culture_day: d, export_dt: m?.date ? `${m.date}T00:00:00` : null, date: m?.date || null, sample_code_id: null }; });
    const series = {};
    Object.entries(vEntry.series).forEach(([sk, dm]) => { series[sk] = vDays.map(d => dm.has(d) ? dm.get(d) : null); });
    bioreactors[vesselId] = { condition: vesselId, timepoints, series };
  });
  return { run: { run_id: batchId, product: 'Cell Culture (Aster HPLC)', site: 'AT-Vienna', analyzer: 'Aster Protein A HPLC' }, bioreactors, _source: 'aster_athena' };
};

/**
 * Parse the combined ?source=all response from the server:
 * { results: { roche_cedex: {rows, ok}, novaflex: {rows, ok}, mfcs2: {rows, ok}, aster: {rows, ok} } }
 * → parse each source → merge into one unified dataset
 */
const parseAllSourcesResponse = (allResults, experimentId) => {
  const parsers = {
    roche_cedex: (rows) => parseRocheAthenaRows(rows, experimentId),
    novaflex:    (rows) => parseNovaFlexAthenaRows(rows, experimentId),
    mfcs2:       (rows) => parseMFCS2AthenaRows(rows, experimentId),
    aster:       (rows) => parseAsterAthenaRows(rows, experimentId),
  };
  const datasets = [];
  const stats = {};
  Object.entries(allResults).forEach(([src, result]) => {
    stats[src] = { ok: result.ok, count: result.count, error: result.error };
    if (result.ok && result.rows && result.rows.length > 0) {
      try {
        const parsed = parsers[src]?.(result.rows);
        if (parsed) {
          datasets.push(parsed);
          stats[src].loaded = true;
        } else {
          stats[src].loaded = false;
          stats[src].parseError = 'Parser returned no valid data (check sample name format)';
        }
      } catch (e) {
        console.warn(`Parse error for ${src}:`, e);
        stats[src].loaded = false;
        stats[src].parseError = e.message;
      }
    } else if (result.ok && result.count === 0) {
      stats[src].loaded = false;
      stats[src].parseError = 'No rows found for this experiment in this table';
    }
  });

  if (datasets.length === 0) {
    const failedSources = Object.entries(stats)
      .map(([src, s]) => `${src}: ${s.error || s.parseError || 'no data'}`)
      .join('; ');
    throw new Error(`No data found for "${experimentId}" in any instrument table. Details: ${failedSources}`);
  }

  const merged = mergeInstrumentDatasets(datasets);
  merged._sourceStats = stats;

  // Attach warnings for sources that had issues
  const warnings = Object.entries(stats)
    .filter(([, s]) => !s.loaded && (s.count === 0 || s.parseError))
    .map(([src, s]) => `${src}: ${s.parseError || 'no data'}`);
  if (warnings.length > 0) merged._parseWarnings = warnings;

  return merged;
};

// ──────────────────────────────────────────────────────────────────────────────
// HARDCODED PROJECT CATALOG (mirrors server.js PROJECT_CATALOG)
// ──────────────────────────────────────────────────────────────────────────────
const PROJECT_CATALOG = [
  {
    projectName: 'TAK-079',
    experiments: [
      { id: 'T0792551', label: 'T0792551 — Cell Culture Run 1' },
      { id: 'T0792545', label: 'T0792545 — Cell Culture Run 2' },
    ],
  },
  {
    projectName: 'TAK-755',
    experiments: [
      { id: 'A132517', label: 'A132517 — Upstream Run 1' },
      { id: 'A132518', label: 'A132518 — Upstream Run 2' },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// TetroScience Connector — Project → Experiment selector + free-text search
// ──────────────────────────────────────────────────────────────────────────────
const TetroScienceConnector = ({ onFileLoaded }) => {
  const [status,       setStatus]       = useState('idle'); // idle | connecting | connected | error
  const [loading,      setLoading]      = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [successMsg,   setSuccessMsg]   = useState('');
  const [serverInfo,   setServerInfo]   = useState(null);

  // Selection state
  const [selProject,   setSelProject]   = useState('');
  const [selExperiment,setSelExperiment]= useState('');
  const [freeText,     setFreeText]     = useState('');
  const [useCustom,    setUseCustom]    = useState(false);
  const [searchResults,setSearchResults]= useState([]);
  const [sourceStats,  setSourceStats]  = useState(null); // loaded stats per instrument

  // Derived: available experiments for selected project
  const availableExperiments = PROJECT_CATALOG.find(p => p.projectName === selProject)?.experiments || [];

  // Reset experiment when project changes
  const handleProjectChange = (proj) => {
    setSelProject(proj);
    setSelExperiment('');
    setUseCustom(false);
    setFreeText('');
    setSearchResults([]);
  };

  // The experiment ID actually used (custom text or dropdown selection)
  const activeExperimentId = useCustom
    ? freeText.trim()
    : selExperiment;

  // ── Backend connectivity ──────────────────────────────────────────────────
  const probe = async () => {
    setStatus('connecting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const info = await res.json();
      setServerInfo(info);
      setStatus('connected');
    } catch (e) {
      setStatus('error');
      setErrorMsg('Backend not reachable. Run: npm run dev:full');
    }
  };

  // ── Free-text search ───────────────────────────────────────────────────────
  const handleFreeTextChange = async (val) => {
    setFreeText(val);
    if (!val.trim() || val.trim().length < 3) { setSearchResults([]); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
      const d   = await res.json();
      setSearchResults(d.results || []);
    } catch { setSearchResults([]); }
  };

  // ── Load experiment data from all 4 sources ───────────────────────────────
  const loadExperiment = async () => {
    if (!activeExperimentId) return;
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    setSourceStats(null);
    try {
      const res = await fetch(`/api/data/${encodeURIComponent(activeExperimentId)}?source=all`);
      const d   = await res.json();
      if (d.error) throw new Error(d.error);

      // Parse all sources and merge — partial results are OK
      const merged = parseAllSourcesResponse(d.results || {}, activeExperimentId);
      const vesselCount = Object.keys(merged.bioreactors || {}).length;
      const stats = merged._sourceStats || {};
      setSourceStats(stats);

      const okSources  = Object.entries(stats).filter(([, s]) => s.loaded).map(([k]) => k);
      const badSources = Object.entries(stats).filter(([, s]) => !s.loaded && (s.count === 0 || s.parseError)).map(([k]) => k);

      if (badSources.length > 0) {
        const warnList = badSources.map(src => {
          const s = stats[src];
          return `${src} (${s.parseError || 'no data'})`;
        }).join(', ');
        setSuccessMsg(`⚠ Partial load — "${activeExperimentId}" · ${vesselCount} vessels · ${okSources.length}/4 sources loaded. Not available: ${warnList}`);
      } else {
        setSuccessMsg(`✓ "${activeExperimentId}" · ${vesselCount} vessels · ${okSources.length}/4 sources`);
      }
      setTimeout(() => onFileLoaded(merged), 1000);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Status dot ────────────────────────────────────────────────────────────
  const statusDot   = { idle: 'bg-slate-300', connecting: 'bg-amber-400 animate-pulse', connected: 'bg-emerald-400', error: 'bg-red-400' }[status];
  const statusLabel = { idle: 'Not connected', connecting: 'Connecting…', connected: 'Connected', error: 'Offline' }[status];

  const SOURCE_META = {
    roche_cedex: { label: 'Roche CEDEX', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    novaflex:    { label: 'NovaFlex',    color: 'bg-teal-100 text-teal-700 border-teal-200'       },
    mfcs2:       { label: 'MFCS2',       color: 'bg-amber-100 text-amber-700 border-amber-200'    },
    aster:       { label: 'Aster HPLC',  color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 hover:border-indigo-300 transition-all p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'connected' ? 'bg-indigo-100' : status === 'error' ? 'bg-red-50' : 'bg-slate-100'}`}>
          {loading ? <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" /> : <Database className="w-5 h-5 text-indigo-500" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">TetroScience Data Platform</h2>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${status === 'connected' ? 'text-emerald-600' : status === 'error' ? 'text-red-500' : 'text-slate-400'}`}>{statusLabel}</span>
          </div>
          <p className="text-xs text-slate-500">AWS Athena · Roche CEDEX · NovaFlex · MFCS2 · Aster HPLC</p>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-xs font-medium border flex items-start gap-2 ${successMsg.startsWith('⚠') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {successMsg.startsWith('⚠') ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 rounded-lg px-4 py-3 text-xs font-medium border bg-red-50 border-red-200 text-red-700">
          <div className="flex items-center gap-1.5 font-bold mb-1"><AlertCircle className="w-3.5 h-3.5" /> Error</div>
          <span className="break-words">{errorMsg}</span>
        </div>
      )}

      {/* Source stats after load */}
      {sourceStats && (
        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {Object.entries(SOURCE_META).map(([src, meta]) => {
            const s = sourceStats[src] || {};
            const isLoaded  = s.loaded && s.count > 0;
            const isError   = s.error || (!s.ok && s.count === undefined);
            const isEmpty   = !isLoaded && !isError && s.count === 0;
            const colorCls  = isLoaded ? meta.color : isError ? 'bg-red-50 text-red-400 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100';
            const statusTxt = isLoaded ? `${s.count} rows` : isError ? 'Error' : 'No data';
            return (
              <div key={src} className={`rounded-lg px-2 py-1.5 border text-center ${colorCls}`} title={s.parseError || s.error || ''}>
                <div className="text-[9px] font-bold">{meta.label}</div>
                <div className="text-[10px] font-mono mt-0.5">{statusTxt}</div>
                {(s.parseError || isEmpty) && (
                  <div className="text-[8px] mt-0.5 opacity-60 truncate">not available</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* IDLE — connect button */}
      {status === 'idle' && (
        <button onClick={probe} className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" />Connect to TetroScience
        </button>
      )}

      {/* ERROR — retry */}
      {status === 'error' && (
        <div>
          <button onClick={probe} className="w-full py-3 rounded-xl border border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4" /> Retry connection
          </button>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-600 space-y-1.5 font-mono">
            <p className="font-bold text-slate-700 text-xs mb-2">How to start the backend:</p>
            <p><span className="text-slate-400">1.</span> Copy <span className="bg-white px-1 rounded border border-slate-200 text-slate-800">.env.server.example</span> → <span className="bg-white px-1 rounded border border-slate-200 text-slate-800">.env.server</span></p>
            <p><span className="text-slate-400">2.</span> <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">npm install</span></p>
            <p><span className="text-slate-400">3.</span> <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">npm run dev:full</span></p>
          </div>
        </div>
      )}

      {/* CONNECTING */}
      {status === 'connecting' && (
        <div className="flex items-center justify-center py-6 gap-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />Connecting to TetroScience API…
        </div>
      )}

      {/* CONNECTED — full experiment selector */}
      {status === 'connected' && (
        <div className="space-y-4">
          {/* Server info */}
          {serverInfo && (
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="px-2 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold">{serverInfo.database}</span>
              <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-mono">{serverInfo.region}</span>
              <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-mono">{serverInfo.workgroup}</span>
            </div>
          )}

          {/* ── Mode toggle ─────────────────────────────────── */}
          <div className="flex gap-2">
            <button
              onClick={() => setUseCustom(false)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${!useCustom ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
            >
              Select Project
            </button>
            <button
              onClick={() => setUseCustom(true)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${useCustom ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
            >
              Search / Enter ID
            </button>
          </div>

          {/* ── CATALOG MODE — Project → Experiment ──────────── */}
          {!useCustom && (
            <div className="space-y-3">
              {/* Project selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Name</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_CATALOG.map(p => (
                    <button
                      key={p.projectName}
                      onClick={() => handleProjectChange(p.projectName)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border-2 transition-all ${selProject === p.projectName ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                    >
                      {p.projectName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experiment selector — appears after project chosen */}
              {selProject && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Experiment Title</label>
                  <div className="space-y-2">
                    {availableExperiments.map(exp => (
                      <button
                        key={exp.id}
                        onClick={() => setSelExperiment(exp.id)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border-2 text-left transition-all flex items-center justify-between ${selExperiment === exp.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                      >
                        <span>{exp.label}</span>
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${selExperiment === exp.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{exp.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FREE-TEXT / SEARCH MODE ───────────────────────── */}
          {useCustom && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search or Enter Experiment ID</label>
              <div className="relative">
                <input
                  type="text"
                  value={freeText}
                  onChange={e => handleFreeTextChange(e.target.value)}
                  placeholder="e.g. T0792545 or A132517…"
                  className="w-full text-sm bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                {freeText && (
                  <button onClick={() => { setFreeText(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setFreeText(r.id); setSearchResults([]); }}
                      className="w-full px-4 py-2.5 text-left text-xs hover:bg-indigo-50 border-b border-slate-100 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-800 font-mono">{r.id}</span>
                        <span className="text-slate-400 ml-2">{r.label.replace(r.id, '').replace('—', '').trim()}</span>
                      </div>
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{r.projectName}</span>
                    </button>
                  ))}
                </div>
              )}
              {freeText.trim().length >= 3 && searchResults.length === 0 && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1.5 px-1">
                  <Info className="w-3 h-3" />
                  Not in catalog — will attempt live Athena query anyway.
                </p>
              )}
            </div>
          )}

          {/* ── Load button ───────────────────────────────────── */}
          <button
            onClick={loadExperiment}
            disabled={!activeExperimentId || loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-indigo-200/60 flex items-center justify-center gap-2"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Querying all 4 instruments…</>
              : activeExperimentId
                ? <><Download className="w-4 h-4" /> Load "{activeExperimentId}" — All Sources</>
                : <><Database className="w-4 h-4" /> Select an experiment above</>
            }
          </button>

          {/* What gets loaded */}
          {activeExperimentId && !loading && !successMsg && (
            <div className="grid grid-cols-4 gap-1">
              {Object.entries(SOURCE_META).map(([src, meta]) => (
                <div key={src} className={`rounded-lg px-2 py-1.5 border text-center text-[9px] font-bold ${meta.color}`}>
                  {meta.label}
                </div>
              ))}
            </div>
          )}

          {/* Info footer */}
          <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-indigo-700 leading-relaxed">
              All 4 instrument sources are queried in parallel from Athena, parsed, and merged by vessel ID — identical result to uploading all 4 CSVs at once.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const HomepageUploader = ({ onFileLoaded }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'ok'|'err', msg: string }
  const [loadedFiles, setLoadedFiles] = useState([]);

  const INSTRUMENT_COLORS = {
    roche_cedex: { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700', label: 'Roche CEDEX' },
    novaflex:    { bg: 'bg-teal-100',   border: 'border-teal-200',   text: 'text-teal-700',   label: 'NovaFlex'    },
    mfcs2:       { bg: 'bg-amber-100',  border: 'border-amber-200',  text: 'text-amber-700',  label: 'MFCS2'       },
    aster:       { bg: 'bg-blue-100',   border: 'border-blue-200',   text: 'text-blue-700',   label: 'Aster HPLC'  },
    multi_instrument: { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Multi-Instrument' },
  };

  const detectInstrumentFromParsed = (parsed) => parsed?._source || 'unknown';

  const process = async (files) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setStatus(null);
    try {
      let json;
      if (files.length === 1) {
        json = await parseUploadedFile(files[0]);
      } else {
        json = await parseMultipleFiles(files);
      }
      const vesselCount = Object.keys(json.bioreactors || {}).length;
      const runId = json.run?.run_id || json.run_id || files[0].name;
      const instrument = detectInstrumentFromParsed(json);
      const instrLabel = INSTRUMENT_COLORS[instrument]?.label || 'Instrument';
      setLoadedFiles(Array.from(files).map(f => f.name));

      // Show amber warning if some files were skipped
      if (json._parseWarnings?.length > 0) {
        const skippedList = json._parseWarnings.join('; ');
        setStatus({ type: 'warn', msg: `⚠ Partial load — "${runId}" · ${vesselCount} vessels · ${instrLabel} (${files.length} files). Skipped: ${skippedList}` });
      } else {
        setStatus({ type: 'ok', msg: `✓ "${runId}" · ${vesselCount} vessels · ${instrLabel}${files.length > 1 ? ` (${files.length} files merged)` : ''}` });
      }
      setTimeout(() => onFileLoaded(json), 800);
    } catch (err) {
      setStatus({ type: 'err', msg: err.message });
      setIsLoading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); process(e.dataTransfer.files); }}
      className={`relative bg-white rounded-2xl shadow-xl border-2 border-dashed transition-all p-8 ${isDragging ? 'border-rose-400 bg-rose-50 scale-[1.01]' : 'border-slate-300 hover:border-rose-300'}`}
    >
      <input type="file" ref={fileInputRef} accept=".csv,.json" className="hidden" multiple
        onChange={(e) => process(e.target.files)} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLoading ? 'bg-rose-100' : status?.type === 'ok' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          {isLoading ? <RefreshCw className="w-5 h-5 text-rose-600 animate-spin" /> : status?.type === 'ok' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Upload className="w-5 h-5 text-slate-600" />}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Upload Experiment Data</h2>
          <p className="text-xs text-slate-500">Single file or multiple files (auto-merged)</p>
        </div>
      </div>

      {/* Status banner */}
      {status && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-xs font-medium border ${
          status.type === 'ok'   ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          status.type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                   'bg-red-50 border-red-200 text-red-700'
        }`}>
          {status.type === 'err'  && <div className="flex items-center gap-1.5 font-bold mb-1"><AlertCircle className="w-3.5 h-3.5" /> Parse error</div>}
          {status.type === 'warn' && <div className="flex items-center gap-1.5 font-bold mb-1"><AlertCircle className="w-3.5 h-3.5" /> Partial load</div>}
          <span className="break-words">{status.msg}</span>
          {loadedFiles.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{loadedFiles.map(f => <span key={f} className="font-mono text-[9px] bg-white px-1.5 py-0.5 rounded border border-current/20">{f}</span>)}</div>}
        </div>
      )}

      {/* Drop area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-xl bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:border-rose-300 transition-all p-5 flex flex-col items-center gap-3 mb-5"
      >
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { label: 'Roche CEDEX', bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700', Icon: Beaker },
            { label: 'NovaFlex', bg: 'bg-teal-100', border: 'border-teal-200', text: 'text-teal-700', Icon: TestTube2 },
            { label: 'MFCS2', bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-700', Icon: Gauge },
            { label: 'Aster HPLC', bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700', Icon: Microscope },
            { label: 'JSON', bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-700', Icon: FileJson },
          ].map(({ label, bg, border, text, Icon }) => (
            <span key={label} className={`px-2.5 py-1 rounded-full ${bg} ${border} border text-[10px] font-bold ${text} flex items-center gap-1`}>
              <Icon className="w-3 h-3" /> {label}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          {isDragging ? '↓ Drop files to import' : 'Drag & drop one or multiple files (auto-merged) — or click to browse'}
        </p>
        <button className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow">
          Select Files
        </button>
      </div>

      {/* 4-instrument info grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { title: 'Roche CEDEX BIO HT', analytes: 'GLU2B · GLN2B · NH3B · LDH2D · IGGHD', tip: 'Sample: T0792545X11K14', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-800', Icon: Beaker },
          { title: 'NovaFlex BioProfile Flex²', analytes: 'VCD · Viability · Gluc · Lac · pH · pCO2 · Ions', tip: 'Sample: T0792545X11K-5', bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-800', Icon: TestTube2 },
          { title: 'MFCS2 ambr250', analytes: 'pH · DO · Temp · Agitation · Gas Flows · Volume', tip: 'Batch: T0792545X11', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800', Icon: Gauge },
          { title: 'Aster HPLC (Protein A)', analytes: 'mAb Titer (mg/mL) · ProteinA affinity', tip: 'Sample: T0792545X11K14', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800', Icon: Microscope },
        ].map(({ title, analytes, tip, bg, border, text, Icon }) => (
          <div key={title} className={`rounded-xl ${bg} border ${border} p-3`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className={`w-3.5 h-3.5 ${text}`} />
              <span className={`text-[10px] font-bold ${text}`}>{title}</span>
            </div>
            <p className="text-[9px] text-slate-600 leading-relaxed">{analytes}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-mono">{tip}</p>
          </div>
        ))}
      </div>

      {/* Multi-file tip */}
      <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-rose-800 leading-relaxed">
          <strong>Multi-instrument:</strong> Select all 4 CSV files at once — they are auto-detected and merged by vessel ID. All dashboards work with the unified dataset.
        </p>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────

const LandingCard = ({ index, title, subtitle, icon: Icon, colorClass, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onClick}
      className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 cursor-pointer hover:-translate-y-2"
    >
      <div className={`${colorClass} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-rose-600 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed">
        {subtitle}
      </p>
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-5 h-5 text-rose-600" />
      </div>
    </motion.div>
  );
};

// --- EXPERIMENT COMPARE ANALYTICS (Beta) ---
const ExperimentCompareAnalytics = ({ onBack, initialData, exclusions }) => {
  const [loading, setLoading] = useState(true);
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);
  const [leftError, setLeftError] = useState('');
  const [rightError, setRightError] = useState('');
  const [leftData, setLeftData] = useState(null);
  const [rightData, setRightData] = useState(null);
  const [leftExperimentId, setLeftExperimentId] = useState('T0792551');
  const [rightExperimentId, setRightExperimentId] = useState('T0792545');
  const [activeExperimentView, setActiveExperimentView] = useState('both'); // both | left | right
  const [leftRefGroup, setLeftRefGroup] = useState('Reference Group 1');
  const [rightRefGroup, setRightRefGroup] = useState('Reference Group 2');
  const [comparePreset, setComparePreset] = useState('growth');
  const [compareRevision, setCompareRevision] = useState(0);
  const [compareSessions, setCompareSessions] = useState(() => {
    try {
      const raw = localStorage.getItem('fermentation_compare_sessions');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [sessionName, setSessionName] = useState('');

  const leftNamespace = `fermentation_dashboard_compare_left_${leftExperimentId}_`;
  const rightNamespace = `fermentation_dashboard_compare_right_${rightExperimentId}_`;
  const bothNamespace = `fermentation_dashboard_compare_both_${leftExperimentId}_${rightExperimentId}_`;

  const loadExperimentById = async (experimentId) => {
    const res = await fetch(`/api/data/${encodeURIComponent(experimentId)}?source=all`);
    const d = await res.json();
    if (!res.ok || d?.error) throw new Error(d?.error || `Failed to load ${experimentId}`);
    return parseAllSourcesResponse(d.results || {}, experimentId);
  };

  const loadLeft = useCallback(async (experimentId = leftExperimentId) => {
    setLeftLoading(true);
    setLeftError('');
    try {
      const data = await loadExperimentById(experimentId);
      setLeftData(data);
      return data;
    } catch (e) {
      setLeftData(null);
      setLeftError(`Experiment A (${experimentId}) is not loaded. ${e.message || 'Retry connection or choose another experiment.'}`);
      return null;
    } finally { setLeftLoading(false); }
  }, [leftExperimentId]);

  const loadRight = useCallback(async (experimentId = rightExperimentId) => {
    setRightLoading(true);
    setRightError('');
    try {
      const data = await loadExperimentById(experimentId);
      setRightData(data);
      return data;
    } catch (e) {
      setRightData(null);
      setRightError(`Experiment B (${experimentId}) is not loaded. ${e.message || 'Retry connection or choose another experiment.'}`);
      return null;
    } finally { setRightLoading(false); }
  }, [rightExperimentId]);

  const loadBothExperiments = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadLeft(leftExperimentId), loadRight(rightExperimentId)]);
    setLoading(false);
  }, [loadLeft, loadRight, leftExperimentId, rightExperimentId]);

  useEffect(() => { loadBothExperiments(); }, [loadBothExperiments]);
  useEffect(() => { try { localStorage.setItem('fermentation_compare_sessions', JSON.stringify(compareSessions)); } catch {} }, [compareSessions]);

  const listNamespaceState = (prefix) => {
    const payload = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        payload[key.slice(prefix.length)] = localStorage.getItem(key);
      }
    } catch {}
    return payload;
  };

  const restoreNamespaceState = (prefix, payload) => {
    if (!payload || typeof payload !== 'object') return;
    Object.entries(payload).forEach(([k, v]) => { try { localStorage.setItem(prefix + k, v); } catch {} });
  };

  const scopedDataset = (dataset, experimentId, refGroup) => {
    if (!dataset?.bioreactors) return null;
    const next = JSON.parse(JSON.stringify(dataset));
    const mapped = {};
    Object.entries(next.bioreactors).forEach(([brId, br]) => {
      const scopedId = `${experimentId}_${brId}`;
      mapped[scopedId] = {
        ...br,
        condition: `${refGroup} · ${experimentId} · ${br.condition || brId}`,
      };
    });
    return {
      ...next,
      run: { ...(next.run || {}), run_id: experimentId, product: next.run?.product || 'Cell Culture (Compare)' },
      bioreactors: mapped,
    };
  };

  const compareDataset = useMemo(() => {
    if (activeExperimentView === 'left') return scopedDataset(leftData, leftExperimentId, leftRefGroup);
    if (activeExperimentView === 'right') return scopedDataset(rightData, rightExperimentId, rightRefGroup);
    if (!leftData || !rightData) return null;
    const leftScoped = scopedDataset(leftData, leftExperimentId, leftRefGroup);
    const rightScoped = scopedDataset(rightData, rightExperimentId, rightRefGroup);
    return {
      run: {
        run_id: `${leftExperimentId} vs ${rightExperimentId}`,
        product: 'Experiment Compare',
        site: leftData?.run?.site || rightData?.run?.site || 'AT-Vienna',
      },
      bioreactors: {
        ...(leftScoped?.bioreactors || {}),
        ...(rightScoped?.bioreactors || {}),
      },
      _source: 'experiment_compare_merged',
    };
  }, [activeExperimentView, leftData, rightData, leftExperimentId, rightExperimentId, leftRefGroup, rightRefGroup]);

  const activeNamespace = activeExperimentView === 'left' ? leftNamespace : activeExperimentView === 'right' ? rightNamespace : bothNamespace;

  const applyQuickPreset = (presetId) => {
    setComparePreset(presetId);
    const map = {
      growth: { leftMetric: 'viable_cells_x106_c_per_ml', rightMetric: 'cell_viability_pct', dual: true },
      metabolites: { leftMetric: 'gluc_g_per_l', rightMetric: 'lac_g_per_l', dual: true },
      titer: { leftMetric: 'igg_mg_per_l', rightMetric: 'protein_a_hplc_mg_per_l', dual: true },
    };
    const preset = map[presetId] || map.growth;
    try {
      localStorage.setItem(activeNamespace + 'leftMetric', JSON.stringify(preset.leftMetric));
      localStorage.setItem(activeNamespace + 'rightMetric', JSON.stringify(preset.rightMetric));
      localStorage.setItem(activeNamespace + 'enableDualAxis', JSON.stringify(preset.dual));
    } catch {}
    setCompareRevision(v => v + 1);
  };

  const saveCurrentSession = () => {
    const name = sessionName.trim() || `Compare ${new Date().toLocaleString()}`;
    const id = `cmp_${Date.now()}`;
    setCompareSessions(prev => ([{
      id,
      name,
      createdAt: new Date().toISOString(),
      leftExperimentId,
      rightExperimentId,
      leftRefGroup,
      rightRefGroup,
      activeExperimentView,
      comparePreset,
      leftState: listNamespaceState(leftNamespace),
      rightState: listNamespaceState(rightNamespace),
      bothState: listNamespaceState(bothNamespace),
    }, ...prev]).slice(0, 30));
    setSessionName('');
  };

  const loadSession = async (session) => {
    setLeftExperimentId(session.leftExperimentId || 'T0792551');
    setRightExperimentId(session.rightExperimentId || 'T0792545');
    setLeftRefGroup(session.leftRefGroup || 'Reference Group 1');
    setRightRefGroup(session.rightRefGroup || 'Reference Group 2');
    setActiveExperimentView(session.activeExperimentView || 'both');
    setComparePreset(session.comparePreset || 'growth');
    await Promise.all([loadLeft(session.leftExperimentId), loadRight(session.rightExperimentId)]);
    restoreNamespaceState(`fermentation_dashboard_compare_left_${session.leftExperimentId}_`, session.leftState || {});
    restoreNamespaceState(`fermentation_dashboard_compare_right_${session.rightExperimentId}_`, session.rightState || {});
    restoreNamespaceState(`fermentation_dashboard_compare_both_${session.leftExperimentId}_${session.rightExperimentId}_`, session.bothState || {});
    setCompareRevision(v => v + 1);
  };

  const deleteSession = (id) => setCompareSessions(prev => prev.filter(s => s.id !== id));

  const missingBoth = activeExperimentView === 'both' && (!leftData || !rightData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 p-6">
      <div className="max-w-[1700px] mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">Experiment Compare</h1>
              <p className="text-xs text-slate-500 mt-1">Single Yield workspace: View Mode Both overlays two experiments on one plot and one controls panel.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-600"><ChevronRight className="w-3 h-3 rotate-180" /> Back</button>
              <button onClick={loadBothExperiments} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold"><RefreshCw className={`w-3.5 h-3.5 ${(loading || leftLoading || rightLoading) ? 'animate-spin' : ''}`} /> Upload both experiments</button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/70">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Experiment A</p>
              <select value={leftExperimentId} onChange={e => setLeftExperimentId(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs mb-2">
                <option value="T0792551">T0792551</option><option value="T0792545">T0792545</option>
              </select>
              <button onClick={() => loadLeft(leftExperimentId)} className="w-full px-2 py-1.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Retry A</button>
              <select value={leftRefGroup} onChange={e => setLeftRefGroup(e.target.value)} className="mt-2 w-full px-2 py-1.5 border border-slate-200 rounded text-xs">
                <option>Reference Group 1</option><option>Reference Group 2</option><option>Reference Group 3</option>
              </select>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/70">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Experiment B</p>
              <select value={rightExperimentId} onChange={e => setRightExperimentId(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs mb-2">
                <option value="T0792545">T0792545</option><option value="T0792551">T0792551</option>
              </select>
              <button onClick={() => loadRight(rightExperimentId)} className="w-full px-2 py-1.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Retry B</button>
              <select value={rightRefGroup} onChange={e => setRightRefGroup(e.target.value)} className="mt-2 w-full px-2 py-1.5 border border-slate-200 rounded text-xs">
                <option>Reference Group 1</option><option>Reference Group 2</option><option>Reference Group 3</option>
              </select>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/70">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">View Mode</p>
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => setActiveExperimentView('both')} className={`px-2 py-1 rounded text-[10px] font-bold ${activeExperimentView === 'both' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 border border-slate-200'}`}>Both</button>
                <button onClick={() => setActiveExperimentView('left')} className={`px-2 py-1 rounded text-[10px] font-bold ${activeExperimentView === 'left' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 border border-slate-200'}`}>A</button>
                <button onClick={() => setActiveExperimentView('right')} className={`px-2 py-1 rounded text-[10px] font-bold ${activeExperimentView === 'right' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 border border-slate-200'}`}>B</button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/70">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Quick Presets</p>
              <div className="grid grid-cols-1 gap-1">
                {[['growth','Growth compare'],['metabolites','Metabolite drift'],['titer','Titer endpoint']].map(([id,label]) => (
                  <button key={id} onClick={() => applyQuickPreset(id)} className={`px-2 py-1 rounded text-[10px] font-bold border ${comparePreset===id?'bg-indigo-50 text-indigo-700 border-indigo-200':'bg-white text-slate-600 border-slate-200'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/70">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Compare Session</p>
              <div className="flex gap-1">
                <input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Session name" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                <button onClick={saveCurrentSession} className="px-2 py-1.5 rounded bg-indigo-600 text-white text-[10px] font-bold">Save</button>
              </div>
              <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                {compareSessions.length === 0 ? <p className="text-[10px] text-slate-400 italic">No saved sessions</p> : compareSessions.map(s => (
                  <div key={s.id} className="flex items-center gap-1">
                    <button onClick={() => loadSession(s)} className="flex-1 text-left px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-600 hover:bg-slate-50 truncate">{s.name}</button>
                    <button onClick={() => deleteSession(s.id)} className="px-1.5 py-1 rounded bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-200">X</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(leftError || rightError) && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {leftError && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{leftError}</div>}
              {rightError && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{rightError}</div>}
            </div>
          )}

          {activeExperimentView === 'both' && leftData?.run?.run_id && rightData?.run?.run_id && leftData.run.run_id === rightData.run.run_id && (
            <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Warning: both datasets currently point to one run ({leftData.run.run_id}). Select two different experiments to compare.
            </div>
          )}
        </div>

        {(loading || leftLoading || rightLoading) ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading experiments...</div>
        ) : missingBoth ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Both mode requires Experiment A and B loaded successfully.</div>
        ) : compareDataset ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-indigo-50/60">
              <h2 className="text-sm font-bold text-slate-700">
                {activeExperimentView === 'both'
                  ? `${leftExperimentId} (${leftRefGroup}) + ${rightExperimentId} (${rightRefGroup})`
                  : activeExperimentView === 'left'
                    ? `${leftExperimentId} (${leftRefGroup})`
                    : `${rightExperimentId} (${rightRefGroup})`}
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Bioreactor IDs are scoped as EXPERIMENT_BIOREACTOR to allow one-plot comparison.</p>
            </div>
            <YieldAnalytics
              key={`compare-${activeExperimentView}-${leftExperimentId}-${rightExperimentId}-${compareRevision}`}
              onBack={() => {}}
              initialData={compareDataset}
              exclusions={exclusions}
              onExclusionChange={() => {}}
              batchOperations={[]}
              storageNamespace={activeNamespace}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">No experiment dataset is ready.</div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [currentView, setCurrentView] = useState('home');

  // Data is bundled with the app (no fetch, no file upload required).
  // If localStorage contains a user-overridden dataset, it will be used; otherwise we fall back to the embedded JSON.
  const isValidDataset = (data) => {
    return Boolean(data && typeof data === 'object' && data.bioreactors && typeof data.bioreactors === 'object');
  };
  const stripSampleColumns = (data) => {
    if (!isValidDataset(data)) return data;
    let changed = false;
    const cleaned = { ...data, bioreactors: { ...data.bioreactors } };
    Object.entries(cleaned.bioreactors).forEach(([brId, br]) => {
      const series = br?.series || {};
      const keysToRemove = Object.keys(series).filter((key) => {
        const normalized = key.replace(/_/g, ' ');
        return /arrow\s*test/i.test(normalized);
      });
      if (keysToRemove.length === 0) return;
      changed = true;
      const nextSeries = { ...series };
      keysToRemove.forEach((key) => {
        delete nextSeries[key];
      });
      cleaned.bioreactors[brId] = { ...br, series: nextSeries };
    });
    return changed ? cleaned : data;
  };

  const [uploadedData, setUploadedData] = useState(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY_DATA);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (isValidDataset(parsed)) return stripSampleColumns(parsed);
      }
    } catch (e) {
      console.error('Error loading saved data:', e);
    }
    return DEFAULT_DATA; // null — user must upload a file
  });

  // ── Report Draft State (shared across modules) ────────────────────────────
  const STORAGE_KEY_REPORT_DRAFT = 'fermentation_reportDraft';
  const [reportDraft, setReportDraft] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REPORT_DRAFT);
      if (saved) { const parsed = JSON.parse(saved); if (parsed && Array.isArray(parsed.charts)) return parsed; }
    } catch (e) {}
    return { charts: [], title: 'Experiment Report', updatedAt: null };
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY_REPORT_DRAFT, JSON.stringify(reportDraft)); } catch (e) {} }, [reportDraft]);

  const addToReportDraft = (chartConfig) => {
    setReportDraft(prev => ({
      ...prev,
      charts: [...prev.charts, { ...chartConfig, id: `rc_${Date.now()}`, createdAt: new Date().toISOString(), source: 'yield_analytics' }],
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateReportDraftChart = (idx, key, value) => {
    setReportDraft(prev => ({
      ...prev,
      charts: prev.charts.map((c, i) => i === idx ? { ...c, [key]: value, updatedAt: new Date().toISOString() } : c),
      updatedAt: new Date().toISOString(),
    }));
  };

  const removeReportDraftChart = (idx) => {
    setReportDraft(prev => ({
      ...prev,
      charts: prev.charts.filter((_, i) => i !== idx),
      updatedAt: new Date().toISOString(),
    }));
  };

  const clearReportDraft = () => {
    setReportDraft({ charts: [], title: 'Experiment Report', updatedAt: null });
  };

  // Toast state for cross-module notifications
  const [globalToast, setGlobalToast] = useState(null);
  useEffect(() => { if (globalToast) { const t = setTimeout(() => setGlobalToast(null), 3000); return () => clearTimeout(t); } }, [globalToast]);

  // Batch Operations (day + description), used for overlay on Yield Analytics plots
  const STORAGE_KEY_OPERATIONS = 'fermentation_batchOperations';
  const [batchOperations, setBatchOperations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPERATIONS);
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) return parsed; }
    } catch (e) {}
    return [];
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY_OPERATIONS, JSON.stringify(batchOperations)); } catch (e) {} }, [batchOperations]);

  // Exclusion state management - MOVED BEFORE useEffect that uses them
  const [exclusions, setExclusions] = useState(() => {
    try {
      const savedExclusions = localStorage.getItem(STORAGE_KEY_EXCLUSIONS);
      if (savedExclusions) {
        const parsed = JSON.parse(savedExclusions);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading exclusions:', e);
    }
    return {};
  });

  // FIXED: dataEdits useState moved BEFORE useEffect that uses setDataEdits
  const [dataEdits, setDataEdits] = useState(() => {
    try {
      const savedEdits = localStorage.getItem(STORAGE_KEY_EDITS);
      if (savedEdits) {
        const parsed = JSON.parse(savedEdits);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading edits:', e);
    }
    return {};
  });

  // Keep behavior consistent: if someone overrides the dataset (future feature),
  // we persist it. For the embedded dataset this is basically a no-op.
  useEffect(() => {
    if (!isValidDataset(uploadedData)) {
      try {
        localStorage.removeItem(STORAGE_KEY_DATA);
        localStorage.removeItem(STORAGE_KEY_EDITS);
      } catch (e) {}
      // Do NOT reset to DEFAULT_DATA (which is null); just keep null so landing shows upload CTA
      setDataEdits({});
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(uploadedData));
    } catch (e) {
      // ignore quota / private mode issues
    }
  }, [uploadedData]);

  // Save dataEdits to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EDITS, JSON.stringify(dataEdits));
    } catch (e) {
      console.error('Error saving edits:', e);
    }
  }, [dataEdits]);

  const handleExclusionChange = (newExclusions) => {
    setExclusions(newExclusions);
    try {
      localStorage.setItem(STORAGE_KEY_EXCLUSIONS, JSON.stringify(newExclusions));
    } catch (e) {
      console.error('Error saving exclusions:', e);
    }
  };

  const handleDashboardSelect = (dashboard) => {
    setCurrentView(dashboard);
  };

  const getDataValue = (data, bioreactorId, day, metric) => {
    const br = data?.bioreactors?.[bioreactorId];
    if (!br?.timepoints || !br?.series?.[metric]) return null;
    const idx = br.timepoints.findIndex(tp => tp.culture_day === day);
    if (idx === -1) return null;
    return br.series[metric][idx];
  };

  const handleDataEdit = ({ bioreactorId, day, metric, value }) => {
    const editKey = `${bioreactorId}_${day}_${metric}`;
    const currentValue = getDataValue(uploadedData, bioreactorId, day, metric);
    const baseValue = dataEdits[editKey]?.oldValue ?? currentValue;
    if (value === baseValue || (value === null && baseValue === null)) {
      setDataEdits(prev => {
        const next = { ...prev };
        delete next[editKey];
        return next;
      });
    } else {
      setDataEdits(prev => ({
        ...prev,
        [editKey]: {
          bioreactor: bioreactorId,
          day,
          metric,
          oldValue: baseValue,
          newValue: value
        }
      }));
    }

    setUploadedData(prev => {
      const br = prev?.bioreactors?.[bioreactorId];
      if (!br?.timepoints || !br?.series?.[metric]) return prev;
      const idx = br.timepoints.findIndex(tp => tp.culture_day === day);
      if (idx === -1) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      next.bioreactors[bioreactorId].series[metric][idx] = value;
      return next;
    });
  };

  const handleResetToEmbedded = () => {
    // Reset – clear stored data and return to upload screen
    try {
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_EDITS);
    } catch (e) {}
    setUploadedData(null);
    setDataEdits({});
    setCurrentView('home');
  };

  if (currentView === 'batch') return (
    <ErrorBoundary>
      <BatchDashboard
        onBack={() => setCurrentView('home')}
        initialData={uploadedData}
        dataEdits={dataEdits}
        onDataEdit={handleDataEdit}
        exclusions={exclusions}
        onExclusionChange={handleExclusionChange}
        onDataEditsChange={setDataEdits}
        onDataChange={setUploadedData}
        batchOperations={batchOperations}
        onBatchOperationsChange={setBatchOperations}
      />
    </ErrorBoundary>
  );
  if (currentView === 'usp') return (
    <ErrorBoundary>
      <USPAssessmentDashboard
        onBack={() => setCurrentView('home')}
        initialData={uploadedData}
        exclusions={exclusions}
      />
    </ErrorBoundary>
  );
  if (currentView === 'analytics') return (
    <ErrorBoundary>
      <YieldAnalytics
        onBack={() => setCurrentView('home')}
        initialData={uploadedData}
        exclusions={exclusions}
        onExclusionChange={handleExclusionChange}
        batchOperations={batchOperations}
        addToReportDraft={addToReportDraft}
        onToast={setGlobalToast}
      />
    </ErrorBoundary>
  );
  if (currentView === 'statistical') return (
    <ErrorBoundary>
      <StatisticalAnalytics
        onBack={() => setCurrentView('home')}
        initialData={uploadedData}
        exclusions={exclusions}
        reportDraft={reportDraft}
        setReportDraft={setReportDraft}
        addToReportDraft={addToReportDraft}
        updateReportDraftChart={updateReportDraftChart}
        removeReportDraftChart={removeReportDraftChart}
        clearReportDraft={clearReportDraft}
        batchOperations={batchOperations}
      />
    </ErrorBoundary>
  );
  if (currentView === 'compare') return (
    <ErrorBoundary>
      <ExperimentCompareAnalytics
        onBack={() => setCurrentView('home')}
        initialData={uploadedData}
        exclusions={exclusions}
      />
    </ErrorBoundary>
  );
  if (currentView === 'guides') return <OperatorGuides onBack={() => setCurrentView('home')} />;

  // Global Toast Overlay (rendered on landing page, but also floats on dashboards via portal)
  const GlobalToastOverlay = () => globalToast ? (
    <div className="fixed top-6 right-6 z-[9999] animate-[slideIn_0.3s_ease-out]">
      <div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl shadow-emerald-200 flex items-center gap-3 text-sm font-bold">
        <CheckCircle2 className="w-4 h-4" />
        {globalToast}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-[#e11d48] selection:text-white">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#e11d48]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-slate-400/10 blur-[100px]" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 py-8">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-[#e11d48] shadow-[0_0_0_4px_rgba(225,29,72,0.1)]" />
              <span className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">Lab Automation System</span>
              <div className="flex items-center gap-1 ml-2">
                <span className="sr-only">System status lights</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] animate-pulse [animation-delay:200ms]" />
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse [animation-delay:400ms]" />
              </div>
            </div>
            {uploadedData && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                  <Database className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    {uploadedData?.run?.run_id || 'Data'} Loaded
                    {uploadedData?.bioreactors && ` · ${Object.keys(uploadedData.bioreactors).length} vessels`}
                  </span>
                </div>
                <button
                  onClick={handleResetToEmbedded}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Clear Data
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 pb-20 pt-4">
          <div className="mx-auto w-full max-w-7xl">

            {/* Hero */}
            <div className="mb-12">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold uppercase text-rose-700 mb-6 border border-rose-100">
                  <Zap className="h-4 w-4" /><span>Lab Automation v2.0 · CEDEX BIO HT · NovaFlex · MFCS2 · Aster HPLC · TetroScience</span>
                </div>
                <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
                  Automated Insights.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#e11d48] to-[#be123c]">Scientific Speed.</span>
                </h1>
                <p className="text-xl text-slate-500 max-w-2xl leading-relaxed mb-6">
                  Upload files from all 4 instruments (Roche CEDEX, NovaFlex, MFCS2, Aster HPLC) — individually or all at once — or connect live to TetroScience to pull experiments directly from Athena.
                </p>
                {uploadedData && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg max-w-2xl">
                    <p className="text-sm text-green-800 flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Data Ready!</strong> Run <strong>{uploadedData?.run?.run_id}</strong> loaded with{' '}
                        <strong>{Object.keys(uploadedData?.bioreactors || {}).length} vessels</strong>
                        {uploadedData?._source === 'tetroscience_athena' && <span className="ml-1 text-indigo-700 font-bold">· via TetroScience</span>}.
                        Click any dashboard below to start analyzing.
                      </span>
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Data source cards — CSV upload (left) + TetroScience connector (right) */}
              <div className="grid lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
                  <HomepageUploader onFileLoaded={(data) => { setUploadedData(data); try { localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data)); } catch {} }} />
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
                  <TetroScienceConnector onFileLoaded={(data) => { setUploadedData(data); try { localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data)); } catch {} }} />
                </motion.div>
              </div>
            </div>

            {/* Dashboard cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <LandingCard index={0} title="Batch Dashboard" subtitle="Complete dataset overview in tabular format." icon={LayoutDashboard} colorClass="bg-[#e11d48]" onClick={() => handleDashboardSelect('batch')} />
              <LandingCard index={1} title="USP Acceptability Assessment" subtitle="Rapid viability and critical deviation screening." icon={CheckSquare} colorClass="bg-emerald-600" onClick={() => handleDashboardSelect('usp')} />
              <LandingCard index={2} title="Yield Analytics" subtitle="Interactive growth curves with Chart Library presets." icon={BarChart3} colorClass="bg-amber-500" onClick={() => handleDashboardSelect('analytics')} />
              <LandingCard index={3} title="Statistical Analytics and Reports" subtitle="5 analysis modes + persistent Report Builder." icon={TrendingUp} colorClass="bg-emerald-600" onClick={() => handleDashboardSelect('statistical')} />
              <LandingCard index={4} title="Experiment Compare" subtitle="Multi-experiment comparison dashboard for overlay analytics." icon={GitCompare} colorClass="bg-indigo-600" onClick={() => handleDashboardSelect('compare')} />
              <LandingCard index={5} title="Operator Guides" subtitle="Comprehensive documentation and usage instructions." icon={BookOpen} colorClass="bg-slate-800" onClick={() => setCurrentView('guides')} />
            </div>

            {/* 4-Instrument Variable Reference */}
            <div className="mt-12 bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-5">
                <Database className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-800">Instrument Variable Reference — All 4 Sources</h3>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Roche CEDEX */}
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Beaker className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-800">Roche CEDEX BIO HT</span>
                  </div>
                  <div className="space-y-1">
                    {[['GLU2B','Glucose','g/L'],['GLN2B','Glutamine','mmol/L'],['NH3B','Ammonium','mg/L'],['LDH2D','LDH','U/L'],['IGGHD','IgG Titer','g/L'],['ASNHB','Asparagine','mg/L'],['ASPB','Aspartate','mg/L']].map(([code,label,unit]) => (
                      <div key={code} className="flex items-center justify-between">
                        <span className="font-mono text-[9px] bg-purple-100 px-1.5 py-0.5 rounded text-purple-700 font-bold">{code}</span>
                        <span className="text-[9px] text-slate-600">{label}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* NovaFlex */}
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TestTube2 className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-teal-800">NovaFlex BioProfile Flex²</span>
                  </div>
                  <div className="space-y-1">
                    {[['VCD','Viable Cell Density','10⁶/mL'],['TCD','Total Cell Density','10⁶/mL'],['Viability','Cell Viability','%'],['Glucose','Glucose offline','g/L'],['Lactate','Lactate','g/L'],['pH offline','pH offline',''],['pCO2 offline','pCO2','mmHg'],['Osmolality','Osmolality','mOsm/kg'],['Na/K/Ca','Ions','mmol/L']].map(([code,label,unit]) => (
                      <div key={code} className="flex items-center justify-between">
                        <span className="font-mono text-[9px] bg-teal-100 px-1.5 py-0.5 rounded text-teal-700 font-bold">{code}</span>
                        <span className="text-[9px] text-slate-600">{label}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* MFCS2 */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-800">MFCS2 ambr250 (Online)</span>
                  </div>
                  <div className="space-y-1">
                    {[['pH online','pH online',''],['DO %','Dissolved O2','%'],['Temperature','Temperature','°C'],['Agitation','Agitation','rpm'],['Volume','Working Volume','mL'],['Air Flow','Air headspace','mL/min'],['O2/N2/CO2','Gas flows','mL/min'],['Base Pumped','Base volume','mL'],['Acid Pumped','Acid volume','mL']].map(([code,label,unit]) => (
                      <div key={code} className="flex items-center justify-between">
                        <span className="font-mono text-[9px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-700 font-bold">{code}</span>
                        <span className="text-[9px] text-slate-600">{label}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Aster HPLC */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Microscope className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-800">Aster HPLC (Protein A)</span>
                  </div>
                  <div className="space-y-1">
                    {[['ProteinA Titer','mAb Titer (HPLC)','mg/mL']].map(([code,label,unit]) => (
                      <div key={code} className="flex items-center justify-between">
                        <span className="font-mono text-[9px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">{code}</span>
                        <span className="text-[9px] text-slate-600">{label}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{unit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <p className="text-[9px] font-bold text-blue-700 mb-1">Cross-Instrument Comparisons:</p>
                    <div className="space-y-1 text-[9px] text-slate-600">
                      <p>🔗 Glucose: NovaFlex ↔ Roche CEDEX</p>
                      <p>🔗 Ammonium: NovaFlex ↔ Roche CEDEX</p>
                      <p>🔗 pH: NovaFlex offline ↔ MFCS2 online</p>
                      <p>🔗 Titer: Aster HPLC ↔ CEDEX IgG</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">* All instruments use vessel ID (X11–X18) as the common merge key. Culture days are extracted from sample name suffix (K-5 → day 5) or date offset.</p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
