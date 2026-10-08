import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import confetti from 'canvas-confetti';
import {
  Plus,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  Inbox,
  FilterX,
  RefreshCw,
  Bell,
  Clock,
  AlertCircle,
  Cloud,
  Trash2,
} from 'lucide-react';

import {
  auth,
  testFirestoreConnection,
  googleSignIn,
  getAccessToken,
} from './firebase/config';
import {
  Task,
  UserSettings,
  FilterTimeScope,
  TaskCategory,
  TaskPriority,
  NotificationAlert,
} from './types';
import { TaskService, DEFAULT_SETTINGS } from './services/taskService';
import { Navbar } from './components/Navbar';
import { DailyBriefingBanner } from './components/DailyBriefingBanner';
import { DailyStats } from './components/DailyStats';
import { TaskFilterBar } from './components/TaskFilterBar';
import { TaskCard } from './components/TaskCard';
import { TaskModal } from './components/TaskModal';
import { SettingsModal } from './components/SettingsModal';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { ReminderToast } from './components/ReminderToast';
import { soundFX } from './utils/audio';
import {
  getTodayDateString,
  getTomorrowDateString,
  formatTimeHM,
  sendBrowserNotification,
} from './utils/notifications';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters & Search
  const [scope, setScope] = useState<FilterTimeScope>('all');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);

  // Reminder Alerts
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const triggeredAlertsRef = useRef<Set<string>>(new Set());

  // Initial Seed check
  const hasInitializedLocal = useRef(false);

  // Test Firestore on boot
  useEffect(() => {
    testFirestoreConnection().catch(console.warn);
  }, []);

  // Auth & Data Subscription
  useEffect(() => {
    let unsubscribeTasks: (() => void) | null = null;
    let unsubscribeSettings: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setIsSyncing(true);
        const token = await getAccessToken();
        setAccessToken(token);

        // Migrate offline local tasks to cloud if any
        try {
          const migrated = await TaskService.migrateLocalTasksToCloud(currentUser.uid);
          if (migrated > 0) {
            setAlerts((prev) => [
              {
                id: `migrated_${Date.now()}`,
                title: 'Sinkronisasi Cloud Berhasil',
                message: `${migrated} tugas dari perangkat lokal berhasil dipindahkan ke akun cloud Anda.`,
                time: formatTimeHM(),
                type: 'success',
              },
              ...prev,
            ]);
          }
        } catch (e) {
          console.warn('Migration error', e);
        }

        // Subscribe to Firestore collections
        unsubscribeTasks = TaskService.subscribeTasks(
          currentUser.uid,
          (cloudTasks) => {
            setTasks(cloudTasks);
            setIsSyncing(false);
          },
          (err) => {
            console.error('Task subscription failed', err);
            setIsSyncing(false);
          }
        );

        unsubscribeSettings = TaskService.subscribeSettings(
          currentUser.uid,
          (cloudSettings) => {
            setSettings(cloudSettings);
          },
          (err) => console.error('Settings subscription failed', err)
        );
      } else {
        // Local mode fallback
        setAccessToken(null);
        if (!hasInitializedLocal.current) {
          hasInitializedLocal.current = true;
          const localTasks = TaskService.getLocalTasks();
          if (localTasks.length === 0) {
            // Seed sample productivity starter tasks in Indonesian
            const today = getTodayDateString();
            const tomorrow = getTomorrowDateString();
            const sampleTasks: Task[] = [
              {
                id: 'task_sample_1',
                userId: 'local',
                title: 'Review agenda harian & prioritaskan tugas penting',
                description: 'Tentukan 3 target utama (Must-Do) yang harus diselesaikan hari ini.',
                category: 'work',
                priority: 'high',
                status: 'pending',
                dueDate: today,
                dueTime: '09:00',
                reminderEnabled: true,
                reminderTime: '08:30',
                dailyRecurring: true,
                isDeleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: 'task_sample_2',
                userId: 'local',
                title: 'Minum air putih 2 liter & istirahat peregangan',
                description: 'Jaga hidrasi dan istirahatkan mata sejenak setiap 50 menit kerja.',
                category: 'health',
                priority: 'medium',
                status: 'pending',
                dueDate: today,
                dueTime: '15:00',
                reminderEnabled: true,
                reminderTime: '14:00',
                dailyRecurring: true,
                isDeleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: 'task_sample_3',
                userId: 'local',
                title: 'Persiapan materi diskusi & evaluasi pekanan',
                description: 'Periksa catatan rapat dan rangkum capaian kinerja.',
                category: 'study',
                priority: 'urgent',
                status: 'pending',
                dueDate: tomorrow,
                dueTime: '10:00',
                reminderEnabled: true,
                reminderTime: '09:00',
                dailyRecurring: false,
                isDeleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];
            TaskService.saveLocalTasks(sampleTasks);
            setTasks(sampleTasks);
          } else {
            setTasks(localTasks);
          }
        } else {
          setTasks(TaskService.getLocalTasks());
        }
        setSettings(TaskService.getLocalSettings());
        setIsSyncing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTasks) unsubscribeTasks();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, []);

  // Daily Reminder Timer Engine (runs every 25 seconds)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHM = formatTimeHM(now);
      const todayStr = getTodayDateString();
      const dateKey = `${todayStr}_${currentHM}`;

      // 1. General Daily Briefing Reminder check
      if (settings.morningBriefEnabled && settings.dailyReminderTime === currentHM) {
        const briefKey = `brief_${dateKey}`;
        if (!triggeredAlertsRef.current.has(briefKey)) {
          triggeredAlertsRef.current.add(briefKey);

          const pendingCount = tasks.filter(
            (t) => !t.isDeleted && t.status !== 'completed' && (!t.dueDate || t.dueDate <= todayStr)
          ).length;
          const msg = `Waktunya memeriksa agenda Anda! Anda memiliki ${pendingCount} tugas yang perlu perhatian hari ini.`;

          if (settings.soundEnabled) soundFX.playReminderChime();
          sendBrowserNotification('Pengingat Harian TugasKu', { body: msg });

          setAlerts((prev) => [
            {
              id: briefKey,
              title: 'Pengingat Agenda Harian',
              message: msg,
              time: currentHM,
              type: 'daily_brief',
            },
            ...prev,
          ]);
        }
      }

      // 2. Individual Task Reminders check
      tasks.forEach((task) => {
        if (task.isDeleted || task.status === 'completed') return;
        if (!task.reminderEnabled || !task.reminderTime) return;

        // Check if task is scheduled for today or daily recurring
        const isScheduledToday = task.dailyRecurring || !task.dueDate || task.dueDate === todayStr;

        if (isScheduledToday && task.reminderTime === currentHM) {
          const taskAlertKey = `task_${task.id}_${dateKey}`;
          if (!triggeredAlertsRef.current.has(taskAlertKey)) {
            triggeredAlertsRef.current.add(taskAlertKey);

            if (settings.soundEnabled) soundFX.playReminderChime();
            sendBrowserNotification(`Pengingat: ${task.title}`, {
              body: task.description || 'Waktunya menyelesaikan tugas ini!',
            });

            setAlerts((prev) => [
              {
                id: taskAlertKey,
                title: `Pengingat: ${task.title}`,
                message: task.description || 'Tenggat tugas atau waktu pengingat telah tiba.',
                time: currentHM,
                taskId: task.id,
                type: 'reminder',
              },
              ...prev,
            ]);
          }
        }
      });
    };

    // Run immediately and every 25 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 25000);
    return () => clearInterval(interval);
  }, [tasks, settings]);

  // Auth Handlers
  const handleLogin = async () => {
    try {
      setIsSyncing(true);
      const res = await googleSignIn();
      setAccessToken(res.accessToken);
      setUser(res.user);
    } catch (err) {
      console.error('Google Sign-in failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAccessToken(null);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  // Task Mutations
  const handleSaveTask = async (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ) => {
    if (editingTask) {
      await TaskService.updateTask(user ? user.uid : null, editingTask.id, taskData);
      if (!user) {
        setTasks(TaskService.getLocalTasks());
      }
      setAlerts((prev) => [
        {
          id: `edit_${Date.now()}`,
          title: 'Tugas Diperbarui',
          message: `Perubahan pada "${taskData.title}" berhasil disimpan.`,
          time: formatTimeHM(),
          type: 'success',
        },
        ...prev,
      ]);
    } else {
      const created = await TaskService.createTask(user ? user.uid : null, taskData);
      if (!user) {
        setTasks((prev) => [created, ...prev]);
      }
      setAlerts((prev) => [
        {
          id: `create_${Date.now()}`,
          title: 'Tugas Dibuat',
          message: `"${created.title}" berhasil ditambahkan ke agenda.`,
          time: formatTimeHM(),
          type: 'success',
        },
        ...prev,
      ]);
    }
  };

  const handleCreateTask = async (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<Task> => {
    const created = await TaskService.createTask(user ? user.uid : null, taskData);
    if (!user) {
      setTasks(TaskService.getLocalTasks());
    }
    return created;
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    await TaskService.updateTask(user ? user.uid : null, taskId, updates);
    if (!user) {
      setTasks(TaskService.getLocalTasks());
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const isCompleted = task.status === 'completed';
    const nextStatus = isCompleted ? 'pending' : 'completed';
    const completedAt = isCompleted ? undefined : new Date().toISOString();

    // Play feedback sound
    if (!isCompleted && settings.soundEnabled) {
      soundFX.playSuccessChime();
    }

    await TaskService.updateTask(user ? user.uid : null, task.id, {
      status: nextStatus,
      completedAt: completedAt || '',
    });

    if (!user) {
      setTasks(TaskService.getLocalTasks());
    }

    // Check if user completed all today tasks -> Confetti celebration!
    if (!isCompleted) {
      const todayStr = getTodayDateString();
      const remainingToday = tasks.filter(
        (t) => !t.isDeleted && t.id !== task.id && t.status !== 'completed' && (t.dueDate === todayStr || t.dailyRecurring)
      );

      if (remainingToday.length === 0) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    }
  };

  // Move task to Trash (Soft Delete)
  const handleDeleteTask = async (taskId: string) => {
    await TaskService.softDeleteTask(user ? user.uid : null, taskId);
    if (!user) {
      setTasks(TaskService.getLocalTasks());
    }
    setAlerts((prev) => [
      {
        id: `trash_${Date.now()}`,
        title: 'Tugas Dipindahkan ke Sampah',
        message: 'Tugas dipindahkan ke Tempat Sampah. Anda dapat memulihkannya kapan saja.',
        time: formatTimeHM(),
        type: 'reminder',
      },
      ...prev,
    ]);
  };

  // Restore task from Trash
  const handleRestoreTask = async (taskId: string) => {
    await TaskService.restoreTask(user ? user.uid : null, taskId);
    if (!user) {
      setTasks(TaskService.getLocalTasks());
    }
    setAlerts((prev) => [
      {
        id: `restore_${Date.now()}`,
        title: 'Tugas Dipulihkan',
        message: 'Tugas berhasil dipulihkan ke daftar aktif.',
        time: formatTimeHM(),
        type: 'success',
      },
      ...prev,
    ]);
  };

  // Delete task permanently
  const handleDeletePermanently = async (taskId: string) => {
    await TaskService.deleteTaskPermanently(user ? user.uid : null, taskId);
    if (!user) {
      setTasks(TaskService.getLocalTasks());
    }
    setAlerts((prev) => [
      {
        id: `perm_${Date.now()}`,
        title: 'Tugas Dihapus Permanen',
        message: 'Tugas telah dihapus secara permanen.',
        time: formatTimeHM(),
        type: 'reminder',
      },
      ...prev,
    ]);
  };

  // Empty all Trash
  const handleEmptyTrash = async () => {
    const trashTasks = tasks.filter((t) => t.isDeleted);
    const trashIds = trashTasks.map((t) => t.id);
    await TaskService.emptyTrash(user ? user.uid : null, trashIds);
    if (!user) {
      setTasks(TaskService.getLocalTasks());
    }
    setAlerts((prev) => [
      {
        id: `empty_${Date.now()}`,
        title: 'Tempat Sampah Dikosongkan',
        message: `${trashIds.length} tugas telah dihapus secara permanen.`,
        time: formatTimeHM(),
        type: 'success',
      },
      ...prev,
    ]);
  };

  const handleClearCompleted = async () => {
    const completedTasks = tasks.filter((t) => !t.isDeleted && t.status === 'completed');
    for (const task of completedTasks) {
      await TaskService.softDeleteTask(user ? user.uid : null, task.id);
    }
    if (!user) {
      setTasks(TaskService.getLocalTasks());
    }
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    await TaskService.saveSettings(user ? user.uid : null, newSettings);
  };

  // Separate active vs deleted tasks
  const activeTasks = useMemo(() => tasks.filter((t) => !t.isDeleted), [tasks]);
  const trashTasks = useMemo(() => tasks.filter((t) => Boolean(t.isDeleted)), [tasks]);

  // Derived Task Statistics
  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  const todayTasks = useMemo(() => {
    return activeTasks.filter((t) => t.dueDate === todayStr || t.dailyRecurring);
  }, [activeTasks, todayStr]);

  const completedTodayCount = useMemo(() => {
    return todayTasks.filter((t) => t.status === 'completed').length;
  }, [todayTasks]);

  const overdueCount = useMemo(() => {
    return activeTasks.filter(
      (t) => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr && !t.dailyRecurring
    ).length;
  }, [activeTasks, todayStr]);

  const dailyRecurringCount = useMemo(() => {
    return activeTasks.filter((t) => t.dailyRecurring).length;
  }, [activeTasks]);

  const counts = useMemo(() => {
    return {
      all: activeTasks.filter((t) => t.status !== 'completed').length,
      today: activeTasks.filter((t) => t.status !== 'completed' && (t.dueDate === todayStr || t.dailyRecurring)).length,
      tomorrow: activeTasks.filter((t) => t.status !== 'completed' && t.dueDate === tomorrowStr).length,
      overdue: overdueCount,
      recurring: dailyRecurringCount,
      completed: activeTasks.filter((t) => t.status === 'completed').length,
      trash: trashTasks.length,
    };
  }, [activeTasks, trashTasks, todayStr, tomorrowStr, overdueCount, dailyRecurringCount]);

  // Filtered Tasks list
  const filteredTasks = useMemo(() => {
    if (scope === 'trash') {
      let result = tasks.filter((t) => Boolean(t.isDeleted));
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.description ? t.description.toLowerCase().includes(q) : false)
        );
      }
      return result;
    }

    return activeTasks.filter((task) => {
      // 1. Scope filter
      if (scope === 'all') {
        if (task.status === 'completed') return false;
      } else if (scope === 'today') {
        if (!(task.dueDate === todayStr || task.dailyRecurring)) return false;
      } else if (scope === 'tomorrow') {
        if (task.dueDate !== tomorrowStr) return false;
      } else if (scope === 'overdue') {
        if (task.status === 'completed' || !task.dueDate || task.dueDate >= todayStr || task.dailyRecurring) {
          return false;
        }
      } else if (scope === 'recurring') {
        if (!task.dailyRecurring) return false;
      } else if (scope === 'completed') {
        if (task.status !== 'completed') return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && task.category !== selectedCategory) {
        return false;
      }

      // 3. Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description ? task.description.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [activeTasks, tasks, scope, todayStr, tomorrowStr, selectedCategory, selectedPriority, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={user}
        isSyncing={isSyncing}
        todayCount={counts.today}
        overdueCount={counts.overdue}
        onOpenNewTask={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSyncNow={() => {
          if (user) {
            setIsSyncing(true);
            setTimeout(() => setIsSyncing(false), 800);
          } else {
            handleLogin();
          }
        }}
        activeRemindersCount={counts.today}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Morning Briefing Banner (only when not viewing trash) */}
        {settings.morningBriefEnabled && scope !== 'trash' && (
          <DailyBriefingBanner
            todayTasks={todayTasks}
            completedTodayCount={completedTodayCount}
            dailyRecurringCount={dailyRecurringCount}
            onFilterToday={() => setScope('today')}
            onTriggerDailyChime={() => soundFX.playReminderChime()}
            isLoggedIn={Boolean(user)}
            onLoginPrompt={handleLogin}
            onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
          />
        )}

        {/* Productivity Overview Cards (only when not viewing trash) */}
        {scope !== 'trash' && (
          <DailyStats
            totalActive={counts.all}
            completedTodayCount={completedTodayCount}
            overdueCount={counts.overdue}
            recurringCount={counts.recurring}
            currentScope={scope}
            onSelectScope={(s) => setScope(s)}
          />
        )}

        {/* Trash Banner when viewing Tempat Sampah */}
        {scope === 'trash' && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Tempat Sampah Tugas ({trashTasks.length})</h3>
                <p className="text-xs text-rose-700">
                  Tugas yang dihapus disimpan di sini. Anda dapat memulihkannya kembali atau menghapusnya secara permanen.
                </p>
              </div>
            </div>
            {trashTasks.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                Kosongkan Semua Sampah
              </button>
            )}
          </div>
        )}

        {/* Filtering & Search Header */}
        <TaskFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          scope={scope}
          onScopeChange={setScope}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          counts={counts}
          onEmptyTrash={handleEmptyTrash}
        />

        {/* Task List Section */}
        {authLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Memuat data tugas dan sinkronisasi cloud...</p>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleStatus={handleToggleTaskStatus}
                onEdit={(t) => {
                  setEditingTask(t);
                  setIsTaskModalOpen(true);
                }}
                onDelete={handleDeleteTask}
                onRestore={handleRestoreTask}
                onDeletePermanently={handleDeletePermanently}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 sm:py-24 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 p-8 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              {scope === 'trash' ? (
                <Trash2 className="w-7 h-7 text-slate-400" />
              ) : searchQuery ? (
                <FilterX className="w-7 h-7" />
              ) : (
                <Inbox className="w-7 h-7" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {scope === 'trash'
                  ? 'Tempat sampah kosong'
                  : searchQuery
                  ? 'Tidak ada tugas yang cocok'
                  : scope === 'today'
                  ? 'Tidak ada tugas untuk hari ini'
                  : scope === 'overdue'
                  ? 'Bagus sekali! Tidak ada tugas yang terlewat'
                  : scope === 'completed'
                  ? 'Belum ada tugas yang selesai'
                  : 'Daftar tugas masih kosong'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                {scope === 'trash'
                  ? 'Semua tugas yang Anda hapus akan muncul di sini untuk dipulihkan jika diperlukan.'
                  : searchQuery
                  ? 'Coba gunakan kata kunci pencarian lain atau setel ulang filter kategori.'
                  : 'Mulai dengan menambahkan tugas pertama Anda atau aktifkan pengingat harian.'}
              </p>
            </div>
            {scope !== 'trash' && (
              <button
                onClick={() => {
                  if (searchQuery) setSearchQuery('');
                  else {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{searchQuery ? 'Hapus Kata Kunci' : 'Tambah Tugas Baru'}</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button for Mobile screens */}
      <button
        onClick={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        className="fixed bottom-6 right-6 sm:hidden z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Tambah Tugas"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
      />

      {/* External Calendar Sync Modal (Google Calendar & Outlook Calendar) */}
      <CalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        tasks={activeTasks}
        user={user}
        accessToken={accessToken}
        onLoginWithGoogle={handleLogin}
        onUpdateTask={handleUpdateTask}
        onCreateTask={handleCreateTask}
      />

      {/* Settings & Reminder Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        user={user}
        tasks={activeTasks}
        onClearCompletedTasks={handleClearCompleted}
        onLoginPrompt={() => {
          setIsSettingsOpen(false);
          handleLogin();
        }}
        onOpenCalendarSync={() => {
          setIsSettingsOpen(false);
          setIsCalendarSyncOpen(true);
        }}
      />

      {/* Real-time Reminder Toasts */}
      <ReminderToast
        alerts={alerts}
        onDismiss={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onCompleteTask={(taskId) => {
          const target = tasks.find((t) => t.id === taskId);
          if (target) handleToggleTaskStatus(target);
        }}
      />
    </div>
  );
}
