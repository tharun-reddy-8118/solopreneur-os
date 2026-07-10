import { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Loader2, Sparkles, Users, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import EmptyState from '../components/EmptyState';

const GET_CLIENTS = gql`
  query GetClients {
    clients {
      id
      name
      email
      portalToken
      projects {
        id
      }
    }
  }
`;

const ADD_CLIENT = gql`
  mutation AddClient($name: String!, $email: String!) {
    addClient(name: $name, email: $email) {
      id
      name
      email
    }
  }
`;

const UPDATE_CLIENT = gql`
  mutation UpdateClient($clientId: Int!, $name: String!, $email: String!) {
    updateClient(clientId: $clientId, name: $name, email: $email) {
      id
      name
      email
    }
  }
`;

export default function Clients() {
  const [result, reexecuteQuery] = useQuery({ query: GET_CLIENTS });
  const { data, fetching, error } = result;
  
  const [addClientResult, executeAddClient] = useMutation(ADD_CLIENT);
  const [updateClientResult, executeUpdateClient] = useMutation(UPDATE_CLIENT);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  const [editingClientId, setEditingClientId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    await executeAddClient(formData);
    setFormData({ name: '', email: '' });
    setIsAdding(false);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const startEditing = (client) => {
    setEditingClientId(client.id);
    setEditFormData({ name: client.name, email: client.email });
  };

  const cancelEditing = () => {
    setEditingClientId(null);
    setEditFormData({ name: '', email: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.email) return;
    
    await executeUpdateClient({
      clientId: parseInt(editingClientId),
      name: editFormData.name,
      email: editFormData.email
    });
    
    setEditingClientId(null);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const allClients = data?.clients || [];

  return (
    <div className="pt-4 pb-12 w-full h-full">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Clients</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Manage your professional network.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn-primary flex items-center gap-2"
        >
          <Sparkles size={16} />
          <span>New Client</span>
        </button>
      </header>

      {isAdding && (
        <div className="glass-card p-8 mb-10 border-indigo-100">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
            Add New Client
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 items-end">
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="glass-input" 
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="glass-input" 
                placeholder="billing@acme.com"
                required
              />
            </div>
            <div className="w-full md:w-auto flex gap-3 flex-1 justify-end">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={addClientResult.fetching}
                className="btn-primary flex items-center justify-center gap-2 w-32"
              >
                {addClientResult.fetching ? <Loader2 size={16} className="animate-spin" /> : 'Save Client'}
              </button>
            </div>
          </form>
          {addClientResult.error && (
            <p className="text-xs text-red-500 mt-4 font-mono">{addClientResult.error.message}</p>
          )}
        </div>
      )}

      {error && <div className="p-12 text-center text-sm font-mono tracking-widest text-red-500">Error loading data.</div>}
        
      {!fetching && allClients.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="No clients yet"
          description="Add your first client to generate their secure Portal Link and start managing their projects."
          action={
            <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
              <Sparkles size={16} /> Add First Client
            </button>
          }
        />
      ) : (
        <div className="glass-card bg-white">
          <div className="p-0 min-w-full md:min-w-[700px]">
            <div className="hidden md:flex text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest p-5 border-b border-slate-100 dark:border-slate-700 bg-transparent">
              <div className="w-1/3">Client</div>
              <div className="w-1/3">Contact</div>
              <div className="w-1/3">Projects</div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {fetching && <div className="p-16 text-center text-slate-400">Loading...</div>}
              {allClients.map((client, i) => (
                <motion.div 
                  key={client.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="list-row group flex flex-col md:flex-row p-4 md:p-5 items-start md:items-center bg-white hover:bg-slate-50 transition-colors gap-2 md:gap-0 relative"
                >
                  {editingClientId === client.id ? (
                    <form onSubmit={handleUpdate} className="flex flex-col md:flex-row w-full gap-4 items-center">
                      <div className="w-full md:w-1/3">
                        <input 
                          type="text" 
                          value={editFormData.name}
                          onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                          className="glass-input w-full" 
                          required
                        />
                      </div>
                      <div className="w-full md:w-1/3">
                        <input 
                          type="email" 
                          value={editFormData.email}
                          onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                          className="glass-input w-full" 
                          required
                        />
                      </div>
                      <div className="w-full md:w-1/3 flex items-center justify-end gap-2">
                        <button type="button" onClick={cancelEditing} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg bg-slate-100 hover:bg-slate-200">
                          <X size={16} />
                        </button>
                        <button type="submit" disabled={updateClientResult.fetching} className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-lg">
                          {updateClientResult.fetching ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="w-full md:w-1/3 font-bold text-slate-900 dark:text-white flex items-center gap-3 pr-8">
                         <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-100 dark:border-indigo-800/50 shrink-0">
                            {client.name.substring(0, 2).toUpperCase()}
                         </div>
                         <span className="md:hidden text-xs text-slate-500 font-bold uppercase mr-1">Client</span>
                         <span className="truncate">{client.name}</span>
                      </div>
                      <div className="w-full md:w-1/3 text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center md:block ml-11 md:ml-0">
                         <span className="md:hidden text-xs text-slate-500 font-bold uppercase mr-2 w-16">Contact</span>
                         {client.email}
                      </div>
                      <div className="w-full md:w-1/3 flex flex-wrap items-center mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-700 justify-between pr-2">
                         <div className="flex items-center gap-4">
                           <span className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-2">
                              {client.projects?.length || 0} Active
                           </span>
                           {client.portalToken && (
                              <button 
                                onClick={() => {
                                  const url = `${window.location.origin}/portal/${client.portalToken}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success('Portal link copied to clipboard!');
                                }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                              >
                                Copy Portal Link
                              </button>
                           )}
                         </div>
                      </div>
                      
                      {/* Edit Button overlay on hover for desktop, always visible on mobile */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditing(client)}
                          className="p-2 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-100 rounded-lg hover:shadow-md transition-all"
                          title="Edit Client"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
