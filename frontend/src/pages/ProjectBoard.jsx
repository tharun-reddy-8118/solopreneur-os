import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { useParams, Link } from 'react-router-dom';
import { 
  Loader2, ArrowLeft, Plus, Bug, Zap, LayoutList, Clock, 
  FileText, Calendar, Building2, CheckCircle2, Sparkles, MessageSquare 
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskDetailModal from './TaskDetailModal';

const GET_PROJECT = gql`
  query GetProject($id: Int!) {
    me {
      currencyPreference
    }
    project(id: $id) {
      id
      name
      description
      hourlyRate
      client {
        id
        name
      }
      tasks {
        id
        title
        status
        priority
        issueType
        description
        timeLoggedMinutes
        dueDate
        assignee {
          id
          name
        }
        subtasks {
          id
          title
          isCompleted
        }
        comments {
          id
          content
          createdAt
          user {
            name
          }
        }
      }
    }
  }
`;

const ADD_TASK = gql`
  mutation AddTask($projectId: Int!, $title: String!, $status: String!) {
    addTask(projectId: $projectId, title: $title, status: $status, timeLoggedMinutes: 0) {
      id
      title
      status
    }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask($taskId: Int!, $status: String, $priority: String, $issueType: String, $description: String, $timeLoggedMinutes: Int) {
    updateTask(taskId: $taskId, status: $status, priority: $priority, issueType: $issueType, description: $description, timeLoggedMinutes: $timeLoggedMinutes) {
      id
      title
      status
      priority
      issueType
      description
      timeLoggedMinutes
    }
  }
`;

const ADD_TIME_LOG = gql`
  mutation AddTimeLog($taskId: Int!, $durationMinutes: Int!, $description: String!) {
    addTimeLog(taskId: $taskId, durationMinutes: $durationMinutes, description: $description) {
      id
      durationMinutes
    }
  }
`;

const GENERATE_INVOICE_FROM_TIME = gql`
  mutation GenerateInvoiceFromTime($projectId: Int!) {
    generateInvoiceFromTime(projectId: $projectId) {
      id
      amount
    }
  }
`;

const UPDATE_PROJECT = gql`
  mutation UpdateProject($projectId: Int!, $hourlyRate: Float!) {
    updateProject(projectId: $projectId, hourlyRate: $hourlyRate) {
      id
      hourlyRate
    }
  }
`;

// Helper for Priority Badges
const PriorityBadge = ({ priority }) => {
  if (priority === 'High') {
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 uppercase tracking-wider">High</span>;
  }
  if (priority === 'Low') {
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50 uppercase tracking-wider">Low</span>;
  }
  return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50 uppercase tracking-wider">Med</span>;
};

// Helper for Issue Type Icons
const TypeIcon = ({ type }) => {
  if (type === 'Bug') return <Bug size={14} className="text-rose-500" title="Bug / Issue" />;
  if (type === 'Feature') return <Zap size={14} className="text-emerald-500" title="Feature" />;
  return <LayoutList size={14} className="text-indigo-500" title="Task" />;
};

// Date Formatter that gracefully handles ISO dates and timestamps
const formatTaskDate = (dateStr) => {
  if (!dateStr) return null;
  const d = isNaN(dateStr) ? new Date(dateStr) : new Date(parseInt(dateStr));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isTaskOverdue = (dateStr) => {
  if (!dateStr) return false;
  const d = isNaN(dateStr) ? new Date(dateStr) : new Date(parseInt(dateStr));
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

export default function ProjectBoard() {
  const { id } = useParams();
  const projectId = parseInt(id);

  const [result, reexecuteQuery] = useQuery({ 
    query: GET_PROJECT, 
    variables: { id: projectId },
    requestPolicy: 'cache-and-network'
  });
  
  const { data, fetching, error } = result;
  const project = data?.project;

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    CAD: 'CA$',
    AUD: 'A$',
    SGD: 'S$'
  };
  const currencySymbol = currencySymbols[data?.me?.currencyPreference] || '$';

  const [addTaskResult, executeAddTask] = useMutation(ADD_TASK);
  const [updateTaskResult, executeUpdateTask] = useMutation(UPDATE_TASK);
  const [addTimeLogResult, executeAddTimeLog] = useMutation(ADD_TIME_LOG);
  const [generateInvoiceResult, executeGenerateInvoice] = useMutation(GENERATE_INVOICE_FROM_TIME);
  const [updateProjectResult, executeUpdateProject] = useMutation(UPDATE_PROJECT);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTo, setAddingTo] = useState(null); 
  const [selectedTask, setSelectedTask] = useState(null);
  const [invoiceMessage, setInvoiceMessage] = useState('');
  
  const [rateInput, setRateInput] = useState('');

  useEffect(() => {
    if (project && project.hourlyRate !== undefined && project.hourlyRate !== null) {
      setRateInput(project.hourlyRate.toString());
    }
  }, [project]);

  const handleRateBlur = async () => {
    const rate = parseFloat(rateInput) || 0;
    if (rate !== project?.hourlyRate) {
      await executeUpdateProject({ projectId, hourlyRate: rate });
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  const handleAddTask = async (e, status) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await executeAddTask({ projectId, title: newTaskTitle, status });
    setNewTaskTitle('');
    setAddingTo(null);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleUpdateTask = async (taskId, updates) => {
    await executeUpdateTask({ taskId, ...updates });
    reexecuteQuery({ requestPolicy: 'network-only' });
    setSelectedTask(null);
  };

  const handleLogQuickTime = async (e, taskId) => {
    e.stopPropagation();
    await executeAddTimeLog({ taskId, durationMinutes: 60, description: "Logged 1 hour" });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleGenerateInvoice = async () => {
    const res = await executeGenerateInvoice({ projectId });
    if (res.error) {
      setInvoiceMessage(res.error.message.replace('[GraphQL] ', ''));
    } else {
      setInvoiceMessage(`Generated Invoice for ${currencySymbol}${res.data.generateInvoiceFromTime.amount}`);
    }
    setTimeout(() => setInvoiceMessage(''), 6000);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      await executeUpdateTask({ taskId: parseInt(draggableId), status: destination.droppableId });
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  if (fetching && !project) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-brand-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Loading Project Workspace...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-16 text-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Project not found</h3>
        <p className="text-sm text-slate-500 mb-6">The requested project workspace could not be found or you don't have access.</p>
        <Link to="/projects" className="btn-primary inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> Return to Projects
        </Link>
      </div>
    );
  }

  const tasks = project.tasks || [];
  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-slate-400' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-indigo-500' },
    { id: 'done', title: 'Completed', color: 'bg-emerald-500' }
  ];

  const totalLoggedMinutes = tasks.reduce((acc, t) => acc + (t.timeLoggedMinutes || 0), 0);
  const totalLoggedHours = (totalLoggedMinutes / 60).toFixed(1);
  const currentRate = parseFloat(rateInput) || project.hourlyRate || 0;
  const estimatedValue = Math.round(parseFloat(totalLoggedHours) * currentRate);

  return (
    <div className="w-full flex flex-col gap-6 pb-12">
      {/* Top Breadcrumb & Status Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          to="/projects" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-primary transition-colors tracking-wide uppercase"
        >
          <ArrowLeft size={14} /> Back to Projects Directory
        </Link>

        {project.client?.name && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
            <Building2 size={12} className="text-slate-400" />
            <span>{project.client.name}</span>
          </div>
        )}
      </div>

      {/* Modern Executive Workspace Header */}
      <header className="bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-indigo-500" />
                <strong>{totalLoggedHours}h</strong> unbilled work
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles size={13} className="text-emerald-500" />
                Est. value: <strong>{currencySymbol}{estimatedValue.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Hourly Rate Editor Pill */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-inner">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Rate ({currencySymbol}/hr):
              </span>
              <input 
                type="number"
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                onBlur={handleRateBlur}
                className="w-20 bg-transparent text-sm font-black text-slate-900 dark:text-white focus:outline-none text-right border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-brand-primary"
                title="Click to edit hourly rate"
              />
            </div>

            {/* Invoice Button */}
            <button 
              onClick={handleGenerateInvoice}
              disabled={generateInvoiceResult.fetching}
              className="btn-primary flex items-center gap-2 text-xs sm:text-sm font-bold shadow-md whitespace-nowrap"
            >
              {generateInvoiceResult.fetching ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Invoice Unbilled Time
            </button>
          </div>
        </div>

        {/* Feedback Alert if Invoice Generated */}
        {invoiceMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{invoiceMessage}</span>
          </div>
        )}

        {/* Project Scope / Description Box */}
        {project.description && (
          <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <p className="line-clamp-3 hover:line-clamp-none transition-all">
              {project.description}
            </p>
          </div>
        )}
      </header>

      {/* Drag and Drop Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex flex-col bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm min-h-[520px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`}></span>
                    <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-900 dark:text-white">
                      {col.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full shadow-xs">
                    {colTasks.length}
                  </span>
                </div>

                {/* Droppable Task List */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 flex flex-col gap-3 transition-colors rounded-xl p-1 ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {colTasks.map((task, index) => {
                        const dueDateFormatted = formatTaskDate(task.dueDate);
                        const isOverdue = isTaskOverdue(task.dueDate);

                        return (
                          <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedTask(task)}
                                className={`bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 hover:border-brand-primary/50 transition-all duration-200 cursor-pointer flex flex-col gap-3 shadow-xs ${
                                  snapshot.isDragging ? 'shadow-2xl scale-[1.02] border-brand-primary ring-2 ring-brand-primary/20 z-50' : 'hover:shadow-md'
                                }`}
                              >
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                  {task.title}
                                </p>

                                {/* Tags & Quick Time Log Row */}
                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex items-center gap-1.5">
                                    <TypeIcon type={task.issueType || task.issue_type} />
                                    <PriorityBadge priority={task.priority} />
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {task.timeLoggedMinutes > 0 && (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                                        <Clock size={10} className="text-indigo-500" />
                                        <span>{task.timeLoggedMinutes}m</span>
                                      </div>
                                    )}

                                    <button 
                                      onClick={(e) => handleLogQuickTime(e, parseInt(task.id))}
                                      disabled={addTimeLogResult.fetching}
                                      className="text-[10px] font-bold text-brand-primary hover:bg-brand-primary-light border border-brand-primary/30 px-2 py-0.5 rounded-md transition-colors flex items-center gap-0.5"
                                      title="Quick log 1 hour"
                                    >
                                      +1h
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Bottom Metadata (Subtasks, Due Date, Comments, Assignee) */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                  <div className="flex items-center gap-2">
                                    {dueDateFormatted && (
                                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                        isOverdue 
                                          ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50' 
                                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                      }`}>
                                        <Calendar size={10} />
                                        <span>{dueDateFormatted}</span>
                                      </div>
                                    )}

                                    {task.subtasks?.length > 0 && (
                                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <LayoutList size={10} className="text-slate-400" />
                                        <span>{task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}</span>
                                      </div>
                                    )}

                                    {task.comments?.length > 0 && (
                                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1" title={`${task.comments.length} comments`}>
                                        <MessageSquare size={10} />
                                        <span>{task.comments.length}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {task.assignee && (
                                    <div 
                                      className="w-5 h-5 rounded-full bg-brand-primary-light border border-brand-primary/30 flex items-center justify-center text-[9px] font-black text-brand-primary" 
                                      title={task.assignee.name}
                                    >
                                      {task.assignee.name.substring(0,2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}

                      {/* Add Task Form or Button */}
                      {addingTo === col.id ? (
                        <form onSubmit={(e) => handleAddTask(e, col.id)} className="bg-white dark:bg-[#111726] border border-brand-primary/40 rounded-xl p-3 shadow-md">
                          <input 
                            autoFocus
                            type="text" 
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title..."
                            className="w-full bg-transparent text-xs text-slate-900 dark:text-white font-semibold focus:outline-none mb-3 placeholder-slate-400"
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              type="button" 
                              onClick={() => setAddingTo(null)} 
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit" 
                              disabled={addTaskResult.fetching} 
                              className="btn-primary text-xs py-1 px-3"
                            >
                              Add
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button 
                          onClick={() => setAddingTo(col.id)}
                          className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-brand-primary py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-primary/40 hover:bg-brand-primary-light/40 transition-all bg-white/40 dark:bg-slate-800/30"
                        >
                          <Plus size={14} /> Add Task
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          fetching={updateTaskResult.fetching}
        />
      )}
    </div>
  );
}
