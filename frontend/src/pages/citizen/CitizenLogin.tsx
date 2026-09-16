import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Alert } from '../../design-system/index.js';
import { ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';

export const CitizenLogin: React.FC = () => {
  const { login, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/citizen/home';

  const [mode, setMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpTarget, setOtpTarget] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await requestOtp(otpTarget, 'LOGIN');
      setOtpSent(true);
      setInfoMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await verifyOtp(otpTarget, otpCode, 'LOGIN');
      // For OTP login in dev, sign in standard session or navigate
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
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
          <span className="font-bold text-slate-900 text-base">CPET Citizen Portal</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to your Citizen account</CardTitle>
            <CardDescription>
              Access your submitted requests, track resolution updates, and manage your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            {infoMessage && <Alert variant="info">{infoMessage}</Alert>}

            <div className="flex border-b border-slate-200 mb-2">
              <button
                type="button"
                className={`pb-2 px-3 text-xs font-semibold ${
                  mode === 'PASSWORD' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => { setMode('PASSWORD'); setError(null); }}
              >
                Password Authentication
              </button>
              <button
                type="button"
                className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1 ${
                  mode === 'OTP' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => { setMode('OTP'); setError(null); }}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>One-Time Passcode (OTP)</span>
              </button>
            </div>

            {mode === 'PASSWORD' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="e.g. citizen@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Sign In
                </Button>
              </form>
            ) : (
              <div>
                {!otpSent ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <Input
                      label="Email or Mobile Number"
                      type="text"
                      required
                      placeholder="e.g. user@example.com or +1234567890"
                      value={otpTarget}
                      onChange={(e) => setOtpTarget(e.target.value)}
                      helperText="A 6-digit verification code will be dispatched."
                    />
                    <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                      Send One-Time Passcode
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <Input
                      label="6-Digit Verification Code"
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      helperText="Enter 123456 in dev mode"
                    />
                    <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                      Verify & Continue
                    </Button>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-900 underline block mx-auto pt-2"
                      onClick={() => setOtpSent(false)}
                    >
                      Resend to another address
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Don't have a citizen account yet?{' '}
              <Link to="/citizen/signup" className="font-semibold text-slate-900 underline">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
