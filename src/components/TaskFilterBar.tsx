import React from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  Calendar,
  Clock,
  AlertCircle,
  Repeat,
  Tag,
  X,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { FilterTimeScope, TaskCategory, TaskPriority } from '../types';

interface TaskFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  scope: FilterTimeScope;
  onScopeChange: (scope: FilterTimeScope) => void;
  selectedCategory: TaskCategory | 'all';
  onCategoryChange: (cat: TaskCategory | 'all') => void;
  selectedPriority: TaskPriority | 'all';
  onPriorityChange: (prio: TaskPriority | 'all') => void;
  counts: {
    all: number;
    today: number;
    tomorrow: number;
    overdue: number;
    recurring: number;
    completed: number;
    trash: number;
  };
  onEmptyTrash?: () => void;
}

export const CATEGORIES: { id: TaskCategory | 'all'; label: string; dotColor: string }[] = [
  { id: 'all', label: 'Semua Kategori', dotColor: 'bg-slate-400' },
  { id: 'work', label: 'Pekerjaan', dotColor: 'bg-blue-500' },
  { id: 'personal', label: 'Pribadi', dotColor: 'bg-purple-500' },
  { id: 'study', label: 'Belajar', dotColor: 'bg-amber-500' },
  { id: 'health', label: 'Kesehatan', dotColor: 'bg-emerald-500' },
  { id: 'urgent', label: 'Mendesak', dotColor: 'bg-rose-500' },
  { id: 'general', label: 'Umum', dotColor: 'bg-slate-500' },
];

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  scope,
  onScopeChange,
  selectedCategory,
  onCategoryChange,
  selectedPriority,
  onPriorityChange,
  counts,
}) => {
  const timeScopes: { id: FilterTimeScope; label: string; count: number; icon: React.FC<{ className?: string }> }[] = [
    { id: 'all', label: 'Semua Aktif', count: counts.all, icon: Clock },
    { id: 'today', label: 'Hari Ini', count: counts.today, icon: Calendar },
    { id: 'tomorrow', label: 'Besok', count: counts.tomorrow, icon: Calendar },
    { id: 'overdue', label: 'Terlewat', count: counts.overdue, icon: AlertCircle },
    { id: 'recurring', label: 'Rutinitas Harian', count: counts.recurring, icon: Repeat },
    { id: 'completed', label: 'Telah Selesai', count: counts.completed, icon: CheckCircle },
    { id: 'trash', label: 'Tempat Sampah', count: counts.trash, icon: Trash2 },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Search & Priority Selector Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari tugas berdasarkan judul atau keterangan..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter & Empty Trash action */}
        <div className="flex items-center gap-2 shrink-0">
          {scope === 'trash' && counts.trash > 0 && onEmptyTrash && (
            <button
              onClick={onEmptyTrash}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Sampah ({counts.trash})</span>
            </button>
          )}
          <div className="relative">
            <select
              value={selectedPriority}
              onChange={(e) => onPriorityChange(e.target.value as TaskPriority | 'all')}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Prioritas</option>
              <option value="urgent">Prioritas: Sangat Mendesak</option>
              <option value="high">Prioritas: Tinggi</option>
              <option value="medium">Prioritas: Sedang</option>
              <option value="low">Prioritas: Rendah</option>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Time Scope Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {timeScopes.map((tab) => {
          const Icon = tab.icon;
          const isActive = scope === tab.id;
          const isOverdueTab = tab.id === 'overdue' && tab.count > 0;

          return (
            <button
              key={tab.id}
              onClick={() => onScopeChange(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isOverdueTab
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
              <span>{tab.label}</span>
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  isActive
                    ? 'bg-indigo-700/60 text-white'
                    : isOverdueTab
                    ? 'bg-rose-200 text-rose-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-slate-400 font-medium text-xs flex items-center gap-1 mr-1 shrink-0">
          <Tag className="w-3 h-3" />
          Kategori:
        </span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
