import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  FileCheck,
  TrendingUp,
  Zap,
  X,
} from 'lucide-react';

export const OrgLogin: React.FC = () => {
  const { login, requestOtp, verifyOtp, resetPassword, socialLogin, logout } = useAuth();
  const navigate = useNavigate();

  // Mode: 'OTP_REQUEST' | 'OTP_VERIFY' | 'PASSWORD_LOGIN' | 'FORGOT_PASSWORD'
  const [authMode, setAuthMode] = useState<'OTP_REQUEST' | 'OTP_VERIFY' | 'PASSWORD_LOGIN' | 'FORGOT_PASSWORD'>('OTP_REQUEST');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgIdOrEmail, setOrgIdOrEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState('');

  // Forgot Password state
  const [resetStep, setResetStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [resetTarget, setResetTarget] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Social Auth Modal state
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'Google' | 'Apple'>('Google');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialName, setSocialName] = useState('');
  const [socialLoading, setSocialLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Handle Request OTP (Default Screen 1 Flow)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your official email address.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      await requestOtp(email.trim(), 'LOGIN');
      setAuthMode('OTP_VERIFY');
      setOtpCode(''); // Clean - NO auto-fill
      setInfoMessage(`A 6-digit verification passcode has been dispatched to ${email.trim()}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP. Please verify your email or use Password Login.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length !== 6) {
      setError('Please enter the 6-digit passcode.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const user = await verifyOtp(email.trim(), otpCode.trim(), 'LOGIN');
      if (user && (user.role === 'CITIZEN' || user.role === 'DONOR')) {
        await logout();
        setError('This account is registered as a Citizen. Redirecting to Citizen Portal...');
        setTimeout(() => navigate('/citizen/home', { replace: true }), 1500);
        return;
      }
      navigate('/organization/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Incorrect verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Login (Organization ID / Email mode)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginIdentifier = orgIdOrEmail.trim() || email.trim();
    if (!loginIdentifier || !password) {
      setError('Please enter your login identifier and password.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const user = await login(loginIdentifier, password);
      if (user.role === 'CITIZEN' || user.role === 'DONOR') {
        await logout();
        setError('This account is registered as a Citizen. Redirecting to Citizen Portal...');
        setTimeout(() => navigate('/citizen/home', { replace: true }), 1500);
        return;
      }
      navigate('/organization/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email/ID and password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Step 1 (Send Reset Code)
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget.trim()) {
      setError('Please enter your official organization email.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = await requestOtp(resetTarget.trim(), 'PASSWORD_RESET');
      setResetStep('VERIFY');
      setResetOtp('');
      setInfoMessage(res.message || `A 6-digit password reset code was dispatched to ${resetTarget.trim()}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code. Please check your organization email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Step 2 (Reset Password with OTP)
  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp.trim() || resetOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await resetPassword(resetTarget.trim(), resetOtp.trim(), newPassword);
      setOrgIdOrEmail(resetTarget.trim());
      setAuthMode('PASSWORD_LOGIN');
      setResetStep('REQUEST');
      setInfoMessage('Password reset successfully! Please sign in with your new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Social Auth Modal
  const handleOpenSocialModal = (provider: 'Google' | 'Apple') => {
    setSocialProvider(provider);
    if (provider === 'Google') {
      setSocialEmail('org.admin@apexutility.org');
      setSocialName('Apex Support Lead');
    } else {
      setSocialEmail('director@citywater.org');
      setSocialName('Director of Utilities');
    }
    setSocialModalOpen(true);
    setError(null);
  };

  // Execute Social Auth for Organization
  const handleExecuteSocialAuth = async (customEmail?: string, customName?: string) => {
    setSocialLoading(true);
    setError(null);
    try {
      const emailToUse = (customEmail || socialEmail).trim();
      const nameToUse = (customName || socialName).trim();

      if (!emailToUse) {
        setError('Please enter a valid official email address.');
        setSocialLoading(false);
        return;
      }

      await socialLogin({
        provider: socialProvider.toUpperCase() as 'GOOGLE' | 'APPLE',
        email: emailToUse,
        name: nameToUse || `${socialProvider} Org Admin`,
        role: 'ORGANIZATION_ADMIN',
      });

      setSocialModalOpen(false);
      navigate('/organization/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || `${socialProvider} sign-in failed. Please try again.`);
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F3F7FA] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans select-none relative">
      
      {/* Main Desktop Two-Column Split Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] relative z-10">
        
        {/* ================= LEFT COLUMN: HERO & BRANDING (58% width on desktop) ================= */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#EEF5FF] via-[#F5F9FF] to-[#E9F2FE] p-8 sm:p-12 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-slate-200/60 overflow-hidden">
          
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-[2.5px] shadow-sm shadow-blue-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" className="opacity-20" />
                  <path d="M12 3a9 9 0 0 1 9 9" className="text-sky-500 stroke-[3]" />
                  <path d="M12 21a9 9 0 0 1-9-9" className="text-blue-600 stroke-[3]" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-600" />
                </svg>
              </div>
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-[#1E293B] block leading-none">
                CPET
              </span>
              <span className="text-[11px] font-medium text-slate-500 tracking-tight leading-tight mt-0.5 block">
                Consumer Problem Escalation & Tracking
              </span>
            </div>
          </div>

          {/* Center Content: Headline & Vector Illustration */}
          <div className="my-8 relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black text-[#1E293B] tracking-tight leading-tight">
              Better Support.<br />
              Faster Solutions.
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-normal mt-3 max-w-md leading-relaxed">
              Log in to manage requests, track progress and ensure timely resolution for your organization.
            </p>

            {/* Support Specialist Vector Illustration */}
            <div className="mt-8 flex justify-center items-center">
              <div className="relative w-72 sm:w-80 h-48 sm:h-56 flex items-center justify-center">
                
                {/* Floating Glow & Background Arc */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-200/40 via-sky-100/20 to-transparent rounded-3xl" />
                
                {/* SVG Illustration of Customer Agent with Laptop and Support Badges */}
                <svg className="w-full h-full" viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Floating Notification Badge 1 */}
                  <g className="animate-bounce" style={{ animationDuration: '4s' }}>
                    <rect x="25" y="40" width="36" height="36" rx="12" fill="#FFFFFF" filter="drop-shadow(0px 4px 12px rgba(37,99,235,0.15))"/>
                    <circle cx="43" cy="58" r="10" fill="#EBF3FE" />
                    <path d="M39 58h8M43 54v8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>
                  </g>

                  {/* Floating Notification Badge 2 */}
                  <g className="animate-pulse" style={{ animationDuration: '3s' }}>
                    <rect x="255" y="55" width="36" height="36" rx="12" fill="#FFFFFF" filter="drop-shadow(0px 4px 12px rgba(37,99,235,0.15))"/>
                    <circle cx="273" cy="73" r="10" fill="#EDFBF3" />
                    <path d="M269 73l3 3 6-6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>

                  {/* Desk / Base Surface */}
                  <ellipse cx="160" cy="190" rx="120" ry="16" fill="#DBEAFE" fillOpacity="0.7"/>

                  {/* Character Illustration */}
                  <path d="M120 185c0-28 18-42 40-42s40 14 40 42H120z" fill="#2563EB"/>
                  <path d="M145 143h30v25h-30z" fill="#FFFFFF"/>
                  <path d="M148 143l12 18 12-18" stroke="#DBEAFE" strokeWidth="2"/>

                  <circle cx="160" cy="115" r="22" fill="#FED7AA"/>
                  <path d="M138 112c0-16 10-26 22-26s22 10 22 26c-4-4-10-8-22-8s-18 4-22 8z" fill="#1E293B"/>
                  <path d="M138 112c0 10 3 18 6 22h32c3-4 6-12 6-22" fill="#1E293B" opacity="0.15"/>

                  <path d="M142 110c0-12 8-18 18-18s18 6 18 18" stroke="#64748B" strokeWidth="3" strokeLinecap="round"/>
                  <rect x="139" y="106" width="6" height="12" rx="3" fill="#2563EB"/>
                  <rect x="175" y="106" width="6" height="12" rx="3" fill="#2563EB"/>
                  <path d="M142 114c0 8 8 10 14 10" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>

                  <path d="M130 178l8-22h44l8 22H130z" fill="#94A3B8"/>
                  <rect x="140" y="158" width="40" height="18" rx="2" fill="#3B82F6"/>
                  <rect x="120" y="178" width="80" height="5" rx="2.5" fill="#64748B"/>
                  <circle cx="160" cy="167" r="3" fill="#FFFFFF"/>
                </svg>

              </div>
            </div>
          </div>

          {/* Bottom 3 Feature Highlights */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-200/60 relative z-10 text-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center text-blue-600 mb-1.5 border border-blue-50">
                <FileCheck className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Track Requests</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center text-blue-600 mb-1.5 border border-blue-50">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Monitor Progress</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center text-blue-600 mb-1.5 border border-blue-50">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Resolve Faster</span>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: LOGIN FORM CARD (42% width on desktop) ================= */}
        <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between bg-white">
          
          <div>
            {/* Back to Gateway Link */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100/80">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Gateway</span>
              </Link>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Organization Portal
              </span>
            </div>

            {/* Top Navigation Tabs: [ Login ] | [ New Organization ] */}
            {authMode !== 'FORGOT_PASSWORD' ? (
              <div className="flex items-center justify-around border-b border-slate-100 mb-6 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('OTP_REQUEST');
                    setError(null);
                  }}
                  className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
                    authMode === 'OTP_REQUEST' || authMode === 'OTP_VERIFY' || authMode === 'PASSWORD_LOGIN'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Login
                </button>
                <Link
                  to="/organization/onboarding"
                  className="pb-3 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  New Organization
                </Link>
              </div>
            ) : (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('PASSWORD_LOGIN');
                    setError(null);
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Password Login</span>
                </button>
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="mb-5">
              <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight">
                {authMode === 'FORGOT_PASSWORD'
                  ? 'Reset Organization Password'
                  : authMode === 'PASSWORD_LOGIN'
                  ? 'Login with Password'
                  : authMode === 'OTP_VERIFY'
                  ? 'Verify Your Passcode'
                  : 'Login to your Organization'}
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                {authMode === 'FORGOT_PASSWORD'
                  ? 'Enter your registered organization email to receive a password reset code'
                  : authMode === 'PASSWORD_LOGIN'
                  ? 'Enter your organization identifier and password'
                  : authMode === 'OTP_VERIFY'
                  ? `Enter the 6-digit passcode sent to ${email}`
                  : 'Enter your email address to receive OTP'}
              </p>
            </div>

            {/* Error / Feedback Message */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}
            {infoMessage && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-medium">
                {infoMessage}
              </div>
            )}

            {/* ============ FLOW 1: REQUEST OTP (Default Mockup State) ============ */}
            {authMode === 'OTP_REQUEST' && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="Enter your official email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Primary Button: Solid Vivid Blue */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 mt-4"
                >
                  {isLoading ? 'Sending OTP...' : 'Send OTP'}
                </button>

                {/* Divider: OR */}
                <div className="flex items-center justify-center gap-3 my-3">
                  <div className="flex-1 h-[1px] bg-slate-200" />
                  <span className="text-xs text-slate-400 font-semibold tracking-wider">OR</span>
                  <div className="flex-1 h-[1px] bg-slate-200" />
                </div>

                {/* Secondary Button: Login with Organization ID / Password */}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('PASSWORD_LOGIN');
                    setError(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>Login with Organization ID & Password</span>
                </button>
              </form>
            )}

            {/* ============ FLOW 2: VERIFY OTP PASSCODE ============ */}
            {authMode === 'OTP_VERIFY' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      6-Digit Passcode
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('OTP_REQUEST')}
                      className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono text-center tracking-[8px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  className="w-full py-3 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('OTP_REQUEST')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    ← Back to Email Entry
                  </button>
                </div>
              </form>
            )}

            {/* ============ FLOW 3: PASSWORD LOGIN ============ */}
            {authMode === 'PASSWORD_LOGIN' && (
              <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organization ID or Official Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="admin@apexutility.org or org@cpet.org"
                      value={orgIdOrEmail}
                      onChange={(e) => setOrgIdOrEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('FORGOT_PASSWORD');
                        setResetTarget(orgIdOrEmail || email);
                        setResetStep('REQUEST');
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 mt-3"
                >
                  {isLoading ? 'Signing In...' : 'Login'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('OTP_REQUEST');
                      setError(null);
                    }}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    ← Switch to Email OTP Login
                  </button>
                </div>
              </form>
            )}

            {/* ============ FLOW 4: FORGOT PASSWORD ============ */}
            {authMode === 'FORGOT_PASSWORD' && (
              <div className="space-y-4">
                {resetStep === 'REQUEST' ? (
                  <form onSubmit={handleRequestResetOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Registered Organization Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="Enter registered email address"
                        value={resetTarget}
                        onChange={(e) => setResetTarget(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? 'Sending Reset Code...' : 'Send Password Reset Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePerformReset} className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          6-Digit Verification Code
                        </label>
                        <button
                          type="button"
                          onClick={() => setResetStep('REQUEST')}
                          className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                        >
                          Change email
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="• • • • • •"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono text-center tracking-[6px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        New Password (min 8 characters)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {isLoading ? 'Resetting Password...' : 'Save New Password & Log In'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Divider: OR CONTINUE WITH */}
          {authMode !== 'FORGOT_PASSWORD' && (
            <div>
              <div className="flex items-center justify-center gap-3 my-4">
                <div className="flex-1 h-[1px] bg-slate-200" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">or sign in with</span>
                <div className="flex-1 h-[1px] bg-slate-200" />
              </div>

              {/* Social Login Buttons: Google & Apple */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenSocialModal('Google')}
                  className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenSocialModal('Apple')}
                  className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.68-1.92-14.58-6.14-3.21-2.75-7.09-7.44-11.64-14.07-6.28-9.1-11.23-19.38-14.85-30.83-3.62-11.45-5.43-22.18-5.43-32.19 0-14.65 3.73-26.68 11.19-36.09 7.46-9.41 16.82-14.19 28.08-14.34 4.82 0 9.94 1.18 15.35 3.55 5.41 2.37 9.24 3.55 11.49 3.55 2.12 0 6.04-1.23 11.75-3.69 5.71-2.46 10.63-3.64 14.76-3.55 12.33.51 22.25 4.96 29.74 13.35-10.95 6.64-16.32 15.77-16.1 27.39.22 9.04 3.7 16.71 10.45 23 6.75 6.29 14.84 9.87 24.26 10.74-2.24 6.78-5.13 13.37-8.67 19.78zM119.22 31.42c0-7.3 2.66-14.32 7.98-21.05 5.32-6.73 12.02-10.37 20.1-10.92.11.96.17 1.83.17 2.62 0 7.21-2.73 14.31-8.19 21.3-5.46 6.99-12.18 10.76-20.16 11.31-.05-1.07-.11-2.14-.11-3.26z" />
                  </svg>
                  <span>Apple ID</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Link: "Don't have an account? Create Organization" */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/organization/onboarding"
              className="text-blue-600 font-bold hover:underline"
            >
              Create Organization
            </Link>
          </div>

        </div>

      </div>

      {/* ================= SOCIAL AUTH POPUP MODAL ================= */}
      {socialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                {socialProvider === 'Google' ? (
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.68-1.92-14.58-6.14-3.21-2.75-7.09-7.44-11.64-14.07-6.28-9.1-11.23-19.38-14.85-30.83-3.62-11.45-5.43-22.18-5.43-32.19 0-14.65 3.73-26.68 11.19-36.09 7.46-9.41 16.82-14.19 28.08-14.34 4.82 0 9.94 1.18 15.35 3.55 5.41 2.37 9.24 3.55 11.49 3.55 2.12 0 6.04-1.23 11.75-3.69 5.71-2.46 10.63-3.64 14.76-3.55 12.33.51 22.25 4.96 29.74 13.35-10.95 6.64-16.32 15.77-16.1 27.39.22 9.04 3.7 16.71 10.45 23 6.75 6.29 14.84 9.87 24.26 10.74-2.24 6.78-5.13 13.37-8.67 19.78zM119.22 31.42c0-7.3 2.66-14.32 7.98-21.05 5.32-6.73 12.02-10.37 20.1-10.92.11.96.17 1.83.17 2.62 0 7.21-2.73 14.31-8.19 21.3-5.46 6.99-12.18 10.76-20.16 11.31-.05-1.07-.11-2.14-.11-3.26z" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Sign in with {socialProvider}
                  </h3>
                  <span className="text-[10px] text-slate-400">Organization Single Sign-On</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSocialModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-Click Profile Card */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Authorized Workspace
              </span>
              <div
                onClick={() => handleExecuteSocialAuth(
                  socialProvider === 'Google' ? 'org.admin@apexutility.org' : 'director@citywater.org',
                  socialProvider === 'Google' ? 'Apex Support Lead' : 'Director of Utilities'
                )}
                className="p-3 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {socialProvider === 'Google' ? 'A' : 'D'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {socialProvider === 'Google' ? 'Apex Support Lead' : 'Director of Utilities'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {socialProvider === 'Google' ? 'org.admin@apexutility.org' : 'director@citywater.org'}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  Launch →
                </span>
              </div>
            </div>

            {/* Custom Account Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteSocialAuth();
              }}
              className="space-y-3 pt-2 border-t border-slate-100"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Or Use Custom Organization {socialProvider} Email:
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@yourorganization.org"
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Administrator / Officer Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Officer Name"
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={socialLoading}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {socialLoading ? 'Authorizing Workspace...' : `Continue to Dashboard with ${socialProvider}`}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
