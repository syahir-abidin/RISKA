"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { GRIDS, GUIDEWORDS, type GridKey, type Column, type Computed } from "@/lib/grids";
import { riskScore, zoneOf, ZONE_LABEL, lopaCalc, rpn, actionPriority, cosoAppetite, fmtSci, type RiskConfig } from "@/lib/risk";
import { addRow, updateCell, deleteRow, createActionFromRow, type Row } from "@/app/actions/grid";

const ZONE_CLS = { LOW: "bg-risk-lowbg text-risk-low", MEDIUM: "bg-risk-medbg text-risk-med", HIGH: "bg-risk-highbg text-risk-high", EXTREME: "bg-risk-extbg text-risk-ext" } as const;
const n = (v: unknown) => (typeof v === "number" ? v : null);

function ComputedCell({ c, row, cfg }: { c: Computed; row: Row; cfg: RiskConfig }) {
  switch (c.kind) {
    case "risk": {
      const sc = riskScore(n(row[c.s]), n(row[c.l]));
      const z = zoneOf(sc, cfg);
      return z ? <span className={clsx("chip num", ZONE_CLS[z])}>{sc} {ZONE_LABEL[z]}</span> : <span className="text-slate-400">–</span>;
    }
    case "lopaFlag":
      return (n(row[c.s]) ?? 0) >= 4 ? <span className="chip bg-red-100 text-red-800" title="Severity ≥ 4: kandidat LOPA">LOPA</span> : <span className="text-slate-300">–</span>;
    case "lopa": {
      const r = lopaCalc({ ief: n(row.ief), ipls: String(row.ipls ?? ""), modifiers: String(row.modifiers ?? ""), severity: n(row.severity), tmelOverride: n(row.tmelOverride) }, cfg);
      return (
        <div className="space-y-0.5 text-xs leading-snug">
          <div>f<sub>mit</sub>: <b className="num">{fmtSci(r.mitigated)}</b> /th</div>
          <div>TMEL: <span className="num">{fmtSci(r.tmel)}</span></div>
          <div>RRF: <span className="num">{r.rrf == null ? "–" : r.rrf < 1 ? "≤ 1" : Math.round(r.rrf).toLocaleString("id-ID")}</span></div>
          <div className={clsx("font-semibold", /SIL [123]|desain/.test(r.sil) ? "text-red-700" : "text-slate-700")}>{r.sil}</div>
          {r.invalid.length > 0 && <div className="text-red-700">Baris tidak valid: {r.invalid.length}</div>}
        </div>
      );
    }
    case "rpn": {
      const v = rpn(n(row[c.s]), n(row[c.o]), n(row[c.d]));
      return v == null ? <span className="text-slate-400">–</span> : <span className={clsx("chip num", v >= 200 ? "bg-risk-extbg text-risk-ext" : v >= 100 ? "bg-risk-highbg text-risk-high" : "bg-slate-100 text-slate-700")}>{v}</span>;
    }
    case "ap": {
      const v = actionPriority(n(row[c.s]), n(row[c.o]), n(row[c.d]));
      return v == null ? <span className="text-slate-400">–</span> : <span className={clsx("chip", v === "H" ? "bg-risk-extbg text-risk-ext" : v === "M" ? "bg-risk-medbg text-risk-med" : "bg-risk-lowbg text-risk-low")}>{v}</span>;
    }
    case "appetite": {
      const v = cosoAppetite(riskScore(n(row[c.i]), n(row[c.l])), String(row[c.category] ?? ""), cfg);
      return v == null ? <span className="text-slate-400">–</span> : <span className={clsx("chip", v === "Di atas appetite" ? "bg-risk-extbg text-risk-ext" : "bg-risk-lowbg text-risk-low")}>{v}</span>;
    }
    case "kri": {
      const val = n(row.kriValue), th = n(row.kriThreshold);
      if (val == null || th == null) return <span className="text-slate-400">–</span>;
      return <span className="num text-xs text-slate-700">{val} / ambang {th}</span>;
    }
  }
}

function Cell({ col, row, editable, onSave }: { col: Column; row: Row; editable: boolean; onSave: (v: unknown) => void }) {
  const v = row[col.key];
  const width = { width: col.width, minWidth: col.width };
  if (!editable) {
    if (col.type === "bool") return <span>{v ? "Ya" : "–"}</span>;
    return <span className="whitespace-pre-wrap break-words">{v == null || v === "" ? <span className="text-slate-300">–</span> : String(v)}</span>;
  }
  const base = "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none";
  if (col.type === "bool")
    return <input type="checkbox" aria-label={col.label} className="mt-1 h-4 w-4 accent-[#0D5C74]" defaultChecked={!!v} onChange={(e) => onSave(e.target.checked)} />;
  if (col.type === "select")
    return (
      <select aria-label={col.label} className={base} style={width} defaultValue={String(v ?? "")} onChange={(e) => onSave(e.target.value)}>
        {!(col.options ?? []).includes("") && <option value="">–</option>}
        {(col.options ?? []).map((o) => <option key={o} value={o}>{o || "–"}</option>)}
      </select>
    );
  if (col.type === "long")
    return <textarea aria-label={col.label} className={clsx(base, "resize-y")} style={width} rows={Math.min(6, Math.max(2, String(v ?? "").split("\n").length))} defaultValue={String(v ?? "")} onBlur={(e) => e.target.value !== String(v ?? "") && onSave(e.target.value)} />;
  const isNum = col.type === "int" || col.type === "float";
  return (
    <input aria-label={col.label} title={col.hint} className={clsx(base, isNum && "num text-center")} style={width} inputMode={isNum ? "decimal" : undefined}
      defaultValue={v == null ? "" : String(v)} onBlur={(e) => e.target.value !== (v == null ? "" : String(v)) && onSave(e.target.value)} />
  );
}

