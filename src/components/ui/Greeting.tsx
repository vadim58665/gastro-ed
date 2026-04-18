"use client";

interface GreetingProps {
  nickname: string;
  level: string;
  xp: number;
  /** Тестовый override часа - для deterministic тестов. */
  hourOverride?: number;
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Доброе утро";
  if (hour >= 12 && hour < 18) return "Добрый день";
  if (hour >= 18 && hour < 22) return "Добрый вечер";
  return "Доброй ночи";
}

const formatXp = (n: number): string =>
  n.toLocaleString("ru-RU").replace(/,/g, " ");

const formatDate = (d: Date): string => {
  const weekdays = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
};

export default function Greeting({ nickname, level, xp, hourOverride }: GreetingProps) {
  const now = new Date();
  const hour = hourOverride ?? now.getHours();
  const hello = getGreeting(hour);

  return (
    <div className="text-center px-6 pt-5 pb-4">
      <div className="text-[10px] tracking-[0.25em] uppercase text-muted font-medium">
        {formatDate(now)}
      </div>
      <div className="text-[26px] font-extralight tracking-tight text-foreground mt-1.5 leading-[1.1]">
        {hello},
        <br />
        <span className="font-light aurora-text">{nickname}</span>
      </div>
      <div className="flex gap-1.5 justify-center flex-wrap mt-2.5">
        <span
          className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 rounded-full bg-card aurora-hairline text-foreground"
          style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{
              background:
                "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
            }}
          />
          {level}
        </span>
        <span
          className="text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 rounded-full text-muted"
          style={{ background: "var(--aurora-indigo-soft)" }}
        >
          {formatXp(xp)} XP
        </span>
      </div>
    </div>
  );
}
