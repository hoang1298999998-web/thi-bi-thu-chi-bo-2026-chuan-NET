import { useState } from "react";
import { Search, FileText, Download, Play, Film, BookOpen, AlertCircle } from "lucide-react";
import { StudyDocument } from "../types";

interface DocumentsSectionProps {
  documents: StudyDocument[];
}

export default function DocumentsSection({ documents }: DocumentsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  const categories = ["Tất cả", "Văn kiện Đảng", "Hướng dẫn nghiệp vụ", "Tài liệu ôn thi"];

  const filteredDocs = documents.filter((doc) => {
    if (doc.format === "video" || doc.category === "Bài giảng Video") {
      return false;
    }
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "Tất cả" || doc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "pdf":
        return <FileText className="w-6 h-6 text-red-500" />;
      case "doc":
        return <FileText className="w-6 h-6 text-blue-500" />;
      case "ppt":
        return <FileText className="w-6 h-6 text-orange-500" />;
      case "video":
        return <Film className="w-6 h-6 text-emerald-500" />;
      default:
        return <BookOpen className="w-6 h-6 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and filter bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu, văn kiện ôn thi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white/40 dark:bg-black/25 border border-yellow-500/25 dark:border-yellow-500/15 rounded-xl focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500 text-stone-800 dark:text-yellow-50/90 placeholder-stone-400 dark:placeholder-yellow-100/30"
          />
          <Search className="w-4 h-4 text-stone-400 dark:text-yellow-500/50 absolute left-3.5 top-3.5" />
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full md:max-w-[60%] shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-yellow-500 text-red-950 shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                  : "bg-yellow-500/10 dark:bg-yellow-500/5 text-stone-600 dark:text-yellow-300 hover:bg-yellow-500/20 dark:hover:bg-yellow-500/10 border border-yellow-500/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white/70 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md p-4 rounded-2xl shadow-md hover:border-yellow-500/30 dark:hover:border-yellow-500/25 hover:shadow-xl transition-all duration-300 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-yellow-500/10 dark:bg-yellow-500/5 rounded-xl shrink-0 border border-yellow-500/10">
                  {getFormatIcon(doc.format)}
                </div>
                <div className="min-w-0 font-sans">
                  <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider block mb-0.5">
                    {doc.category}
                  </span>
                  <h4 className="text-sm font-bold text-stone-800 dark:text-yellow-100 truncate">
                    {doc.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-stone-400 dark:text-yellow-100/40 uppercase">
                    <span className="bg-yellow-500/10 dark:bg-yellow-500/5 border border-yellow-500/10 px-1.5 py-0.5 rounded">
                      {doc.format}
                    </span>
                    <span>{doc.size}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {doc.format === "video" ? (
                  <button
                    onClick={() => setPlayingVideoUrl(doc.url)}
                    className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl focus:outline-none transition-colors"
                    title="Xem Video bài giảng"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <a
                    href={doc.url}
                    onClick={(e) => {
                      if (doc.url === "#") {
                        e.preventDefault();
                        alert("Bản demo: Tài liệu này được mô phỏng đường dẫn tải về từ hệ thống.");
                      }
                    }}
                    className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl focus:outline-none transition-colors flex items-center justify-center"
                    title="Tải tài liệu"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-stone-400 dark:text-yellow-100/30">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm italic">Không tìm thấy tài liệu học tập phù hợp.</p>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {playingVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#1a0202] border border-yellow-500/20 rounded-2xl overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setPlayingVideoUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 hover:bg-black/80 text-yellow-400 rounded-full flex items-center justify-center border border-yellow-500/30"
            >
              ✕
            </button>
            <div className="p-4 bg-black border-b border-yellow-500/10 flex items-center gap-2 text-white text-sm font-bold">
              <Film className="w-4 h-4 text-yellow-500" />
              Xem bài giảng Video chuyên đề
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={playingVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
