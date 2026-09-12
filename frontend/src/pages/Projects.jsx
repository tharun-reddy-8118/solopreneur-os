import React, { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Link } from 'react-router-dom';
import { 
  Loader2, Briefcase, Plus, Edit2, Check, X, 
  Search, ArrowRight, FolderKanban, Users 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../components/EmptyState';
import { useTenant } from '../context/TenantContext';

const GET_PROJECTS_AND_CLIENTS = gql`
  query GetProjectsAndClients {
    clients {
      id
      name
      projects {
        id
        name
        description
        hourlyRate
      }
    }
  }
`;

const ADD_PROJECT = gql`
  mutation AddProject($clientId: Int!, $name: String!, $description: String, $hourlyRate: Float) {
    createProject(clientId: $clientId, name: $name, description: $description, hourlyRate: $hourlyRate) {
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
  const { tenant } = useTenant();
  const [result, reexecuteQuery] = useQuery({ query: GET_PROJECTS_AND_CLIENTS });
  const { data, fetching, error } = result;

  const [addResult, executeAdd] = useMutation(ADD_PROJECT);
  const [updateResult, executeUpdate] = useMutation(UPDATE_PROJECT);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectRate, setNewProjectRate] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editProjectData, setEditProjectData] = useState({ name: '', description: '' });

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!selectedClientId || !newProjectName) return;
    
    const res = await executeAdd({ 
      clientId: parseInt(selectedClientId), 
      name: newProjectName, 
      description: newProjectDesc,
      hourlyRate: newProjectRate ? parseFloat(newProjectRate) : 0.0
    });
    
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(`Project "${newProjectName}" created!`);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectRate('');
      setSelectedClientId('');
      setShowAddForm(false);
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
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
    
    toast.success('Project updated');
    setEditingProjectId(null);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const clients = data?.clients || [];
  
  const allProjects = clients.flatMap(client => 
    (client.projects || []).map(project => ({
      ...project,
      clientName: client.name,
      clientId: client.id
    }))
  );

  const filteredProjects = allProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const baseProjectRoute = `/t/${tenant.slug}/projects`;

  return (
    <div className="pt-2 pb-14 w-full h-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Workspaces</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Active Projects</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Kanban boards, deliverables, milestones, and client task management.
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddForm(true)}
          className="btn-primary py-2.5 px-4 text-xs flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Add Project Form Drawer */}
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
                <Briefcase size={16} className="text-brand-primary" />
                Initialize Client Workspace
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Project Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Website Redesign" 
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    className="glass-input"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Client
                  </label>
                  <select 
                    value={selectedClientId} 
                    onChange={e => setSelectedClientId(e.target.value)}
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
                    Hourly Billing Rate ($/hr)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 95.00" 
                    value={newProjectRate}
                    onChange={e => setNewProjectRate(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Project Scope / Description
                </label>
                <textarea 
                  placeholder="Enter scope, deliverables or requirements..." 
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  className="glass-input w-full resize-none h-20"
                />
              </div>

              <div className="flex justify-end gap-2">
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
                  {addResult.fetching ? <Loader2 className="animate-spin" size={16} /> : 'Create Project'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects by name or client..."
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
        <span className="text-xs font-medium text-slate-400">
          Showing {filteredProjects.length} of {allProjects.length}
        </span>
      </div>

      {error && (
        <div className="p-6 text-center text-sm font-medium text-red-500 glass-card">
          Error loading projects: {error.message}
        </div>
      )}

      {/* Projects List */}
      {!fetching && allProjects.length === 0 ? (
        <EmptyState 
          icon={Briefcase}
          title="No active projects"
          description="Create your first project workspace to start tracking tasks on the interactive Kanban board."
          action={
            <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Create First Project
            </button>
          }
        />
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="col-span-5">Project & Scope</div>
            <div className="col-span-3">Client Organization</div>
            <div className="col-span-2">Billing Model</div>
            <div className="col-span-2 text-right">Kanban Board</div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {fetching && (
              <div className="p-12 text-center text-xs font-mono text-slate-400">
                Loading projects...
              </div>
            )}

            {filteredProjects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="px-6 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-0 group"
              >
                {editingProjectId === project.id ? (
                  <form onSubmit={handleUpdate} className="col-span-12 flex flex-col sm:flex-row gap-3 items-center w-full">
                    <input 
                      type="text" 
                      value={editProjectData.name}
                      onChange={e => setEditProjectData({...editProjectData, name: e.target.value})}
                      className="glass-input flex-1" 
                      placeholder="Project Name"
                      required
                    />
                    <input 
                      type="text" 
                      value={editProjectData.description}
                      onChange={e => setEditProjectData({...editProjectData, description: e.target.value})}
                      className="glass-input flex-1" 
                      placeholder="Scope & description"
                    />
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={cancelEditing} 
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 dark:bg-slate-800"
                      >
                        <X size={15} />
                      </button>
                      <button 
                        type="submit" 
                        disabled={updateResult.fetching} 
                        className="btn-primary !p-2 rounded-lg"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Project Name & Scope */}
                    <div className="col-span-5 flex items-center gap-3.5 pr-4">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <FolderKanban size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <Link 
                          to={`${baseProjectRoute}/${project.id}`}
                          className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-primary transition-colors truncate block"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {project.description || 'No description provided'}
                        </p>
                      </div>
                    </div>

                    {/* Client Name */}
                    <div className="col-span-3 flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Users size={13} className="text-slate-400 mr-2 shrink-0" />
                      <span className="truncate">{project.clientName}</span>
                    </div>

                    {/* Billing Model */}
                    <div className="col-span-2 flex items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {project.hourlyRate ? `$${project.hourlyRate}/hr` : 'Fixed Fee'}
                      </span>
                    </div>

                    {/* Action Link to Board */}
                    <div className="col-span-2 flex items-center justify-between md:justify-end gap-2">
                      <button 
                        onClick={(e) => startEditing(e, project)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Project Details"
                      >
                        <Edit2 size={14} />
                      </button>

                      <Link 
                        to={`${baseProjectRoute}/${project.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-primary hover:bg-brand-primary-light transition-colors group-hover:translate-x-0.5"
                      >
                        <span>Open Board</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
