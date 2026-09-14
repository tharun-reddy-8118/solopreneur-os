import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, 
  Clock, FileSignature, Wallet, ChevronDown, Sparkles, Building2, 
  ShieldCheck, Moon, Sun, Plus, Search, ExternalLink, Copy, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenant } from '../context/TenantContext';

export default function Sidebar({ handleLogout, isDarkMode, setIsDarkMode, onClose }) {
  const { tenant, user, setCommandPaletteOpen, setQuickCreateOpen } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [copiedSlug, setCopiedSlug] = useState(false);

  const handleCopyTenantLink = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/t/${tenant.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(true);
    toast.success('Workspace URL copied!');
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const [currentBrandColor, setCurrentBrandColor] = useState(() => {
    return localStorage.getItem('theme_primary') || tenant.brandColor || '#4f46e5';
  });

  useEffect(() => {
    const handleThemeUpdate = () => {
      const saved = localStorage.getItem('theme_primary');
      if (saved) setCurrentBrandColor(saved);
    };
    window.addEventListener('theme-updated', handleThemeUpdate);
    return () => window.removeEventListener('theme-updated', handleThemeUpdate);
  }, []);

  useEffect(() => {
    if (tenant.brandColor) {
      setCurrentBrandColor(tenant.brandColor);
    }
  }, [tenant.brandColor]);

  const baseRoute = `/t/${tenant.slug}`;

  // Helper to determine if link is active
  const checkActive = (item) => {
    const current = location.pathname.replace(/\/$/, '') || '/';
    const primary = item.to.replace(/\/$/, '') || '/';
    const alt = item.altTo ? (item.altTo.replace(/\/$/, '') || '/') : null;

    if (item.isExact) {
      return current === primary || current === alt;
    }

    return (
      current === primary ||
      (alt && current === alt) ||
      current.startsWith(`${primary}/`) ||
      (alt && alt !== '/' && current.startsWith(`${alt}/`))
    );
  };

  const isOwnerOrAdmin = user?.role === 'Owner' || user?.role === 'Admin';

  const navGroups = [
    {
      label: 'WORKSPACE',
      items: [
        { to: `${baseRoute}`, altTo: '/', icon: LayoutDashboard, label: 'Overview', isExact: true },
        { to: `${baseRoute}/projects`, altTo: '/projects', icon: Briefcase, label: 'Projects' },
        ...(isOwnerOrAdmin ? [{ to: `${baseRoute}/clients`, altTo: '/clients', icon: Users, label: 'Clients' }] : []),
        { to: `${baseRoute}/timesheets`, altTo: '/timesheets', icon: Clock, label: 'Timesheets' },
      ],
    },
    ...(isOwnerOrAdmin ? [
      {
        label: 'FINANCE & SALES',
        items: [
          { to: `${baseRoute}/invoices`, altTo: '/invoices', icon: FileText, label: 'Invoices' },
          { to: `${baseRoute}/proposals`, altTo: '/proposals', icon: FileSignature, label: 'Proposals' },
          { to: `${baseRoute}/expenses`, altTo: '/expenses', icon: Wallet, label: 'Expenses' },
        ],
      },
    ] : []),
    {
      label: 'ORGANIZATION',
      items: [
        ...(isOwnerOrAdmin ? [{ to: `${baseRoute}/team`, altTo: '/team', icon: ShieldCheck, label: 'Team & Access' }] : []),
        { to: `${baseRoute}/settings`, altTo: '/settings', icon: Settings, label: isOwnerOrAdmin ? 'Settings & Brand' : 'Account Settings' },
      ],
    },
  ];

  return (
    <aside className="w-64 h-full flex flex-col justify-between bg-white/95 dark:bg-[#0e1320] border-r border-slate-200/80 dark:border-slate-800/80 select-none shadow-sm">
      {/* Top Tenant Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                <img 
                  src={tenant.logoUrl} 
                  alt={tenant.name} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }
                  }}
                />
                <div 
                  className="w-full h-full hidden items-center justify-center font-black text-white text-xs rounded-lg"
                  style={{ backgroundColor: currentBrandColor }}
                >
                  {tenant.name.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm transition-colors duration-200 shrink-0"
                style={{ backgroundColor: currentBrandColor }}
              >
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {tenant.name}
              </h2>
              <button
                onClick={handleCopyTenantLink}
                title="Click to copy Workspace URL"
                className="flex items-center gap-1.5 group/slug text-left mt-0.5 cursor-pointer"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 group-hover/slug:text-slate-700 dark:group-hover/slug:text-slate-300 truncate transition-colors">
                  /t/{tenant.slug}
                </span>
                {copiedSlug ? (
                  <Check size={11} className="text-emerald-500 shrink-0" />
                ) : (
                  <Copy size={11} className="text-slate-400 opacity-0 group-hover/slug:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Search Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 text-xs font-medium transition-all group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            <span>Search workspace...</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-500 shadow-xs border border-slate-200 dark:border-slate-700">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = checkActive(item);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all group ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={17}
                        className="transition-colors"
                        style={{ color: active ? currentBrandColor : undefined }}
                      />
                      <span>{item.label}</span>
                    </div>
                    {active && (
                      <span 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: currentBrandColor }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer User Info & Controls */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {user.name}
              </div>
              <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                {user.role || 'Admin'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
