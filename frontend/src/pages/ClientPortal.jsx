import { useParams } from 'react-router-dom';
import { useQuery, gql } from 'urql';
import { Loader2, FileText, FileSignature, Layout, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const GET_PORTAL_DATA = gql`
  query GetPortalData($token: String!) {
    clientPortalData(token: $token) {
      organization {
        name
        brandColor
        logoUrl
      }
      currencyPreference
      client {
        id
        name
        email
        projects {
          id
          name
          description
          tasks {
            id
            title
            status
            priority
            issueType
          }
        }
        invoices {
          id
          amount
          status
          createdAt
        }
      }
    }
  }
`;

export default function ClientPortal() {
  const { token } = useParams();
  const [result] = useQuery({ 
    query: GET_PORTAL_DATA, 
    variables: { token },
    requestPolicy: 'network-only' // Always fetch fresh
  });

  const { data, fetching, error } = result;
  const [activeTab, setActiveTab] = useState('projects');

  if (fetching) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center animate-pulse">
        <Loader2 className="animate-spin text-slate-400 dark:text-slate-500 mb-4" size={32} />
        <p className="text-sm font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase">Loading Portal...</p>
      </div>
    </div>
  );

  if (error || !data?.clientPortalData) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <p className="text-red-500 font-mono">Invalid or expired portal link.</p>
    </div>
  );

  const { organization, client, currencyPreference } = data.clientPortalData;
  const brandColor = organization.brandColor || '#4f46e5';

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹'
  };
  const symbol = currencySymbols[currencyPreference] || '$';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header 
        className="px-8 py-6 text-white shadow-md flex justify-between items-center"
        style={{ backgroundColor: brandColor }}
      >
        <div className="flex items-center gap-4">
          {organization.logoUrl ? (
            <img src={organization.logoUrl} alt="Logo" className="h-10 rounded bg-white p-1" />
          ) : (
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-xl">
              {organization.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{organization.name}</h1>
            <p className="text-white/80 text-sm">Client Portal</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/80">Welcome back,</p>
          <p className="font-bold">{client.name}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 flex gap-8">
        {/* Sidebar Nav */}
        <aside className="w-64 shrink-0 space-y-2">
          <PortalNav active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<Layout size={20}/>} label="Projects" brandColor={brandColor} />
          <PortalNav active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} icon={<FileText size={20}/>} label="Invoices" brandColor={brandColor} />
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 min-h-[600px]">
          
          {activeTab === 'invoices' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Your Invoices</h2>
              {client.invoices.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No invoices available.</p>
              ) : (
                <div className="space-y-4">
                  {client.invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-5 border border-slate-100 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-slate-800/50">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Invoice #{inv.id}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Issued: {new Date(inv.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex items-center gap-6">
                        <div>
                          <p className="font-black text-xl text-slate-900 dark:text-white">{symbol}{inv.amount.toFixed(2)}</p>
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${inv.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {inv.status}
                          </span>
                        </div>
                        {inv.status !== 'Paid' && (
                          <button style={{ backgroundColor: brandColor }} className="text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:opacity-90 transition-opacity">
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Active Projects</h2>
              {client.projects.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No active projects.</p>
              ) : (
                <div className="space-y-12">
                  {client.projects.map(project => (
                    <div key={project.id}>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">{project.name}</h3>
                      <div className="grid grid-cols-3 gap-6">
                        {['todo', 'in_progress', 'done'].map(status => (
                          <div key={status} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 min-h-[300px]">
                            <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs mb-4">
                              {status.replace('_', ' ')}
                            </h4>
                            <div className="space-y-3">
                              {project.tasks.filter(t => t.status === status).map(task => (
                                <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{task.title}</p>
                                  <div className="flex gap-2 mt-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{task.issueType}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{task.priority}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function PortalNav({ active, onClick, icon, label, brandColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: active ? `${brandColor}15` : 'transparent',
        color: active ? brandColor : undefined
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ${active ? 'shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
