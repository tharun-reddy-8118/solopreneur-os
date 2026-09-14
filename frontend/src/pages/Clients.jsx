import React, { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { 
  Loader2, Plus, Users, Edit2, Check, X, Search, 
  Copy, CheckCheck, FolderKanban, Mail, Building2, 
  Phone, Globe, Shield, MapPin, DollarSign, FileText, 
  CreditCard, Trash2, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../components/EmptyState';
import { useTenant } from '../context/TenantContext';

const GET_CLIENTS = gql`
  query GetClients {
    me {
      id
      role
    }
    clients {
      id
      name
      contactPerson
      email
      phone
      website
      taxId
      billingAddress
      city
      state
      postalCode
      country
      currency
      paymentTerms
      clientTier
      notes
      portalToken
      projects {
        id
        name
      }
    }
  }
`;

const ADD_CLIENT = gql`
  mutation AddClient(
    $name: String!, 
    $email: String!,
    $contactPerson: String,
    $phone: String,
    $website: String,
    $taxId: String,
    $billingAddress: String,
    $city: String,
    $state: String,
    $postalCode: String,
    $country: String,
    $currency: String,
    $paymentTerms: String,
    $clientTier: String,
    $notes: String
  ) {
    addClient(
      name: $name, 
      email: $email,
      contactPerson: $contactPerson,
      phone: $phone,
      website: $website,
      taxId: $taxId,
      billingAddress: $billingAddress,
      city: $city,
      state: $state,
      postalCode: $postalCode,
      country: $country,
      currency: $currency,
      paymentTerms: $paymentTerms,
      clientTier: $clientTier,
      notes: $notes
    ) {
      id
      name
      email
    }
  }
`;

const UPDATE_CLIENT = gql`
  mutation UpdateClient(
    $clientId: Int!, 
    $name: String!, 
    $email: String!,
    $contactPerson: String,
    $phone: String,
    $website: String,
    $taxId: String,
    $billingAddress: String,
    $city: String,
    $state: String,
    $postalCode: String,
    $country: String,
    $currency: String,
    $paymentTerms: String,
    $clientTier: String,
    $notes: String
  ) {
    updateClient(
      clientId: $clientId, 
      name: $name, 
      email: $email,
      contactPerson: $contactPerson,
      phone: $phone,
      website: $website,
      taxId: $taxId,
      billingAddress: $billingAddress,
      city: $city,
      state: $state,
      postalCode: $postalCode,
      country: $country,
      currency: $currency,
      paymentTerms: $paymentTerms,
      clientTier: $clientTier,
      notes: $notes
    ) {
      id
      name
      email
    }
  }
`;

const DELETE_CLIENT = gql`
  mutation DeleteClient($clientId: Int!) {
    deleteClient(clientId: $clientId)
  }
`;

const defaultFormState = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  website: '',
  taxId: '',
  billingAddress: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  currency: 'USD',
  paymentTerms: 'Net 30',
  clientTier: 'Enterprise',
  notes: ''
};

export default function Clients() {
  const { tenant, user } = useTenant();
  const [result, reexecuteQuery] = useQuery({ query: GET_CLIENTS });
  const { data, fetching, error } = result;
  
  const userRole = data?.me?.role || user?.role;
  const canManageClients = userRole === 'Owner' || userRole === 'Admin';
  
  const [addClientResult, executeAddClient] = useMutation(ADD_CLIENT);
  const [updateClientResult, executeUpdateClient] = useMutation(UPDATE_CLIENT);
  const [, executeDeleteClient] = useMutation(DELETE_CLIENT);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('general');
  const [editingClientId, setEditingClientId] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTokenId, setCopiedTokenId] = useState(null);

  const openAddModal = () => {
    if (!canManageClients) {
      toast.error('Only Workspace Owners and Admins can register clients.');
      return;
    }
    setEditingClientId(null);
    setFormData(defaultFormState);
    setActiveModalTab('general');
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    if (!canManageClients) {
      toast.error('Only Workspace Owners and Admins can edit client details.');
      return;
    }
    setEditingClientId(client.id);
    setFormData({
      name: client.name || '',
      contactPerson: client.contactPerson || '',
      email: client.email || '',
      phone: client.phone || '',
      website: client.website || '',
      taxId: client.taxId || '',
      billingAddress: client.billingAddress || '',
      city: client.city || '',
      state: client.state || '',
      postalCode: client.postalCode || '',
      country: client.country || '',
      currency: client.currency || 'USD',
      paymentTerms: client.paymentTerms || 'Net 30',
      clientTier: client.clientTier || 'Enterprise',
      notes: client.notes || ''
    });
    setActiveModalTab('general');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClientId(null);
    setFormData(defaultFormState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Company Name and Email are required.');
      return;
    }
    
    if (editingClientId) {
      const res = await executeUpdateClient({
        clientId: parseInt(editingClientId),
        ...formData
      });
      if (res.error) {
        toast.error(res.error.message.replace(/\[GraphQL\]\s*/i, ''));
      } else {
        toast.success(`Client "${formData.name}" updated successfully!`);
        closeModal();
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    } else {
      const res = await executeAddClient(formData);
      if (res.error) {
        toast.error(res.error.message.replace(/\[GraphQL\]\s*/i, ''));
      } else {
        toast.success(`Enterprise Client "${formData.name}" created!`);
        closeModal();
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }
  };

  const handleDeleteClient = async (client) => {
    if (!canManageClients) {
      toast.error('Only Workspace Owners and Admins can delete clients.');
      return;
    }
    if (confirm(`Are you sure you want to delete ${client.name}? All linked projects and invoices will also be removed.`)) {
      const res = await executeDeleteClient({ clientId: client.id });
      if (res.error) {
        toast.error(res.error.message.replace(/\[GraphQL\]\s*/i, ''));
      } else {
        toast.success(`Client ${client.name} removed.`);
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }
  };

  const handleCopyPortalLink = (client) => {
    if (!client.portalToken) return;
    const url = `${window.location.origin}/portal/${client.portalToken}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(client.id);
    toast.success(`Secure portal link copied for ${client.name}!`);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  const allClients = data?.clients || [];
  const filteredClients = allClients.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.taxId && c.taxId.toLowerCase().includes(q)) ||
      (c.country && c.country.toLowerCase().includes(q))
    );
  });

  return (
    <div className="pt-2 pb-14 w-full h-full max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">CRM & Accounts</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Client Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Enterprise customer relationship profiles, legal billing details, and white-label portals.
          </p>
        </div>
        
        {canManageClients && (
          <button 
            onClick={openAddModal}
            className="btn-primary py-2.5 px-4 text-xs flex items-center gap-2 shadow-sm shrink-0"
          >
            <Plus size={16} />
            <span>Add Enterprise Client</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by company, contact person, email, or VAT ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="glass-input search-input pl-10 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <span className="text-xs font-medium text-slate-400 hidden sm:inline-block">
          Showing {filteredClients.length} of {allClients.length} clients
        </span>
      </div>

      {error && (
        <div className="p-6 text-center text-sm font-medium text-red-500 glass-card">
          Error loading client directory: {error.message}
        </div>
      )}

      {/* Main Clients List / Grid */}
      {!fetching && allClients.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="No clients in your directory"
          description="Register your first enterprise client to manage billing, deliverable portals, and contracts."
          action={
            canManageClients ? (
              <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add First Client
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="col-span-4">Company & Client</div>
            <div className="col-span-3">Primary Contact & Email</div>
            <div className="col-span-3">Tax & Payment Terms</div>
            <div className="col-span-2 text-right">Portal & Actions</div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {fetching && (
              <div className="p-12 text-center text-xs font-mono text-slate-400">
                Loading client profiles...
              </div>
            )}

            {filteredClients.map((client, i) => {
              const initials = client.name ? client.name.substring(0, 2).toUpperCase() : 'CL';
              const tierColor = 
                client.clientTier === 'Enterprise' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50' :
                client.clientTier === 'VIP' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50' :
                'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

              return (
                <motion.div 
                  key={client.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="px-6 py-4.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-0 group"
                >
                  {/* Column 1: Company Name & Tier */}
                  <div className="col-span-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {initials}
                    </div>
                    <div className="overflow-hidden space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {client.name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.2 rounded border ${tierColor}`}>
                          {client.clientTier || 'Standard'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {client.country && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {client.city ? `${client.city}, ` : ''}{client.country}
                          </span>
                        )}
                        <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="flex items-center gap-1">
                          <FolderKanban size={10} />
                          {client.projects?.length || 0} Projects
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Primary Contact Person & Email */}
                  <div className="col-span-3 space-y-1">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                      <Users size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{client.contactPerson || 'Direct Entity Account'}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Mail size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  </div>

                  {/* Column 3: Tax & Payment Terms */}
                  <div className="col-span-3 space-y-1">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CreditCard size={12} className="text-slate-400 shrink-0" />
                      <span>{client.paymentTerms || 'Net 30'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({client.currency || 'USD'})</span>
                    </div>
                    {client.taxId ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                        <Shield size={9} className="text-emerald-500" />
                        <span>VAT: {client.taxId}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No Tax ID on file</span>
                    )}
                  </div>

                  {/* Column 4: Actions & Portal Link */}
                  <div className="col-span-2 flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-800/80">
                    {client.portalToken ? (
                      <button 
                        onClick={() => handleCopyPortalLink(client)}
                        title="Copy white-label client portal link"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-brand-primary bg-brand-primary-light/60 hover:bg-brand-primary-light border border-brand-primary/20 transition-colors"
                      >
                        {copiedTokenId === client.id ? (
                          <>
                            <CheckCheck size={13} className="text-emerald-500" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Portal</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">No Portal</span>
                    )}

                    {canManageClients && (
                      <>
                        <button 
                          onClick={() => openEditModal(client)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Client Profile"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button 
                          onClick={() => handleDeleteClient(client)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Client"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enterprise Add/Edit Client Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-8"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingClientId ? 'Edit Enterprise Client Profile' : 'Register New Enterprise Client'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure corporate identity, tax compliance, and automated billing terms.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={closeModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-nav Tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-2 bg-slate-50/30 dark:bg-slate-900/20">
                {[
                  { id: 'general', label: 'Company & Contact', icon: Building2 },
                  { id: 'tax', label: 'Tax & Compliance', icon: Shield },
                  { id: 'address', label: 'Billing Address', icon: MapPin },
                  { id: 'notes', label: 'Contract Notes', icon: FileText }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeModalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveModalTab(tab.id)}
                      className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                        isActive 
                          ? 'border-brand-primary text-brand-primary' 
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* TAB 1: Company & Contact */}
                {activeModalTab === 'general' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Client / Legal Entity Name *
                      </label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="glass-input" 
                        placeholder="e.g. Apex Global Technologies LLC"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Primary Contact Person
                      </label>
                      <input 
                        type="text" 
                        value={formData.contactPerson}
                        onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                        className="glass-input" 
                        placeholder="e.g. Elena Rostova - VP Procurement"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Primary / Billing Email *
                      </label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="glass-input" 
                        placeholder="billing@apextech.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Telephone Number
                      </label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="glass-input" 
                        placeholder="+1 (555) 234-5678"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Corporate Website
                      </label>
                      <input 
                        type="url" 
                        value={formData.website}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        className="glass-input" 
                        placeholder="https://apextech.com"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: Tax & Compliance */}
                {activeModalTab === 'tax' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        VAT / Tax Registration / EIN
                      </label>
                      <input 
                        type="text" 
                        value={formData.taxId}
                        onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                        className="glass-input uppercase font-mono" 
                        placeholder="e.g. EU123456789 or 12-3456789"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Printed automatically on official B2B PDF tax invoices.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Client Classification Tier
                      </label>
                      <select 
                        value={formData.clientTier}
                        onChange={e => setFormData({ ...formData, clientTier: e.target.value })}
                        className="glass-input"
                      >
                        <option value="Enterprise">Enterprise (High Value)</option>
                        <option value="Standard">Standard Client</option>
                        <option value="VIP">VIP / Priority Partner</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Default Payment Terms
                      </label>
                      <select 
                        value={formData.paymentTerms}
                        onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                        className="glass-input"
                      >
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                        <option value="Due on Receipt">Due on Receipt (Immediate)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Billing Currency
                      </label>
                      <select 
                        value={formData.currency}
                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        className="glass-input"
                      >
                        <option value="USD">USD ($) - US Dollar</option>
                        <option value="EUR">EUR (€) - Euro</option>
                        <option value="GBP">GBP (£) - British Pound</option>
                        <option value="INR">INR (₹) - Indian Rupee</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TAB 3: Billing Address */}
                {activeModalTab === 'address' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Street Address / Headquarters
                      </label>
                      <input 
                        type="text" 
                        value={formData.billingAddress}
                        onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                        className="glass-input" 
                        placeholder="100 Enterprise Way, Suite 400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        City
                      </label>
                      <input 
                        type="text" 
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="glass-input" 
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        State / Province / Region
                      </label>
                      <input 
                        type="text" 
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        className="glass-input" 
                        placeholder="NY"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Postal / ZIP Code
                      </label>
                      <input 
                        type="text" 
                        value={formData.postalCode}
                        onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                        className="glass-input font-mono" 
                        placeholder="10001"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Country
                      </label>
                      <input 
                        type="text" 
                        value={formData.country}
                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                        className="glass-input" 
                        placeholder="United States"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: Internal Notes */}
                {activeModalTab === 'notes' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Internal Contract Notes & NDA Status
                    </label>
                    <textarea 
                      rows={5}
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="glass-input resize-none" 
                      placeholder="Master Services Agreement (MSA) signed on Jan 15. NDA on file. PO Number #PO-98124."
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Internal to your workspace team. Not displayed to clients in the public portal.</p>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Shield size={13} className="text-emerald-500" />
                    <span>Multi-Tenant Encrypted Record</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={closeModal}
                      className="btn-secondary py-2 px-4 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={addClientResult.fetching || updateClientResult.fetching}
                      className="btn-primary py-2 px-5 text-xs cursor-pointer"
                    >
                      {addClientResult.fetching || updateClientResult.fetching ? (
                        <Loader2 size={16} className="animate-spin mx-auto" />
                      ) : (
                        editingClientId ? 'Save Changes' : 'Create Client Profile'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
