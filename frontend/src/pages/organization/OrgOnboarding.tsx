import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Alert,
} from '../../design-system/index.js';
import { Building2, ArrowLeft, Mail, RefreshCw, ShieldCheck } from 'lucide-react';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  const maskedLocal = local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
}

export const OrgOnboarding: React.FC = () => {
  const { registerOrganization, requestOtp, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('UTILITY');
  const [category, setCategory] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  // 6-digit OTP state
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Countdown timer effect
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

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAccepted) {
      setError('You must accept the terms of service to onboard.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);
    try {
      // Request email OTP for organization onboarding
      await requestOtp(email, 'SIGNUP');
      setDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      setStep('OTP');
      setSuccessNotice(`Verification code sent to corporate email: ${maskEmail(email)}.`);
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
      // 1. Verify the OTP challenge
      await verifyOtp(email, otpCode, 'SIGNUP');

      // 2. Complete organization onboarding and establish session
      await registerOrganization({
        organizationName: orgName,
        organizationType: orgType,
        category: category || 'General',
        adminName,
        email,
        password,
        contactPhone,
        address,
        consent: {
          termsAccepted: true,
          termsVersion: '1.0',
        },
      });

      navigate('/organization/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Onboarding failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      await resendOtp(email, 'SIGNUP');
      setResendCooldown(60);
      setSuccessNotice(`A fresh verification code has been dispatched to ${maskEmail(email)}.`);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to gateway</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-700 text-white font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900 text-base">CPET Organization Registration</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <Card className="border-slate-300 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {step === 'DETAILS' ? 'Onboard Organization Tenant' : 'Verify Corporate Email'}
              </CardTitle>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Step {step === 'DETAILS' ? '1 of 2' : '2 of 2'}
              </span>
            </div>
            <CardDescription>
              {step === 'DETAILS'
                ? 'Establish a verified enterprise workspace with isolated case management and SLA routing.'
                : `Enter the 6-digit verification code sent to ${maskEmail(email)} to authenticate your corporate identity.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            {successNotice && <Alert variant="info">{successNotice}</Alert>}

            {step === 'DETAILS' ? (
              <form onSubmit={handleInitialSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Organization Name"
                    required
                    placeholder="e.g. Apex Power & Water"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />

                  <div className="w-full space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
                      Organization Classification
                    </label>
                    <select
                      className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-slate-800"
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                    >
                      <option value="UTILITY">Public Utility</option>
                      <option value="MUNICIPAL">Municipal Corporation</option>
                      <option value="HEALTHCARE">Healthcare & Hospitals</option>
                      <option value="TRANSPORT">Public Transport</option>
                      <option value="CONSUMER_GOODS">Consumer Goods & Retail</option>
                      <option value="GOVERNMENT">Government Agency</option>
                      <option value="OTHER">Other Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Category / Department"
                    placeholder="e.g. Public Infrastructure"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />

                  <Input
                    label="Headquarters Address"
                    placeholder="e.g. Suite 400, Civic Center"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                    Lead Administrator Account
                  </h4>

                  <div className="space-y-4">
                    <Input
                      label="Administrator Name"
                      required
                      placeholder="e.g. Jane Lead"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Corporate Email Address"
                        type="email"
                        required
                        placeholder="e.g. admin@utility.org"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />

                      <Input
                        label="Contact Phone"
                        type="tel"
                        placeholder="+1 555-0188"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                    </div>

                    <Input
                      label="Master Password (min 8 chars)"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                    />
                    <span className="text-xs text-slate-600 leading-normal">
                      I confirm that I am authorized to represent this organization and agree to abide by the CPET Two-Way SLA and dispute resolution charter.
                    </span>
                  </label>
                </div>

                <Button type="submit" variant="primary" className="w-full bg-blue-700 hover:bg-blue-800" isLoading={isLoading}>
                  <Mail className="w-4 h-4 mr-2" />
                  Verify Corporate Email & Continue
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900">Security Verification Required</p>
                    <p className="text-slate-500">
                      We dispatched a 6-digit confirmation code to <span className="font-medium text-slate-800">{email}</span>. Valid for 5 minutes.
                    </p>
                  </div>
                </div>

                {/* 6-Digit OTP Inputs */}
                <div className="flex flex-col items-center space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Enter Verification Code
                  </label>
                  <div className="flex items-center gap-2 sm:gap-3" onPaste={handlePaste}>
                    {digits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-mono font-bold bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-sm"
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Action with Countdown */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('DETAILS');
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-slate-600 hover:text-slate-900 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Edit details
                  </button>

                  <div className="flex items-center gap-1.5">
                    {resendCooldown > 0 ? (
                      <span>
                        Resend in <span className="font-semibold text-slate-700">{resendCooldown}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResending}
                        className="text-blue-700 hover:text-blue-900 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                        Resend code
                      </button>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-blue-700 hover:bg-blue-800"
                  isLoading={isLoading}
                  disabled={digits.some((d) => !d)}
                >
                  Verify & Complete Onboarding
                </Button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/organization/login" className="font-semibold text-blue-700 underline">
                Sign in to workspace
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
