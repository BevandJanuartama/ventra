"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  ListTodo,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface Todo {
  id: string;
  title: string;
  status: "pending" | "completed";
  priority: "high" | "medium" | "low";
  created_at: string;
}

export default function TodosPage() {
  const supabase = createClient();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "completed">(
    "all",
  );
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">(
    "medium",
  );

  const fetchTodos = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setTodos(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // Perhitungan statistik task
  const totalTasks = todos.length;
  const completedTasks = todos.filter((t) => t.status === "completed").length;
  const activeTasks = totalTasks - completedTasks;
  const progressPercent =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Handler Tambah Task
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("todos")
      .insert([
        {
          user_id: user.id,
          title: newTitle.trim(),
          priority: newPriority,
          status: "pending",
        },
      ])
      .select();

    if (!error && data) {
      setTodos([data[0], ...todos]);
      setNewTitle("");
      setNewPriority("medium");
      setShowAddModal(false);
    }
  };

  // Handler Toggle Status Checkbox
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";

    // Update state secara optimistik
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus as any } : t)),
    );

    await supabase.from("todos").update({ status: nextStatus }).eq("id", id);
  };

  // Handler Hapus Task
  const handleDeleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("todos").delete().eq("id", id);
  };

  // Filter List Task
  const filteredTodos = todos.filter((t) => {
    if (filterTab === "active") return t.status !== "completed";
    if (filterTab === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Tasks */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal text-[#151515]">
            Tasks
          </h1>
          <p className="text-xs text-neutral-500">
            Kelola to-do list dan prioritas harian
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-full bg-[#1C3627] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#152a1e]"
        >
          <Plus size={14} />
          Tambah Task
        </button>
      </div>

      {/* Main Card: Progress Overview */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#1C3627] p-6 text-white shadow-xl shadow-[#1C3627]/10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-emerald-300/80 uppercase">
            Productivity Rate
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
            {progressPercent}% completed
          </span>
        </div>

        <div className="mt-3 flex flex-col">
          <span className="font-serif text-3xl font-medium tracking-tight">
            {completedTasks} of {totalTasks}
          </span>
          <span className="text-xs text-emerald-200/70 mt-0.5">
            {activeTasks} tugas tersisa yang harus diselesaikan
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.07] p-3 backdrop-blur-sm border border-white/5">
            <span className="text-[10px] text-emerald-200/70">Aktif</span>
            <div className="font-serif text-base font-medium">
              {activeTasks} Tasks
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-3 backdrop-blur-sm border border-white/5">
            <span className="text-[10px] text-emerald-200/70">Selesai</span>
            <div className="font-serif text-base font-medium">
              {completedTasks} Tasks
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Task List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-normal text-neutral-900">
            Daftar Tugas
          </h2>

          <div className="flex rounded-lg bg-neutral-100 p-1 text-[11px] font-medium text-neutral-600">
            <button
              onClick={() => setFilterTab("all")}
              className={`rounded-md px-2.5 py-0.5 transition ${
                filterTab === "all" ? "bg-white text-neutral-900 shadow-sm" : ""
              }`}
            >
              Semua ({totalTasks})
            </button>
            <button
              onClick={() => setFilterTab("active")}
              className={`rounded-md px-2.5 py-0.5 transition ${
                filterTab === "active"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : ""
              }`}
            >
              Aktif ({activeTasks})
            </button>
            <button
              onClick={() => setFilterTab("completed")}
              className={`rounded-md px-2.5 py-0.5 transition ${
                filterTab === "completed"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : ""
              }`}
            >
              Selesai ({completedTasks})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            Memuat daftar tugas...
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-400">
            Tidak ada tugas di kategori ini.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map((task) => {
              const isDone = task.status === "completed";
              return (
                <div
                  key={task.id}
                  className="group flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-neutral-200/60 transition hover:border-neutral-300"
                >
                  {/* Clickable check status */}
                  <button
                    onClick={() => handleToggleStatus(task.id, task.status)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    {isDone ? (
                      <CheckCircle2
                        size={18}
                        className="text-emerald-600 shrink-0"
                      />
                    ) : (
                      <Circle
                        size={18}
                        className="text-neutral-300 transition hover:text-neutral-500 shrink-0"
                      />
                    )}
                    <span
                      className={`text-xs ${
                        isDone
                          ? "text-neutral-400 line-through"
                          : "text-neutral-800 font-medium"
                      }`}
                    >
                      {task.title}
                    </span>
                  </button>

                  {/* Priority Badge & Delete Action */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        task.priority === "high"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : task.priority === "medium"
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {task.priority}
                    </span>

                    <button
                      onClick={() => handleDeleteTodo(task.id)}
                      className="text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                      title="Hapus task"
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

      {/* MODAL: TAMBAH TASK BARU */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-medium text-neutral-900">
                Task Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTodo} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Judul Tugas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Selesaikan laporan modul praktikum"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs focus:border-neutral-400 focus:outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Tingkat Prioritas
                </label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPriority("low")}
                    className={`rounded-xl py-2 text-xs font-medium border transition ${
                      newPriority === "low"
                        ? "border-neutral-800 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-neutral-50/50 text-neutral-600"
                    }`}
                  >
                    Low
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPriority("medium")}
                    className={`rounded-xl py-2 text-xs font-medium border transition ${
                      newPriority === "medium"
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-neutral-200 bg-neutral-50/50 text-neutral-600"
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPriority("high")}
                    className={`rounded-xl py-2 text-xs font-medium border transition ${
                      newPriority === "high"
                        ? "border-rose-600 bg-rose-600 text-white"
                        : "border-neutral-200 bg-neutral-50/50 text-neutral-600"
                    }`}
                  >
                    High
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#1C3627] py-2.5 text-xs font-semibold text-white transition hover:bg-[#152a1e] mt-2"
              >
                Simpan Tugas
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
