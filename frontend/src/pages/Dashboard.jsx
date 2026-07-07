import { useQuery, gql } from 'urql';
import { Loader2, TrendingUp, Users, Briefcase, FileText } from 'lucide-react';

const GET_STATS = gql`
  query GetStats {
    me {
      currencyPreference
    }
    clients {
      id
    }
    projects {
      id
    }
    invoices {
      id
      amount
      status
    }
    expenses {
      amount
    }
    recentActivity(limit: 5) {
      id
      action
      target
      createdAt
      user {
        name
      }
    }
  }
`;

// Helper for Dashboard Cards
const StatCard = ({ title, value, trend }) => {
  const isPositive = trend.startsWith('+');
  return (
    <div className="glass-card p-6 flex flex-col justify-between group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
        <span className={`px-2 py-1 rounded-md text-xs font-bold border ${isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}>
          {trend}
        </span>
      </div>
      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {value}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [result] = useQuery({ query: GET_STATS });
  const { data, fetching, error } = result;

  if (fetching) return <div className="p-12 text-center text-sm font-mono tracking-widest uppercase text-indigo-500 animate-pulse">Loading Workspace...</div>;
  if (error) return <div className="p-12 text-center text-sm font-mono tracking-widest text-red-500">Error loading dashboard: {error.message}</div>;

  const currencySymbol = data?.me?.currencyPreference === 'EUR' ? '€' : 
                         data?.me?.currencyPreference === 'GBP' ? '£' : 
                         data?.me?.currencyPreference === 'INR' ? '₹' : '$';

  const totalClients = data?.clients?.length || 0;
  const activeProjects = data?.projects?.length || 0;
  const unpaidInvoices = data?.invoices?.filter(inv => inv.status !== 'Paid')?.length || 0;
  const totalRevenue = data?.invoices?.filter(inv => inv.status === 'Paid')
                                     .reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const totalExpenses = data?.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const netProfit = totalRevenue - totalExpenses;
  
  const profitPercentage = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
  const expensePercentage = totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="pt-4 pb-12 w-full h-full">
      <header className="mb-12">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Overview</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">Here is what is happening today.</p>
      </header>

      {/* Financial Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Gross Revenue" value={`${currencySymbol}${totalRevenue.toLocaleString()}`} trend="In" />
        <StatCard title="Total Expenses" value={`${currencySymbol}${totalExpenses.toLocaleString()}`} trend="Out" />
        <StatCard title="Net Profit" value={`${currencySymbol}${netProfit.toLocaleString()}`} trend={`${profitPercentage}% margin`} />
      </div>

      {/* Income vs Expenses Visual */}
      <div className="glass-card p-8 mb-12">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
          Profit Margin Visualizer
        </h3>
        {totalRevenue === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">Generate some revenue to see your margin.</div>
        ) : (
          <div>
            <div className="w-full h-8 flex rounded-full overflow-hidden mb-3">
              <div style={{ width: `${profitPercentage}%` }} className="bg-emerald-500 h-full flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {profitPercentage > 10 && 'Profit'}
              </div>
              <div style={{ width: `${expensePercentage}%` }} className="bg-rose-500 h-full flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {expensePercentage > 10 && 'Expenses'}
              </div>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-600 dark:text-slate-300 px-2">
              <span className="text-emerald-600 dark:text-emerald-400">Net Profit ({profitPercentage}%)</span>
              <span className="text-rose-600 dark:text-rose-400">Overhead ({expensePercentage}%)</span>
            </div>
          </div>
        )}
      </div>

      <section className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
             <div className="w-2 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-full"></div>
             Recent Activity
          </h3>
          <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">View All</button>
        </div>
        
        <div className="space-y-4">
          {!data?.recentActivity?.length ? (
            <div className="p-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              No recent activity found.
            </div>
          ) : (
            data.recentActivity.map(activity => {
              // Extract initials
              const initials = activity.user.name.substring(0, 2).toUpperCase();
              
              // Calculate time ago
              const date = new Date(activity.createdAt + 'Z');
              const now = new Date();
              const diffMs = now - date;
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              const timeAgo = diffHours > 24 
                ? `${Math.floor(diffHours/24)}d ago` 
                : diffHours > 0 
                ? `${diffHours}h ago` 
                : diffMins > 0 
                ? `${diffMins}m ago` 
                : 'Just now';

              return (
                <div key={activity.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-100 dark:border-indigo-800/50">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{activity.user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{activity.action} <span className="font-bold text-slate-700 dark:text-slate-300">{activity.target}</span></p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{timeAgo}</span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
