import { useState, useRef, useEffect } from 'react';
import { useMutation, gql } from 'urql';
import { 
  Loader2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Mail, 
  Building2, 
  Globe, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  CheckCircle2,
  Lock,
  KeyRound
} from 'lucide-react';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      tokenType
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register(
    $email: String!
    $password: String!
    $name: String!
    $orgName: String!
    $phone: String
    $country: String
    $customSlug: String
  ) {
    register(
      email: $email
      password: $password
      name: $name
      orgName: $orgName
      phone: $phone
      country: $country
      customSlug: $customSlug
    ) {
      success
      email
      message
      requiresOtp
    }
  }
`;

const VERIFY_OTP_MUTATION = gql`
  mutation VerifySignupOtp($email: String!, $otp: String!) {
    verifySignupOtp(email: $email, otp: $otp) {
      accessToken
      tokenType
    }
  }
`;

const RESEND_OTP_MUTATION = gql`
  mutation ResendSignupOtp($email: String!) {
    resendSignupOtp(email: $email)
  }
`;

const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

const RESET_PASSWORD_WITH_OTP_MUTATION = gql`
  mutation ResetPasswordWithOtp($email: String!, $otp: String!, $newPassword: String!) {
    resetPasswordWithOtp(email: $email, otp: $otp, newPassword: $newPassword) {
      accessToken
      tokenType
    }
  }
