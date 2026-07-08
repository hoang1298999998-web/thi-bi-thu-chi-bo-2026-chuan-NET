import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  FileQuestion,
  Calendar,
  Settings,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Play,
  FileText,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Award,
  BookOpen,
  MapPin,
  ClipboardList,
  Activity,
  Search,
  Filter,
  Eye,
  EyeOff,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  Copy,
  RotateCcw
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";
import * as xlsx from "xlsx";
import { FullDB, User, Question, StudyDocument, NewsArticle } from "../types";

interface AdminPanelProps {
  db: FullDB;
  onRefreshDB: () => void;
  currentUser?: User;
}

export default function AdminPanel({ db, onRefreshDB, currentUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'departments' | 'exams' | 'questions' | 'docs' | 'results' | 'reports' | 'logs' | 'settings'>('dashboard');
  
  // States for dynamic edits
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingDoc, setEditingDoc] = useState<StudyDocument | null>(null);
  const [editingDept, setEditingDept] = useState<any | null>(null);

  // Quick form state holders
  const [userForm, setUserForm] = useState({ fullName: "", username: "", email: "", phone: "", role: "candidate" as any, title: "Bí thư Chi bộ", department: "", chiBo: "", password: "" });
  const [questionForm, setQuestionForm] = useState({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: 0, explanation: "", type: "text", attachmentUrl: "", category: "Văn kiện Đảng", topic: "Công tác Đảng", difficulty: "Dễ" });
  const [docForm, setDocForm] = useState({ title: "", description: "", format: "pdf" as any, category: "Tài liệu ôn thi", url: "#", publisher: "Ban Tổ chức", issueDate: new Date().toISOString().split("T")[0], author: "Ban Tổ chức", coverImage: "", isHidden: false });
  const [deptForm, setDeptForm] = useState({ name: "", battalion: "Tiểu đoàn 1", company: "" });
  const [settingsForm, setSettingsForm] = useState({ contestName: db.settings?.contestName || "Hội thi Bí thư Chi bộ Giỏi", countdownDate: db.settings?.countdownDate || "2026-12-31", theme: db.settings?.theme || "patriotic", unitLogo: db.settings?.unitLogo || "" });

  // User list search/filter/pagination states
  const [userSearch, setUserSearch] = useState("");
  const [userDeptFilter, setUserDeptFilter] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userImportReport, setUserImportReport] = useState<{ total: number; success: number; errors: any[] } | null>(null);
  const [userImportProgress, setUserImportProgress] = useState<number | null>(null);

  // Question Import states
  const [questionImportReport, setQuestionImportReport] = useState<{ total: number; success: number; errors: any[] } | null>(null);
  const [questionImportProgress, setQuestionImportProgress] = useState<number | null>(null);

  // Document Excel Import validation states
  const [docImportReport, setDocImportReport] = useState<{ total: number; success: number; errors: any[] } | null>(null);

  // Candidate Results search/filter/sort states
  const [resultSearch, setResultSearch] = useState("");
  const [resultDeptFilter, setResultDeptFilter] = useState("");
  const [resultChiBoFilter, setResultChiBoFilter] = useState("");
  const [resultTypeFilter, setResultTypeFilter] = useState("all");
  const [resultScoreFilter, setResultScoreFilter] = useState("all");
  const [resultSort, setResultSort] = useState("score_desc");
  const [resultPage, setResultPage] = useState(1);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  // Excel paste/file upload status
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Exam Management States
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [examForm, setExamForm] = useState({
    title: "",
    durationMinutes: 40,
    easyCount: 20,
    mediumCount: 20,
    hardCount: 10,
    isActive: false,
    allowedAttempts: 1,
    shuffleQuestions: true,
    shuffleOptions: true
  });
  const [activeTakers, setActiveTakers] = useState<any[]>([]);

  // Audit Logs (synchronized from backend database)
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  // Send system logs to backend persistently
  const addLog = async (user: string, action: string) => {
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, action })
      });
      const data = await res.json();
      if (data.success) {
        setSystemLogs(prev => [data.log, ...prev]);
      }
    } catch (err) {
      console.error("Failed to send log:", err);
      const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      setSystemLogs(prev => [{ id: `log_${Date.now()}`, time, user, action, ip: "127.0.0.1" }, ...prev]);
    }
  };

  // Synchronize system logs on load
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/logs");
        const data = await res.json();
        if (data.success && data.logs) {
          setSystemLogs(data.logs);
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    };
    fetchLogs();
  }, [db]);

  // Poll active exam takers in real-time when on dashboard or exams tab
  useEffect(() => {
    if (activeTab !== 'exams' && activeTab !== 'dashboard') return;

    const fetchActiveTakers = async () => {
      try {
        const res = await fetch("/api/exams/active-takers");
        const data = await res.json();
        if (data.success && data.activeTakers) {
          setActiveTakers(data.activeTakers);
        }
      } catch (err) {
        console.error("Failed to fetch active takers:", err);
      }
    };

    fetchActiveTakers();
    const interval = setInterval(fetchActiveTakers, 4000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Handle saving and creating exams
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedExams = [...(db.examsList || [])];
    
    const newOrUpdatedExam = {
      id: editingExam ? editingExam.id : `exam_${Date.now()}`,
      title: examForm.title,
      durationMinutes: Number(examForm.durationMinutes) || 40,
      easyCount: Number(examForm.easyCount) || 20,
      mediumCount: Number(examForm.mediumCount) || 20,
      hardCount: Number(examForm.hardCount) || 10,
      isActive: examForm.isActive,
      allowedAttempts: Number(examForm.allowedAttempts) || 1,
      shuffleQuestions: examForm.shuffleQuestions,
      shuffleOptions: examForm.shuffleOptions
    };

    if (editingExam) {
      const idx = updatedExams.findIndex(x => x.id === editingExam.id);
      if (idx !== -1) {
        updatedExams[idx] = newOrUpdatedExam;
      }
    } else {
      updatedExams.push(newOrUpdatedExam);
    }

    try {
      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examsList: updatedExams,
          logActor: currentUser?.fullName || "Admin",
          logAction: editingExam ? `Cập nhật kỳ thi: ${examForm.title}` : `Tạo kỳ thi mới: ${examForm.title}`
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        setEditingExam(null);
        setExamForm({
          title: "",
          durationMinutes: 40,
          easyCount: 20,
          mediumCount: 20,
          hardCount: 10,
          isActive: false,
          allowedAttempts: 1,
          shuffleQuestions: true,
          shuffleOptions: true
        });
        alert("Lưu thông tin kỳ thi thành công!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi kết nối máy chủ!");
    }
  };

  const handleToggleExamActive = async (exam: any) => {
    const updatedExams = (db.examsList || []).map((x: any) => {
      if (x.id === exam.id) {
        return { ...x, isActive: !x.isActive };
      }
      return x;
    });

    try {
      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examsList: updatedExams,
          exams: { isOfficialActive: updatedExams.some((x: any) => x.id === "exam_1" ? x.isActive : false) },
          logActor: currentUser?.fullName || "Admin",
          logAction: `Thay đổi trạng thái kỳ thi: ${exam.title} thành ${!exam.isActive ? "Mở" : "Đóng"}`
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (!confirm(`Đồng chí chắc chắn muốn xóa kỳ thi "${examTitle}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    const updatedExams = (db.examsList || []).filter((x: any) => x.id !== examId);

    try {
      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examsList: updatedExams,
          logActor: currentUser?.fullName || "Admin",
          logAction: `Xóa kỳ thi: ${examTitle}`
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        alert("Xóa kỳ thi thành công!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1. CHART DATA CALCULATIONS
  const officialResults = db.examResults.filter(r => r.type === "official");
  const practiceResults = db.examResults.filter(r => r.type === "practice");
  const totalTakers = Array.from(new Set(officialResults.map(r => r.userEmail))).length;

  const averageScore = officialResults.length > 0 
    ? (officialResults.reduce((acc, r) => acc + r.score, 0) / officialResults.length) 
    : 0;

  const passedCount = officialResults.filter(r => r.score >= 5.0).length;
  const failedCount = officialResults.length - passedCount;

  // Chart data 1: Participation by Department
  const deptTakerMap: { [key: string]: number } = {};
  officialResults.forEach((r) => {
    const dept = r.userDepartment.split(",")[0] || "Khác";
    deptTakerMap[dept] = (deptTakerMap[dept] || 0) + 1;
  });
  const deptChartData = Object.keys(deptTakerMap).map(key => ({
    name: key,
    "Người thi": deptTakerMap[key]
  }));

  // Chart data 2: Pass/Fail Rate
  const passRateData = [
    { name: "Đạt (>= 5.0)", value: passedCount || 1, color: "#10b981" },
    { name: "Chưa đạt (< 5.0)", value: failedCount || 0, color: "#ef4444" }
  ];

  // Chart data 3: Question difficulty counts (simulated based on answers explanation availability or random complexity mapping)
  const easyQuestionsCount = db.questions.filter((_, i) => i % 2 === 0).length;
  const hardQuestionsCount = db.questions.length - easyQuestionsCount;
  const difficultyData = [
    { name: "Câu dễ", "Số lượng": easyQuestionsCount, fill: "#3b82f6" },
    { name: "Câu trung bình", "Số lượng": Math.floor(db.questions.length * 0.3), fill: "#f59e0b" },
    { name: "Câu khó", "Số lượng": db.questions.length - easyQuestionsCount - Math.floor(db.questions.length * 0.3), fill: "#ef4444" }
  ];

  // 2. FORM ACTION HANDLERS
  const handleSaveSettings = async (updates: any) => {
    try {
      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleOfficialExam = () => {
    handleSaveSettings({ exams: { isOfficialActive: !db.exams.isOfficialActive } });
  };

  // Manage Users
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUsers = [...db.users];
    const encryptedPass = userForm.password ? btoa(userForm.password) : btoa("123456");
    
    if (editingUser) {
      const idx = updatedUsers.findIndex(u => u.id === editingUser.id);
      if (idx !== -1) {
        updatedUsers[idx] = { 
          ...editingUser, 
          fullName: userForm.fullName,
          username: userForm.username || editingUser.username || userForm.email.split("@")[0],
          email: userForm.email,
          phone: userForm.phone,
          role: userForm.role,
          title: userForm.title,
          department: userForm.department,
          chiBo: userForm.chiBo,
          password: userForm.password ? encryptedPass : editingUser.password,
          status: editingUser.status || "active"
        } as User;
        addLog(currentUser?.fullName || "Admin", `Cập nhật thông tin tài khoản: ${userForm.fullName}`);
      }
    } else {
      const newUser = {
        id: `u_${Date.now()}`,
        fullName: userForm.fullName,
        username: userForm.username || userForm.email.split("@")[0],
        email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        title: userForm.title,
        department: userForm.department,
        chiBo: userForm.chiBo,
        password: encryptedPass,
        status: "active",
        createdAt: new Date().toLocaleDateString("vi-VN"),
        lastLogin: "Chưa từng",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"
      } as any;
      updatedUsers.push(newUser);
      addLog(currentUser?.fullName || "Admin", `Tạo mới tài khoản: ${userForm.fullName} (${userForm.role})`);
    }
    await handleSaveSettings({ users: updatedUsers });
    setEditingUser(null);
    setUserForm({ fullName: "", username: "", email: "", phone: "", role: "candidate", title: "Bí thư Chi bộ", department: "", chiBo: "", password: "" });
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = db.users.find(u => u.id === userId);
    if (userToDelete && confirm(`Đồng chí có chắc chắn muốn xóa người dùng "${userToDelete.fullName}"?`)) {
      const updatedUsers = db.users.filter(u => u.id !== userId);
      await handleSaveSettings({ users: updatedUsers });
      addLog(currentUser?.fullName || "Admin", `Xóa tài khoản: ${userToDelete.fullName}`);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const user = db.users.find(u => u.id === userId);
    if (user && confirm(`Đặt lại mật khẩu của đồng chí "${user.fullName}" về mặc định (123456)?`)) {
      const updatedUsers = db.users.map(u => u.id === userId ? { ...u, password: btoa("123456") } : u);
      await handleSaveSettings({ users: updatedUsers });
      addLog(currentUser?.fullName || "Admin", `Đặt lại mật khẩu tài khoản: ${user.fullName}`);
      alert(`Đã đặt lại mật khẩu cho đồng chí ${user.fullName} về "123456".`);
    }
  };

  const handleToggleLockUser = async (userId: string) => {
    const user = db.users.find(u => u.id === userId);
    if (user) {
      const isLocked = user.status === "locked";
      const actionText = isLocked ? "mở khóa" : "khóa";
      if (confirm(`Xác nhận ${actionText} tài khoản của đồng chí "${user.fullName}"?`)) {
        const updatedUsers = db.users.map(u => u.id === userId ? { ...u, status: isLocked ? "active" : "locked" } : u);
        await handleSaveSettings({ users: updatedUsers });
        addLog(currentUser?.fullName || "Admin", `${isLocked ? "Mở khóa" : "Khóa"} tài khoản: ${user.fullName}`);
      }
    }
  };

  // Excel Importer for Users with Validation, Progress, and Report download
  const handleImportUsersExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUserImportProgress(10);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setUserImportProgress(40);
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

        setUserImportProgress(70);
        let successCount = 0;
        const errorsList: any[] = [];
        const parsedUsers: any[] = [];
        const updatedUsers = [...db.users];

        // Headers check (Row 0 is column headers) and dynamic resolution
        const headerRow: any[] = (data[0] as any) || [];
        const findColIndex = (names: string[]) => {
          let idx = headerRow.findIndex(h => {
            if (!h) return false;
            const s = h.toString().trim().toLowerCase();
            return names.some(n => s === n);
          });
          if (idx !== -1) return idx;

          return headerRow.findIndex(h => {
            if (!h) return false;
            const s = h.toString().trim().toLowerCase();
            return names.some(n => n.length > 2 && s.includes(n));
          });
        };

        const colFullName = findColIndex(["họ và tên", "họ tên", "fullname", "name", "tên"]);
        const colUsername = findColIndex(["tên đăng nhập", "username", "tài khoản", "tendangnhap"]);
        const colPassword = findColIndex(["mật khẩu", "password", "matkhau"]);
        const colDepartment = findColIndex(["đơn vị", "department", "công tác", "donvi"]);
        const colChiBo = findColIndex(["chi bộ", "chibo"]);
        const colTitle = findColIndex(["chức vụ", "title", "chucvu"]);
        const colEmail = findColIndex(["email", "thư điện tử"]);
        const colPhone = findColIndex(["số điện thoại", "phone", "sđt", "sodienthoai"]);
        const colRole = findColIndex(["vai trò", "role", "vaitro"]);

        for (let i = 1; i < data.length; i++) {
          const row: any = data[i];
          if (!row || row.length === 0) continue;

          const fullName = colFullName !== -1 ? (row[colFullName] || "").toString().trim() : (row[0] || "").toString().trim();
          const username = colUsername !== -1 ? (row[colUsername] || "").toString().trim() : (row[1] || "").toString().trim();
          const rawPassword = colPassword !== -1 ? (row[colPassword] || "123456").toString().trim() : (row[2] || "123456").toString().trim();
          const department = colDepartment !== -1 ? (row[colDepartment] || "").toString().trim() : (row[3] || "").toString().trim();
          const chiBo = colChiBo !== -1 ? (row[colChiBo] || "").toString().trim() : (row[4] || "").toString().trim();
          const title = colTitle !== -1 ? (row[colTitle] || "Bí thư Chi bộ").toString().trim() : (row[5] || "Bí thư Chi bộ").toString().trim();
          const email = colEmail !== -1 ? (row[colEmail] || "").toString().trim() : (row[6] || "").toString().trim();
          const phone = colPhone !== -1 ? (row[colPhone] || "").toString().trim() : (row[7] || "").toString().trim();
          const rawRole = colRole !== -1 ? (row[colRole] || "candidate").toString().trim().toLowerCase() : (row[8] || "candidate").toString().trim().toLowerCase();

          // Validation
          if (!fullName) {
            errorsList.push({ rowNum: i + 1, field: "Họ và tên", reason: "Họ và tên không được để trống!" });
            continue;
          }
          if (!username) {
            errorsList.push({ rowNum: i + 1, field: "Tên đăng nhập", reason: "Tên đăng nhập không được để trống!" });
            continue;
          }
          if (!department) {
            errorsList.push({ rowNum: i + 1, field: "Đơn vị", reason: "Đơn vị công tác không được để trống!" });
            continue;
          }

          // Map rawRole to exact enum
          let role = "candidate";
          if (rawRole.includes("admin") || rawRole.includes("quản trị")) role = "admin";
          else if (rawRole.includes("btc") || rawRole.includes("ban tổ chức")) role = "organizer";
          else if (rawRole.includes("giám khảo")) role = "judge";

          // Check duplicate username, email, phone in current database
          const isDupDb = db.users.some(u => u.username === username || (email && u.email === email) || (phone && u.phone === phone));
          const isDupExcel = parsedUsers.some(u => u.username === username || (email && u.email === email) || (phone && u.phone === phone));

          if (isDupDb || isDupExcel) {
            errorsList.push({ rowNum: i + 1, field: "Trùng lặp tài khoản", reason: `Tên đăng nhập, Email hoặc Số điện thoại đã tồn tại trong hệ thống hoặc tệp nhập!` });
            continue;
          }

          parsedUsers.push({
            id: `u_${Date.now()}_${i}`,
            fullName,
            username,
            password: btoa(rawPassword),
            department,
            chiBo,
            title,
            email: email || `${username}@bithu2026.vn`,
            phone: phone || "09" + Math.floor(10000000 + Math.random() * 90000000),
            role,
            status: "active",
            createdAt: new Date().toLocaleDateString("vi-VN"),
            lastLogin: "Chưa từng",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"
          });
          successCount++;
        }

        setUserImportProgress(90);
        if (parsedUsers.length > 0) {
          await handleSaveSettings({ users: [...updatedUsers, ...parsedUsers] });
          addLog(currentUser?.fullName || "Admin", `Nhập danh sách ${parsedUsers.length} tài khoản từ Excel`);
        }

        setUserImportReport({
          total: data.length - 1,
          success: successCount,
          errors: errorsList
        });
        setUserImportProgress(100);
        setTimeout(() => setUserImportProgress(null), 3000);
      } catch (err: any) {
        setUserImportProgress(null);
        alert(`Lỗi phân tích tệp Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadUserImportErrorReport = () => {
    if (!userImportReport || userImportReport.errors.length === 0) return;
    const data = userImportReport.errors.map(err => ({
      "Dòng Excel": err.rowNum,
      "Cột/Trường lỗi": err.field,
      "Nguyên nhân thất bại": err.reason
    }));
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "LoiNhapTaiKhoan");
    xlsx.writeFile(wb, "BaoCaoLoi_NhapTaiKhoan_Excel.xlsx");
  };

  // Manage Departments / Units
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDepts = db.departments ? [...db.departments] : [];
    if (editingDept) {
      const idx = updatedDepts.findIndex(d => d.id === editingDept.id);
      if (idx !== -1) {
        updatedDepts[idx] = { ...editingDept, ...deptForm, name: deptForm.company ? `${deptForm.company}, ${deptForm.battalion}` : deptForm.name };
        addLog(currentUser?.fullName || "Admin", `Cập nhật đơn vị: ${deptForm.company || deptForm.name}`);
      }
    } else {
      updatedDepts.push({
        id: `d_${Date.now()}`,
        ...deptForm,
        name: deptForm.company ? `${deptForm.company}, ${deptForm.battalion}` : deptForm.name
      });
      addLog(currentUser?.fullName || "Admin", `Thêm mới đơn vị: ${deptForm.company || deptForm.name}`);
    }
    await handleSaveSettings({ departments: updatedDepts });
    setEditingDept(null);
    setDeptForm({ name: "", battalion: "Tiểu đoàn 1", company: "" });
  };

  const handleDeleteDept = async (deptId: string) => {
    const dept = db.departments?.find(d => d.id === deptId);
    if (dept && confirm(`Xóa đơn vị/chi bộ "${dept.name}"?`)) {
      const updatedDepts = db.departments.filter(d => d.id !== deptId);
      await handleSaveSettings({ departments: updatedDepts });
      addLog(currentUser?.fullName || "Admin", `Xóa đơn vị: ${dept.name}`);
    }
  };

  // Manage Questions
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctAns = Number(questionForm.correctAnswer);
    const hasOptionD = questionForm.optionD && questionForm.optionD.trim() !== "";
    
    if (correctAns === 3 && !hasOptionD) {
      alert("Đồng chí đã chọn đáp án đúng là D, nhưng phương án D đang bỏ trống!");
      return;
    }

    const updatedQuestions = [...db.questions];
    const optsList = [questionForm.optionA, questionForm.optionB, questionForm.optionC];
    if (hasOptionD) {
      optsList.push(questionForm.optionD);
    }

    const qData = {
      text: questionForm.text,
      options: optsList,
      correctAnswer: correctAns,
      explanation: questionForm.explanation,
      type: "text" as any,
      attachmentUrl: ""
    };

    if (editingQuestion) {
      const idx = updatedQuestions.findIndex(q => q.id === editingQuestion.id);
      if (idx !== -1) {
        updatedQuestions[idx] = { ...editingQuestion, ...qData } as Question;
        addLog(currentUser?.fullName || "Admin", `Cập nhật câu hỏi ID: ${editingQuestion.id}`);
      }
    } else {
      const maxId = db.questions.length > 0 ? Math.max(...db.questions.map(q => q.id)) : 0;
      updatedQuestions.push({
        id: maxId + 1,
        ...qData
      });
      addLog(currentUser?.fullName || "Admin", `Thêm câu hỏi mới vào ngân hàng đề`);
    }
    await handleSaveSettings({ questions: updatedQuestions });
    setEditingQuestion(null);
    setQuestionForm({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: 0, explanation: "", type: "text", attachmentUrl: "" });
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (confirm("Đồng chí có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng đề?")) {
      const updatedQuestions = db.questions.filter(q => q.id !== qId);
      await handleSaveSettings({ questions: updatedQuestions });
      addLog(currentUser?.fullName || "Admin", `Xóa câu hỏi ID: ${qId}`);
    }
  };

  const handleClearAllQuestions = async () => {
    if (confirm("⚠️ CẢNH BÁO: Đồng chí có chắc chắn muốn xóa TOÀN BỘ câu hỏi trong ngân hàng đề? Hành động này không thể hoàn tác!")) {
      try {
        const res = await fetch("/api/questions/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (data.success) {
          addLog(currentUser?.fullName || "Admin", "Đã xóa toàn bộ câu hỏi trong ngân hàng đề");
          onRefreshDB();
          alert("Đã xóa toàn bộ câu hỏi thành công!");
        } else {
          alert(`Lỗi: ${data.message}`);
        }
      } catch (err: any) {
        alert(`Lỗi kết nối: ${err.message}`);
      }
    }
  };

  const handleRestoreDefaultQuestions = async () => {
    if (confirm("Đồng chí có chắc chắn muốn khôi phục ngân hàng đề về mặc định (121 câu hỏi)? Hành động này sẽ thay thế danh sách câu hỏi hiện tại.")) {
      try {
        const res = await fetch("/api/questions/restore-default", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (data.success) {
          addLog(currentUser?.fullName || "Admin", `Đã khôi phục ngân hàng câu hỏi mặc định (${data.count} câu)`);
          onRefreshDB();
          alert(`Khôi phục thành công ${data.count} câu hỏi mặc định!`);
        } else {
          alert(`Lỗi: ${data.message}`);
        }
      } catch (err: any) {
        alert(`Lỗi kết nối: ${err.message}`);
      }
    }
  };

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
        addLog(currentUser?.fullName || "Admin", "Đã khôi phục toàn bộ cơ sở dữ liệu từ sao lưu trình duyệt");
        onRefreshDB();
        alert("Khôi phục toàn bộ dữ liệu ngân hàng đề và thông tin cấu hình từ trình duyệt thành công!");
      } else {
        alert("Khôi phục thất bại: " + (data.message || "Lỗi không xác định"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi kết nối máy chủ khi khôi phục: " + err.message);
    }
  };

  // Manage Documents
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDocs = [...db.documents];
    const newDoc = {
      ...docForm,
      size: "1.5 MB" // simulated or fixed size
    };
    if (editingDoc) {
      const idx = updatedDocs.findIndex(d => d.id === editingDoc.id);
      if (idx !== -1) {
        updatedDocs[idx] = { ...editingDoc, ...newDoc } as StudyDocument;
        addLog(currentUser?.fullName || "Admin", `Cập nhật tài liệu: ${docForm.title}`);
      }
    } else {
      updatedDocs.push({
        id: `doc_${Date.now()}`,
        ...newDoc
      } as any);
      addLog(currentUser?.fullName || "Admin", `Đăng tài liệu ôn tập mới: ${docForm.title}`);
    }
    await handleSaveSettings({ documents: updatedDocs });
    setEditingDoc(null);
    setDocForm({ title: "", description: "", format: "pdf" as any, category: "Tài liệu ôn thi", url: "#", publisher: "Ban Tổ chức", issueDate: new Date().toISOString().split("T")[0], author: "Ban Tổ chức", coverImage: "", isHidden: false });
  };

  const handleDeleteDoc = async (docId: string) => {
    const doc = db.documents.find(d => d.id === docId);
    if (doc && confirm(`Xóa tài liệu "${doc.title}" khỏi kho tài liệu?`)) {
      const updatedDocs = db.documents.filter(d => d.id !== docId);
      await handleSaveSettings({ documents: updatedDocs });
      addLog(currentUser?.fullName || "Admin", `Xóa tài liệu: ${doc.title}`);
    }
  };

  // Excel document import with validation and error reporting
  const handleImportDocsExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = xlsx.utils.sheet_to_json(ws) as any[];

        const successRows: any[] = [];
        const errorRows: any[] = [];

        jsonData.forEach((row: any, idx: number) => {
          const rowNum = idx + 2; // header is row 1
          const errors: string[] = [];

          const title = row["Tiêu đề"] || row["title"] || "";
          const description = row["Mô tả"] || row["description"] || "";
          const category = row["Danh mục"] || row["category"] || "";
          const format = (row["Loại tài liệu"] || row["format"] || "").toString().toLowerCase();
          const url = row["Đường dẫn file"] || row["url"] || "#";
          const issueDate = row["Ngày ban hành"] || row["issueDate"] || new Date().toISOString().split("T")[0];
          const author = row["Người đăng"] || row["author"] || "Admin";

          if (!title.trim()) {
            errors.push("Cột 'Tiêu đề' không được bỏ trống");
          }
          if (!category.trim()) {
            errors.push("Cột 'Danh mục' không được bỏ trống");
          }
          const validFormats = ["pdf", "doc", "ppt", "video", "excel", "audio"];
          if (!format || !validFormats.includes(format)) {
            errors.push(`Định dạng '${format || "(Trống)"}' không hợp lệ. Phải thuộc: [pdf, doc, ppt, video, excel, audio]`);
          }

          if (errors.length > 0) {
            errorRows.push({
              rowNum,
              title: title || `(Dòng ${rowNum} thiếu tiêu đề)`,
              reason: errors.join("; ")
            });
          } else {
            successRows.push({
              id: `doc_${Date.now()}_${idx}`,
              title,
              description,
              category,
              format: format as any,
              url,
              size: "1.2 MB",
              publisher: row["Đơn vị phát hành"] || row["publisher"] || "Ban Tổ chức",
              issueDate,
              author,
              isHidden: false
            });
          }
        });

        if (successRows.length > 0) {
          const updatedDocs = [...db.documents, ...successRows];
          await handleSaveSettings({ documents: updatedDocs });
          addLog(currentUser?.fullName || "Admin", `Nhập thành công ${successRows.length} tài liệu từ tệp Excel`);
        }

        setDocImportReport({
          total: jsonData.length,
          success: successRows.length,
          errors: errorRows
        });
      } catch (err: any) {
        alert(`Lỗi khi xử lý tệp nhập tài liệu: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadDocImportErrorReport = () => {
    if (!docImportReport || docImportReport.errors.length === 0) return;
    const data = docImportReport.errors.map(err => ({
      "Dòng Excel": err.rowNum,
      "Tiêu đề hàng": err.title,
      "Lỗi phát hiện": err.reason
    }));
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "LoiNhapTep");
    xlsx.writeFile(wb, "BaoCaoLoi_NhapTaiLieu.xlsx");
  };

  // 3. EXCEL FILE PARSING & IMPORT
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQuestionImportProgress(10);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setQuestionImportProgress(40);
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

        setQuestionImportProgress(70);
        let successCount = 0;
        const errorsList: any[] = [];
        const parsedQuestions: any[] = [];

        // Parse and resolve headers dynamically
        const headerRow: any[] = (data[0] as any) || [];
        const findColIndex = (names: string[]) => {
          let idx = headerRow.findIndex(h => {
            if (!h) return false;
            const s = h.toString().trim().toLowerCase();
            return names.some(n => s === n);
          });
          if (idx !== -1) return idx;

          return headerRow.findIndex(h => {
            if (!h) return false;
            const s = h.toString().trim().toLowerCase();
            return names.some(n => n.length > 2 && s.includes(n));
          });
        };

        const colCategory = findColIndex(["danh mục", "category"]);
        const colTopic = findColIndex(["chủ đề", "topic"]);
        const colDifficulty = findColIndex(["mức độ", "difficulty"]);
        const colText = findColIndex(["nội dung câu hỏi", "nội dung", "text"]);
        const colOptionA = findColIndex(["phương án a", "phương án_a", "option a", "a", "a."]);
        const colOptionB = findColIndex(["phương án b", "phương án_b", "option b", "b", "b."]);
        const colOptionC = findColIndex(["phương án c", "phương án_c", "option c", "c", "c."]);
        const colOptionD = findColIndex(["phương án d", "phương án_d", "option d", "d", "d."]);
        const colCorrect = findColIndex(["đáp án đúng", "đáp án đúng (0-3)", "correct", "đáp án", "correctanswer"]);
        const colExplanation = findColIndex(["giải thích", "explanation"]);

        // Step 2: Merge/Fold adjacent split rows to handle line-wrapped cells or split Excel rows
        interface ProcessedRow {
          originalRowNum: number;
          data: any[];
        }
        const processedRows: ProcessedRow[] = [];
        let currentQuestion: ProcessedRow | null = null;

        for (let i = 1; i < data.length; i++) {
          const row: any = data[i];
          if (!row || row.length === 0) continue;

          // Check if the row has non-empty text in the question column
          const text = colText !== -1 ? (row[colText] || "").toString().trim() : "";
          const hasText = text !== "";

          if (hasText) {
            // Push previous question to list if active
            if (currentQuestion) {
              processedRows.push(currentQuestion);
            }
            // Start a new question
            currentQuestion = {
              originalRowNum: i + 1,
              data: [...row]
            };
          } else {
            // If the row has no text, but we have a current active question,
            // merge any non-empty cells into the current question
            if (currentQuestion) {
              for (let c = 0; c < row.length; c++) {
                if (row[c] !== undefined && row[c] !== null && row[c].toString().trim() !== "") {
                  const currentValue = currentQuestion.data[c];
                  if (currentValue === undefined || currentValue === null || currentValue.toString().trim() === "") {
                    currentQuestion.data[c] = row[c];
                  }
                }
              }
            }
          }
        }
        if (currentQuestion) {
          processedRows.push(currentQuestion);
        }

        // Detect numeric correct answer style (0-based vs 1-based)
        let hasZero = false;
        let hasFour = false;
        const tempGetRawValue = (val: any) => {
          if (val === undefined || val === null) return "";
          return val.toString().trim();
        };
        for (let i = 0; i < processedRows.length; i++) {
          const r = processedRows[i].data;
          const rawCorrect = colCorrect !== -1 ? tempGetRawValue(r[colCorrect]) : tempGetRawValue(r[9]);
          const val = rawCorrect.trim();
          if (val === "0") hasZero = true;
          if (val === "4") hasFour = true;
        }
        const isOneBased = hasFour || !hasZero;

        // Process each merged/folded row
        for (let idx = 0; idx < processedRows.length; idx++) {
          const { originalRowNum, data: row } = processedRows[idx];

          const getRawValue = (val: any) => {
            if (val === undefined || val === null) return "";
            return val.toString().trim();
          };

          // Resolve values based on mapped column indices or legacy defaults
          const category = colCategory !== -1 ? getRawValue(row[colCategory]) || "Văn kiện Đảng" : "Văn kiện Đảng";
          const topic = colTopic !== -1 ? getRawValue(row[colTopic]) || "Công tác Đảng" : "Công tác Đảng";
          const rawDifficulty = colDifficulty !== -1 ? getRawValue(row[colDifficulty]) : "Dễ";
          let difficulty = "Dễ";
          const lowerDiff = rawDifficulty.toLowerCase().trim();
          if (lowerDiff === "khó" || lowerDiff === "hard") {
            difficulty = "Khó";
          } else if (lowerDiff === "trung bình" || lowerDiff === "medium" || lowerDiff === "tb") {
            difficulty = "Trung bình";
          } else {
            difficulty = "Dễ";
          }
          const text = colText !== -1 ? getRawValue(row[colText]) : getRawValue(row[4]);
          const optionA = colOptionA !== -1 ? getRawValue(row[colOptionA]) : getRawValue(row[5]);
          const optionB = colOptionB !== -1 ? getRawValue(row[colOptionB]) : getRawValue(row[6]);
          const optionC = colOptionC !== -1 ? getRawValue(row[colOptionC]) : getRawValue(row[7]);
          const optionD = colOptionD !== -1 ? getRawValue(row[colOptionD]) : getRawValue(row[8]);
          const rawCorrect = colCorrect !== -1 ? getRawValue(row[colCorrect]) : getRawValue(row[9]);
          const explanation = colExplanation !== -1 ? getRawValue(row[colExplanation]) || "Đang cập nhật giải thích..." : getRawValue(row[10]) || "Đang cập nhật giải thích...";

          // Validation
          if (!text) {
            errorsList.push({ rowNum: originalRowNum, title: `Dòng ${originalRowNum}`, reason: "Nội dung câu hỏi không được trống!" });
            continue;
          }
          if (!optionA || !optionB || !optionC) {
            errorsList.push({ rowNum: originalRowNum, title: text.slice(0, 30), reason: "Bắt buộc phải có ít nhất 3 phương án lựa chọn A, B, C!" });
            continue;
          }

          const hasOptionD = optionD && optionD.trim() !== "";
          const optsList = [optionA, optionB, optionC];
          if (hasOptionD) {
            optsList.push(optionD);
          }

          // Map correct answer
          let correctAnswer = -1;
          const cleanedCorrect = rawCorrect.trim();
          const cleanedCorrectUpper = cleanedCorrect.toUpperCase();

          // A. Compare exact/cleaned option texts
          const cleanOptionPrefix = (str: string) => {
            if (!str) return "";
            return str.toLowerCase()
              .trim()
              .replace(/^[a-d][\s\.\)\-\:\,]+/i, "")
              .trim();
          };

          const normCorrect = cleanOptionPrefix(cleanedCorrect);
          const normA = cleanOptionPrefix(optionA);
          const normB = cleanOptionPrefix(optionB);
          const normC = cleanOptionPrefix(optionC);
          const normD = cleanOptionPrefix(optionD || "");

          if (normCorrect && normCorrect === normA) correctAnswer = 0;
          else if (normCorrect && normCorrect === normB) correctAnswer = 1;
          else if (normCorrect && normCorrect === normC) correctAnswer = 2;
          else if (normCorrect && normCorrect === normD) correctAnswer = 3;

          // B. Check direct matches with raw options
          if (correctAnswer === -1) {
            const rawCorrectLower = cleanedCorrect.toLowerCase();
            if (rawCorrectLower === optionA.toLowerCase().trim()) correctAnswer = 0;
            else if (rawCorrectLower === optionB.toLowerCase().trim()) correctAnswer = 1;
            else if (rawCorrectLower === optionC.toLowerCase().trim()) correctAnswer = 2;
            else if (optionD && rawCorrectLower === optionD.toLowerCase().trim()) correctAnswer = 3;
          }

          // C. Try standard letter matching with standard prefixes (e.g. "Đáp án A", "Chọn A", "A.", "A")
          if (correctAnswer === -1) {
            const matchLetter = cleanedCorrectUpper.match(/(?:^|đáp\s+án|phương\s+án|chọn|đáp\s+án\s+đúng|đáp\s+án\s+là|câu|đá|đáp\s+án\s+đúng\s+là)[\s\:\-\.\)\(\[\]]*([A-D])(?:$|[\s\.\)\,\:\-\;])/i);
            if (matchLetter) {
              const letter = matchLetter[1];
              if (letter === "A") correctAnswer = 0;
              else if (letter === "B") correctAnswer = 1;
              else if (letter === "C") correctAnswer = 2;
              else if (letter === "D") correctAnswer = 3;
            }
          }

          // D. Number matching based on 0-based vs 1-based indexing
          if (correctAnswer === -1) {
            const matchNum = cleanedCorrectUpper.match(/(?:^|đáp\s+án|phương\s+án|chọn|đáp\s+án\s+đúng|đáp\s+án\s+là|câu|đá|đáp\s+án\s+đúng\s+là)[\s\:\-\.\)\(\[\]]*([0-4])(?:$|[\s\.\)\,\:\-\;])/i);
            if (matchNum) {
              const numStr = matchNum[1];
              if (numStr === "0") {
                correctAnswer = 0;
              } else if (isOneBased) {
                if (numStr === "1") correctAnswer = 0;
                else if (numStr === "2") correctAnswer = 1;
                else if (numStr === "3") correctAnswer = 2;
                else if (numStr === "4") correctAnswer = 3;
              } else {
                if (numStr === "1") correctAnswer = 1;
                else if (numStr === "2") correctAnswer = 2;
                else if (numStr === "3") correctAnswer = 3;
              }
            }
          }

          // E. Extra fallback checks for direct single letters or 0-3 values
          if (correctAnswer === -1) {
            if (cleanedCorrectUpper === "A" || cleanedCorrectUpper === "A." || cleanedCorrectUpper === "A)") correctAnswer = 0;
            else if (cleanedCorrectUpper === "B" || cleanedCorrectUpper === "B." || cleanedCorrectUpper === "B)") correctAnswer = 1;
            else if (cleanedCorrectUpper === "C" || cleanedCorrectUpper === "C." || cleanedCorrectUpper === "C)") correctAnswer = 2;
            else if (cleanedCorrectUpper === "D" || cleanedCorrectUpper === "D." || cleanedCorrectUpper === "D)") correctAnswer = 3;
          }

          if (correctAnswer === 3 && !hasOptionD) {
            errorsList.push({ rowNum: originalRowNum, title: text.slice(0, 30), reason: "Đáp án đúng được chọn là D, nhưng phương án D lại trống!" });
            continue;
          }

          if (correctAnswer === -1) {
            errorsList.push({ rowNum: originalRowNum, title: text.slice(0, 30), reason: `Đáp án đúng '${rawCorrect}' không hợp lệ! Phải là một trong các phương án A, B, C, D hoặc chỉ số đáp án đúng.` });
            continue;
          }

          // Check duplicate text in Excel to avoid self-duplication
          const isDupExcel = parsedQuestions.some(q => q.text.toLowerCase().trim() === text.toLowerCase().trim());

          if (isDupExcel) {
            continue;
          }

          parsedQuestions.push({
            text,
            options: optsList,
            correctAnswer,
            explanation,
            type: "text",
            category,
            topic,
            difficulty,
            attachmentUrl: ""
          });
          successCount++;
        }

        setQuestionImportProgress(90);
        if (parsedQuestions.length > 0) {
          const res = await fetch("/api/questions/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionsList: parsedQuestions })
          });
          const resData = await res.json();
          if (resData.success) {
            addLog(currentUser?.fullName || "Admin", `Nhập thành công ${parsedQuestions.length} câu hỏi vào ngân hàng đề từ Excel`);
            onRefreshDB();
          } else {
            errorsList.push({ rowNum: "Hệ thống", title: "API Import", reason: resData.message });
          }
        }

        setQuestionImportReport({
          total: data.length - 1,
          success: successCount,
          errors: errorsList
        });
        setQuestionImportProgress(100);
        setTimeout(() => setQuestionImportProgress(null), 3000);
      } catch (err: any) {
        setQuestionImportProgress(null);
        alert(`Lỗi phân tích tệp Excel câu hỏi: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadQuestionImportErrorReport = () => {
    if (!questionImportReport || questionImportReport.errors.length === 0) return;
    const data = questionImportReport.errors.map(err => ({
      "Dòng Excel": err.rowNum,
      "Nội dung câu hỏi rút gọn": err.title,
      "Lỗi chi tiết": err.reason
    }));
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "LoiNhapCauHoi");
    xlsx.writeFile(wb, "BaoCaoLoi_NhapCauHoi.xlsx");
  };

  // Precompute rankings map for O(1) lookups during rendering and exporting
  const examRanksMap = useMemo(() => {
    const map: Record<string, number> = {};
    const officialResults = db.examResults.filter(r => r.type === "official");
    const practiceResults = db.examResults.filter(r => r.type === "practice");

    const sortedOfficial = [...officialResults].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.durationSeconds - b.durationSeconds;
    });

    const sortedPractice = [...practiceResults].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.durationSeconds - b.durationSeconds;
    });

    sortedOfficial.forEach((r, idx) => {
      map[r.id] = idx + 1;
    });

    sortedPractice.forEach((r, idx) => {
      map[r.id] = idx + 1;
    });

    return map;
  }, [db.examResults]);

  // Filtered & Sorted results
  const sortedResults = useMemo(() => {
    let list = [...db.examResults];
    
    // Search
    if (resultSearch.trim()) {
      const q = resultSearch.toLowerCase();
      list = list.filter(r => 
        (r.userName || "").toLowerCase().includes(q) ||
        (r.userEmail || "").toLowerCase().includes(q) ||
        (r.userPhone || "").toLowerCase().includes(q) ||
        (r.userDepartment || "").toLowerCase().includes(q) ||
        (r.userChiBo || "").toLowerCase().includes(q)
      );
    }
    
    // Dept filter
    if (resultDeptFilter) {
      list = list.filter(r => r.userDepartment === resultDeptFilter);
    }

    // Type filter (thi thật / thi thử)
    if (resultTypeFilter && resultTypeFilter !== "all") {
      list = list.filter(r => r.type === resultTypeFilter);
    }
    
    // Score filter
    if (resultScoreFilter === "excellent") {
      list = list.filter(r => r.score >= 8.0);
    } else if (resultScoreFilter === "good") {
      list = list.filter(r => r.score >= 6.5 && r.score < 8.0);
    } else if (resultScoreFilter === "average") {
      list = list.filter(r => r.score >= 5.0 && r.score < 6.5);
    } else if (resultScoreFilter === "fail") {
      list = list.filter(r => r.score < 5.0);
    }
    
    // Sort
    list.sort((a, b) => {
      if (resultSort === "score_desc") {
        if (b.score !== a.score) return b.score - a.score;
        return a.durationSeconds - b.durationSeconds;
      } else if (resultSort === "score_asc") {
        if (a.score !== b.score) return a.score - b.score;
        return a.durationSeconds - b.durationSeconds;
      } else if (resultSort === "duration_asc") {
        return a.durationSeconds - b.durationSeconds;
      } else if (resultSort === "duration_desc") {
        return b.durationSeconds - a.durationSeconds;
      }
      return 0;
    });
    
    return list;
  }, [db.examResults, resultSearch, resultDeptFilter, resultTypeFilter, resultScoreFilter, resultSort]);

  // Compute rank in general db (comparing to all other results of same type)
  const getRank = (resultId: string) => {
    return examRanksMap[resultId] || 1;
  };

  // Export results to excel
  const handleExportAllResultsExcel = (resultsToExport: any[]) => {
    const headers = [
      "STT", "Họ tên Thí sinh", "Đơn vị", "Chi bộ", "Chức vụ", "Email", "Số điện thoại", 
      "Hình thức thi", "Số câu đúng", "Số câu sai", "Tổng số câu hỏi", "Điểm số", "Thời gian làm bài", "Ngày thi", "Hạng"
    ];
    
    const rows = resultsToExport.map((r, index) => {
      const minutes = Math.floor(r.durationSeconds / 60);
      const seconds = r.durationSeconds % 60;
      return [
        index + 1,
        r.userName,
        r.userDepartment,
        r.userChiBo || "",
        r.userTitle || "Bí thư Chi bộ",
        r.userEmail,
        r.userPhone || "",
        r.type === "official" ? "Thi chính thức" : "Luyện tập",
        r.correctCount,
        r.wrongCount,
        r.correctCount + r.wrongCount,
        r.score.toFixed(1),
        `${minutes}p ${seconds}s`,
        new Date(r.date).toLocaleString("vi-VN"),
        getRank(r.id)
      ];
    });

    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Két Quả");
    xlsx.writeFile(wb, "KetQuaHoiThi_BiThuChiBo2026.xlsx");
    addLog(currentUser?.fullName || "Admin", "Xuất báo cáo kết quả thí sinh sang tệp Excel");
  };

  // Export a single candidate result detail card to Excel
  const downloadCandidateExcel = (result: any) => {
    const personalInfo = [
      ["ĐẢNG BỘ TRUNG ĐOÀN 1", "ĐẢNG CỘNG SẢN VIỆT NAM"],
      ["BAN TỔ CHỨC HỘI THI", ""],
      [],
      ["PHIẾU ĐIỂM CHI TIẾT CÁ NHÂN THÍ SINH"],
      ["Họ và tên thí sinh:", result.userName],
      ["Đơn vị biên chế:", result.userDepartment],
      ["Chi bộ đảng:", result.userChiBo || ""],
      ["Chức danh chính quyền:", result.userTitle || ""],
      ["Địa chỉ email:", result.userEmail],
      ["Số điện thoại liên hệ:", result.userPhone || ""],
      ["Thời gian bắt đầu nộp bài:", new Date(result.date).toLocaleString("vi-VN")],
      ["Số câu trả lời đúng:", `${result.correctCount} câu`],
      ["Số câu trả lời sai:", `${result.wrongCount} câu`],
      ["Thời gian hoàn thành bài thi:", `${Math.floor(result.durationSeconds / 60)}p ${result.durationSeconds % 60}s`],
      ["Tổng điểm quy đổi (thang điểm 10):", `${result.score.toFixed(1)} / 10.0`],
      ["Xếp hạng toàn hội thi:", `Hạng ${getRank(result.id)}`]
    ];

    const ws = xlsx.utils.aoa_to_sheet(personalInfo);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "PhieuDiem");
    xlsx.writeFile(wb, `KetQua_${result.userName.replace(/\s+/g, "")}.xlsx`);
    addLog(currentUser?.fullName || "Admin", `Xuất phiếu điểm cá nhân cho thí sinh: ${result.userName}`);
  };

  const userRole = currentUser?.role || 'admin';

  const menuItems = [
    { id: 'dashboard' as const, name: "Tổng quan", icon: TrendingUp, roles: ['admin', 'organizer', 'judge'] },
    { id: 'users' as const, name: "Quản lý tài khoản", icon: Users, roles: ['admin'] },
    { id: 'departments' as const, name: "Quản lý đơn vị", icon: MapPin, roles: ['admin'] },
    { id: 'exams' as const, name: "Quản lý kỳ thi", icon: Award, roles: ['admin', 'organizer'] },
    { id: 'questions' as const, name: "Ngân hàng câu hỏi", icon: FileQuestion, roles: ['admin', 'organizer'] },
    { id: 'docs' as const, name: "Quản lý tài liệu", icon: BookOpen, roles: ['admin', 'organizer'] },
    { id: 'results' as const, name: "Quản lý kết quả", icon: ClipboardList, roles: ['admin', 'organizer', 'judge'] },
    { id: 'reports' as const, name: "Báo cáo thống kê", icon: Activity, roles: ['admin', 'organizer', 'judge'] },
    { id: 'logs' as const, name: "Nhật ký hệ thống", icon: FileText, roles: ['admin'] },
    { id: 'settings' as const, name: "Cài đặt", icon: Settings, roles: ['admin'] }
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Side Tabs Navigation */}
      <div className="lg:col-span-3 space-y-2">
        <div className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-4 rounded-2xl shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-yellow-100/40 mb-3">Ban Chỉ đạo Hội thi</p>
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl focus:outline-none transition-all ${
                    activeTab === item.id ? "bg-yellow-500 text-red-950 border border-yellow-400 shadow-md font-black" : "text-stone-600 dark:text-yellow-100/60 hover:bg-yellow-500/10 hover:text-yellow-500"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" /> {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Panel Content area */}
      <div className="lg:col-span-9 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI statistics block */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-center">
                <span className="text-3xl font-black text-red-600 dark:text-red-400 block font-mono">{totalTakers}</span>
                <span className="text-xs font-semibold text-slate-500 mt-1 block">Tổng số thí sinh đã nộp bài</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-center">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                  {averageScore > 0 ? averageScore.toFixed(1) : "0.0"}/10
                </span>
                <span className="text-xs font-semibold text-slate-500 mt-1 block">Điểm thi trung bình</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-center col-span-2 md:col-span-1">
                <span className="text-3xl font-black text-yellow-500 block font-mono">
                  {officialResults.length > 0 ? ((passedCount / officialResults.length) * 100).toFixed(0) : "0"}%
                </span>
                <span className="text-xs font-semibold text-slate-500 mt-1 block">Tỷ lệ đạt bài kiểm tra (Đại số)</span>
              </div>
            </div>

            {/* Recharts Graphical blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: Participation */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Số lượng thí sinh theo Đơn vị chính</h4>
                <div className="h-64">
                  {deptChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                        <Bar dataKey="Người thi" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Chưa có kết quả để hiển thị biểu đồ phân bố đơn vị.</div>
                  )}
                </div>
              </div>

              {/* Chart 2: Pass/Fail Pie chart */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Tỷ lệ đạt chứng nhận hội thi</h4>
                <div className="h-64 flex flex-col items-center justify-center">
                  {officialResults.length > 0 ? (
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={passRateData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {passRateData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-400 italic">Chưa có kết quả để hiển thị biểu đồ tỷ lệ đạt.</div>
                  )}
                </div>
              </div>

              {/* Chart 3: Question difficulty counts */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm col-span-full">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Phân tích mức độ khó dễ câu hỏi ôn tập</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={difficultyData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                      <Bar dataKey="Số lượng" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Users Management */}
        {activeTab === 'users' && (() => {
          const userDepts = Array.from(new Set(db.users.map(u => u.department).filter(Boolean)));
          
          // Apply search & filtering
          let filteredList = db.users.filter(u => {
            if (userSearch.trim()) {
              const q = userSearch.toLowerCase();
              const match = (u.fullName || "").toLowerCase().includes(q) ||
                            (u.username || "").toLowerCase().includes(q) ||
                            (u.email || "").toLowerCase().includes(q) ||
                            (u.phone || "").toLowerCase().includes(q) ||
                            (u.department || "").toLowerCase().includes(q) ||
                            (u.chiBo || "").toLowerCase().includes(q) ||
                            (u.title || "").toLowerCase().includes(q);
              if (!match) return false;
            }
            if (userDeptFilter && u.department !== userDeptFilter) return false;
            if (userRoleFilter && u.role !== userRoleFilter) return false;
            if (userStatusFilter) {
              const locked = u.status === "locked";
              if (userStatusFilter === "locked" && !locked) return false;
              if (userStatusFilter === "active" && locked) return false;
            }
            return true;
          });

          // Simple Pagination
          const itemsPerPage = 8;
          const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
          const paginatedUsers = filteredList.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);

          return (
            <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-xs sm:text-sm">
              <div className="flex flex-wrap justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">Cơ sở dữ liệu Người dùng & Vai trò</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Quản lý tài khoản, phân quyền cán bộ, khóa tài khoản và import hàng loạt</p>
                </div>
                <div className="flex gap-2">
                  <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors">
                    <Upload className="w-4 h-4" /> Import Excel
                    <input type="file" accept=".xlsx, .xls" onChange={handleImportUsersExcel} className="hidden" />
                  </label>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({ fullName: "", username: "", email: "", phone: "", role: "candidate", title: "Bí thư Chi bộ", department: "", chiBo: "", password: "" });
                    }}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 focus:outline-none transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Thêm người dùng
                  </button>
                </div>
              </div>

              {/* Excel Import progress bar for users */}
              {userImportProgress !== null && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Đang nạp dữ liệu từ Excel...</span>
                    <span className="font-mono text-red-600 font-bold">{userImportProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${userImportProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* User Import feedback report */}
              {userImportReport && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                  <h5 className="font-bold text-red-600 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Báo cáo nạp tài khoản từ Excel
                  </h5>
                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">Tổng dòng</span>
                      <span className="text-sm font-bold">{userImportReport.total}</span>
                    </div>
                    <div>
                      <span className="text-emerald-500 text-[10px] block font-sans">Thành công</span>
                      <span className="text-sm font-bold text-emerald-500">{userImportReport.success}</span>
                    </div>
                    <div>
                      <span className="text-red-500 text-[10px] block font-sans">Lỗi bỏ qua</span>
                      <span className="text-sm font-bold text-red-500">{userImportReport.errors.length}</span>
                    </div>
                  </div>
                  {userImportReport.errors.length > 0 && (
                    <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40">
                      <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Bỏ qua {userImportReport.errors.length} dòng lỗi định dạng hoặc trùng tài khoản.</span>
                      <button onClick={downloadUserImportErrorReport} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 flex items-center gap-1">
                        <Download className="w-3 h-3" /> Tải báo cáo lỗi
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick form add/edit */}
              <form onSubmit={handleSaveUser} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-100 dark:border-slate-800">
                <div className="col-span-full font-bold text-red-600 uppercase">
                  {editingUser ? `ĐANG CHỈNH SỬA TÀI KHOẢN: ${editingUser.fullName}` : "THÊM MỚI TÀI KHOẢN TRỰC TIẾP"}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Họ & Tên</label>
                  <input
                    type="text"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tên đăng nhập (Username)</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="để trống để tự động lấy từ Email"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mật khẩu</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder={editingUser ? "Để trống nếu không đổi mật khẩu" : "Mặc định lấy 123456"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Địa chỉ Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vai trò quyền hạn</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  >
                    <option value="admin">Admin</option>
                    <option value="organizer">Ban Tổ chức</option>
                    <option value="judge">Giám khảo</option>
                    <option value="candidate">Thí sinh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chức vụ chính</label>
                  <input
                    type="text"
                    value={userForm.title}
                    onChange={(e) => setUserForm({ ...userForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đơn vị công tác (Đại đội / Phòng ban)</label>
                  <input
                    type="text"
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    placeholder="ví dụ: Đại đội 1, Tiểu đoàn 4"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chi bộ</label>
                  <input
                    type="text"
                    value={userForm.chiBo}
                    onChange={(e) => setUserForm({ ...userForm, chiBo: e.target.value })}
                    placeholder="ví dụ: Chi bộ Đại đội 1"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  />
                </div>
                <div className="col-span-full flex gap-2 justify-end mt-1">
                  {editingUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ fullName: "", username: "", email: "", phone: "", role: "candidate", title: "Bí thư Chi bộ", department: "", chiBo: "", password: "" });
                      }}
                      className="px-4 py-1.5 bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                  >
                    {editingUser ? "Cập nhật tài khoản" : "Tạo tài khoản"}
                  </button>
                </div>
              </form>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo họ tên, sđt, email, đơn vị..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <select
                    value={userDeptFilter}
                    onChange={(e) => { setUserDeptFilter(e.target.value); setUserPage(1); }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs"
                  >
                    <option value="">Lọc theo Đơn vị: Tất cả</option>
                    {userDepts.map((d, idx) => (
                      <option key={idx} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs"
                  >
                    <option value="">Lọc theo Quyền: Tất cả</option>
                    <option value="admin">Admin</option>
                    <option value="organizer">Ban Tổ chức</option>
                    <option value="judge">Giám khảo</option>
                    <option value="candidate">Thí sinh (Đồng chí)</option>
                  </select>
                </div>
                <div>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1); }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs"
                  >
                    <option value="">Trạng thái: Tất cả</option>
                    <option value="active">Đang hoạt động (Mở)</option>
                    <option value="locked">Bị khóa tài khoản</option>
                  </select>
                </div>
              </div>

              {/* List users table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-xs text-left min-w-[900px]">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-bold uppercase text-slate-500 text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3">Đồng chí</th>
                      <th className="p-3">Tên đăng nhập</th>
                      <th className="p-3">Đơn vị & Chi bộ</th>
                      <th className="p-3">Liên hệ</th>
                      <th className="p-3">Vai trò</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Ngày tạo / Đăng nhập cuối</th>
                      <th className="p-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {paginatedUsers.map((u, index) => {
                      const isLocked = u.status === "locked";
                      return (
                        <tr key={u.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/20 ${isLocked ? "bg-red-50/10" : ""}`}>
                          <td className="p-3 text-center font-mono text-slate-400">
                            {(userPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <img src={u.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"} alt="" className="w-8 h-8 rounded-full border shrink-0 object-cover" referrerPolicy="no-referrer" />
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{u.fullName}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black">{u.title}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-red-600 dark:text-red-400">
                            {u.username || u.email?.split("@")[0] || "N/A"}
                          </td>
                          <td className="p-3">
                            <p className="text-slate-800 dark:text-slate-200">{u.department}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{u.chiBo || "(Chưa có Chi bộ)"}</p>
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            <p>{u.email}</p>
                            <p>{u.phone}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin' ? "bg-red-100 text-red-600" :
                              u.role === 'organizer' ? "bg-amber-100 text-amber-600" :
                              u.role === 'judge' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                            }`}>
                              {u.role === 'admin' ? "Admin" :
                               u.role === 'organizer' ? "BTC" :
                               u.role === 'judge' ? "Giám khảo" : "Thí sinh"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              isLocked ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? "bg-red-600 animate-pulse" : "bg-emerald-500"}`}></span>
                              {isLocked ? "Bị khóa" : "Hoạt động"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[10px] font-mono">
                            <p>Tạo: {u.createdAt || "01/07/2026"}</p>
                            <p>Kỳ cuối: {u.lastLogin || "Vừa xong"}</p>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserForm({ 
                                    fullName: u.fullName, 
                                    username: u.username || u.email?.split("@")[0] || "",
                                    email: u.email, 
                                    phone: u.phone, 
                                    role: u.role, 
                                    title: u.title, 
                                    department: u.department, 
                                    chiBo: u.chiBo || "",
                                    password: "" 
                                  });
                                }}
                                className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                title="Sửa thông tin"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                className="p-1 bg-amber-50 text-amber-600 rounded hover:bg-amber-100"
                                title="Đặt lại mật khẩu"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleLockUser(u.id)}
                                className={`p-1 rounded ${isLocked ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-orange-50 text-orange-600 hover:bg-orange-100"}`}
                                title={isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                              >
                                {isLocked ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-bold">Hiển thị {paginatedUsers.length}/{filteredList.length} đồng chí</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setUserPage(prev => Math.max(prev - 1, 1))}
                      disabled={userPage === 1}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg border text-xs font-bold disabled:opacity-40"
                    >
                      Trước
                    </button>
                    <span className="px-3 py-1 font-mono text-xs font-black">{userPage}/{totalPages}</span>
                    <button
                      onClick={() => setUserPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={userPage === totalPages}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg border text-xs font-bold disabled:opacity-40"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab: Questions management */}
        {activeTab === 'questions' && (
          <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Ngân hàng Đề thi Trắc nghiệm ({db.questions.length} câu)</h4>
              
              <div className="flex gap-2">
                {/* Excel Import button layout */}
                <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm">
                  <Upload className="w-4 h-4" /> Import Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                </label>

                {/* Excel Export button */}
                <a
                  href="/api/questions/export"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Export Excel
                </a>

                {/* Clear all questions button */}
                <button
                  onClick={handleClearAllQuestions}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  title="Xóa toàn bộ câu hỏi trong ngân hàng đề"
                >
                  <Trash2 className="w-4 h-4" /> Xóa tất cả
                </button>

                {/* Restore default questions button */}
                <button
                  onClick={handleRestoreDefaultQuestions}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  title="Khôi phục ngân hàng đề mặc định (121 câu hỏi)"
                >
                  <RotateCcw className="w-4 h-4" /> Khôi phục mặc định
                </button>

                {/* Local Storage Restore button if backup exists */}
                {localStorage.getItem("backup_contest_questions") && (
                  <button
                    onClick={handleRestoreFromLocalBackup}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse"
                    title="Khôi phục lại dữ liệu đã lưu trong trình duyệt này"
                  >
                    <RotateCcw className="w-4 h-4" /> Khôi phục sao lưu
                  </button>
                )}

                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setQuestionForm({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: 0, explanation: "", type: "text", attachmentUrl: "" });
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Thêm câu hỏi
                </button>
              </div>
            </div>

            {/* Excel import feedback alerts */}
            {questionImportProgress !== null && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Đang nạp ngân hàng đề thi...</span>
                  <span className="font-mono text-red-600 font-bold">{questionImportProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${questionImportProgress}%` }}></div>
                </div>
              </div>
            )}

            {questionImportReport && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2 text-xs sm:text-sm">
                <h5 className="font-bold text-red-600 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Báo cáo nạp câu hỏi trắc nghiệm
                </h5>
                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">Tổng câu đọc</span>
                    <span className="text-sm font-bold">{questionImportReport.total}</span>
                  </div>
                  <div>
                    <span className="text-emerald-500 text-[10px] block font-sans">Thành công</span>
                    <span className="text-sm font-bold text-emerald-500">{questionImportReport.success}</span>
                  </div>
                  <div>
                    <span className="text-red-500 text-[10px] block font-sans">Bị lỗi / Trùng</span>
                    <span className="text-sm font-bold text-red-500">{questionImportReport.errors.length}</span>
                  </div>
                </div>
                {questionImportReport.errors.length > 0 && (
                  <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40">
                    <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Phát hiện lỗi định dạng ở {questionImportReport.errors.length} câu hỏi.</span>
                    <button onClick={downloadQuestionImportErrorReport} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 flex items-center gap-1">
                      <Download className="w-3 h-3" /> Tải tệp báo cáo lỗi
                    </button>
                  </div>
                )}
              </div>
            )}

            {importFeedback && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200 text-xs font-bold rounded-xl border border-yellow-100 dark:border-yellow-900/50 flex justify-between items-center">
                <span>{importFeedback}</span>
                <button onClick={() => setImportFeedback(null)} className="text-yellow-900 hover:scale-110">✕</button>
              </div>
            )}

            {/* Question Quick add/edit form */}
            <form onSubmit={handleSaveQuestion} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
              <div className="col-span-full font-bold text-red-600 uppercase">
                {editingQuestion ? "SỬA CÂU HỎI HỘI THI CHÍNH THỨC" : "TẠO MỚI CÂU HỎI TRẮC NGHIỆM TRỰC TIẾP"}
              </div>
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nội dung câu hỏi</label>
                <textarea
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-semibold"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phương án lựa chọn A</label>
                <input
                  type="text"
                  value={questionForm.optionA}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phương án lựa chọn B</label>
                <input
                  type="text"
                  value={questionForm.optionB}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phương án lựa chọn C</label>
                <input
                  type="text"
                  value={questionForm.optionC}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phương án lựa chọn D (Không bắt buộc)</label>
                <input
                  type="text"
                  value={questionForm.optionD}
                  onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                  placeholder="Bỏ trống nếu chỉ có 3 đáp án A, B, C"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Danh mục kiến thức</label>
                <input
                  type="text"
                  value={questionForm.category || ""}
                  onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value })}
                  placeholder="ví dụ: Văn kiện Đảng"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chủ đề bài giảng / văn kiện</label>
                <input
                  type="text"
                  value={questionForm.topic || ""}
                  onChange={(e) => setQuestionForm({ ...questionForm, topic: e.target.value })}
                  placeholder="ví dụ: Công tác Đảng"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mức độ phân loại</label>
                <select
                  value={questionForm.difficulty || "Dễ"}
                  onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                >
                  <option value="Dễ">Dễ (Kiến thức cơ bản)</option>
                  <option value="Trung bình">Trung bình (Nghiệp vụ chi bộ)</option>
                  <option value="Khó">Khó (Giải quyết tình huống)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đáp án chính xác</label>
                <select
                  value={questionForm.correctAnswer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                >
                  <option value={0}>Lựa chọn A</option>
                  <option value={1}>Lựa chọn B</option>
                  <option value={2}>Lựa chọn C</option>
                  <option value={3}>Lựa chọn D</option>
                </select>
              </div>

              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Giải thích chi tiết đáp án</label>
                <textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  rows={2}
                  required
                />
              </div>
              <div className="col-span-full flex gap-2 justify-end">
                {editingQuestion && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuestion(null);
                      setQuestionForm({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: 0, explanation: "", type: "text", attachmentUrl: "", category: "Văn kiện Đảng", topic: "Công tác Đảng", difficulty: "Dễ" });
                    }}
                    className="px-4 py-1.5 bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                >
                  {editingQuestion ? "Cập nhật câu hỏi" : "Tạo câu hỏi mới"}
                </button>
              </div>
            </form>

            {/* List questions tables */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {db.questions.map((q) => (
                <div key={q.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-xs sm:text-sm">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-red-600 font-bold">Câu hỏi {q.id}</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold text-slate-500 uppercase">{q.type}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm ${
                        q.difficulty === "Khó"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50"
                          : q.difficulty === "Trung bình"
                          ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
                      }`}>
                        Mức độ: {q.difficulty || "Dễ"}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setQuestionForm({
                            text: q.text,
                            optionA: q.options[0] || "",
                            optionB: q.options[1] || "",
                            optionC: q.options[2] || "",
                            optionD: q.options[3] || "",
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation,
                            type: q.type,
                            attachmentUrl: q.attachmentUrl || "",
                            category: q.category || "Văn kiện Đảng",
                            topic: q.topic || "Công tác Đảng",
                            difficulty: q.difficulty || "Dễ"
                          });
                        }}
                        className="p-1 bg-blue-50 text-blue-600 rounded"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1 bg-red-50 text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mb-2">{q.text}</p>
                  


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                    {q.options.map((opt, oIdx) => (
                      <p key={oIdx} className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                        oIdx === q.correctAnswer
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300"
                          : "bg-slate-50/50 border-slate-100 text-slate-600 dark:bg-slate-950/10 dark:border-slate-800 dark:text-slate-400"
                      }`}>
                        {oIdx === 0 ? "A" : oIdx === 1 ? "B" : oIdx === 2 ? "C" : "D"}. {opt}
                      </p>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-400 font-bold mt-2.5">💡 Giải thích: <span className="font-semibold text-slate-500">{q.explanation}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Exam toggles */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Form: Create or Edit Exam */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 font-serif">
                  <Calendar className="w-4 h-4 text-red-600" />
                  {editingExam ? "Cập nhật Kỳ thi" : "Tạo Kỳ thi mới"}
                </h4>
                
                <form onSubmit={handleSaveExam} className="space-y-3.5 text-xs sm:text-sm">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">Tên kỳ thi</label>
                    <input
                      type="text"
                      required
                      value={examForm.title}
                      onChange={(e) => setExamForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ví dụ: Kỳ thi Bí thư Chi bộ giỏi đợt 2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">Thời gian (phút)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={examForm.durationMinutes}
                        onChange={(e) => setExamForm(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 40 }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">Số lượt thi tối đa</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={examForm.allowedAttempts}
                        onChange={(e) => setExamForm(prev => ({ ...prev, allowedAttempts: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-red-50/40 dark:bg-red-950/10 border border-red-100/40 dark:border-red-900/10 rounded-xl space-y-2">
                    <span className="block text-[11px] font-black uppercase text-red-600">Cơ cấu câu hỏi (Tổng: {Number(examForm.easyCount) + Number(examForm.mediumCount) + Number(examForm.hardCount)} câu)</span>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 font-semibold text-[11px] mb-0.5">Dễ (Easy)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={examForm.easyCount}
                          onChange={(e) => setExamForm(prev => ({ ...prev, easyCount: parseInt(e.target.value) || 0 }))}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 font-semibold text-[11px] mb-0.5">Vừa (Medium)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={examForm.mediumCount}
                          onChange={(e) => setExamForm(prev => ({ ...prev, mediumCount: parseInt(e.target.value) || 0 }))}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 font-semibold text-[11px] mb-0.5">Khó (Hard)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={examForm.hardCount}
                          onChange={(e) => setExamForm(prev => ({ ...prev, hardCount: parseInt(e.target.value) || 0 }))}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 py-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examForm.shuffleQuestions}
                        onChange={(e) => setExamForm(prev => ({ ...prev, shuffleQuestions: e.target.checked }))}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Xáo trộn câu hỏi cho từng thí sinh</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examForm.shuffleOptions}
                        onChange={(e) => setExamForm(prev => ({ ...prev, shuffleOptions: e.target.checked }))}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Xáo trộn vị trí đáp án (A, B, C, D)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examForm.isActive}
                        onChange={(e) => setExamForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs font-black text-emerald-600">Mở kỳ thi ngay sau khi lưu</span>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md text-xs"
                    >
                      {editingExam ? "Cập nhật" : "Lưu kỳ thi"}
                    </button>
                    {editingExam && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExam(null);
                          setExamForm({
                            title: "",
                            durationMinutes: 40,
                            easyCount: 20,
                            mediumCount: 20,
                            hardCount: 10,
                            isActive: false,
                            allowedAttempts: 1,
                            shuffleQuestions: true,
                            shuffleOptions: true
                          });
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-bold text-xs"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right: Exams List & Monitoring */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Section 1: Exams List */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 font-serif">
                    <span className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-red-600" /> Danh sách Kỳ thi ({db.examsList?.length || 0})
                    </span>
                  </h4>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                    {(db.examsList || []).map((exam: any) => (
                      <div key={exam.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{exam.title}</h5>
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                              exam.isActive 
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" 
                                : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                            }`}>
                              {exam.isActive ? "Đang mở" : "Đang đóng"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-xs mt-1 font-mono">
                            <span>⏱️ {exam.durationMinutes} phút</span>
                            <span>🎯 Cấu hình: {exam.easyCount}D - {exam.mediumCount}TB - {exam.hardCount}K</span>
                            <span>🔄 Lượt thi: {exam.allowedAttempts}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                          <button
                            onClick={() => handleToggleExamActive(exam)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${
                              exam.isActive
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                            title="Bật/Tắt kỳ thi"
                          >
                            {exam.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {exam.isActive ? "Đóng" : "Mở"}
                          </button>

                          <button
                            onClick={() => {
                              setEditingExam(exam);
                              setExamForm({
                                title: exam.title,
                                durationMinutes: exam.durationMinutes,
                                easyCount: exam.easyCount,
                                mediumCount: exam.mediumCount,
                                hardCount: exam.hardCount,
                                isActive: exam.isActive,
                                allowedAttempts: exam.allowedAttempts || 1,
                                shuffleQuestions: exam.shuffleQuestions !== false,
                                shuffleOptions: exam.shuffleOptions !== false
                              });
                            }}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 rounded-lg text-xs font-bold"
                            title="Sửa cấu hình"
                          >
                            Sửa
                          </button>

                          <button
                            onClick={() => {
                              setEditingExam(null);
                              setExamForm({
                                title: `${exam.title} - Bản sao`,
                                durationMinutes: exam.durationMinutes,
                                easyCount: exam.easyCount,
                                mediumCount: exam.mediumCount,
                                hardCount: exam.hardCount,
                                isActive: false,
                                allowedAttempts: exam.allowedAttempts || 1,
                                shuffleQuestions: exam.shuffleQuestions !== false,
                                shuffleOptions: exam.shuffleOptions !== false
                              });
                              alert(`Đã sao chép cấu hình từ kỳ thi "${exam.title}"!`);
                            }}
                            className="px-2.5 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 dark:bg-yellow-950/20 rounded-lg text-xs font-bold flex items-center gap-1"
                            title="Sao chép cấu hình kỳ thi sang tiêu chí mới"
                          >
                            <Copy className="w-3.5 h-3.5" /> Sao chép
                          </button>

                          {exam.id !== "exam_1" && (
                            <button
                              onClick={() => handleDeleteExam(exam.id, exam.title)}
                              className="px-2 py-1 bg-red-100/50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 rounded-lg text-xs font-bold"
                              title="Xóa kỳ thi"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Real-time Exam Takers Monitor */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 font-serif">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                      Giám Sát Thí Sinh Thi Trực Tuyến (Thời gian thực)
                    </span>
                    <span className="text-xs font-black bg-red-50 text-red-600 px-2.5 py-1 rounded-full dark:bg-red-950/30">
                      Đang thi: {activeTakers.length} đồng chí
                    </span>
                  </h4>

                  {activeTakers.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs sm:text-sm font-medium">
                      Hiện tại không có thí sinh nào đang thực hiện bài thi trực tuyến.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-2">Họ & Tên</th>
                            <th className="py-2">Đơn vị / Chi bộ</th>
                            <th className="py-2">Loại thi</th>
                            <th className="py-2">Thời gian bắt đầu</th>
                            <th className="py-2 text-right">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                          {activeTakers.map((taker: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/55 dark:hover:bg-slate-950/20 transition-colors">
                              <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{taker.name}</td>
                              <td className="py-2.5 text-slate-500 dark:text-slate-400">
                                {taker.department} {taker.chiBo ? `(${taker.chiBo})` : ""}
                              </td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  taker.examType === "official"
                                    ? "bg-red-50 text-red-600 dark:bg-red-950/30"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                }`}>
                                  {taker.examType === "official" ? "Chính thức" : "Thi thử"}
                                </span>
                              </td>
                              <td className="py-2.5 font-mono text-slate-400">
                                {new Date(taker.startTime).toLocaleTimeString("vi-VN")}
                              </td>
                              <td className="py-2.5 text-right">
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                  Kết nối tốt
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Tab: Documents Management */}
        {activeTab === 'docs' && (
          <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">Quản lý Kho Văn kiện & Bài giảng</h4>
                <p className="text-[11px] text-slate-400 font-medium">Hỗ trợ các loại tệp PDF, Word, PowerPoint, Excel, Video, Audio</p>
              </div>
              <div className="flex gap-2">
                <label className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-red-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                  <Upload className="w-4 h-4" /> Nhập Excel
                  <input type="file" accept=".xlsx, .xls" onChange={handleImportDocsExcel} className="hidden" />
                </label>
                <button
                  onClick={() => {
                    setEditingDoc(null);
                    setDocForm({ title: "", description: "", format: "pdf", category: "Tài liệu ôn thi", url: "#", publisher: "Ban Tổ chức", issueDate: new Date().toISOString().split("T")[0], author: "Ban Tổ chức", coverImage: "", isHidden: false });
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 focus:outline-none"
                >
                  <Plus className="w-4 h-4" /> Thêm tài liệu
                </button>
              </div>
            </div>

            {docImportReport && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                <h5 className="font-bold text-red-600 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Báo cáo nạp tài liệu từ Excel
                </h5>
                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">Tổng dòng</span>
                    <span className="text-sm font-bold">{docImportReport.total}</span>
                  </div>
                  <div>
                    <span className="text-emerald-500 text-[10px] block font-sans">Thành công</span>
                    <span className="text-sm font-bold text-emerald-500">{docImportReport.success}</span>
                  </div>
                  <div>
                    <span className="text-red-500 text-[10px] block font-sans">Lỗi bỏ qua</span>
                    <span className="text-sm font-bold text-red-500">{docImportReport.errors.length}</span>
                  </div>
                </div>
                {docImportReport.errors.length > 0 && (
                  <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40">
                    <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Tìm thấy lỗi định dạng ở {docImportReport.errors.length} dòng.</span>
                    <button onClick={downloadDocImportErrorReport} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 flex items-center gap-1">
                      <Download className="w-3 h-3" /> Tải báo cáo lỗi
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSaveDoc} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-100 dark:border-slate-800">
              <div className="col-span-full font-bold text-red-600 uppercase">
                {editingDoc ? "SỬA CHI TIẾT TÀI LIỆU" : "ĐĂNG TÀI LIỆU MỚI"}
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tiêu đề tài liệu</label>
                <input
                  type="text"
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Định dạng file</label>
                <select
                  value={docForm.format}
                  onChange={(e) => setDocForm({ ...docForm, format: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                >
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="doc">Word (.docx)</option>
                  <option value="ppt">PowerPoint (.pptx)</option>
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="video">Video (.mp4)</option>
                  <option value="audio">Audio (.mp3)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Danh mục ôn thi</label>
                <select
                  value={docForm.category}
                  onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                >
                  <option value="Văn kiện Đảng">Văn kiện Đảng</option>
                  <option value="Hướng dẫn nghiệp vụ">Hướng dẫn nghiệp vụ</option>
                  <option value="Tài liệu ôn thi">Tài liệu ôn thi</option>
                  <option value="Bài giảng Video">Bài giảng Video</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={docForm.description}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                  placeholder="Nhập nội dung tóm tắt tài liệu..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đơn vị phát hành</label>
                <input
                  type="text"
                  value={docForm.publisher}
                  onChange={(e) => setDocForm({ ...docForm, publisher: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày ban hành</label>
                <input
                  type="date"
                  value={docForm.issueDate}
                  onChange={(e) => setDocForm({ ...docForm, issueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đường dẫn tệp (URL / Drive / Video)</label>
                <input
                  type="text"
                  value={docForm.url}
                  onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đường dẫn bìa minh họa (Bỏ trống = Mặc định)</label>
                <input
                  type="text"
                  value={docForm.coverImage}
                  onChange={(e) => setDocForm({ ...docForm, coverImage: e.target.value })}
                  placeholder="URL ảnh bìa..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isHidden"
                  checked={docForm.isHidden}
                  onChange={(e) => setDocForm({ ...docForm, isHidden: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                />
                <label htmlFor="isHidden" className="text-xs font-bold text-slate-600 dark:text-slate-400">Ẩn tài liệu với thí sinh</label>
              </div>
              <div className="col-span-full flex gap-2 justify-end">
                {editingDoc && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDoc(null);
                      setDocForm({ title: "", description: "", format: "pdf", category: "Tài liệu ôn thi", url: "#", publisher: "Ban Tổ chức", issueDate: new Date().toISOString().split("T")[0], author: "Ban Tổ chức", coverImage: "", isHidden: false });
                    }}
                    className="px-4 py-1.5 bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                >
                  {editingDoc ? "Cập nhật tài liệu" : "Đăng tài liệu"}
                </button>
              </div>
            </form>

            {/* List documents */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {db.documents.map((d) => (
                <div key={d.id} className={`p-4 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${
                  d.isHidden ? "bg-stone-50/50 dark:bg-stone-950/20 opacity-60 border-dashed border-stone-200 dark:border-stone-800" : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-850 hover:bg-slate-50/30"
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-lg shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{d.title}</p>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">{d.format}</span>
                        {d.isHidden && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded text-[9px] font-black">Đang Ẩn</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{d.description || "Không có mô tả chi tiết."}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">
                        Danh mục: {d.category} | Ban hành: {d.publisher} ({d.issueDate || "2026"}) | Đăng bởi: {d.author || "Admin"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0 w-full md:w-auto justify-end">
                    <button
                      onClick={async () => {
                        const updated = db.documents.map(doc => doc.id === d.id ? { ...doc, isHidden: !doc.isHidden } : doc);
                        await handleSaveSettings({ documents: updated });
                        addLog(currentUser?.fullName || "Admin", `${d.isHidden ? 'Hiển thị' : 'Ẩn'} tài liệu: ${d.title}`);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded dark:bg-slate-800 dark:text-slate-300"
                      title={d.isHidden ? "Hiển thị" : "Ẩn"}
                    >
                      {d.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDoc(d);
                        setDocForm({
                          title: d.title,
                          description: d.description || "",
                          format: d.format,
                          category: d.category,
                          url: d.url,
                          publisher: d.publisher || "Ban Tổ chức",
                          issueDate: d.issueDate || new Date().toISOString().split("T")[0],
                          author: d.author || "Admin",
                          coverImage: d.coverImage || "",
                          isHidden: d.isHidden || false
                        });
                      }}
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded dark:bg-blue-950/20 dark:text-blue-300"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(d.id)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded dark:bg-red-950/20 dark:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Departments Management */}
        {activeTab === 'departments' && (
          <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">Quản lý Đơn vị & Chi bộ</h4>
                <p className="text-[11px] text-slate-400 font-medium">Khai báo cấu trúc biên chế của Trung đoàn 1</p>
              </div>
              <button
                onClick={() => {
                  setEditingDept(null);
                  setDeptForm({ name: "", battalion: "Tiểu đoàn 1", company: "" });
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 focus:outline-none"
              >
                <Plus className="w-4 h-4" /> Thêm đơn vị
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-100 dark:border-slate-800">
              <div className="col-span-full font-bold text-red-600 uppercase">
                {editingDept ? "SỬA ĐƠN VỊ CHÍNH" : "THÊM ĐƠN VỊ / CHI BỘ"}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Khối Tiểu đoàn / Trực thuộc</label>
                <select
                  value={deptForm.battalion}
                  onChange={(e) => setDeptForm({ ...deptForm, battalion: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                >
                  <option value="Tiểu đoàn 1">Tiểu đoàn 1</option>
                  <option value="Tiểu đoàn 2">Tiểu đoàn 2</option>
                  <option value="Tiểu đoàn 3">Tiểu đoàn 3</option>
                  <option value="Khối Cơ quan Trung đoàn">Khối Cơ quan Trung đoàn</option>
                  <option value="Các Đại đội trực thuộc">Các Đại đội trực thuộc</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đại đội / Chi bộ (Ví dụ: Đại đội 1)</label>
                <input
                  type="text"
                  value={deptForm.company}
                  onChange={(e) => setDeptForm({ ...deptForm, company: e.target.value })}
                  placeholder="Nhập tên đại đội/ban..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tên hiển thị đầy đủ (Hệ thống tự động đồng bộ)</label>
                <input
                  type="text"
                  value={deptForm.company ? `${deptForm.company}, ${deptForm.battalion}` : deptForm.name}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 text-xs font-mono"
                />
              </div>
              <div className="col-span-full flex gap-2 justify-end">
                {editingDept && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDept(null);
                      setDeptForm({ name: "", battalion: "Tiểu đoàn 1", company: "" });
                    }}
                    className="px-4 py-1.5 bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                >
                  {editingDept ? "Cập nhật" : "Khai báo"}
                </button>
              </div>
            </form>

            <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3">Tên Đơn vị chi tiết</th>
                    <th className="p-3">Khối quản lý</th>
                    <th className="p-3">Tên rút gọn</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {db.departments && db.departments.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 font-medium">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{d.name}</td>
                      <td className="p-3 text-slate-500">{d.battalion || "Trực thuộc"}</td>
                      <td className="p-3 text-slate-400 font-mono text-[10px]">{d.company || d.id}</td>
                      <td className="p-3 text-right flex gap-1.5 justify-end">
                        <button
                          onClick={() => {
                            setEditingDept(d);
                            setDeptForm({ name: d.name, battalion: d.battalion || "Tiểu đoàn 1", company: d.company || "" });
                          }}
                          className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded dark:bg-blue-950/20 dark:text-blue-300"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(d.id)}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded dark:bg-red-950/20 dark:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Candidates Results Management */}
        {activeTab === 'results' && (
          <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-xs sm:text-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">Quản lý Kết quả Kiểm tra của Thí sinh</h4>
                <p className="text-[11px] text-slate-400 font-medium">Tổng số lượt thi đã nộp bài chính thức & thi thử</p>
              </div>
              <button
                onClick={() => handleExportAllResultsExcel(sortedResults)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" /> Xuất Excel Kết quả
              </button>
            </div>

            {/* Filter and Search rail */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Tìm họ tên, email..."
                  value={resultSearch}
                  onChange={(e) => { setResultSearch(e.target.value); setResultPage(1); }}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <select
                  value={resultDeptFilter}
                  onChange={(e) => { setResultDeptFilter(e.target.value); setResultPage(1); }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Tất cả Đơn vị --</option>
                  {Array.from(new Set(db.examResults.map(r => r.userDepartment))).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={resultTypeFilter}
                  onChange={(e) => { setResultTypeFilter(e.target.value); setResultPage(1); }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                >
                  <option value="all">-- Tất cả Hình thức --</option>
                  <option value="official">Thi chính thức (Thi thật)</option>
                  <option value="practice">Luyện tập tự do (Thi thử)</option>
                </select>
              </div>

              <div>
                <select
                  value={resultScoreFilter}
                  onChange={(e) => { setResultScoreFilter(e.target.value); setResultPage(1); }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                >
                  <option value="all">-- Tất cả Điểm số --</option>
                  <option value="excellent">Xuất sắc (Từ 8.0 trở lên)</option>
                  <option value="good">Khá (Từ 6.5 đến 7.9)</option>
                  <option value="average">Trung bình (Từ 5.0 đến 6.4)</option>
                  <option value="fail">Chưa đạt (Dưới 5.0)</option>
                </select>
              </div>

              <div>
                <select
                  value={resultSort}
                  onChange={(e) => { setResultSort(e.target.value); setResultPage(1); }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                >
                  <option value="score_desc">Điểm thi: Cao xuống thấp</option>
                  <option value="score_asc">Điểm thi: Thấp lên cao</option>
                  <option value="duration_asc">Thời gian làm: Nhanh nhất</option>
                  <option value="duration_desc">Thời gian làm: Chậm nhất</option>
                </select>
              </div>
            </div>

            {/* Table block */}
            <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3 text-center">STT</th>
                    <th className="p-3">Họ và tên / Đơn vị</th>
                    <th className="p-3">Email / Số điện thoại</th>
                    <th className="p-3 text-center">Thời gian</th>
                    <th className="p-3 text-center">Đúng/Sai</th>
                    <th className="p-3 text-center">Điểm số</th>
                    <th className="p-3 text-center">Xếp hạng</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {sortedResults.slice((resultPage - 1) * 8, resultPage * 8).map((r, idx) => {
                    const stt = (resultPage - 1) * 8 + idx + 1;
                    const isPassed = r.score >= 5.0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 font-semibold text-slate-700 dark:text-slate-300">
                        <td className="p-3 text-center font-mono font-bold text-slate-400">{stt}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{r.userName}</span>
                            {r.type === "official" ? (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-extrabold uppercase tracking-wider scale-95 origin-left shrink-0">THI THẬT</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded text-[9px] font-extrabold uppercase tracking-wider scale-95 origin-left shrink-0">THI THỬ</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{r.userDepartment} {r.userChiBo ? `| ${r.userChiBo}` : ''}</p>
                        </td>
                        <td className="p-3 font-mono">
                          <p>{r.userEmail}</p>
                          <p className="text-[10px] text-slate-400">{r.userPhone || "Chưa cập nhật SĐT"}</p>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <div className="font-bold text-slate-700 dark:text-slate-200">
                            {Math.floor(r.durationSeconds / 60)}p {r.durationSeconds % 60}s
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5" title="Thời điểm nộp bài">
                            {new Date(r.date).toLocaleString("vi-VN")}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="text-emerald-500 font-bold">{r.correctCount}</span>
                          <span className="text-slate-300 px-1">/</span>
                          <span className="text-red-500 font-bold">{r.wrongCount}</span>
                        </td>
                        <td className="p-3 text-center font-black font-mono text-sm text-red-600 dark:text-red-400">
                          {r.score.toFixed(1)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400 rounded-full font-mono font-black text-[10px] border border-yellow-100 dark:border-yellow-900/40">
                            Hạng {getRank(r.id)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {isPassed ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">Đạt</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-950/10 dark:text-red-400 rounded-full text-[10px] font-black uppercase tracking-wider">Chưa đạt</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedResult(r)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[10px] font-black uppercase tracking-wider dark:bg-red-950/30 dark:text-red-400"
                          >
                            Xem bài làm
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50 dark:border-slate-850">
              <span className="text-[11px] text-slate-400 font-medium">Hiển thị {Math.min(sortedResults.length, 8)} / {sortedResults.length} kết quả</span>
              <div className="flex gap-2">
                <button
                  disabled={resultPage === 1}
                  onClick={() => setResultPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  disabled={resultPage * 8 >= sortedResults.length}
                  onClick={() => setResultPage(prev => prev + 1)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Báo cáo thống kê (Reports) */}
        {activeTab === 'reports' && (
          <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-xs sm:text-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif border-b pb-2">Báo cáo Thống kê Toàn cục</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black">Điểm cao nhất</span>
                <span className="text-2xl font-black block text-red-600 font-mono mt-1">
                  {db.examResults.length > 0 ? Math.max(...db.examResults.map(r => r.score)).toFixed(1) : "0.0"}/10
                </span>
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black">Điểm thấp nhất</span>
                <span className="text-2xl font-black block text-emerald-600 font-mono mt-1">
                  {db.examResults.length > 0 ? Math.min(...db.examResults.map(r => r.score)).toFixed(1) : "0.0"}/10
                </span>
              </div>
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black">Tổng số câu hỏi</span>
                <span className="text-2xl font-black block text-amber-500 font-mono mt-1">{db.questions.length} câu</span>
              </div>
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black">Tổng số tài liệu ôn tập</span>
                <span className="text-2xl font-black block text-blue-500 font-mono mt-1">{db.documents.length} tập</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850">
              <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase mb-3 tracking-wider">Phân tích Phổ điểm</h5>
              <div className="space-y-3">
                {[
                  { label: "Xuất sắc (Điểm 8.0 - 10.0)", color: "bg-red-600", count: db.examResults.filter(r => r.score >= 8.0).length },
                  { label: "Khá (Điểm 6.5 - 7.9)", color: "bg-yellow-500", count: db.examResults.filter(r => r.score >= 6.5 && r.score < 8.0).length },
                  { label: "Trung bình (Điểm 5.0 - 6.4)", color: "bg-blue-500", count: db.examResults.filter(r => r.score >= 5.0 && r.score < 6.5).length },
                  { label: "Chưa đạt (Điểm dưới 5.0)", color: "bg-slate-400", count: db.examResults.filter(r => r.score < 5.0).length }
                ].map((item, idx) => {
                  const pct = db.examResults.length > 0 ? (item.count / db.examResults.length) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{item.label}</span>
                        <span className="font-mono">{item.count} lượt ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className={`${item.color} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: System logs */}
        {activeTab === 'logs' && (
          <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-xs sm:text-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif border-b pb-2">Nhật ký Hoạt động Hệ thống</h4>
            
            <div className="space-y-2.5 max-h-[450px] overflow-y-auto font-mono pr-1 text-[11px] sm:text-xs">
              {systemLogs.map((l) => (
                <div key={l.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl flex justify-between items-start md:items-center gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold shrink-0">[{l.date ? `${l.date} ` : ""}{l.time}]</span>
                    <div>
                      <span className="text-slate-800 dark:text-slate-200 font-black">{l.user}:</span>{" "}
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{l.action}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded text-[9px] shrink-0">IP: {l.ip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Cấu hình Hệ thống (Settings) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-xs sm:text-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif border-b pb-2">Cấu hình Hội thi & Hệ thống</h4>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleSaveSettings({ settings: settingsForm });
              addLog(currentUser?.fullName || "Admin", `Thay đổi cấu hình hội thi: ${settingsForm.contestName}`);
              alert("Lưu thông số hệ thống thành công!");
            }} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tên Hội thi chính thức</label>
                <input
                  type="text"
                  value={settingsForm.contestName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, contestName: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Thời hạn đếm ngược (Countdown Target Date)</label>
                <input
                  type="date"
                  value={settingsForm.countdownDate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, countdownDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mã màu chủ đạo (Theme Preset)</label>
                <select
                  value={settingsForm.theme}
                  onChange={(e) => setSettingsForm({ ...settingsForm, theme: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-xs font-semibold"
                >
                  <option value="patriotic">Hồng kỳ Sophisticated (Mặc định)</option>
                  <option value="dark">Sophisticated Dark (Đỏ sậm vàng đồng)</option>
                  <option value="emerald">Quân cảnh Emerald (Xanh rêu)</option>
                </select>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs uppercase tracking-wider"
                >
                  Lưu thiết lập hệ thống
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* RESULT CANDIDATE LOG DETAILS POPUP MODAL */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative">
            
            {/* Modal close */}
            <button
              onClick={() => setSelectedResult(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full font-black text-xs text-slate-500"
            >
              Đóng
            </button>

            {/* Print Friendly Card wrapper */}
            <div id="print-result-card" className="space-y-6">
              {/* Military Title and Emblem Header */}
              <div className="text-center space-y-1.5 border-b pb-4 border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">ĐẢNG CỘNG SẢN VIỆT NAM QUANG VINH MUÔN NĂM</p>
                <h3 className="font-serif font-black text-slate-800 dark:text-slate-100 text-base md:text-lg">KẾT QUẢ BÀI THI CÁ NHÂN</h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase">Hội thi Bí thư Chi bộ giỏi 2026 - TRUNG ĐOÀN 1</p>
              </div>

              {/* Personal details info panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850">
                <div className="space-y-2">
                  <p className="text-xs"><strong>Họ và tên thí sinh:</strong> <span className="font-bold text-slate-900 dark:text-white">{selectedResult.userName}</span></p>
                  <p className="text-xs"><strong>Đơn vị:</strong> <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedResult.userDepartment}</span></p>
                  <p className="text-xs"><strong>Thuộc chi bộ:</strong> <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedResult.userChiBo || "Chưa cập nhật chi bộ"}</span></p>
                  <p className="text-xs"><strong>Chức vụ:</strong> <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedResult.userTitle || "Bí thư Chi bộ"}</span></p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs"><strong>Email liên hệ:</strong> <span className="font-mono text-slate-600 dark:text-slate-300">{selectedResult.userEmail}</span></p>
                  <p className="text-xs"><strong>Số điện thoại:</strong> <span className="font-mono text-slate-600 dark:text-slate-300">{selectedResult.userPhone || "Chưa cập nhật SĐT"}</span></p>
                  <p className="text-xs"><strong>Nộp bài lúc:</strong> <span className="font-semibold text-slate-500">{new Date(selectedResult.date).toLocaleString("vi-VN")}</span></p>
                  <p className="text-xs"><strong>Hình thức thi:</strong> <span className="font-bold text-red-600 uppercase text-[10px]">{selectedResult.type === "official" ? "Thi chính thức" : "Luyện tập tự do"}</span></p>
                </div>
              </div>

              {/* Statistical scoring panel */}
              <div className="grid grid-cols-3 gap-3 text-center py-4 bg-red-50/20 dark:bg-red-950/10 border border-red-150/20 dark:border-red-900/40 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Thời gian thi</span>
                  <span className="text-xl font-mono font-black block mt-1 text-slate-700 dark:text-slate-200">
                    {Math.floor(selectedResult.durationSeconds / 60)} phút {selectedResult.durationSeconds % 60} giây
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Số câu đúng</span>
                  <span className="text-xl font-mono font-black block mt-1 text-emerald-600">
                    {selectedResult.correctCount} câu
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Điểm đạt được</span>
                  <span className="text-2xl font-mono font-black block mt-1 text-red-600">
                    {selectedResult.score.toFixed(1)} / 10.0
                  </span>
                </div>
              </div>

              {/* Answers detailing block */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase border-b pb-1.5 tracking-wider">Chi tiết các câu trả lời</h4>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {(selectedResult.questions && selectedResult.questions.length > 0
                    ? selectedResult.questions
                    : (db.questions.filter(q => selectedResult.answers && q.id.toString() in selectedResult.answers).length > 0
                        ? db.questions.filter(q => selectedResult.answers && q.id.toString() in selectedResult.answers)
                        : db.questions.slice(0, 10))
                  ).map((q, idx) => {
                    const ansId = selectedResult.answers ? selectedResult.answers[q.id.toString()] : -1;
                    const isCorrect = ansId !== -1 && Number(ansId) === Number(q.correctAnswer);
                    return (
                      <div key={q.id} className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-start gap-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Câu {idx + 1}: {q.text}</span>
                          {ansId !== -1 ? (
                            isCorrect ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded text-[9px] font-black uppercase">Đúng</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 rounded text-[9px] font-black uppercase">Sai</span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase">Không chọn</span>
                          )}
                        </div>

                        <div className="pl-2 space-y-1">
                          <p className={`text-[11px] ${isCorrect ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                            - Lựa chọn thí sinh: <strong>{ansId !== -1 ? String.fromCharCode(65 + Number(ansId)) : "Chưa trả lời"}</strong> ({ansId !== -1 ? q.options[Number(ansId)] : ""})
                          </p>
                          {!isCorrect && (
                            <p className="text-[11px] text-emerald-600 font-bold">
                              - Đáp án chính xác: <strong>{String.fromCharCode(65 + Number(q.correctAnswer))}</strong> ({q.options[Number(q.correctAnswer)]})
                            </p>
                          )}
                        </div>

                        {q.explanation && (
                          <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded border dark:border-slate-850 mt-1">
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Print and Export commands */}
            <div className="flex flex-wrap gap-2.5 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => downloadCandidateExcel(selectedResult)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Xuất Excel cá nhân
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> In kết quả / Xuất PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
