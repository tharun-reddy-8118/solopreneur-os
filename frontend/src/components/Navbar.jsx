import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Play, Pause, RotateCcw, Plus, Search, 
  Menu, Bell, ExternalLink, Sparkles 
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export default function Navbar({ onOpenMobileMenu }) {
  const { tenant, user, activeTimer, startTimer, pauseTimer, resetTimer, setCommandPaletteOpen, setQuickCreateOpen } = useTenant();
  const location = useLocation();

  // Compute active page title
  const pathSegments = location.pathname
    .replace(`/t/${tenant.slug}`, '')
    .split('/')
    .filter(Boolean);

  const currentPageTitle = pathSegments.length > 0 
    ? pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)
    : 'Overview';

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="h-16 px-6 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left: Mobile menu button + Clean Page Heading */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>

        {/* Mobile-only compact logo when sidebar is hidden */}
        {tenant.logoUrl && (
          <img 
            src={tenant.logoUrl} 
            alt={tenant.name} 
            className="h-6 w-auto max-w-[70px] object-contain rounded md:hidden" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
            {currentPageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Live Stopwatch Widget & Action Controls */}
      <div className="flex items-center gap-3">
        {/* Global Stopwatch Pill */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1.5 shadow-xs">
          <div className="flex items-center gap-2 mr-2">
            <span className={`w-2 h-2 rounded-full ${activeTimer.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
              {formatTime(activeTimer.seconds)}
            </span>
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
            {activeTimer.isRunning ? (
              <button
                onClick={pauseTimer}
                title="Pause Stopwatch"
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 transition-colors"
              >
                <Pause size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={() => startTimer()}
                title="Start Stopwatch"
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 transition-colors"
              >
                <Play size={12} fill="currentColor" />
              </button>
            )}

            {activeTimer.seconds > 0 && !activeTimer.isRunning && (
              <button
                onClick={resetTimer}
                title="Reset Stopwatch"
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Global Quick Action Button */}
        <button
          onClick={() => setQuickCreateOpen('client')}
          className="btn-primary !py-1.5 !px-3 text-xs hidden sm:inline-flex"
        >
          <Plus size={15} />
          <span>New</span>
        </button>

        {/* Command-K Shortcut trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Command Palette (Cmd+K)"
        >
          <Search size={18} />
        </button>
      </div>
    </header>
  );
}
