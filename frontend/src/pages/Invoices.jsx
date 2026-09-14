import React, { useState } from 'react';
import { useQuery, useMutation, useClient, gql } from 'urql';
import { 
  Loader2, FileText, Plus, Trash2, Download, Receipt, 
  Search, CheckCircle2, Clock, AlertCircle, DollarSign, Filter, X,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import { useTenant } from '../context/TenantContext';

const GET_INVOICES_AND_CLIENTS = gql`
  query GetInvoicesAndClients {
    me {
      currencyPreference
    }
    clients {
      id
      name
      projects {
        id
        name
      }
      invoices {
        id
        amount
        status
        createdAt
        project {
          name
        }
      }
    }
  }
`;

const ADD_INVOICE = gql`
  mutation AddInvoice($clientId: Int!, $projectId: Int!, $lineItems: [InvoiceLineItemInput!]!) {
    addInvoice(clientId: $clientId, projectId: $projectId, lineItems: $lineItems, status: "Pending") {
      id
      amount
      status
    }
  }
`;

const UPDATE_INVOICE = gql`
  mutation UpdateInvoice($invoiceId: Int!, $status: String!) {
    updateInvoice(invoiceId: $invoiceId, status: $status) {
      id
      status
    }
  }
`;

const GENERATE_INVOICE_PDF = gql`
  query GenerateInvoicePdf($invoiceId: Int!) {
    invoicePdf(id: $invoiceId)
  }
`;

const SEND_INVOICE = gql`
  mutation SendInvoice($invoiceId: Int!) {
    sendInvoice(invoiceId: $invoiceId)
  }
`;

export default function Invoices() {
  const { tenant, user } = useTenant();
  const client = useClient();
  const [result, reexecuteQuery] = useQuery({ query: GET_INVOICES_AND_CLIENTS });
  const { data, fetching, error } = result;

  const [addResult, executeAdd] = useMutation(ADD_INVOICE);
  const [updateResult, executeUpdate] = useMutation(UPDATE_INVOICE);
  const [sendResult, executeSendInvoice] = useMutation(SEND_INVOICE);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [downloadingId, setDownloadingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const handleSendInvoice = async (invoiceId) => {
    setSendingId(invoiceId);
    const res = await executeSendInvoice({ invoiceId });
    setSendingId(null);
    if (res.error) {
      toast.error(res.error.message.replace('[GraphQL] ', ''));
    } else {
      toast.success('Invoice dispatched to client & webhook!');
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };
  
  // Line items state
  const [lineItems, setLineItems] = useState([
    { description: 'Professional Services', quantity: 1, unitPrice: 0 }
  ]);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    setLineItems(newItems);
  };

  const calculateTotal = () => {
    return lineItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!clientId || !projectId || lineItems.length === 0) {
      toast.error('Please select client, project, and provide line items.');
      return;
    }
    
    const formattedLineItems = lineItems.map(item => ({
      description: item.description || 'Deliverable',
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0
    }));

    const res = await executeAdd({ 
      clientId: parseInt(clientId), 
      projectId: parseInt(projectId), 
      lineItems: formattedLineItems
    });

    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success('Invoice drafted successfully!');
      setClientId('');
      setProjectId('');
      setLineItems([{ description: 'Professional Services', quantity: 1, unitPrice: 0 }]);
      setShowAddForm(false);
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  const handleUpdateStatus = async (invoiceId, status) => {
    await executeUpdate({ invoiceId, status });
    toast.success(`Invoice status set to ${status}`);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleDownloadPdf = async (invoiceId) => {
    try {
      setDownloadingId(invoiceId);
      const res = await client.query(GENERATE_INVOICE_PDF, { invoiceId }).toPromise();
      if (res.error) throw new Error(res.error.message);
      
      const pdfUrl = res.data.invoicePdf;
      window.open(pdfUrl, '_blank');
      toast.success('PDF generated successfully!');
    } catch (err) {
      toast.error('Failed to generate PDF: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const clients = data?.clients || [];
  
  const allInvoices = clients.flatMap(client => 
    (client.invoices || []).map(invoice => ({
      ...invoice,
      clientName: client.name,
      projectName: invoice.project?.name || 'General Project'
    }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const selectedClient = data?.clients?.find(c => c.id === parseInt(clientId));
  const availableProjects = selectedClient?.projects || [];

  const currencySymbol = data?.me?.currencyPreference === 'EUR' ? '€' : 
                         data?.me?.currencyPreference === 'GBP' ? '£' : 
                         data?.me?.currencyPreference === 'INR' ? '₹' : '$';

  // Metrics
  const totalInvoiced = allInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = allInvoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  const totalPending = allInvoices.filter(i => i.status !== 'Paid').reduce((sum, inv) => sum + inv.amount, 0);

  // Filters
  const filteredInvoices = allInvoices.filter(inv => {
    const matchesSearch = 
      `INV-${inv.id}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="pt-2 pb-14 w-full h-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Financial Operations</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Billing & Invoices</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Generate white-labeled enterprise invoices, automated PDFs, and status tracking.
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddForm(true)}
          className="btn-primary py-2.5 px-4 text-xs flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Financial Health Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-brand-primary flex items-center justify-center font-bold">
            <Receipt size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Billed</span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {currencySymbol}{totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Settled Revenue</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {currencySymbol}{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding Due</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">
              {currencySymbol}{totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Generator Drawer */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6 border-brand-primary/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-brand-primary" />
                Draft Professional Invoice
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <Trash2 size={16} />
              </button>
            </div>

            <form onSubmit={handleAddInvoice} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Client
                  </label>
                  <select 
                    value={clientId} 
                    onChange={e => {
                      setClientId(e.target.value);
                      setProjectId('');
                    }}
                    className="glass-input"
                    required
                  >
                    <option value="" disabled>Choose client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Associated Project
                  </label>
                  <select 
                    value={projectId} 
                    onChange={e => setProjectId(e.target.value)}
                    className="glass-input"
                    required
                    disabled={!clientId}
                  >
                    <option value="" disabled>Choose project...</option>
                    {availableProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Invoice Line Items
                  </h4>
                  <button 
                    type="button" 
                    onClick={handleAddLineItem} 
                    className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2.5 items-center">
                      <input 
                        type="text" 
                        placeholder="Service or item description..." 
                        value={item.description}
                        onChange={e => updateLineItem(index, 'description', e.target.value)}
                        className="glass-input flex-[3]"
                        required
                      />
                      <div className="w-full sm:w-28 relative">
                        <input 
                          type="number" 
                          min="0.1" 
                          step="0.1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="glass-input"
                          required
                        />
                      </div>
                      <div className="w-full sm:w-36 relative">
                        <input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="Unit Price"
                          value={item.unitPrice}
                          onChange={e => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="glass-input"
                          required
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="p-2 text-slate-300 hover:text-rose-500 disabled:opacity-20 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Total and Submit */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <span className="text-xs font-bold uppercase text-slate-400">Total:</span>
                  <span>{currencySymbol}{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)} 
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={addResult.fetching} 
                    className="btn-primary"
                  >
                    {addResult.fetching ? <Loader2 className="animate-spin" size={16} /> : 'Save Invoice'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice ID, client or project..."
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          {['ALL', 'Paid', 'Pending', 'Overdue'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === status 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-6 text-center text-sm font-medium text-red-500 glass-card">
          Error loading invoices: {error.message}
        </div>
      )}

      {/* Invoices List */}
      {!fetching && allInvoices.length === 0 ? (
        <EmptyState 
          icon={Receipt}
          title="No invoices drafted yet"
          description="Create and dispatch your first invoice to automate payment tracking and PDF generation."
          action={
            <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Draft First Invoice
            </button>
          }
        />
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="col-span-2">Invoice ID</div>
            <div className="col-span-4">Client & Project</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {fetching && (
              <div className="p-12 text-center text-xs font-mono text-slate-400">
                Loading invoices...
              </div>
            )}

            {filteredInvoices.map((invoice, i) => (
              <motion.div 
                key={invoice.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="px-6 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-0 group"
              >
                {/* Invoice ID */}
                <div className="col-span-2 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-primary">
                    INV-{invoice.id.toString().padStart(4, '0')}
                  </span>
                </div>

                {/* Client & Project */}
                <div className="col-span-4 overflow-hidden pr-4">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {invoice.clientName}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                    {invoice.projectName}
                  </div>
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <span className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                    {currencySymbol}{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Status Dropdown */}
                <div className="col-span-2">
                  <select 
                    value={invoice.status}
                    onChange={(e) => handleUpdateStatus(invoice.id, e.target.value)}
                    disabled={updateResult.fetching}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold appearance-none cursor-pointer focus:outline-none transition-colors ${
                      invoice.status === 'Paid' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' 
                        : invoice.status === 'Overdue'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                {/* Actions: Send & PDF */}
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <button 
                    onClick={() => handleSendInvoice(invoice.id)}
                    disabled={sendingId === invoice.id || (user && user.role !== 'Owner' && user.role !== 'Admin')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    title="Send Invoice to Client via Webhook/Email"
                  >
                    {sendingId === invoice.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>Send</span>
                  </button>
                  <button 
                    onClick={() => handleDownloadPdf(invoice.id)}
                    disabled={downloadingId === invoice.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-brand-primary bg-brand-primary-light hover:opacity-90 rounded-lg transition-all cursor-pointer"
                    title="Download Official PDF"
                  >
                    {downloadingId === invoice.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span>PDF</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
