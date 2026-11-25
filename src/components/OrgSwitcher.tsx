"use client";
import { switchOrg } from "@/app/actions/org";

export function OrgSwitcher({ orgs, current }: { orgs: { id: string; name: string; role: string }[]; current: string }) {
  return (
    <form action={switchOrg} className="min-w-0">
      <label htmlFor="orgId" className="sr-only">Organisasi aktif</label>
      <select id="orgId" name="orgId" defaultValue={current} className="input max-w-[260px] py-1" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}
      </select>
    </form>
  );
}
