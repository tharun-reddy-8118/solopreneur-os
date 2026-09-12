import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { 
  Clock, Play, Pause, RotateCcw, Plus, CheckCircle, 
  Loader2, Save, X, Calendar, DollarSign, Filter, Layers 
} from 'lucide-react';
import toast from 'react-hot-toast';

const GET_TIMESHEET_DATA = gql`
  query GetTimesheetData {
    recentTimeLogs {
      id
      durationMinutes
      description
      isBilled
      createdAt
      task {
        id
        title
        project {
          id
          name
        }
      }
      user {
        name
      }
    }
    projects {
      id
      name
      tasks {
        id
        title
        status
      }
    }
  }
`;

const ADD_TIME_LOG = gql`
  mutation AddTimeLog($taskId: Int!, $durationMinutes: Int!, $description: String!) {
    addTimeLog(taskId: $taskId, durationMinutes: $durationMinutes, description: $description) {
      id
      durationMinutes
      description
      isBilled
      createdAt
    }
  }
`;

export default function Timesheets() {
  const [result, reexecuteQuery] = useQuery({ query: GET_TIMESHEET_DATA });
  const { data, fetching, error } = result;

  const [, executeAddTimeLog] = useMutation(ADD_TIME_LOG);

  // Live Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState('');
  const [timerDescription, setTimerDescription] = useState('');

  // Manual Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualDuration, setManualDuration] = useState('60');
  const [manualDescription, setManualDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [filterBilled, setFilterBilled] = useState('all');

  // Timer Tick Effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveTimer = async () => {
    if (!selectedTaskForTimer) {
      toast.error('Please select a project task to log this time to.');
      return;
    }
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    setIsSubmitting(true);
    const res = await executeAddTimeLog({
      taskId: parseInt(selectedTaskForTimer),
      durationMinutes: minutes,
      description: timerDescription || 'Live tracked session'
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error('Failed to save time log: ' + res.error.message);
    } else {
      toast.success(`Logged ${minutes} minutes successfully!`);
      setIsTimerRunning(false);
      setTimerSeconds(0);
      setTimerDescription('');
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualTaskId) {
      toast.error('Please select a task.');
      return;
    }
    setIsSubmitting(true);
    const res = await executeAddTimeLog({
      taskId: parseInt(manualTaskId),
      durationMinutes: parseInt(manualDuration) || 30,
      description: manualDescription || 'General task work'
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error('Failed to log time: ' + res.error.message);
    } else {
      toast.success('Time logged successfully!');
      setIsModalOpen(false);
      setManualTaskId('');
      setManualDescription('');
      setManualDuration('60');
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  // Flattened tasks for selection
  const allTasks = [];
  data?.projects?.forEach(proj => {
    proj.tasks?.forEach(t => {
      allTasks.push({
        id: t.id,
        title: `${proj.name} → ${t.title}`,
        projectName: proj.name
      });
    });
  });

  const logs = data?.recentTimeLogs || [];
  const filteredLogs = logs.filter(log => {
    if (filterBilled === 'billed') return log.isBilled;
    if (filterBilled === 'unbilled') return !log.isBilled;
    return true;
  });

  const totalMinutes = logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
  const unbilledMinutes = logs.filter(l => !l.isBilled).reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
  const billedMinutes = logs.filter(l => l.isBilled).reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

  return (
    <div className="pt-2 pb-16 w-full h-full space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Time & Productivity
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Live stopwatch timer, task hours tracking, and billable timesheets.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          <span>Manual Entry</span>
        </button>
      </header>

      {/* Live Stopwatch Hub */}
      <div className="glass-card p-6 sm:p-8 bg-gradient-to-br from-indigo-900/10 via-slate-900/5 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-850 border-indigo-200/50 dark:border-indigo-800/40 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              <span className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? 'bg-rose-500 animate-ping' : 'bg-indigo-500'}`}></span>
              <span>{isTimerRunning ? 'Timer Active & Running' : 'Interactive Stopwatch'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={selectedTaskForTimer}
                onChange={(e) => setSelectedTaskForTimer(e.target.value)}
                className="glass-input text-xs py-2.5"
              >
                <option value="">-- Choose Project Task --</option>
                {allTasks.map(task => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="What are you working on right now? (optional)"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                className="glass-input text-xs py-2.5"
              />
            </div>
          </div>

          {/* Stopwatch Display & Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 justify-end">
            <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-slate-900 dark:text-white bg-slate-100/80 dark:bg-slate-800/80 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
              {formatTimer(timerSeconds)}
            </div>

            <div className="flex items-center gap-2">
              {!isTimerRunning ? (
                <button
                  onClick={() => setIsTimerRunning(true)}
                  className="p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Start Timer"
                >
                  <Play size={20} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => setIsTimerRunning(false)}
                  className="p-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Pause Timer"
                >
                  <Pause size={20} fill="currentColor" />
                </button>
              )}

              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(0);
                }}
                disabled={timerSeconds === 0}
                className="p-3.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={handleSaveTimer}
                disabled={timerSeconds === 0 || isSubmitting}
                className="btn-primary py-3 px-4 text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Log Hours</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Time Tracked</div>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <DollarSign size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {Math.floor(unbilledMinutes / 60)}h {unbilledMinutes % 60}m
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ready to Bill</div>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {Math.floor(billedMinutes / 60)}h {billedMinutes % 60}m
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Invoiced & Billed</div>
          </div>
        </div>
      </div>

      {/* Time Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Time Log History</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredLogs.length} entries
            </span>
          </h3>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <Filter size={14} className="text-slate-400" />
            <span className="text-slate-500">Filter:</span>
            <button
              onClick={() => setFilterBilled('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterBilled === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterBilled('unbilled')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterBilled === 'unbilled' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Unbilled
            </button>
            <button
              onClick={() => setFilterBilled('billed')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterBilled === 'billed' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Billed
            </button>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-8 text-sm">Error loading timesheets</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-indigo-500" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Time Logged Yet</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Use the live stopwatch above or click "Manual Entry" to record your billable hours.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Project & Task</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Duration</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredLogs.map(log => {
                  const dateStr = new Date(log.createdAt + (log.createdAt?.endsWith('Z') ? '' : 'Z')).toLocaleDateString();
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {log.task?.project?.name || 'Project'}
                        </div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          {log.task?.title || 'Task'}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {log.description || '—'}
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {log.isBilled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50">
                            Billed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50">
                            Unbilled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-slate-200 dark:border-slate-700 relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-indigo-600 dark:text-indigo-400" />
                <span>Log Billable Time</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Project & Task
                </label>
                <select
                  value={manualTaskId}
                  onChange={(e) => setManualTaskId(e.target.value)}
                  className="glass-input text-sm py-2.5"
                  required
                >
                  <option value="">-- Choose Task --</option>
                  {allTasks.map(task => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="glass-input text-sm py-2.5"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Description / Work Performed
                </label>
                <textarea
                  rows={3}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="e.g., Implemented authentication middleware and unit tests"
                  className="glass-input text-sm py-2.5"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Save Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
