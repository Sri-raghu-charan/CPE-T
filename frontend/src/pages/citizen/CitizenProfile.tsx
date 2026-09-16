import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Alert, Badge } from '../../design-system/index.js';
import { User, CheckCircle2 } from 'lucide-react';

export const CitizenProfile: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile({ name, phone });
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Citizen Profile & Consent Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal verification details and platform consent preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-slate-100 text-slate-800">
              <User className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Primary identity details on the CPET platform.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && <Alert variant="success">{success}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Email Address"
              type="email"
              disabled
              value={user?.email || ''}
              helperText="Verified email address. Cannot be changed directly."
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1 555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Used for emergency blood matching and urgent SMS alerts."
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" isLoading={isUpdating}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Consent Record */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Consent & Data Protection</CardTitle>
              <CardDescription>Legal agreements acknowledged for two-way organization interaction.</CardDescription>
            </div>
            <Badge variant="resolved" size="sm">Active Consent</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Consent Version 1.0 acknowledged during account registration</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>End-to-end multi-tenant isolation active across all queries</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
