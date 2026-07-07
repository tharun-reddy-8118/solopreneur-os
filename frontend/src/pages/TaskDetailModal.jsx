import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Loader2, X, Clock, AlignLeft, AlertCircle, CheckCircle, Circle, Bug, Zap, LayoutList, Calendar, User, MessageSquare, Send, Trash2 } from 'lucide-react';

const GET_TEAM = gql`
  query GetTeam {
    teamMembers {
      id
      name
    }
  }
`;

const UPDATE_DETAILS = gql`
  mutation UpdateDetails($taskId: Int!, $dueDate: String, $assigneeId: Int) {
    updateTaskDetails(taskId: $taskId, dueDate: $dueDate, assigneeId: $assigneeId) {
      id
      dueDate
      assignee {
        id
        name
      }
    }
  }
`;

const ADD_SUBTASK = gql`
  mutation AddSubtask($taskId: Int!, $title: String!) {
    addSubtask(taskId: $taskId, title: $title) {
      id
      title
      isCompleted
    }
  }
`;

const TOGGLE_SUBTASK = gql`
  mutation ToggleSubtask($subtaskId: Int!, $isCompleted: Boolean!) {
    toggleSubtask(subtaskId: $subtaskId, isCompleted: $isCompleted) {
      id
      isCompleted
    }
  }
`;

const DELETE_SUBTASK = gql`
  mutation DeleteSubtask($subtaskId: Int!) {
    deleteSubtask(subtaskId: $subtaskId)
  }
`;

const ADD_COMMENT = gql`
  mutation AddComment($taskId: Int!, $content: String!) {
    addTaskComment(taskId: $taskId, content: $content) {
      id
      content
      createdAt
      user {
        name
      }
    }
  }
`;

