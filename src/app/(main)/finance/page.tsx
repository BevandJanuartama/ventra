"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  Trash2,
  X,
  Loader2,
  Receipt,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  merchant?: string;
  description?: string;
  date: string;
}

export default function FinancePage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [tempBudgetInput, setTempBudgetInput] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">(
    "all",
  );

  // State Waktu / Periode Bulan Budget (Format: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Date Filter State untuk Riwayat
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals state
  const [showManualModal, setShowManualModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: "expense" as "expense" | "income",
    amount: "",
    category: "Food & Drink",
    merchant: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  // AI Scan State
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 1. Fetch Semua Transaksi
      const { data: transData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (transData) setTransactions(transData);

      // 2. Fetch Budget khusus untuk BULAN yang sedang dipilih (selectedMonth)
      const { data: bData, error: bError } = await supabase
        .from("budgets")
        .select("amount")
        .eq("user_id", user.id)
        .eq("month", selectedMonth)
        .limit(1);

      if (!bError && bData && bData.length > 0) {
        const val = Number(bData[0].amount) || 0;
        setBudgetAmount(val);
        setTempBudgetInput(val > 0 ? String(val) : "");
      } else {
        setBudgetAmount(0);
        setTempBudgetInput("");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]); // Refresh saat bulan diubah

  // Format Nama Bulan untuk UI (contoh: "Agustus 2026")
  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  // Navigasi Ganti Bulan
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  // Perhitungan Saldo Keseluruhan Kumulatif (All Time)
  const allTimeIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const allTimeExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalNetBalance = allTimeIncome - allTimeExpense;

  // PERHITUNGAN KHUSUS BULAN INI (Untuk Progress Budget yang Presisi)
  const monthlyExpense = transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(selectedMonth))
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const monthlyIncome = transactions
    .filter((t) => t.type === "income" && t.date.startsWith(selectedMonth))
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const budgetLeft =
    budgetAmount > 0 ? Math.max(0, budgetAmount - monthlyExpense) : 0;
  const percentageUsed =
    budgetAmount > 0
      ? Math.min(100, Math.round((monthlyExpense / budgetAmount) * 100))
      : 0;

  // Filter List Transaksi di Bagian Bawah
  const filteredTransactions = transactions.filter((t) => {
    const matchesType = filterType === "all" || t.type === filterType;
    const matchesStart = !startDate || t.date >= startDate;
    const matchesEnd = !endDate || t.date <= endDate;
    return matchesType && matchesStart && matchesEnd;
  });

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("transactions").insert([
      {
        user_id: user.id,
        type: formData.type,
        amount: Number(formData.amount),
        category: formData.category,
        merchant: formData.merchant || null,
        description: formData.description || null,
        date: formData.date,
      },
    ]);

    if (!error) {
      setShowManualModal(false);
      setFormData({
        type: "expense",
        amount: "",
        category: "Food & Drink",
        merchant: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      fetchData();
    }
  };

  // Simpan Budget Spesifik Bulan yang Dipilih
  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newAmount = Number(tempBudgetInput) || 0;
    setBudgetAmount(newAmount);

    // Cek apakah data budget user di bulan tersebut sudah ada
    const { data: existing } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from("budgets")
        .update({ amount: newAmount })
        .eq("user_id", user.id)
        .eq("month", selectedMonth);
    } else {
      await supabase.from("budgets").insert([
        {
          user_id: user.id,
          category: "Total",
          amount: newAmount,
          month: selectedMonth,
        },
      ]);
    }

    setShowBudgetModal(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleScanReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanFile) return;

    setScanLoading(true);
    setScanError("");

    const body = new FormData();
    body.append("file", scanFile);

    try {
      const res = await fetch("/api/finance/scan", {
        method: "POST",
        body,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal scan struk");

      setFormData({
        type: "expense",
        amount: String(json.data.total || ""),
        category: json.data.category || "Food & Drink",
        merchant: json.data.merchant || "",
        description: json.data.description || "Scan Struk Otomatis",
        date: json.data.date || new Date().toISOString().split("T")[0],
      });

      setShowScanModal(false);
      setShowManualModal(true);
    } catch (err: any) {
      setScanError(err.message);
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Finance & Pengatur Bulan */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#151515]">
            Finance
          </h1>
          <p className="text-[11px] text-neutral-500">
            Total saldo & budgeting berkala
          </p>
        </div>
        <button
          onClick={() => {
            setTempBudgetInput(budgetAmount > 0 ? String(budgetAmount) : "");
            setShowBudgetModal(true);
          }}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50"
        >
          <SlidersHorizontal size={13} />
          Atur Budget
        </button>
      </div>

      {/* Month Navigator Toolbar */}
      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5 border border-neutral-200/70 shadow-xs">
        <button
          onClick={handlePrevMonth}
          className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 transition"
          title="Bulan Sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-emerald-800" />
          <span className="text-xs font-semibold text-neutral-800">
            Periode: {formatMonthDisplay(selectedMonth)}
          </span>
        </div>
        <button
          onClick={handleNextMonth}
          className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 transition"
          title="Bulan Berikutnya"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Main Forest Green Card (Berbasis Waktu Bulan Ini) */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1C3627] p-4 text-white shadow-lg shadow-[#1C3627]/10">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-emerald-300/80 uppercase">
              Total Saldo Akun (All-Time)
            </span>
            <div className="mt-0.5 font-serif text-2xl font-medium tracking-tight">
              Rp {totalNetBalance.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
              {budgetAmount > 0
                ? `${percentageUsed}% budget terpakai`
                : "Budget belum diatur"}
            </span>
            <div className="text-[10px] text-emerald-200/70 mt-1">
              {budgetAmount > 0
                ? `Sisa Budget: Rp ${budgetLeft.toLocaleString("id-ID")}`
                : "Belum disetel"}
            </div>
          </div>
        </div>

        {/* Progress Bar Bulan Ini */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${percentageUsed}%` }}
          />
        </div>

        {/* Ringkasan Arus Kas Khusus Bulan Ini */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.07] px-3 py-2 border border-white/5">
            <div className="flex items-center gap-1 text-[10px] text-emerald-200/70">
              <ArrowDownLeft size={11} />
              <span>Masuk ({selectedMonth})</span>
            </div>
            <div className="font-serif text-xs font-medium mt-0.5">
              Rp {monthlyIncome.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.07] px-3 py-2 border border-white/5">
            <div className="flex items-center gap-1 text-[10px] text-rose-200/70">
              <ArrowUpRight size={11} />
              <span>Keluar ({selectedMonth})</span>
            </div>
            <div className="font-serif text-xs font-medium mt-0.5">
              Rp {monthlyExpense.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setShowScanModal(true)}
          className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-xs border border-neutral-200/60 text-left transition hover:border-neutral-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <Camera size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-800">
              Scan receipt
            </div>
            <div className="text-[9px] text-neutral-400">Gemini AI OCR</div>
          </div>
        </button>

        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-xs border border-neutral-200/60 text-left transition hover:border-neutral-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <Plus size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-800">New entry</div>
            <div className="text-[9px] text-neutral-400">Manual record</div>
          </div>
        </button>
      </div>

      {/* Section Riwayat & Filter */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-normal text-neutral-900">
            Riwayat Transaksi
          </h2>

          <div className="flex rounded-lg bg-neutral-100 p-0.5 text-[11px] font-medium text-neutral-600">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-md px-2 py-0.5 transition ${
                filterType === "all"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : ""
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`rounded-md px-2 py-0.5 transition ${
                filterType === "expense"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : ""
              }`}
            >
              Keluar
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={`rounded-md px-2 py-0.5 transition ${
                filterType === "income"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : ""
              }`}
            >
              Masuk
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center gap-1.5 rounded-xl bg-white p-2 border border-neutral-200/70 shadow-xs">
          <Calendar size={13} className="text-neutral-400 shrink-0 ml-1" />
          <div className="flex flex-1 items-center gap-1 text-[10px]">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[10px] text-neutral-700 focus:outline-hidden"
              title="Tanggal Mulai"
            />
            <span className="text-neutral-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[10px] text-neutral-700 focus:outline-hidden"
              title="Tanggal Akhir"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              title="Reset Filter Tanggal"
              className="rounded-md bg-neutral-100 p-1 text-neutral-500 hover:bg-neutral-200"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>

        {/* Transaction Items */}
        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            Memuat transaksi...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-400">
            Tidak ada transaksi pada periode atau filter ini.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredTransactions.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-xl bg-white p-3 shadow-xs border border-neutral-200/60"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                      item.type === "income"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {item.type === "income" ? (
                      <ArrowDownLeft size={15} />
                    ) : (
                      <Receipt size={15} />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-800">
                      {item.merchant || item.category}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {item.date}{" "}
                      {item.description ? `• ${item.description}` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-serif text-xs font-medium ${
                      item.type === "income"
                        ? "text-emerald-600"
                        : "text-neutral-900"
                    }`}
                  >
                    {item.type === "income" ? "+" : "-"} Rp{" "}
                    {Number(item.amount).toLocaleString("id-ID")}
                  </span>
                  <button
                    onClick={() => handleDeleteTransaction(item.id)}
                    className="text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: SCAN STRUK AI */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-medium text-neutral-900">
                Scan Struk AI
              </h3>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={16} />
              </button>
            </div>

            {scanError && (
              <div className="mb-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-600 border border-rose-100">
                {scanError}
              </div>
            )}

            <form onSubmit={handleScanReceipt} className="space-y-3">
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 p-5 bg-neutral-50/50">
                <Camera size={24} className="text-neutral-400 mb-1.5" />
                <label className="cursor-pointer text-xs font-semibold text-emerald-800 hover:underline">
                  Pilih Foto Struk
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                  />
                </label>
                {scanFile && (
                  <p className="mt-1.5 text-[10px] text-neutral-500 truncate max-w-[180px]">
                    {scanFile.name}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!scanFile || scanLoading}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1C3627] py-2 text-xs font-semibold text-white transition hover:bg-[#152a1e] disabled:opacity-50"
              >
                {scanLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Mengekstrak data...
                  </>
                ) : (
                  "Proses dengan Gemini AI"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL / REVIEW FORM */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-medium text-neutral-900">
                Catat Transaksi
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-2.5">
              <div className="flex rounded-lg bg-neutral-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "expense" })}
                  className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${
                    formData.type === "expense"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "income" })}
                  className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${
                    formData.type === "income"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Merchant / Sumber
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Indomaret, Gaji, Beasiswa"
                  value={formData.merchant}
                  onChange={(e) =>
                    setFormData({ ...formData, merchant: e.target.value })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2 py-1.5 text-xs focus:outline-hidden"
                  >
                    <option value="Food & Drink">Food & Drink</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Transport">Transport</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Income">Pemasukan/Gaji</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Catatan
                </label>
                <input
                  type="text"
                  placeholder="Catatan tambahan..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#1C3627] py-2 text-xs font-semibold text-white transition hover:bg-[#152a1e] mt-1"
              >
                Simpan Transaksi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ATUR BUDGET BULANAN DENGAN PEMILIH PERIODE */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-medium text-neutral-900">
                Atur Target Budget
              </h3>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateBudget} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Pilih Bulan & Tahun
                </label>
                <input
                  type="month"
                  required
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs font-medium focus:outline-hidden mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Batas Pengeluaran Periode Ini (Rp)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 2500000"
                  value={tempBudgetInput}
                  onChange={(e) => setTempBudgetInput(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-sm font-serif font-medium focus:outline-hidden mt-1"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#1C3627] py-2 text-xs font-semibold text-white transition hover:bg-[#152a1e]"
              >
                Simpan Budget {formatMonthDisplay(selectedMonth)}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
