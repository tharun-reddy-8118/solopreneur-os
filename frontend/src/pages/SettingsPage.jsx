import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from 'urql';
import { 
  Loader2, Check, PaintBucket, Code, User, Plus, Trash2, 
  Key, Copy, CheckCheck, Globe, Shield, Building2, MapPin, 
  Mail, Phone, FileText, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { applyTheme } from '../theme';
import { useTenant } from '../context/TenantContext';

const GET_SETTINGS_DATA = gql`
  query GetSettingsData {
    me {
      id name email currencyPreference
    }
    organization {
      id name brandColor logoUrl slug
      legalName businessNumber taxId phone website
      supportEmail securityEmail billingAddress city state postalCode country
    }
    webhooks {
      id url eventType isActive isSystem
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

const UPDATE_ORGANIZATION_LEGAL = gql`
  mutation UpdateOrgLegal(
    $legalName: String
    $businessNumber: String
    $taxId: String
    $phone: String
    $website: String
    $supportEmail: String
    $securityEmail: String
    $billingAddress: String
    $city: String
    $state: String
    $postalCode: String
    $country: String
  ) {
    updateOrganizationLegal(
      legalName: $legalName
      businessNumber: $businessNumber
      taxId: $taxId
      phone: $phone
      website: $website
      supportEmail: $supportEmail
      securityEmail: $securityEmail
      billingAddress: $billingAddress
      city: $city
      state: $state
      postalCode: $postalCode
      country: $country
    ) {
      id
      legalName
      businessNumber
      taxId
      phone
      website
      supportEmail
      securityEmail
      billingAddress
      city
      state
      postalCode
      country
    }
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
  const { tenant, refetchTenant } = useTenant();
  const [result, reexecuteQuery] = useQuery({ query: GET_SETTINGS_DATA });
  const { data, fetching, error } = result;

  const [, executeUpdateProfile] = useMutation(UPDATE_PROFILE);
  const [, executeUpdateBranding] = useMutation(UPDATE_BRANDING);
  const [, executeUpdateLegal] = useMutation(UPDATE_ORGANIZATION_LEGAL);
  const [, executeGenerateApiKey] = useMutation(GENERATE_API_KEY);
  const [, executeRevokeApiKey] = useMutation(REVOKE_API_KEY);
  const [, executeAddWebhook] = useMutation(ADD_WEBHOOK);
  const [, executeDeleteWebhook] = useMutation(DELETE_WEBHOOK);

  const [activeTab, setActiveTab] = useState('general');

  // General State
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Branding State
  const [brandColor, setBrandColor] = useState('#4f46e5');
  const [logoUrl, setLogoUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Legal & Enterprise Compliance State
  const [legalName, setLegalName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [securityEmail, setSecurityEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [savingLegal, setSavingLegal] = useState(false);

  // Developer State
  const [newKeyName, setNewKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvent, setNewWebhookEvent] = useState('*');

  useEffect(() => {
    if (data?.me) {
      setName(data.me.name || '');
      setCurrency(data.me.currencyPreference || 'USD');
    }
    if (data?.organization) {
      setBrandColor(data.organization.brandColor || '#4f46e5');
      setLogoUrl(data.organization.logoUrl || '');
      setLegalName(data.organization.legalName || '');
      setBusinessNumber(data.organization.businessNumber || '');
      setTaxId(data.organization.taxId || '');
      setPhone(data.organization.phone || '');
      setWebsite(data.organization.website || '');
      setSupportEmail(data.organization.supportEmail || '');
      setSecurityEmail(data.organization.securityEmail || '');
      setBillingAddress(data.organization.billingAddress || '');
      setCity(data.organization.city || '');
      setState(data.organization.state || '');
      setPostalCode(data.organization.postalCode || '');
      setCountry(data.organization.country || '');
    }
  }, [data]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    await executeUpdateProfile({ name, currencyPreference: currency });
    toast.success('Preferences updated!');
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleBrandingSubmit = async (e) => {
    e.preventDefault();
    await executeUpdateBranding({ brandColor, logoUrl });
    applyTheme(brandColor);
    toast.success('Branding & theme updated across workspace!');
    reexecuteQuery({ requestPolicy: 'network-only' });
    refetchTenant();
  };

  const handleLegalSubmit = async (e) => {
    e.preventDefault();
    setSavingLegal(true);
    try {
      const res = await executeUpdateLegal({
        legalName: legalName || null,
        businessNumber: businessNumber || null,
        taxId: taxId || null,
        phone: phone || null,
        website: website || null,
        supportEmail: supportEmail || null,
        securityEmail: securityEmail || null,
        billingAddress: billingAddress || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || null,
      });
      if (res.error) {
        toast.error(res.error.message);
      } else {
        toast.success('Enterprise Legal & Compliance Profile Updated!');
        reexecuteQuery({ requestPolicy: 'network-only' });
        refetchTenant();
      }
    } catch (err) {
      toast.error('Failed to update enterprise profile: ' + err.message);
    } finally {
      setSavingLegal(false);
    }
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName) return;
    await executeGenerateApiKey({ name: newKeyName });
    setNewKeyName('');
    toast.success('API Key created!');
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleAddWebhook = async (e) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    await executeAddWebhook({ url: newWebhookUrl, eventType: newWebhookEvent });
    setNewWebhookUrl('');
    toast.success('Webhook registered!');
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleCopyTenantUrl = () => {
    const url = `${window.location.origin}/t/${tenant.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast.success('Tenant Workspace URL copied!');
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Loading Configuration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-sm font-medium text-red-500 glass-card my-8">
        Error loading settings: {error.message}
      </div>
    );
  }

  const isOwnerOrAdmin = user?.role === 'Owner' || user?.role === 'Admin' || data?.me?.role === 'Owner' || data?.me?.role === 'Admin';

  return (
    <div className="pt-2 pb-14 w-full h-full max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Control Center</span>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {isOwnerOrAdmin ? 'Workspace Settings' : 'My Account Settings'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
          {isOwnerOrAdmin 
            ? 'Manage tenant identity, enterprise compliance, white-label branding, currency, and developer integrations.'
            : 'Manage your personal account profile details and authentication credentials.'}
        </p>
      </div>

      {/* Navigation Tabs */}
      {isOwnerOrAdmin && (
        <div className="flex flex-wrap sm:flex-nowrap bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl gap-1">
          <TabButton 
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')} 
            icon={<User size={16} />} 
            label="Profile & Preferences" 
          />
          <TabButton 
            active={activeTab === 'legal'} 
            onClick={() => setActiveTab('legal')} 
            icon={<Shield size={16} />} 
            label="Enterprise Legal & Tax" 
          />
          <TabButton 
            active={activeTab === 'branding'} 
            onClick={() => setActiveTab('branding')} 
            icon={<PaintBucket size={16} />} 
            label="Branding & Portal" 
          />
          <TabButton 
            active={activeTab === 'developer'} 
            onClick={() => setActiveTab('developer')} 
            icon={<Code size={16} />} 
            label="API & Webhooks" 
          />
        </div>
      )}

      {/* Tab: General */}
      {activeTab === 'general' && (
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User size={18} className="text-brand-primary" />
              {isOwnerOrAdmin ? 'User Profile & Default Currency' : 'My Profile'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isOwnerOrAdmin ? 'Your personal account details and default financial currency.' : 'Update your personal display name in this workspace.'}
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address (System Authenticated)
              </label>
              <input 
                type="email" 
                value={data?.me?.email || ''} 
                disabled 
                className="glass-input opacity-60 cursor-not-allowed" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="glass-input" 
                required 
              />
            </div>

            {isOwnerOrAdmin && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Default Currency
                </label>
                <select 
                  value={currency} 
                  onChange={e => setCurrency(e.target.value)} 
                  className="glass-input"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="INR">INR (₹) - Indian Rupee</option>
                </select>
              </div>
            )}

            <div className="pt-2">
              <button type="submit" className="btn-primary">
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Enterprise Legal & Compliance */}
      {activeTab === 'legal' && (
        <div className="space-y-6">
          {/* Security & Audit Callout */}
          <div className="glass-card p-5 border border-indigo-500/20 bg-gradient-to-r from-indigo-50/50 via-slate-50/20 to-transparent dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-transparent flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-brand-primary shrink-0 mt-0.5">
              <Shield size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Enterprise B2B Governance & Compliance Standards
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Registered corporate details, tax numbers, and official compliance inboxes are embedded directly onto 
                your generated B2B Invoices, Proposal Statements of Work, and Client Portal security disclosures.
              </p>
            </div>
          </div>

          {/* Legal Information Form */}
          <form onSubmit={handleLegalSubmit} className="glass-card p-6 sm:p-8 space-y-8">
            {/* Section 1: Corporate Entity */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 size={16} className="text-brand-primary" />
                    Corporate Entity & Tax Registration
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Legal registration and official tax authority identifiers.</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Step 1 of 3
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Registered Legal Entity Name
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={e => setLegalName(e.target.value)}
                    placeholder="e.g. Apex Global Technologies Inc. / Apex Solutions Ltd"
                    className="glass-input"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Official incorporated business name if different from brand name ({tenant.name}).</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Company Registration / CRN / CIN
                  </label>
                  <input
                    type="text"
                    value={businessNumber}
                    onChange={e => setBusinessNumber(e.target.value)}
                    placeholder="e.g. CRN-1049281 or LLC-98214"
                    className="glass-input font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Corporate Tax / VAT / GSTIN / EIN
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    placeholder="e.g. US-EIN-12-3456789 or GB123456789"
                    className="glass-input font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Registered Headquarters Address */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-500" />
                    Registered Office & Headquarters
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Physical headquarters printed on official contracts and financial invoices.</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Step 2 of 3
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Headquarters Street Address / Suite
                  </label>
                  <input
                    type="text"
                    value={billingAddress}
                    onChange={e => setBillingAddress(e.target.value)}
                    placeholder="e.g. 100 Montgomery Street, Suite 2400"
                    className="glass-input"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="San Francisco"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      State / Region
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      placeholder="CA"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      placeholder="94104"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      placeholder="United States"
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Security, Support & Corporate Communications */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock size={16} className="text-blue-500" />
                    Security & Corporate Communications
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Dedicated channels for compliance inquiries, billing issues, and audits.</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Step 3 of 3
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Shield size={13} className="text-brand-primary" />
                    Security / Compliance Contact Email (DPO)
                  </label>
                  <input
                    type="email"
                    value={securityEmail}
                    onChange={e => setSecurityEmail(e.target.value)}
                    placeholder="security@yourcompany.com"
                    className="glass-input"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Dedicated contact for SOC2 / GDPR / Data privacy queries.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} className="text-emerald-500" />
                    Official Support / Billing Inbox
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    placeholder="billing@yourcompany.com"
                    className="glass-input"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Printed on invoice remittance instructions.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone size={13} className="text-amber-500" />
                    Corporate Telephone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Globe size={13} className="text-blue-500" />
                    Official Corporate Website
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">All enterprise records are encrypted and audit-logged.</span>
              <button 
                type="submit" 
                disabled={savingLegal} 
                className="btn-primary flex items-center gap-2"
              >
                {savingLegal ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save Enterprise Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Branding & Tenant Identity */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          {/* Tenant Dedicated Workspace URL Card */}
          <div className="glass-card p-6 sm:p-7 border border-brand-primary/20 bg-gradient-to-r from-brand-primary-light/40 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-brand-primary" style={{ color: brandColor }} />
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-primary" style={{ color: brandColor }}>
                    Dedicated Tenant Workspace URL
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  {tenant.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {window.location.origin}/t/{tenant.slug}
                </p>
              </div>

              <button
                onClick={handleCopyTenantUrl}
                className="btn-secondary py-2 px-3 text-xs flex items-center gap-2"
              >
                {copiedUrl ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Theme & Branding Controls */}
          <div className="glass-card p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PaintBucket size={18} className="text-brand-primary" style={{ color: brandColor }} />
                White-Label Theme Tokens & Logo
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Colors and assets defined here customize your entire SolopreneurOS workspace and the public Client Portal in real time.
              </p>
            </div>

            <form onSubmit={handleBrandingSubmit} className="space-y-5 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Primary Brand Hex Color
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={brandColor} 
                    onChange={e => {
                      setBrandColor(e.target.value);
                      applyTheme(e.target.value);
                    }} 
                    className="h-10 w-16 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-transparent" 
                  />
                  <input 
                    type="text" 
                    value={brandColor} 
                    onChange={e => {
                      setBrandColor(e.target.value);
                      applyTheme(e.target.value);
                    }} 
                    className="glass-input uppercase font-mono text-xs" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Organization Logo URL
                </label>
                <input 
                  type="url" 
                  value={logoUrl} 
                  onChange={e => setLogoUrl(e.target.value)} 
                  placeholder="https://example.com/logo.png" 
                  className="glass-input text-xs" 
                />
                {logoUrl && (
                  <div className="mt-3 space-y-2">
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-center h-24">
                      <img src={logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/30 text-xs space-y-1.5">
                      <p className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <Check size={14} className="text-emerald-500" />
                        This logo reflects live across:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] shadow-2xs border border-slate-200/60 dark:border-slate-700">
                          Workspace Sidebar
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] shadow-2xs border border-slate-200/60 dark:border-slate-700">
                          Top Navigation Bar
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] shadow-2xs border border-slate-200/60 dark:border-slate-700">
                          Client Portal (/portal/:token)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] shadow-2xs border border-slate-200/60 dark:border-slate-700">
                          Invoices & Proposals
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button type="submit" className="btn-primary">
                  Save & Apply Branding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Developer */}
      {activeTab === 'developer' && (
        <div className="space-y-6">
          {/* API Keys */}
          <div className="glass-card p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key size={18} className="text-emerald-500" />
                REST & GraphQL API Keys
              </h3>
              <p className="text-xs text-slate-500 mt-1">Authenticate custom automations, scripts, or Zapier integrations.</p>
            </div>

            <form onSubmit={handleGenerateKey} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Key label (e.g. CI/CD or Zapier)" 
                value={newKeyName} 
                onChange={e => setNewKeyName(e.target.value)} 
                className="glass-input flex-1" 
                required 
              />
              <button type="submit" className="btn-primary text-xs shrink-0">
                <Plus size={15} /> Generate Key
              </button>
            </form>

            <div className="space-y-2">
              {data.apiKeys.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">No API keys created yet.</p>
              )}
              {data.apiKeys.map(k => (
                <div key={k.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500">
                      <Key size={14} />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{k.name}</p>
                      <p className="font-mono text-[11px] text-slate-400 truncate">{k.key}</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (confirm('Revoke this key?')) {
                        await executeRevokeApiKey({ keyId: k.id });
                        toast.success('API Key revoked');
                        reexecuteQuery({ requestPolicy: 'network-only' });
                      }
                    }} 
                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks */}
          <div className="glass-card p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Code size={18} className="text-blue-500" />
                Outgoing Webhooks
              </h3>
              <p className="text-xs text-slate-500 mt-1">Receive real-time HTTP payloads whenever events trigger in your tenant.</p>
            </div>

            <form onSubmit={handleAddWebhook} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="url" 
                placeholder="https://webhook.site/..." 
                value={newWebhookUrl} 
                onChange={e => setNewWebhookUrl(e.target.value)} 
                className="glass-input flex-[2]" 
                required 
              />
              <select 
                value={newWebhookEvent} 
                onChange={e => setNewWebhookEvent(e.target.value)} 
                className="glass-input flex-1"
              >
                <option value="*">All Events (*)</option>
                <option value="invoice.send">Invoice Sent / Created</option>
                <option value="proposal.send">Proposal Sent to Client</option>
                <option value="proposal.accepted">Proposal Accepted by Client</option>
                <option value="team.invited">Team Member Invited</option>
                <option value="task.updated">Task Updated</option>
              </select>
              <button type="submit" className="btn-primary text-xs shrink-0">
                <Plus size={15} /> Add Webhook
              </button>
            </form>

            <div className="space-y-2">
              {data.webhooks.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">No active webhooks configured.</p>
              )}
              {data.webhooks.map(wh => (
                <div key={wh.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="overflow-hidden">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{wh.url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold rounded">
                        {wh.eventType}
                      </span>
                      {wh.isSystem && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-brand-primary font-mono text-[10px] font-bold rounded border border-indigo-100 dark:border-indigo-900/30">
                          <Lock size={10} /> System Default (Protected)
                        </span>
                      )}
                    </div>
                  </div>
                  {wh.isSystem ? (
                    <div className="p-1.5 text-slate-400" title="System default webhooks are managed by the platform and cannot be deleted or modified.">
                      <Lock size={16} />
                    </div>
                  ) : (
                    <button 
                      onClick={async () => {
                        await executeDeleteWebhook({ webhookId: wh.id });
                        toast.success('Webhook deleted');
                        reexecuteQuery({ requestPolicy: 'network-only' });
                      }} 
                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
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
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-lg transition-all ${
        active
          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
      }`}
    >
      {icon} 
      <span>{label}</span>
    </button>
  );
}
