import { Users, FileQuestion, GraduationCap, Building2 } from "lucide-react";
import { motion } from "motion/react";

interface StatsProps {
  stats: {
    candidatesCount: number;
    questionsCount: number;
    attemptsCount: number;
    unitsCount: number;
  };
}

export default function Stats({ stats }: StatsProps) {
  const cards = [
    {
      id: "stat_1",
      title: "Tổng số thí sinh",
      value: stats.candidatesCount || 4,
      icon: Users,
      iconColor: "text-red-600 dark:text-yellow-500",
    },
    {
      id: "stat_2",
      title: "Số câu hỏi nghiệp vụ",
      value: stats.questionsCount || 10,
      icon: FileQuestion,
      iconColor: "text-amber-600 dark:text-yellow-400",
    },
    {
      id: "stat_3",
      title: "Số lượt tham gia thi",
      value: stats.attemptsCount || 1,
      icon: GraduationCap,
      iconColor: "text-emerald-600 dark:text-yellow-300",
    },
    {
      id: "stat_4",
      title: "Đơn vị tham gia",
      value: stats.unitsCount || 5,
      icon: Building2,
      iconColor: "text-sky-600 dark:text-yellow-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-black/25 border border-yellow-500/10 dark:border-yellow-500/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-md hover:border-yellow-500/30 dark:hover:border-yellow-500/25 hover:scale-[1.03] transition-all duration-300 group"
          >
            <div className="p-2.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-3 group-hover:scale-110 transition-transform duration-300">
              <Icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            
            <span className="text-3xl sm:text-4xl font-serif text-yellow-600 dark:text-yellow-500 font-bold mb-1 block">
              {card.value.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-500 dark:text-yellow-100/50 font-semibold block leading-tight">
              {card.title}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
