import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Alert } from '../../design-system/index.js';
import {
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Clock,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  X,
} from 'lucide-react';

export const CitizenLogin: React.FC = () => {
  const { login, requestOtp, verifyOtp, resetPassword, socialLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/citizen/home';

  // Mode: 'PASSWORD' | 'OTP' | 'FORGOT_PASSWORD'
  const [mode, setMode] = useState<'PASSWORD' | 'OTP' | 'FORGOT_PASSWORD'>('PASSWORD');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP mode state
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

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

  // Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await requestOtp(identifier, 'LOGIN');
      setOtpSent(true);
      setOtpCode(''); // Clean - NO auto-fill
      setInfoMessage(res.message || `A 6-digit verification code has been sent to ${identifier}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await verifyOtp(identifier, otpCode, 'LOGIN');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Step 1 (Send Reset Code)
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget.trim()) {
      setError('Please enter your registered email address or mobile number.');
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
      setError(err.message || 'Failed to send reset code. Please check your email or phone.');
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
      setIdentifier(resetTarget.trim());
      setMode('PASSWORD');
      setResetStep('REQUEST');
      setInfoMessage('Password reset successfully! Please sign in with your new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Social Login Trigger
  const handleOpenSocialModal = (provider: 'Google' | 'Apple') => {
    setSocialProvider(provider);
    if (provider === 'Google') {
      setSocialEmail('varsha.s@gmail.com');
      setSocialName('Varsha S');
    } else {
      setSocialEmail('varsha@icloud.com');
      setSocialName('Varsha S');
    }
    setSocialModalOpen(true);
    setError(null);
  };

  // Execute Social Auth
  const handleExecuteSocialAuth = async (customEmail?: string, customName?: string) => {
    setSocialLoading(true);
    setError(null);
    try {
      const emailToUse = (customEmail || socialEmail).trim();
      const nameToUse = (customName || socialName).trim();

      if (!emailToUse) {
        setError('Please enter a valid email address.');
        setSocialLoading(false);
        return;
      }

      await socialLogin({
        provider: socialProvider.toUpperCase() as 'GOOGLE' | 'APPLE',
        email: emailToUse,
        name: nameToUse || (socialProvider === 'Google' ? 'Google User' : 'Apple User'),
        role: 'CITIZEN',
      });

      setSocialModalOpen(false);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || `${socialProvider} sign-in failed. Please try again.`);
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 flex flex-col justify-center items-center p-3 sm:p-6 lg:p-10 font-sans select-none relative overflow-x-hidden">
      {/* Decorative Glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Responsive Split Container */}
      <div className="w-full max-w-md lg:max-w-5xl xl:max-w-6xl bg-white rounded-3xl sm:rounded-[32px] shadow-2xl shadow-blue-900/10 border border-slate-100/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* LEFT PANEL (Desktop Feature & Brand Showcase) */}
        <div className="hidden lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-8 lg:p-10 lg:flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Abstract Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Brand Header */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 group mb-8">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-sky-400 p-[2px] flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white block leading-tight">
                  CPET
                </span>
                <span className="text-[10px] font-semibold text-blue-300 tracking-wide uppercase">
                  Citizen Portal
                </span>
              </div>
            </Link>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Single Gateway for Public Grievances</span>
              </div>
              <h2 className="text-2xl xl:text-3xl font-black text-white tracking-tight leading-snug">
                Transparent civic resolution with automated SLA tracking.
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed">
                Connect directly with certified municipal departments, utilities, blood banks, and verified service providers.
              </p>
            </div>

            {/* Key Value Points */}
            <div className="mt-8 space-y-4 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-white block font-semibold">Real-Time SLA Timers</strong>
                  <span>Watch your case move from intake to technician dispatch.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-white block font-semibold">Automated Escalation</strong>
                  <span>Unresolved tickets automatically escalate to senior desks.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HeartHandshake className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-white block font-semibold">Emergency Blood Relay</strong>
                  <span>Find matching verified donors without exposing phone numbers.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Left Panel Bottom Trust Badge */}
          <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>End-to-End Encrypted & Identity Guard Protected</span>
          </div>
        </div>

        {/* RIGHT PANEL (Interactive Authentication Form) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Top Back to Gateway Navigation */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100/80">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80"
                title="Back to CPET Welcome"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Gateway</span>
              </Link>

              {/* Mobile-Only Brand Pill */}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black">
                  C
                </div>
                <span className="font-black text-lg text-slate-900 tracking-tight">CPET</span>
              </div>
            </div>

            {/* Form Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
                {mode === 'FORGOT_PASSWORD'
                  ? 'Reset Your Password'
                  : mode === 'OTP'
                  ? 'Sign In with Passcode'
                  : 'Welcome Back!'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal">
                {mode === 'FORGOT_PASSWORD'
                  ? 'Follow the steps to securely recover and reset your password.'
                  : mode === 'OTP'
                  ? 'Enter your registered mobile or email to receive a secure login code.'
                  : 'Sign in to manage your active cases, track progress, or submit new requests.'}
              </p>
            </div>

            {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
            {infoMessage && <div className="mb-4"><Alert variant="info">{infoMessage}</Alert></div>}

            {/* Mode Switcher Tabs (Only if not in Forgot Password mode) */}
            {mode !== 'FORGOT_PASSWORD' ? (
              <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
                <button
                  type="button"
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'PASSWORD'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => { setMode('PASSWORD'); setError(null); }}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'OTP'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => { setMode('OTP'); setError(null); }}
                >
                  OTP Passcode
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => { setMode('PASSWORD'); setError(null); }}
                  className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Password Login</span>
                </button>
              </div>
            )}

            {/* ================= FLOW 1: PASSWORD LOGIN ================= */}
            {mode === 'PASSWORD' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mobile Number or Email</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210 or user@example.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('FORGOT_PASSWORD');
                        setResetTarget(identifier);
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
                      placeholder="Enter your account password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 mt-3"
                >
                  {isLoading ? 'Signing In...' : 'Sign In to Citizen Portal'}
                </button>
              </form>
            )}

            {/* ================= FLOW 2: OTP LOGIN ================= */}
            {mode === 'OTP' && (
              <div>
                {!otpSent ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Registered Mobile Number or Email</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9876543210 or citizen@cpet.org"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? 'Sending Passcode...' : 'Send Verification Passcode'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Enter 6-Digit Passcode
                        </label>
                        <button
                          type="button"
                          className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                          onClick={() => setOtpSent(false)}
                        >
                          Change recipient
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono text-center tracking-[6px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || otpCode.length !== 6}
                      className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? 'Verifying...' : 'Verify Passcode & Sign In'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ================= FLOW 3: FORGOT PASSWORD ================= */}
            {mode === 'FORGOT_PASSWORD' && (
              <div className="space-y-4">
                {resetStep === 'REQUEST' ? (
                  <form onSubmit={handleRequestResetOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Registered Email Address or Mobile Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your registered email or phone"
                        value={resetTarget}
                        onChange={(e) => setResetTarget(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? 'Sending Reset Code...' : 'Send Password Reset Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePerformReset} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          6-Digit Verification Code
                        </label>
                        <button
                          type="button"
                          onClick={() => setResetStep('REQUEST')}
                          className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                        >
                          Change recipient
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono text-center tracking-[6px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        New Password (min 8 characters)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? 'Resetting Password...' : 'Save New Password & Log In'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-3 my-6">
            <div className="flex-1 h-[1px] bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-[1px] bg-slate-200" />
          </div>

          {/* Social Authentication Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOpenSocialModal('Google')}
              className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google Account</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenSocialModal('Apple')}
              className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.68-1.92-14.58-6.14-3.21-2.75-7.09-7.44-11.64-14.07-6.28-9.1-11.23-19.38-14.85-30.83-3.62-11.45-5.43-22.18-5.43-32.19 0-14.65 3.73-26.68 11.19-36.09 7.46-9.41 16.82-14.19 28.08-14.34 4.82 0 9.94 1.18 15.35 3.55 5.41 2.37 9.24 3.55 11.49 3.55 2.12 0 6.04-1.23 11.75-3.69 5.71-2.46 10.63-3.64 14.76-3.55 12.33.51 22.25 4.96 29.74 13.35-10.95 6.64-16.32 15.77-16.1 27.39.22 9.04 3.7 16.71 10.45 23 6.75 6.29 14.84 9.87 24.26 10.74-2.24 6.78-5.13 13.37-8.67 19.78zM119.22 31.42c0-7.3 2.66-14.32 7.98-21.05 5.32-6.73 12.02-10.37 20.1-10.92.11.96.17 1.83.17 2.62 0 7.21-2.73 14.31-8.19 21.3-5.46 6.99-12.18 10.76-20.16 11.31-.05-1.07-.11-2.14-.11-3.26z" />
              </svg>
              <span>Apple ID</span>
            </button>
          </div>

          {/* Footer Registration Link */}
          <div className="pt-6 text-center text-xs text-slate-500">
            Don't have a CPET account?{' '}
            <Link to="/citizen/signup" className="font-extrabold text-blue-600 hover:underline ml-1">
              Create Free Account
            </Link>
          </div>
        </div>
      </div>

      {/* ================= SOCIAL AUTH POPUP MODAL ================= */}
      {socialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5 animate-scaleUp">
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
                  <span className="text-[10px] text-slate-400">Choose or enter account</span>
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
                Quick 1-Click Sign-In
              </span>
              <div
                onClick={() => handleExecuteSocialAuth(
                  socialProvider === 'Google' ? 'varsha.s@gmail.com' : 'varsha@icloud.com',
                  'Varsha S'
                )}
                className="p-3 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    V
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Varsha S</div>
                    <div className="text-[11px] text-slate-500">
                      {socialProvider === 'Google' ? 'varsha.s@gmail.com' : 'varsha@icloud.com'}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  Continue →
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
                  Or Use Custom {socialProvider} Email:
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
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
                {socialLoading ? 'Authorizing...' : `Continue with ${socialProvider}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
