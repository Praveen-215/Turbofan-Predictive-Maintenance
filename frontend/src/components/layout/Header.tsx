import React from 'react';
import { RefreshCw } from 'lucide-react';
import { StatusIndicator } from '../common/StatusIndicator';
import { Button } from '../common/Button';
import { ConnectionStatus } from '../../hooks/useHealthCheck';

interface HeaderProps {
  title: string;
  subtitle: string;
  status: ConnectionStatus;
  modelName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  status,
  modelName,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <header className="h-16 px-6 bg-navy-900/60 border-b border-border-subtle flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <StatusIndicator status={status} modelName={modelName} />

        {onRefresh && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onRefresh}
            loading={isRefreshing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            title="Refresh Fleet Data"
          >
            Refresh
          </Button>
        )}
      </div>
    </header>
  );
};
