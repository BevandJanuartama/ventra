import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Camera,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Beef,
  Wheat,
  Droplet,
  CalendarDays,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userName = rawName.trim().split(" ")[0];

  const now = new Date();

  // Titik awal hari lokal (00:00:00)
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  ).toISOString();

  // Fetch data paralel seluruh modul
  const [todosRes, deadlinesRes, transactionsRes, budgetRes, foodLogsRes] =
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
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("food_logs")
        .select("calories, protein, carbs, fat")
        .eq("user_id", user?.id)
        .gte("logged_at", startOfToday),
    ]);

  // 1. DATA KEUANGAN
  const transactions = transactionsRes.data || [];
  const allTimeIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const allTimeExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalNetBalance = allTimeIncome - allTimeExpense;

  const budgetAmount =
    Number(budgetRes.data?.[0]?.amount) ||
    Number(user?.user_metadata?.monthly_budget) ||
    0;
  const netExpense = Math.max(0, allTimeExpense - allTimeIncome);

  const budgetLeft =
    budgetAmount > 0 ? Math.max(0, budgetAmount - netExpense) : 0;

  const budgetPercentageUsed =
    budgetAmount > 0
      ? Math.min(100, Math.round((netExpense / budgetAmount) * 100))
      : 0;

  // 2. DATA KALORI
  const foodLogs = foodLogsRes.data || [];
  const totalCalories = foodLogs.reduce(
    (acc, curr) => acc + Number(curr.calories),
    0,
  );
  const totalProtein = foodLogs.reduce(
    (acc, curr) => acc + Number(curr.protein),
    0,
  );
  const totalCarbs = foodLogs.reduce(
    (acc, curr) => acc + Number(curr.carbs),
    0,
  );
  const totalFat = foodLogs.reduce((acc, curr) => acc + Number(curr.fat), 0);

  const meta = user?.user_metadata || {};
  let targetCalories = Number(meta.target_calories) || 2200;
  if (
    meta.is_calorie_auto !== false &&
    meta.weight &&
    meta.height &&
    meta.age
  ) {
    let bmr =
      10 * Number(meta.weight) +
      6.25 * Number(meta.height) -
      5 * Number(meta.age);
    bmr = meta.gender === "female" ? bmr - 161 : bmr + 5;
    targetCalories = Math.round(bmr * 1.375);
  }
  const caloriePercent = Math.min(
    100,
    Math.round((totalCalories / targetCalories) * 100),
  );
  const caloriesLeft = Math.max(0, targetCalories - totalCalories);

  // 3. DATA DEADLINE
  const deadlines = deadlinesRes.data || [];
  const openDeadlinesCount = deadlines.length;
  const nearestDeadline = deadlines[0];

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

  // 4. DATA TASKS
  const todos = todosRes.data || [];
  const openTasksCount = todos.filter((t) => t.status !== "completed").length;

  const hour = now.getHours();
  const greeting =
    hour < 12
      ? "Good morning,"
      : hour < 18
        ? "Good afternoon,"
        : "Good evening,";

  return (
    <div className="space-y-4">
      {/* Header Greeting */}
      <div className="space-y-0.5">
        <p className="text-xs text-neutral-500">{greeting}</p>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-[#151515]">
          {userName}.
        </h1>
        <p className="text-xs text-neutral-500">
          Kamu memiliki{" "}
          <strong className="font-semibold text-neutral-900">
            {openTasksCount} tugas
          </strong>{" "}
          dan{" "}
          <strong className="font-semibold text-neutral-900">
            {openDeadlinesCount} deadline
          </strong>{" "}
          aktif.
        </p>
      </div>

      {/* 1. KARTU BUDGET HIJAU */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1C3627] p-4 text-white shadow-lg shadow-[#1C3627]/10">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-emerald-300/80 uppercase">
              Total Saldo Bersih
            </span>
            <div className="mt-0.5 font-serif text-2xl font-medium tracking-tight">
              Rp {totalNetBalance.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
              {budgetAmount > 0
                ? `${budgetPercentageUsed}% budget used`
                : "Budget belum diatur"}
            </span>
            <div className="text-[10px] text-emerald-200/70 mt-1">
              {budgetAmount > 0
                ? `Sisa Budget: Rp ${budgetLeft.toLocaleString("id-ID")}`
                : "Belum disetel"}
            </div>
          </div>
        </div>

        {/* Progress Bar Budget */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${budgetPercentageUsed}%` }}
          />
        </div>

        {/* Income & Spent Overview */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.07] px-3 py-2 border border-white/5">
            <div className="flex items-center gap-1 text-[10px] text-emerald-200/70">
              <ArrowDownLeft size={11} />
              <span>Total Masuk</span>
            </div>
            <div className="font-serif text-xs font-medium mt-0.5">
              Rp {allTimeIncome.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.07] px-3 py-2 border border-white/5">
            <div className="flex items-center gap-1 text-[10px] text-rose-200/70">
              <ArrowUpRight size={11} />
              <span>Total Keluar</span>
            </div>
            <div className="font-serif text-xs font-medium mt-0.5">
              Rp {allTimeExpense.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* Action Shortcuts */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/finance"
          className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-xs border border-neutral-200/60 transition hover:border-neutral-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <Camera size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-800">Scan Struk</div>
            <div className="text-[9px] text-neutral-400">Finance OCR</div>
          </div>
        </Link>

        <Link
          href="/calories"
          className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-xs border border-neutral-200/60 transition hover:border-neutral-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <Plus size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-800">
              Scan Makanan
            </div>
            <div className="text-[9px] text-neutral-400">Nutrisi AI</div>
          </div>
        </Link>
      </div>

      {/* 2. KARTU KALORI HIJAU */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1C3627] p-4 text-white shadow-lg shadow-[#1C3627]/10">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-emerald-300/80 uppercase">
              Asupan Hari Ini
            </span>
            <div className="mt-0.5 font-serif text-2xl font-medium tracking-tight">
              {totalCalories.toFixed(0)}{" "}
              <span className="text-xs font-sans font-normal text-emerald-200/70">
                kcal
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
              {caloriePercent}% tercapai
            </span>
            <div className="text-[10px] text-emerald-200/70 mt-1">
              Sisa: {caloriesLeft.toFixed(0)} kcal
            </div>
          </div>
        </div>

        {/* Progress Bar Kalori */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${caloriePercent}%` }}
          />
        </div>

        {/* 3 Makronutrisi Cards */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/[0.07] px-2 py-1.5 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-1 text-[9px] text-emerald-200/70">
              <Beef size={10} />
              <span>Protein</span>
            </div>
            <div className="font-serif text-xs font-medium mt-0.5">
              {totalProtein.toFixed(0)}g
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.07] px-2 py-1.5 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-1 text-[9px] text-amber-200/70">
              <Wheat size={10} />
              <span>Carbs</span>
            </div>
            <div className="font-serif text-xs font-medium mt-0.5">
              {totalCarbs.toFixed(0)}g
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.07] px-2 py-1.5 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-1 text-[9px] text-rose-200/70">
              <Droplet size={10} />
              <span>Fat</span>
            </div>
            <div className="font-serif text-xs font-medium mt-0.5">
              {totalFat.toFixed(0)}g
            </div>
          </div>
        </div>
      </div>

      {/* 3. RINGKASAN DEADLINE TERDEKAT */}
      <div className="rounded-2xl bg-white p-4 shadow-xs border border-neutral-200/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
            <CalendarDays size={14} className="text-neutral-700" />
            <span>Deadline Terdekat</span>
          </div>
          {nearestDeadline ? (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 border border-rose-100">
              {nearestDeadline.priority}
            </span>
          ) : (
            <Link
              href="/deadlines"
              className="text-[10px] text-emerald-800 font-medium hover:underline"
            >
              Buka Jadwal
            </Link>
          )}
        </div>

        <div className="mt-1">
          <h3 className="font-serif text-sm font-medium text-neutral-900">
            {nearestDeadline
              ? nearestDeadline.title
              : "Belum ada deadline mendesak"}
          </h3>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {nearestDeadline
              ? nearestDeadline.description || nearestDeadline.category
              : "Semua tugas penting aman"}
          </p>
        </div>

        {nearestDeadline && (
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            <div className="rounded-lg bg-[#EBEFEA] py-1 text-center">
              <div className="font-serif text-xs font-medium text-neutral-800">
                {daysLeft}
              </div>
              <div className="text-[8px] font-semibold text-neutral-400 tracking-wider">
                DAYS
              </div>
            </div>
            <div className="rounded-lg bg-[#EBEFEA] py-1 text-center">
              <div className="font-serif text-xs font-medium text-neutral-800">
                {hrsLeft}
              </div>
              <div className="text-[8px] font-semibold text-neutral-400 tracking-wider">
                HRS
              </div>
            </div>
            <div className="rounded-lg bg-[#EBEFEA] py-1 text-center">
              <div className="font-serif text-xs font-medium text-neutral-800">
                {minLeft}
              </div>
              <div className="text-[8px] font-semibold text-neutral-400 tracking-wider">
                MIN
              </div>
            </div>
            <div className="rounded-lg bg-[#EBEFEA] py-1 text-center">
              <div className="font-serif text-xs font-medium text-neutral-800">
                {secLeft}
              </div>
              <div className="text-[8px] font-semibold text-neutral-400 tracking-wider">
                SEC
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. RINGKASAN TASKS (PREVIEW 3 TUGAS TERATAS) */}
      <div className="rounded-2xl bg-white p-4 shadow-xs border border-neutral-200/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-sm font-normal text-neutral-900">
            To-Do Tasks ({openTasksCount} tersisa)
          </h2>
          <Link
            href="/todos"
            className="flex items-center text-[10px] font-medium text-emerald-800 hover:underline"
          >
            Kelola <ChevronRight size={12} />
          </Link>
        </div>

        <div className="space-y-1.5">
          {todos.slice(0, 3).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg bg-neutral-50/70 px-2.5 py-1.5 border border-neutral-100"
            >
              <div className="flex items-center gap-2">
                {t.status === "completed" ? (
                  <CheckCircle2
                    size={14}
                    className="text-emerald-600 shrink-0"
                  />
                ) : (
                  <Circle size={14} className="text-neutral-300 shrink-0" />
                )}
                <span
                  className={`text-[11px] truncate max-w-[200px] ${
                    t.status === "completed"
                      ? "text-neutral-400 line-through"
                      : "text-neutral-800 font-medium"
                  }`}
                >
                  {t.title}
                </span>
              </div>
              <span
                className={`text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md ${
                  t.priority === "high"
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : t.priority === "medium"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {t.priority}
              </span>
            </div>
          ))}

          {todos.length === 0 && (
            <p className="py-2 text-center text-xs text-neutral-400">
              Tidak ada tugas yang tertunda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
