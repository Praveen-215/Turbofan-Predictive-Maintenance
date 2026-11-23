import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading data...',
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-8 ${className}`}>
      <div
        className={`${sizeMap[size]} border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin`}
      />
      {label && <span className="text-xs text-slate-400 font-medium tracking-wide">{label}</span>}
    </div>
  );
};
