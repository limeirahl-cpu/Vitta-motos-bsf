import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  onClick?: () => void;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  onClick,
  trend,
}) => {
  const colorStyles = {
    blue: {
      iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
      hover: 'hover:border-sky-300',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      hover: 'hover:border-emerald-300',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      hover: 'hover:border-amber-300',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      hover: 'hover:border-rose-300',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      hover: 'hover:border-purple-300',
    },
    slate: {
      iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
      hover: 'hover:border-slate-300',
    },
  }[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-xs transition-all ${
        onClick ? `cursor-pointer hover:shadow-md ${colorStyles.hover}` : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${colorStyles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        {trend && (
          <p className="mt-2 text-xs font-medium text-emerald-600 flex items-center gap-1">
            {trend}
          </p>
        )}
      </div>
    </div>
  );
};
