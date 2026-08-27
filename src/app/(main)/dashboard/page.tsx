import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Camera,
  Plus,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Circle,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ambil nama user secara dinamis dari user_metadata atau username email
  const rawName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userName = rawName.trim().split(" ")[0]; // Mengambil nama depan saja

  const now = new Date();
  const currentMonthStr = now
    .toLocaleDateString("en-US", { month: "long" })
    .toUpperCase();
  const todayStr = now.toISOString().split("T")[0];

  // Fetch data agregasi paralel
  const [todosRes, deadlinesRes, transactionsRes, budgetRes] =
    await Promise.all([
      supabase
        .from("todos")
        .select("id, title, status, priority")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("deadlines")
        .select("id, title, description, deadline, priority, category")
        .eq("user_id", user?.id)
        .eq("status", "ongoing")
        .order("deadline", { ascending: true }),
      supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", user?.id),
      supabase
        .from("budgets")
        .select("amount")
        .eq("user_id", user?.id)
        .limit(1),
    ]);

  // Kalkulasi Keuangan
  const transactions = transactionsRes.data || [];
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const spent = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Budget acuan default jika belum dibuat di database
  const totalBudget = Number(budgetRes.data?.[0]?.amount) || 6500000;
  const budgetLeft = Math.max(0, totalBudget - spent);
  const percentageUsed = Math.min(100, Math.round((spent / totalBudget) * 100));

  // Kalkulasi Tasks & Deadlines
  const todos = todosRes.data || [];
  const openTasksCount = todos.filter((t) => t.status !== "completed").length;

  const deadlines = deadlinesRes.data || [];
  const openDeadlinesCount = deadlines.length;
  const nearestDeadline = deadlines[0];

  // Hitung sisa waktu mundur deadline
  let daysLeft = "00",
    hrsLeft = "00",
    minLeft = "00",
    secLeft = "00";

  if (nearestDeadline) {
    const diffMs = new Date(nearestDeadline.deadline).getTime() - now.getTime();
    if (diffMs > 0) {
      daysLeft = String(Math.floor(diffMs / (1000 * 60 * 60 * 24))).padStart(
        2,
        "0",
      );
      hrsLeft = String(Math.floor((diffMs / (1000 * 60 * 60)) % 24)).padStart(
        2,
        "0",
      );
      minLeft = String(Math.floor((diffMs / (1000 * 60)) % 60)).padStart(
        2,
        "0",
      );
      secLeft = String(Math.floor((diffMs / 1000) % 60)).padStart(2, "0");
    }
  }

  // Greeting otomatis berdasarkan jam lokal
  const hour = now.getHours();
  const greeting =
    hour < 12
      ? "Good morning,"
      : hour < 18
        ? "Good afternoon,"
        : "Good evening,";

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="space-y-1">
        <p className="text-sm font-normal text-neutral-500">{greeting}</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#151515]">
          {userName}.
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 pt-0.5">
          You have{" "}
          <strong className="font-semibold text-neutral-900">
            {openTasksCount} tasks
          </strong>{" "}
          and{" "}
          <strong className="font-semibold text-neutral-900">
            {openDeadlinesCount} deadlines
          </strong>{" "}
          open.
        </p>
      </div>

      {/* Main Card: Forest Green Budget */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#1C3627] p-6 text-white shadow-xl shadow-[#1C3627]/10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-emerald-300/80">
            {currentMonthStr} BUDGET
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
            {percentageUsed}% used
          </span>
        </div>

        <div className="mt-3 flex flex-col">
          <span className="font-serif text-3xl font-medium tracking-tight">
            Rp {budgetLeft.toLocaleString("id-ID")}
          </span>
          <span className="text-xs text-emerald-200/70 mt-0.5">
            uang yang telah tersisa
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${percentageUsed}%` }}
          />
        </div>

        {/* Income & Spent Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.07] p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-1 text-[11px] text-emerald-200/70 mb-1">
              <TrendingUp size={12} />
              <span>Income</span>
            </div>
            <div className="font-serif text-sm font-medium">
              Rp {income.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.07] p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-1 text-[11px] text-rose-200/70 mb-1">
              <TrendingDown size={12} />
              <span>Spent</span>
            </div>
            <div className="font-serif text-sm font-medium">
              Rp {spent.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/finance?scan=true"
          className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/60 transition hover:border-neutral-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
            <Camera size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-800">
              Scan receipt
            </div>
            <div className="text-[10px] text-neutral-400">AI extract</div>
          </div>
        </Link>

        <Link
          href="/finance?action=new"
          className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/60 transition hover:border-neutral-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
            <Plus size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-800">New entry</div>
            <div className="text-[10px] text-neutral-400">Manual log</div>
          </div>
        </Link>
      </div>

      {/* Today Section */}
      <div className="space-y-3 pt-2">
        <h2 className="font-serif text-2xl font-normal text-neutral-900">
          Today
        </h2>

        {/* Nearest Deadline Card */}
        <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
              <CalendarDays size={15} className="text-neutral-700" />
              Nearest deadline
            </div>
            {nearestDeadline && (
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-medium text-rose-600 border border-rose-100 uppercase tracking-wider">
                {nearestDeadline.priority || "Urgent"}
              </span>
            )}
          </div>

          <div className="mt-3">
            <h3 className="font-serif text-base font-normal text-neutral-900">
              {nearestDeadline
                ? nearestDeadline.title
                : "Belum ada deadline aktif"}
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {nearestDeadline
                ? nearestDeadline.description || nearestDeadline.category
                : "Semua tugas penting sudah terselesaikan"}
            </p>
          </div>

          {/* Countdown Boxes */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-[#EBEFEA] py-2 text-center">
              <div className="font-serif text-sm font-medium text-neutral-800">
                {daysLeft}
              </div>
              <div className="text-[9px] font-semibold text-neutral-400 tracking-wider">
                DAYS
              </div>
            </div>
            <div className="rounded-xl bg-[#EBEFEA] py-2 text-center">
              <div className="font-serif text-sm font-medium text-neutral-800">
                {hrsLeft}
              </div>
              <div className="text-[9px] font-semibold text-neutral-400 tracking-wider">
                HRS
              </div>
            </div>
            <div className="rounded-xl bg-[#EBEFEA] py-2 text-center">
              <div className="font-serif text-sm font-medium text-neutral-800">
                {minLeft}
              </div>
              <div className="text-[9px] font-semibold text-neutral-400 tracking-wider">
                MIN
              </div>
            </div>
            <div className="rounded-xl bg-[#EBEFEA] py-2 text-center">
              <div className="font-serif text-sm font-medium text-neutral-800">
                {secLeft}
              </div>
              <div className="text-[9px] font-semibold text-neutral-400 tracking-wider">
                SEC
              </div>
            </div>
          </div>
        </div>

        {/* Mini Tasks Preview */}
        <div className="rounded-[24px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/60 space-y-2">
          {todos.slice(0, 3).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                {t.status === "completed" ? (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                ) : (
                  <Circle size={16} className="text-neutral-300" />
                )}
                <span
                  className={`text-xs ${
                    t.status === "completed"
                      ? "text-neutral-400 line-through"
                      : "text-neutral-800 font-medium"
                  }`}
                >
                  {t.title}
                </span>
              </div>
              <span className="text-[9px] font-bold tracking-wider uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                {t.priority}
              </span>
            </div>
          ))}

          {todos.length === 0 && (
            <p className="py-2 text-center text-xs text-neutral-400">
              Belum ada tugas hari ini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
