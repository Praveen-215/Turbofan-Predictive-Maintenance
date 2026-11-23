import React from 'react';
import { Card } from './Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  badge,
  className = '',
}) => {
  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <div className="text-2xl font-bold tracking-tight text-white font-mono">{value}</div>
          {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-navy-850 border border-border-subtle text-cyan-400">
            {icon}
          </div>
        )}
      </div>
      {badge && <div className="mt-3 pt-3 border-t border-border-subtle">{badge}</div>}
    </Card>
  );
};
