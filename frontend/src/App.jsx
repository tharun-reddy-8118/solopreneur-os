import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { TenantProvider } from './context/TenantContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import QuickCreateModal from './components/QuickCreateModal';

import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import Auth from './pages/Auth';
import SettingsPage from './pages/SettingsPage';
import ProjectBoard from './pages/ProjectBoard';
import Team from './pages/Team';
import Timesheets from './pages/Timesheets';
import Proposals from './pages/Proposals';
import Expenses from './pages/Expenses';
import ClientPortal from './pages/ClientPortal';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  // Support public client portal route without authentication
  const isPortalRoute = window.location.pathname.startsWith('/portal');

  if (isPortalRoute) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/portal/:token" element={<ClientPortal />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (!isAuthenticated) {
    return (
      <Auth 
        onLogin={(token) => { 
          localStorage.setItem('token', token);
          setIsAuthenticated(true); 
        }} 
      />
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('solopreneur_active_timer');
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <TenantProvider>
        <Toaster 
          position="bottom-right" 
          toastOptions={{ 
            className: 'glass-card dark:bg-[#111726] dark:text-white dark:border-slate-800 text-sm font-semibold shadow-xl',
            duration: 3500 
          }} 
        />
        
        {/* Global Command Palette & Quick Create */}
        <CommandPalette />
        <QuickCreateModal />

        <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
          
          {/* Desktop Left Sidebar */}
          <div className="hidden md:flex shrink-0 h-full">
            <Sidebar 
              handleLogout={handleLogout} 
              isDarkMode={isDarkMode} 
              setIsDarkMode={setIsDarkMode} 
            />
          </div>

          {/* Mobile Sidebar Modal */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
                />
                <motion.div 
                  initial={{ x: '-100%' }} 
                  animate={{ x: 0 }} 
                  exit={{ x: '-100%' }} 
                  transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                  className="fixed inset-y-0 left-0 w-72 z-50 md:hidden shadow-2xl"
                >
                  <Sidebar 
                    handleLogout={handleLogout} 
                    isDarkMode={isDarkMode} 
                    setIsDarkMode={setIsDarkMode} 
                    onClose={() => setIsMobileMenuOpen(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main Content Workspace Column */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Workspace Header */}
            <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

            {/* Scrollable Viewport Area */}
            <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
              <div className="max-w-7xl mx-auto h-full">
                <Routes>
                  {/* Standard Base Workspace Routes */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectBoard />} />
                  <Route path="/proposals" element={<Proposals />} />
                  <Route path="/timesheets" element={<Timesheets />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Multi-Tenant URL-Scoped Routes (/t/:tenantSlug/*) */}
                  <Route path="/t/:tenantSlug" element={<Dashboard />} />
                  <Route path="/t/:tenantSlug/clients" element={<Clients />} />
                  <Route path="/t/:tenantSlug/projects" element={<Projects />} />
                  <Route path="/t/:tenantSlug/projects/:id" element={<ProjectBoard />} />
                  <Route path="/t/:tenantSlug/proposals" element={<Proposals />} />
                  <Route path="/t/:tenantSlug/timesheets" element={<Timesheets />} />
                  <Route path="/t/:tenantSlug/invoices" element={<Invoices />} />
                  <Route path="/t/:tenantSlug/expenses" element={<Expenses />} />
                  <Route path="/t/:tenantSlug/team" element={<Team />} />
                  <Route path="/t/:tenantSlug/settings" element={<SettingsPage />} />

                  {/* Fallback to root */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>

        </div>
      </TenantProvider>
    </BrowserRouter>
  );
}

export default App;
