import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Alert,
} from '../../design-system/index.js';
import { UserPlus, Trash2, Loader2 } from 'lucide-react';

interface TeamMember {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export const OrgTeam: React.FC = () => {
  const { user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('ORGANIZATION_AGENT');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!user?.organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('cpet_access_token');
      const res = await fetch(`/api/v1/organizations/${user.organizationId}/members`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load team members');
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMembers(json.data);
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Error fetching team members' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;

    try {
      setIsSubmitting(true);
      setNotice(null);
      const token = localStorage.getItem('cpet_access_token');

      const res = await fetch(`/api/v1/organizations/${user.organizationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          phone: newPhone.trim() || undefined,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to add team member');
      }

      setNotice({
        type: 'success',
        message: `Team member ${newName} added with role ${newRole}.`,
      });

      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setShowAddModal(false);
      await fetchMembers();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Error adding team member' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!user?.organizationId) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from this organization?`)) return;

    try {
      setDeletingId(memberId);
      setNotice(null);
      const token = localStorage.getItem('cpet_access_token');

      const res = await fetch(`/api/v1/organizations/${user.organizationId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to remove member');
      }

      setNotice({ type: 'success', message: `${memberName} was removed successfully.` });
      await fetchMembers();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Error removing team member' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Team Members & Access Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage agents, department representatives, and administrative roles for this tenant.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          onClick={() => setShowAddModal(!showAddModal)}
          disabled={!user?.organizationId}
        >
          {showAddModal ? 'Close Form' : 'Add Team Member'}
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.type === 'success' ? 'success' : 'error'}>
          {notice.message}
        </Alert>
      )}

      {showAddModal && (
        <Card className="border-blue-200 bg-blue-50/20">
          <CardHeader>
            <CardTitle>Invite New Organization Agent</CardTitle>
            <CardDescription>Creates an authenticated profile restricted to this organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Agent Full Name"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  label="Work Email"
                  type="email"
                  required
                  placeholder="e.g. alex@utility.org"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
                    Role Assignment
                  </label>
                  <select
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="ORGANIZATION_AGENT">Organization Agent</option>
                    <option value="ORGANIZATION_ADMIN">Organization Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    'Add to Team'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Organization Roster</CardTitle>
          <CardDescription>Members authorized to review and respond to incoming requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading team roster...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No active team members found. Click &quot;Add Team Member&quot; to invite someone.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Work Email</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  <TableHead>Tenant Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const memberId = m._id || m.id || '';
                  const isCurrent = user?._id === memberId;
                  return (
                    <TableRow key={memberId}>
                      <TableCell className="font-semibold text-slate-900">
                        {m.name} {isCurrent && <span className="text-xs text-slate-400 font-normal">(You)</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">{m.email}</TableCell>
                      <TableCell>
                        <Badge variant={m.role === 'ORGANIZATION_ADMIN' ? 'resolved' : 'neutral'} size="sm">
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-emerald-700 font-medium">Tenant Verified</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {user?.role === 'ORGANIZATION_ADMIN' && !isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                            onClick={() => handleRemoveMember(memberId, m.name)}
                            disabled={deletingId === memberId}
                            title="Remove Member"
                          >
                            {deletingId === memberId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
