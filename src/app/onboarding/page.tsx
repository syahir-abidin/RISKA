import { newOrganization, addDemoOrganization } from "@/app/actions/org";
import { AuthShell } from "@/components/AuthShell";

export default function Onboarding({ searchParams }: { searchParams: { e?: string } }) {
  return (
    <AuthShell title="Buat organisasi pertama">
      {searchParams.e && <p className="mb-3 text-[13px] text-red-700">Nama organisasi minimal 2 karakter.</p>}
      <form action={newOrganization} className="space-y-3">
        <div><label className="label" htmlFor="name">Nama organisasi</label><input id="name" name="name" required className="input" placeholder="mis. PT Contoh Power" /></div>
        <button className="btn btn-primary w-full">Buat organisasi</button>
      </form>
      <form action={addDemoOrganization} className="mt-3"><button className="btn w-full">Atau buka organisasi Demo PLTU</button></form>
    </AuthShell>
  );
}
