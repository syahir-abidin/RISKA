// Registri worksheet: definisi kolom setiap grid. Aman diimpor di client & server.
import type { ModuleKey } from "@/db/schema";

export type ColType = "text" | "long" | "select" | "int" | "float" | "bool";
export interface Column {
  key: string;
  label: string;
  type: ColType;
  options?: string[];
  min?: number;
  max?: number;
  width?: number; // px
  hint?: string;
}
export type Computed =
  | { kind: "risk"; label: string; s: string; l: string }
  | { kind: "lopaFlag"; label: string; s: string }
  | { kind: "lopa"; label: string }
  | { kind: "rpn"; label: string; s: string; o: string; d: string }
  | { kind: "ap"; label: string; s: string; o: string; d: string }
  | { kind: "appetite"; label: string; i: string; l: string; category: string }
  | { kind: "kri"; label: string };

export interface GridDef {
  key: GridKey;
  module: ModuleKey;
  title: string;
  parent?: "nodeId" | "areaId"; // induk selain studi
  columns: Column[];
  computed: Computed[];
  recommendationField?: string; // kolom yang dapat dijadikan aksi
  labelFields: string[]; // untuk label sumber aksi & register risiko
}

export type GridKey = "hazopNode" | "hazopRow" | "lopa" | "fireArea" | "fireScenario" | "compliance" | "hiradc" | "fmea" | "coso";

export const GUIDEWORDS = ["No / None", "More", "Less", "As well as", "Part of", "Reverse", "Other than", "Early", "Late", "Before", "After"];
export const PARAMETERS = ["Flow", "Pressure", "Temperature", "Level", "Composition", "Time / Sequence", "Utilitas", "Maintenance", "Start-up / Shutdown"];
const SL = { min: 1, max: 5, width: 52 };
const SOD = { min: 1, max: 10, width: 52 };

