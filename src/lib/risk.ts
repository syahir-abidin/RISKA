// Mesin risiko bersama — fungsi murni, dipakai server & client.

export type Zone = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export interface SeverityDef { level: number; label: string; people: string; asset: string; production: string; environment: string; reputation: string }
export interface LikelihoodDef { level: number; label: string; frequency: string }
export interface RiskConfig {
  thresholds: { low: number; medium: number; high: number }; // batas atas skor tiap zona (≥ high+1 = EXTREME)
  zoneActions: Record<Zone, string>;
  severity: SeverityDef[];
  likelihood: LikelihoodDef[];
  tmel: Record<string, number>; // target mitigated event likelihood per severity (/tahun)
  appetite: Record<string, number>; // COSO: skor maksimum yang dapat diterima per kategori sasaran
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  thresholds: { low: 4, medium: 9, high: 14 },
  zoneActions: {
    LOW: "Dapat diterima; kelola dengan prosedur rutin dan tinjau berkala.",
    MEDIUM: "Dapat ditoleransi bila ALARP ditunjukkan; rekomendasi 6–12 bulan bila cost-effective.",
    HIGH: "Wajib rekomendasi dalam 3 bulan; teruskan ke LOPA bila S≥4; operasi sementara dengan persetujuan Plant Manager.",
    EXTREME: "Tidak dapat ditoleransi; hentikan/batasi operasi sampai risiko diturunkan; lapor Direksi dan PJK2 segera.",
  },
  severity: [
    { level: 1, label: "Minor", people: "P3K", asset: "< USD 10 rb", production: "Tanpa derating", environment: "Dalam area, segera bersih", reputation: "Internal" },
    { level: 2, label: "Rendah", people: "Medical treatment", asset: "USD 10–100 rb", production: "Derating < 24 jam", environment: "Dalam area, perlu penanganan", reputation: "Keluhan lokal" },
    { level: 3, label: "Sedang", people: "Lost time injury", asset: "USD 0,1–1 jt", production: "Trip 1 unit < 7 hari", environment: "Keluar area, pulih jangka pendek", reputation: "Teguran regulator" },
    { level: 4, label: "Besar", people: "Cacat permanen / 1 fatality", asset: "USD 1–10 jt", production: "Outage 1 unit 7–90 hari", environment: "Pencemaran signifikan, lapor KLHK", reputation: "Sanksi administratif, media nasional" },
    { level: 5, label: "Katastrofik", people: "Multiple fatality", asset: "> USD 10 jt", production: "Outage > 90 hari / beberapa unit", environment: "Kerusakan jangka panjang", reputation: "Pencabutan izin, proses pidana" },
  ],
  likelihood: [
    { level: 1, label: "Sangat jarang", frequency: "< 1E-4 /tahun" },
    { level: 2, label: "Jarang di industri", frequency: "1E-4 – 1E-3 /tahun" },
    { level: 3, label: "Pernah terjadi di industri", frequency: "1E-3 – 1E-2 /tahun" },
    { level: 4, label: "Mungkin terjadi selama umur plant", frequency: "1E-2 – 1E-1 /tahun" },
    { level: 5, label: "Hampir pasti", frequency: "> 1E-1 /tahun" },
  ],
  tmel: { "1": 1e-1, "2": 1e-2, "3": 1e-3, "4": 1e-4, "5": 1e-5 },
  appetite: { Strategic: 9, Operations: 9, Reporting: 4, Compliance: 4 },
};

export function withDefaults(cfg: unknown): RiskConfig {
  const c = (cfg ?? {}) as Partial<RiskConfig>;
  return {
    ...DEFAULT_RISK_CONFIG,
    ...c,
    thresholds: { ...DEFAULT_RISK_CONFIG.thresholds, ...(c.thresholds ?? {}) },
    zoneActions: { ...DEFAULT_RISK_CONFIG.zoneActions, ...(c.zoneActions ?? {}) },
    tmel: { ...DEFAULT_RISK_CONFIG.tmel, ...(c.tmel ?? {}) },
    appetite: { ...DEFAULT_RISK_CONFIG.appetite, ...(c.appetite ?? {}) },
    severity: c.severity?.length === 5 ? c.severity : DEFAULT_RISK_CONFIG.severity,
    likelihood: c.likelihood?.length === 5 ? c.likelihood : DEFAULT_RISK_CONFIG.likelihood,
  };
}

const valid15 = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;

export function riskScore(s?: number | null, l?: number | null): number | null {
  return valid15(s) && valid15(l) ? s * l : null;
}

