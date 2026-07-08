import { useState, useEffect, useRef } from "react";
import { Clock, CheckSquare, ChevronLeft, ChevronRight, HelpCircle, GraduationCap, AlertTriangle, PlayCircle, ClipboardList, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Question, ExamResult } from "../types";

interface ExamEngineProps {
  questions: Question[];
  examType: 'practice' | 'official';
  currentUser: any;
  onRefreshDB: () => void;
  isOfficialActive: boolean;
  hasTakenOfficial: boolean;
}

export default function ExamEngine({
  questions,
  examType,
  currentUser,
  onRefreshDB,
  isOfficialActive,
  hasTakenOfficial
}: ExamEngineProps) {
  const [examStarted, setExamStarted] = useState(false);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [examFinished, setExamFinished] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);

  // Multi-exam selection state
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [chosenExam, setChosenExam] = useState<any | null>(null);
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  // Warning overlays
  const [multiTabAlert, setMultiTabAlert] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available official exams and taken results
  useEffect(() => {
    if (examType === "official" && !examStarted && !examFinished) {
      setLoadingExams(true);
      fetch("/api/db?t=" + Date.now())
        .then(r => r.json())
        .then(data => {
          if (data.examsList) {
            const activeExams = data.examsList.filter((e: any) => e.isActive);
            setAvailableExams(activeExams);
            if (activeExams.length > 0) {
              setChosenExam(activeExams[0]);
            }
          }
          if (data.examResults) {
            setResultsList(data.examResults);
          }
        })
        .catch(err => console.error("Error loading exams database:", err))
        .finally(() => setLoadingExams(false));
    }
  }, [examType, examStarted, examFinished, isOfficialActive]);

  const getTakenAttempts = (examId: string) => {
    return resultsList.filter((r: any) => {
      const emailMatch = r.userEmail && currentUser?.email && r.userEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
      const examMatch = (r.examId === examId || (!r.examId && examId === "exam_1")) && r.type === "official";
      return emailMatch && examMatch;
    }).length;
  };

  // Send real-time heartbeat pings while taking exams
  useEffect(() => {
    if (!examStarted || !currentUser) return;

    const sendPing = async () => {
      try {
        await fetch("/api/exams/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: currentUser.email,
            name: currentUser.fullName,
            department: currentUser.department,
            chiBo: currentUser.chiBo || "",
            examType: chosenExam ? "official" : "practice"
          })
        });
      } catch (err) {
        console.error("Ping error:", err);
      }
    };

    sendPing();
    const interval = setInterval(sendPing, 4000);

    return () => {
      clearInterval(interval);
      fetch("/api/exams/end-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email })
      }).catch(err => console.error("End-ping error:", err));
    };
  }, [examStarted, currentUser, chosenExam]);

  // Reset exam status lock on component unmount
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent("exam_ended"));
    };
  }, []);

  // Load questions based on chosen exam configuration
  const handleStartExam = async () => {
    let url = "/api/questions/exam";
    let selectedMinutes = 40;
    
    if (examType === "official") {
      if (!chosenExam) {
        alert("Hiện tại chưa có kỳ thi chính thức nào được kích hoạt hoặc mở cổng!");
        return;
      }
      const attemptsUsed = getTakenAttempts(chosenExam.id);
      const allowedAttempts = Number(chosenExam.allowedAttempts || 1);
      if (attemptsUsed >= allowedAttempts) {
        alert(`Đồng chí đã đạt số lần thi tối đa cho kỳ thi này (Tối đa ${allowedAttempts} lượt)!`);
        return;
      }
      url = `/api/questions/exam?examId=${chosenExam.id}`;
      selectedMinutes = Number(chosenExam.durationMinutes || 40);
    }

    try {
      const res = await fetch(url);
      const qList = await res.json();
      if (!qList || qList.length === 0) {
        alert("⚠️ Hiện tại ngân hàng đề chưa có câu hỏi nào. Vui lòng quay lại sau hoặc liên hệ quản trị viên cập nhật câu hỏi!");
        return;
      }
      setExamQuestions(qList);
      
      // Auto-recover draft from local storage if exists
      const savedDraftKey = chosenExam ? `exam_draft_${currentUser.email}_${chosenExam.id}` : `exam_draft_practice_${currentUser.email}`;
      const savedAnswers = localStorage.getItem(savedDraftKey);
      if (savedAnswers) {
        try {
          const parsed = JSON.parse(savedAnswers);
          setAnswers(parsed);
        } catch (_) {
          setAnswers({});
        }
      } else {
        setAnswers({});
      }

      setCurrentIdx(0);
      setTimeLeft(selectedMinutes * 60);
      setExamStarted(true);
      setExamFinished(false);
      setExamResult(null);
      window.dispatchEvent(new CustomEvent("exam_started"));

      // Start Countdown Timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleForceSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Autosave answers draft every 5 seconds for safety
      autoSaveRef.current = setInterval(() => {
        const currentAnswersKey = chosenExam ? `exam_draft_${currentUser.email}_${chosenExam.id}` : `exam_draft_practice_${currentUser.email}`;
        localStorage.setItem(currentAnswersKey, JSON.stringify(answers));
      }, 5000);
    } catch (err) {
      console.error("Failed to load exam questions:", err);
    }
  };

  // Prevent F5/Page Reload
  useEffect(() => {
    if (examStarted && examType === "official") {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "CẢNH BÁO: Bài thi chính thức đang diễn ra! Tải lại trang (F5) có thể làm gián đoạn kết quả.";
        return e.returnValue;
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [examStarted, examType]);

  // Block Multiple Tabs via BroadcastChannel
  useEffect(() => {
    if (examStarted && examType === "official") {
      const channel = new BroadcastChannel("contest_bithu_broadcast_channel");
      
      // Let other tabs know we are here
      channel.postMessage({ type: "CHECK_TAB_DUPLICATION" });

      channel.onmessage = (e) => {
        if (e.data.type === "CHECK_TAB_DUPLICATION") {
          // Inform other tabs that a test is active
          channel.postMessage({ type: "TAB_DUPLICATE_FOUND" });
        } else if (e.data.type === "TAB_DUPLICATE_FOUND") {
          setMultiTabAlert(true);
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [examStarted, examType]);

  const handleSelectAnswer = (qId: number, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleForceSubmit = () => {
    executeSubmitExam(true);
  };

  const handleSubmitExam = () => {
    setShowSubmitConfirm(true);
  };

  const executeSubmitExam = async (isTimeUp = false) => {
    setShowSubmitConfirm(false);

    // Clean up timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);

    // Calculate score
    let correctCount = 0;
    examQuestions.forEach((q) => {
      if (answers[q.id] !== undefined && Number(answers[q.id]) === Number(q.correctAnswer)) {
        correctCount++;
      }
    });

    const wrongCount = examQuestions.length - correctCount;
    const finalScore = (correctCount / examQuestions.length) * 10;
    const maxDuration = chosenExam ? Number(chosenExam.durationMinutes || 40) : 40;
    const timeElapsed = (maxDuration * 60) - timeLeft;

    // Submit payload to Express Backend
    const payload = {
      userEmail: currentUser.email,
      userName: currentUser.fullName,
      userDepartment: currentUser.department,
      userChiBo: currentUser.chiBo || "",
      userPhone: currentUser.phone || "",
      userTitle: currentUser.title || "",
      score: finalScore,
      correctCount,
      wrongCount,
      durationSeconds: timeElapsed,
      type: examType,
      examId: examType === "official" && chosenExam ? chosenExam.id : undefined,
      answers: answers, // Store exact map of answer index selected for each question
      questions: examQuestions // Store the exact shuffled questions with shuffled options that the user completed!
    };

    try {
      const res = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setExamResult(data.result);
        setExamFinished(true);
        setExamStarted(false);
        window.dispatchEvent(new CustomEvent("exam_ended"));
        onRefreshDB();
        // Clear autosave draft
        const draftKey = chosenExam ? `exam_draft_${currentUser.email}_${chosenExam.id}` : `exam_draft_practice_${currentUser.email}`;
        localStorage.removeItem(draftKey);
      } else {
        alert(`Lỗi khi nộp bài: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Nộp bài thi thất bại. Vui lòng kiểm tra lại kết nối internet!");
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. NOT STARTED SCREEN */}
      {!examStarted && !examFinished && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white/75 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-8 rounded-2xl shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full mb-6 border border-yellow-500/25">
              <ClipboardList className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-serif font-black text-stone-800 dark:text-yellow-100 uppercase tracking-tight mb-1">
              {examType === "official" ? "Kỳ thi chính thức" : "Luyện tập thi thử ngẫu nhiên"}
            </h3>
            <p className="text-sm font-semibold text-stone-500 dark:text-yellow-100/40 mb-6">
              Hội thi Bí thư Chi bộ giỏi năm 2026
            </p>

            {/* If official exam, show multi-exam selection panel */}
            {examType === "official" ? (
              <div className="text-left space-y-4 mb-8">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách kỳ thi đang diễn ra</span>
                {loadingExams ? (
                  <div className="text-center py-6 text-xs text-stone-500 animate-pulse">Đang tải danh sách kỳ thi...</div>
                ) : availableExams.length === 0 ? (
                  <div className="p-5 text-center bg-yellow-500/5 border border-yellow-500/10 rounded-2xl text-xs sm:text-sm font-semibold text-stone-500 dark:text-yellow-400/60">
                    Hiện chưa có kỳ thi chính thức nào được kích hoạt hoặc mở cổng bởi Ban Tổ chức. Vui lòng quay lại sau!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableExams.map((exam) => {
                      const taken = getTakenAttempts(exam.id);
                      const allowed = Number(exam.allowedAttempts || 1);
                      const isMaxed = taken >= allowed;
                      const isSelected = chosenExam?.id === exam.id;

                      return (
                        <div
                          key={exam.id}
                          onClick={() => !isMaxed && setChosenExam(exam)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isSelected
                              ? "bg-yellow-500/10 border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.15)]"
                              : isMaxed
                              ? "bg-slate-100/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
                              : "bg-white/40 dark:bg-black/25 border-yellow-500/10 hover:border-yellow-500/30"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-bold text-sm text-stone-800 dark:text-yellow-100">{exam.title}</span>
                              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded text-[10px] font-bold">
                                {exam.durationMinutes} phút
                              </span>
                            </div>
                            <div className="text-xs text-stone-500 dark:text-yellow-100/40 font-medium">
                              Số câu hỏi: {exam.questionCount || 50} câu • Lượt thi đã thực hiện: <span className="font-bold text-stone-700 dark:text-yellow-300">{taken}/{allowed}</span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            {isMaxed ? (
                              <span className="px-3 py-1 bg-red-500/10 text-red-500 dark:text-red-400 rounded-lg text-xs font-bold border border-red-500/20">
                                Đạt giới hạn lượt
                              </span>
                            ) : isSelected ? (
                              <span className="px-3 py-1 bg-yellow-500 text-red-950 rounded-lg text-xs font-black uppercase tracking-wider">
                                Đang chọn
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg text-xs font-bold border border-yellow-500/20 hover:bg-yellow-500 hover:text-red-950 transition-colors">
                                Chọn kỳ thi
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {chosenExam && (
                  <div className="p-4 bg-yellow-500/5 dark:bg-yellow-500/2 border border-yellow-500/15 rounded-2xl space-y-2.5 text-xs sm:text-sm text-stone-600 dark:text-yellow-100/60 mt-4">
                    <div className="flex justify-between font-bold text-stone-700 dark:text-yellow-200 border-b border-yellow-500/10 pb-2">
                      <span>Kỳ thi đã chọn:</span>
                      <span>{chosenExam.title}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-b border-yellow-500/10 pb-2">
                      <span>Thời lượng làm bài:</span>
                      <span>{chosenExam.durationMinutes} phút</span>
                    </div>
                    <div className="flex justify-between font-semibold border-b border-yellow-500/10 pb-2">
                      <span>Số lần được phép thi:</span>
                      <span>{chosenExam.allowedAttempts || 1} lần</span>
                    </div>
                    <div className="text-yellow-600 dark:text-yellow-500 font-bold flex gap-2 pt-1 leading-snug">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Chú ý: Vui lòng tự tin với đường truyền Internet và sự yên tĩnh trước khi bắt đầu bài thi chính thức.</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-left bg-white/40 dark:bg-black/30 p-5 rounded-2xl mb-8 space-y-3.5 text-xs sm:text-sm font-semibold text-stone-600 dark:text-yellow-100/50 border border-yellow-500/10">
                <div className="flex justify-between border-b border-yellow-500/10 pb-2">
                  <span>Số lượng câu hỏi:</span>
                  <span className="text-stone-800 dark:text-yellow-200 font-bold">50 câu trắc nghiệm</span>
                </div>
                <div className="flex justify-between border-b border-yellow-500/10 pb-2">
                  <span>Thời gian làm bài:</span>
                  <span className="text-stone-800 dark:text-yellow-200 font-bold">40 phút (đếm ngược)</span>
                </div>
                <div className="flex justify-between border-b border-yellow-500/10 pb-2">
                  <span>Điều kiện nộp bài:</span>
                  <span className="text-stone-800 dark:text-yellow-200 font-bold">Tự động nộp khi hết giờ</span>
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold flex gap-2 pt-1">
                  <CheckSquare className="w-5 h-5 shrink-0 animate-pulse" />
                  <span>Thẻ thi thử cho phép luyện tập không giới hạn. Câu hỏi được xáo ngẫu nhiên kèm giải thích trực quan!</span>
                </div>
              </div>
            )}

            {examType === "official" && availableExams.length === 0 ? null : (
              <button
                onClick={handleStartExam}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-red-950 font-black text-sm uppercase rounded-2xl shadow-[0_0_15px_rgba(234,179,8,0.35)] transition-all duration-300 inline-flex items-center gap-2"
              >
                <PlayCircle className="w-5 h-5" /> Bắt đầu làm bài thi
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. ACTIVE EXAM TESTING ENGINE */}
      {examStarted && examQuestions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          
          {/* Question Details Area */}
          <div className="lg:col-span-8 space-y-4">
            {/* PROGRESS BAR & STATS COMPONENT */}
            <div className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-stone-700 dark:text-yellow-100">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  Tiến trình hoàn thành: <span className="text-emerald-600 dark:text-emerald-400">{Object.keys(answers).length} / {examQuestions.length} câu</span>
                </span>
                <span className="text-stone-500 dark:text-yellow-100/40">
                  {Math.round((Object.keys(answers).length / examQuestions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(Object.keys(answers).length / examQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-6 rounded-2xl shadow-md space-y-4">
              <div className="flex justify-between items-center border-b border-yellow-500/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 font-serif">
                  Câu hỏi {currentIdx + 1} / {examQuestions.length}
                </span>
                
                {examType === "official" && (
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-black tracking-wide border border-yellow-500/20 animate-pulse">
                    BẢO MẬT: ĐÃ BẬT TỰ ĐỘNG LƯU
                  </span>
                )}
              </div>

              {/* Question Text */}
              <h4 className="text-base font-serif font-bold text-stone-800 dark:text-yellow-100 leading-snug">
                {examQuestions[currentIdx].text}
              </h4>

              {/* Options selection */}
              <div className="space-y-2.5 pt-2">
                {examQuestions[currentIdx].options.map((option, idx) => {
                  const isSelected = answers[examQuestions[currentIdx].id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(examQuestions[currentIdx].id, idx)}
                      className={`w-full text-left p-4 rounded-xl border font-semibold text-xs sm:text-sm transition-all duration-200 focus:outline-none flex items-center gap-3 ${
                        isSelected
                          ? "bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:bg-yellow-500/20 dark:border-yellow-500 dark:text-yellow-400 shadow-sm font-bold"
                          : "bg-white/40 dark:bg-black/35 border-yellow-500/10 dark:border-yellow-500/10 text-stone-700 dark:text-yellow-100/70 hover:bg-yellow-500/10 hover:border-yellow-500/25"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                        isSelected ? "bg-yellow-500 text-red-950" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      }`}>
                        {idx === 0 ? "A" : idx === 1 ? "B" : idx === 2 ? "C" : "D"}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stepper buttons */}
            <div className="flex justify-between items-center bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-4 rounded-2xl shadow-md">
              <button
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/10 text-yellow-600 dark:text-yellow-400 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center gap-1 focus:outline-none"
              >
                <ChevronLeft className="w-4 h-4" /> Quay lại
              </button>

              <button
                onClick={handleSubmitExam}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-red-950 text-xs font-black uppercase tracking-wider rounded-xl focus:outline-none shadow-md"
              >
                Nộp bài thi
              </button>

              <button
                onClick={() => setCurrentIdx((prev) => Math.min(examQuestions.length - 1, prev + 1))}
                disabled={currentIdx === examQuestions.length - 1}
                className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/10 text-yellow-600 dark:text-yellow-400 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center gap-1 focus:outline-none"
              >
                Tiếp theo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Answer Sheet Grid side column */}
          <div className="lg:col-span-4 space-y-4">
            {/* Timer card */}
            <div className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-5 rounded-2xl shadow-md text-center">
              <span className="text-stone-400 dark:text-yellow-100/40 font-semibold text-xs sm:text-sm uppercase tracking-wider block mb-1">Thời gian còn lại</span>
              <span className={`text-4xl font-black font-mono tracking-wider ${timeLeft < 180 ? "text-yellow-500 animate-pulse" : "text-stone-800 dark:text-yellow-400"}`}>
                {formatTimer(timeLeft)}
              </span>
            </div>

            {/* Answer check squares */}
            <div className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-5 rounded-2xl shadow-md">
              <span className="text-xs font-bold text-stone-400 dark:text-yellow-100/40 uppercase block mb-3">Phiếu trả lời ({examQuestions.length} câu)</span>
              
              <div className="grid grid-cols-5 gap-2 text-center">
                {examQuestions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isActive = currentIdx === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-10 h-10 rounded-lg text-xs font-black flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-yellow-500 text-red-950 scale-110 shadow-md ring-2 ring-yellow-400"
                          : isAnswered
                          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-900/50"
                          : "bg-yellow-500/5 dark:bg-yellow-500/2 text-stone-500 dark:text-yellow-100/40 hover:bg-yellow-500/15 border border-yellow-500/10"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECURE BLOCK TAB TAKEOVER MODAL */}
          {multiTabAlert && (
            <div className="absolute inset-0 bg-black/90 z-50 backdrop-blur-md flex items-center justify-center p-6 text-center text-white">
              <div className="max-w-md bg-stone-900 border border-yellow-500/30 p-8 rounded-3xl space-y-4 shadow-2xl">
                <ShieldAlert className="w-14 h-14 text-yellow-500 mx-auto animate-bounce" />
                <h3 className="text-lg font-black uppercase text-yellow-400">Phát hiện trùng lặp Tab thi!</h3>
                <p className="text-xs sm:text-sm text-stone-300">
                  Hệ thống kiểm tra an ninh phát hiện bạn đang mở nhiều hơn một cửa sổ làm bài thi chính thức. Mỗi thí sinh chỉ được mở duy nhất một tab trình duyệt để tránh việc sao chép hoặc rò rỉ đề thi.
                </p>
                <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-xs text-yellow-400 font-semibold leading-relaxed">
                  Vui lòng đóng ngay các cửa sổ thi khác của hội thi và tải lại tab hiện tại để tiếp tục làm bài thi chính thức.
                </div>
              </div>
            </div>
          )}

          {/* CUSTOM SUBMIT CONFIRMATION MODAL */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-slate-900 border border-yellow-500/30 p-6 rounded-2xl space-y-4 shadow-2xl text-white">
                <div className="flex items-center gap-3 border-b border-yellow-500/20 pb-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0" />
                  <h3 className="text-base font-black uppercase text-yellow-400">Xác nhận nộp bài thi</h3>
                </div>
                
                <p className="text-sm text-stone-300 leading-relaxed">
                  {examQuestions.length - Object.keys(answers).length > 0 ? (
                    <span>
                      Đồng chí còn <strong className="text-yellow-400 font-bold">{examQuestions.length - Object.keys(answers).length} câu hỏi chưa trả lời</strong>. Đồng chí có chắc chắn muốn nộp bài thi ngay bây giờ?
                    </span>
                  ) : (
                    <span>
                      Đồng chí đã hoàn thành tất cả câu hỏi. Đồng chí có chắc chắn muốn nộp bài thi ngay bây giờ?
                    </span>
                  )}
                </p>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-stone-300 hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => executeSubmitExam(false)}
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-red-950 rounded-xl text-xs font-black uppercase transition-all shadow-[0_0_15px_rgba(234,179,8,0.25)]"
                  >
                    Nộp bài ngay
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. POST EXAM RESULTS SCREEN */}
      {examFinished && examResult && (
        <div className="max-w-2xl mx-auto bg-white/75 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-8 rounded-2xl shadow-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full mb-6 border border-yellow-500/25">
            <GraduationCap className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-serif font-black text-stone-800 dark:text-yellow-100 uppercase tracking-tight mb-1">
            ĐÃ HOÀN THÀNH BÀI THI
          </h3>
          <p className="text-xs text-stone-400 dark:text-yellow-100/40 font-bold uppercase tracking-wider mb-6">
            {examType === "official" ? "Kỳ thi chính thức 2026" : "Bài ôn tập thi thử tự do"}
          </p>

          {/* Big Circular Score */}
          <div className="inline-flex flex-col items-center justify-center w-36 h-36 bg-yellow-500 text-red-950 rounded-full border-8 border-yellow-400 shadow-xl mb-8">
            <span className="text-4xl font-black font-mono filter drop-shadow-md">{examResult.score.toFixed(1)}</span>
            <span className="text-[10px] text-red-950 font-bold uppercase tracking-wider mt-0.5">Điểm thi</span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-8 bg-white/40 dark:bg-black/35 p-4 rounded-2xl border border-yellow-500/10">
            <div className="text-center">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block font-mono">{examResult.correctCount}/50</span>
              <span className="text-[10px] font-bold text-stone-400 dark:text-yellow-100/40 uppercase">Câu đúng</span>
            </div>
            <div className="text-center border-x border-yellow-500/10">
              <span className="text-lg font-black text-yellow-600 dark:text-yellow-500 block font-mono">{examResult.wrongCount}/50</span>
              <span className="text-[10px] font-bold text-stone-400 dark:text-yellow-100/40 uppercase">Câu sai</span>
            </div>
            <div className="text-center">
              <span className="text-lg font-black text-stone-700 dark:text-yellow-100 block font-mono">
                {Math.floor(examResult.durationSeconds / 60)}m {examResult.durationSeconds % 60}s
              </span>
              <span className="text-[10px] font-bold text-stone-400 dark:text-yellow-100/40 uppercase">Thời gian</span>
            </div>
          </div>

          {/* Certification eligibility reminder */}
          {examResult.score >= 5.0 ? (
            <div className="p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 rounded-2xl border border-emerald-500/10 font-semibold mb-8 text-xs sm:text-sm">
              Chúc mừng đồng chí! Bài thi đạt yêu cầu nghiệp vụ cấp cơ sở. Đồng chí có thể truy cập thẻ <span className="font-bold">"Cá nhân"</span> để xem và tải về chứng nhận danh giá.
            </div>
          ) : (
            <div className="p-4 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 rounded-2xl border border-yellow-500/10 font-semibold mb-8 text-xs sm:text-sm">
              Đồng chí chưa đạt yêu cầu kiểm tra lý thuyết (Dưới 5.0 điểm). Hãy tiếp tục tham gia ôn luyện lý thuyết qua tab "Tài liệu" và "Thi thử" để củng cố kỹ năng.
            </div>
          )}

          <div className="flex gap-4 justify-center">
            {examType === "practice" && (
              <button
                onClick={handleStartExam}
                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-red-950 rounded-xl text-xs font-black uppercase transition-all duration-300 shadow-md"
              >
                Thi thử tiếp tục
              </button>
            )}
            <button
              onClick={() => {
                setExamFinished(false);
                setExamStarted(false);
                setExamResult(null);
              }}
              className="px-6 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-600 dark:text-yellow-400 border border-yellow-500/10 rounded-xl text-xs font-black uppercase transition-all duration-300"
            >
              Quay lại trang chính
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
