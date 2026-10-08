import React from 'react';
import { Sparkles, Calendar, CheckCircle2, Clock, BellRing, ArrowRight, ShieldCheck } from 'lucide-react';
import { Task } from '../types';

interface DailyBriefingBannerProps {
  todayTasks: Task[];
  completedTodayCount: number;
  dailyRecurringCount: number;
  onFilterToday: () => void;
  onTriggerDailyChime: () => void;
  isLoggedIn: boolean;
  onLoginPrompt: () => void;
  onOpenCalendarSync?: () => void;
}

export const DailyBriefingBanner: React.FC<DailyBriefingBannerProps> = ({
  todayTasks,
  completedTodayCount,
  dailyRecurringCount,
  onFilterToday,
  onTriggerDailyChime,
  isLoggedIn,
  onLoginPrompt,
  onOpenCalendarSync,
}) => {
  const now = new Date();
  const hour = now.getHours();
  
  let greeting = 'Selamat Pagi';
  if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
  else if (hour >= 18 || hour < 4) greeting = 'Selamat Malam';

  // Indonesian date formatter
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const totalToday = todayTasks.length;
  const progressPercent = totalToday > 0 ? Math.round((completedTodayCount / totalToday) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl shadow-indigo-950/10 p-6 sm:p-8 mb-8 border border-indigo-700/40">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-200">
              <BellRing className="w-3 h-3 text-amber-300" />
              Pengingat Harian Aktif
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting}! Siap produktif hari ini?
          </h1>

          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
            {totalToday === 0 ? (
              'Belum ada jadwal khusus untuk hari ini. Tambahkan tugas atau rutinitas harian baru untuk mulai melangkah maju.'
            ) : progressPercent === 100 ? (
              '🎉 Luar biasa! Seluruh tugas hari ini telah berhasil diselesaikan. Pertahankan konsistensi Anda!'
            ) : (
              `Anda memiliki ${totalToday} tugas hari ini (${completedTodayCount} selesai, tersisa ${
                totalToday - completedTodayCount
              }). Fokus pada satu hal dalam satu waktu.`
            )}
          </p>

          {!isLoggedIn && (
            <div className="pt-1 flex items-center gap-2 text-xs text-amber-200/90">
              <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Data saat ini tersimpan di browser Anda.{' '}
                <button
                  onClick={onLoginPrompt}
                  className="underline font-semibold hover:text-white transition-colors"
                >
                  Masuk dengan Google
                </button>{' '}
                agar tersinkronisasi otomatis ke cloud.
              </span>
            </div>
          )}
        </div>

        {/* Today's Progress Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 min-w-[240px] sm:min-w-[280px] shrink-0 space-y-4">
          <div className="flex items-center justify-between text-xs text-indigo-100 font-medium">
            <span>Progres Hari Ini</span>
            <span className="font-bold text-white text-sm">{progressPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-300 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-xs">
            <div>
              <p className="text-indigo-200">Selesai</p>
              <p className="text-base font-bold text-white">
                {completedTodayCount} / {totalToday}
              </p>
            </div>
            <div>
              <p className="text-indigo-200">Rutinitas Harian</p>
              <p className="text-base font-bold text-teal-300">{dailyRecurringCount}</p>
            </div>
          </div>

          <button
            onClick={onFilterToday}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white text-indigo-900 font-semibold text-xs hover:bg-indigo-50 active:scale-98 transition-all"
          >
            <span>Fokus Tugas Hari Ini</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
