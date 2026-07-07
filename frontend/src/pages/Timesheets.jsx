import { useState } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Clock, Plus, Filter, Loader2, Save, X, Activity } from 'lucide-react';

const GET_RECENT_TIME_LOGS = gql`
  query GetRecentTimeLogs {
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
          name
        }
      }
      user {
        name
      }
    }
  }
`;

export default function Timesheets() {
  const [result] = useQuery({ query: GET_RECENT_TIME_LOGS });
  const { data, fetching, error } = result;

  return (
    <div className="pt-4 pb-12 w-full h-full">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Timesheets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Track your hours and analyze productivity.</p>
        </div>
      </header>

      {fetching ? (
        <div className="flex justify-center items-center h-64 text-indigo-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-8">Error loading timesheets</div>
      ) : (
        <div className="glass-card overflow-hidden bg-white dark:bg-slate-800">
          {data?.recentTimeLogs?.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Time Logged Yet</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">Go to a Project Board and click on a Task to start logging your billable hours.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project / Task</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data?.recentTimeLogs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.task.project.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{log.task.title}</div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                    </td>
                    <td className="py-4 px-6 text-right">
                      {log.isBilled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50">
                          Billed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50">
                          Unbilled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
