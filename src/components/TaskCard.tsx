import React, { useState } from 'react';
import {
  Check,
  Calendar,
  Clock,
  Bell,
  Repeat,
  Trash2,
  Edit3,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { Task, TaskPriority, TaskCategory } from '../types';
import { getTodayDateString } from '../utils/notifications';

interface TaskCardProps {
  task: Task;
  onToggleStatus: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  onDeletePermanently?: (taskId: string) => void;
}

const CATEGORY_STYLES: Record<TaskCategory, { label: string; bg: string; text: string; border: string }> = {
  work: { label: 'Pekerjaan', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  personal: { label: 'Pribadi', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  study: { label: 'Belajar', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  health: { label: 'Kesehatan', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  urgent: { label: 'Mendesak', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  general: { label: 'Umum', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

const PRIORITY_BADGES: Record<TaskPriority, { label: string; badge: string }> = {
  urgent: { label: 'Sangat Mendesak', badge: 'bg-rose-100 text-rose-800 border-rose-200 font-semibold' },
  high: { label: 'Tinggi', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  medium: { label: 'Sedang', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  low: { label: 'Rendah', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  onRestore,
  onDeletePermanently,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isCompleted = task.status === 'completed';
  const isDeleted = Boolean(task.isDeleted);
  const todayStr = getTodayDateString();

  // Due Date calculation
  let isOverdue = false;
  let isDueToday = false;
  if (!isCompleted && !isDeleted && task.dueDate) {
    if (task.dueDate < todayStr) {
      isOverdue = true;
    } else if (task.dueDate === todayStr) {
      isDueToday = true;
    }
  }

  const categoryMeta = CATEGORY_STYLES[task.category] || CATEGORY_STYLES.general;
  const priorityMeta = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;

  // Format date display
  const formatDueDisplay = () => {
    if (!task.dueDate) return null;
    if (isDueToday) {
      return task.dueTime ? `Hari ini, ${task.dueTime}` : 'Hari ini';
    }
    const [y, m, d] = task.dueDate.split('-');
    const formatted = `${d}/${m}/${y}`;
    return task.dueTime ? `${formatted} • ${task.dueTime}` : formatted;
  };

  return (
    <div
      className={`group relative bg-white rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
        isDeleted
          ? 'border-dashed border-rose-200 bg-rose-50/20 opacity-80'
          : isCompleted
          ? 'border-slate-200 bg-slate-50/60 opacity-75'
          : isOverdue
          ? 'border-rose-200 ring-1 ring-rose-300/40'
          : task.priority === 'urgent'
          ? 'border-rose-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Checkbox (or Trash Icon if in trash) */}
        {isDeleted ? (
          <div className="mt-0.5 w-6 h-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </div>
        ) : (
          <button
            onClick={() => onToggleStatus(task)}
            aria-label={isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
            className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isCompleted
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                : 'border-slate-300 hover:border-indigo-500 bg-white'
            }`}
          >
            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {/* Trash badge if deleted */}
            {isDeleted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                Di Tempat Sampah
              </span>
            )}

            {/* Category tag */}
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${categoryMeta.bg} ${categoryMeta.text} ${categoryMeta.border}`}
            >
              {categoryMeta.label}
            </span>

            {/* Priority tag */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityMeta.badge}`}>
              {priorityMeta.label}
            </span>

            {/* Daily recurring indicator */}
            {task.dailyRecurring && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                <Repeat className="w-2.5 h-2.5" />
                Rutinitas Harian
              </span>
            )}

            {/* Reminder indicator */}
            {task.reminderEnabled && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Bell className="w-2.5 h-2.5" />
                {task.reminderTime || 'Pengingat Aktif'}
              </span>
            )}

            {/* Google Calendar Synced Badge */}
            {task.calendarSynced && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                <Calendar className="w-2.5 h-2.5" />
                Tersinkron Kalender
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className={`text-sm sm:text-base font-semibold text-slate-800 break-words leading-snug ${
              isCompleted || isDeleted ? 'line-through text-slate-400' : ''
            }`}
          >
            {task.title}
          </h3>

          {/* Description */}
          {task.description && (
            <div className="mt-1">
              <p
                className={`text-xs text-slate-500 whitespace-pre-line leading-relaxed ${
                  !isExpanded ? 'line-clamp-2' : ''
                } ${isCompleted || isDeleted ? 'line-through opacity-70' : ''}`}
              >
                {task.description}
              </p>
              {task.description.length > 90 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 mt-0.5 flex items-center gap-0.5 cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <span>Ringkas</span>
                      <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <span>Lihat selengkapnya</span>
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Bottom metadata (Due date, Overdue badge) */}
          <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-slate-100 text-xs">
            {task.dueDate && (
              <div
                className={`flex items-center gap-1.5 font-medium ${
                  isOverdue
                    ? 'text-rose-600'
                    : isDueToday
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`}
              >
                {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                <span>{formatDueDisplay()}</span>
                {isOverdue && <span className="font-bold text-[10px] bg-rose-100 px-1 rounded">(Terlewat)</span>}
              </div>
            )}

            {task.dueDate && !isCompleted && !isDeleted && (
              <a
                href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
                  task.title
                )}&startdt=${task.dueDate}T${task.dueTime || '09:00'}:00`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1"
                title="Buka & tambahkan ke Outlook Calendar Web"
              >
                <span>+ Outlook</span>
              </a>
            )}

            {isCompleted && task.completedAt && (
              <span className="text-[11px] text-emerald-600 font-medium">
                Selesai pada {new Date(task.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}

            {isDeleted && task.deletedAt && (
              <span className="text-[11px] text-rose-500 font-medium">
                Dihapus pada {new Date(task.deletedAt).toLocaleDateString('id-ID')}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Edit & Delete / Restore */}
        <div className="flex items-center gap-1 shrink-0">
          {isDeleted ? (
            /* Trash Actions */
            <div className="flex items-center gap-1">
              {onRestore && (
                <button
                  onClick={() => onRestore(task.id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  title="Pulihkan tugas ini dari tempat sampah"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan</span>
                </button>
              )}
              {onDeletePermanently && (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus permanen"
                  aria-label="Hapus Permanen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            /* Active Task Actions */
            <>
              {/* Prominent Edit Button */}
              <button
                onClick={() => onEdit(task)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
                title="Edit rincian tugas"
                aria-label="Edit tugas"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              {/* Delete / Move to Trash Button */}
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Pindahkan ke Tempat Sampah"
                aria-label="Hapus tugas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Custom Inline Confirmation for Deletion (Safe for iFrame environments) */}
      {showConfirmDelete && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 animate-in fade-in duration-150 text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {isDeleted
                ? 'Hapus tugas ini secara permanen? Data tidak dapat dikembalikan.'
                : 'Pindahkan tugas ini ke Tempat Sampah?'}
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-white text-xs font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={() => {
                setShowConfirmDelete(false);
                if (isDeleted && onDeletePermanently) {
                  onDeletePermanently(task.id);
                } else {
                  onDelete(task.id);
                }
              }}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {isDeleted ? 'Hapus Permanen' : 'Pindahkan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
