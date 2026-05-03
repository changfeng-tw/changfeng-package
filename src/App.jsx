import React, { useState, useEffect } from "react";
import { loadPackages, savePackage, removePackage, subscribePackages } from "./firebase";
import { Package, CheckCircle2, Clock, Search, Plus, Bell, Home, X, Truck, User, Hash, Calendar, AlertCircle, KeyRound, LogOut, Copy, MessageSquare } from "lucide-react";



export default function PackageManagementSystem() {
  const [view, setView] = useState("resident");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [pickupModal, setPickupModal] = useState(null); // 領取時輸入領取人姓名
  const [pickupName, setPickupName] = useState("");
  const [searchUnit, setSearchUnit] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [copyModal, setCopyModal] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [messageModal, setMessageModal] = useState(null);
  const [messageInput, setMessageInput] = useState("");

  // 住戶端登入狀態
  const [residentUnit, setResidentUnit] = useState("");
  const [unitInput, setUnitInput] = useState(() => {
    return localStorage.getItem("savedResidentUnit") || "";
  });

  // 管理員登入狀態（社區共用密碼）
  const ADMIN_PASSWORD = "changfeng2025";
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    const expires = localStorage.getItem("adminLoginExpires");
    if (!expires) return false;
    if (Date.now() > parseInt(expires)) {
      localStorage.removeItem("adminLoginExpires");
      return false;
    }
    return true;
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [rememberAdmin, setRememberAdmin] = useState(true);

  const [form, setForm] = useState({
    unit: "",
    residentName: "",
    courier: "",
    trackingNo: "",
    note: "",
  });

  // 房號格式：O號O樓（例：3號5樓、12號8樓）
  // 接受全形/半形數字、有無空格
  const parseUnit = (input) => {
    if (!input) return null;
    // 全形數字轉半形
    const normalized = input
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/\s+/g, "")
      .trim();
    // 比對格式：數字 + 號 + 數字 + 樓
    const match = normalized.match(/^(\d{1,3})號(\d{1,3})樓$/);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    const floor = parseInt(match[2], 10);
    if (num < 1 || floor < 1) return null;
    return { num, floor, formatted: `${num}號${floor}樓` };
  };

  const isValidUnit = (input) => parseUnit(input) !== null;

  useEffect(() => {
    loadData();
  }, []);

const loadData = async () => {
    try {
      const list = await loadPackages();
      setPackages(list);
    } catch (e) {
      console.error("載入失敗", e);
    }
    setLoading(false);
  };

  // 訂閱即時更新：其他裝置修改後會自動同步
  useEffect(() => {
    const unsubscribe = subscribePackages((list) => {
      setPackages(list);
    });
    return () => unsubscribe();
  }, []);

