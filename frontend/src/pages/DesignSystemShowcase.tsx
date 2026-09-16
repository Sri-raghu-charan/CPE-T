import React, { useState } from 'react';
import {
  Button,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  Tabs,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  Skeleton,
} from '../design-system/index.js';
import { Send, FileText } from 'lucide-react';

export const DesignSystemShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('primitives');
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          UI Design System & Primitives
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Minimal, professional, accessible, high-contrast components built specifically for CPET enterprise workflows.
        </p>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'primitives', label: 'Core Primitives', count: 6 },
          { id: 'data', label: 'Data & States', count: 3 },
        ]}
      />

      {activeTab === 'primitives' && (
        <div className="space-y-6">
          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Button Primitives</CardTitle>
              <CardDescription>Consistent actions with size and state variants.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" leftIcon={<Send className="w-4 h-4" />}>
                  Primary Action
                </Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Destructive Action</Button>
                <Button variant="primary" isLoading>
                  Loading
                </Button>
                <Button variant="outline" disabled>
                  Disabled
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Status Badges</CardTitle>
              <CardDescription>Semantic status indicators with restrained coloring and high contrast.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="pending">Pending</Badge>
                <Badge variant="progress">In Progress</Badge>
                <Badge variant="resolved">Resolved</Badge>
                <Badge variant="escalated">Escalated</Badge>
                <Badge variant="critical">Critical / SLA Breach</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Form Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Form Controls</CardTitle>
              <CardDescription>Accessible inputs with validation and helper states.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Standard Field"
                placeholder="Enter value..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="Standard descriptive hint"
              />
              <Input
                label="Invalid Field"
                placeholder="e.g. tracking-id"
                defaultValue="INVALID#123"
                error="Reference ID format must match CPET-XXXX"
              />
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Semantic Alerts</CardTitle>
              <CardDescription>Contextual banners for operational notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="info" title="System Notice">
                This environment is currently operating in Phase 1 verification mode.
              </Alert>
              <Alert variant="success" title="Verification Passed">
                All architectural layers and separation rules have been validated.
              </Alert>
              <Alert variant="warning" title="SLA Threshold Warning">
                Escalation timer activates if response is not acknowledged within window.
              </Alert>
              <Alert variant="error" title="Access Denied">
                Operation requires elevated organization clearance.
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Data Table Structure</CardTitle>
              <CardDescription>Clean tabular layout for tracking records.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Channel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">CPET-2026-001</TableCell>
                    <TableCell>Product Service Request</TableCell>
                    <TableCell><Badge variant="progress" size="sm">In Progress</Badge></TableCell>
                    <TableCell className="text-xs text-slate-500">Citizen → Org</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">CPET-2026-002</TableCell>
                    <TableCell>Official Complaint</TableCell>
                    <TableCell><Badge variant="escalated" size="sm">Escalated</Badge></TableCell>
                    <TableCell className="text-xs text-slate-500">Citizen → Org</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">CPET-2026-003</TableCell>
                    <TableCell>Emergency Blood Requirement</TableCell>
                    <TableCell><Badge variant="critical" size="sm">Critical</Badge></TableCell>
                    <TableCell className="text-xs text-slate-500">Universal Dispatch</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Empty State */}
          <Card>
            <CardHeader>
              <CardTitle>Empty State Pattern</CardTitle>
              <CardDescription>Clear guidance when no records are available.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No Active Escalations"
                description="All cases in this queue have been resolved or routed to assigned departments."
                action={<Button variant="outline" size="sm">Refresh Queue</Button>}
              />
            </CardContent>
          </Card>

          {/* Loading Skeletons */}
          <Card>
            <CardHeader>
              <CardTitle>Loading Skeletons</CardTitle>
              <CardDescription>Non-jarring placeholder states during data fetching.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
