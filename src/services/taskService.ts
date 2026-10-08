import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Task, UserSettings } from '../types';

const LOCAL_STORAGE_TASKS_KEY = 'tugasku_local_tasks_v1';
const LOCAL_STORAGE_SETTINGS_KEY = 'tugasku_local_settings_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  userId: 'local',
  dailyReminderTime: '08:00',
  soundEnabled: true,
  morningBriefEnabled: true,
};

// Generate clean alphanumeric ID matching firestore rule regex ^[a-zA-Z0-9_\-]+$
export function generateValidId(prefix = 'tsk'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${time}_${rand}`;
}

export class TaskService {
  // Local storage helpers
  static getLocalTasks(): Task[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveLocalTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  static getLocalSettings(): UserSettings {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveLocalSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  // Firestore Subscriptions
  static subscribeTasks(
    userId: string,
    onTasks: (tasks: Task[]) => void,
    onError: (err: unknown) => void
  ): Unsubscribe {
    const path = `users/${userId}/tasks`;
    const tasksRef = collection(db, 'users', userId, 'tasks');

    return onSnapshot(
      tasksRef,
      (snapshot) => {
        const tasks: Task[] = [];
        snapshot.forEach((docSnap) => {
          tasks.push({ ...(docSnap.data() as Task), id: docSnap.id });
        });
        // Sort by updatedAt descending or priority
        tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        onTasks(tasks);
      },
      (error) => {
        onError(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  static subscribeSettings(
    userId: string,
    onSettings: (settings: UserSettings) => void,
    onError: (err: unknown) => void
  ): Unsubscribe {
    const path = `users/${userId}/settings/preferences`;
    const settingsDoc = doc(db, 'users', userId, 'settings', 'preferences');

    return onSnapshot(
      settingsDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          onSettings(docSnap.data() as UserSettings);
        } else {
          // Initialize default settings for new user
          const initial: UserSettings = {
            ...DEFAULT_SETTINGS,
            userId,
            updatedAt: new Date().toISOString(),
          };
          this.saveSettings(userId, initial).catch(console.error);
          onSettings(initial);
        }
      },
      (error) => {
        onError(error);
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  }

  // Task Mutations
  static async createTask(userId: string | null, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Task> {
    const nowIso = new Date().toISOString();
    const taskId = generateValidId('task');

    const cleanTask: Task = {
      id: taskId,
      userId: userId || 'local',
      title: taskData.title.trim().slice(0, 200),
      description: taskData.description ? taskData.description.trim().slice(0, 1000) : undefined,
      category: taskData.category,
      priority: taskData.priority,
      status: taskData.status,
      dueDate: taskData.dueDate ? taskData.dueDate.slice(0, 30) : undefined,
      dueTime: taskData.dueTime ? taskData.dueTime.slice(0, 10) : undefined,
      reminderEnabled: Boolean(taskData.reminderEnabled),
      reminderTime: taskData.reminderTime ? taskData.reminderTime.slice(0, 10) : undefined,
      dailyRecurring: Boolean(taskData.dailyRecurring),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (!userId) {
      const local = this.getLocalTasks();
      const updated = [cleanTask, ...local];
      this.saveLocalTasks(updated);
      return cleanTask;
    }

    const path = `users/${userId}/tasks/${taskId}`;
    try {
      const taskRef = doc(db, 'users', userId, 'tasks', taskId);
      // Clean undefined keys for firestore strict rules
      const payload: Record<string, unknown> = {};
      Object.entries(cleanTask).forEach(([k, v]) => {
        if (v !== undefined) payload[k] = v;
      });

      await setDoc(taskRef, payload);
      return cleanTask;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  static async updateTask(
    userId: string | null,
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    const nowIso = new Date().toISOString();

    if (!userId) {
      const local = this.getLocalTasks();
      const next = local.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: nowIso } : t));
      this.saveLocalTasks(next);
      return;
    }

    const path = `users/${userId}/tasks/${taskId}`;
    try {
      const taskRef = doc(db, 'users', userId, 'tasks', taskId);
      const payload: Record<string, unknown> = {
        ...updates,
        updatedAt: nowIso,
      };

      // Sanitize fields if present
      if (payload.title && typeof payload.title === 'string') {
        payload.title = payload.title.trim().slice(0, 200);
      }
      if (payload.description && typeof payload.description === 'string') {
        payload.description = payload.description.trim().slice(0, 1000);
      }

      // Remove undefined values
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });

      await setDoc(taskRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  // Soft delete (moves task to Trash)
  static async softDeleteTask(userId: string | null, taskId: string): Promise<void> {
    const nowIso = new Date().toISOString();
    await this.updateTask(userId, taskId, {
      isDeleted: true,
      deletedAt: nowIso,
    });
  }

  // Restore task from Trash
  static async restoreTask(userId: string | null, taskId: string): Promise<void> {
    const nowIso = new Date().toISOString();
    await this.updateTask(userId, taskId, {
      isDeleted: false,
      deletedAt: undefined,
    });
  }

  // Permanent Delete
  static async deleteTaskPermanently(userId: string | null, taskId: string): Promise<void> {
    if (!userId) {
      const local = this.getLocalTasks();
      this.saveLocalTasks(local.filter((t) => t.id !== taskId));
      return;
    }

    const path = `users/${userId}/tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // Empty Trash permanently
  static async emptyTrash(userId: string | null, trashTaskIds: string[]): Promise<void> {
    for (const id of trashTaskIds) {
      await this.deleteTaskPermanently(userId, id);
    }
  }

  // Backwards compatibility alias
  static async deleteTask(userId: string | null, taskId: string): Promise<void> {
    await this.softDeleteTask(userId, taskId);
  }

  static async saveSettings(userId: string | null, settings: UserSettings): Promise<void> {
    const nowIso = new Date().toISOString();
    const sanitized: UserSettings = {
      ...settings,
      userId: userId || 'local',
      updatedAt: nowIso,
    };

    if (!userId) {
      this.saveLocalSettings(sanitized);
      return;
    }

    const path = `users/${userId}/settings/preferences`;
    try {
      const settingRef = doc(db, 'users', userId, 'settings', 'preferences');
      await setDoc(settingRef, sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // Migrate local offline tasks to Firestore when user logs in
  static async migrateLocalTasksToCloud(userId: string): Promise<number> {
    const localTasks = this.getLocalTasks();
    if (localTasks.length === 0) return 0;

    let migratedCount = 0;
    for (const task of localTasks) {
      try {
        const taskId = generateValidId('task');
        const nowIso = new Date().toISOString();
        const path = `users/${userId}/tasks/${taskId}`;
        const taskRef = doc(db, 'users', userId, 'tasks', taskId);

        const cloudTask: Task = {
          ...task,
          id: taskId,
          userId,
          createdAt: task.createdAt || nowIso,
          updatedAt: nowIso,
        };

        const payload: Record<string, unknown> = {};
        Object.entries(cloudTask).forEach(([k, v]) => {
          if (v !== undefined) payload[k] = v;
        });

        await setDoc(taskRef, payload);
        migratedCount++;
      } catch (err) {
        console.error('Migration item failed', err);
      }
    }

    // Clear local once migrated
    localStorage.removeItem(LOCAL_STORAGE_TASKS_KEY);
    return migratedCount;
  }
}
