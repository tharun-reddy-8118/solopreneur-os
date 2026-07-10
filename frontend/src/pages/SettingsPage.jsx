import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { Loader2, Check, PaintBucket, Code, User, Plus, Trash2, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const GET_SETTINGS_DATA = gql`
  query GetSettingsData {
    me {
      id name email currencyPreference
    }
    organization {
      id name brandColor logoUrl
    }
    webhooks {
      id url eventType isActive
    }
    apiKeys {
      id name key
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($name: String!, $currencyPreference: String!) {
    updateProfile(name: $name, currencyPreference: $currencyPreference) { id name currencyPreference }
  }
`;

const UPDATE_BRANDING = gql`
  mutation UpdateBranding($brandColor: String!, $logoUrl: String!) {
    updateOrganizationBranding(brandColor: $brandColor, logoUrl: $logoUrl) { id brandColor logoUrl }
  }
`;

const GENERATE_API_KEY = gql`
  mutation GenerateApiKey($name: String!) {
    generateApiKey(name: $name) { id name key }
  }
`;

const REVOKE_API_KEY = gql`
  mutation RevokeApiKey($keyId: Int!) {
    revokeApiKey(keyId: $keyId)
  }
`;

const ADD_WEBHOOK = gql`
  mutation AddWebhook($url: String!, $eventType: String!) {
    addWebhook(url: $url, eventType: $eventType) { id url eventType isActive }
  }
`;

const DELETE_WEBHOOK = gql`
  mutation DeleteWebhook($webhookId: Int!) {
    deleteWebhook(webhookId: $webhookId)
  }
`;

export default function SettingsPage() {
  const [result, reexecuteQuery] = useQuery({ query: GET_SETTINGS_DATA });
  const { data, fetching, error } = result;

  const [, executeUpdateProfile] = useMutation(UPDATE_PROFILE);
  const [, executeUpdateBranding] = useMutation(UPDATE_BRANDING);
  const [, executeGenerateApiKey] = useMutation(GENERATE_API_KEY);
  const [, executeRevokeApiKey] = useMutation(REVOKE_API_KEY);
  const [, executeAddWebhook] = useMutation(ADD_WEBHOOK);
  const [, executeDeleteWebhook] = useMutation(DELETE_WEBHOOK);

  const [activeTab, setActiveTab] = useState('general');

  // General State
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [profileSaved, setProfileSaved] = useState(false);

  // Branding State
  const [brandColor, setBrandColor] = useState('#4f46e5');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandingSaved, setBrandingSaved] = useState(false);

  // Dev State
  const [newKeyName, setNewKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvent, setNewWebhookEvent] = useState('*');

  useEffect(() => {
    if (data?.me) {
      setName(data.me.name);
      setCurrency(data.me.currencyPreference);
    }
    if (data?.organization) {
      setBrandColor(data.organization.brandColor || '#4f46e5');
      setLogoUrl(data.organization.logoUrl || '');
    }
  }, [data]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    await executeUpdateProfile({ name, currencyPreference: currency });
    toast.success('Preferences saved successfully!');
  };

  const handleBrandingSubmit = async (e) => {
    e.preventDefault();
    await executeUpdateBranding({ brandColor, logoUrl });
    toast.success('Branding applied to Client Portal!');
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName) return;
    await executeGenerateApiKey({ name: newKeyName });
    setNewKeyName('');
    toast.success('API Key generated!');
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleAddWebhook = async (e) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    await executeAddWebhook({ url: newWebhookUrl, eventType: newWebhookEvent });
    setNewWebhookUrl('');
    toast.success('Webhook added!');
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  if (fetching) return <div className="p-12 text-center text-sm font-mono tracking-widest uppercase text-indigo-500 animate-pulse">Loading Settings...</div>;
  if (error) return <div className="p-12 text-center text-sm font-mono tracking-widest text-red-500">Error loading settings.</div>;

  return (
    <div className="pt-4 pb-12 w-full h-full max-w-4xl mx-auto">
      <header className="mb-10">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Settings</h2>
        <p className="text-sm text-slate-500 font-medium tracking-wide">Manage your system preferences and integrations.</p>
      </header>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-0 md:space-x-1 bg-slate-100 p-1 rounded-xl mb-8">
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<User size={18} />} label="General" />
        <TabButton active={activeTab === 'branding'} onClick={() => setActiveTab('branding')} icon={<PaintBucket size={18} />} label="Branding & Portal" />
        <TabButton active={activeTab === 'developer'} onClick={() => setActiveTab('developer')} icon={<Code size={18} />} label="Developer" />
      </div>

      {activeTab === 'general' && (
        <div className="glass-card p-10 bg-white">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
            Profile & Preferences
          </h3>
          <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address (Locked)</label>
              <input type="email" value={data?.me?.email || ''} disabled className="glass-input opacity-50 cursor-not-allowed bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="glass-input" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">System Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="glass-input">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              Save Preferences
            </button>
          </form>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="glass-card p-10 bg-white">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>
            Client Portal Branding
          </h3>
          <p className="text-sm text-slate-500 mb-8">Customize how your clients see their dashboard. Changes apply to the Client Portal immediately.</p>

          <form onSubmit={handleBrandingSubmit} className="space-y-6 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Brand Color</label>
              <div className="flex items-center gap-4">
                <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-12 w-20 rounded cursor-pointer border-none p-0" />
                <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="glass-input uppercase" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Logo URL</label>
              <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="glass-input" />
              {logoUrl && (
                <div className="mt-4 p-4 border rounded-xl bg-slate-50 flex items-center justify-center h-32">
                  <img src={logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              Update Branding
            </button>
          </form>
        </div>
      )}

      {activeTab === 'developer' && (
        <div className="space-y-8">
          <div className="glass-card p-10 bg-white">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-600 rounded-full"></div>
              API Keys
            </h3>

            <form onSubmit={handleGenerateKey} className="flex flex-col sm:flex-row gap-4 mb-8">
              <input type="text" placeholder="Key name (e.g. Zapier)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="glass-input flex-1 min-w-0" required />
              <button type="submit" className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm">
                <Plus size={18} /> Generate Key
              </button>
            </form>

            <div className="space-y-3">
              {data.apiKeys.length === 0 && <p className="text-sm text-slate-400">No API keys generated yet.</p>}
              {data.apiKeys.map(key => (
                <div key={key.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600"><Key size={16} /></div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{key.name}</p>
                      <p className="font-mono text-xs text-slate-500 mt-1">{key.key}</p>
                    </div>
                  </div>
                  <button onClick={async () => {
                    if (confirm('Revoke this key?')) {
                      await executeRevokeApiKey({ keyId: key.id });
                      toast.success('API Key revoked');
                      reexecuteQuery({ requestPolicy: 'network-only' });
                    }
                  }} className="text-red-500 hover:text-red-700 p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-10 bg-white">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
              Webhooks
            </h3>

            <form onSubmit={handleAddWebhook} className="flex flex-col sm:flex-row gap-4 mb-8">
              <input type="url" placeholder="https://webhook.site/..." value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} className="glass-input flex-[2] min-w-0" required />
              <select value={newWebhookEvent} onChange={e => setNewWebhookEvent(e.target.value)} className="glass-input flex-1 min-w-0">
                <option value="*">All Events (*)</option>
                <option value="invoice.created">Invoice Created</option>
                <option value="task.updated">Task Updated</option>
              </select>
              <button type="submit" className="btn-primary shrink-0 flex items-center justify-center gap-2 whitespace-nowrap px-6 py-3 text-sm">
                <Plus size={18} /> Add Webhook
              </button>
            </form>

            <div className="space-y-3">
              {data.webhooks.length === 0 && <p className="text-sm text-slate-400">No webhooks active.</p>}
              {data.webhooks.map(wh => (
                <div key={wh.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{wh.url}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 font-mono text-[10px] uppercase font-bold tracking-wider rounded">{wh.eventType}</span>
                  </div>
                  <button onClick={async () => {
                    await executeDeleteWebhook({ webhookId: wh.id });
                    toast.success('Webhook deleted');
                    reexecuteQuery({ requestPolicy: 'network-only' });
                  }} className="text-red-500 hover:text-red-700 p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${active
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
        }`}
    >
      {icon} {label}
    </button>
  );
}
