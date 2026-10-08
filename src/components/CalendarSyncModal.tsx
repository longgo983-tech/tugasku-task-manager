import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  Download,
  Upload,
  CalendarCheck,
  ShieldAlert,
  Clock,
  Info,
} from 'lucide-react';
import { Task } from '../types';
import { CalendarService, GoogleCalendarEvent } from '../services/calendarService';
import { User } from 'firebase/auth';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  user: User | null;
  accessToken: string | null;
  onLoginWithGoogle: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onCreateTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<Task>;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  tasks,
  user,
  accessToken,
  onLoginWithGoogle,
  onUpdateTask,
  onCreateTask,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'outlook'>('google');
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Mandatory confirmation dialog state for destructive/mutating operations
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    title: string;
    description: string;
    actionName: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadGoogleEvents();
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const loadGoogleEvents = async () => {
    if (!accessToken) return;
    try {
      setIsSyncing(true);
      const events = await CalendarService.listEvents(accessToken);
      setGoogleEvents(events);
    } catch (err) {
      console.error(err);
      setSyncStatusMsg({
        type: 'error',
        text: 'Gagal memuat acara Google Calendar. Pastikan izin kalender telah disetujui.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTwoWaySync = async () => {
    if (!accessToken) {
      onLoginWithGoogle();
      return;
    }

    setPendingConfirmation({
      title: 'Konfirmasi Sinkronisasi Dua Arah Google Calendar',
      description: `Aplikasi akan menyinkronkan tugas dengan tenggat waktu ke Google Calendar Anda dan memperbarui tugas lokal yang terkait.`,
      actionName: 'Mulai Sinkronisasi',
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncStatusMsg(null);
        try {
          let pushedCount = 0;
          let updatedCount = 0;
          const nowIso = new Date().toISOString();

          // PUSH: Sync TugasKu -> Google Calendar
          for (const task of tasks) {
            if (!task.dueDate) continue;

            if (task.googleEventId) {
              try {
                await CalendarService.updateEvent(accessToken, task.googleEventId, task);
                await onUpdateTask(task.id, {
                  calendarSynced: true,
                  lastCalendarSync: nowIso,
                });
                updatedCount++;
              } catch (e) {
                console.warn('Update failed, creating new event', e);
                const created = await CalendarService.createEvent(accessToken, task);
                await onUpdateTask(task.id, {
                  googleEventId: created.id,
                  calendarSynced: true,
                  lastCalendarSync: nowIso,
                });
                pushedCount++;
              }
            } else {
              const created = await CalendarService.createEvent(accessToken, task);
              await onUpdateTask(task.id, {
                googleEventId: created.id,
                calendarSynced: true,
                lastCalendarSync: nowIso,
              });
              pushedCount++;
            }
          }

          // PULL: Refresh Google Calendar events
          const latestEvents = await CalendarService.listEvents(accessToken);
          setGoogleEvents(latestEvents);

          setSyncStatusMsg({
            type: 'success',
            text: `Sinkronisasi dua arah sukses! ${pushedCount} acara baru dikirim, ${updatedCount} acara diperbarui di Google Calendar.`,
          });
        } catch (err) {
          console.error(err);
          setSyncStatusMsg({
            type: 'error',
            text: err instanceof Error ? err.message : 'Sinkronisasi gagal.',
          });
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handleImportGoogleEvent = async (event: GoogleCalendarEvent) => {
    let dueDate: string | undefined;
    let dueTime: string | undefined;

    if (event.start.dateTime) {
      const dt = new Date(event.start.dateTime);
      dueDate = dt.toISOString().slice(0, 10);
      dueTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    } else if (event.start.date) {
      dueDate = event.start.date;
    }

    try {
      await onCreateTask({
        title: event.summary || 'Acara Kalender Google',
        description: event.description || 'Diimpor dari Google Calendar',
        category: 'general',
        priority: 'medium',
        status: 'pending',
        dueDate,
        dueTime,
        reminderEnabled: true,
        reminderTime: dueTime ? dueTime : '09:00',
        dailyRecurring: false,
      });

      setSyncStatusMsg({
        type: 'success',
        text: `Acara "${event.summary}" berhasil diimpor sebagai tugas baru!`,
      });
    } catch (e) {
      console.error(e);
      setSyncStatusMsg({
        type: 'error',
        text: 'Gagal mengimpor acara kalender.',
      });
    }
  };

  const handleDeleteGoogleEvent = (event: GoogleCalendarEvent) => {
    if (!accessToken) return;

    setPendingConfirmation({
      title: 'Hapus Acara di Google Calendar?',
      description: `Apakah Anda yakin ingin menghapus acara "${event.summary}" secara permanen dari Google Calendar Anda? Tindakan ini tidak dapat dibatalkan.`,
      actionName: 'Hapus dari Google Calendar',
      onConfirm: async () => {
        try {
          await CalendarService.deleteEvent(accessToken, event.id);
          setGoogleEvents((prev) => prev.filter((e) => e.id !== event.id));
          setSyncStatusMsg({
            type: 'success',
            text: `Acara "${event.summary}" berhasil dihapus dari Google Calendar.`,
          });
        } catch (err) {
          console.error(err);
          setSyncStatusMsg({
            type: 'error',
            text: 'Gagal menghapus acara.',
          });
        }
      },
    });
  };

  const handleDownloadICal = () => {
    const icsContent = CalendarService.exportToICalendar(tasks);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tugasku_kalender_outlook_${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUploadICal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const parsedTasks = CalendarService.parseICalendar(content);
        let imported = 0;
        for (const item of parsedTasks) {
          if (item.title) {
            await onCreateTask({
              title: item.title,
              description: item.description,
              category: item.category || 'general',
              priority: item.priority || 'medium',
              status: item.status || 'pending',
              dueDate: item.dueDate,
              dueTime: item.dueTime,
              reminderEnabled: item.reminderEnabled ?? true,
              dailyRecurring: false,
            });
            imported++;
          }
        }
        setSyncStatusMsg({
          type: 'success',
          text: `Berhasil mengimpor ${imported} acara dari file kalender Outlook (.ics)!`,
        });
      } catch (err) {
        console.error(err);
        setSyncStatusMsg({
          type: 'error',
          text: 'Gagal membaca format file kalender (.ics).',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sinkronisasi Kalender Eksternal</h2>
              <p className="text-xs text-slate-500">
                Pembaruan dua arah dengan Google Calendar dan Outlook Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/40 gap-4">
          <button
            onClick={() => setActiveTab('google')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'google'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
              G
            </div>
            <span>Google Calendar (Dua Arah)</span>
          </button>
          <button
            onClick={() => setActiveTab('outlook')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'outlook'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-sky-600 flex items-center justify-center text-[10px] text-white font-bold">
              O
            </div>
            <span>Outlook & Office 365</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Notification Alert Message */}
          {syncStatusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
                syncStatusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : syncStatusMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {syncStatusMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{syncStatusMsg.text}</span>
              </div>
              <button
                onClick={() => setSyncStatusMsg(null)}
                className="text-slate-400 hover:text-slate-600 text-xs ml-2 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* TAB 1: GOOGLE CALENDAR */}
          {activeTab === 'google' && (
            <div className="space-y-5">
              {/* Connection Status Box */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Status Google Calendar</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        accessToken
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {accessToken ? 'OAuth Aktif & Terhubung' : 'Perlu Izin Masuk'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {accessToken
                      ? `Terhubung sebagai ${user?.email || 'Akun Google'}. Acara kalender tersinkronisasi dua arah.`
                      : 'Hubungkan akun Google Anda untuk mengaktifkan sinkronisasi dua arah dengan Google Calendar.'}
                  </p>
                </div>

                {accessToken ? (
                  <button
                    onClick={handleTwoWaySync}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Dua Arah'}</span>
                  </button>
                ) : (
                  <button
                    onClick={onLoginWithGoogle}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <span>Masuk & Beri Izin Kalender</span>
                  </button>
                )}
              </div>

              {/* Tasks to be synced summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500">Tugas dengan Tenggat</p>
                  <p className="text-lg font-bold text-slate-900">
                    {tasks.filter((t) => Boolean(t.dueDate)).length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500">Tersinkron di Google</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {tasks.filter((t) => Boolean(t.googleEventId)).length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500">Acara di Google Calendar</p>
                  <p className="text-lg font-bold text-indigo-600">{googleEvents.length}</p>
                </div>
              </div>

              {/* List of Google Calendar Events */}
              {accessToken && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CalendarCheck className="w-4 h-4 text-indigo-600" />
                      Acara Google Calendar Anda ({googleEvents.length})
                    </span>
                    <button
                      onClick={loadGoogleEvents}
                      disabled={isSyncing}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Muat Ulang</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {googleEvents.length > 0 ? (
                      googleEvents.map((evt) => {
                        const isTaskEvent = evt.description?.includes('[TugasKu]');
                        const dateDisplay = evt.start.dateTime
                          ? new Date(evt.start.dateTime).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : evt.start.date || 'Sepanjang hari';

                        return (
                          <div
                            key={evt.id}
                            className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 truncate">
                                  {evt.summary}
                                </span>
                                {isTaskEvent && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100 shrink-0">
                                    Dari TugasKu
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{dateDisplay}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isTaskEvent && (
                                <button
                                  onClick={() => handleImportGoogleEvent(evt)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold cursor-pointer transition-colors"
                                  title="Impor acara ini ke TugasKu"
                                >
                                  Impor Tugas
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteGoogleEvent(evt)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                title="Hapus dari Google Calendar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {isSyncing ? 'Memuat data acara...' : 'Tidak ada acara kalender dalam rentang waktu ini.'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OUTLOOK CALENDAR & .ICS TWO-WAY */}
          {activeTab === 'outlook' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-950">Integrasi Microsoft Outlook Calendar</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    Format iCalendar (.ICS) & Deeplink
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Outlook Calendar (Web, Desktop, & Office 365) menggunakan standar iCalendar (.ics). Anda dapat mengekspor jadwal tugas untuk dimasukkan ke Outlook, atau mengimpor file kalender dari Outlook langsung ke TugasKu.
                </p>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Ekspor ke Outlook (.ICS) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Ekspor Kalender (.ics)</h4>
                      <p className="text-[11px] text-slate-500">Untuk Outlook & Office 365</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Unduh file kalender berisi semua tugas bertenggat waktu Anda beserta pengingat otomatisnya.
                  </p>
                  <button
                    onClick={handleDownloadICal}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Kalender Outlook (.ics)</span>
                  </button>
                </div>

                {/* 2. Impor dari Outlook (.ICS) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Impor dari Outlook</h4>
                      <p className="text-[11px] text-slate-500">Unggah file kalender .ics</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Masukkan acara atau janji dari kalender Outlook ke dalam daftar tugas TugasKu.
                  </p>
                  <label className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File Kalender (.ics)</span>
                    <input
                      type="file"
                      accept=".ics,text/calendar"
                      onChange={handleFileUploadICal}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-600" />
                  Cara Sinkronisasi di Outlook:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Unduh file kalender <strong>.ics</strong> menggunakan tombol di atas.</li>
                  <li>Buka <strong>Outlook</strong> (aplikasi desktop atau web di outlook.live.com).</li>
                  <li>Pilih menu <strong>Kalender &gt; Tambah Kalender &gt; Unggah dari File</strong>.</li>
                  <li>Pilih file <strong>.ics</strong> tersebut untuk melihat seluruh jadwal tugas Anda.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Sinkronisasi otomatis menyertakan tenggat dan waktu pengingat.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive / Mutating Workspace operations */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{pendingConfirmation.title}</h3>
                <p className="text-xs text-slate-500">Konfirmasi Izin Pembaruan Data Kalender</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {pendingConfirmation.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const action = pendingConfirmation.onConfirm;
                  setPendingConfirmation(null);
                  await action();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer"
              >
                {pendingConfirmation.actionName}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