export function EditableGrid({ gridKey, studyId, parentId, initialRows, cfg, editable, actionNumbers, refreshOnChange }: {
  gridKey: GridKey; studyId: string; parentId?: string; initialRows: Row[]; cfg: RiskConfig; editable: boolean; actionNumbers: Record<string, number>; refreshOnChange?: boolean;
}) {
  const router = useRouter();
  const grid = GRIDS[gridKey];
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [actionsMap, setActionsMap] = useState(actionNumbers);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({ kind: "idle" });
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [, start] = useTransition();
  const [helper, setHelper] = useState(false);

  const run = (p: Promise<{ ok: boolean; error?: string; row?: Row; actionNumber?: number }>, after?: (r: { row?: Row; actionNumber?: number }) => void) => {
    setStatus({ kind: "saving" });
    start(async () => {
      const r = await p;
      if (!r.ok) setStatus({ kind: "error", msg: r.error });
      else { setStatus({ kind: "ok", msg: "Tersimpan" }); after?.(r); if (refreshOnChange) router.refresh(); }
    });
  };
  const save = (row: Row, col: Column, v: unknown) => run(updateCell(gridKey, row.id, col.key, v), (r) => r.row && setRows((rs) => rs.map((x) => (x.id === row.id ? r.row! : x))));

  return (
    <div>
      <div className="no-print mb-2 flex flex-wrap items-center gap-2">
        {editable && <button type="button" className="btn btn-sm" onClick={() => run(addRow(gridKey, studyId, parentId), (r) => r.row && setRows((rs) => [...rs, r.row!]))}>+ Tambah baris</button>}
        {gridKey === "hazopRow" && <button type="button" className="btn btn-sm" aria-expanded={helper} onClick={() => setHelper((h) => !h)}>Panduan guideword</button>}
        <span role="status" className={clsx("text-xs", status.kind === "error" ? "text-red-700" : "text-slate-500")}>
          {status.kind === "saving" ? "Menyimpan…" : status.msg ?? ""}
        </span>
        {!editable && <span className="text-xs text-slate-500">Hanya baca (studi terkunci atau peran Anda tidak dapat mengedit).</span>}
      </div>
      {helper && (
        <div className="mb-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="mb-1 font-semibold">Guideword IEC 61882</p>
          <p className="mb-2">{GUIDEWORDS.join(" · ")}. Pilih parameter, lalu guideword; deviasi terisi otomatis. Tulis konsekuensi tanpa safeguard (unmitigated), lalu catat safeguard terpisah dengan tag dan jenisnya. Tandai Kandidat IPL hanya bila independen dari penyebab, spesifik, dapat diandalkan, dan dapat diaudit.</p>
          <p>Setelah semua guideword, periksa juga: start-up/shutdown, maintenance & isolasi, drain/vent, kehilangan utilitas (listrik, udara instrumen, air pendingin, DC), korosi/erosi, faktor manusia.</p>
        </div>
      )}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-8">#</th>
              {grid.columns.map((c) => <th key={c.key} title={c.hint}>{c.label}</th>)}
              {grid.computed.map((c, i) => <th key={i}>{c.label}</th>)}
              {(editable || grid.recommendationField) && <th className="no-print">Tindakan</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={grid.columns.length + grid.computed.length + 2} className="py-6 text-center text-slate-500">Belum ada baris.{editable ? " Klik “+ Tambah baris” untuk mulai." : ""}</td></tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                <td className="num text-xs text-slate-500">{i + 1}</td>
                {grid.columns.map((c) => <td key={c.key} className="px-1.5 py-1"><Cell col={c} row={row} editable={editable} onSave={(v) => save(row, c, v)} /></td>)}
                {grid.computed.map((c, j) => <td key={j}><ComputedCell c={c} row={row} cfg={cfg} /></td>)}
                {(editable || grid.recommendationField) && (
                  <td className="no-print whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {grid.recommendationField && (actionsMap[row.id]
                        ? <a className="chip bg-accent-soft text-accent" href="/actions">A-{String(actionsMap[row.id]).padStart(4, "0")}</a>
                        : editable && <button type="button" className="btn btn-sm" title="Buat aksi di tracker dari kolom rekomendasi" onClick={() => run(createActionFromRow(gridKey, row.id), (r) => r.actionNumber && setActionsMap((m) => ({ ...m, [row.id]: r.actionNumber! })))}>→ Aksi</button>)}
                      {editable && (confirmDel === row.id
                        ? <span className="flex gap-1"><button type="button" className="btn btn-sm btn-danger" onClick={() => { setConfirmDel(null); run(deleteRow(gridKey, row.id), () => setRows((rs) => rs.filter((x) => x.id !== row.id))); }}>Hapus</button><button type="button" className="btn btn-sm" onClick={() => setConfirmDel(null)}>Batal</button></span>
                        : <button type="button" className="btn btn-sm text-slate-500" onClick={() => setConfirmDel(row.id)}>Hapus…</button>)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
