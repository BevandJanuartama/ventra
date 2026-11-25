# Ventra — Life OS

**Ventra** adalah aplikasi web *Personal Life OS* untuk mahasiswa guna mengelola keuangan, daftar tugas (*to-do*), tenggat waktu (*deadline*), serta asupan kalori dan nutrisi harian dalam satu tempat dengan bantuan pemindaian berbasis AI.

## Fitur Utama

- **Autentikasi & Proteksi Rute (`/login`, `/register`)**
  - Masuk dan daftar akun menggunakan Supabase Auth (email & password).
  - Middleware Next.js menjaga rute aplikasi utama (`/dashboard`, `/finance`, `/todos`, `/deadlines`, `/calories`) agar hanya dapat diakses setelah login.
- **Dashboard Terpadu (`/dashboard`)**
  - Ringkasan saldo bersih dan penggunaan budget bulanan, progres kalori & makronutrisi harian, hitung mundur *deadline* terdekat, serta daftar tugas.
- **Keuangan & Scan Struk AI (`/finance`, `POST /api/finance/scan`)**
  - Pencatatan transaksi pemasukan dan pengeluaran, pengaturan saldo awal dan budget bulanan, serta filter berdasarkan tipe, bulan, maupun rentang tanggal.
  - Pemindaian foto struk belanja otomatis menggunakan Google Gemini AI untuk mengekstrak nama *merchant*, tanggal, total nominal, kategori, dan deskripsi item.
- **To-Do List (`/todos`)**
  - Pengelolaan tugas harian dengan tingkat prioritas (`high`, `medium`, `low`), filter status (`all`, `active`, `completed`), serta ringkasan progres penyelesaian.
- **Deadline Tracker (`/deadlines`)**
  - Pengelolaan jadwal tenggat tugas/kegiatan berdasarkan kategori dan prioritas, lengkap dengan *live countdown timer* untuk *deadline* aktif terdekat.
- **Kalori & Scan Makanan AI (`/calories`, `POST /api/calories/scan`)**
  - Pencatatan log makanan harian (kalori, protein, karbohidrat, lemak, dan takaran porsi).
  - Penghitungan target kalori harian otomatis menggunakan rumus Mifflin-St Jeor (BMR × 1.375) berdasarkan profil tubuh atau target manual.
  - Estimasi nama makanan, porsi, kalori, dan makronutrisi dari foto hidangan menggunakan Google Gemini AI.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling & UI**: Tailwind CSS v4, `lucide-react`, `clsx`, `tailwind-merge`
- **Backend & Auth**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **AI**: Google Gemini API (`@google/generative-ai`, model `gemini-3.1-flash-lite`)
- **Linting**: ESLint (`eslint-config-next`)

## Struktur Proyek

```text
src/
├── middleware.ts                  # Middleware Next.js untuk refresh sesi & proteksi rute
├── lib/
│   └── supabase/                  # Helper Supabase (client, server, middleware)
└── app/
    ├── page.tsx                   # Landing page
    ├── (auth)/
    │   ├── login/                 # Halaman masuk
    │   └── register/              # Halaman daftar akun
    ├── (main)/
    │   ├── dashboard/             # Ringkasan harian
    │   ├── finance/               # Manajemen keuangan & scan struk
    │   ├── todos/                 # Daftar to-do harian
    │   ├── deadlines/             # Pelacak deadline & countdown
    │   └── calories/              # Pelacak kalori & scan makanan
    └── api/
        ├── finance/scan/          # Endpoint AI scan struk
        └── calories/scan/         # Endpoint AI scan nutrisi makanan
public/                            # Aset statis
```

## Konfigurasi Environment

Buat file `.env.local` di root proyek (referensi template `.env.example` belum tersedia di repositori ini) dan isi variabel berikut sesuai kebutuhan aplikasi:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
```

> **Catatan:** Pastikan proyek Supabase Anda memiliki tabel `transactions`, `budgets`, `todos`, `deadlines`, dan `food_logs` yang sesuai agar seluruh modul dapat membaca dan menyimpan data.

## Instalasi & Menjalankan Proyek

1. **Instal dependensi**

   ```bash
   npm install
   ```

2. **Siapkan environment variable**

   Lengkapi `.env.local` sesuai bagian [Konfigurasi Environment](#konfigurasi-environment).

3. **Jalankan server pengembangan**

   ```bash
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000) di browser.

### Perintah Lainnya

```bash
npm run build   # Build aplikasi untuk produksi
npm run start   # Menjalankan hasil build produksi
npm run lint    # Menjalankan pemeriksaan ESLint
```
