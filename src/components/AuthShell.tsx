export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-widest text-accent">RISKA</div>
          <h1 className="mt-1 text-xl font-semibold">{title}</h1>
          <p className="mt-1 text-[13px] text-slate-600">HAZOP · LOPA · FRA · HIRADC · FMEA · COSO ERM dalam satu register risiko.</p>
        </div>
        <div className="card card-b">{children}</div>
      </div>
    </main>
  );
}
