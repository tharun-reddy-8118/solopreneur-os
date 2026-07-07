import { useState } from 'react';
import { useMutation, gql } from 'urql';
import { Loader2, ArrowRight } from 'lucide-react';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      tokenType
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $password: String!, $name: String!, $orgName: String!) {
    register(email: $email, password: $password, name: $name, orgName: $orgName) {
      accessToken
      tokenType
    }
  }
`;

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [loginResult, executeLogin] = useMutation(LOGIN_MUTATION);
  const [registerResult, executeRegister] = useMutation(REGISTER_MUTATION);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (isLogin) {
      const { data, error } = await executeLogin({ email, password });
      if (error) setErrorMsg('Invalid email or password.');
      else if (data?.login?.accessToken) onLogin(data.login.accessToken);
    } else {
      if (!name || !orgName) { setErrorMsg('Name and Organization Name are required.'); return; }
      const { data, error } = await executeRegister({ email, password, name, orgName });
      if (error) setErrorMsg(error.message.replace('[GraphQL] ', ''));
      else if (data?.register?.accessToken) onLogin(data.register.accessToken);
    }
  };

  const fetching = loginResult.fetching || registerResult.fetching;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      
      {/* Decorative clean background element */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:32px_32px] opacity-50 z-0"></div>

      <div className="glass-card w-full max-w-md p-10 z-10 relative bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl rounded-3xl">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="SolopreneurOS Logo" className="h-20 w-auto mx-auto mb-6 drop-shadow-sm" />
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">SolopreneurOS</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {isLogin ? 'Sign in to your workspace' : 'Create your workspace account'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-sm font-bold text-red-600 dark:text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="glass-input"
                  required={!isLogin}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Organization Name</label>
                <input 
                  type="text" 
                  placeholder="Acme Corp" 
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="glass-input"
                  required={!isLogin}
                />
              </div>
            </>
          )}
          
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="glass-input"
              required
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="glass-input"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={fetching} 
            className="w-full btn-primary py-4 flex items-center justify-center gap-2 mt-4 text-lg shadow-lg"
          >
            {fetching ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-700 pt-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="ml-2 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
