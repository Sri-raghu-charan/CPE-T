import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  Building2,
  FolderTree,
  Mail,
  Phone,
  ChevronDown,
} from 'lucide-react';

export const OrgOnboarding: React.FC = () => {
  const { registerOrganization, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('HEALTHCARE');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // OTP State
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !email.trim()) {
      setError('Please fill in the required organization name and email.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Send OTP to the corporate email
      await requestOtp(email.trim(), 'SIGNUP');
      setStep('OTP');
      setDigits(['', '', '', '', '', '']); // Clean - NO auto-fill
      setInfoMessage(`A 6-digit verification code has been dispatched to ${email.trim()}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check your email.');
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
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification passcode.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Verify OTP
      await verifyOtp(email.trim(), otpCode, 'SIGNUP');

      // 2. Complete Organization Onboarding
      await registerOrganization({
        organizationName: orgName.trim(),
        organizationType: orgType,
        category: orgType === 'HEALTHCARE' ? 'Healthcare Services' : 'Enterprise Support',
        adminName: `${orgName.trim()} Admin`,
        email: email.trim(),
        password: 'Password123!',
        contactPhone: phone.trim() || undefined,
        consent: {
          termsAccepted: true,
          termsVersion: '1.0',
        },
      });

      navigate('/organization/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Onboarding failed. Please verify your OTP or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F3F7FA] flex flex-col font-sans select-none">
      
      {/* Top Navigation Bar (Matching Screen 2 in Uploaded Mockup) */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/organization/login')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Login"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-[2px] shadow-sm flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" className="opacity-20" />
                  <path d="M12 3a9 9 0 0 1 9 9" className="text-sky-500 stroke-[3]" />
                  <path d="M12 21a9 9 0 0 1-9-9" className="text-blue-600 stroke-[3]" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-600" />
                </svg>
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#1E293B] block leading-none">
                CPET
              </span>
              <span className="text-[10px] font-medium text-slate-400 block leading-tight">
                Consumer Problem Escalation & Tracking
              </span>
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Gateway</span>
        </Link>
      </header>

      {/* Main Centered Form Container (Screen 2 in Mockup) */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 p-6 sm:p-10">
          
          {/* Title & Subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-[#1E293B] tracking-tight">
              Create Your Organization
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5 leading-relaxed">
              Get started by providing your organization details. You can manage all requests under your organization.
            </p>
          </div>

          {/* Error / Feedback Banner */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}
          {infoMessage && (
            <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-700 font-medium">
              {infoMessage}
            </div>
          )}

          {step === 'FORM' ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Field 1: Organization Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Organization Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter organization name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Field 2: Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Type
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer font-medium"
                  >
                    <option value="HEALTHCARE">Healthcare & Hospitals</option>
                    <option value="UTILITY">Municipal & Public Utilities</option>
                    <option value="CONSUMER_GOODS">Consumer Goods & Appliances</option>
                    <option value="MUNICIPAL">Civic & Municipal Services</option>
                    <option value="GOVERNMENT">Statutory & Education Board</option>
                    <option value="TRANSPORT">Transport & Logistics</option>
                    <option value="OTHER">Other Enterprise</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Field 3: Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Enter official email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Field 4: Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="Enter contact number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 mt-6"
              >
                {isLoading ? 'Sending Passcode...' : 'Create Organization'}
              </button>
            </form>
          ) : (
            /* OTP Confirmation Step */
            <form onSubmit={handleVerifyAndRegister} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Enter 6-Digit Email Passcode
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('FORM')}
                    className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Edit Details
                  </button>
                </div>
                
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Verifying & Creating...' : 'Verify & Launch Workspace'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  ← Back to Organization Details
                </button>
              </div>
            </form>
          )}

          {/* Footer Link: Already have an account? Login */}
          <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-100 pt-5">
            Already have an account?{' '}
            <Link
              to="/organization/login"
              className="text-blue-600 font-bold hover:underline ml-1"
            >
              Login
            </Link>
          </div>

        </div>
      </main>

    </div>
  );
};
