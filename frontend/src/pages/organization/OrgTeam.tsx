import React, { useState } from 'react';
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
import { UserPlus } from 'lucide-react';

export const OrgTeam: React.FC = () => {
  const { user } = useAuth();

  const [members, setMembers] = useState([
    {
      id: '1',
      name: user?.name || 'Administrator',
      email: user?.email || 'admin@org.com',
      role: 'ORGANIZATION_ADMIN',
      status: 'ACTIVE',
      lastLogin: 'Active Now',
    },
    {
      id: '2',
      name: 'Sarah Connor',
      email: 'sarah.c@org.com',
      role: 'ORGANIZATION_AGENT',
      status: 'ACTIVE',
      lastLogin: '2 hours ago',
    },
    {
      id: '3',
      name: 'Michael Scott',
      email: 'michael.s@org.com',
      role: 'ORGANIZATION_AGENT',
      status: 'ACTIVE',
      lastLogin: 'Yesterday',
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('ORGANIZATION_AGENT');
  const [notice, setNotice] = useState<string | null>(null);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMembers([
      ...members,
      {
        id: Date.now().toString(),
        name: newName,
        email: newEmail,
        role: newRole,
        status: 'ACTIVE',
        lastLogin: 'Invited',
      },
    ]);

    setNotice(`Team member ${newName} added with role ${newRole}.`);
    setNewName('');
    setNewEmail('');
    setShowAddModal(false);
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
        >
          {showAddModal ? 'Close Form' : 'Add Team Member'}
        </Button>
      </div>

      {notice && <Alert variant="success">{notice}</Alert>}

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
                <Button type="submit" variant="primary" size="sm">
                  Add to Team
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Work Email</TableHead>
                <TableHead>Assigned Role</TableHead>
                <TableHead>Tenant Access</TableHead>
                <TableHead>Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-semibold text-slate-900">{m.name}</TableCell>
                  <TableCell className="text-xs text-slate-600 font-mono">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === 'ORGANIZATION_ADMIN' ? 'resolved' : 'neutral'} size="sm">
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-emerald-700 font-medium">Tenant Verified</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{m.lastLogin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
