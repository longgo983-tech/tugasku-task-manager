import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Bell,
  Repeat,
  AlertTriangle,
  Sparkles,
  Check,
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../types';
import { getTodayDateString, getTomorrowDateString } from '../utils/notifications';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  editingTask: Task | null;
}

const CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'work', label: 'Pekerjaan' },
  { id: 'personal', label: 'Pribadi' },
  { id: 'study', label: 'Belajar' },
  { id: 'health', label: 'Kesehatan' },
  { id: 'urgent', label: 'Mendesak' },
  { id: 'general', label: 'Umum' },
];

const PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Rendah', color: 'border-slate-300 text-slate-700 peer-checked:border-slate-600 peer-checked:bg-slate-50' },
  { id: 'medium', label: 'Sedang', color: 'border-amber-300 text-amber-800 peer-checked:border-amber-500 peer-checked:bg-amber-50' },
  { id: 'high', label: 'Tinggi', color: 'border-orange-300 text-orange-800 peer-checked:border-orange-500 peer-checked:bg-orange-50' },
  { id: 'urgent', label: 'Mendesak', color: 'border-rose-300 text-rose-800 peer-checked:border-rose-600 peer-checked:bg-rose-50' },
];

const QUICK_TEMPLATES = [
  { title: 'Minum air 2 liter hari ini', category: 'health' as TaskCategory, priority: 'medium' as TaskPriority, dailyRecurring: true },
  { title: 'Olahraga & jalan santai 30 menit', category: 'health' as TaskCategory, priority: 'medium' as TaskPriority, dailyRecurring: true },
  { title: 'Review catatan & laporan kerja', category: 'work' as TaskCategory, priority: 'high' as TaskPriority, dailyRecurring: false },
  { title: 'Membaca buku 20 menit sebelum tidur', category: 'study' as TaskCategory, priority: 'low' as TaskPriority, dailyRecurring: true },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('general');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [dueTime, setDueTime] = useState('17:00');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [dailyRecurring, setDailyRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setDueDate(editingTask.dueDate || getTodayDateString());
      setDueTime(editingTask.dueTime || '17:00');
      setReminderEnabled(Boolean(editingTask.reminderEnabled));
      setReminderTime(editingTask.reminderTime || '09:00');
      setDailyRecurring(Boolean(editingTask.dailyRecurring));
    } else {
      // Reset for new
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      setStatus('pending');
      setDueDate(getTodayDateString());
      setDueTime('17:00');
      setReminderEnabled(true);
      setReminderTime('09:00');
      setDailyRecurring(false);
    }
    setErrorMsg('');
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Judul tugas wajib diisi.');
      return;
    }
    if (title.length > 200) {
      setErrorMsg('Judul tugas maksimal 200 karakter.');
      return;
    }
    if (description.length > 1000) {
      setErrorMsg('Keterangan maksimal 1000 karakter.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        status,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : undefined,
        dailyRecurring,
      });
      onClose();
    } catch (err) {
      setErrorMsg('Gagal menyimpan tugas. Silakan periksa koneksi.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setTitle(tpl.title);
    setCategory(tpl.category);
    setPriority(tpl.priority);
    setDailyRecurring(tpl.dailyRecurring);
    setDueDate(getTodayDateString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              {editingTask ? 'Perbarui rincian tugas dan jadwal' : 'Tulis rencana dan atur pengingat harian'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Templates (only when adding new) */}
          {!editingTask && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Inspirasi Cepat:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors cursor-pointer"
                  >
                    + {tpl.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Judul Tugas <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">{title.length}/200</span>
            </div>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Selesaikan presentasi laporan bulanan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Keterangan / Catatan Tambahan (Opsional)
              </label>
              <span className="text-[11px] text-slate-400">{description.length}/1000</span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rincian langkah, tautan dokumen, atau poin penting..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Category, Priority, and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
                <option value="urgent">Sangat Mendesak</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Tugas
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="pending">Belum Selesai</option>
                <option value="in_progress">Sedang Dikerjakan</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          </div>

          {/* Due Date & Due Time */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Tenggat Waktu
              </span>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDueDate(getTodayDateString())}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(getTomorrowDateString())}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 cursor-pointer"
                >
                  Besok
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Daily Reminder & Recurring Options */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3.5">
            {/* Reminder Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Pengingat Harian Otomatis</p>
                  <p className="text-[11px] text-slate-500">Kirim notifikasi audio & pesan pengingat</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {reminderEnabled && (
              <div className="flex items-center gap-3 pt-2 border-t border-indigo-100/80 text-xs">
                <span className="text-slate-600">Jam Pengingat:</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Daily Recurring Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-indigo-100/80">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-teal-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Rutinitas Harian Berulang</p>
                  <p className="text-[11px] text-slate-500">Tugas muncul otomatis di jadwal setiap hari</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailyRecurring}
                  onChange={(e) => setDailyRecurring(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
              </label>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : editingTask ? 'Perbarui Tugas' : 'Simpan Tugas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
