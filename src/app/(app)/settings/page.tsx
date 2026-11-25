import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites, memberships, users, invitations, auditLogs, roleEnum } from "@/db/schema";
import { getCtx } from "@/lib/context";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { saveRiskConfig, renameOrg, addSite, deleteSite, inviteMember, changeRole, removeMember, cancelInvitation } from "@/app/actions/settings";
import { addDemoOrganization, newOrganization } from "@/app/actions/org";
import { Heatmap } from "@/components/risk";
import { PageHead, Flash, Tabs, fmtDate } from "@/components/ui";

export const metadata = { title: "Pengaturan" };

export default async function Settings({ searchParams }: { searchParams: { tab?: string; m?: string; e?: string } }) {
  const ctx = await getCtx();
  const tab = searchParams.tab ?? "matrix";
  const admin = can(ctx.role, "manageOrg");
  const c = ctx.cfg;
  let body: React.ReactNode = null;

  if (tab === "matrix") {
    body = (
      <form action={saveRiskConfig} className="space-y-4">
        <fieldset disabled={!admin} className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="card card-b"><div className="eyebrow mb-2">Pratinjau zona</div><Heatmap counts={{}} cfg={c} /></div>
            <div className="card card-b">
              <div className="eyebrow mb-2">Ambang zona (skor S×L)</div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="label" htmlFor="t_low">Low ≤</label><input id="t_low" name="t_low" type="number" defaultValue={c.thresholds.low} className="input num" /></div>
                <div><label className="label" htmlFor="t_medium">Medium ≤</label><input id="t_medium" name="t_medium" type="number" defaultValue={c.thresholds.medium} className="input num" /></div>
                <div><label className="label" htmlFor="t_high">High ≤ (di atasnya Extreme)</label><input id="t_high" name="t_high" type="number" defaultValue={c.thresholds.high} className="input num" /></div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(["LOW", "MEDIUM", "HIGH", "EXTREME"] as const).map((z) => <div key={z}><label className="label" htmlFor={`za_${z}`}>Tindakan wajib — {z}</label><textarea id={`za_${z}`} name={`za_${z}`} rows={2} defaultValue={c.zoneActions[z]} className="input" /></div>)}
              </div>
            </div>
          </div>
          <div className="card overflow-x-auto">
            <div className="card-h"><h2 className="h2">Definisi severity</h2></div>
            <table className="tbl"><thead><tr><th>S</th><th>Label</th><th>Manusia</th><th>Aset</th><th>Produksi</th><th>Lingkungan</th><th>Reputasi/regulasi</th></tr></thead>
              <tbody>{c.severity.map((s) => <tr key={s.level}><td className="num">S{s.level}</td>{(["label", "people", "asset", "production", "environment", "reputation"] as const).map((k) => <td key={k} className="px-1.5"><input name={`s${s.level}_${k}`} defaultValue={s[k]} aria-label={`S${s.level} ${k}`} className="input min-w-[120px]" /></td>)}</tr>)}</tbody></table>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="card overflow-x-auto">
              <div className="card-h"><h2 className="h2">Definisi likelihood</h2></div>
              <table className="tbl"><thead><tr><th>L</th><th>Label</th><th>Frekuensi</th></tr></thead>
                <tbody>{c.likelihood.map((l) => <tr key={l.level}><td className="num">L{l.level}</td><td className="px-1.5"><input name={`l${l.level}_label`} defaultValue={l.label} aria-label={`L${l.level} label`} className="input" /></td><td className="px-1.5"><input name={`l${l.level}_frequency`} defaultValue={l.frequency} aria-label={`L${l.level} frekuensi`} className="input" /></td></tr>)}</tbody></table>
            </div>
            <div className="card card-b space-y-3">
              <div><div className="eyebrow mb-2">TMEL LOPA per severity (/tahun)</div>
                <div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((i) => <div key={i}><label className="label" htmlFor={`tmel_${i}`}>S{i}</label><input id={`tmel_${i}`} name={`tmel_${i}`} defaultValue={String(c.tmel[String(i)]).toUpperCase()} className="input num" /></div>)}</div></div>
              <div><div className="eyebrow mb-2">Risk appetite COSO (skor maks. per kategori)</div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{["Strategic", "Operations", "Reporting", "Compliance"].map((k) => <div key={k}><label className="label" htmlFor={`app_${k}`}>{k}</label><input id={`app_${k}`} name={`app_${k}`} type="number" defaultValue={c.appetite[k]} className="input num" /></div>)}</div></div>
            </div>
          </div>
        </fieldset>
        {admin ? <button className="btn btn-primary">Simpan matriks</button> : <p className="text-[13px] text-slate-600">Hanya Owner/Admin yang dapat mengubah matriks.</p>}
      </form>
    );
  } else if (tab === "sites") {
    const list = await db.select().from(sites).where(eq(sites.orgId, ctx.orgId));
    body = (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Site</th><th>Lokasi</th><th /></tr></thead>
          <tbody>{list.map((s) => <tr key={s.id}><td className="font-medium">{s.name}</td><td>{s.location || "–"}</td><td className="text-right">{admin && <form action={deleteSite}><input type="hidden" name="id" value={s.id} /><button className="btn btn-sm btn-danger">Hapus</button></form>}</td></tr>)}
            {list.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-500">Belum ada site.</td></tr>}</tbody></table></div>
        {admin && <form action={addSite} className="card card-b space-y-3 self-start"><div className="eyebrow">Tambah site</div>
          <div><label className="label" htmlFor="sname">Nama site</label><input id="sname" name="name" required className="input" placeholder="mis. PLTU Unit 1-2" /></div>
          <div><label className="label" htmlFor="sloc">Lokasi</label><input id="sloc" name="location" className="input" /></div>
          <button className="btn btn-primary">Tambah</button></form>}
      </div>
    );
  } else if (tab === "members") {
    const mem = await db.select({ m: memberships, u: users }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(eq(memberships.orgId, ctx.orgId));
    const inv = await db.select().from(invitations).where(eq(invitations.orgId, ctx.orgId));
    body = (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th /></tr></thead>
            <tbody>{mem.map(({ m, u }) => (
              <tr key={m.id}><td className="font-medium">{u.name}</td><td>{u.email}</td>
                <td>{admin ? <form action={changeRole} className="flex gap-1"><input type="hidden" name="id" value={m.id} /><select name="role" defaultValue={m.role} className="input py-1" aria-label={`Peran ${u.name}`}>{roleEnum.enumValues.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select><button className="btn btn-sm">Ubah</button></form> : ROLE_LABEL[m.role]}</td>
                <td className="text-right">{admin && u.id !== ctx.userId && <form action={removeMember}><input type="hidden" name="id" value={m.id} /><button className="btn btn-sm btn-danger">Keluarkan</button></form>}</td></tr>
            ))}</tbody></table></div>
          {inv.length > 0 && <div className="card overflow-x-auto"><div className="card-h"><h2 className="h2">Undangan tertunda</h2></div><table className="tbl"><tbody>{inv.map((i) => <tr key={i.id}><td>{i.email}</td><td>{ROLE_LABEL[i.role]}</td><td className="text-right">{admin && <form action={cancelInvitation}><input type="hidden" name="id" value={i.id} /><button className="btn btn-sm">Batalkan</button></form>}</td></tr>)}</tbody></table></div>}
          <div className="card card-b text-xs text-slate-600"><b>Peran:</b> Owner/Admin mengelola organisasi; Facilitator membuat & memimpin studi; Member mengedit worksheet; Reviewer menyetujui studi dan memperbarui aksi; Viewer hanya membaca.</div>
        </div>
        {admin && <form action={inviteMember} className="card card-b space-y-3 self-start"><div className="eyebrow">Undang anggota</div>
          <div><label className="label" htmlFor="iemail">Email</label><input id="iemail" name="email" type="email" required className="input" /></div>
          <div><label className="label" htmlFor="irole">Peran</label><select id="irole" name="role" defaultValue="MEMBER" className="input">{roleEnum.enumValues.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
          <p className="text-xs text-slate-500">Pengguna terdaftar langsung ditambahkan. Email baru bergabung otomatis saat mendaftar. Pengiriman email undangan belum diaktifkan.</p>
          <button className="btn btn-primary">Undang</button></form>}
      </div>
    );
  } else if (tab === "org") {
    body = (
      <div className="grid gap-4 xl:grid-cols-3">
        <form action={renameOrg} className="card card-b space-y-3"><div className="eyebrow">Nama organisasi aktif</div>
          <input name="name" defaultValue={ctx.orgName} className="input" aria-label="Nama organisasi" disabled={!admin} />{admin && <button className="btn btn-primary">Simpan</button>}</form>
        <form action={newOrganization} className="card card-b space-y-3"><div className="eyebrow">Buat organisasi baru</div>
          <input name="name" required className="input" placeholder="Nama organisasi / klien" aria-label="Nama organisasi baru" /><button className="btn">Buat & beralih</button></form>
        <form action={addDemoOrganization} className="card card-b space-y-3"><div className="eyebrow">Organisasi demo</div>
          <p className="text-xs text-slate-600">Buat salinan organisasi “Demo PLTU” berisi contoh data di semua modul.</p><button className="btn">Tambah organisasi demo</button></form>
      </div>
    );
  } else if (tab === "audit") {
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.orgId, ctx.orgId)).orderBy(desc(auditLogs.createdAt)).limit(200);
    body = (
      <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Objek</th><th>Aksi</th><th>Detail</th></tr></thead>
        <tbody>{logs.map((l) => <tr key={l.id}><td className="whitespace-nowrap text-xs">{fmtDate(l.createdAt)} {l.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td><td>{l.userName}</td><td className="font-mono text-xs">{l.entity} · {l.entityId.slice(0, 8)}</td><td>{l.action}</td><td className="max-w-[420px] truncate font-mono text-[11px] text-slate-600" title={JSON.stringify(l.diff)}>{l.diff ? JSON.stringify(l.diff) : ""}</td></tr>)}</tbody></table></div>
    );
  }

  return (
    <>
      <PageHead eyebrow={ctx.orgName} title="Pengaturan" />
      <Flash m={searchParams.m} e={searchParams.e} />
      <Tabs base="/settings" active={tab} tabs={[{ key: "matrix", label: "Matriks risiko" }, { key: "sites", label: "Site" }, { key: "members", label: "Anggota" }, { key: "org", label: "Organisasi" }, { key: "audit", label: "Jejak audit" }]} />
      {body}
    </>
  );
}
