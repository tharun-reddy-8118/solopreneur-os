import React from 'react';
import { useQuery, gql } from 'urql';
import { Link } from 'react-router-dom';
import { 
  Loader2, TrendingUp, Users, Briefcase, FileText, Plus, Clock, 
  ArrowUpRight, ArrowRight, DollarSign, Wallet, CheckCircle2, 
  Sparkles, ExternalLink, ShieldCheck, Activity, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenant } from '../context/TenantContext';

const GET_STATS = gql`
  query GetStats {
    me {
      currencyPreference
      name
      role
    }
    organization {
      id
      name
      brandColor
    }
    clients {
      id
      name
      email
    }
    projects {
      id
      name
      hourlyRate
    }
    invoices {
      id
      amount
      status
      createdAt
    }
    expenses {
      id
      amount
      category
    }
    recentActivity(limit: 6) {
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

const StatCard = ({ title, value, subtitle, trend, icon: Icon, badgeColor = "emerald" }) => {
  const isPositive = trend && (trend.startsWith('+') || trend.includes('Inflow') || trend.includes('Strong'));
  
  return (
    <div className="glass-card p-5 sm:p-6 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-w-0">
      <div className="flex justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-primary-light text-brand-primary flex items-center justify-center font-bold shadow-xs shrink-0">
            <Icon size={18} />
          </div>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{title}</h3>
        </div>
        {trend && (
          <span className={`whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            isPositive 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' 
              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          }`}>
            {trend}
          </span>
        )}
      </div>

      <div>
        <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-brand-primary transition-colors truncate">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { tenant, setQuickCreateOpen } = useTenant();
  const [result] = useQuery({ query: GET_STATS });
  const { data, fetching, error } = result;

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        <span className="text-xs font-mono tracking-widest uppercase text-slate-400">Loading Workspace Intelligence...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-sm font-medium text-red-500 glass-card my-8">
        Error loading workspace dashboard: {error.message}
      </div>
    );
  }

  const currencySymbol = data?.me?.currencyPreference === 'EUR' ? '€' : 
                         data?.me?.currencyPreference === 'GBP' ? '£' : 
                         data?.me?.currencyPreference === 'INR' ? '₹' : '$';

  const totalClients = data?.clients?.length || 0;
  const activeProjects = data?.projects?.length || 0;
  const unpaidInvoices = data?.invoices?.filter(inv => inv.status !== 'Paid')?.length || 0;
  const pendingInvoicedAmount = data?.invoices?.filter(inv => inv.status !== 'Paid')
                                           .reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const totalRevenue = data?.invoices?.filter(inv => inv.status === 'Paid')
                                     .reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const totalExpenses = data?.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const netProfit = totalRevenue - totalExpenses;
  
  const profitPercentage = totalRevenue > 0 ? Math.max(0, Math.min(100, ((netProfit / totalRevenue) * 100))).toFixed(1) : 0;
  const expensePercentage = totalRevenue > 0 ? Math.max(0, Math.min(100, ((totalExpenses / totalRevenue) * 100))).toFixed(1) : 0;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/t/${tenant.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Workspace URL copied to clipboard!');
  };

  return (
    <div className="pt-2 pb-14 w-full h-full space-y-8">
      {/* Enterprise Workspace Hero Banner */}
      <div className="glass-card p-6 sm:p-8 bg-gradient-to-r from-white via-white to-indigo-50/30 dark:from-[#111726] dark:via-[#111726] dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-brand-primary text-white shadow-xs">
                {tenant.plan || 'Enterprise'}
              </span>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                Workspace: <span className="text-slate-700 dark:text-slate-300 font-bold">{tenant.name}</span>
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Welcome back, {data?.me?.name?.split(' ')[0] || 'Partner'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Real-time financial performance, client operations, and invoice velocity.
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setQuickCreateOpen('client')}
              className="btn-primary py-2.5 px-4 text-xs flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} />
              <span>New Client</span>
            </button>
            <Link
              to="/invoices"
              className="btn-secondary py-2.5 px-4 text-xs flex items-center gap-2"
            >
              <FileText size={16} />
              <span>Create Invoice</span>
            </Link>
            <button
              onClick={handleCopyLink}
              title="Copy your Tenant Workspace Link"
              className="btn-secondary py-2.5 px-3.5 text-xs flex items-center gap-1.5"
            >
              <Copy size={15} />
              <span className="hidden sm:inline">Tenant URL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Quad Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Collected Revenue" 
          value={`${currencySymbol}${totalRevenue.toLocaleString()}`} 
          subtitle={`${data?.invoices?.filter(i => i.status === 'Paid').length || 0} settled`}
          trend="+ Cash Inflow"
          icon={DollarSign}
        />
        <StatCard 
          title="Operating Expenses" 
          value={`${currencySymbol}${totalExpenses.toLocaleString()}`} 
          subtitle="Direct business costs"
          trend="Overhead"
          icon={Wallet}
        />
        <StatCard 
          title="Net Profit" 
          value={netProfit < 0 
            ? `-${currencySymbol}${Math.abs(netProfit).toLocaleString()}` 
            : `${currencySymbol}${netProfit.toLocaleString()}`} 
          subtitle={`${profitPercentage}% margin efficiency`}
          trend={netProfit > 0 && Number(profitPercentage) > 50 ? '+ High Margin' : netProfit >= 0 ? 'Balanced' : 'Deficit'}
          icon={TrendingUp}
        />
        <StatCard 
          title="Receivables Pending" 
          value={`${currencySymbol}${pendingInvoicedAmount.toLocaleString()}`} 
          subtitle={`${unpaidInvoices} awaiting payment`}
          trend={unpaidInvoices > 0 ? `${unpaidInvoices} due` : 'Zero Due'}
          icon={FileText}
        />
      </div>

      {/* Secondary Quick Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link 
          to="/clients" 
          className="glass-card p-5 flex items-center justify-between group hover:border-brand-primary transition-all duration-200"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{totalClients} Active</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Clients in CRM</div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
        </Link>

        <Link 
          to="/projects" 
          className="glass-card p-5 flex items-center justify-between group hover:border-brand-primary transition-all duration-200"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{activeProjects} Ongoing</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Deliverables & Boards</div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
        </Link>

        <Link 
          to="/timesheets" 
          className="glass-card p-5 flex items-center justify-between group hover:border-brand-primary transition-all duration-200"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">Active Logs</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Billable Timesheets</div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Split Grid: Financial Health Visualizer & Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Financial Margin Breakdown */}
        <div className="glass-card p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-4 rounded-full bg-emerald-500" />
                Operating Margin Breakdown
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">
                {currencySymbol}{totalRevenue.toLocaleString()} Total
              </span>
            </div>

            {totalRevenue === 0 ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/40 p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center my-4">
                Record and settle your first invoice to visualize your profit and operational margin ratio.
              </div>
            ) : (
              <div className="space-y-4 my-4">
                <div className="w-full h-7 flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800/80 p-1">
                  <div 
                    style={{ width: `${profitPercentage}%` }} 
                    className="bg-emerald-500 h-full rounded-l-full flex items-center justify-center text-[11px] font-black text-white transition-all duration-500"
                  >
                    {Number(profitPercentage) > 15 ? `Profit ${profitPercentage}%` : ''}
                  </div>
                  <div 
                    style={{ width: `${expensePercentage}%` }} 
                    className="bg-rose-500 h-full rounded-r-full flex items-center justify-center text-[11px] font-black text-white transition-all duration-500"
                  >
                    {Number(expensePercentage) > 15 ? `Costs ${expensePercentage}%` : ''}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Net Profit: {currencySymbol}{netProfit.toLocaleString()} ({profitPercentage}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Costs: {currencySymbol}{totalExpenses.toLocaleString()} ({expensePercentage}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Automated ledger reconciliation</span>
            <Link to="/expenses" className="font-semibold text-brand-primary hover:underline flex items-center gap-1">
              Expenses ledger <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Live Workspace Activity Feed */}
        <div className="glass-card p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-4 rounded-full bg-brand-primary" />
                Live Audit Activity
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                Workspace Audit
              </span>
            </div>

            <div className="space-y-2.5">
              {!data?.recentActivity?.length ? (
                <div className="p-6 text-center text-xs font-medium text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No activity recorded yet. Create projects or invoices to start logging events!
                </div>
              ) : (
                data.recentActivity.slice(0, 4).map(activity => {
                  const initials = (activity.user?.name || 'U').substring(0, 2).toUpperCase();
                  const date = new Date(activity.createdAt + (activity.createdAt.endsWith('Z') ? '' : 'Z'));
                  const now = new Date();
                  const diffMs = Math.max(0, now - date);
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
                    <div 
                      key={activity.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border border-slate-100/70 dark:border-slate-800/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-brand-primary-light text-brand-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {initials}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {activity.user?.name || 'Workspace Member'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {activity.action} <span className="font-semibold text-slate-700 dark:text-slate-300">{activity.target}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0 ml-3">{timeAgo}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Real-time multi-tenant event pipeline</span>
            <Link to="/team" className="font-semibold text-brand-primary hover:underline flex items-center gap-1">
              View team <ArrowRight size={12} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
