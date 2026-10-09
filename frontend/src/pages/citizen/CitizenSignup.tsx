import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Alert } from '../../design-system/index.js';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  RefreshCw,
  Zap,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  const maskedLocal = local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
}

export const CitizenSignup: React.FC = () => {
  const { registerCitizen, requestOtp, verifyOtp, resendOtp, socialLogin } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(true);

  // 6-digit OTP state
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState(false);

  // Social Auth Modal state
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'Google' | 'Apple'>('Google');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialName, setSocialName] = useState('');
  const [socialLoading, setSocialLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Countdown timer effect for OTP
  useEffect(() => {
    let timer: any = null;
    if (step === 'OTP' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCooldown]);

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to register.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);
    try {
      // Request verification OTP for signup
      await requestOtp(email, 'SIGNUP');
      setDigits(['', '', '', '', '', '']); // Clean - NO auto-fill
      setSuccessNotice(`Verification code sent to ${maskEmail(email)}. Valid for 5 minutes.`);
      setResendCooldown(60);
      setStep('OTP');
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...digits];

    if (cleaned.length > 1) {
      const pastedChars = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedChars[i] || '';
      }
      setDigits(newDigits);
      const nextIndex = Math.min(pastedChars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setDigits(newDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await verifyOtp(email, otpCode, 'SIGNUP');

      const fullPhone = phone ? `${countryCode} ${phone}` : '';
      await registerCitizen({
        name,
        email,
        phone: fullPhone,
        password,
        consent: {
          termsAccepted: true,
          termsVersion: '1.0',
        },
      });

      navigate('/citizen/home', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setSuccessNotice(null);
    try {
      await resendOtp(email, 'SIGNUP');
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']); // Clean - NO auto-fill
      setSuccessNotice(`New verification code sent to ${maskEmail(email)}. Valid for 5 minutes.`);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  // Open Social Auth Modal
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
      navigate('/citizen/home', { replace: true });
    } catch (err: any) {
      setError(err.message || `${socialProvider} registration failed. Please try again.`);
    } finally {
      setSocialLoading(false);
    }
  };

  const pwdStrength = getPasswordStrength();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 flex flex-col justify-center items-center p-3 sm:p-6 lg:p-10 font-sans select-none relative overflow-x-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Responsive Split Container */}
      <div className="w-full max-w-md lg:max-w-5xl xl:max-w-6xl bg-white rounded-3xl sm:rounded-[32px] shadow-2xl shadow-blue-900/10 border border-slate-100/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* LEFT PANEL (Desktop Onboarding Progress & Guarantees) */}
        <div className="hidden lg:col-span-5 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-8 lg:p-10 lg:flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Abstract Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Brand Logo */}
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
                  Citizen Onboarding
                </span>
              </div>
            </Link>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Join 50,000+ Verified Citizens</span>
              </div>
              <h2 className="text-2xl xl:text-3xl font-black text-white tracking-tight leading-snug">
                Resolution at Your Fingertips.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Create your verified citizen account in under 2 minutes for immediate access to direct department triage and automated grievance tracking.
              </p>
            </div>

            {/* Vertical Step Timeline */}
            <div className="mt-8 space-y-5 text-xs">
              {/* Step 1 */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-colors ${
                    step === 'DETAILS'
                      ? 'bg-blue-500 text-white ring-4 ring-blue-500/20'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {step === 'OTP' ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <div>
                  <strong className="text-white block font-semibold">Account Details</strong>
                  <span className="text-slate-400">Enter your name, email & secure credentials</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-colors ${
                    step === 'OTP'
                      ? 'bg-blue-500 text-white ring-4 ring-blue-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  2
                </div>
                <div>
                  <strong className="text-white block font-semibold">OTP Verification</strong>
                  <span className="text-slate-400">Cryptographically secure passcode confirmation</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-white block font-semibold">Instant Access</strong>
                  <span className="text-slate-400">File complaints, utility requests & blood relays</span>
                </div>
              </div>
            </div>
          </div>

          {/* Left Panel Guarantees */}
          <div className="pt-6 border-t border-slate-800/80 mt-6 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero spam guarantee • Strict data privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Hashed passwords with salted multi-factor authentication</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (Interactive Signup Form) */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-between overflow-y-auto">
          
          <div>
            {/* Top Bar: Back Link */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100/80">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80"
                title="Back to Gateway"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Gateway</span>
              </Link>

              {/* Step Pill */}
              <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold">
                Step {step === 'DETAILS' ? '1 of 2' : '2 of 2'}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
                Create Your Account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal">
                {step === 'DETAILS'
                  ? 'Join CPET to resolve issues faster with transparent, trackable SLA timelines.'
                  : `We've sent a 6-digit verification code to ${maskEmail(email)}.`}
              </p>
            </div>

            {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
            {successNotice && <div className="mb-4"><Alert variant="info">{successNotice}</Alert></div>}

            {step === 'DETAILS' ? (
              <form onSubmit={handleInitialSubmit} className="space-y-4">
                
                {/* Responsive 2-Column Grid on Desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Field 1: Full Name */}
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Citizen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Field 2: Email Address */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. citizen@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Field 3: Mobile Number */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mobile Number</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-shrink-0">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-3 pr-7 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+971">🇦🇪 +971</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-3.5 pointer-events-none" />
                      </div>

                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Field 4: Password (Full Width) */}
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        placeholder="Create a strong password (min 8 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Strength:</span>
                          <span className="font-semibold text-slate-700">{pwdStrength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pwdStrength.score >= 1 ? pwdStrength.color : 'bg-transparent'
                            } ${pwdStrength.score >= 1 ? 'w-1/3' : 'w-0'}`}
                          />
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pwdStrength.score >= 2 ? pwdStrength.color : 'bg-transparent'
                            } ${pwdStrength.score >= 2 ? 'w-1/3' : 'w-0'}`}
                          />
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pwdStrength.score >= 3 ? pwdStrength.color : 'bg-transparent'
                            } ${pwdStrength.score >= 3 ? 'w-1/3' : 'w-0'}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Consent Terms Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs text-slate-600 leading-tight">
                      I accept the{' '}
                      <span className="text-blue-600 font-semibold underline">Terms of Service</span> and{' '}
                      <span className="text-blue-600 font-semibold underline">Privacy Policy</span>.
                    </span>
                  </label>
                </div>

                {/* Continue Button */}
                <button
                  type="submit"
                  disabled={isLoading || !consentAccepted}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 mt-4"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Requesting Verification Code...</span>
                    </span>
                  ) : (
                    'Continue to Verification'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                
                {/* Recipient Notice Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-emerald-50/80 border border-blue-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-700">Verification Passcode sent to:</div>
                    <div className="text-sm font-bold text-blue-950 flex items-center gap-2 flex-wrap">
                      <span>{maskEmail(email)}</span>
                      {phone && (
                        <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full border border-emerald-200">
                          📱 {countryCode} {phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStep('DETAILS'); setError(null); }}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                {/* 6-Digit OTP Inputs */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-3 text-center">
                    Enter 6-Digit Verification Passcode
                  </label>
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {digits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        className="w-11 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono border-2 border-slate-200 rounded-xl shadow-xs focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-slate-50 transition-all"
                      />
                    ))}
                  </div>
                </div>

                {/* Verify & Create Account Button */}
                <button
                  type="submit"
                  disabled={isLoading || digits.join('').length !== 6}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying & Creating Account...</span>
                    </span>
                  ) : (
                    'Verify Passcode & Create Account'
                  )}
                </button>

                {/* Resend Passcode Section */}
                <div className="flex items-center justify-center text-xs pt-1">
                  {resendCooldown > 0 ? (
                    <span className="text-slate-400 font-medium">
                      Resend verification code in <strong>{resendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResending}
                      className="inline-flex items-center gap-1.5 text-blue-600 font-semibold underline hover:text-blue-800 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                      <span>Resend Verification Code</span>
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Social Registration Section (When on Step 1) */}
            {step === 'DETAILS' && (
              <div>
                <div className="flex items-center justify-center gap-3 my-4">
                  <div className="flex-1 h-[1px] bg-slate-200" />
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">or sign up with</span>
                  <div className="flex-1 h-[1px] bg-slate-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenSocialModal('Google')}
                    className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] cursor-pointer"
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
                    className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.68-1.92-14.58-6.14-3.21-2.75-7.09-7.44-11.64-14.07-6.28-9.1-11.23-19.38-14.85-30.83-3.62-11.45-5.43-22.18-5.43-32.19 0-14.65 3.73-26.68 11.19-36.09 7.46-9.41 16.82-14.19 28.08-14.34 4.82 0 9.94 1.18 15.35 3.55 5.41 2.37 9.24 3.55 11.49 3.55 2.12 0 6.04-1.23 11.75-3.69 5.71-2.46 10.63-3.64 14.76-3.55 12.33.51 22.25 4.96 29.74 13.35-10.95 6.64-16.32 15.77-16.1 27.39.22 9.04 3.7 16.71 10.45 23 6.75 6.29 14.84 9.87 24.26 10.74-2.24 6.78-5.13 13.37-8.67 19.78zM119.22 31.42c0-7.3 2.66-14.32 7.98-21.05 5.32-6.73 12.02-10.37 20.1-10.92.11.96.17 1.83.17 2.62 0 7.21-2.73 14.31-8.19 21.3-5.46 6.99-12.18 10.76-20.16 11.31-.05-1.07-.11-2.14-.11-3.26z" />
                    </svg>
                    <span>Apple ID</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="pt-6 text-center text-xs text-slate-500">
            Already have a CPET account?{' '}
            <Link to="/citizen/login" className="font-extrabold text-blue-600 hover:underline ml-1">
              Sign In
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
                    Sign up with {socialProvider}
                  </h3>
                  <span className="text-[10px] text-slate-400">One-click account registration</span>
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
                Quick 1-Click Sign-Up
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
                {socialLoading ? 'Creating Account...' : `Register with ${socialProvider}`}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
