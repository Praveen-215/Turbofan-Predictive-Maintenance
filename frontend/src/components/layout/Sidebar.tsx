import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Gauge,
  Cpu,
  BarChart3,
  FileText,
  ShieldAlert,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    name: 'Fleet Overview',
    path: '/',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    name: 'Engine Monitoring',
    path: '/engines',
    icon: <Gauge className="w-4 h-4" />,
  },
  {
    name: 'AI Predictions',
    path: '/predictions',
    icon: <Cpu className="w-4 h-4" />,
  },
  {
    name: 'Model Analytics',
    path: '/analytics',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: <FileText className="w-4 h-4" />,
  },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-navy-900 border-r border-border-subtle flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border-subtle flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-wider text-white font-mono flex items-center gap-1.5">
            TURBOGUARD <span className="text-cyan-400 text-xs font-semibold px-1 py-0.2 bg-cyan-950 border border-cyan-800 rounded">AI</span>
          </div>
          <div className="text-[10px] text-slate-400 tracking-tight">NASA C-MAPSS FD001 RUL</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Mission Control
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              {item.icon}
              <span>{item.name}</span>
            </div>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Architecture Spec Footer */}
      <div className="p-4 border-t border-border-subtle text-[11px] text-slate-400 space-y-2 bg-navy-950/50">
        <div className="flex justify-between items-center text-slate-400 font-mono text-[10px]">
          <span>STACKED LSTM</span>
          <span className="text-cyan-400 font-semibold">15.10 RMSE</span>
        </div>
        <div className="text-[10px] text-slate-400 leading-tight">
          FD001 Turbofan Test Fleet: 100 engines monitored with 30-cycle temporal window.
        </div>
      </div>
    </aside>
  );
};
