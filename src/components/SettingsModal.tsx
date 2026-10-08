import React, { useState } from 'react';
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Sun,
  ShieldCheck,
  Cloud,
  Download,
  Trash,
  Check,
  Smartphone,
  Info,
  Calendar,
} from 'lucide-react';
import { UserSettings, Task } from '../types';
import { soundFX } from '../utils/audio';
import { requestNotificationPermission, isNotificationSupported } from '../utils/notifications';
import { User } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => Promise<void>;
  user: User | null;
  tasks: Task[];
  onClearCompletedTasks: () => Promise<void>;
  onLoginPrompt: () => void;
  onOpenCalendarSync?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  user,
  tasks,
  onClearCompletedTasks,
  onLoginPrompt,
  onOpenCalendarSync,
}) => {
  const [dailyTime, setDailyTime] = useState(settings.dailyReminderTime || '08:00');
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);
  const [morningBriefEnabled, setMorningBriefEnabled] = useState(settings.morningBriefEnabled ?? true);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted' && soundEnabled) {
      soundFX.playReminderChime();
    }
  };

  const handleTestSound = () => {
    soundFX.playReminderChime();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        ...settings,
        dailyReminderTime: dailyTime,
        soundEnabled,
        morningBriefEnabled,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tugasku_cadangan_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pengaturan Pengingat & Cloud</h2>
            <p className="text-xs text-slate-500">Konfigurasi jadwal pengingat harian dan sinkronisasi data</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Cloud Sync Status Card */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-indigo-600" />
                Status Sinkronisasi Cloud
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  user ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {user ? 'Tersambung ke Cloud' : 'Mode Perangkat Lokal'}
              </span>
            </div>
            {user ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Terhubung dengan akun <strong>{user.email}</strong>. Seluruh tugas dan pengingat tersimpan secara otomatis dan aman di Firestore.
                </p>
                {onOpenCalendarSync && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCalendarSync();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Kelola Sinkronisasi Kalender (Google & Outlook)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Data Anda tersimpan di peramban saat ini. Hubungkan akun Google untuk menyinkronkan tugas secara realtime di semua perangkat Anda.
                </p>
                <button
                  type="button"
                  onClick={onLoginPrompt}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Hubungkan Akun Google
                </button>
              </div>
            )}
          </div>

          {/* Daily Reminder Time */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Waktu Pengingat Harian Utama
            </label>
            <p className="text-xs text-slate-500">
              Waktu otomatis saat aplikasi memberikan ringkasan tugas dan daftar agenda hari ini.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="text-xs text-slate-500">Waktu Indonesia Barat (WIB) / Lokal</span>
            </div>
          </div>

          {/* Audio Chime Notification */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-indigo-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-800">Efek Suara Notifikasi</p>
                <p className="text-[11px] text-slate-500">Lonceng audio merdu saat pengingat aktif atau tugas selesai</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSound}
                className="text-[11px] px-2 py-1 rounded bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-medium"
              >
                Tes Suara
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>
          </div>

          {/* Browser System Notification */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800">Notifikasi Browser (Pop-up OS)</span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {notificationPermission === 'granted'
                  ? 'Diizinkan'
                  : notificationPermission === 'denied'
                  ? 'Diblokir Browser'
                  : 'Belum Diaktifkan'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Izinkan browser untuk memunculkan notifikasi pop-up saat tiba waktunya tugas atau jadwal pengingat.
            </p>
            {notificationPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline block"
              >
                Klik di sini untuk mengaktifkan izin notifikasi
              </button>
            )}
          </div>

          {/* Morning Briefing Banner toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Tampilkan Banner Ringkasan Harian</p>
                <p className="text-[11px] text-slate-500">Menampilkan kartu motivasi dan progres harian di bagian atas</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={morningBriefEnabled}
                onChange={(e) => setMorningBriefEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Backup & Maintenance */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-700">Pencadangan & Pemeliharaan</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Unduh Cadangan JSON ({tasks.length} Tugas)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bersihkan semua tugas yang sudah selesai?')) {
                    onClearCompletedTasks();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-700 text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>Hapus Tugas Selesai</span>
              </button>
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedSuccess ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Pengaturan berhasil disimpan
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
