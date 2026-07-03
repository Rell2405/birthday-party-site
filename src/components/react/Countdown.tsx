import { useEffect, useState } from "react";

interface Props {
  target: string; // ISO date string
}

function diff(target: number) {
  const total = Math.max(0, target - Date.now());
  return {
    total,
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

export default function Countdown({ target }: Props) {
  const targetMs = new Date(target).getTime();
  const [time, setTime] = useState(() => diff(targetMs));

  useEffect(() => {
    const id = setInterval(() => setTime(diff(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (time.total <= 0) {
    return (
      <p className="font-display text-2xl font-semibold text-gold-300">
        🎉 It's party time!
      </p>
    );
  }

  const units = [
    { value: time.days, label: "days" },
    { value: time.hours, label: "hrs" },
    { value: time.minutes, label: "min" },
    { value: time.seconds, label: "sec" },
  ];

  return (
    <div
      className="flex gap-3 sm:gap-4"
      role="timer"
      aria-live="off"
      aria-label={`${time.days} days, ${time.hours} hours, ${time.minutes} minutes until the party`}
    >
      {units.map((u) => (
        <div
          key={u.label}
          className="flex min-w-[4.25rem] flex-col items-center rounded-2xl border border-plum-700/60 bg-plum-900/60 px-3 py-2.5 backdrop-blur"
        >
          <span className="font-display text-3xl font-bold tabular-nums text-white sm:text-4xl">
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-plum-300">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
