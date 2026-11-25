# RISKA — Platform Risiko Terpadu (HAZOP · LOPA · FRA · HIRADC · FMEA · COSO ERM)

Aplikasi SaaS multi-tenant untuk menyusun, meninjau, dan menindaklanjuti studi risiko industri, dengan target awal PLTU batubara di Indonesia.

## Ringkasan

| Aspek | Keputusan |
|---|---|
| Stack | Next.js 14 (App Router), TypeScript, Drizzle ORM, PostgreSQL, NextAuth (credentials, JWT), Tailwind CSS |
| Multi-tenancy | Satu database bersama; setiap tabel domain memiliki `org_id`; semua query & server action disaring dengan organisasi aktif dari sesi |
| Peran | Owner, Admin, Facilitator, Member, Reviewer, Viewer (lihat `src/lib/permissions.ts`) |
| Modul | HAZOP (IEC 61882), LOPA (IEC 61511/CCPS), FRA (NFPA 850-2026/NFPA 551), HIRADC (PP 50/2012, ISO 45001), FMEA, COSO ERM 2017 |
| Lintas modul | Matriks risiko 5×5 per organisasi, Risk Register gabungan, Action tracker (rekomendasi), jejak audit, alur Draft → In Review → Approved dengan revisi |
| Ekspor | Excel (.xlsx) per studi dan laporan siap cetak (simpan PDF dari browser) |

Catatan arsitektur: rencana awal memakai Prisma. Versi ini memakai **Drizzle ORM** karena lingkungan pengembangan tidak dapat mengunduh mesin biner Prisma; Drizzle murni TypeScript, tanpa binary, dan cocok untuk Vercel/serverless. Skema ada di `src/db/schema.ts`, migrasi SQL di `drizzle/`.

## Menjalankan secara lokal

Prasyarat: Node.js 20+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # isi DATABASE_URL dan NEXTAUTH_SECRET
npm run db:migrate            # menerapkan migrasi di folder drizzle/
npm run db:seed               # akun demo: demo@riska.local / riska-demo-2026
npm run dev                   # http://localhost:3000
```

Buat `NEXTAUTH_SECRET` dengan `openssl rand -base64 32`. Ubah akun seed lewat variabel `SEED_EMAIL` dan `SEED_PASSWORD`.

## Deploy ke Vercel tanpa instalasi apa pun (lewat browser)

1. Buat repositori **private** di github.com, lalu unggah seluruh isi folder `riska` (tombol *Add file → Upload files*, seret semua file & folder).
2. Di vercel.com: *Add New → Project → Import* repositori tersebut. Framework terdeteksi otomatis (Next.js).
3. Isi *Environment Variables*: `DATABASE_URL` (connection string PostgreSQL, mis. Neon, dengan `sslmode=require`) dan `NEXTAUTH_SECRET` (string acak panjang). `NEXTAUTH_URL` tidak perlu di Vercel.
4. Klik *Deploy*. Skrip `vercel-build` otomatis membuat/menyelaraskan tabel database (`drizzle-kit push`) lalu membangun aplikasi.
5. Buka URL produksi → *Daftar* → centang "Tambahkan organisasi Demo PLTU" untuk data contoh.

## Struktur kode

```
src/db/schema.ts            Skema Drizzle (semua tabel + enum)
src/lib/risk.ts             Mesin risiko murni: zona 5×5, LOPA/SIL, RPN, Action Priority, appetite COSO (+ risk.test.ts)
src/lib/grids.ts            Registri worksheet: kolom & kolom terhitung per modul (dipakai client & server)
src/lib/context.ts          Sesi + organisasi aktif + cek izin + audit
src/lib/orgs.ts             Pembuatan organisasi, undangan, nomor aksi, data demo
src/lib/templates.ts        Template 14 fire area PLTU + butir kepatuhan NFPA 850-2026
src/app/actions/*.ts        Server actions (grid generik, studi, tracker, pengaturan, auth)
src/components/EditableGrid.tsx  Worksheet yang dapat diedit inline
src/app/(app)/...           Halaman: dashboard, modul, studi, laporan, risk register, rekomendasi, pengaturan
src/app/api/export/[studyId]     Ekspor Excel
e2e/                         Uji end-to-end Playwright (smoke + isolasi tenant)
```

Menambah kolom worksheet: tambahkan kolom di `src/db/schema.ts`, jalankan `npm run db:generate` lalu `npm run db:migrate`, kemudian daftarkan kolom di `src/lib/grids.ts`. UI, validasi, ekspor Excel, dan laporan mengikuti registri secara otomatis.

## Pengujian

```bash
npm test                     # uji unit mesin risiko (Vitest)
npm run typecheck
npm run build && npm start   # lalu, di terminal lain:
./e2e/reset-db.sh            # HANYA database pengembangan: drop + migrate + seed
node e2e/smoke.mjs           # alur utama semua modul
node e2e/isolation.mjs       # pengguna organisasi lain tidak dapat membuka/ekspor studi
```

Hasil verifikasi saat penyerahan: 9 uji unit lulus; build produksi bersih; smoke test lulus (login, edit sel & validasi, deviasi otomatis, aksi dari rekomendasi, LOPA → SIL, template FRA, HIRADC/FMEA/COSO, ekspor Excel, laporan, alur approval & penguncian, validasi status Closed, tampilan ponsel tanpa scroll horizontal); uji isolasi tenant lulus (404 untuk studi dan ekspor organisasi lain).

## Aturan bisnis penting

- Konsekuensi HAZOP dicatat **unmitigated**; baris S ≥ 4 ditandai kandidat LOPA dan dapat diimpor ke studi LOPA.
- LOPA: `f_mit = IEF × Π PFD × modifier`; RRF = f_mit / TMEL; pita SIL mengikuti IEC 61508 (RRF ≤ 100 → SIL 1, ≤ 1000 → SIL 2, ≤ 10000 → SIL 3). TMEL per severity diatur per organisasi.
- Studi berstatus Approved terkunci; perubahan melalui "Buat revisi baru" (nomor revisi naik).
- Aksi Closed wajib memiliki bukti dan verifikator; Rejected wajib justifikasi teknis tertulis.
- Nilai acuan (TMEL, PFD generik, butir kepatuhan NFPA) adalah titik awal dan harus disahkan tim tiap klien.

## Batasan versi ini & langkah berikutnya

1. Undangan belum mengirim email (pengguna bergabung otomatis saat mendaftar dengan email yang diundang). Tambahkan penyedia email (mis. Resend) untuk undangan dan reset kata sandi.
2. Bukti aksi masih berupa teks/tautan; unggah berkas (S3/Supabase Storage) belum ada.
3. Isolasi tenant ditegakkan di lapisan aplikasi. Untuk pertahanan berlapis, aktifkan Row Level Security PostgreSQL dengan `SET app.org_id` per transaksi.
4. Belum ada SSO, 2FA, rate limiting login, dan penagihan (sesuai keputusan: pembayaran setelah MVP).
5. Ekspor PDF memakai cetak browser; generator PDF server-side dapat ditambahkan bila laporan harus diunggah otomatis.
6. Belum ada impor Excel worksheet lama dan komentar per baris untuk reviewer.
