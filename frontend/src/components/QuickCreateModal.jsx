import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Users, Briefcase, FileText, Loader2 } from 'lucide-react';
import { useMutation, gql } from 'urql';
import toast from 'react-hot-toast';
import { useTenant } from '../context/TenantContext';

const ADD_CLIENT_MUTATION = gql`
  mutation QuickAddClient($name: String!, $email: String!) {
    addClient(name: $name, email: $email) {
      id
      name
      email
    }
  }
`;

const CREATE_PROJECT_MUTATION = gql`
  mutation QuickCreateProject($clientId: Int!, $name: String!, $description: String, $hourlyRate: Float) {
    createProject(clientId: $clientId, name: $name, description: $description, hourlyRate: $hourlyRate) {
      id
      name
    }
  }
`;

export default function QuickCreateModal() {
  const { quickCreateOpen, setQuickCreateOpen, user } = useTenant();
  const canManageClients = user?.role === 'Owner' || user?.role === 'Admin';
  const initialTab = (typeof quickCreateOpen === 'string' && (canManageClients || quickCreateOpen !== 'client')) 
    ? quickCreateOpen 
    : (canManageClients ? 'client' : 'project');
  const [tab, setTab] = useState(initialTab);

  // Client form state
  const [clientForm, setClientForm] = useState({ name: '', email: '' });
  const [addClientResult, executeAddClient] = useMutation(ADD_CLIENT_MUTATION);

  if (!quickCreateOpen) return null;

  const currentTab = (typeof quickCreateOpen === 'string' && (canManageClients || quickCreateOpen !== 'client')) 
    ? quickCreateOpen 
    : tab;

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!canManageClients) {
      toast.error('Only Workspace Owners and Admins can create clients.');
      return;
    }
    if (!clientForm.name || !clientForm.email) {
      toast.error('Please provide name and email');
      return;
    }
    const res = await executeAddClient(clientForm);
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(`Client "${clientForm.name}" created successfully!`);
      setClientForm({ name: '', email: '' });
      setQuickCreateOpen(false);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        onClick={() => setQuickCreateOpen(false)}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 z-50"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-primary-light text-brand-primary">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Quick Create</h3>
              <p className="text-xs text-slate-500">Add resources to your tenant workspace</p>
            </div>
          </div>
          <button 
            onClick={() => setQuickCreateOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 my-4 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          {canManageClients && (
            <button
              type="button"
              onClick={() => setTab('client')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                currentTab === 'client' 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={14} /> Client
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setQuickCreateOpen(false);
              window.location.href = '/projects';
            }}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2"
          >
            <Briefcase size={14} /> Project
          </button>
          <button
            type="button"
            onClick={() => {
              setQuickCreateOpen(false);
              window.location.href = '/invoices';
            }}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2"
          >
            <FileText size={14} /> Invoice
          </button>
        </div>

        {/* Quick Add Client Form */}
        {currentTab === 'client' && (
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Client / Company Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp or Jane Doe"
                value={clientForm.name}
                onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                className="glass-input"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="client@company.com"
                value={clientForm.email}
                onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                className="glass-input"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickCreateOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addClientResult.fetching}
                className="btn-primary"
              >
                {addClientResult.fetching ? <Loader2 size={16} className="animate-spin" /> : 'Create Client'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
