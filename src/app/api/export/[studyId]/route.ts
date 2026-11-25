import ExcelJS from "exceljs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { studies, actions } from "@/db/schema";
import { getCtx } from "@/lib/context";
import { studySheets } from "@/lib/study-data";
import { MODULES } from "@/lib/grids";

export const dynamic = "force-dynamic";

const ZONE_FILL: Record<string, string> = { LOW: "FFE3F2E5", MEDIUM: "FFFBF1DC", HIGH: "FFFCE6D9", EXTREME: "FFF8DADA" };

export async function GET(_req: Request, { params }: { params: { studyId: string } }) {
  const ctx = await getCtx();
  const [study] = await db.select().from(studies).where(and(eq(studies.id, params.studyId), eq(studies.orgId, ctx.orgId))).limit(1);
  if (!study) return new Response("Studi tidak ditemukan", { status: 404 });
  const sheets = await studySheets(ctx.orgId, study, ctx.cfg);
  const acts = await db.select().from(actions).where(and(eq(actions.orgId, ctx.orgId), eq(actions.studyId, study.id)));

  const wb = new ExcelJS.Workbook();
  wb.creator = "RISKA";
  const info = wb.addWorksheet("Info");
  info.columns = [{ width: 24 }, { width: 90 }];
  const meta: [string, string][] = [
    ["Organisasi", ctx.orgName], ["Modul", `${MODULES[study.module].label} (${MODULES[study.module].standard})`], ["Kode", study.code], ["Judul", study.title],
    ["Status", `${study.status} · Rev. ${study.version}`], ["Disetujui", study.approvedBy ? `${study.approvedBy} (${study.approvedAt?.toISOString().slice(0, 10)})` : "-"],
    ["Lingkup", study.scope], ["Dokumen acuan", study.references], ["Tim", study.team], ["Asumsi", study.assumptions], ["Diekspor", new Date().toISOString()],
  ];
  for (const [k, v] of meta) { const r = info.addRow([k, v]); r.getCell(1).font = { bold: true }; r.getCell(2).alignment = { wrapText: true, vertical: "top" }; }

  const used = new Set<string>();
  for (const s of sheets) {
    let name = (s.group ? `${s.group}` : s.title).replace(/[\\/?*[\]:]/g, " ").slice(0, 26);
    if (s.group && s.key !== "hazopRow") name = `${name.slice(0, 22)} ${s.key === "compliance" ? "CC" : "SC"}`;
    let n = name, i = 2; while (used.has(n)) n = `${name.slice(0, 24)} ${i++}`; used.add(n);
    const ws = wb.addWorksheet(n, { views: [{ state: "frozen", ySplit: s.group ? 2 : 1 }] });
    if (s.group) { const t = ws.addRow([`${s.title} — ${s.group}`]); t.font = { bold: true, size: 12 }; }
    const h = ws.addRow(s.headers);
    h.font = { bold: true }; h.alignment = { wrapText: true, vertical: "top" };
    h.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EDF0" } }; });
    s.rows.forEach((row, ri) => {
      const r = ws.addRow(row);
      r.alignment = { wrapText: true, vertical: "top" };
      const z = s.zones[ri];
      if (z) r.getCell(s.headers.length).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZONE_FILL[z] } };
    });
    s.headers.forEach((hd, i) => { ws.getColumn(i + 1).width = Math.min(45, Math.max(8, hd.length + 4, ...s.rows.map((r) => Math.min(45, (r[i] ?? "").length * 0.6)))); });
  }

  const wa = wb.addWorksheet("Rekomendasi");
  wa.addRow(["No.", "Sumber", "Deskripsi", "Pemilik", "Tenggat", "Prioritas", "Status", "Bukti", "Verifikator"]).font = { bold: true };
  for (const a of acts) wa.addRow([`A-${String(a.number).padStart(4, "0")}`, a.sourceLabel, a.description, a.owner, a.dueDate?.toISOString().slice(0, 10) ?? "", a.priority, a.status, a.evidence, a.verifier]);
  wa.columns.forEach((c, i) => { c.width = [9, 30, 60, 18, 12, 10, 18, 30, 18][i]; });

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${study.code.replace(/[^\w.-]+/g, "_")}_Rev${study.version}.xlsx"`,
    },
  });
}