// saveData 已不再需要（Firebase 自動同步）
  // 保留空殼以相容於原有呼叫
  const saveData = async () => {};

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const handleAddPackage = async () => {
    if (!form.unit || !form.courier) {
      showToast("請填寫房號與快遞公司", "error");
      return;
    }
    if (!form.trackingNo || !form.trackingNo.trim()) {
      showToast("請輸入包裹序號", "error");
      return;
    }
    const parsed = parseUnit(form.unit);
    if (!parsed) {
      showToast("房號格式錯誤，請使用「O號O樓」格式", "error");
      return;
    }
    // 檢查序號是否重複（待領取中）
    const trimmedNo = form.trackingNo.trim();
    const duplicate = packages.find(
      (p) => p.status === "pending" && p.trackingNo === trimmedNo
    );
    if (duplicate) {
      showToast(`序號 ${trimmedNo} 已存在於待領取的包裹`, "error");
      return;
    }
    const newPkg = {
      id: Date.now().toString(),
      ...form,
      trackingNo: trimmedNo,
      unit: parsed.formatted,
      status: "pending",
      arrivedAt: new Date().toISOString(),
      pickedAt: null,
    };
    const updated = [newPkg, ...packages];

    const notif = {
      id: Date.now().toString() + "_n",
      unit: parsed.formatted,
      residentName: form.residentName || "住戶",
      courier: form.courier,
      message: `📦 ${parsed.formatted} 您好，您有一件 ${form.courier} 包裹已送達管理室，請儘速領取。`,
      sentAt: new Date().toISOString(),
    };
    const updatedNotifs = [notif, ...notifications].slice(0, 50);

    await savePackage(newPkg);

    setForm({ unit: "", residentName: "", courier: "", trackingNo: "", note: "" });
    setShowAddModal(false);
    showToast(`已登記 ${parsed.formatted} 的包裹（序號 ${trimmedNo}）`);
  };

  const handlePickup = (pkg) => {
    setPickupModal(pkg);
    setPickupName("");
  };

  const handleConfirmPickup = async () => {
    if (!pickupModal) return;
    const name = pickupName.trim();
    if (!name) {
      showToast("請輸入領取人姓名", "error");
      return;
    }
const updatedPkg = {
      ...pickupModal,
      status: "picked",
      pickedAt: new Date().toISOString(),
      pickedBy: name,
    };
    await savePackage(updatedPkg);
    setPickupModal(null);
    setPickupName("");
    showToast(`已由 ${name} 領取`);
  };

  const handleCopyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("已複製訊息，可貼至 LINE 群組");
    } catch (e) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showToast("已複製訊息，可貼至 LINE 群組");
      } catch {
        showToast("複製失敗，請手動選取", "error");
      }
      document.body.removeChild(textarea);
    }
  };

  // 產生今日彙總訊息
  const generateTodaySummary = () => {
    const today = new Date().toDateString();
    const todayPackages = packages.filter(
      (p) => new Date(p.arrivedAt).toDateString() === today
    );
    if (todayPackages.length === 0) return null;

    // 統計各家快遞數量
    const courierCounts = {};
    todayPackages.forEach((p) => {
      courierCounts[p.courier] = (courierCounts[p.courier] || 0) + 1;
    });

    const dateStr = new Date().toLocaleDateString("zh-TW", {
      month: "numeric",
      day: "numeric",
    });

    const lines = [
      `📦 長風新城 ${dateStr} 包裹通知`,
      ``,
      `今日共 ${todayPackages.length} 件包裹送達：`,
      ...Object.entries(courierCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([courier, count]) => `・${courier} ${count} 件`),
      ``,
      `請住戶至系統查詢自己的包裹`,
      `https://changfeng-package.vercel.app/` ,// 確保有引號和逗號
      ``,
      `請住戶於AM08:00-PM08:00至警衛室領取包裹`
    ];
    return lines.join("\n");
  };

  const handleStartEdit = (pkg) => {
    setEditingPackage(pkg);
    setForm({
      unit: pkg.unit,
      residentName: pkg.residentName || "",
      courier: pkg.courier,
      trackingNo: pkg.trackingNo || "",
      note: pkg.note || "",
    });
    setShowAddModal(true);
  };

  const handleSaveEdit = async () => {
    if (!form.unit || !form.courier) {
      showToast("請填寫房號與快遞公司", "error");
      return;
    }
    if (!form.trackingNo || !form.trackingNo.trim()) {
      showToast("請輸入包裹序號", "error");
      return;
    }
    const parsed = parseUnit(form.unit);
    if (!parsed) {
      showToast("房號格式錯誤，請使用「O號O樓」格式", "error");
      return;
    }
    const trimmedNo = form.trackingNo.trim();
    // 檢查是否與其他包裹序號重複
    const duplicate = packages.find(
      (p) =>
        p.id !== editingPackage.id &&
        p.status === "pending" &&
        p.trackingNo === trimmedNo
    );
    if (duplicate) {
      showToast(`序號 ${trimmedNo} 已存在於待領取的包裹`, "error");
      return;
    }
    const updated = packages.map((p) =>
      p.id === editingPackage.id
        ? { ...p, ...form, trackingNo: trimmedNo, unit: parsed.formatted }
        : p
    );
await savePackage(updated.find((p) => p.id === editingPackage.id));
    setForm({ unit: "", residentName: "", courier: "", trackingNo: "", note: "" });
    setEditingPackage(null);
    setShowAddModal(false);
    showToast("已更新包裹資料");
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingPackage(null);
    setForm({ unit: "", residentName: "", courier: "", trackingNo: "", note: "" });
  };

  const handleResidentLogin = () => {
    const parsed = parseUnit(unitInput);
    if (!parsed) {
      showToast("房號格式錯誤，請使用「O號O樓」格式", "error");
      return;
    }
    setResidentUnit(parsed.formatted);
    localStorage.setItem("savedResidentUnit", parsed.formatted);
    setUnitInput("");
  };

  const handleResidentLogout = () => {
    setResidentUnit("");
    localStorage.removeItem("savedResidentUnit");
    setFilter("all");
    setSearchUnit("");
  };

  // 開啟留言視窗
  const handleOpenMessageModal = (pkg) => {
    setMessageModal({ packageId: pkg.id, unit: pkg.unit });
    setMessageInput(pkg.residentMessage || "");
  };

  // 儲存留言
  const handleSaveResidentMessage = async () => {
    if (!messageModal) return;
    const trimmed = messageInput.trim().slice(0, 200);
    if (!trimmed) {
      showToast("請輸入留言內容", "error");
      return;
    }
    const updated = packages.map((p) =>
      p.id === messageModal.packageId
        ? {
            ...p,
            residentMessage: trimmed,
            residentMessageAt: new Date().toISOString(),
          }
        : p
    );
  await savePackage(updated.find((p) => p.id === messageModal.packageId));
    setMessageModal(null);
    setMessageInput("");
    showToast("已留言給管理員");
  };

  // 住戶刪除自己的留言
  const handleDeleteOwnMessage = async () => {
    if (!messageModal) return;
    const updated = packages.map((p) =>
      p.id === messageModal.packageId
        ? { ...p, residentMessage: null, residentMessageAt: null }
        : p
    );
    await savePackage(updated.find((p) => p.id === messageModal.packageId));
    setMessageModal(null);
    setMessageInput("");
    showToast("已刪除留言");
  };

  // 管理員登入（社區共用密碼）
  const handleAdminLogin = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminLoggedIn(true);
      setAdminPasswordInput("");
      if (rememberAdmin) {
        const expires = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 天
        localStorage.setItem("adminLoginExpires", expires.toString());
      }
      showToast("管理員身份已驗證");
    } else {
      showToast("密碼錯誤", "error");
      setAdminPasswordInput("");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem("adminLoginExpires");
    setSearchUnit("");
    setFilter("all");
    showToast("已登出");
  };

  const handleViewChange = (v) => {
    setView(v);
    if (v === "resident") {
      setSearchUnit("");
      setFilter("all");
    } else {
      
    }
  };

  // 篩選邏輯：住戶端只看自己的房號；已領取超過 3 個月自動隱藏
  const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const isWithinRetention = (p) => {
    if (p.status !== "picked") return true; // 待領取的永遠保留
    if (!p.pickedAt) return true;
    return now - new Date(p.pickedAt).getTime() <= THREE_MONTHS_MS;
  };

  const visiblePackages = (view === "resident" && residentUnit
    ? packages.filter((p) => p.unit.toLowerCase() === residentUnit.toLowerCase())
    : packages
  ).filter(isWithinRetention);

  const filteredPackages = visiblePackages.filter((p) => {
    if (filter === "pending" && p.status !== "pending") return false;
    if (filter === "picked" && p.status !== "picked") return false;
    if (view === "admin" && searchUnit && !p.unit.toLowerCase().includes(searchUnit.toLowerCase())) return false;
    return true;
  });

  const statBase = visiblePackages;
  const pendingCount = statBase.filter((p) => p.status === "pending").length;
  const todayCount = statBase.filter((p) => {
    const today = new Date().toDateString();
    return new Date(p.arrivedAt).toDateString() === today;
  }).length;

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "剛剛";
    if (diffMin < 60) return `${diffMin} 分鐘前`;
    if (diffHr < 24) return `${diffHr} 小時前`;
    if (diffDay < 7) return `${diffDay} 天前`;
    return d.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
  };

  const formatFull = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 計算待領取已過的小時數
  const getHoursPending = (arrivedAt) => {
    if (!arrivedAt) return 0;
    return Math.floor((Date.now() - new Date(arrivedAt).getTime()) / 3600000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400">載入中⋯</div>
      </div>
    );
  }

  const showResidentLogin = view === "resident" && !residentUnit;
  const showAdminLogin = view === "admin" && !isAdminLoggedIn;

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Noto Serif TC', 'Songti TC', serif" }}>
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 flex items-center justify-center">
              <Home className="w-5 h-5 text-amber-50" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs tracking-[0.2em] text-stone-500 uppercase">community</div>
              <div className="text-lg font-medium text-stone-900 -mt-0.5">長風新城・包裹管理測試版</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-stone-100 p-1">
              <button
                onClick={() => handleViewChange("admin")}
                className={`px-4 py-1.5 text-sm transition ${
                  view === "admin" ? "bg-stone-900 text-amber-50" : "text-stone-600"
                }`}
              >
                管理員
              </button>
              <button
                onClick={() => handleViewChange("resident")}
                className={`px-4 py-1.5 text-sm transition ${
                  view === "resident" ? "bg-stone-900 text-amber-50" : "text-stone-600"
                }`}
              >
                住戶
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {showAdminLogin ? (
          /* === 管理員登入畫面 === */
          <div className="max-w-md mx-auto mt-8 sm:mt-16">
            <div className="text-center mb-8">
              <div className="inline-flex w-16 h-16 bg-amber-700 items-center justify-center mb-4">
                <KeyRound className="w-7 h-7 text-amber-50" strokeWidth={1.5} />
              </div>
              <div className="text-xs tracking-[0.3em] text-stone-500 uppercase mb-1">administrator</div>
              <h2 className="text-2xl font-medium text-stone-900">管理員登入</h2>
              <p className="text-sm text-stone-500 mt-2">請輸入管理員密碼</p>
            </div>

            <div className="bg-white border border-stone-200 p-6 sm:p-8">
              <label className="block text-xs tracking-wider text-stone-500 uppercase mb-2">
                密碼
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                autoFocus
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900 text-lg tracking-wider mb-3"
              />
              <label className="flex items-center gap-2 mb-4 text-sm text-stone-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberAdmin}
                  onChange={(e) => setRememberAdmin(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>記住我（3 天內免再次輸入）</span>
              </label>
              <button
                onClick={handleAdminLogin}
                className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-amber-50 transition"
              >
                登入
              </button>

              <div className="mt-6 pt-6 border-t border-stone-100 text-xs text-stone-400 leading-relaxed">
                <div className="flex gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>本社區共用密碼，請洽主委或管理室取得。請勿外洩給住戶。</span>
                </div>
              </div>
            </div>
          </div>
        ) : showResidentLogin ? (
          <div className="max-w-md mx-auto mt-8 sm:mt-16">
            <div className="text-center mb-8">
              <div className="inline-flex w-16 h-16 bg-stone-900 items-center justify-center mb-4">
                <KeyRound className="w-7 h-7 text-amber-50" strokeWidth={1.5} />
              </div>
              <div className="text-xs tracking-[0.3em] text-stone-500 uppercase mb-1">resident</div>
              <h2 className="text-2xl font-medium text-stone-900">輸入您的房號</h2>
              <p className="text-sm text-stone-500 mt-2">查看屬於您的包裹紀錄</p>
            </div>

            <div className="bg-white border border-stone-200 p-6 sm:p-8">
              <label className="block text-xs tracking-wider text-stone-500 uppercase mb-2">
                房號
              </label>
              <input
                type="text"
                placeholder="例：3號5樓"
                value={unitInput}
                onChange={(e) => setUnitInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResidentLogin()}
                autoFocus
                className={`w-full px-4 py-3 bg-stone-50 border outline-none text-stone-900 text-lg tracking-wider mb-2 ${
                  unitInput && !isValidUnit(unitInput)
                    ? "border-rose-400 focus:border-rose-500"
                    : "border-stone-200 focus:border-stone-900"
                }`}
              />
              <div className="text-xs text-stone-400 mb-4">
                格式：<span className="font-mono">O號O樓</span>（例：3號5樓、12號8樓）
              </div>
              <button
                onClick={handleResidentLogin}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-amber-50 transition"
              >
                查看我的包裹
              </button>

              <div className="mt-6 pt-6 border-t border-stone-100 text-xs text-stone-400 leading-relaxed">
                <div className="flex gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>系統會自動將全形數字轉為半形，房號會以統一格式儲存。</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {view === "admin" && isAdminLoggedIn && (
              <div className="mb-6 bg-amber-700 text-amber-50 px-4 sm:px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-4 h-4" strokeWidth={1.5} />
                  <div>
                    <div className="text-xs tracking-wider text-amber-200 uppercase">administrator</div>
                    <div className="text-sm">管理員模式</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowSummaryModal(true)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs transition flex items-center gap-1"
                  >
                    <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
                    今日彙總通知
                  </button>
                  <button
                    onClick={handleAdminLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-600 hover:bg-amber-800 text-xs transition"
                  >
                    <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                    登出
                  </button>
                </div>
              </div>
            )}

            {view === "resident" && residentUnit && (
              <div className="mb-6 bg-stone-900 text-amber-50 px-4 sm:px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" strokeWidth={1.5} />
                  <div>
                    <div className="text-xs tracking-wider text-stone-400 uppercase">currently viewing</div>
                    <div className="text-sm">{residentUnit} 的包裹</div>
                  </div>
                </div>
                <button
                  onClick={handleResidentLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-700 hover:bg-stone-800 text-xs transition"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  切換房號
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
              <div className="bg-white border border-stone-200 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-stone-500 text-xs tracking-wider uppercase mb-2">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                  今日到件
                </div>
                <div className="text-3xl sm:text-4xl font-light text-stone-900">{todayCount}</div>
              </div>
              <div className="bg-stone-900 text-amber-50 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-stone-400 text-xs tracking-wider uppercase mb-2">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  待領取
                </div>
                <div className="text-3xl sm:text-4xl font-light">{pendingCount}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              {view === "admin" && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="搜尋房號（例：3號5樓）"
                    value={searchUnit}
                    onChange={(e) => setSearchUnit(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 focus:border-stone-900 outline-none text-stone-900 text-sm"
                  />
                </div>
              )}

              <div className={`flex bg-white border border-stone-200 ${view === "resident" ? "flex-1" : ""}`}>
                {[
                  { k: "all", l: "全部" },
                  { k: "pending", l: "待領" },
                  { k: "picked", l: "已領" },
                ].map((f) => (
                  <button
                    key={f.k}
                    onClick={() => setFilter(f.k)}
                    className={`flex-1 sm:flex-none px-4 py-2.5 text-sm transition ${
                      filter === f.k ? "bg-stone-900 text-amber-50" : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {f.l}
                  </button>
                ))}
              </div>

              {view === "admin" && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-amber-50 text-sm transition"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  登記包裹
                </button>
              )}
            </div>

            <div className="bg-white border border-stone-200">
              {filteredPackages.length === 0 ? (
                <div className="py-20 text-center">
                  <Package className="w-12 h-12 mx-auto text-stone-300 mb-3" strokeWidth={1} />
                  <div className="text-stone-500 text-sm">
                    {view === "resident" && statBase.length === 0
                      ? `${residentUnit} 目前沒有包裹紀錄`
                      : statBase.length === 0
                      ? "尚未有包裹紀錄"
                      : "查無符合的紀錄"}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {filteredPackages.map((p) => (
                    <div key={p.id} className="p-4 sm:p-5 hover:bg-stone-50 transition group">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {p.status === "pending" ? (
                            <div className="w-10 h-10 bg-amber-50 border border-amber-200 flex items-center justify-center">
                              <Package className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                            <span className="text-lg font-medium text-stone-900 tracking-wide">{p.unit}</span>
                            {p.residentName && (
                              <span className="text-sm text-stone-500">{p.residentName}</span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 ${
                                p.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {p.status === "pending" ? "待領取" : "已領取"}
                            </span>
                            {p.status === "pending" && getHoursPending(p.arrivedAt) >= 24 && (
                              <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-800 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" strokeWidth={2} />
                                已到件 {Math.floor(getHoursPending(p.arrivedAt) / 24)} 天未領
                              </span>
                            )}
                            {p.status === "pending" && getHoursPending(p.arrivedAt) < 24 && getHoursPending(p.arrivedAt) >= 6 && (
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700">
                                已到件 {getHoursPending(p.arrivedAt)} 小時
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
                            <span className="flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" strokeWidth={1.5} />
                              {p.courier}
                            </span>
                            {p.trackingNo && (
                              <span className="flex items-center gap-1.5 font-mono text-xs">
                                <Hash className="w-3 h-3" strokeWidth={1.5} />
                                {p.trackingNo}
                              </span>
                            )}
                          </div>

                          {p.note && (
                            <div className="mt-2 text-sm text-stone-500 italic">"{p.note}"</div>
                          )}

                          {/* 住戶留言給管理員 */}
                          {p.residentMessage && (
                            <div className="mt-2 bg-blue-50 border-l-2 border-blue-400 px-3 py-2">
                              <div className="flex items-center gap-1.5 text-xs text-blue-700 mb-0.5">
                                <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
                                <span>住戶留言（{formatFull(p.residentMessageAt)}）</span>
                              </div>
                              <div className="text-sm text-blue-900">{p.residentMessage}</div>
                            </div>
                          )}

                          <div className="mt-2 text-xs text-stone-400 flex flex-wrap gap-x-3">
                            <span>到件：{formatFull(p.arrivedAt)}</span>
                            {p.pickedAt && (
                              <span>
                                · 領取：{formatFull(p.pickedAt)}
                                {p.pickedBy && ` · 領取人：${p.pickedBy}`}
                              </span>
                            )}
                          </div>

                          {/* 住戶端留言按鈕：放在資訊區下方，寬版大按鈕，避免被擠壓 */}
                          {p.status === "pending" && view === "resident" && (
                            <button
                              type="button"
                              onClick={() => handleOpenMessageModal(p)}
                              className="mt-3 w-full sm:w-auto px-4 py-2.5 border-2 border-blue-400 hover:bg-blue-50 active:bg-blue-100 text-blue-700 text-sm transition flex items-center justify-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                              {p.residentMessage ? "修改留言" : "留言給管理員"}
                            </button>
                          )}
                        </div>

                        <div className="flex-shrink-0 flex flex-col gap-2">
                          {p.status === "pending" && view === "admin" && (
                            <button
                              type="button"
                              onClick={() => handlePickup(p)}
                              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-50 text-xs whitespace-nowrap transition"
                            >
                              標記領取
                            </button>
                          )}
                          {view === "admin" && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className="px-3 py-1.5 border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs whitespace-nowrap transition"
                            >
                              修改
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 text-center text-xs text-stone-400 tracking-wider leading-relaxed">
              ※ 本系統資料儲存於本機，可於同一裝置持續查看<br />
              ※ 已領取的包裹紀錄保留 3 個月後自動隱藏
            </div>
          </>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-200">
              <div>
                <div className="text-xs tracking-[0.2em] text-stone-500 uppercase">
                  {editingPackage ? "edit entry" : "new entry"}
                </div>
                <div className="text-lg font-medium text-stone-900">
                  {editingPackage ? "修改包裹資料" : "登記新包裹"}
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-stone-100">
                <X className="w-4 h-4 text-stone-600" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs tracking-wider text-stone-500 uppercase mb-1.5">
                  房號 <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="號"
                    value={form.unitNum || ""}
                    onChange={(e) => {
                      const num = e.target.value;
                      const floor = form.unitFloor || "";
                      setForm({
                        ...form,
                        unitNum: num,
                        unit: num && floor ? `${num}號${floor}樓` : "",
                      });
                    }}
                    className="w-20 px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900 text-center"
                  />
                  <span className="text-stone-600">號</span>
                  <input
                    type="tel" 
                    inputMode="numeric"
                    placeholder="樓"
                    value={form.unitFloor || ""}
                    onChange={(e) => {
                      const floor = e.target.value;
                      const num = form.unitNum || "";
                      setForm({
                        ...form,
                        unitFloor: floor,
                        unit: num && floor ? `${num}號${floor}樓` : "",
                      });
                    }}
                    className="w-20 px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900 text-center"
                  />
                  <span className="text-stone-600">樓</span>
                  {form.unit && (
                    <span className="text-sm text-stone-500 ml-2">→ {form.unit}</span>
                  )}
                </div>
                <div className="mt-1.5 text-xs text-stone-400">
                  輸入數字即可，自動加上「號」「樓」
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-stone-500 uppercase mb-1.5">
                  住戶姓名
                </label>
                <input
                  type="text"
                  placeholder="例：王小姐"
                  value={form.residentName}
                  onChange={(e) => setForm({ ...form, residentName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider text-stone-500 uppercase mb-1.5">
                  快遞公司 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                  {["黑貓", "新竹物流", "momo", "蝦皮", "郵局", "其他"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, courier: c })}
                      className={`py-2 text-sm border transition ${
                        form.courier === c
                          ? "bg-stone-900 text-amber-50 border-stone-900"
                          : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="或直接輸入"
                  value={form.courier}
                  onChange={(e) => setForm({ ...form, courier: e.target.value })}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider text-stone-500 uppercase mb-1.5">
                  包裹序號 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="社區自編序號（例：001、A12）"
                  value={form.trackingNo}
                  onChange={(e) => setForm({ ...form, trackingNo: e.target.value })}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900 font-mono text-sm"
                />
                <div className="mt-1.5 text-xs text-stone-400">
                  此序號會貼在包裹上，方便領取時核對
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-stone-500 uppercase mb-1.5">
                  備註
                </label>
                <textarea
                  placeholder="例：易碎、冷藏品⋯"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900 text-sm resize-none"
                />
              </div>

              {!editingPackage && (
                <div className="bg-amber-50 border border-amber-200 p-3 flex gap-2 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>登記後將自動模擬發送通知至該住戶</span>
                </div>
              )}
              {editingPackage && (
                <div className="bg-stone-100 border border-stone-200 p-3 flex gap-2 text-xs text-stone-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>修改僅更新資料，不會重新發送通知</span>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-stone-200 flex gap-2">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm transition"
              >
                取消
              </button>
              <button
                onClick={editingPackage ? handleSaveEdit : handleAddPackage}
                className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-50 text-sm transition"
              >
                {editingPackage ? "儲存修改" : "登記並通知"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 領取確認 Modal */}
      {pickupModal && (
        <div
          className="fixed inset-0 bg-stone-900/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPickupModal(null);
              setPickupName("");
            }
          }}
        >
          <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-200">
              <div>
                <div className="text-xs tracking-[0.2em] text-stone-500 uppercase">pickup</div>
                <div className="text-lg font-medium text-stone-900">確認領取</div>
              </div>
              <button
                onClick={() => {
                  setPickupModal(null);
                  setPickupName("");
                }}
                className="p-2 hover:bg-stone-100"
              >
                <X className="w-4 h-4 text-stone-600" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 包裹資訊預覽 */}
              <div className="bg-stone-50 border border-stone-200 p-3 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-medium text-stone-900">{pickupModal.unit}</span>
                  {pickupModal.residentName && (
                    <span className="text-xs text-stone-500">登記姓名：{pickupModal.residentName}</span>
                  )}
                </div>
                <div className="text-xs text-stone-600 flex items-center gap-1.5">
                  <Truck className="w-3 h-3" strokeWidth={1.5} />
                  {pickupModal.courier}
                  {pickupModal.trackingNo && (
                    <span className="font-mono ml-2">#{pickupModal.trackingNo}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-stone-500 uppercase mb-1.5">
                  領取人姓名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="請輸入實際領取人的姓名"
                  value={pickupName}
                  onChange={(e) => setPickupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmPickup()}
                  autoFocus
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900"
                />
                <div className="mt-1.5 text-xs text-stone-400">
                  若非住戶本人，請寫代領者姓名（如：林媽媽、王先生太太）
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 flex gap-2 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>領取人姓名會永久記錄，若日後有領錯爭議可作為佐證</span>
              </div>
            </div>

            <div className="p-5 border-t border-stone-200 flex gap-2">
              <button
                onClick={() => {
                  setPickupModal(null);
                  setPickupName("");
                }}
                className="flex-1 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm transition"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPickup}
                className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-50 text-sm transition"
              >
                確認領取
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 今日彙總通知 Modal */}
      {showSummaryModal && (() => {
        const summary = generateTodaySummary();
        return (
          <div
            className="fixed inset-0 bg-stone-900/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSummaryModal(false);
            }}
          >
            <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-stone-200">
                <div>
                  <div className="text-xs tracking-[0.2em] text-stone-500 uppercase">daily summary</div>
                  <div className="text-lg font-medium text-stone-900">今日彙總通知</div>
                </div>
                <button onClick={() => setShowSummaryModal(false)} className="p-2 hover:bg-stone-100">
                  <X className="w-4 h-4 text-stone-600" strokeWidth={1.5} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {summary ? (
                  <>
                    <div className="bg-emerald-50 border border-emerald-200 p-3 flex gap-2 text-xs text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>此訊息不含房號、姓名等個資，可安全發到 LINE 群組</span>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 p-4">
                      <div className="text-xs tracking-wider text-stone-500 uppercase mb-2">訊息預覽</div>
                      <div className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                        {summary}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyMessage(summary)}
                      className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-amber-50 transition flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                      複製訊息
                    </button>

                    <div className="text-xs text-stone-400 leading-relaxed text-center">
                      複製後請至 LINE 群組長按貼上
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-stone-300 mb-3" strokeWidth={1} />
                    <div className="text-stone-500 text-sm">今日尚無包裹紀錄</div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-stone-200">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="w-full py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm transition"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 住戶留言給管理員 Modal */}
      {messageModal && (
        <div
          className="fixed inset-0 bg-stone-900/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMessageModal(null);
              setMessageInput("");
            }
          }}
        >
          <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-200">
              <div>
                <div className="text-xs tracking-[0.2em] text-stone-500 uppercase">message admin</div>
                <div className="text-lg font-medium text-stone-900">留言給管理員</div>
                <div className="text-xs text-stone-500 mt-0.5">關於 {messageModal.unit} 的這件包裹</div>
              </div>
              <button
                onClick={() => {
                  setMessageModal(null);
                  setMessageInput("");
                }}
                className="p-2 hover:bg-stone-100"
              >
                <X className="w-4 h-4 text-stone-600" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs tracking-wider text-stone-500 uppercase mb-1.5">
                  留言內容
                </label>
                <textarea
                  placeholder="例：我出國至 6/20，請代為保管；或：明天下午才能取件，謝謝。"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value.slice(0, 200))}
                  rows={4}
                  autoFocus
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 outline-none text-stone-900 text-sm resize-none"
                />
                <div className="mt-1 text-xs text-stone-400 text-right">
                  {messageInput.length} / 200
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 flex gap-2 text-xs text-blue-900">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>留言會顯示在這件包裹的資料上，管理員看到後會處理</span>
              </div>
            </div>

            <div className="p-5 border-t border-stone-200 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMessageModal(null);
                    setMessageInput("");
                  }}
                  className="flex-1 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveResidentMessage}
                  className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm transition"
                >
                  送出留言
                </button>
              </div>
              {/* 已有留言時顯示刪除選項 */}
              {packages.find((p) => p.id === messageModal.packageId)?.residentMessage && (
                <button
                  onClick={handleDeleteOwnMessage}
                  className="w-full py-2 text-xs text-rose-600 hover:bg-rose-50 transition"
                >
                  刪除這則留言
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div
            className={`px-5 py-3 shadow-lg flex items-center gap-2 ${
              toast.type === "error" ? "bg-rose-600 text-white" : "bg-stone-900 text-amber-50"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
            )}
            <span className="text-sm">{toast.msg}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
