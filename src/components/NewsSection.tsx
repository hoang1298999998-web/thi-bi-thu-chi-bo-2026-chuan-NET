import React, { useState } from "react";
import { Calendar, User, MessageCircle, ArrowRight, Tag, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NewsArticle } from "../types";

interface NewsSectionProps {
  articles: NewsArticle[];
  currentUser: any;
  onRefreshDB: () => void;
}

export default function NewsSection({ articles, currentUser, onRefreshDB }: NewsSectionProps) {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [commentText, setCommentText] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");

  const categories = ["Tất cả", "Tin tức nổi bật", "Kinh nghiệm - Trao đổi"];

  const filteredArticles = activeCategory === "Tất cả"
    ? articles
    : articles.filter(a => a.category === activeCategory);

  const handleAddComment = async (e: React.FormEvent, articleId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const userName = currentUser ? currentUser.fullName : "Khách ẩn danh";

    try {
      const res = await fetch(`/api/news/${articleId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userName, text: commentText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setCommentText("");
        // Instantly update local selected article comments
        if (selectedArticle) {
          setSelectedArticle({
            ...selectedArticle,
            comments: [...selectedArticle.comments, { user: userName, text: commentText.trim(), date: new Date().toISOString() }]
          });
        }
        onRefreshDB();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category filters */}
      <div className="flex gap-2 border-b border-yellow-500/10 pb-3 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-300 ${
              activeCategory === cat
                ? "bg-yellow-500 text-red-950 font-bold shadow-[0_0_15px_rgba(234,179,8,0.35)]"
                : "bg-yellow-500/10 dark:bg-yellow-500/5 text-stone-600 dark:text-yellow-300/80 hover:bg-yellow-500/20 dark:hover:bg-yellow-500/10 border border-yellow-500/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.map((article, index) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 }}
            className="bg-white/75 dark:bg-black/20 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-md hover:border-yellow-500/30 dark:hover:border-yellow-500/25 hover:shadow-xl transition-all duration-300 flex flex-col group"
          >
            <div className="h-48 overflow-hidden relative">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-3 left-3 bg-yellow-500 text-red-950 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                {article.category}
              </span>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 text-[11px] text-stone-500 dark:text-yellow-100/40 mb-3 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(article.date).toLocaleDateString("vi-VN")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {article.comments?.length || 0} bình luận
                  </span>
                </div>
                <h3 className="text-base font-serif font-bold text-stone-800 dark:text-yellow-100 leading-snug mb-3 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-stone-500 dark:text-yellow-100/60 text-xs sm:text-sm line-clamp-3 mb-4 leading-relaxed font-sans font-medium">
                  {article.content}
                </p>
              </div>

              <button
                onClick={() => setSelectedArticle(article)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-600 dark:text-yellow-400 hover:gap-2.5 transition-all w-fit focus:outline-none"
              >
                Đọc bài viết <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Article Detail Drawer/Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-[#faf7f0] dark:bg-[#150202] border-l border-yellow-500/20 h-full overflow-y-auto shadow-2xl flex flex-col"
            >
              {/* Image Banner */}
              <div className="h-64 relative shrink-0">
                <img
                  src={selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-6">
                  <div>
                    <span className="bg-yellow-500 text-red-950 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 inline-block shadow-md">
                      {selectedArticle.category}
                    </span>
                    <h2 className="text-lg sm:text-2xl font-serif font-black text-white filter drop-shadow-md">
                      {selectedArticle.title}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 w-9 h-9 bg-black/60 hover:bg-black/80 text-yellow-400 rounded-full flex items-center justify-center focus:outline-none transition-all border border-yellow-500/30"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 flex-1 space-y-6">
                {/* Meta details */}
                <div className="flex items-center gap-4 text-xs font-semibold text-stone-500 dark:text-yellow-100/40 border-b border-yellow-500/10 pb-4">
                  <span className="flex items-center gap-1 bg-yellow-500/10 dark:bg-yellow-500/5 px-2.5 py-1 rounded-md border border-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedArticle.date).toLocaleDateString("vi-VN")}
                  </span>
                  <span className="flex items-center gap-1 bg-yellow-500/10 dark:bg-yellow-500/5 px-2.5 py-1 rounded-md border border-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <User className="w-4 h-4" />
                    Ban Tuyên huấn
                  </span>
                </div>

                {/* Main Content */}
                <p className="text-stone-700 dark:text-yellow-50/80 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium font-sans">
                  {selectedArticle.content}
                </p>

                {/* Comment Section */}
                <div className="border-t border-yellow-500/10 pt-6 space-y-4">
                  <h4 className="text-sm font-serif font-bold text-stone-800 dark:text-yellow-400 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-yellow-500" />
                    Ý kiến đóng góp & Bình luận ({selectedArticle.comments?.length || 0})
                  </h4>

                  {/* List of comments */}
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedArticle.comments && selectedArticle.comments.length > 0 ? (
                      selectedArticle.comments.map((comment, index) => (
                        <div
                          key={`c_${index}`}
                          className="bg-white/60 dark:bg-black/30 p-3.5 rounded-xl border border-yellow-500/10 dark:border-yellow-500/5 text-xs sm:text-sm"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-stone-800 dark:text-yellow-200">
                              {comment.user}
                            </span>
                            <span className="text-[10px] text-stone-400 dark:text-yellow-100/40">
                              {new Date(comment.date).toLocaleString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-stone-600 dark:text-yellow-50/60 leading-relaxed font-semibold">
                            {comment.text}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-stone-400 dark:text-yellow-100/40 text-xs italic">Chưa có bình luận nào. Hãy gửi ý kiến đầu tiên của bạn!</p>
                    )}
                  </div>

                  {/* Comment submit form */}
                  <form
                    onSubmit={(e) => handleAddComment(e, selectedArticle.id)}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder={currentUser ? "Nhập bình luận của bạn..." : "Đăng nhập để tham gia thảo luận..."}
                      value={commentText}
                      disabled={!currentUser}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white/40 dark:bg-black/35 border border-yellow-500/20 dark:border-yellow-500/15 rounded-xl focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500 disabled:bg-stone-100 dark:disabled:bg-stone-900/50 disabled:text-stone-400"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || !currentUser}
                      className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/50 disabled:bg-stone-200 dark:disabled:bg-stone-900 text-yellow-600 dark:text-yellow-400 disabled:text-stone-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      Gửi <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
