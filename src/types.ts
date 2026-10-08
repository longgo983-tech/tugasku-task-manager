export type TaskCategory = 'work' | 'personal' | 'study' | 'health' | 'urgent' | 'general';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  reminderEnabled: boolean;
  reminderTime?: string; // HH:mm
  dailyRecurring: boolean;
  completedAt?: string;
  googleEventId?: string;
  calendarSynced?: boolean;
  lastCalendarSync?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  dailyReminderTime: string; // e.g. "08:00"
  soundEnabled: boolean;
  morningBriefEnabled: boolean;
  updatedAt?: string;
}

export type FilterTimeScope = 'all' | 'today' | 'tomorrow' | 'overdue' | 'recurring' | 'completed' | 'trash';

export interface NotificationAlert {
  id: string;
  title: string;
  message: string;
  time: string;
  taskId?: string;
  type: 'reminder' | 'overdue' | 'daily_brief' | 'success';
}
