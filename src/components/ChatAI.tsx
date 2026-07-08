import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function ChatAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m_init",
      sender: "ai",
      text: "Xin chào đồng chí! Tôi là trợ lý AI chính thức của Hội thi Bí thư Chi bộ giỏi 2026. Tôi có thể giúp đồng chí giải đáp các kiến thức về Điều lệ Đảng, công tác nghiệp vụ Chi bộ, và thông tin cuộc thi trong kho tài liệu.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    
    const userMsg: Message = {
      id: `m_user_${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      
      const aiMsg: Message = {
        id: `m_ai_${Date.now()}`,
        sender: "ai",
        text: data.reply || "Tôi chưa tìm thấy nội dung này trong hệ thống.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errMsg: Message = {
        id: `m_ai_err_${Date.now()}`,
        sender: "ai",
        text: "Tôi chưa tìm thấy nội dung này trong hệ thống.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center w-14 h-14 bg-yellow-500 hover:bg-yellow-600 text-red-950 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-105 transition-all focus:outline-none"
            title="Hỏi trợ lý AI"
          >
            <MessageSquare className="w-6 h-6 animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="w-[360px] sm:w-[400px] h-[500px] bg-white/90 dark:bg-black/80 border border-yellow-500/20 dark:border-yellow-500/10 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-stone-900/95 text-yellow-500 p-4 flex items-center justify-between border-b border-yellow-500/15">
              <div className="flex items-center gap-2">
                <div className="bg-yellow-500/10 p-1.5 rounded-lg border border-yellow-500/25">
                  <Bot className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-sm text-yellow-100">Trợ lý AI - Bí thư Giỏi</h3>
                  <p className="text-[11px] text-yellow-500/70 font-semibold tracking-wider">Lãnh đạo & Nghiệp vụ</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-yellow-500 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/30 dark:bg-black/40">
              {messages.map((msg) => {
                const isNotFound = msg.text === "Tôi chưa tìm thấy nội dung này trong hệ thống.";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[85%] flex gap-2">
                      {msg.sender === "ai" && (
                        <div className="w-7 h-7 bg-yellow-500/10 rounded-full flex items-center justify-center shrink-0 mt-1 text-yellow-500 border border-yellow-500/20">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl p-3 text-xs sm:text-sm shadow-sm ${
                          msg.sender === "user"
                            ? "bg-yellow-500 text-red-950 font-semibold rounded-br-none"
                            : isNotFound
                            ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-bl-none flex items-start gap-2"
                            : "bg-white/80 dark:bg-black/30 border border-yellow-500/5 dark:border-yellow-500/5 text-stone-800 dark:text-yellow-100 rounded-bl-none"
                        }`}
                      >
                        {isNotFound && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />}
                        <div>
                          <p className="leading-relaxed font-semibold">{msg.text}</p>
                          <span className={`block text-[9px] mt-1 text-right ${msg.sender === "user" ? "text-red-950/60" : "text-stone-400 dark:text-yellow-100/30"}`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex gap-2">
                    <div className="w-7 h-7 bg-yellow-500/10 rounded-full flex items-center justify-center shrink-0 text-yellow-500">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white/80 dark:bg-black/30 border border-yellow-500/5 rounded-2xl p-3 text-sm rounded-bl-none shadow-sm text-stone-500 dark:text-yellow-100/40">
                      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-bounce mx-1" style={{ animationDelay: '150ms' }} />
                      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-white/70 dark:bg-black/40 border-t border-yellow-500/10 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Đặt câu hỏi về Điều lệ, Nghiệp vụ..."
                className="flex-1 px-4 py-2 text-xs sm:text-sm bg-white/40 dark:bg-black/25 border border-yellow-500/10 dark:border-yellow-500/15 rounded-xl focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500 text-stone-800 dark:text-yellow-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-red-950 rounded-xl focus:outline-none transition-all duration-300"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
