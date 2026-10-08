import React from 'react';
import {
  CheckSquare2,
  Cloud,
  CloudOff,
  CloudCheck,
  Bell,
  Settings,
  Plus,
  LogOut,
  LogIn,
  RefreshCw,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  isSyncing: boolean;
  todayCount: number;
  overdueCount: number;
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  onOpenCalendarSync?: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onSyncNow: () => void;
  activeRemindersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isSyncing,
  todayCount,
  overdueCount,
  onOpenNewTask,
  onOpenSettings,
  onOpenCalendarSync,
  onLogin,
  onLogout,
  onSyncNow,
  activeRemindersCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <CheckSquare2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">TugasKu</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                Cloud Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Manajemen Tugas & Pengingat Harian
            </p>
          </div>
        </div>

        {/* Sync Status & User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Sync Status Indicator */}
          <div className="hidden md:flex items-center">
            {user ? (
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                title="Klik untuk menyinkronkan data cloud sekarang"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{isSyncing ? 'Menyinkronkan...' : 'Cloud Aktif'}</span>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                title="Tersimpan di perangkat lokal. Masuk untuk sinkronisasi cloud lintas perangkat."
              >
                <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Mode Lokal (Klik untuk Sinkron)</span>
              </button>
            )}
          </div>

          {/* Quick Stats Pill */}
          {(todayCount > 0 || overdueCount > 0) && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              <span className="font-semibold text-indigo-600">{todayCount}</span> hari ini
              {overdueCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-rose-600">{overdueCount}</span> terlewat
                </>
              )}
            </div>
          )}

          {/* Calendar Sync Button */}
          {onOpenCalendarSync && (
            <button
              onClick={onOpenCalendarSync}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 text-xs font-semibold transition-colors cursor-pointer"
              title="Sinkronisasi Kalender (Google & Outlook)"
              aria-label="Kalender"
            >
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Kalender</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative"
            title="Pengaturan Pengingat & Akun"
            aria-label="Pengaturan"
          >
            <Settings className="w-5 h-5" />
            {activeRemindersCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
            )}
          </button>

          {/* Add Task Button */}
          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Tugas</span>
          </button>

          {/* User Profile / Auth Toggle */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Pengguna'}
                  className="w-8 h-8 rounded-full border border-slate-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="hidden xl:block text-left text-xs">
                <p className="font-medium text-slate-900 truncate max-w-[120px]">{user.displayName || 'Akun Google'}</p>
                <p className="text-slate-400 truncate max-w-[120px]">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Keluar dari akun"
                aria-label="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 text-xs font-medium transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-500" />
              <span>Masuk Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
