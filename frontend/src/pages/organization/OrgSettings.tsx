import React, { useState } from 'react';
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
import { Building2, Clock } from 'lucide-react';

export const OrgSettings: React.FC = () => {
  const { user } = useAuth();

  const [slaHours, setSlaHours] = useState(48);
  const [autoAssign, setAutoAssign] = useState(false);
  const [contactPhone, setContactPhone] = useState('+1 555-0188');
  const [address, setAddress] = useState('Suite 400, Civic Innovation Center');
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice('Organization settings and SLA benchmarks saved successfully.');
    setTimeout(() => setNotice(null), 4000);
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

      {notice && <Alert variant="success">{notice}</Alert>}

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
                value={user?.organizationName || 'Enterprise Tenant'}
                helperText="Verified legal entity name."
              />
              <Input
                label="Contact Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <Input
              label="Headquarters Address"
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
                helperText="Standard resolution time target."
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
          <Button type="submit" variant="primary" className="bg-blue-700 hover:bg-blue-800">
            Save Organization Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
