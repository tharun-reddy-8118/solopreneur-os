import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, LayoutDashboard, Briefcase, Users, Clock, FileText, 
  FileSignature, Wallet, Settings, Shield, Plus, X, ArrowRight, ExternalLink
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, tenant, setQuickCreateOpen } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const baseTenantPath = `/t/${tenant.slug}`;

  const commands = [
    {
      id: 'dash',
      title: 'Go to Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => navigate(`${baseTenantPath}/`),
    },
    {
      id: 'projects',
      title: 'Go to Projects',
      category: 'Navigation',
      icon: Briefcase,
      action: () => navigate(`${baseTenantPath}/projects`),
    },
    {
      id: 'clients',
      title: 'Go to Clients',
      category: 'Navigation',
      icon: Users,
      action: () => navigate(`${baseTenantPath}/clients`),
    },
    {
      id: 'timesheets',
      title: 'Go to Timesheets',
      category: 'Navigation',
      icon: Clock,
      action: () => navigate(`${baseTenantPath}/timesheets`),
    },
    {
      id: 'invoices',
      title: 'Go to Invoices',
      category: 'Navigation',
      icon: FileText,
      action: () => navigate(`${baseTenantPath}/invoices`),
    },
    {
      id: 'proposals',
      title: 'Go to Proposals',
      category: 'Navigation',
      icon: FileSignature,
      action: () => navigate(`${baseTenantPath}/proposals`),
    },
    {
      id: 'expenses',
      title: 'Go to Expenses',
      category: 'Navigation',
      icon: Wallet,
      action: () => navigate(`${baseTenantPath}/expenses`),
    },
    {
      id: 'team',
      title: 'Go to Team & Access',
      category: 'Navigation',
      icon: Shield,
      action: () => navigate(`${baseTenantPath}/team`),
    },
    {
      id: 'settings',
      title: 'Go to Settings & Branding',
      category: 'Navigation',
      icon: Settings,
      action: () => navigate(`${baseTenantPath}/settings`),
    },
    {
      id: 'create-client',
      title: 'Quick Create: New Client',
      category: 'Quick Actions',
      icon: Plus,
      action: () => {
        setCommandPaletteOpen(false);
        setQuickCreateOpen('client');
      },
    },
    {
      id: 'create-project',
      title: 'Quick Create: New Project',
      category: 'Quick Actions',
      icon: Plus,
      action: () => {
        setCommandPaletteOpen(false);
        setQuickCreateOpen('project');
      },
    },
    {
      id: 'create-invoice',
      title: 'Quick Create: New Invoice',
      category: 'Quick Actions',
      icon: Plus,
      action: () => {
        setCommandPaletteOpen(false);
        setQuickCreateOpen('invoice');
      },
    },
  ];

  const filtered = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!commandPaletteOpen) {
      setSearchQuery('');
    }
  }, [commandPaletteOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      setCommandPaletteOpen(false);
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandPaletteOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search pages... (e.g. Invoices, Projects)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-sm font-medium"
              />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                ESC
              </span>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No matching actions or pages found.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setCommandPaletteOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          <Icon size={16} />
                        </div>
                        <span className="font-semibold">{item.title}</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">
                        {item.category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Tenant:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">/t/{tenant.slug}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Navigate: <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">↑</kbd> <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">↓</kbd></span>
                <span>Select: <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">↵</kbd></span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
