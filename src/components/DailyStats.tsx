import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Repeat, Flame } from 'lucide-react';
import { FilterTimeScope } from '../types';

interface DailyStatsProps {
  totalActive: number;
  completedTodayCount: number;
  overdueCount: number;
  recurringCount: number;
  currentScope: FilterTimeScope;
  onSelectScope: (scope: FilterTimeScope) => void;
}

export const DailyStats: React.FC<DailyStatsProps> = ({
  totalActive,
  completedTodayCount,
  overdueCount,
  recurringCount,
  currentScope,
  onSelectScope,
}) => {
  const cards = [
    {
      id: 'all' as FilterTimeScope,
      label: 'Tugas Belum Selesai',
      count: totalActive,
      icon: Clock,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20',
    },
    {
      id: 'today' as FilterTimeScope,
      label: 'Selesai Hari Ini',
      count: completedTodayCount,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
    },
    {
      id: 'overdue' as FilterTimeScope,
      label: 'Tugas Terlewat (Overdue)',
      count: overdueCount,
      icon: AlertTriangle,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
    },
    {
      id: 'recurring' as FilterTimeScope,
      label: 'Rutinitas Harian',
      count: recurringCount,
      icon: Repeat,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
      activeBorder: 'border-cyan-500 ring-2 ring-cyan-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = currentScope === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectScope(card.id)}
            className={`text-left p-4 rounded-xl bg-white border transition-all text-slate-800 shadow-sm hover:shadow hover:-translate-y-0.5 cursor-pointer ${
              isSelected ? card.activeBorder : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 truncate">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{card.count}</span>
              <span className="text-xs text-slate-400">tugas</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