export default function TaskDetailModal({ task, onClose, onUpdate, fetching }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority || 'Medium');
  const [issueType, setIssueType] = useState(task.issueType || task.issue_type || 'Task');
  const [timeLogged, setTimeLogged] = useState(task.timeLoggedMinutes || task.time_logged_minutes || 0);

  // New fields
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(parseInt(task.dueDate)).toISOString().split('T')[0] : '');
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id || 0);

  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');

  const [teamResult] = useQuery({ query: GET_TEAM });
  const [updateDetailsRes, executeUpdateDetails] = useMutation(UPDATE_DETAILS);
  const [addSubtaskRes, executeAddSubtask] = useMutation(ADD_SUBTASK);
  const [toggleSubtaskRes, executeToggleSubtask] = useMutation(TOGGLE_SUBTASK);
  const [deleteSubtaskRes, executeDeleteSubtask] = useMutation(DELETE_SUBTASK);
  const [addCommentRes, executeAddComment] = useMutation(ADD_COMMENT);

  // Sync state if task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority || 'Medium');
    setIssueType(task.issueType || task.issue_type || 'Task');
    setTimeLogged(task.timeLoggedMinutes || task.time_logged_minutes || 0);
    setDueDate(task.dueDate ? new Date(parseInt(task.dueDate)).toISOString().split('T')[0] : '');
    setAssigneeId(task.assignee?.id || 0);
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(task.id, {
      title,
      description,
      status,
      priority,
      issue_type: issueType,
      time_logged_minutes: parseInt(timeLogged) || 0
    });
  };

  const handleUpdateDetails = async (field, value) => {
    if (field === 'dueDate') {
      setDueDate(value);
      const isoDate = value ? new Date(value).getTime().toString() : null;
      await executeUpdateDetails({ taskId: task.id, dueDate: isoDate });
    } else if (field === 'assigneeId') {
      const id = parseInt(value) || 0;
      setAssigneeId(id);
      await executeUpdateDetails({ taskId: task.id, assigneeId: id });
    }
    // Re-fetch handled by parent if needed, or cache updates automatically
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    await executeAddSubtask({ taskId: task.id, title: newSubtask });
    setNewSubtask('');
    onUpdate(task.id, {}); // trigger refetch in parent
  };

  const handleToggleSubtask = async (id, currentStatus) => {
    await executeToggleSubtask({ subtaskId: id, isCompleted: !currentStatus });
    onUpdate(task.id, {});
  };
  
  const handleDeleteSubtask = async (id) => {
    await executeDeleteSubtask({ subtaskId: id });
    onUpdate(task.id, {});
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await executeAddComment({ taskId: task.id, content: newComment });
    setNewComment('');
    onUpdate(task.id, {});
  };

  const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white relative w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-slate-200 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {fetching && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        )}

        <div className="flex justify-between items-center px-8 py-4 border-b border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">TASK-{task.id}</span>
           </div>
           <button type="button" onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors">
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8">
          
          {/* Main Column */}
          <div className="flex-1 space-y-8">
            <form onSubmit={handleSubmit} id="task-form">
              <input 
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-transparent text-3xl font-black text-slate-900 border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors pb-2 mb-6"
                placeholder="Enter task title..."
              />

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlignLeft size={14} /> Description
                </label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 font-medium focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none placeholder-slate-400 shadow-sm"
                  placeholder="Add rich description, acceptance criteria, or notes here..."
                ></textarea>
              </div>
            </form>

            {/* Checklist Section */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2"><LayoutList size={14} /> Subtasks</span>
                {totalSubtasks > 0 && <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{subtaskProgress}%</span>}
              </label>
              
              {totalSubtasks > 0 && (
                <div className="w-full h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${subtaskProgress}%` }}></div>
                </div>
              )}

              <div className="space-y-2 mb-3">
                {task.subtasks?.map(st => (
                  <div key={st.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group transition-colors border border-transparent hover:border-slate-200">
                    <button 
                      onClick={() => handleToggleSubtask(st.id, st.isCompleted)}
                      disabled={toggleSubtaskRes.fetching}
                      className={`shrink-0 ${st.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'} transition-colors`}
                    >
                      {st.isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                    </button>
                    <span className={`flex-1 text-sm font-medium ${st.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {st.title}
                    </span>
                    <button onClick={() => handleDeleteSubtask(st.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
                <input 
                  type="text" 
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  placeholder="Add a subtask..." 
                  className="flex-1 bg-white border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                />
                <button type="submit" disabled={addSubtaskRes.fetching || !newSubtask.trim()} className="bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-slate-800 disabled:opacity-50">
                  Add
                </button>
              </form>
            </div>

            {/* Comments Section */}
            <div className="pt-6 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare size={14} /> Activity & Comments
              </label>
              
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
                {task.comments?.length === 0 ? (
                  <p className="text-sm text-slate-400 font-medium italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">No comments yet. Start the discussion!</p>
                ) : (
                  task.comments?.map(comment => (
                    <div key={comment.id} className="flex gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                        {comment.user.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900">{comment.user.name}</span>
                          <span className="text-xs font-medium text-slate-500">{new Date(parseInt(comment.createdAt)).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-3 relative">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-1">Me</div>
                <textarea 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment..." 
                  className="flex-1 bg-white border border-slate-200 text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm resize-none"
                  rows={2}
                ></textarea>
                <button type="submit" disabled={addCommentRes.fetching || !newComment.trim()} className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="w-full md:w-80 space-y-6 shrink-0 bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit">
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <User size={14} /> Assignee
                </label>
                <select 
                  value={assigneeId} 
                  onChange={e => handleUpdateDetails('assigneeId', e.target.value)}
                  className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 shadow-sm"
                >
                  <option value={0}>Unassigned</option>
                  {teamResult.data?.teamMembers?.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Calendar size={14} /> Due Date
                </label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={e => handleUpdateDetails('dueDate', e.target.value)}
                  className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 shadow-sm"
                />
              </div>
            </div>

            <hr className="border-slate-200" />

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                form="task-form"
                className="glass-input w-full text-sm font-bold text-slate-700 bg-white shadow-sm"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Priority</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value)}
                form="task-form"
                className="glass-input w-full text-sm font-bold bg-white shadow-sm"
              >
                <option value="High" className="text-red-600">High</option>
                <option value="Medium" className="text-amber-600">Medium</option>
                <option value="Low" className="text-blue-600">Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Issue Type</label>
              <select 
                value={issueType} 
                onChange={e => setIssueType(e.target.value)}
                form="task-form"
                className="glass-input w-full text-sm font-bold bg-white shadow-sm"
              >
                <option value="Task" className="text-indigo-600">Task</option>
                <option value="Feature" className="text-emerald-600">Feature</option>
                <option value="Bug" className="text-red-600">Bug</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Clock size={14} /> Time Logged (Mins)
              </label>
              <input 
                type="number"
                value={timeLogged}
                onChange={e => setTimeLogged(e.target.value)}
                form="task-form"
                className="glass-input w-full text-sm font-bold text-slate-700 bg-white shadow-sm"
                min="0"
              />
            </div>

            <div className="pt-6 border-t border-slate-200">
              <button 
                type="submit"
                form="task-form"
                className="w-full btn-primary py-3 flex justify-center items-center font-bold text-sm shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
