import { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Link } from 'react-router-dom';
import { Loader2, Folder, Briefcase, Edit2, Check, X } from 'lucide-react';
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

const UPDATE_PROJECT = gql`
  mutation UpdateProject($projectId: Int!, $name: String!, $description: String!) {
    updateProject(projectId: $projectId, name: $name, description: $description) {
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
  const [updateResult, executeUpdate] = useMutation(UPDATE_PROJECT);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editProjectData, setEditProjectData] = useState({ name: '', description: '' });

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

  const startEditing = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditProjectData({ name: project.name, description: project.description || '' });
  };

  const cancelEditing = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProjectId(null);
    setEditProjectData({ name: '', description: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editProjectData.name) return;
    
    await executeUpdate({
      projectId: parseInt(editingProjectId),
      name: editProjectData.name,
      description: editProjectData.description
    });
    
    setEditingProjectId(null);
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
        <div className="glass-card">
          <div className="p-0 min-w-full md:min-w-[700px]">
            <div className="hidden md:flex text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest p-5 border-b border-slate-100 dark:border-slate-700 bg-transparent">
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
                  className="relative group"
                >
                  {editingProjectId === project.id ? (
                    <div className="list-row p-4 md:p-5 items-center bg-white">
                      <form onSubmit={handleUpdate} className="flex flex-col md:flex-row w-full gap-4 items-center">
                        <div className="w-full md:w-1/3">
                          <input 
                            type="text" 
                            value={editProjectData.name}
                            onChange={e => setEditProjectData({...editProjectData, name: e.target.value})}
                            className="glass-input w-full" 
                            required
                          />
                        </div>
                        <div className="w-full md:w-1/3 text-sm text-slate-500 font-medium">
                           {project.clientName} (Client cannot be changed)
                        </div>
                        <div className="w-full md:w-1/3 flex items-center justify-end gap-2">
                          <input 
                            type="text" 
                            value={editProjectData.description}
                            onChange={e => setEditProjectData({...editProjectData, description: e.target.value})}
                            className="glass-input w-full md:w-2/3 mr-2" 
                            placeholder="Description"
                          />
                          <button type="button" onClick={cancelEditing} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg bg-slate-100 hover:bg-slate-200">
                            <X size={16} />
                          </button>
                          <button type="submit" disabled={updateResult.fetching} className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-lg">
                            {updateResult.fetching ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <Link to={`/projects/${project.id}`} className="list-row flex flex-col md:flex-row p-4 md:p-5 items-start md:items-center hover:bg-slate-50 transition-colors gap-2 md:gap-0 pr-12">
                      <div className="w-full md:w-1/3 font-bold text-slate-900 dark:text-white flex items-center gap-3 pr-8">
                         <div className="hidden md:block w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
                         <span className="md:hidden text-xs text-slate-500 font-bold uppercase mr-2">Project</span>
                         <span className="truncate">{project.name}</span>
                      </div>
                      <div className="w-full md:w-1/3 text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center md:block ml-11 md:ml-0">
                         <span className="md:hidden text-xs text-slate-500 font-bold uppercase mr-2 w-20">Client</span>
                         <span className="truncate">{project.clientName}</span>
                      </div>
                      <div className="w-full md:w-1/3 text-sm text-slate-400 dark:text-slate-500 font-medium tracking-wide truncate md:pr-4 md:text-right flex items-center md:block pt-2 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-700 mt-2 md:mt-0">
                         <span className="md:hidden text-xs text-slate-500 font-bold uppercase mr-2 w-20">Desc</span>
                         <span className="truncate">{project.description || '-'}</span>
                      </div>
                      
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => startEditing(e, project)}
                          className="p-2 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-100 rounded-lg hover:shadow-md transition-all"
                          title="Edit Project"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </Link>
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
