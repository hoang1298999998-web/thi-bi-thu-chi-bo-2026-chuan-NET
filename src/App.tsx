import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  BookOpen,
  HelpCircle,
  FileText,
  Mail,
  ShieldCheck,
  Award,
  ChevronRight,
  Send,
  Flag,
  Lock,
  Phone,
  LockKeyhole,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Component imports
import cpvEmblem from "./assets/images/cpv_emblem_1783090328419.jpg";
import { logoBase64 } from "./assets/logoBase64";
import ThemeToggle from "./components/ThemeToggle";
import ChatAI from "./components/ChatAI";
import Hero from "./components/Hero";
import Stats from "./components/Stats";
import NewsSection from "./components/NewsSection";
import DocumentsSection from "./components/DocumentsSection";
import Leaderboard from "./components/Leaderboard";
import ProfileSection from "./components/ProfileSection";
import AdminPanel from "./components/AdminPanel";
import ExamEngine from "./components/ExamEngine";
import { FullDB, User as UserType } from "./types";

export default function App() {
  const [db, setDb] = useState<FullDB | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem("contest_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [currentTab, setCurrentTab] = useState<string>("Hội thi");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExamActive, setIsExamActive] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const changeTab = (tab: string) => {
    if (isExamActive) {
      setPendingTab(tab);
      return;
    }
    setCurrentTab(tab);
  };

  useEffect(() => {
    const handleExamStart = () => setIsExamActive(true);
    const handleExamEnd = () => setIsExamActive(false);

    window.addEventListener("exam_started", handleExamStart);
    window.addEventListener("exam_ended", handleExamEnd);

    return () => {
      window.removeEventListener("exam_started", handleExamStart);
      window.removeEventListener("exam_ended", handleExamEnd);
    };
  }, []);

  // Idle inactivity automatic logout
  useEffect(() => {
    if (!currentUser) return;

    let idleTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        handleLogout();
        alert("Hệ thống đã tự động đăng xuất do đồng chí không hoạt động quá 15 phút nhằm mục đích bảo mật tài khoản!");
      }, INACTIVITY_LIMIT);
    };

    // Events to monitor activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(name => window.addEventListener(name, resetTimer));

    resetTimer(); // Initialize timer

    return () => {
      clearTimeout(idleTimer);
      events.forEach(name => window.removeEventListener(name, resetTimer));
    };
  }, [currentUser]);

  // Authentication panels states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginId, setLoginId] = useState(""); // Email or Phone
  const [loginPassword, setLoginPassword] = useState("");
  const [regForm, setRegForm] = useState({ fullName: "", email: "", phone: "", password: "", department: "", title: "Bí thư Chi bộ" });
  const [authError, setAuthError] = useState("");
  const [forgotFeedback, setForgotFeedback] = useState("");

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", unit: "", content: "" });
  const [contactSuccess, setContactSuccess] = useState(false);

  // Fetch full database state
  const loadDatabase = async () => {
    try {
      const res = await fetch("/api/db?t=" + Date.now());
      const data = await res.json();
      setDb(data);
    } catch (err) {
      console.error("Failed to load db state:", err);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Sync currentUser with db data when database updates (useful for admin edits or db file updates)
  useEffect(() => {
    if (db && currentUser) {
      const freshUser = db.users.find(u => u.email === currentUser.email || u.id === currentUser.id);
      if (freshUser && (
        freshUser.fullName !== currentUser.fullName || 
        freshUser.role !== currentUser.role || 
        freshUser.title !== currentUser.title || 
        freshUser.department !== currentUser.department
      )) {
        setCurrentUser(freshUser);
        localStorage.setItem("contest_user", JSON.stringify(freshUser));
      }
    }
  }, [db, currentUser]);

  // Automatic localStorage backup of important database elements to protect against Vercel stateless container resets
  useEffect(() => {
    if (db) {
      if (db.questions && db.questions.length > 0) {
        localStorage.setItem("backup_contest_questions", JSON.stringify(db.questions));
      }
      if (db.users && db.users.length > 0) {
        localStorage.setItem("backup_contest_users", JSON.stringify(db.users));
      }
      if (db.departments && db.departments.length > 0) {
        localStorage.setItem("backup_contest_departments", JSON.stringify(db.departments));
      }
      if (db.examsList && db.examsList.length > 0) {
        localStorage.setItem("backup_contest_examsList", JSON.stringify(db.examsList));
      }
      if (db.documents && db.documents.length > 0) {
        localStorage.setItem("backup_contest_documents", JSON.stringify(db.documents));
      }
    }
  }, [db]);

  // Handle restoring database from local browser backup
  const handleRestoreFromLocalBackup = async () => {
    try {
      const savedQuestions = localStorage.getItem("backup_contest_questions");
      const savedUsers = localStorage.getItem("backup_contest_users");
      const savedDepts = localStorage.getItem("backup_contest_departments");
      const savedExamsList = localStorage.getItem("backup_contest_examsList");
      const savedDocs = localStorage.getItem("backup_contest_documents");

      const updates: any = {};
      if (savedQuestions) updates.questions = JSON.parse(savedQuestions);
      if (savedUsers) updates.users = JSON.parse(savedUsers);
      if (savedDepts) updates.departments = JSON.parse(savedDepts);
      if (savedExamsList) updates.examsList = JSON.parse(savedExamsList);
      if (savedDocs) updates.documents = JSON.parse(savedDocs);

      if (Object.keys(updates).length === 0) {
        alert("Không tìm thấy dữ liệu sao lưu nào trong trình duyệt này!");
        return;
      }

      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        alert("Khôi phục toàn bộ dữ liệu ngân hàng đề và thông tin cấu hình từ trình duyệt thành công!");
        loadDatabase();
      } else {
        alert("Khôi phục thất bại: " + (data.message || "Lỗi không xác định"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi kết nối máy chủ khi khôi phục: " + err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem("contest_user", JSON.stringify(data.user));
        setShowAuthModal(false);
        setLoginId("");
        setLoginPassword("");
        loadDatabase();
      } else {
        setAuthError(data.message || "Tên tài khoản hoặc mật khẩu không chính xác!");
      }
    } catch (err) {
      setAuthError("Lỗi kết nối máy chủ!");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm)
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem("contest_user", JSON.stringify(data.user));
        setShowAuthModal(false);
        setRegForm({ fullName: "", email: "", phone: "", password: "", department: "", title: "Bí thư Chi bộ" });
        loadDatabase();
      } else {
        setAuthError(data.message || "Đăng ký không thành công!");
      }
    } catch (err) {
      setAuthError("Lỗi kết nối máy chủ!");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setForgotFeedback("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId })
      });
      const data = await res.json();
      if (data.success) {
        setForgotFeedback(data.message);
      } else {
        setAuthError(data.message);
      }
    } catch (err) {
      setAuthError("Lỗi kết nối hệ thống!");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("contest_user");
    setCurrentTab("Hội thi");
    loadDatabase();
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess(true);
    setContactForm({ name: "", email: "", phone: "", unit: "", content: "" });
    setTimeout(() => setContactSuccess(false), 5000);
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400">
        <div className="w-12 h-12 border-4 border-red-600 border-t-yellow-400 rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-sm tracking-widest uppercase">Đang tải dữ liệu hội thi...</p>
      </div>
    );
  }

  // Calculate real-time stats
  const candidatesCount = db.users.filter(u => u.role === "candidate").length;
  const questionsCount = db.questions.length;
  const attemptsCount = db.examResults.length;
  const unitsCount = db.departments.length;

  const hasTakenOfficial = currentUser
    ? db.examResults.some(r => r.userEmail === currentUser.email && r.type === "official")
    : false;

  return (
    <div className="min-h-screen sophisticated-light-bg dark:sophisticated-dark-bg text-stone-800 dark:text-yellow-50/90 flex flex-col font-sans transition-all duration-500">
      
      {/* 1. PROFESSIONAL PATRIOTIC NAVIGATION HEADER */}
      <header className="bg-red-950/95 dark:bg-black/40 border-b border-yellow-500/30 dark:border-yellow-500/15 backdrop-blur-md sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-28">
            
            {/* Logo Unit */}
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 select-none"
              onClick={() => changeTab("Hội thi")}
            >
              <div className="h-20 sm:h-24 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoBase64} alt="Logo Trung Đoàn 1" className="h-full w-auto object-contain" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h2 className="text-[14px] font-black tracking-widest text-yellow-500 dark:text-yellow-400 uppercase leading-none pl-0 ml-0 mt-[8px] pr-0 border-none">TRUNG ĐOÀN 1</h2>
                <h1 className="text-[13px] font-bold text-stone-200 uppercase tracking-wider leading-[15.75px] ml-[-14px] pl-0 pr-0 pt-[6px] border-none mt-0.5">Ban Tổ chức Hội thi</h1>
              </div>
            </div>

            {/* Desktop Navbar Menu */}
            <nav className="hidden xl:flex space-x-1.5">
              {["Hội thi", "Tài liệu", "Thi thử", "Thi chính thức", "Bảng xếp hạng", "Liên hệ"].map((tab) => {
                const isActive = currentTab === tab;
                const isExamTab = tab === "Thi chính thức";
                return (
                  <button
                    key={tab}
                    onClick={() => changeTab(tab)}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full focus:outline-none transition-all duration-300 ${
                      isActive
                        ? "bg-yellow-500 text-red-950 font-black shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                        : isExamTab
                        ? "text-yellow-400 hover:text-yellow-200 hover:bg-yellow-500/10"
                        : "text-yellow-100/80 hover:text-yellow-400 hover:bg-white/5"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>

            {/* Action controls (Dark Mode, Auth, Profile) */}
            <div className="flex items-center gap-2">
              <ThemeToggle />

              {/* User profile action */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeTab("Cá nhân")}
                    className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-500/30 hover:border-yellow-500/60 bg-yellow-500/10 text-yellow-100 hover:text-yellow-400 text-xs font-semibold focus:outline-none transition-all duration-300 ${
                      currentTab === "Cá nhân" ? "bg-yellow-500/20 border-yellow-500" : ""
                    }`}
                  >
                    <img src={currentUser.avatar} alt="" className="w-5 h-5 rounded-full object-cover border border-yellow-500/50" />
                    <span>{currentUser.fullName}</span>
                  </button>

                  {(currentUser.role === "admin" || currentUser.role === "organizer" || currentUser.role === "judge") && (
                    <button
                      onClick={() => changeTab("Khu vực Admin")}
                      className={`p-2 bg-yellow-600/15 border border-yellow-600/40 hover:bg-yellow-600/35 text-yellow-400 text-xs font-black rounded-full uppercase tracking-wider focus:outline-none transition-all duration-300 ${
                        currentTab === "Khu vực Admin" ? "ring-1 ring-yellow-500 bg-yellow-600/40" : ""
                      }`}
                      title="Khu vực quản trị Ban Tổ chức"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="p-2 text-yellow-100/70 hover:text-yellow-400 rounded-full hover:bg-white/5 transition-all focus:outline-none border border-transparent hover:border-yellow-500/10"
                    title="Đăng xuất tài khoản"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError("");
                    setShowAuthModal(true);
                  }}
                  className="px-5 py-1.5 bg-yellow-600/20 border border-yellow-600/50 rounded-full hover:bg-yellow-600/40 text-yellow-400 text-xs font-semibold uppercase tracking-wider focus:outline-none transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                >
                  Đăng nhập
                </button>
              )}

              {/* Mobile Menu button Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="xl:hidden p-2 text-yellow-100 hover:text-yellow-400 rounded-full hover:bg-white/5 border border-transparent hover:border-yellow-500/10 focus:outline-none transition-all"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden bg-red-950/95 dark:bg-black/90 border-t border-yellow-500/20 backdrop-blur-md"
            >
              <div className="px-3 pt-2 pb-4 space-y-1">
                {["Hội thi", "Tài liệu", "Thi thử", "Thi chính thức", "Bảng xếp hạng", "Liên hệ"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      changeTab(tab);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl text-yellow-100/90 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all duration-300 ${
                      currentTab === tab ? "bg-yellow-500 text-red-950 font-black shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:text-red-950 hover:bg-yellow-500" : ""
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                {currentUser && (
                  <button
                    onClick={() => {
                      changeTab("Cá nhân");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl text-yellow-100/90 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all duration-300"
                  >
                    Hồ sơ Cá nhân ({currentUser.fullName})
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. RECOVERY BACKUP BANNER FOR STATELESS SERVERLESS RESETS */}
      {db && db.questions && db.questions.length === 0 && localStorage.getItem("backup_contest_questions") && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 py-3.5 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-yellow-100/90 text-xs sm:text-sm shadow-inner">
          <div className="flex items-center gap-2.5">
            <span className="text-base">💡</span>
            <div>
              <p className="font-bold text-yellow-500 dark:text-yellow-400">Ngân hàng câu hỏi trống (Do máy chủ không lưu trạng thái trên Vercel tự động reset)</p>
              <p className="text-stone-600 dark:text-stone-300 text-[11px] mt-0.5">Trình duyệt của đồng chí đang lưu trữ bản sao lưu gồm <strong>{JSON.parse(localStorage.getItem("backup_contest_questions") || "[]").length} câu hỏi</strong> và cấu hình trước đó.</p>
            </div>
          </div>
          <button
            onClick={handleRestoreFromLocalBackup}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-red-950 font-extrabold rounded-lg text-xs tracking-wider uppercase shadow-md transition-all shrink-0 cursor-pointer"
          >
            Khôi phục Ngân hàng đề ngay
          </button>
        </div>
      )}

      {/* 2. MAIN APPLICATION CONTENT VIEW */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            
            {/* VIEW 1: HỘI THI */}
            {currentTab === "Hội thi" && (
              <div className="space-y-8">
                <Hero settings={db.settings} />
                <Stats stats={{ candidatesCount, questionsCount, attemptsCount, unitsCount }} />

                {/* Featured documents display as full width since news sections are removed */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <BookOpen className="w-5 h-5" /> Tài liệu trọng tâm
                  </h3>
                  <DocumentsSection documents={db.documents.slice(0, 4)} />
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={() => setCurrentTab("Tài liệu")}
                      className="px-8 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-200/50 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 focus:outline-none transition-all shadow-sm"
                    >
                      Xem tất cả tài liệu ôn thi <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: TÀI LIỆU */}
            {currentTab === "Tài liệu" && (
              <div className="space-y-6">
                <h2 className="text-lg sm:text-xl font-serif font-black text-red-700 dark:text-red-400 uppercase tracking-tight border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                  Văn kiện, Nghiệp vụ & Tài liệu Ôn tập
                </h2>
                <DocumentsSection documents={db.documents} />
              </div>
            )}

            {/* VIEW 5: THI THỬ */}
            {currentTab === "Thi thử" && (
              <div className="space-y-6">
                {currentUser ? (
                  <ExamEngine
                    questions={db.questions}
                    examType="practice"
                    currentUser={currentUser}
                    onRefreshDB={loadDatabase}
                    isOfficialActive={db.exams.isOfficialActive}
                    hasTakenOfficial={hasTakenOfficial}
                  />
                ) : (
                  <div className="max-w-md mx-auto text-center py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-2xl shadow-sm">
                    <Lock className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h3 className="font-bold text-base mb-2">Đồng chí chưa đăng nhập!</h3>
                    <p className="text-xs text-slate-400 mb-6">Vui lòng đăng nhập tài khoản thí sinh để tham gia chương trình ôn luyện trắc nghiệm.</p>
                    <button
                      onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                    >
                      Đăng nhập ngay
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 6: THI CHÍNH THỨC */}
            {currentTab === "Thi chính thức" && (
              <div className="space-y-6">
                {currentUser ? (
                  <ExamEngine
                    questions={db.questions}
                    examType="official"
                    currentUser={currentUser}
                    onRefreshDB={loadDatabase}
                    isOfficialActive={db.exams.isOfficialActive}
                    hasTakenOfficial={hasTakenOfficial}
                  />
                ) : (
                  <div className="max-w-md mx-auto text-center py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-2xl shadow-sm">
                    <Lock className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h3 className="font-bold text-base mb-2">Đồng chí chưa đăng nhập!</h3>
                    <p className="text-xs text-slate-400 mb-6">Vui lòng đăng nhập để bước vào kỳ thi chính thức của hội thi Bí thư Chi bộ giỏi 2026.</p>
                    <button
                      onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                    >
                      Đăng nhập ngay
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 7: BẢNG XẾP HẠNG */}
            {currentTab === "Bảng xếp hạng" && (
              <div className="space-y-6">
                <Leaderboard results={db.examResults} departments={db.departments} />
              </div>
            )}

            {/* VIEW 9: LIÊN HỆ */}
            {currentTab === "Liên hệ" && (
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm space-y-6">
                <h2 className="text-xl sm:text-2xl font-serif font-black text-red-700 dark:text-red-500 uppercase tracking-tight border-b-2 border-slate-100 pb-3">
                  Liên hệ Ban Tổ chức Hội thi
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Mọi thắc mắc kỹ thuật về tài khoản làm bài, đóng góp ngân hàng câu hỏi ôn tập xin gửi về Ban Tổ chức theo biểu mẫu dưới đây:
                </p>

                {/* Official Contact Card */}
                <div className="bg-yellow-500/10 border border-yellow-500/25 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center shadow-inner">
                  <div className="space-y-1.5 text-center sm:text-left w-full">
                    <h4 className="font-serif font-black text-sm uppercase text-red-700 dark:text-yellow-500 tracking-wider">BAN KỸ THUẬT & HẬU CẦN HỘI THI</h4>
                    <p className="text-xs text-stone-600 dark:text-yellow-100/70">
                      Đơn vị chủ trì: <span className="font-black">Trung đoàn 1 (Đoàn Bình Long)</span>
                    </p>
                    <p className="text-xs text-stone-600 dark:text-yellow-100/70">
                      Tác giả: <span className="font-bold text-red-600 dark:text-yellow-400">Trịnh Xuân Hoàng - CTV/c18e1</span>
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-yellow-100/50 mt-1">
                      <span className="flex items-center gap-1 font-mono"><Phone className="w-3.5 h-3.5 text-yellow-500" /> 0368843319</span>
                      <span className="flex items-center gap-1 font-mono"><Mail className="w-3.5 h-3.5 text-yellow-500" /> hoang1298999998@gmail.com</span>
                    </div>
                  </div>
                </div>

                {contactSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 rounded-2xl border border-emerald-100 font-bold text-xs sm:text-sm">
                    Gửi phản hồi thành công! Ban Tổ chức sẽ phản hồi thông qua email/SĐT đăng ký của đồng chí.
                  </div>
                )}

                <form onSubmit={handleContactSubmit} className="space-y-4 text-xs sm:text-sm font-semibold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Họ tên đồng chí</label>
                      <input
                        type="text"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đơn vị / Chi bộ</label>
                      <input
                        type="text"
                        value={contactForm.unit}
                        onChange={(e) => setContactForm({ ...contactForm, unit: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Địa chỉ Email</label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
                      <input
                        type="text"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nội dung phản hồi</label>
                    <textarea
                      value={contactForm.content}
                      onChange={(e) => setContactForm({ ...contactForm, content: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      rows={4}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase rounded-xl tracking-wider shadow flex items-center justify-center gap-1.5 focus:outline-none transition-colors"
                  >
                    Gửi phản hồi cho BTC <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 10: CÁ NHÂN */}
            {currentTab === "Cá nhân" && currentUser && (
              <div className="space-y-6">
                <h2 className="text-lg sm:text-xl font-serif font-black text-red-700 dark:text-red-400 uppercase tracking-tight border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                  Hồ sơ Đảng viên & Lịch sử kỳ thi
                </h2>
                <ProfileSection currentUser={currentUser} results={db.examResults} onRefreshDB={loadDatabase} />
              </div>
            )}

            {/* VIEW 11: KHU VỰC ADMIN (RESTRICTED ROLE ONLY) */}
            {currentTab === "Khu vực Admin" && currentUser && (currentUser.role === "admin" || currentUser.role === "organizer" || currentUser.role === "judge") && (
              <div className="space-y-6">
                <h2 className="text-lg sm:text-xl font-serif font-black text-red-700 dark:text-red-400 uppercase tracking-tight border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                  Khu vực Quản Trị & Ban Chỉ Đạo Hội Thi
                </h2>
                <AdminPanel db={db} onRefreshDB={loadDatabase} currentUser={currentUser} />
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating AI chat icon */}
      <ChatAI />

      {/* Footer block */}
      <footer className="bg-stone-950 border-t border-yellow-500/20 text-stone-400 py-6 text-center text-xs font-semibold leading-relaxed shrink-0">
        <p className="text-yellow-500 font-serif tracking-widest font-black uppercase text-[12px] mb-1">Hội đồng thi trực tuyến 2026</p>
        <p className="text-stone-300 font-serif">Phần mềm Quản lý thi và Học tập cho cán bộ chính trị</p>
        <p className="text-stone-400 mt-2 text-[11px]">
          Tác giả: <span className="text-yellow-500 font-bold">Trịnh Xuân Hoàng - CTV/c18e1</span>
        </p>
        <p className="text-stone-400 text-[11px] mt-0.5">
          SĐT liên hệ: <span className="text-yellow-500 font-bold font-mono">0368843319</span> | Email: <span className="text-yellow-500 font-bold font-mono">hoang1298999998@gmail.com</span>
        </p>
      </footer>

      {/* AUTHENTICATION MODAL OVERLAY */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative text-xs sm:text-sm font-semibold"
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 w-9 h-9 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center focus:outline-none transition-colors"
              >
                ✕
              </button>

              {/* Title icons banner */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-full mb-3">
                  <LockKeyhole className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                  {authMode === 'login' ? "Đăng nhập hệ thống" : authMode === 'register' ? "Đăng ký thí sinh mới" : "Khôi phục mật khẩu"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 uppercase font-black">Hội thi Bí thư Chi bộ 2026</p>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl text-xs font-bold mb-4">
                  {authError}
                </div>
              )}

              {forgotFeedback && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-xs font-bold mb-4">
                  {forgotFeedback}
                </div>
              )}

              {/* 1. LOGIN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email hoặc Số điện thoại</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="thisinh@bithu2026.vn hoặc 0933..."
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Mật khẩu bảo mật</label>
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setAuthError(""); setForgotFeedback(""); }}
                        className="text-[10px] text-red-600 font-bold hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="Mật khẩu của bạn"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs rounded-xl shadow tracking-wider transition-colors"
                  >
                    Đăng nhập cổng thi
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-slate-400 text-xs">Chưa có tài khoản thí sinh? </span>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setAuthError(""); }}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Đăng ký ngay
                    </button>
                  </div>
                </form>
              )}

              {/* 2. REGISTER FORM */}
              {authMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Họ tên đồng chí</label>
                    <input
                      type="text"
                      placeholder="ví dụ: Phạm Minh Đức"
                      value={regForm.fullName}
                      onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Địa chỉ Email</label>
                    <input
                      type="email"
                      placeholder="thisinh@bithu2026.vn"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      placeholder="0933333333"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Thiết lập mật khẩu</label>
                    <input
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đơn vị / Chi bộ sinh hoạt</label>
                    <input
                      type="text"
                      placeholder="ví dụ: Đại đội 1, Tiểu đoàn 4"
                      value={regForm.department}
                      onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chức vụ Đảng viên</label>
                    <input
                      type="text"
                      placeholder="Bí thư Chi bộ, Phó Bí thư..."
                      value={regForm.title}
                      onChange={(e) => setRegForm({ ...regForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs rounded-xl tracking-wider transition-colors shadow"
                  >
                    Đăng ký tài khoản mới
                  </button>

                  <div className="text-center pt-1">
                    <span className="text-slate-400 text-xs">Đã có tài khoản? </span>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError(""); }}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Đăng nhập
                    </button>
                  </div>
                </form>
              )}

              {/* 3. FORGOT PASSWORD FORM */}
              {authMode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Nhập địa chỉ Email hoặc Số điện thoại đăng ký. Hệ thống sẽ cấp lại mật khẩu mặc định ngay lập tức.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email / Số điện thoại đăng ký</label>
                    <input
                      type="text"
                      placeholder="thisinh@bithu2026.vn hoặc SĐT"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs rounded-xl tracking-wider transition-colors shadow"
                  >
                    Gửi yêu cầu khôi phục
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError(""); setForgotFeedback(""); }}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Quay lại Đăng nhập
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEAVE EXAM WARNING MODAL */}
      {pendingTab && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-white">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
              <h3 className="text-base font-black uppercase text-red-500">Cảnh báo rời phòng thi</h3>
            </div>
            
            <p className="text-sm text-stone-300 leading-relaxed">
              CẢNH BÁO: Bài thi chính thức đang diễn ra! Rời khỏi trang lúc này có thể hủy hoặc nộp dở bài thi của đồng chí. Đồng chí vẫn muốn tiếp tục rời đi?
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setPendingTab(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-stone-300 hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
              >
                Tiếp tục thi
              </button>
              <button
                onClick={() => {
                  const tab = pendingTab;
                  setPendingTab(null);
                  setIsExamActive(false);
                  setCurrentTab(tab);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md"
              >
                Xác nhận rời đi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
