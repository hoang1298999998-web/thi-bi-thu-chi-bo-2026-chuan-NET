import { useState } from "react";
import { Award, Trophy, Filter, Target, ShieldCheck, Clock, CheckCircle, Calendar } from "lucide-react";
import { ExamResult, Department } from "../types";

interface LeaderboardProps {
  results: ExamResult[];
  departments?: Department[];
}

export default function Leaderboard({ results, departments = [] }: LeaderboardProps) {
  const [filterType, setFilterType] = useState<'all' | 'battalion' | 'company'>('all');
  const [filterValue, setFilterValue] = useState("Tất cả");
  const [examTypeFilter, setExamTypeFilter] = useState<'official' | 'practice' | 'all'>('official');

  // Filter results by selected exam type (Official, Practice, or All)
  const baseResults = results.filter(r => {
    if (examTypeFilter === 'all') return true;
    return r.type === examTypeFilter;
  });

  // Extract unique companies and battalions dynamically from both results AND registered departments
  const dynamicBattalions = Array.from(new Set([
    ...results.map(r => {
      const parts = r.userDepartment.split(",");
      if (parts.length > 1) return parts[1].trim();
      return "";
    }).filter(b => b !== ""),
    ...departments.map(d => d.battalion).filter(b => b)
  ]));

  const dynamicCompanies = Array.from(new Set([
    ...results.map(r => {
      const parts = r.userDepartment.split(",");
      return parts[0].trim();
    }).filter(c => c !== ""),
    ...departments.map(d => d.company).filter(c => c)
  ]));

  const battalions = ["Tất cả", ...new Set([...dynamicBattalions, "Tiểu đoàn 1", "Tiểu đoàn 2", "Tiểu đoàn 3"])];
  const companies = ["Tất cả", ...new Set([...dynamicCompanies, "Đại đội 1", "Đại đội 2", "Đại đội 3", "Đại đội 4"])];

  // Sort results by score (descending), then duration (ascending - faster is better!)
  const sortedResults = [...baseResults].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.durationSeconds - b.durationSeconds;
  });

  // Filter based on selected unit criteria
  const filteredResults = sortedResults.filter((r) => {
    if (filterType === "all" || filterValue === "Tất cả") return true;
    return r.userDepartment.includes(filterValue);
  });

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-yellow-500/10 border-2 border-amber-400 text-lg shadow-sm">
            🥇
          </div>
        );
      case 1:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-500/10 border-2 border-slate-300 text-lg shadow-sm">
            🥈
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/10 border-2 border-orange-300 text-lg shadow-sm">
            🥉
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold text-sm border border-slate-200 dark:border-slate-700">
            {index + 1}
          </div>
        );
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}p ${secs}s`;
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "---";
    try {
      const date = new Date(dateStr);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: HEADER & TITLE */}
      <div className="bg-gradient-to-r from-red-700 to-red-800 text-white p-6 rounded-2xl shadow-md border border-red-600/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
            <Trophy className="w-8 h-8 text-yellow-300 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight font-serif text-yellow-300">
              BẢNG XẾP HẠNG HỘI THI
            </h3>
          </div>
        </div>
      </div>

      {/* SECTION 2: CLEAN FILTER CONTROL PANEL (Rành mạch, không bị lộn xộn) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Filter className="w-4 h-4 text-red-600 dark:text-yellow-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Bộ lọc & Sắp xếp kết quả
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* FILTER A: EXAM MODE */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Chế độ thi tuyển:
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <button
                onClick={() => setExamTypeFilter('official')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                  examTypeFilter === 'official'
                    ? "bg-red-600 text-white shadow-sm font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-yellow-400"
                }`}
              >
                Thi chính thức
              </button>
              <button
                onClick={() => setExamTypeFilter('practice')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                  examTypeFilter === 'practice'
                    ? "bg-amber-500 text-stone-950 shadow-sm font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-yellow-400"
                }`}
              >
                Thi thử
              </button>
              <button
                onClick={() => setExamTypeFilter('all')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                  examTypeFilter === 'all'
                    ? "bg-slate-700 text-white shadow-sm font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-yellow-400"
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>

          {/* FILTER B: UNIT SELECTION */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Lọc theo đơn vị biên chế:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => { setFilterType('all'); setFilterValue('Tất cả'); }}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                  filterType === 'all'
                    ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                }`}
              >
                Toàn hội thi
              </button>

              <select
                value={filterType === 'battalion' ? filterValue : "Tất cả"}
                onChange={(e) => {
                  setFilterType('battalion');
                  setFilterValue(e.target.value);
                }}
                className={`px-2 py-2 rounded-xl text-xs font-bold border focus:outline-none transition-all cursor-pointer ${
                  filterType === 'battalion'
                    ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                }`}
              >
                <option value="Tất cả">Tiểu đoàn...</option>
                {battalions.filter(b => b !== "Tất cả").map(b => (
                  <option key={b} value={b} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{b}</option>
                ))}
              </select>

              <select
                value={filterType === 'company' ? filterValue : "Tất cả"}
                onChange={(e) => {
                  setFilterType('company');
                  setFilterValue(e.target.value);
                }}
                className={`px-2 py-2 rounded-xl text-xs font-bold border focus:outline-none transition-all cursor-pointer ${
                  filterType === 'company'
                    ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                }`}
              >
                <option value="Tất cả">Đại đội...</option>
                {companies.filter(c => c !== "Tất cả").map(c => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SEPARATED, ISOLATED LIST ITEMS */}
      <div className="space-y-3">
        {filteredResults.length > 0 ? (
          filteredResults.map((res, index) => {
            const absRank = sortedResults.findIndex(sr => sr.id === res.id) + 1;
            const hasDistinctRank = filterValue !== "Tất cả" && absRank !== (index + 1);
            
            // Special styling for top 3 podium cards
            let cardStyle = "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm";
            if (index === 0) {
              cardStyle = "bg-gradient-to-r from-amber-50 to-yellow-50/50 dark:from-yellow-950/10 dark:to-slate-900 border-2 border-yellow-300 dark:border-yellow-700/60 shadow-[0_4px_16px_rgba(234,179,8,0.06)]";
            } else if (index === 1) {
              cardStyle = "bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-800/10 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700/60 shadow-[0_4px_12px_rgba(148,163,184,0.05)]";
            } else if (index === 2) {
              cardStyle = "bg-gradient-to-r from-orange-50/50 to-white dark:from-orange-950/5 dark:to-slate-900 border border-orange-200 dark:border-orange-900/40 shadow-[0_4px_12px_rgba(249,115,22,0.04)]";
            }

            return (
              <div
                key={res.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl transition-all duration-300 gap-4 ${cardStyle}`}
              >
                {/* Left col: Rank & User Info */}
                <div className="flex items-center gap-3.5">
                  <div className="flex flex-col items-center justify-center shrink-0 w-12">
                    {getRankBadge(index)}
                    {hasDistinctRank && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">
                        Chung: #{absRank}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                        {res.userName}
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        {res.userTitle || "Hội viên"}
                      </span>
                      {res.type === "official" ? (
                        <span className="text-[9px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded">
                          Chính thức
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold px-1.5 py-0.5 rounded">
                          Thi thử
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{res.userDepartment}</span>
                      {res.userChiBo && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span>Chi bộ: <strong className="text-slate-600 dark:text-slate-300">{res.userChiBo}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right col: Score & Stats Info */}
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
                  <div className="flex items-center gap-4">
                    {/* Submission Date/Time */}
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 justify-start sm:justify-end">
                        <Calendar className="w-3.5 h-3.5 text-red-500" />
                        Thời điểm
                      </div>
                      <div className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {formatDateTime(res.date)}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 justify-start sm:justify-end">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Thời gian
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatDuration(res.durationSeconds)}
                      </div>
                    </div>

                    {/* Correct Count */}
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 justify-start sm:justify-end">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        Đúng
                      </div>
                      <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {res.correctCount} câu
                      </div>
                    </div>
                  </div>

                  {/* Big Score tag */}
                  <div className="bg-slate-100 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800/80 px-4 py-2.5 rounded-xl text-center shrink-0 min-w-[70px]">
                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Điểm số
                    </div>
                    <div className="text-lg font-black text-red-600 dark:text-yellow-400 font-mono">
                      {res.score.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
              Chưa có kết quả thi {examTypeFilter === "official" ? "chính thức" : examTypeFilter === "practice" ? "thi thử" : ""} được ghi nhận trong bảng lọc này.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
