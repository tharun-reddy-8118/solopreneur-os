import { useState } from 'react';
import { useQuery, useMutation, useClient, gql } from 'urql';
import { Loader2, FileText, Plus, Trash2, Download, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import EmptyState from '../components/EmptyState';

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

export default function Invoices() {
  const client = useClient();
  const [result, reexecuteQuery] = useQuery({ query: GET_INVOICES_AND_CLIENTS });
  const { data, fetching, error } = result;

  const [addResult, executeAdd] = useMutation(ADD_INVOICE);
  const [updateResult, executeUpdate] = useMutation(UPDATE_INVOICE);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  
  // Line items state
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unitPrice: 0 }
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
    if (!clientId || !projectId || lineItems.length === 0) return;
    
    // Ensure numbers are properly cast
    const formattedLineItems = lineItems.map(item => ({
      description: item.description,
      quantity: parseFloat(item.quantity) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0
    }));

    await executeAdd({ 
      clientId: parseInt(clientId), 
      projectId: parseInt(projectId), 
      lineItems: formattedLineItems
    });
    
    setClientId('');
    setProjectId('');
    setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
    setShowAddForm(false);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleUpdateStatus = async (invoiceId, status) => {
    await executeUpdate({ invoiceId, status });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleDownloadPdf = async (invoiceId) => {
    try {
      const result = await client.query(GENERATE_INVOICE_PDF, { invoiceId }).toPromise();
      if (result.error) throw new Error(result.error.message);
      
      const pdfUrl = result.data.invoicePdf;
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const clients = data?.clients || [];
  
  // Flatten all invoices into a single list
  const allInvoices = clients.flatMap(client => 
    (client.invoices || []).map(invoice => ({
      ...invoice,
      clientName: client.name,
      projectName: invoice.project?.name || 'Unknown Project'
    }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const selectedClient = data?.clients?.find(c => c.id === parseInt(clientId));
  const availableProjects = selectedClient?.projects || [];

  const currencySymbol = data?.me?.currencyPreference === 'EUR' ? '€' : 
                         data?.me?.currencyPreference === 'GBP' ? '£' : 
                         data?.me?.currencyPreference === 'INR' ? '₹' : '$';

  return (
    <div className="pt-4 pb-12 w-full h-full">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Invoices</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Track your revenue and billing.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
        >
          {showAddForm ? 'Cancel' : 'New Invoice'}
        </button>
      </header>

      {showAddForm && (
        <div className="glass-card p-8 mb-10 border-indigo-100">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
            Draft Invoice
          </h3>
          <form onSubmit={handleAddInvoice} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <select 
                value={clientId} 
                onChange={e => {
                  setClientId(e.target.value);
                  setProjectId(''); // Reset project when client changes
                }}
                className="glass-input flex-1"
                required
              >
                <option value="" disabled>Select Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select 
                value={projectId} 
                onChange={e => setProjectId(e.target.value)}
                className="glass-input flex-1"
                required
                disabled={!clientId}
              >
                <option value="" disabled>Select Project</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Line Items</h4>
                <button type="button" onClick={handleAddLineItem} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-bold flex items-center gap-1">
                  <Plus size={16} /> Add Item
                </button>
              </div>
              
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center group">
                    <input 
                      type="text" 
                      placeholder="Description" 
                      value={item.description}
                      onChange={e => updateLineItem(index, 'description', e.target.value)}
                      className="glass-input flex-[3]"
                      required
                    />
                    <div className="flex-1 relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">Qty</span>
                      <input 
                        type="number" 
                        min="0.1" step="0.1"
                        value={item.quantity}
                        onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value))}
                        className="glass-input w-full"
                        style={{ paddingRight: '2.5rem' }}
                        required
                      />
                    </div>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">{currencySymbol}</span>
                      <input 
                        type="number" 
                        min="0" step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={e => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))}
                        className="glass-input w-full"
                        style={{ paddingLeft: '2rem' }}
                        required
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveLineItem(index)}
                      disabled={lineItems.length === 1}
                      className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700">
               <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                 <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total</span>
                 {currencySymbol}{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </div>
               <button type="submit" disabled={addResult.fetching} className="btn-primary w-32 flex justify-center">
                 {addResult.fetching ? <Loader2 className="animate-spin" size={20} /> : 'Save Invoice'}
               </button>
            </div>
          </form>
        </div>
      )}

      {!fetching && allInvoices.length === 0 ? (
        <EmptyState 
          icon={Receipt}
          title="No invoices yet"
          description="Create your first invoice to bill your clients. A beautiful PDF will be generated automatically."
          action={
            <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Invoice
            </button>
          }
        />
      ) : (
        <div className="glass-card">
          <div className="p-0 min-w-full md:min-w-[800px]">
            <div className="hidden md:flex text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest p-5 border-b border-slate-100 dark:border-slate-700 bg-transparent">
              <div className="w-[20%]">Invoice ID</div>
              <div className="w-[30%]">Client & Project</div>
              <div className="w-[20%]">Amount</div>
              <div className="w-[15%] text-right">Status</div>
              <div className="w-[15%] text-right">Actions</div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {fetching && <div className="p-16 text-center text-slate-400">Loading...</div>}
              {allInvoices.map((invoice, i) => (
                <motion.div 
                  key={invoice.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="list-row group flex flex-col md:flex-row p-4 md:p-5 items-start md:items-center bg-white dark:bg-slate-800 gap-4 md:gap-0"
                >
                  <div className="w-full md:w-[20%] flex justify-between items-center md:block">
                     <span className="md:hidden text-xs text-slate-500 font-bold uppercase">Invoice ID</span>
                     <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">INV-{invoice.id.toString().padStart(4, '0')}</span>
                  </div>
                  <div className="w-full md:w-[30%] flex flex-col">
                     <span className="md:hidden text-xs text-slate-500 font-bold uppercase mb-1">Client & Project</span>
                     <span className="font-bold text-slate-900 dark:text-white">{invoice.clientName}</span>
                     <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{invoice.projectName}</span>
                  </div>
                  <div className="w-full md:w-[20%] flex justify-between items-center md:block">
                     <span className="md:hidden text-xs text-slate-500 font-bold uppercase">Amount</span>
                     <span className="font-bold text-slate-900 dark:text-white tracking-wide text-lg">{currencySymbol}{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full md:w-[15%] flex justify-between md:justify-end items-center md:flex">
                     <span className="md:hidden text-xs text-slate-500 font-bold uppercase">Status</span>
                     <select 
                        value={invoice.status}
                        onChange={(e) => handleUpdateStatus(invoice.id, e.target.value)}
                        disabled={updateResult.fetching}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-colors ${
                          invoice.status === 'Paid' 
                           ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' 
                           : invoice.status === 'Overdue'
                           ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                           : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
                        }`}
                     >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                     </select>
                  </div>
                  <div className="w-full md:w-[15%] flex justify-end pt-2 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-700">
                    <button 
                      onClick={() => handleDownloadPdf(invoice.id)}
                      className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800/50 shadow-sm flex items-center gap-2"
                      title="Download PDF"
                    >
                      <Download size={16} />
                      <span className="text-xs font-bold">PDF</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
