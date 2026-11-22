import React from 'react';
import { ConnectionStatus } from '../../hooks/useHealthCheck';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  modelName?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  modelName,
  className = '',
}) => {
  if (status === 'checking') {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
        <span>Connecting to API...</span>
      </div>
    );
  }

  if (status === 'healthy') {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-300 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-medium">Backend Connected</span>
        {modelName && (
          <span className="hidden sm:inline-block text-emerald-500 border-l border-emerald-800/60 pl-2 font-mono text-[11px]">
            {modelName}
          </span>
        )}
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/50 border border-amber-800/60 text-xs text-amber-300 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="font-medium">Backend Offline</span>
        <span className="hidden sm:inline-block text-amber-400/80 border-l border-amber-800/60 pl-2">
          Port 8000
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-rose-400" />
      <span className="font-medium">Backend Unhealthy</span>
    </div>
  );
};
