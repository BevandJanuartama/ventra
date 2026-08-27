"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  Plus,
  Utensils,
  Trash2,
  X,
  Loader2,
  Flame,
  Beef,
  Wheat,
  Droplet,
  SlidersHorizontal,
  Calculator,
} from "lucide-react";

interface FoodLog {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  logged_at: string;
}

export default function CaloriesPage() {
  const supabase = createClient();

  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile & Target Setting State
  const [targetCalories, setTargetCalories] = useState<number>(2200);
  const [profileData, setProfileData] = useState({
    height: "170",
    weight: "65",
    age: "20",
    gender: "male" as "male" | "female",
    isAuto: true,
  });

  // Modals state
  const [showManualModal, setShowManualModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Form Input Makanan State
  const [formData, setFormData] = useState({
    food_name: "",
    serving: "1 porsi",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  // AI Scan State
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");

  // Formula Hitung Target Kalori Otomatis (Mifflin-St Jeor BMR * 1.375)
  const calculateAutoCalories = (
    h: number,
    w: number,
    a: number,
    g: "male" | "female",
  ) => {
    let bmr = 10 * w + 6.25 * h - 5 * a;
    bmr = g === "male" ? bmr + 5 : bmr - 161;
    return Math.round(bmr * 1.375); // Faktor aktivitas harian mahasiswa
  };

  const fetchUserDataAndLogs = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Ambil preferensi profil tubuh dari metadata
      const meta = user.user_metadata || {};
      const h = Number(meta.height) || 170;
      const w = Number(meta.weight) || 65;
      const a = Number(meta.age) || 20;
      const g = (meta.gender as "male" | "female") || "male";
      const isAuto = meta.is_calorie_auto !== false;
      const customTarget = Number(meta.target_calories);

      setProfileData({
        height: String(h),
        weight: String(w),
        age: String(a),
        gender: g,
        isAuto,
      });

      if (isAuto) {
        setTargetCalories(calculateAutoCalories(h, w, a, g));
      } else if (customTarget) {
        setTargetCalories(customTarget);
      }

      // Ambil riwayat makanan hari ini
      const todayStr = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", todayStr)
        .order("created_at", { ascending: false });

      if (data) setFoodLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserDataAndLogs();
  }, []);

  // Perhitungan Akumulasi Nutrisi
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

  const caloriePercent = Math.min(
    100,
    Math.round((totalCalories / targetCalories) * 100),
  );
  const caloriesLeft = Math.max(0, targetCalories - totalCalories);

  // Simpan Pengaturan Profil & Target Kalori
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(profileData.height) || 170;
    const w = Number(profileData.weight) || 65;
    const a = Number(profileData.age) || 20;
    const finalTarget = profileData.isAuto
      ? calculateAutoCalories(h, w, a, profileData.gender)
      : targetCalories;

    setTargetCalories(finalTarget);

    await supabase.auth.updateUser({
      data: {
        height: h,
        weight: w,
        age: a,
        gender: profileData.gender,
        is_calorie_auto: profileData.isAuto,
        target_calories: finalTarget,
      },
    });

    setShowSettingsModal(false);
  };

  // Simpan Makanan Manual
  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("food_logs").insert([
      {
        user_id: user.id,
        food_name: formData.food_name,
        serving: formData.serving || "1 porsi",
        calories: Number(formData.calories) || 0,
        protein: Number(formData.protein) || 0,
        carbs: Number(formData.carbs) || 0,
        fat: Number(formData.fat) || 0,
        logged_at: new Date().toISOString(),
      },
    ]);

    if (!error) {
      setShowManualModal(false);
      setFormData({
        food_name: "",
        serving: "1 porsi",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
      });
      fetchUserDataAndLogs();
    }
  };

  const handleDeleteFood = async (id: string) => {
    setFoodLogs((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("food_logs").delete().eq("id", id);
  };

  const handleScanFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanFile) return;

    setScanLoading(true);
    setScanError("");

    const body = new FormData();
    body.append("file", scanFile);

    try {
      const res = await fetch("/api/calories/scan", {
        method: "POST",
        body,
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Gagal mengidentifikasi makanan");

      setFormData({
        food_name: json.data.food_name || "",
        serving: json.data.serving || "1 porsi",
        calories: String(json.data.calories || 0),
        protein: String(json.data.protein || 0),
        carbs: String(json.data.carbs || 0),
        fat: String(json.data.fat || 0),
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#151515]">
            Calories
          </h1>
          <p className="text-[11px] text-neutral-500">
            Target harian: {targetCalories} kcal{" "}
            {profileData.isAuto ? "(Auto TB/BB)" : "(Manual)"}
          </p>
        </div>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50"
        >
          <SlidersHorizontal size={13} />
          Atur TB/BB
        </button>
      </div>

      {/* Main Forest Green Card (Compact Layout) */}
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

        {/* Progress Bar */}
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
            <div className="text-xs font-bold text-neutral-800">Scan food</div>
            <div className="text-[9px] text-neutral-400">Gemini AI</div>
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
            <div className="text-xs font-bold text-neutral-800">Log meal</div>
            <div className="text-[9px] text-neutral-400">Manual input</div>
          </div>
        </button>
      </div>

      {/* Food Log List */}
      <div className="space-y-3 pt-1">
        <h2 className="font-serif text-lg font-normal text-neutral-900">
          Catatan Hari Ini
        </h2>

        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            Memuat catatan nutrisi...
          </div>
        ) : foodLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-400">
            Belum ada menu makanan yang dicatat hari ini.
          </div>
        ) : (
          <div className="space-y-1.5">
            {foodLogs.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-xl bg-white p-3 shadow-xs border border-neutral-200/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                    <Utensils size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-800">
                      {item.food_name}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {item.serving} • P: {item.protein}g C: {item.carbs}g F:{" "}
                      {item.fat}g
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-serif text-xs font-medium text-neutral-900">
                    {item.calories}{" "}
                    <span className="text-[9px] font-sans font-normal text-neutral-400">
                      kcal
                    </span>
                  </span>
                  <button
                    onClick={() => handleDeleteFood(item.id)}
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

      {/* MODAL PENGATURAN TB / BB & TARGET KALORI */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-medium text-neutral-900">
                Profil Tubuh & Target
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Tinggi Badan (cm)
                  </label>
                  <input
                    type="number"
                    required
                    value={profileData.height}
                    onChange={(e) =>
                      setProfileData({ ...profileData, height: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Berat Badan (kg)
                  </label>
                  <input
                    type="number"
                    required
                    value={profileData.weight}
                    onChange={(e) =>
                      setProfileData({ ...profileData, weight: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Usia (Tahun)
                  </label>
                  <input
                    type="number"
                    required
                    value={profileData.age}
                    onChange={(e) =>
                      setProfileData({ ...profileData, age: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Jenis Kelamin
                  </label>
                  <select
                    value={profileData.gender}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        gender: e.target.value as any,
                      })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2 py-1.5 text-xs focus:outline-hidden"
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
              </div>

              {/* Mode Target: Auto vs Manual */}
              <div className="pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-800">
                    Kalkulasi Otomatis
                  </span>
                  <input
                    type="checkbox"
                    checked={profileData.isAuto}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        isAuto: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded accent-[#1C3627]"
                  />
                </div>

                {!profileData.isAuto && (
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                      Target Kalori Manual (kcal)
                    </label>
                    <input
                      type="number"
                      value={targetCalories}
                      onChange={(e) =>
                        setTargetCalories(Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#1C3627] py-2 text-xs font-semibold text-white transition hover:bg-[#152a1e] mt-2"
              >
                Simpan Profil
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SCAN MAKANAN AI */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-medium text-neutral-900">
                Scan Makanan AI
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

            <form onSubmit={handleScanFood} className="space-y-3">
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 p-5 bg-neutral-50/50">
                <Flame size={24} className="text-neutral-400 mb-1.5" />
                <label className="cursor-pointer text-xs font-semibold text-emerald-800 hover:underline">
                  Pilih Foto Makanan
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
                    Menganalisis nutrisi...
                  </>
                ) : (
                  "Analisis dengan Gemini AI"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MANUAL ENTRY */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-medium text-neutral-900">
                Catat Nutrisi
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFood} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                  Nama Menu
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Nasi Padang Ayam Bakar"
                  value={formData.food_name}
                  onChange={(e) =>
                    setFormData({ ...formData, food_name: e.target.value })
                  }
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Porsi
                  </label>
                  <input
                    type="text"
                    placeholder="1 porsi"
                    value={formData.serving}
                    onChange={(e) =>
                      setFormData({ ...formData, serving: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Kalori (kcal)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="550"
                    value={formData.calories}
                    onChange={(e) =>
                      setFormData({ ...formData, calories: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    placeholder="20"
                    value={formData.protein}
                    onChange={(e) =>
                      setFormData({ ...formData, protein: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    placeholder="60"
                    value={formData.carbs}
                    onChange={(e) =>
                      setFormData({ ...formData, carbs: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    placeholder="15"
                    value={formData.fat}
                    onChange={(e) =>
                      setFormData({ ...formData, fat: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2 py-1.5 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#1C3627] py-2 text-xs font-semibold text-white transition hover:bg-[#152a1e] mt-1"
              >
                Simpan Nutrisi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
