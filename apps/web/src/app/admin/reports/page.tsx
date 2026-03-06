'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flag,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Check,
  Ban,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { adminApi } from '@/lib/admin-api';
import { formatRelativeTime, cn } from '@/lib/utils';

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const reasonOptions = [
  { value: '', label: 'All Reasons' },
  { value: 'FAKE_PROFILE', label: 'Fake Profile' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'SCAM', label: 'Scam' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'UNDERAGE', label: 'Underage' },
  { value: 'OTHER', label: 'Other' },
];

const actionOptions = [
  { value: 'DISMISSED', label: 'Dismiss - No Action' },
  { value: 'WARNING', label: 'Issue Warning' },
  { value: 'SUSPEND_7_DAYS', label: 'Suspend 7 Days' },
  { value: 'SUSPEND_30_DAYS', label: 'Suspend 30 Days' },
  { value: 'PERMANENT_BAN', label: 'Permanent Ban' },
];

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [reasonFilter, setReasonFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [action, setAction] = useState('DISMISSED');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', page, statusFilter, reasonFilter],
    queryFn: () =>
      adminApi.getReports({
        page,
        limit: 20,
        status: statusFilter || undefined,
        reason: reasonFilter || undefined,
      }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ reportId, action, notes }: { reportId: string; action: string; notes?: string }) =>
      adminApi.resolveReport(reportId, { action: action as any, notes }),
    onSuccess: () => {
      toast.success('Report resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setShowResolveModal(false);
      setSelectedReport(null);
      setAction('DISMISSED');
      setNotes('');
    },
    onError: () => toast.error('Failed to resolve report'),
  });

  const reports = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const pendingCount = data?.meta?.pendingCount || 0;

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      HARASSMENT: 'bg-red-100 text-red-700',
      FAKE_PROFILE: 'bg-yellow-100 text-yellow-700',
      SPAM: 'bg-blue-100 text-blue-700',
      SCAM: 'bg-orange-100 text-orange-700',
      UNDERAGE: 'bg-purple-100 text-purple-700',
      INAPPROPRIATE_CONTENT: 'bg-pink-100 text-pink-700',
    };
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', colors[reason] || 'bg-gray-100 text-gray-700')}>
        {reason.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Review and resolve user reports</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-base px-3 py-1">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={statusOptions}
              className="w-full md:w-48"
            />
            <Select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setPage(1);
              }}
              options={reasonOptions}
              className="w-full md:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No reports</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'PENDING'
                ? 'All caught up! No pending reports.'
                : 'No reports match your filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Reporter -> Reported */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={report.reporter?.profile?.profileImageUrl}
                        name={report.reporter?.profile?.displayName}
                        size="sm"
                      />
                      <div className="text-sm">
                        <p className="font-medium">{report.reporter?.profile?.displayName || 'Unknown'}</p>
                        <p className="text-muted-foreground text-xs">Reporter</p>
                      </div>
                    </div>

                    <span className="text-muted-foreground">→</span>

                    <div className="flex items-center gap-2">
                      <Avatar
                        src={report.reported?.profile?.profileImageUrl}
                        name={report.reported?.profile?.displayName}
                        size="sm"
                      />
                      <div className="text-sm">
                        <p className="font-medium">{report.reported?.profile?.displayName || 'Unknown'}</p>
                        <p className="text-muted-foreground text-xs">Reported User</p>
                      </div>
                    </div>
                  </div>

                  {/* Reason & Time */}
                  <div className="flex items-center gap-4">
                    {getReasonBadge(report.reason)}
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(report.createdAt)}
                    </span>

                    <Badge variant={report.status === 'PENDING' ? 'warning' : 'outline'}>
                      {report.status}
                    </Badge>

                    {report.status === 'PENDING' ? (
                      <Button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowResolveModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowResolveModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {report.description && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{report.description}</p>
                    </div>
                  </div>
                )}

                {/* Resolution info */}
                {report.status === 'RESOLVED' && (
                  <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                    <p>
                      <strong>Action:</strong>{' '}
                      {actionOptions.find((a) => a.value === report.action)?.label || report.action}
                    </p>
                    {report.notes && (
                      <p className="mt-1">
                        <strong>Notes:</strong> {report.notes}
                      </p>
                    )}
                    {report.resolvedBy && (
                      <p className="text-muted-foreground mt-1">
                        Resolved by {report.resolvedBy.email}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedReport(null);
          setAction('DISMISSED');
          setNotes('');
        }}
        title="Review Report"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Report Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reporter</p>
                <div className="flex items-center gap-2">
                  <Avatar
                    src={selectedReport.reporter?.profile?.profileImageUrl}
                    name={selectedReport.reporter?.profile?.displayName}
                    size="sm"
                  />
                  <span className="font-medium">
                    {selectedReport.reporter?.profile?.displayName || selectedReport.reporter?.email}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reported User</p>
                <div className="flex items-center gap-2">
                  <Avatar
                    src={selectedReport.reported?.profile?.profileImageUrl}
                    name={selectedReport.reported?.profile?.displayName}
                    size="sm"
                  />
                  <span className="font-medium">
                    {selectedReport.reported?.profile?.displayName || selectedReport.reported?.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">Reason: {selectedReport.reason.replace(/_/g, ' ')}</span>
              </div>
              {selectedReport.description && (
                <p className="text-muted-foreground">{selectedReport.description}</p>
              )}
            </div>

            {/* Action Selection for pending reports */}
            {selectedReport.status === 'PENDING' && (
              <>
                <Select
                  label="Action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  options={actionOptions}
                />

                <Textarea
                  label="Notes (optional)"
                  placeholder="Add any notes about your decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowResolveModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      resolveMutation.mutate({
                        reportId: selectedReport.id,
                        action,
                        notes: notes || undefined,
                      })
                    }
                    isLoading={resolveMutation.isPending}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Resolve Report
                  </Button>
                </div>
              </>
            )}

            {/* Show resolution for already resolved reports */}
            {selectedReport.status === 'RESOLVED' && (
              <div className="p-4 bg-green-500/10 rounded-lg">
                <p className="font-medium">
                  Action Taken:{' '}
                  {actionOptions.find((a) => a.value === selectedReport.action)?.label}
                </p>
                {selectedReport.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedReport.notes}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
