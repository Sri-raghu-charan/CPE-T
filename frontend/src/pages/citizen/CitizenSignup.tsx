import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Alert } from '../../design-system/index.js';
import { ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const CitizenSignup: React.FC = () => {
  const { registerCitizen, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAccepted) {
      setError('You must accept the terms of service and consent to proceed.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // First request OTP for email verification
      await requestOtp(email, 'SIGNUP');
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to initiate verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // Verify OTP
      await verifyOtp(email, otpCode, 'SIGNUP');

      // Create citizen account
      await registerCitizen({
        name,
        email,
        phone,
        password,
        consent: {
          termsAccepted: true,
          termsVersion: '1.0',
        },
      });

      navigate('/citizen/home', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to gateway</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded bg-slate-900 text-white font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900 text-base">CPET Citizen Onboarding</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{step === 'DETAILS' ? 'Create your Citizen Account' : 'Verify your Email'}</CardTitle>
            <CardDescription>
              {step === 'DETAILS'
                ? 'Register to submit requests, track resolutions, and access emergency services.'
                : `We dispatched a 6-digit verification code to ${email}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            {step === 'DETAILS' ? (
              <form onSubmit={handleInitialSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Phone Number (Optional)"
                  type="tel"
                  placeholder="e.g. +1 555-0123"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <Input
                  label="Password (min 8 characters)"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {/* Explicit Consent Requirement */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-xs text-slate-600 leading-normal">
                      I accept the CPET Platform Terms of Service and consent to two-way communication between myself and responding organizations.
                    </span>
                  </label>
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Continue to Verification
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>OTP Dispatch Confirmed</span>
                  </div>
                  <p>In dev/test mode, you can use code <code className="font-mono font-bold text-slate-900">123456</code>.</p>
                </div>

                <Input
                  label="Enter 6-Digit Code"
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Verify OTP & Complete Registration
                </Button>

                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-900 underline block mx-auto pt-2"
                  onClick={() => setStep('DETAILS')}
                >
                  Edit Registration Details
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/citizen/login" className="font-semibold text-slate-900 underline">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
