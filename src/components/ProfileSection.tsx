import React, { useState } from "react";
import { User, Calendar, Award, Printer, ShieldCheck, Key, Lock, Eye, CheckCircle } from "lucide-react";
import { ExamResult } from "../types";

interface ProfileSectionProps {
  currentUser: any;
  results: ExamResult[];
  onRefreshDB: () => void;
}

export default function ProfileSection({ currentUser, results, onRefreshDB }: ProfileSectionProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [viewingCertificate, setViewingCertificate] = useState<ExamResult | null>(null);

  // Filter history for current user
  const userHistory = results.filter(r => r.userEmail === currentUser.email)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: "Mật khẩu xác nhận không trùng khớp!" });
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: "Đổi mật khẩu thành công!" });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onRefreshDB();
      } else {
        setMessage({ type: 'error', text: data.message || "Đổi mật khẩu thất bại!" });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Lỗi kết nối máy chủ!" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card & Change Password */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Info Card */}
          <div className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-6 rounded-2xl shadow-md text-center">
            <div className="relative inline-block mb-4">
              <img
                src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                alt={currentUser.fullName}
                className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-yellow-500 shadow-md"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-1 bg-yellow-500 text-red-950 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow border border-yellow-400">
                {currentUser.role}
              </span>
            </div>

            <h3 className="text-lg font-serif font-black text-stone-800 dark:text-yellow-100 mb-1">
              {currentUser.fullName}
            </h3>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-widest mb-4">
              {currentUser.title}
            </p>

            <div className="text-left space-y-3.5 border-t border-yellow-500/10 pt-4 text-xs sm:text-sm font-semibold text-stone-500 dark:text-yellow-100/40">
              <div className="flex justify-between">
                <span>Đơn vị:</span>
                <span className="text-stone-800 dark:text-yellow-200 font-bold text-right">{currentUser.department}</span>
              </div>
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="text-stone-800 dark:text-yellow-200 font-mono text-right">{currentUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span>Số điện thoại:</span>
                <span className="text-stone-800 dark:text-yellow-200 font-mono text-right">{currentUser.phone}</span>
              </div>
            </div>
          </div>

          {/* Change Password Panel */}
          <div className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-5 rounded-2xl shadow-md">
            <h4 className="text-sm font-serif font-bold text-stone-800 dark:text-yellow-400 mb-4 flex items-center gap-2 border-b border-yellow-500/10 pb-2.5">
              <Key className="w-4 h-4 text-yellow-500" />
              Đổi mật khẩu bảo mật
            </h4>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-bold mb-4 ${
                message.type === 'success'
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
                  : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-500/10"
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 dark:text-yellow-100/40 uppercase mb-1">Mật khẩu cũ</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white/40 dark:bg-black/25 border border-yellow-500/20 dark:border-yellow-500/15 rounded-xl focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500 text-stone-800 dark:text-yellow-100"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 dark:text-yellow-100/40 uppercase mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white/40 dark:bg-black/25 border border-yellow-500/20 dark:border-yellow-500/15 rounded-xl focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500 text-stone-800 dark:text-yellow-100"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 dark:text-yellow-100/40 uppercase mb-1">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white/40 dark:bg-black/25 border border-yellow-500/20 dark:border-yellow-500/15 rounded-xl focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500 text-stone-800 dark:text-yellow-100"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/50 text-yellow-600 dark:text-yellow-400 rounded-xl text-xs font-bold transition-all duration-300"
              >
                Cập nhật mật khẩu
              </button>
            </form>
          </div>
        </div>

        {/* Exam History Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-6 rounded-2xl shadow-md">
            <h4 className="text-sm font-serif font-bold text-stone-800 dark:text-yellow-400 mb-4 flex items-center gap-2 border-b border-yellow-500/10 pb-3">
              <Award className="w-5 h-5 text-yellow-500" />
              Lịch sử tham gia thi trực tuyến
            </h4>

            <div className="space-y-4">
              {userHistory.length > 0 ? (
                userHistory.map((history) => (
                  <div
                    key={history.id}
                    className="p-4 rounded-xl border border-yellow-500/10 dark:border-yellow-500/5 bg-white/40 dark:bg-black/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          history.type === "official"
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/25"
                            : "bg-stone-500/10 text-stone-600 dark:text-yellow-300/60 border border-yellow-500/10"
                        }`}>
                          {history.type === "official" ? "Thi chính thức" : "Thi thử ngẫu nhiên"}
                        </span>
                        <span className="text-[11px] text-stone-400 dark:text-yellow-100/40 font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(history.date).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      
                      <h5 className="text-sm font-bold text-stone-800 dark:text-yellow-100 mt-2 font-serif">
                        Kết quả đạt: {history.score} / 10 điểm
                      </h5>
                      <p className="text-xs text-stone-500 dark:text-yellow-100/60 mt-1 font-sans">
                        Thời gian làm bài: {Math.floor(history.durationSeconds / 60)} phút {history.durationSeconds % 60} giây | Đúng {history.correctCount}/50 câu
                      </p>
                    </div>

                    <div className="shrink-0 flex gap-2 w-full sm:w-auto">
                      {history.score >= 5.0 && (
                        <button
                          onClick={() => setViewingCertificate(history)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-yellow-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 focus:outline-none transition-all duration-300 shadow-md"
                        >
                          <Award className="w-4 h-4" /> Xem chứng nhận
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-stone-400 dark:text-yellow-100/30 italic text-sm">
                  Chưa ghi nhận lượt thi nào. Hãy bắt đầu ôn tập ở tab "Thi thử"!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GỢI Ý CHỨNG NHẬN DIGITAL CERTIFICATE VIEW / PRINT SCREEN */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 sm:p-10 relative border-8 border-yellow-500/50 bg-[radial-gradient(#fef08a_1px,transparent_1px)] [background-size:24px_24px] print:border-none print:shadow-none print:rounded-none">
            
            {/* Close Button on print ignore */}
            <button
              onClick={() => setViewingCertificate(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center justify-center focus:outline-none transition-colors print:hidden"
            >
              ✕
            </button>

            {/* Print action bar */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 print:hidden">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-red-600">
                <ShieldCheck className="w-5 h-5" /> Chứng nhận điện tử hợp lệ
              </span>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 focus:outline-none transition-colors shadow-md"
              >
                <Printer className="w-4 h-4" /> In chứng nhận
              </button>
            </div>

            {/* Certificate Template Card to Print */}
            <div className="border-4 border-double border-red-700 p-8 text-center bg-white/95 relative overflow-hidden rounded-lg">
              {/* Star watermarks */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none text-[300px] text-red-600 font-black">
                ★
              </div>

              <span className="text-5xl block mb-2 filter drop-shadow">⭐</span>
              <h2 className="text-xs sm:text-sm font-bold text-red-700 uppercase tracking-widest mb-1">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </h2>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 underline uppercase mb-6">
                Độc lập - Tự do - Hạnh phúc
              </p>

              <h1 className="font-serif text-2xl sm:text-4xl font-black text-yellow-600 tracking-wider mb-2 uppercase">
                Giấy Chứng Nhận
              </h1>
              <p className="text-xs sm:text-sm italic text-slate-500 font-medium mb-8">
                Ban Tổ chức Hội thi Bí thư Chi bộ giỏi 2026 chứng nhận:
              </p>

              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-red-700 mb-2">
                Đồng chí: {viewingCertificate.userName}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                Chức vụ: Bí thư Chi bộ
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-6">
                Đơn vị: {viewingCertificate.userDepartment}
              </p>

              <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold mb-8">
                Đã hoàn thành xuất sắc bài kiểm tra trắc nghiệm lý thuyết trực tuyến của Hội thi <span className="font-black text-red-700">"BÍ THƯ CHI BỘ GIỎI 2026"</span> đạt số điểm tuyệt vời: <span className="font-black text-red-700 font-mono text-base">{viewingCertificate.score} / 10 điểm</span>, trả lời đúng <span className="font-black text-emerald-600">{viewingCertificate.correctCount}/50 câu hỏi</span> nghiệp vụ trong thời gian <span className="font-black">{Math.floor(viewingCertificate.durationSeconds / 60)} phút {viewingCertificate.durationSeconds % 60} giây</span>.
              </p>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 mt-12 text-xs font-bold text-slate-700">
                <div>
                  <p className="uppercase text-[10px] text-slate-400 mb-10">ỦY VIÊN BAN GIÁM KHẢO</p>
                  <p className="font-serif italic text-sm text-slate-800">Trần Quốc Việt</p>
                  <p className="text-[10px] text-slate-400 font-normal">Đã ký điện tử</p>
                </div>
                <div>
                  <p className="uppercase text-[10px] text-slate-400 mb-10">TRƯỞNG BAN TỔ CHỨC</p>
                  <p className="font-serif italic text-sm text-slate-800">Trịnh Xuân Hoàng</p>
                  <p className="text-[10px] text-slate-400 font-normal">Đã ký điện tử</p>
                </div>
              </div>

              {/* Secure stamp ID */}
              <div className="mt-8 text-[9px] text-slate-400 font-mono flex justify-between border-t border-slate-100 pt-4">
                <span>Mã số xác thực: BTC-{viewingCertificate.id}</span>
                <span>Ngày cấp: {new Date(viewingCertificate.date).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