export const GRIDS: Record<GridKey, GridDef> = {
  hazopNode: {
    key: "hazopNode", module: "HAZOP", title: "Daftar node",
    columns: [
      { key: "code", label: "ID node", type: "text", width: 90 },
      { key: "name", label: "Nama node", type: "text", width: 170 },
      { key: "boundary", label: "Batas node", type: "long", width: 220 },
      { key: "designIntent", label: "Design intent", type: "long", width: 300 },
      { key: "mode", label: "Mode operasi", type: "select", options: ["Normal", "Start-up", "Shutdown", "Standby", "Maintenance"], width: 120 },
      { key: "drawings", label: "P&ID (no./rev)", type: "long", width: 170 },
    ],
    computed: [], labelFields: ["code", "name"],
  },
  hazopRow: {
    key: "hazopRow", module: "HAZOP", title: "Worksheet HAZOP", parent: "nodeId",
    columns: [
      { key: "parameter", label: "Parameter", type: "select", options: PARAMETERS, width: 120 },
      { key: "guideword", label: "Guideword", type: "select", options: GUIDEWORDS, width: 110 },
      { key: "deviation", label: "Deviasi", type: "text", width: 140, hint: "Terisi otomatis dari guideword + parameter bila kosong" },
      { key: "cause", label: "Penyebab", type: "long", width: 220 },
      { key: "consequence", label: "Konsekuensi (unmitigated)", type: "long", width: 260 },
      { key: "safeguards", label: "Safeguard (tag + jenis)", type: "long", width: 230 },
      { key: "iplCandidate", label: "Kandidat IPL", type: "bool", width: 70 },
      { key: "s", label: "S", type: "int", ...SL },
      { key: "l", label: "L", type: "int", ...SL },
      { key: "recommendation", label: "Rekomendasi", type: "long", width: 240 },
      { key: "discipline", label: "Disiplin", type: "select", options: ["Operasi", "Proses", "Mekanikal", "Elektrikal", "C&I", "HSE", "OEM"], width: 100 },
    ],
    computed: [{ kind: "risk", label: "Risiko", s: "s", l: "l" }, { kind: "lopaFlag", label: "LOPA", s: "s" }],
    recommendationField: "recommendation", labelFields: ["deviation", "cause"],
  },
  lopa: {
    key: "lopa", module: "LOPA", title: "Skenario LOPA",
    columns: [
      { key: "code", label: "ID", type: "text", width: 70 },
      { key: "hazopRef", label: "Ref. HAZOP", type: "text", width: 120 },
      { key: "description", label: "Skenario & konsekuensi", type: "long", width: 260 },
      { key: "severity", label: "S", type: "int", ...SL },
      { key: "initiatingEvent", label: "Kejadian awal", type: "long", width: 180 },
      { key: "ief", label: "IEF (/th)", type: "float", width: 80 },
      { key: "ipls", label: "IPL (Nama | PFD per baris)", type: "long", width: 240 },
      { key: "modifiers", label: "Modifier (Nama | nilai)", type: "long", width: 190 },
      { key: "tmelOverride", label: "TMEL khusus", type: "float", width: 80, hint: "Kosongkan untuk memakai TMEL per severity" },
      { key: "notes", label: "Catatan", type: "long", width: 180 },
    ],
    computed: [{ kind: "lopa", label: "Hasil LOPA" }], labelFields: ["code", "description"],
  },
  fireArea: {
    key: "fireArea", module: "FRA", title: "Fire area register",
    columns: [
      { key: "code", label: "ID area", type: "text", width: 90 },
      { key: "name", label: "Nama area", type: "text", width: 180 },
      { key: "location", label: "Lokasi", type: "text", width: 140 },
      { key: "barriers", label: "Batas / barrier & rating", type: "long", width: 200 },
      { key: "fuelLoad", label: "Fire load dominan", type: "long", width: 180 },
      { key: "occupancy", label: "Penghuni", type: "text", width: 120 },
      { key: "criticalAssets", label: "Aset kritis", type: "long", width: 180 },
    ],
    computed: [], labelFields: ["code", "name"],
  },
  fireScenario: {
    key: "fireScenario", module: "FRA", title: "Skenario kebakaran", parent: "areaId",
    columns: [
      { key: "title", label: "Skenario", type: "text", width: 170 },
      { key: "sequence", label: "Kejadian awal → nyala → pertumbuhan → penjalaran", type: "long", width: 280 },
      { key: "detection", label: "Deteksi", type: "long", width: 150 },
      { key: "suppression", label: "Supresi", type: "long", width: 150 },
      { key: "passive", label: "Proteksi pasif", type: "long", width: 140 },
      { key: "reliability", label: "Keandalan proteksi (ITM)", type: "long", width: 160 },
      { key: "consequence", label: "Konsekuensi", type: "long", width: 220 },
      { key: "s0", label: "S₀", type: "int", ...SL },
      { key: "l0", label: "L₀", type: "int", ...SL },
      { key: "s1", label: "S₁", type: "int", ...SL },
      { key: "l1", label: "L₁", type: "int", ...SL },
      { key: "recommendation", label: "Rekomendasi", type: "long", width: 220 },
    ],
    computed: [{ kind: "risk", label: "Sebelum proteksi", s: "s0", l: "l0" }, { kind: "risk", label: "Sesudah proteksi", s: "s1", l: "l1" }],
    recommendationField: "recommendation", labelFields: ["title"],
  },
  compliance: {
    key: "compliance", module: "FRA", title: "Code compliance", parent: "areaId",
    columns: [
      { key: "requirement", label: "Ketentuan", type: "long", width: 320 },
      { key: "reference", label: "Acuan", type: "text", width: 160 },
      { key: "status", label: "Status", type: "select", options: ["Belum dinilai", "Comply", "Gap", "N/A", "Keputusan FPDBD"], width: 130 },
      { key: "justification", label: "Justifikasi / keputusan", type: "long", width: 280 },
    ],
    computed: [], recommendationField: "justification", labelFields: ["requirement"],
  },
  hiradc: {
    key: "hiradc", module: "HIRADC", title: "Worksheet HIRADC",
    columns: [
      { key: "area", label: "Area", type: "text", width: 110 },
      { key: "activity", label: "Aktivitas", type: "long", width: 170 },
      { key: "routine", label: "Kondisi", type: "select", options: ["Rutin", "Non-rutin", "Darurat"], width: 95 },
      { key: "hazard", label: "Bahaya", type: "long", width: 170 },
      { key: "risk", label: "Risiko", type: "long", width: 170 },
      { key: "existingControls", label: "Pengendalian saat ini", type: "long", width: 200 },
      { key: "s0", label: "S₀", type: "int", ...SL },
      { key: "l0", label: "L₀", type: "int", ...SL },
      { key: "hierarchy", label: "Hirarki", type: "select", options: ["", "Eliminasi", "Substitusi", "Rekayasa", "Administratif", "APD"], width: 110 },
      { key: "additionalControls", label: "Pengendalian tambahan", type: "long", width: 210 },
      { key: "s1", label: "S₁", type: "int", ...SL },
      { key: "l1", label: "L₁", type: "int", ...SL },
      { key: "pic", label: "PIC", type: "text", width: 100 },
      { key: "legalRef", label: "Acuan peraturan", type: "long", width: 160 },
    ],
    computed: [{ kind: "risk", label: "Risiko awal", s: "s0", l: "l0" }, { kind: "risk", label: "Risiko sisa", s: "s1", l: "l1" }],
    recommendationField: "additionalControls", labelFields: ["activity", "hazard"],
  },
  fmea: {
    key: "fmea", module: "FMEA", title: "Worksheet FMEA",
    columns: [
      { key: "item", label: "Item / aset", type: "text", width: 140 },
      { key: "function", label: "Fungsi", type: "long", width: 150 },
      { key: "failureMode", label: "Mode kegagalan", type: "long", width: 160 },
      { key: "effect", label: "Efek", type: "long", width: 180 },
      { key: "cause", label: "Penyebab", type: "long", width: 160 },
      { key: "prevention", label: "Kontrol pencegahan", type: "long", width: 160 },
      { key: "detectionCtl", label: "Kontrol deteksi", type: "long", width: 150 },
      { key: "sev", label: "S", type: "int", ...SOD },
      { key: "occ", label: "O", type: "int", ...SOD },
      { key: "det", label: "D", type: "int", ...SOD },
      { key: "action", label: "Tindakan direkomendasikan", type: "long", width: 200 },
      { key: "pic", label: "PIC", type: "text", width: 100 },
      { key: "sev2", label: "S'", type: "int", ...SOD },
      { key: "occ2", label: "O'", type: "int", ...SOD },
      { key: "det2", label: "D'", type: "int", ...SOD },
    ],
    computed: [
      { kind: "rpn", label: "RPN", s: "sev", o: "occ", d: "det" },
      { kind: "ap", label: "AP", s: "sev", o: "occ", d: "det" },
      { kind: "rpn", label: "RPN'", s: "sev2", o: "occ2", d: "det2" },
    ],
    recommendationField: "action", labelFields: ["item", "failureMode"],
  },
  coso: {
    key: "coso", module: "COSO", title: "Register risiko perusahaan",
    columns: [
      { key: "code", label: "ID", type: "text", width: 70 },
      { key: "objective", label: "Sasaran terdampak", type: "long", width: 170 },
      { key: "category", label: "Kategori", type: "select", options: ["Strategic", "Operations", "Reporting", "Compliance"], width: 110 },
      { key: "component", label: "Komponen COSO 2017", type: "select", options: ["", "Governance & Culture", "Strategy & Objective-Setting", "Performance", "Review & Revision", "Information, Communication & Reporting"], width: 170 },
      { key: "description", label: "Deskripsi risiko", type: "long", width: 230 },
      { key: "owner", label: "Pemilik risiko", type: "text", width: 120 },
      { key: "i0", label: "I₀", type: "int", ...SL },
      { key: "l0", label: "L₀", type: "int", ...SL },
      { key: "response", label: "Respons", type: "select", options: ["", "Accept", "Avoid", "Reduce", "Share"], width: 90 },
      { key: "responsePlan", label: "Rencana respons", type: "long", width: 220 },
      { key: "i1", label: "I₁", type: "int", ...SL },
      { key: "l1", label: "L₁", type: "int", ...SL },
      { key: "kri", label: "KRI", type: "text", width: 150 },
      { key: "kriValue", label: "Nilai KRI", type: "float", width: 75 },
      { key: "kriThreshold", label: "Ambang KRI", type: "float", width: 80 },
      { key: "trend", label: "Tren", type: "select", options: ["Naik", "Stabil", "Turun"], width: 80 },
    ],
    computed: [
      { kind: "risk", label: "Inheren", s: "i0", l: "l0" },
      { kind: "risk", label: "Residual", s: "i1", l: "l1" },
      { kind: "appetite", label: "Appetite", i: "i1", l: "l1", category: "category" },
      { kind: "kri", label: "Status KRI" },
    ],
    recommendationField: "responsePlan", labelFields: ["code", "description"],
  },
};

