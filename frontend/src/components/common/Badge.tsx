import React from 'react';

export type BadgeVariant = 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dotColor: string; border: string }> = {
  cyan: {
    bg: 'bg-cyan-950/60',
    text: 'text-cyan-400',
    dotColor: 'bg-cyan-400',
    border: 'border-cyan-800/50',
  },
  emerald: {
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    border: 'border-emerald-800/50',
  },
  amber: {
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    dotColor: 'bg-amber-400',
    border: 'border-amber-800/50',
  },
  rose: {
    bg: 'bg-rose-950/60',
    text: 'text-rose-400',
    dotColor: 'bg-rose-400',
    border: 'border-rose-800/50',
  },
  slate: {
    bg: 'bg-slate-900',
    text: 'text-slate-400',
    dotColor: 'bg-slate-400',
    border: 'border-slate-800',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  className = '',
  dot = false,
}) => {
  const style = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor}`} />}
      {children}
    </span>
  );
};
