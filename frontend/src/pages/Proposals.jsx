import { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { FileSignature, Plus, Loader2, Send, CheckCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import EmptyState from '../components/EmptyState';

const GET_PROPOSALS = gql`
  query GetProposals {
    proposals {
      id
      title
      description
      status
      createdAt
      client {
        id
        name
        email
      }
      lineItems {
        description
        quantity
        unitPrice
      }
    }
    clients {
      id
      name
    }
  }
`;

const ADD_PROPOSAL = gql`
  mutation AddProposal($clientId: Int!, $title: String!, $description: String!, $lineItems: [ProposalLineItemInput!]!) {
    addProposal(clientId: $clientId, title: $title, description: $description, lineItems: $lineItems) {
      id
    }
  }
`;

const UPDATE_PROPOSAL = gql`
  mutation UpdateProposal($proposalId: Int!, $title: String!, $description: String!, $lineItems: [ProposalLineItemInput!]!) {
    updateProposal(proposalId: $proposalId, title: $title, description: $description, lineItems: $lineItems) {
      id
    }
  }
`;

const PREVIEW_PROPOSAL = gql`
  mutation PreviewProposal($proposalId: Int!) {
    previewProposal(proposalId: $proposalId)
  }
`;

const SEND_PROPOSAL = gql`
  mutation SendProposal($proposalId: Int!) {
    sendProposal(proposalId: $proposalId)
  }
`;

const CONVERT_PROPOSAL = gql`
  mutation ConvertProposalToProject($proposalId: Int!) {
    convertProposalToProject(proposalId: $proposalId) {
      id
    }
  }
`;

export default function Proposals() {
  const [result, reexecuteQuery] = useQuery({ query: GET_PROPOSALS });
  const { data, fetching, error } = result;

  const [addResult, executeAdd] = useMutation(ADD_PROPOSAL);
  const [updateResult, executeUpdate] = useMutation(UPDATE_PROPOSAL);
  const [previewResult, executePreview] = useMutation(PREVIEW_PROPOSAL);
  const [sendResult, executeSend] = useMutation(SEND_PROPOSAL);
  const [convertResult, executeConvert] = useMutation(CONVERT_PROPOSAL);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ clientId: '', title: '', description: '', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }] });

  const handleOpenNew = () => {
    setEditId(null);
    setFormData({ clientId: '', title: '', description: '', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prop) => {
    setEditId(prop.id);
    setFormData({
      clientId: prop.client.id.toString(),
      title: prop.title,
      description: prop.description,
      lineItems: prop.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    });
    setIsModalOpen(true);
  };

  const handleAddLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    const newItems = [...formData.lineItems];
    newItems[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, lineItems: newItems }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientId) return;
    
    if (editId) {
      await executeUpdate({
        proposalId: editId,
        title: formData.title,
        description: formData.description,
        lineItems: formData.lineItems
      });
    } else {
      await executeAdd({
        clientId: parseInt(formData.clientId),
        title: formData.title,
        description: formData.description,
        lineItems: formData.lineItems
      });
    }
    
    setIsModalOpen(false);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handlePreview = async (id) => {
    const res = await executePreview({ proposalId: id });
    if (res.data?.previewProposal) {
      window.open(res.data.previewProposal, '_blank');
    }
  };

  const handleSend = async (id) => {
    await executeSend({ proposalId: id });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleConvert = async (id) => {
    await executeConvert({ proposalId: id });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  return (
    <div className="pt-4 pb-12 w-full h-full">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Proposals</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Generate and send proposals to close deals.</p>
        </div>
        <button onClick={handleOpenNew} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300">
          <Plus size={18} /> New Proposal
        </button>
      </header>

      {fetching ? (
        <div className="flex justify-center items-center h-64 text-indigo-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-8">Error loading proposals</div>
      ) : (
        <div className="glass-card overflow-hidden bg-white">
          {data?.proposals?.length === 0 ? (
            <EmptyState 
              icon={FileSignature}
              title="No Proposals Yet"
              description="Draft your first professional proposal to land a new client."
              action={
                <button onClick={handleOpenNew} className="btn-primary flex items-center gap-2">
                  <Plus size={18} /> Create Proposal
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4">
              {data?.proposals?.map((prop, i) => (
                <motion.div 
                  key={prop.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-center justify-between hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-colors bg-slate-50/50 dark:bg-slate-800/50"
                >
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{prop.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">For: <span className="font-semibold text-slate-700 dark:text-slate-300">{prop.client.name}</span> • {new Date(prop.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xl truncate">{prop.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      prop.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      prop.status === 'Sent' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {prop.status}
                    </span>
                    
                    {prop.status === 'Draft' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handlePreview(prop.id)} disabled={previewResult.fetching} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                          {previewResult.fetching ? <Loader2 size={14} className="animate-spin inline" /> : 'Preview'}
                        </button>
                        <button onClick={() => handleOpenEdit(prop)} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/50 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleSend(prop.id)} disabled={sendResult.fetching} className="flex items-center gap-1 text-sm font-bold text-white hover:bg-indigo-700 bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors">
                          {sendResult.fetching ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
                        </button>
                      </div>
                    )}
                    
                    {prop.status === 'Sent' && (
                      <button onClick={() => handleConvert(prop.id)} disabled={convertResult.fetching} className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50 transition-colors">
                        {convertResult.fetching ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Accept & Convert
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{editId ? 'Edit Proposal' : 'New Proposal'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Client</label>
                  <select 
                    required 
                    value={formData.clientId} 
                    onChange={e => setFormData({...formData, clientId: e.target.value})}
                    disabled={!!editId}
                    className="glass-input disabled:opacity-50"
                  >
                    <option value="">Select a client...</option>
                    {data?.clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Title</label>
                  <input 
                    required type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Website Redesign Q3"
                    className="glass-input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Scope of Work</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the overall scope and goals..."
                    className="glass-input h-24"
                  />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Line Items</label>
                    <button type="button" onClick={handleAddLineItem} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1">
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                  
                  {formData.lineItems.map((item, index) => (
                    <div key={index} className="flex gap-4 mb-4">
                      <input 
                        required type="text" 
                        value={item.description} 
                        onChange={e => handleLineItemChange(index, 'description', e.target.value)}
                        placeholder="Service description"
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                      />
                      <input 
                        required type="number" step="0.1"
                        value={item.quantity} 
                        onChange={e => handleLineItemChange(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                      />
                      <input 
                        required type="number" step="0.01"
                        value={item.unitPrice} 
                        onChange={e => handleLineItemChange(index, 'unitPrice', e.target.value)}
                        placeholder="Price"
                        className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={addResult.fetching || updateResult.fetching} className="btn-primary">
                    {addResult.fetching || updateResult.fetching ? 'Saving...' : 'Save Draft'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