`;

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'India',
  'Canada',
  'Germany',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'France',
  'Netherlands',
  'Ireland',
  'Other'
];

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'forgot_email' | 'forgot_reset'

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('United States');

  // Forgot Password Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotOtpValues, setForgotOtpValues] = useState(['', '', '', '', '', '']);
  const forgotOtpInputRefs = useRef([]);

  // OTP 6-box input state
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);
  const [resendTimer, setResendTimer] = useState(30);
  const [resendDisabled, setResendDisabled] = useState(true);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // GraphQL Mutations
  const [loginResult, executeLogin] = useMutation(LOGIN_MUTATION);
  const [registerResult, executeRegister] = useMutation(REGISTER_MUTATION);
  const [verifyResult, executeVerifyOtp] = useMutation(VERIFY_OTP_MUTATION);
  const [resendResult, executeResendOtp] = useMutation(RESEND_OTP_MUTATION);
  const [requestResetResult, executeRequestReset] = useMutation(REQUEST_PASSWORD_RESET_MUTATION);
  const [resetPassResult, executeResetPassword] = useMutation(RESET_PASSWORD_WITH_OTP_MUTATION);

  // Auto-generate workspace slug when organization name changes
  const handleOrgNameChange = (val) => {
    setOrgName(val);
    if (!slugManuallyEdited) {
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setCustomSlug(autoSlug);
    }
  };

  // OTP Countdown timer
  useEffect(() => {
    let interval = null;
    if ((step === 'otp' || step === 'forgot_reset') && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Handle OTP digit typing
  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = cleanVal;
    setOtpValues(newOtp);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace & navigation
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = [...otpValues];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || '';
      }
      setOtpValues(newOtp);
      const targetIndex = Math.min(pastedData.length, 5);
      otpInputRefs.current[targetIndex]?.focus();
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isLogin) {
      const { data, error } = await executeLogin({ email, password });
      if (error) {
        const msg = error.message.replace('[GraphQL] ', '');
        if (msg.toLowerCase().includes('pending verification')) {
          setStep('otp');
          setResendTimer(30);
          setResendDisabled(true);
          setErrorMsg('Please enter the 6-digit verification code sent to your email.');
        } else {
          setErrorMsg(msg);
        }
      } else if (data?.login?.accessToken) {
        onLogin(data.login.accessToken);
      }
    } else {
      if (!name || !orgName) {
        setErrorMsg('Full Name and Organization Name are required.');
        return;
      }

      const { data, error } = await executeRegister({
        email,
        password,
        name,
        orgName,
        phone,
        country,
        customSlug: customSlug || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      });

      if (error) {
        setErrorMsg(error.message.replace('[GraphQL] ', ''));
      } else if (data?.register?.success) {
        setStep('otp');
        setResendTimer(30);
        setResendDisabled(true);
        setSuccessMsg(`Verification code dispatched! Check ${email} for your 6-digit OTP.`);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      }
    }
  };

  // Verify OTP Submission
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const fullCode = otpValues.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    const { data, error } = await executeVerifyOtp({ email, otp: fullCode });
    if (error) {
      setErrorMsg(error.message.replace('[GraphQL] ', ''));
    } else if (data?.verifySignupOtp?.accessToken) {
      onLogin(data.verifySignupOtp.accessToken);
    }
  };

  // Resend OTP handler
  const handleResendCode = async () => {
    if (resendDisabled) return;
    setErrorMsg('');
    setSuccessMsg('');

    const { data, error } = await executeResendOtp({ email });
    if (error) {
      setErrorMsg(error.message.replace('[GraphQL] ', ''));
    } else if (data?.resendSignupOtp) {
      setResendTimer(30);
      setResendDisabled(true);
      setSuccessMsg(`New 6-digit verification code sent to ${email}!`);
      setOtpValues(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    }
  };

  // Forgot Password: OTP typing & navigation
  const handleForgotOtpChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...forgotOtpValues];
    newOtp[index] = cleanVal;
    setForgotOtpValues(newOtp);

    if (cleanVal && index < 5) {
      forgotOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotOtpValues[index] && index > 0) {
      forgotOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = [...forgotOtpValues];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || '';
      }
      setForgotOtpValues(newOtp);
      const targetIndex = Math.min(pastedData.length, 5);
      forgotOtpInputRefs.current[targetIndex]?.focus();
    }
  };

  const handleRequestPasswordReset = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    const { data, error } = await executeRequestReset({ email });
    if (error) {
      setErrorMsg(error.message.replace('[GraphQL] ', ''));
    } else if (data?.requestPasswordReset) {
      setStep('forgot_reset');
      setResendTimer(30);
      setResendDisabled(true);
      setSuccessMsg(`A 6-digit password reset code has been dispatched to ${email}.`);
      setForgotOtpValues(['', '', '', '', '', '']);
      setTimeout(() => {
        forgotOtpInputRefs.current[0]?.focus();
      }, 150);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const fullCode = forgotOtpValues.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the reset code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const { data, error } = await executeResetPassword({
      email,
      otp: fullCode,
      newPassword
    });

    if (error) {
      setErrorMsg(error.message.replace('[GraphQL] ', ''));
    } else if (data?.resetPasswordWithOtp?.accessToken) {
      onLogin(data.resetPasswordWithOtp.accessToken);
    }
  };

  const handleResendForgotCode = async () => {
    if (resendDisabled) return;
    setErrorMsg('');
    setSuccessMsg('');

    const { data, error } = await executeRequestReset({ email });
    if (error) {
      setErrorMsg(error.message.replace('[GraphQL] ', ''));
    } else if (data?.requestPasswordReset) {
      setResendTimer(30);
      setResendDisabled(true);
      setSuccessMsg(`New reset code sent to ${email}!`);
      setForgotOtpValues(['', '', '', '', '', '']);
      forgotOtpInputRefs.current[0]?.focus();
    }
  };

  const fetching = loginResult.fetching || registerResult.fetching || verifyResult.fetching || resendResult.fetching || requestResetResult.fetching || resetPassResult.fetching;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden px-4 py-8">
      {/* Subtle modern background grid */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:32px_32px] opacity-50 z-0 pointer-events-none"></div>

      <div className={`glass-card w-full ${step === 'otp' || step === 'forgot_email' || step === 'forgot_reset' ? 'max-w-md' : isLogin ? 'max-w-md' : 'max-w-xl'} p-8 sm:p-10 z-10 relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-slate-200/80 dark:border-slate-700/80 shadow-2xl rounded-3xl transition-all duration-300`}>
        
        {/* ================= STEP 2: OTP VERIFICATION SCREEN ================= */}
        {step === 'otp' ? (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 mb-4 shadow-sm text-indigo-600 dark:text-indigo-400">
                <ShieldCheck size={36} />
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-br from-slate-900 to-indigo-900 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent mb-1.5">
                Verify Your Account
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                We sent a 6-digit security code to{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200 break-all">{email}</span>
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-xs font-semibold text-red-600 dark:text-red-400 text-center">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* 6 Digits Box Group */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-center mb-3">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-inner"
                      required
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={fetching || otpValues.join('').length !== 6}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetching ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Verify & Enter Workspace</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Resend Code & Back actions */}
            <div className="mt-6 flex flex-col items-center gap-3 text-sm">
              <div className="text-slate-500 dark:text-slate-400 text-xs">
                {resendDisabled ? (
                  <span>Resend code in <strong className="text-slate-800 dark:text-slate-200">{resendTimer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={fetching}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Resend verification code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <ArrowLeft size={14} />
                <span>Change registration details</span>
              </button>
            </div>
          </div>
        ) : step === 'forgot_email' ? (
          /* ================= STEP: FORGOT PASSWORD - REQUEST OTP ================= */
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 mb-4 shadow-sm text-indigo-600 dark:text-indigo-400">
                <KeyRound size={36} />
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-br from-slate-900 to-indigo-900 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent mb-1.5">
                Reset Password
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Enter your account email to receive a 6-digit security code to reset your password.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-xs font-semibold text-red-600 dark:text-red-400 text-center">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestPasswordReset} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                  <Mail size={11} />
                  <span>Account Email</span>
                </label>
                <input 
                  type="email" 
                  placeholder="alex@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={fetching || !email}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetching ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Send Reset Code</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </button>
            </div>
          </div>
        ) : step === 'forgot_reset' ? (
          /* ================= STEP: FORGOT PASSWORD - ENTER OTP & NEW PASSWORD ================= */
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 mb-3 shadow-sm text-indigo-600 dark:text-indigo-400">
                <Lock size={36} />
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-br from-slate-900 to-indigo-900 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent mb-1.5">
                Set New Password
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Enter the 6-digit code sent to <span className="font-bold text-slate-800 dark:text-slate-200 break-all">{email}</span> and choose a new password.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-xs font-semibold text-red-600 dark:text-red-400 text-center">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              {/* 6 Digits Box Group */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-center mb-2.5">
                  Enter 6-Digit Reset Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleForgotOtpPaste}>
                  {forgotOtpValues.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (forgotOtpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleForgotOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleForgotOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-inner"
                      required
                    />
                  ))}
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                  <Lock size={11} />
                  <span>New Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    placeholder="At least 6 characters" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input text-sm pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                  <Lock size={11} />
                  <span>Confirm Password</span>
                </label>
                <input 
                  type={showNewPassword ? 'text' : 'password'} 
                  placeholder="Repeat new password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={fetching || forgotOtpValues.join('').length !== 6 || !newPassword || !confirmPassword}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {fetching ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Reset Password & Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Resend Code & Back actions */}
            <div className="mt-5 flex flex-col items-center gap-2 text-sm">
              <div className="text-slate-500 dark:text-slate-400 text-xs">
                {resendDisabled ? (
                  <span>Resend code in <strong className="text-slate-800 dark:text-slate-200">{resendTimer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendForgotCode}
                    disabled={fetching}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Resend reset code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <ArrowLeft size={14} />
                <span>Cancel & Back to Sign In</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================= STEP 1: LOGIN OR ENTERPRISE SIGNUP ================= */
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 mb-3.5 shadow-sm">
                <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-br from-slate-900 to-indigo-900 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent mb-1">
                SolopreneurOS
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {isLogin ? 'Sign in to your freelance operating system' : 'Create your enterprise workspace'}
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-xs font-semibold text-red-600 dark:text-red-400 text-center">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800/50 text-xs font-semibold text-green-600 dark:text-green-400 text-center">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  {/* Row 1: Full Name & Work Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="Alex Morgan" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="glass-input text-sm"
                        required={!isLogin}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                        <Phone size={11} />
                        <span>Work Phone</span>
                      </label>
                      <input 
                        type="tel" 
                        placeholder="+1 (555) 019-2834" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="glass-input text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 2: Organization Name & Custom Workspace Slug */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                      <Building2 size={11} />
                      <span>Organization / Company Name</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Apex Studio LLC" 
                      value={orgName}
                      onChange={(e) => handleOrgNameChange(e.target.value)}
                      className="glass-input text-sm"
                      required={!isLogin}
                    />
                  </div>

                  {/* Workspace URL Slug Preview */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Workspace Link Preview
                      </label>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                        Editable
                      </span>
                    </div>
                    <div className="flex items-center text-xs font-mono text-slate-500 dark:text-slate-400">
                      <span className="opacity-70">solopreneuros.app/t/</span>
                      <input
                        type="text"
                        value={customSlug}
                        onChange={(e) => {
                          setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                          setSlugManuallyEdited(true);
                        }}
                        placeholder="your-slug"
                        className="bg-transparent font-bold text-indigo-600 dark:text-indigo-400 outline-none flex-1 ml-0.5 border-b border-dashed border-indigo-400/50 hover:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Country Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                      <Globe size={11} />
                      <span>Country / Business Location</span>
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="glass-input text-sm cursor-pointer"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} className="dark:bg-slate-800 dark:text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Work Email */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                  <Mail size={11} />
                  <span>Work Email</span>
                </label>
                <input 
                  type="email" 
                  placeholder="alex@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input text-sm"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between ml-1 mb-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock size={11} />
                    <span>Password</span>
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep('forgot_email');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input text-sm pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={fetching} 
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 mt-4 text-sm sm:text-base font-bold shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-60"
              >
                {fetching ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Continue to Verification'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-700/60 pt-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {isLogin ? "Don't have an enterprise account?" : "Already registered?"}
                <button 
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }} 
                  className="ml-2 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  {isLogin ? 'Create Workspace' : 'Log In'}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
