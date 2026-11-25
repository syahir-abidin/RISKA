import Link from "next/link";
import { getCtx } from "@/lib/context";
import { Sidebar } from "@/components/Sidebar";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { SignOut } from "@/components/SignOut";
import { ROLE_LABEL } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2">
          <Link href="/dashboard" className="font-mono text-sm font-semibold tracking-widest text-accent">RISKA</Link>
          <OrgSwitcher orgs={ctx.orgs.map((o) => ({ ...o, role: ROLE_LABEL[o.role] }))} current={ctx.orgId} />
          {ctx.isDemo && <span className="chip bg-amber-100 text-amber-800">DATA DEMO</span>}
          <div className="ml-auto flex items-center gap-3 text-[13px] text-slate-600">
            <span className="hidden sm:inline">{ctx.userName} · {ROLE_LABEL[ctx.role]}</span>
            <SignOut />
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="no-print sticky top-[49px] hidden h-[calc(100vh-49px)] w-52 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-3 md:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6">
          <div className="no-print mb-4 md:hidden"><details className="card"><summary className="cursor-pointer px-3 py-2 text-[13px] font-medium">Menu</summary><div className="px-3 pb-3"><Sidebar /></div></details></div>
          {children}
        </main>
      </div>
    </div>
  );
}
