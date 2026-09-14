import React, { useState } from 'react';
import { useMutation, gql } from 'urql';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenant } from '../context/TenantContext';

const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($newPassword: String!) {
    changePassword(newPassword: $newPassword) {
      id
      email
      mustChangePassword
    }
  }
`;

export default function SetPasswordModal() {
  const { user, tenant, refetchTenant } = useTenant();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [res, executeChangePassword] = useMutation(CHANGE_PASSWORD_MUTATION);

  // Only display if user is flagged as requiring password change
  if (!user?.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both fields.');
      return;
    }

    const result = await executeChangePassword({ newPassword });

    if (result.error) {
      setErrorMsg(result.error.message.replace('[GraphQL] ', ''));
    } else {
      toast.success('Permanent password set successfully! Welcome aboard.', {
        icon: '🔒',
        duration: 4000,
      });
      if (refetchTenant) {
        await refetchTenant();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.35 }}
        className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header decoration */}
        <div className="p-6 pb-2 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-sm">
            <KeyRound size={26} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 mb-2">
            <Lock size={12} />
            <span>Action Required • First Login</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Set Your Permanent Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed px-2">
            Welcome to <span className="font-semibold text-slate-800 dark:text-slate-200">{tenant?.name || 'the workspace'}</span>! You logged in using a temporary invitation key. Please choose your permanent password to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium"
            >
              {errorMsg}
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              New Permanent Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="glass-input w-full pr-10 text-xs py-2.5"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm Permanent Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type your new password"
                required
                className="glass-input w-full pr-10 text-xs py-2.5"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={res.fetching}
              className="btn-primary w-full py-3 text-xs flex items-center justify-center gap-2 font-bold shadow-md"
            >
              {res.fetching ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating Security Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Save Password & Unlock Workspace</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 font-medium">
            This screen cannot be skipped until your permanent password is set.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
