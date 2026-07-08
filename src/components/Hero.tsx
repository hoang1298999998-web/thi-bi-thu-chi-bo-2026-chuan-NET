import { useState, useEffect } from "react";
import { Flag, Award, Clock } from "lucide-react";
import cpvEmblem from "../assets/images/cpv_emblem_1783090328419.jpg";
import { logoBase64 } from "../assets/logoBase64";

interface HeroProps {
  settings: {
    contestName: string;
    unitLogo: string;
    countdownDate: string;
  };
}

export default function Hero({ settings }: HeroProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const renderTitle = (title: string) => {
    const parts = title.split(/(\d+)/);
    return parts.map((part, index) => {
      if (/^\d+$/.test(part)) {
        return (
          <span 
            key={index} 
            style={{ fontFamily: 'Times New Roman, serif', fontSize: '63px', lineHeight: '60px' }} 
            className="font-bold tracking-normal inline-block align-baseline"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(settings.countdownDate || "2026-08-01T08:00:00") - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.countdownDate]);

  return (
    <div className="relative overflow-hidden py-16 sm:py-24 border-b border-yellow-500/30 dark:border-yellow-500/20 shadow-2xl rounded-3xl" style={{ background: "radial-gradient(circle at top, #7f1d1d 0%, #300505 50%, #170101 100%)" }}>
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:20px_20px]"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Emblem Display */}
        <div className="flex justify-center items-center gap-6 sm:gap-8 mb-6">
          {/* Huy hiệu Đảng */}
          <div className="relative group hover:scale-105 transition-transform duration-300">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-600 rounded-full border-2 border-yellow-400 p-0.5 shadow-[0_0_25px_rgba(234,179,8,0.5)] overflow-hidden flex items-center justify-center">
              <img src={cpvEmblem} alt="Huy hiệu Đảng Cộng sản Việt Nam" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
          {/* Logo Trung Đoàn 1 */}
          <div className="relative group hover:scale-105 transition-transform duration-300">
            <div className="w-[150px] h-[150px] flex items-center justify-center">
              <img src={logoBase64} alt="Logo Trung Đoàn 1" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>

        {/* Top badge spacer */}
        <div className="block mb-4 h-2"></div>
        
        {/* Banner Texts */}
        <p className="text-yellow-500/90 font-bold uppercase tracking-widest text-[11px] sm:text-xs mb-2">
          Ban Tổ chức Hội thi
        </p>
        
        <h1 
          style={{ lineHeight: '68px' }}
          className="text-3xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-2xl uppercase"
        >
          {renderTitle(settings.contestName || "HỘI THI BÍ THƯ CHI BỘ GIỎI NĂM 2026")}
        </h1>
        
        <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-yellow-100/70 font-medium leading-relaxed mb-8 px-4 font-sans">
          Nâng cao năng lực lãnh đạo, sức chiến đấu của các tổ chức cơ sở Đảng và đội ngũ cán bộ, đảng viên ở cơ sở trong tình hình mới.
        </p>

        {/* Countdown clock */}
        <div className="inline-block bg-black/40 backdrop-blur-md rounded-2xl p-5 sm:p-7 border border-yellow-500/20 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-3.5 text-yellow-500/80 font-bold text-[10px] sm:text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4 animate-spin-slow text-yellow-500" />
            Đồng hồ đếm ngược đến ngày khai mạc
          </div>
          
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-5xl font-serif font-bold text-white mb-0.5">
                {String(timeLeft.days).padStart(2, "0")}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-yellow-500/50">Ngày</div>
            </div>
            <div className="text-2xl sm:text-4xl font-serif text-yellow-500/30">:</div>
            
            <div className="text-center">
              <div className="text-3xl sm:text-5xl font-serif font-bold text-white mb-0.5">
                {String(timeLeft.hours).padStart(2, "0")}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-yellow-500/50">Giờ</div>
            </div>
            <div className="text-2xl sm:text-4xl font-serif text-yellow-500/30">:</div>
            
            <div className="text-center">
              <div className="text-3xl sm:text-5xl font-serif font-bold text-white mb-0.5">
                {String(timeLeft.minutes).padStart(2, "0")}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-yellow-500/50">Phút</div>
            </div>
            <div className="text-2xl sm:text-4xl font-serif text-yellow-500/30">:</div>
            
            <div className="text-center">
              <div className="text-3xl sm:text-5xl font-serif font-bold text-white mb-0.5 text-yellow-400">
                {String(timeLeft.seconds).padStart(2, "0")}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-yellow-500/50">Giây</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
