import React from 'react';
import { Bell, Check, X, Clock } from 'lucide-react';
import { NotificationAlert } from '../types';

interface ReminderToastProps {
  alerts: NotificationAlert[];
  onDismiss: (id: string) => void;
  onCompleteTask?: (taskId: string) => void;
}

export const ReminderToast: React.FC<ReminderToastProps> = ({
  alerts,
  onDismiss,
  onCompleteTask,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 text-white">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {alert.time}
              </span>
              <button
                onClick={() => onDismiss(alert.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h4 className="text-sm font-semibold text-slate-100 leading-snug">{alert.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5">{alert.message}</p>

            {alert.taskId && onCompleteTask && (
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex gap-2">
                <button
                  onClick={() => {
                    onCompleteTask(alert.taskId!);
                    onDismiss(alert.id);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>Selesaikan Sekarang</span>
                </button>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                >
                  Nanti
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
