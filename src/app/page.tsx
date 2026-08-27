import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Calendar,
  Utensils,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Personal Life OS untuk Mahasiswa
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Satu tempat untuk semua ritme harimu.
        </h1>

        <p className="text-base sm:text-lg text-zinc-400">
          Kelola pengeluaran, deadline tugas, to-do harian, dan nutrisi dengan
          bantuan automasi AI scan yang cepat.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Mulai Sekarang <ArrowRight size={16} />
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            Daftar Akun
          </Link>
        </div>

        {/* Feature Grid Mini */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 text-left">
          <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-3">
            <DollarSign className="h-5 w-5 text-emerald-400 mb-1.5" />
            <div className="text-xs font-semibold text-zinc-200">
              Finance & Struk
            </div>
            <div className="text-[11px] text-zinc-500">
              Scan otomatis via AI
            </div>
          </div>
          <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-3">
            <CheckCircle2 className="h-5 w-5 text-blue-400 mb-1.5" />
            <div className="text-xs font-semibold text-zinc-200">
              To-Do List
            </div>
            <div className="text-[11px] text-zinc-500">Prioritas harian</div>
          </div>
          <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-3">
            <Calendar className="h-5 w-5 text-amber-400 mb-1.5" />
            <div className="text-xs font-semibold text-zinc-200">Deadline</div>
            <div className="text-[11px] text-zinc-500">Countdown tugas</div>
          </div>
          <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-3">
            <Utensils className="h-5 w-5 text-rose-400 mb-1.5" />
            <div className="text-xs font-semibold text-zinc-200">
              Kalori & Nutrisi
            </div>
            <div className="text-[11px] text-zinc-500">Estimasi foto porsi</div>
          </div>
        </div>
      </div>
    </main>
  );
}
