"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  CalendarDays,
  CheckCircle2,
  Trash2,
  X,
  Clock,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

interface Deadline {
  id: string;
  title: string;
  description?: string;
  category: string;
  deadline: string;
  priority: "high" | "medium" | "low";
  status: "ongoing" | "completed";
}

export default function DeadlinesPage() {
  const supabase = createClient();

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Tugas",
    deadline: "",
    priority: "high" as "high" | "medium" | "low",
  });

  // State Timer untuk Live Countdown
  const [timeLeft, setTimeLeft] = useState({
    days: "00",
    hrs: "00",
    min: "00",
    sec: "00",
  });

  const fetchDeadlines = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("deadlines")
        .select("*")
        .eq("user_id", user.id)
        .order("deadline", { ascending: true });

      if (data) setDeadlines(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeadlines();
  }, []);

  // Filter Ongoing & Selesai
  const ongoingDeadlines = deadlines.filter((d) => d.status === "ongoing");
  const nearest = ongoingDeadlines[0];

  // Update Countdown Timer setiap detik
  useEffect(() => {
    if (!nearest) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nearest.deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: "00", hrs: "00", min: "00", sec: "00" });
      } else {
        setTimeLeft({
          days: String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(
            2,
            "0",
          ),
          hrs: String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(
            2,
            "0",
          ),
          min: String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, "0"),
          sec: String(Math.floor((diff / 1000) % 60)).padStart(2, "0"),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nearest]);

  // Handler Submit Deadline Baru
  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !formData.title || !formData.deadline) return;

    const { data, error } = await supabase
      .from("deadlines")
      .insert([
        {
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          deadline: new Date(formData.deadline).toISOString(),
          priority: formData.priority,
          status: "ongoing",
        },
      ])
      .select();

    if (!error && data) {
      setDeadlines((prev) =>
        [...prev, data[0]].sort(
          (a, b) =>
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
        ),
      );
      setShowAddModal(false);
      setFormData({
        title: "",
        description: "",
        category: "Tugas",
        deadline: "",
        priority: "high",
      });
    }
  };

  // Handler Tandai Selesai
  const handleToggleComplete = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "ongoing" : "completed";
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: nextStatus as any } : d)),
    );

    await supabase
      .from("deadlines")
      .update({ status: nextStatus })
      .eq("id", id);
  };

  // Handler Hapus Deadline
  const handleDelete = async (id: string) => {
    setDeadlines((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("deadlines").delete().eq("id", id);
  };

  const filteredList = deadlines.filter((d) => {
    if (filterCategory === "all") return true;
    return d.category.toLowerCase() === filterCategory.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal text-[#151515]">
            Deadlines
          </h1>
          <p className="text-xs text-neutral-500">
            Pantau jadwal tugas & ujian penting
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-full bg-[#1C3627] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#152a1e]"
        >
          <Plus size={14} />
          Tambah Deadline
        </button>
      </div>

      {/* Main Countdown Card: Nearest Deadline */}
      {nearest ? (
        <div className="relative overflow-hidden rounded-[28px] bg-[#1C3627] p-6 text-white shadow-xl shadow-[#1C3627]/10">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-emerald-300/80 uppercase">
              <Clock size={13} />
              Nearest Deadline
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              {nearest.priority}
            </span>
          </div>

          <div className="mt-3">
            <h2 className="font-serif text-2xl font-medium tracking-tight">
              {nearest.title}
            </h2>
            <p className="text-xs text-emerald-200/70 mt-1">
              {nearest.description || nearest.category}
            </p>
          </div>

          {/* 4 Kotak Live Countdown */}
          <div className="mt-5 grid grid-cols-4 gap-2">
            <div className="rounded-2xl bg-white/[0.08] p-2.5 backdrop-blur-sm border border-white/5 text-center">
              <div className="font-serif text-lg font-medium">
                {timeLeft.days}
              </div>
              <div className="text-[9px] font-semibold tracking-wider text-emerald-200/60">
                DAYS
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.08] p-2.5 backdrop-blur-sm border border-white/5 text-center">
              <div className="font-serif text-lg font-medium">
                {timeLeft.hrs}
              </div>
              <div className="text-[9px] font-semibold tracking-wider text-emerald-200/60">
                HRS
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.08] p-2.5 backdrop-blur-sm border border-white/5 text-center">
              <div className="font-serif text-lg font-medium">
                {timeLeft.min}
              </div>
              <div className="text-[9px] font-semibold tracking-wider text-emerald-200/60">
                MIN
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.08] p-2.5 backdrop-blur-sm border border-white/5 text-center">
              <div className="font-serif text-lg font-medium">
                {timeLeft.sec}
              </div>
              <div className="text-[9px] font-semibold tracking-wider text-emerald-200/60">
                SEC
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] bg-[#1C3627] p-6 text-white text-center shadow-xl shadow-[#1C3627]/10">
          <BookOpen size={28} className="mx-auto mb-2 text-emerald-300/60" />
          <h2 className="font-serif text-xl font-medium">Semua Jadwal Aman</h2>
          <p className="text-xs text-emerald-200/70 mt-1">
            Tidak ada deadline yang mendesak saat ini.
          </p>
        </div>
      )}

      {/* Filter Tabs & Deadline List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-normal text-neutral-900">
            Semua Jadwal
          </h2>

          <div className="flex rounded-lg bg-neutral-100 p-1 text-[11px] font-medium text-neutral-600">
            {["all", "tugas", "proyek", "ujian"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-md px-2 py-0.5 capitalize transition ${
                  filterCategory === cat
                    ? "bg-white text-neutral-900 shadow-sm"
                    : ""
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            Memuat daftar deadline...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-400">
            Belum ada deadline di kategori ini.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredList.map((item) => {
              const isDone = item.status === "completed";
              const targetDate = new Date(item.deadline);

              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-neutral-200/60"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleComplete(item.id, item.status)}
                      className="text-neutral-300 hover:text-emerald-600 transition"
                    >
                      {isDone ? (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-neutral-300 hover:border-neutral-500" />
                      )}
                    </button>

                    <div>
                      <h3
                        className={`text-xs font-semibold ${isDone ? "text-neutral-400 line-through" : "text-neutral-800"}`}
                      >
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-0.5">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>
                          {targetDate.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        item.priority === "high"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : item.priority === "medium"
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {item.priority}
                    </span>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: TAMBAH DEADLINE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-medium text-neutral-900">
                Deadline Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDeadline} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Judul Deadline
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: UTS Pemrograman Web"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs focus:border-neutral-400 focus:outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Mata Kuliah / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: CS2040 · Pak Dosen"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs focus:border-neutral-400 focus:outline-none mt-1"
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
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-2 py-2 text-xs focus:border-neutral-400 focus:outline-none mt-1"
                  >
                    <option value="Tugas">Tugas</option>
                    <option value="Proyek">Proyek</option>
                    <option value="Ujian">Ujian</option>
                    <option value="Kuis">Kuis</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Prioritas
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-2 py-2 text-xs focus:border-neutral-400 focus:outline-none mt-1"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Batas Waktu
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs focus:border-neutral-400 focus:outline-none mt-1"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#1C3627] py-2.5 text-xs font-semibold text-white transition hover:bg-[#152a1e] mt-2"
              >
                Simpan Deadline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
