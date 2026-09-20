import React, { useState, useEffect, useCallback } from 'react';
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
import { Building2, Clock, Loader2 } from 'lucide-react';

export const OrgSettings: React.FC = () => {
  const { user } = useAuth();

  const [slaHours, setSlaHours] = useState<number>(48);
  const [autoAssign, setAutoAssign] = useState<boolean>(false);
  const [contactPhone, setContactPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user?.organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('cpet_access_token');
      const res = await fetch(`/api/v1/organizations/${user.organizationId}/settings`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load organization settings');
      }

      const json = await res.json();
      if (json.success && json.data) {
        setOrgName(json.data.name || user.organizationName || '');
        if (json.data.settings) {
          setSlaHours(json.data.settings.defaultSlaHours || 48);
          setAutoAssign(Boolean(json.data.settings.autoAssign));
        }
        setContactPhone(json.data.contactPhone || '');
        setAddress(json.data.address || '');
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Error loading organization settings' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.organizationId, user?.organizationName]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;

    if (slaHours < 1 || slaHours > 168) {
      setNotice({ type: 'error', message: 'SLA hours must be between 1 and 168 hours (1 week).' });
      return;
    }

    try {
      setIsSaving(true);
      setNotice(null);
      const token = localStorage.getItem('cpet_access_token');

      const res = await fetch(`/api/v1/organizations/${user.organizationId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          defaultSlaHours: Number(slaHours),
          autoAssign: Boolean(autoAssign),
          contactPhone: contactPhone.trim(),
          address: address.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to save settings');
      }

      setNotice({
        type: 'success',
        message: 'Organization settings and SLA benchmarks saved successfully.',
      });
      setTimeout(() => setNotice(null), 5000);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organization Profile & SLA Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure response thresholds, departmental assignments, and public contact metadata.
        </p>
      </div>

      {notice && (
        <Alert variant={notice.type === 'success' ? 'success' : 'error'}>
          {notice.message}
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading organization configuration...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Organization Entity Details</CardTitle>
                  <CardDescription>Verified tenant identity shown to interacting citizens.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Organization Name"
                  disabled
                  value={orgName || user?.organizationName || 'Enterprise Tenant'}
                  helperText="Verified legal entity name."
                />
                <Input
                  label="Contact Phone"
                  placeholder="e.g. +91 9876543210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              <Input
                label="Headquarters Address"
                placeholder="e.g. Civic Innovation Center"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* SLA Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Two-Way SLA & Escalation Benchmarks</CardTitle>
                  <CardDescription>
                    Governs countdown timers before unresolved requests trigger escalation notices.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Default SLA Target Window (Hours)"
                  type="number"
                  min={1}
                  max={168}
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                  helperText="Standard resolution time target (1 to 168 hours)."
                />

                <div className="flex flex-col justify-center space-y-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAssign}
                      onChange={(e) => setAutoAssign(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Enable Round-Robin Auto Assignment
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Automatically dispatches new intake cases to available agents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              className="bg-blue-700 hover:bg-blue-800"
              disabled={isSaving || !user?.organizationId}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving Settings...
                </>
              ) : (
                'Save Organization Settings'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
