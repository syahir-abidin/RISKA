"use client";
import { useFormState, useFormStatus } from "react-dom";
import { updateAction, type TrackerState } from "@/app/actions/tracker";

type A = { id: string; number: number; module: string; sourceLabel: string; description: string; owner: string; dueDate: string; priority: string; status: string; evidence: string; verifier: string; justification: string; overdue: boolean; studyHref: string | null };
const STATUSES: [string, string][] = [["OPEN", "Open"], ["IN_PROGRESS", "In Progress"], ["PENDING_VERIFICATION", "Pending Verification"], ["CLOSED", "Closed"], ["REJECTED", "Rejected"]];

function Save() { const { pending } = useFormStatus(); return <button className="btn btn-sm btn-primary" disabled={pending}>{pending ? "…" : "Simpan"}</button>; }

export function ActionRow({ a, editable }: { a: A; editable: boolean }) {
  const [st, act] = useFormState<TrackerState, FormData>(updateAction, {});
  const dis = !editable;
  return (
    <form action={act} className={`grid gap-2 border-b border-slate-100 px-4 py-3 text-[13px] lg:grid-cols-[90px_minmax(0,2.2fr)_minmax(0,1fr)_140px_110px_170px] ${a.overdue ? "bg-red-50/50" : ""}`}>
      <input type="hidden" name="id" value={a.id} />
      <div>
        <div className="font-mono text-xs font-semibold">A-{String(a.number).padStart(4, "0")}</div>
        <div className="text-[11px] text-slate-500">{a.module}</div>
        {a.overdue && <div className="chip mt-1 bg-risk-extbg text-risk-ext">Lewat tenggat</div>}
      </div>
      <div className="min-w-0 space-y-1">
        <textarea name="description" defaultValue={a.description} rows={2} className="input" aria-label="Deskripsi" disabled={dis} />
        <div className="text-[11px] text-slate-500">{a.studyHref ? <a className="text-accent" href={a.studyHref}>{a.sourceLabel || "Sumber"}</a> : a.sourceLabel}</div>
        <input name="justification" defaultValue={a.justification} className="input" placeholder="Justifikasi (wajib bila Rejected)" aria-label="Justifikasi" disabled={dis} />
      </div>
      <div className="space-y-1">
        <input name="owner" defaultValue={a.owner} className="input" placeholder="Pemilik" aria-label="Pemilik" disabled={dis} />
        <input name="evidence" defaultValue={a.evidence} className="input" placeholder="Bukti (no. dokumen / tautan)" aria-label="Bukti" disabled={dis} />
        <input name="verifier" defaultValue={a.verifier} className="input" placeholder="Verifikator" aria-label="Verifikator" disabled={dis} />
      </div>
      <div className="space-y-1">
        <input name="dueDate" type="date" defaultValue={a.dueDate} className="input" aria-label="Tenggat" disabled={dis} />
        <select name="priority" defaultValue={a.priority} className="input" aria-label="Prioritas" disabled={dis}>{["Rendah", "Sedang", "Tinggi", "Kritis"].map((p) => <option key={p}>{p}</option>)}</select>
      </div>
      <div><select name="status" defaultValue={a.status} className="input" aria-label="Status" disabled={dis}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div className="flex flex-col items-start gap-1">
        {editable && <Save />}
        {st.error && <span role="alert" className="text-xs text-red-700">{st.error}</span>}
        {st.ok && <span role="status" className="text-xs text-emerald-700">Tersimpan</span>}
      </div>
    </form>
  );
}
