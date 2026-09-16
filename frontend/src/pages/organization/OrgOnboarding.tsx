import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Alert } from '../../design-system/index.js';
import { Building2, ArrowLeft } from 'lucide-react';

export const OrgOnboarding: React.FC = () => {
  const { registerOrganization } = useAuth();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('UTILITY');
  const [category, setCategory] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAccepted) {
      setError('You must accept the terms of service to onboard.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
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
            <CardTitle>Onboard Organization Tenant</CardTitle>
            <CardDescription>
              Establish a verified enterprise workspace with isolated case management and SLA routing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                Complete Organization Registration
              </Button>
            </form>

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
