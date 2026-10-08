import { Task } from '../types';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  updated?: string;
  status?: string;
}

export class CalendarService {
  // List upcoming events from Primary Google Calendar
  static async listEvents(
    accessToken: string,
    timeMin?: string
  ): Promise<GoogleCalendarEvent[]> {
    const minTime = timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', minTime);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '50');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gagal memuat Google Calendar (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.items || [];
  }

  // Create an event in Google Calendar for a Task
  static async createEvent(
    accessToken: string,
    task: Task
  ): Promise<GoogleCalendarEvent> {
    const eventBody = this.buildEventPayload(task);

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal membuat acara di Google Calendar: ${errText}`);
    }

    return await res.json();
  }

  // Update an existing event in Google Calendar
  static async updateEvent(
    accessToken: string,
    eventId: string,
    task: Task
  ): Promise<GoogleCalendarEvent> {
    const eventBody = this.buildEventPayload(task);

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal memperbarui acara di Google Calendar: ${errText}`);
    }

    return await res.json();
  }

  // Delete an event in Google Calendar
  static async deleteEvent(
    accessToken: string,
    eventId: string
  ): Promise<void> {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      throw new Error(`Gagal menghapus acara di Google Calendar: ${errText}`);
    }
  }

  // Construct Google Calendar payload from Task
  private static buildEventPayload(task: Task) {
    const dueDate = task.dueDate || new Date().toISOString().slice(0, 10);
    const dueTime = task.dueTime || '09:00';

    let start: Record<string, string>;
    let end: Record<string, string>;

    if (task.dueTime) {
      const startDateTime = new Date(`${dueDate}T${dueTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const tzOffset = -startDateTime.getTimezoneOffset();
      const diffHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
      const diffMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
      const sign = tzOffset >= 0 ? '+' : '-';
      const offsetStr = `${sign}${diffHours}:${diffMins}`;

      start = {
        dateTime: `${startDateTime.toISOString().slice(0, 19)}${offsetStr}`,
      };
      end = {
        dateTime: `${endDateTime.toISOString().slice(0, 19)}${offsetStr}`,
      };
    } else {
      start = { date: dueDate };
      end = { date: dueDate };
    }

    const remindersConfig = task.reminderEnabled
      ? {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 10 },
          ],
        }
      : { useDefault: true };

    const description = `[TugasKu] ${task.description || ''}\nKategori: ${task.category}\nPrioritas: ${task.priority}\nStatus: ${task.status}`;

    return {
      summary: `${task.status === 'completed' ? '✓ ' : ''}${task.title}`,
      description,
      start,
      end,
      reminders: remindersConfig,
    };
  }

  // Build Deeplink URL to add task directly into Outlook Calendar Web
  static getOutlookCalendarUrl(task: Task, isOffice365 = false): string {
    const base = isOffice365
      ? 'https://outlook.office.com/calendar/0/deeplink/compose'
      : 'https://outlook.live.com/calendar/0/deeplink/compose';

    const dueDate = task.dueDate || new Date().toISOString().slice(0, 10);
    const dueTime = task.dueTime || '09:00';
    const startIso = `${dueDate}T${dueTime}:00`;
    
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const endIso = `${endDate.toISOString().slice(0, 10)}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;

    const params = new URLSearchParams({
      subject: task.title,
      body: `[TugasKu]\n${task.description || ''}\nKategori: ${task.category} | Prioritas: ${task.priority}`,
      startdt: startIso,
      enddt: endIso,
      allday: task.dueTime ? 'false' : 'true',
    });

    return `${base}?${params.toString()}`;
  }

  // Export tasks as standard RFC 5545 iCalendar (.ics) string
  static exportToICalendar(tasks: Task[]): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TugasKu Productivity//Task & Daily Reminder Sync//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:TugasKu Calendar Sync',
      'X-WR-TIMEZONE:Asia/Jakarta',
    ];

    tasks.forEach((task) => {
      if (!task.dueDate) return;

      const dateClean = task.dueDate.replace(/-/g, '');
      const timeClean = task.dueTime ? task.dueTime.replace(/:/g, '') + '00' : '';
      const dtStart = timeClean ? `${dateClean}T${timeClean}` : `${dateClean}`;
      const dtEnd = timeClean
        ? `${dateClean}T${String(Number(timeClean.slice(0, 2)) + 1).padStart(2, '0')}${timeClean.slice(2)}`
        : `${dateClean}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${task.id}@tugasku.app`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
      if (timeClean) {
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
        lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      }
      lines.push(`SUMMARY:${this.escapeICalText(task.title)}`);
      lines.push(`DESCRIPTION:${this.escapeICalText(task.description || '')}`);
      lines.push(`CATEGORIES:${task.category.toUpperCase()}`);
      lines.push(`STATUS:${task.status === 'completed' ? 'COMPLETED' : 'NEEDS-ACTION'}`);

      // Alarm / Reminder
      if (task.reminderEnabled) {
        lines.push('BEGIN:VALARM');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Pengingat: ${this.escapeICalText(task.title)}`);
        lines.push('TRIGGER:-PT30M');
        lines.push('END:VALARM');
      }

      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  // Parse an .ics iCalendar file into TugasKu tasks (Two-way Import from Outlook/Apple/Google)
  static parseICalendar(icsContent: string): Partial<Task>[] {
    const tasks: Partial<Task>[] = [];
    const eventBlocks = icsContent.split('BEGIN:VEVENT');

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i].split('END:VEVENT')[0];
      const getLine = (key: string): string => {
        const match = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'm'));
        return match ? match[1].trim() : '';
      };

      const summary = getLine('SUMMARY') || 'Tugas Tanpa Judul';
      const description = getLine('DESCRIPTION');
      const dtStart = getLine('DTSTART');
      const status = getLine('STATUS');

      let dueDate: string | undefined;
      let dueTime: string | undefined;

      if (dtStart) {
        const clean = dtStart.replace(/[^0-9T]/g, '');
        if (clean.length >= 8) {
          dueDate = `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
        }
        if (clean.includes('T')) {
          const timePart = clean.split('T')[1];
          if (timePart.length >= 4) {
            dueTime = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`;
          }
        }
      }

      tasks.push({
        title: this.unescapeICalText(summary),
        description: description ? this.unescapeICalText(description) : undefined,
        dueDate,
        dueTime,
        category: 'general',
        priority: 'medium',
        status: status === 'COMPLETED' ? 'completed' : 'pending',
        reminderEnabled: true,
        dailyRecurring: false,
      });
    }

    return tasks;
  }

  private static escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private static unescapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }
}
