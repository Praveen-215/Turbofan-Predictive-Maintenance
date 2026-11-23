import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isOffline?: boolean;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'API Communication Error',
  message,
  onRetry,
  isOffline = false,
  className = '',
}) => {
  return (
    <div
      className={`border rounded-lg p-5 ${
        isOffline
          ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
          : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`w-5 h-5 shrink-0 mt-0.5 ${isOffline ? 'text-amber-400' : 'text-rose-400'}`}
        />
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-semibold tracking-tight">
            {isOffline ? 'TURBOGUARD AI Backend Offline' : title}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
          {isOffline && (
            <div className="mt-2.5 pt-2.5 border-t border-amber-800/40 text-xs text-slate-400">
              <span className="font-mono text-amber-300/90">Hint:</span> Run{' '}
              <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                .venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
              </code>{' '}
              from the project root to start the backend.
            </div>
          )}
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onRetry}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};
