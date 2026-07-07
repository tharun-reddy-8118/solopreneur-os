import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Plus, Bug, Zap, LayoutList, Clock, FileText } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskDetailModal from './TaskDetailModal';

const GET_PROJECT = gql`
  query GetProject($id: Int!) {
    project(id: $id) {
      id
      name
      description
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

// Helper component for Badges
const PriorityBadge = ({ priority }) => {
  if (priority === 'High') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">HIGH</span>;
  if (priority === 'Low') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">LOW</span>;
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">MED</span>;
};

const TypeIcon = ({ type }) => {
  if (type === 'Bug') return <Bug size={14} className="text-red-500" />;
  if (type === 'Feature') return <Zap size={14} className="text-emerald-500" />;
  return <LayoutList size={14} className="text-indigo-500" />;
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

  // Update local input state when project data loads
  useEffect(() => {
    if (project) {
      setRateInput(project.hourlyRate?.toString() || '0');
    }
  }, [project]);

  const handleRateBlur = async () => {
    const rate = parseFloat(rateInput) || 0;
    if (rate !== project.hourlyRate) {
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
    await executeAddTimeLog({ taskId, durationMinutes: 60, description: "Quick logged 1 hour" });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleGenerateInvoice = async () => {
    const res = await executeGenerateInvoice({ projectId });
    if (res.error) {
      setInvoiceMessage(res.error.message.replace('[GraphQL] ', ''));
    } else {
      setInvoiceMessage(`Generated Invoice for ${res.data.generateInvoiceFromTime.amount}`);
    }
    setTimeout(() => setInvoiceMessage(''), 5000);
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

  if (fetching && !project) return <div className="p-12 text-center text-sm font-mono tracking-widest uppercase text-indigo-500 animate-pulse">Loading Workspace...</div>;
  if (error || !project) return <div className="p-12 text-center text-sm font-mono tracking-widest text-red-500">Workspace not found.</div>;

  const tasks = project.tasks || [];
  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'done', title: 'Done' }
  ];

  return (
    <div className="pt-4 pb-12 w-full h-full flex flex-col">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors font-bold tracking-wide">
            <ArrowLeft size={16} /> Back to Projects
          </Link>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            {project.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">{project.description || 'No description provided.'}</p>
        </div>
        
        <div className="flex flex-col items-end">
          {invoiceMessage && <span className="text-xs font-bold text-emerald-600 mb-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">{invoiceMessage}</span>}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Rate / hr:</span>
              <input 
                type="number"
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                onBlur={handleRateBlur}
                className="w-16 bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
            <button 
              onClick={handleGenerateInvoice}
              disabled={generateInvoiceResult.fetching}
              className="btn-primary flex items-center gap-2 text-sm shadow-md"
            >
              {generateInvoiceResult.fetching ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Invoice Unbilled Time
            </button>
          </div>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="w-80 shrink-0 flex flex-col">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-sm flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.id === 'todo' ? 'bg-slate-400' : col.id === 'in_progress' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                    {col.title}
                  </h3>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full shadow-sm">{colTasks.length}</span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`glass-panel flex-1 rounded-2xl p-3 flex flex-col gap-3 min-h-[500px] border-slate-200 dark:border-slate-700 transition-colors bg-slate-50/50 dark:bg-slate-900/50 ${snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50' : ''}`}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedTask(task)}
                              className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer flex flex-col gap-3 shadow-sm ${snapshot.isDragging ? 'shadow-xl scale-[1.02] z-50 border-indigo-500 dark:border-indigo-400' : 'hover:shadow-md'}`}
                            >
                              <p className="text-sm text-slate-900 dark:text-white font-bold leading-relaxed">{task.title}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex items-center gap-2">
                                    <TypeIcon type={task.issueType || task.issue_type} />
                                    <PriorityBadge priority={task.priority} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {task.timeLoggedMinutes > 0 && (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded">
                                        <Clock size={10} /> {task.timeLoggedMinutes}m
                                      </div>
                                    )}
                                    <button 
                                      onClick={(e) => handleLogQuickTime(e, parseInt(task.id))}
                                      disabled={addTimeLogResult.fetching}
                                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-1.5 py-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1 cursor-pointer z-10"
                                      title="Quick log 1 hour"
                                    >
                                      +1h
                                    </button>
                                  </div>
                                </div>
                                
                                {/* EPIC 6: Badges row */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center gap-2">
                                    {task.dueDate && (
                                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${new Date(parseInt(task.dueDate)) < new Date() ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' : 'bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                                        {new Date(parseInt(task.dueDate)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </div>
                                    )}
                                    {task.subtasks?.length > 0 && (
                                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <LayoutList size={10} /> {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                      </div>
                                    )}
                                    {task.comments?.length > 0 && (
                                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        💬 {task.comments.length}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {task.assignee && (
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300" title={task.assignee.name}>
                                      {task.assignee.name.substring(0,2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {addingTo === col.id ? (
                        <form onSubmit={(e) => handleAddTask(e, col.id)} className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/50 rounded-xl p-3 mt-2 shadow-sm">
                          <input 
                            autoFocus
                            type="text" 
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            placeholder="Task description..."
                            className="w-full bg-transparent text-sm text-slate-900 dark:text-white font-medium focus:outline-none mb-3 placeholder-slate-400 dark:placeholder-slate-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setAddingTo(null)} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1">Cancel</button>
                            <button type="submit" disabled={addTaskResult.fetching} className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">Add Task</button>
                          </div>
                        </form>
                      ) : (
                        <button 
                          onClick={() => setAddingTo(col.id)}
                          className="mt-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 bg-white/50 dark:bg-slate-800/50"
                        >
                          <Plus size={16} /> Add Task
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
