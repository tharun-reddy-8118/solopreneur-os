import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, gql } from 'urql';
import { applyTheme } from '../theme';

const GET_CURRENT_WORKSPACE = gql`
  query GetCurrentWorkspace {
    me {
      id
      name
      email
      role
      currencyPreference
      organizationId
    }
    organization {
      id
      name
      brandColor
      logoUrl
    }
  }
`;

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [result, reexecuteQuery] = useQuery({ 
    query: GET_CURRENT_WORKSPACE,
    requestPolicy: 'cache-and-network'
  });
  const { data, fetching, error } = result;

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Global Persistent Timer state
  const [activeTimer, setActiveTimer] = useState(() => {
    const saved = localStorage.getItem('solopreneur_active_timer');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { isRunning: false, seconds: 0, taskName: '', projectName: '' };
      }
    }
    return { isRunning: false, seconds: 0, taskName: '', projectName: '' };
  });

  // Tick the timer every second if running
  useEffect(() => {
    let interval = null;
    if (activeTimer.isRunning) {
      interval = setInterval(() => {
        setActiveTimer(prev => {
          const updated = { ...prev, seconds: prev.seconds + 1 };
          localStorage.setItem('solopreneur_active_timer', JSON.stringify(updated));
          return updated;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer.isRunning]);

  const startTimer = (taskName = 'General Work', projectName = 'General') => {
    const updated = { isRunning: true, seconds: activeTimer.seconds, taskName, projectName };
    setActiveTimer(updated);
    localStorage.setItem('solopreneur_active_timer', JSON.stringify(updated));
  };

  const pauseTimer = () => {
    const updated = { ...activeTimer, isRunning: false };
    setActiveTimer(updated);
    localStorage.setItem('solopreneur_active_timer', JSON.stringify(updated));
  };

  const resetTimer = () => {
    const updated = { isRunning: false, seconds: 0, taskName: '', projectName: '' };
    setActiveTimer(updated);
    localStorage.setItem('solopreneur_active_timer', JSON.stringify(updated));
  };

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update theme colors dynamically when organization data loads
  useEffect(() => {
    if (data?.organization?.brandColor) {
      applyTheme(data.organization.brandColor);
    }
  }, [data?.organization?.brandColor]);

  // Compute tenant information and slug
  const orgName = data?.organization?.name || 'Workspace';
  const tenantSlug = orgName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'default';

  const tenant = {
    id: data?.organization?.id,
    name: orgName,
    slug: tenantSlug,
    brandColor: data?.organization?.brandColor || '#4f46e5',
    logoUrl: data?.organization?.logoUrl,
    plan: 'Enterprise Pro',
  };

  const user = data?.me || {
    name: 'Solopreneur',
    email: 'user@solopreneuros.com',
    role: 'Owner',
    currencyPreference: 'USD',
  };

  const value = {
    tenant,
    user,
    fetching,
    error,
    refetchTenant: () => reexecuteQuery({ requestPolicy: 'network-only' }),
    commandPaletteOpen,
    setCommandPaletteOpen,
    quickCreateOpen,
    setQuickCreateOpen,
    activeTimer,
    startTimer,
    pauseTimer,
    resetTimer,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