export function zoneOf(score: number | null, cfg: RiskConfig = DEFAULT_RISK_CONFIG): Zone | null {
  if (score == null) return null;
  const t = cfg.thresholds;
  if (score <= t.low) return "LOW";
  if (score <= t.medium) return "MEDIUM";
  if (score <= t.high) return "HIGH";
  return "EXTREME";
}

export const ZONE_LABEL: Record<Zone, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", EXTREME: "Extreme" };

// ---------- LOPA ----------
export interface ParsedFactor { name: string; value: number }

/** Parse baris "Nama | 0.1" → faktor. Baris tanpa angka valid diabaikan dan dilaporkan. */
export function parseFactors(text: string): { factors: ParsedFactor[]; invalid: string[] } {
  const factors: ParsedFactor[] = [];
  const invalid: string[] = [];
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split("|");
    const v = Number((parts[parts.length - 1] ?? "").trim().replace(",", "."));
    if (parts.length < 2 || !Number.isFinite(v) || v <= 0 || v > 1) invalid.push(line);
    else factors.push({ name: parts.slice(0, -1).join("|").trim(), value: v });
  }
  return { factors, invalid };
}

export interface LopaResult {
  mitigated: number | null;
  tmel: number | null;
  rrf: number | null; // faktor pengurangan risiko tambahan yang dibutuhkan
  sil: string; // rekomendasi
  invalid: string[];
}

export function lopaCalc(input: { ief?: number | null; ipls?: string; modifiers?: string; severity?: number | null; tmelOverride?: number | null }, cfg: RiskConfig = DEFAULT_RISK_CONFIG): LopaResult {
  const ipl = parseFactors(input.ipls ?? "");
  const mod = parseFactors(input.modifiers ?? "");
  const invalid = [...ipl.invalid, ...mod.invalid];
  const tmel = input.tmelOverride ?? (valid15(input.severity) ? cfg.tmel[String(input.severity)] ?? null : null);
  if (input.ief == null || !(input.ief > 0)) return { mitigated: null, tmel, rrf: null, sil: "Isi frekuensi kejadian awal", invalid };
  const mitigated = [...ipl.factors, ...mod.factors].reduce((acc, f) => acc * f.value, input.ief);
  if (tmel == null) return { mitigated, tmel, rrf: null, sil: "Isi severity atau TMEL", invalid };
  const rrf = Number((mitigated / tmel).toPrecision(6));
  return { mitigated, tmel, rrf, sil: silFromRrf(rrf), invalid };
}

export function silFromRrf(rawRrf: number): string {
  // bulatkan ke 6 angka penting agar galat floating point (mis. 100.00000000000003) tidak menggeser pita SIL
  const rrf = Number(rawRrf.toPrecision(6));
  if (rrf <= 1) return "Memadai — tidak perlu SIF";
  if (rrf <= 10) return "Perlu IPL tambahan (non-SIL / SIL a)";
  if (rrf <= 100) return "SIL 1";
  if (rrf <= 1000) return "SIL 2";
  if (rrf <= 10000) return "SIL 3";
  return "> SIL 3 — desain ulang";
}

// ---------- FMEA ----------
const valid110 = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 10;

export function rpn(s?: number | null, o?: number | null, d?: number | null): number | null {
  return valid110(s) && valid110(o) && valid110(d) ? s * o * d : null;
}

/** Action Priority disederhanakan (terinspirasi AIAG-VDA): H / M / L. */
export function actionPriority(s?: number | null, o?: number | null, d?: number | null): "H" | "M" | "L" | null {
  if (!valid110(s) || !valid110(o) || !valid110(d)) return null;
  if (s >= 9 && (o >= 4 || (o >= 2 && d >= 5))) return "H";
  if (s >= 7 && (o >= 6 || (o >= 4 && d >= 7))) return "H";
  if (s >= 7 && o >= 2) return "M";
  if (s >= 4 && (o >= 6 || (o >= 4 && d >= 5))) return "M";
  return "L";
}

// ---------- COSO ----------
export function cosoAppetite(score: number | null, category: string, cfg: RiskConfig = DEFAULT_RISK_CONFIG): "Di atas appetite" | "Dalam appetite" | null {
  if (score == null) return null;
  const limit = cfg.appetite[category];
  if (limit == null) return null;
  return score > limit ? "Di atas appetite" : "Dalam appetite";
}

export function fmtSci(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return n.toExponential(1).replace("e", "E");
}
