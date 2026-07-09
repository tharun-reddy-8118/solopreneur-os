import { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Link } from 'react-router-dom';
import { Loader2, Folder, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import EmptyState from '../components/EmptyState';

const GET_PROJECTS_AND_CLIENTS = gql`
  query GetProjectsAndClients {
    clients {
      id
      name
      projects {
        id
        name
        description
      }
    }
  }
`;

const ADD_PROJECT = gql`
  mutation AddProject($clientId: Int!, $name: String!, $description: String!) {
    addProject(clientId: $clientId, name: $name, description: $description) {
      id
      name
      description
    }
  }
`;

export default function Projects() {
  const [result, reexecuteQuery] = useQuery({ query: GET_PROJECTS_AND_CLIENTS });
  const { data, fetching, error } = result;

  const [addResult, executeAdd] = useMutation(ADD_PROJECT);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!selectedClientId) return;
    
    await executeAdd({ 
      clientId: parseInt(selectedClientId), 
      name: newProjectName, 
      description: newProjectDesc 
    });
    
    setNewProjectName('');
    setNewProjectDesc('');
    setSelectedClientId('');
    setShowAddForm(false);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const clients = data?.clients || [];
  
  // Flatten all projects into a single list with client info
  const allProjects = clients.flatMap(client => 
    (client.projects || []).map(project => ({
      ...project,
      clientName: client.name
    }))
  );

  return (
    <div className="pt-4 pb-12 w-full h-full">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Projects</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Manage your active workspaces.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
        >
          {showAddForm ? 'Cancel' : 'New Project'}
        </button>
      </header>

      {showAddForm && (
        <div className="glass-card p-8 mb-10 border-indigo-100">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Folder size={18} className="text-indigo-600" />
            Create Workspace
          </h3>
          <form onSubmit={handleAddProject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Project Name" 
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                className="glass-input"
                required
              />
              <select 
                value={selectedClientId} 
                onChange={e => setSelectedClientId(e.target.value)}
                className="glass-input"
                required
              >
                <option value="" disabled>Select Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <textarea 
              placeholder="Description (Optional)" 
              value={newProjectDesc}
              onChange={e => setNewProjectDesc(e.target.value)}
              className="glass-input w-full resize-none h-24"
            />
            <div className="flex justify-end">
               <button type="submit" disabled={addResult.fetching} className="btn-primary w-32 flex justify-center">
                 {addResult.fetching ? <Loader2 className="animate-spin" size={20} /> : 'Save Project'}
               </button>
            </div>
          </form>
        </div>
      )}

      {!fetching && allProjects.length === 0 ? (
        <EmptyState 
          icon={Briefcase}
          title="No projects yet"
          description="Create your first project to start organizing tasks, timesheets, and invoices for your clients."
          action={
            <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
              <Folder size={16} /> New Project
            </button>
          }
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <div className="p-0 min-w-[700px]">
            <div className="flex text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest p-5 border-b border-slate-100 dark:border-slate-700 bg-transparent">
              <div className="w-1/3">Project</div>
              <div className="w-1/3">Client</div>
              <div className="w-1/3 text-right">Description</div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {fetching && <div className="p-16 text-center text-slate-400">Loading...</div>}
              {allProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/projects/${project.id}`} className="list-row group flex p-5 items-center hover:bg-slate-50 transition-colors">
                    <div className="w-1/3 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                       {project.name}
                    </div>
                    <div className="w-1/3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                       {project.clientName}
                    </div>
                    <div className="w-1/3 text-sm text-slate-400 dark:text-slate-500 font-medium tracking-wide truncate pr-4 text-right">
                       {project.description || '-'}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
