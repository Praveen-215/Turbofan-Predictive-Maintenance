import React from 'react';
import { LucideIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

interface ComingSoonPageProps {
  title: string;
  subtitle: string;
  phase: string;
  icon: LucideIcon;
  plannedFeatures: string[];
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  title,
  subtitle,
  phase,
  icon: Icon,
  plannedFeatures,
}) => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate('/')}
          icon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          Back to Fleet Overview
        </Button>
      </div>

      <Card className="text-center py-12 px-6 space-y-5">
        <div className="w-14 h-14 mx-auto rounded-xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
          <Icon className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
            <Badge variant="cyan">{phase}</Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{subtitle}</p>
        </div>

        <div className="max-w-md mx-auto pt-4 border-t border-border-subtle text-left">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Planned Module Capabilities:
          </p>
          <ul className="space-y-2 text-xs text-slate-400">
            {plannedFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
};