export const MODULES: Record<ModuleKey, { label: string; standard: string; grids: GridKey[]; description: string }> = {
  HAZOP: { label: "HAZOP", standard: "IEC 61882:2016", grids: ["hazopNode", "hazopRow"], description: "Hazard and Operability Study per node P&ID dengan guideword." },
  LOPA: { label: "LOPA", standard: "IEC 61511, CCPS LOPA", grids: ["lopa"], description: "Layer of Protection Analysis untuk skenario HAZOP berkonsekuensi tinggi dan penentuan SIL." },
  FRA: { label: "FRA", standard: "NFPA 850 (2026), NFPA 551", grids: ["fireArea", "fireScenario", "compliance"], description: "Fire Risk Assessment berbasis fire area, skenario, dan kepatuhan FPDBD." },
  HIRADC: { label: "HIRADC", standard: "PP 50/2012, ISO 45001", grids: ["hiradc"], description: "Identifikasi bahaya, penilaian dan pengendalian risiko K3 per aktivitas." },
  FMEA: { label: "FMEA", standard: "AIAG-VDA (disederhanakan), IEC 60812", grids: ["fmea"], description: "Failure Mode and Effects Analysis peralatan dengan RPN dan Action Priority." },
  COSO: { label: "COSO ERM", standard: "COSO ERM 2017, ISO 31000", grids: ["coso"], description: "Register risiko perusahaan per kategori sasaran, appetite, respons, dan KRI." },
};

export const MODULE_SLUG: Record<string, ModuleKey> = { hazop: "HAZOP", lopa: "LOPA", fra: "FRA", hiradc: "HIRADC", fmea: "FMEA", coso: "COSO" };
export const slugOf = (m: ModuleKey) => m.toLowerCase();

export function composeDeviation(guideword: string, parameter: string): string {
  if (!guideword || !parameter) return "";
  const gw = guideword === "No / None" ? "No" : guideword;
  return `${gw} ${parameter}`;
}

export function rowLabel(grid: GridDef, row: Record<string, unknown>): string {
  return grid.labelFields.map((f) => String(row[f] ?? "").trim()).filter(Boolean).join(" — ").slice(0, 160);
}
