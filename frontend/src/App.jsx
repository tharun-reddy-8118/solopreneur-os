import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, Clock, FileSignature, Wallet, Menu, X, Moon, Sun } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

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
    return <Auth onLogin={(token) => { 
      localStorage.setItem('token', token);
      setIsAuthenticated(true); 
    }} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ className: 'glass-card dark:bg-slate-800 dark:text-white' }} />
      <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-30">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
            <h1 className="text-lg font-black bg-gradient-to-br from-slate-900 to-indigo-900 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent">SolopreneurOS</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
            <Menu size={24} />
          </button>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-col py-6 pl-6 z-20">
          <Sidebar 
            handleLogout={handleLogout} 
            isDarkMode={isDarkMode} 
            setIsDarkMode={setIsDarkMode} 
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div 
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="fixed inset-y-0 left-0 w-72 p-4 z-50 md:hidden"
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

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative z-10 px-4 md:px-10 py-6">
          <div className="max-w-6xl mx-auto h-full">
            <Routes>
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
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Sidebar({ handleLogout, isDarkMode, setIsDarkMode, onClose }) {
  return (
    <aside className="w-full glass-sidebar border-r border-slate-200/60 dark:border-slate-700/50 flex flex-col h-full shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] relative transition-all duration-300 bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl md:rounded-none md:rounded-l-2xl">
      <div className="p-6 pb-2 flex justify-between items-center">
        <div className="flex items-center gap-3 mb-4 md:mb-8 px-2">
          <img src="/logo.png" alt="SolopreneurOS Logo" className="h-8 w-8 object-contain drop-shadow-sm" />
          <h1 className="text-xl font-black bg-gradient-to-br from-slate-900 to-indigo-900 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">SolopreneurOS</h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 mb-4 md:hidden text-slate-500 dark:text-slate-400">
            <X size={20} />
          </button>
        )}
      </div>
      
      <nav className="flex-1 px-4 py-4 md:py-8 space-y-2 mt-4 overflow-y-auto">
        <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Overview" onClick={onClose} />
        <NavItem to="/clients" icon={<Users size={20} />} label="Clients" onClick={onClose} />
        <NavItem to="/projects" icon={<Briefcase size={20} />} label="Projects" onClick={onClose} />
        <NavItem to="/proposals" icon={<FileSignature size={20} />} label="Proposals" onClick={onClose} />
        <NavItem to="/timesheets" icon={<Clock size={20} />} label="Timesheets" onClick={onClose} />
        <NavItem to="/invoices" icon={<FileText size={20} />} label="Invoices" onClick={onClose} />
        <NavItem to="/expenses" icon={<Wallet size={20} />} label="Expenses" onClick={onClose} />
        <NavItem to="/team" icon={<Users size={20} />} label="Team" onClick={onClose} />
      </nav>

      <div className="p-4 border-t border-slate-700/10 dark:border-slate-700/50 space-y-2">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
            <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${isDarkMode ? 'bg-indigo-500 justify-end' : 'bg-slate-300 justify-start'}`}>
            <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
          </div>
        </button>

        <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" onClick={onClose} />
        <button 
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900 hover:-translate-y-[1px]"
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ to, icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`
        flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold tracking-wide border
        ${isActive 
          ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-indigo-100 dark:border-indigo-900/50 scale-[1.02]' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:-translate-y-[1px]'}
      `}
    >
      <div className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
        {icon}
      </div>
      <span>{label}</span>
      {isActive && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_8px_rgba(79,70,229,0.5)] animate-pulse" />
      )}
    </Link>
  );
}

export default App;
