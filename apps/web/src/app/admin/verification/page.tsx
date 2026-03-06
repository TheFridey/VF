'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Check,
  X,
  Eye,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { adminApi } from '@/lib/admin-api';
import { formatDate, formatRelativeTime, formatBranch } from '@/lib/utils';

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function AdminVerificationPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-verification', page, statusFilter],
    queryFn: () =>
      adminApi.getVerificationRequests({
        page,
        limit: 20,
        status: statusFilter || undefined,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId, notes }: { requestId: string; notes?: string }) =>
      adminApi.approveVerification(requestId, notes),
    onSuccess: () => {
      toast.success('Verification approved');
      queryClient.invalidateQueries({ queryKey: ['admin-verification'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setShowReviewModal(false);
      setSelectedRequest(null);
      setApprovalNotes('');
    },
    onError: () => toast.error('Failed to approve verification'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      adminApi.rejectVerification(requestId, reason),
    onSuccess: () => {
      toast.success('Verification rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-verification'] });
      setShowReviewModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
    },
    onError: () => toast.error('Failed to reject verification'),
  });

  const requests = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const pendingCount = data?.meta?.pendingCount || 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Verification Requests</h1>
          <p className="text-muted-foreground">Review veteran verification submissions</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-base px-3 py-1">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={statusOptions}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No verification requests</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'PENDING'
                ? 'All caught up! No pending requests.'
                : 'No requests match your filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar
                      src={request.user?.profile?.profileImageUrl}
                      name={request.user?.profile?.displayName || request.user?.email}
                      size="md"
                    />
                    <div>
                      <p className="font-medium">
                        {request.user?.profile?.displayName || 'Unknown User'}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.user?.email}</p>
                      {request.user?.veteranDetails && (
                        <p className="text-sm text-muted-foreground">
                          {formatBranch(request.user.veteranDetails.branch)}
                          {request.user.veteranDetails.rank && ` • ${request.user.veteranDetails.rank}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Request Info */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {request.evidence?.length || 0} document(s)
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Submitted {formatRelativeTime(request.createdAt)}
                      </p>
                    </div>

                    {getStatusBadge(request.status)}

                    {request.status === 'PENDING' ? (
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowReviewModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowReviewModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                  </div>
                </div>

                {/* Rejection reason if rejected */}
                {request.status === 'REJECTED' && request.rejectionReason && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive">
                      <strong>Rejection Reason:</strong> {request.rejectionReason}
                    </p>
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

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedRequest(null);
          setRejectionReason('');
          setApprovalNotes('');
        }}
        title="Review Verification Request"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* User Details */}
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <Avatar
                src={selectedRequest.user?.profile?.profileImageUrl}
                name={selectedRequest.user?.profile?.displayName}
                size="lg"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {selectedRequest.user?.profile?.displayName || 'Unknown User'}
                </h3>
                <p className="text-muted-foreground">{selectedRequest.user?.email}</p>
                {selectedRequest.user?.veteranDetails && (
                  <div className="mt-2 text-sm">
                    <p>
                      <strong>Branch:</strong>{' '}
                      {formatBranch(selectedRequest.user.veteranDetails.branch)}
                    </p>
                    {selectedRequest.user.veteranDetails.rank && (
                      <p>
                        <strong>Rank:</strong> {selectedRequest.user.veteranDetails.rank}
                      </p>
                    )}
                    {selectedRequest.user.veteranDetails.mos && (
                      <p>
                        <strong>MOS:</strong> {selectedRequest.user.veteranDetails.mos}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                {getStatusBadge(selectedRequest.status)}
                <p className="text-sm text-muted-foreground mt-2">
                  {formatDate(selectedRequest.createdAt)}
                </p>
              </div>
            </div>

            {/* Documents */}
            <div>
              <h4 className="font-medium mb-3">Submitted Documents</h4>
              {selectedRequest.evidence && selectedRequest.evidence.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {selectedRequest.evidence.map((doc: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm truncate">
                          {doc.filename || `Document ${index + 1}`}
                        </span>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No documents submitted</p>
              )}
            </div>

            {/* Actions for pending requests */}
            {selectedRequest.status === 'PENDING' && (
              <>
                <div>
                  <Textarea
                    label="Approval Notes (optional)"
                    placeholder="Add any notes about the verification..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <Textarea
                    label="Rejection Reason (required if rejecting)"
                    placeholder="Explain why the verification is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!rejectionReason.trim()) {
                        toast.error('Please provide a rejection reason');
                        return;
                      }
                      rejectMutation.mutate({
                        requestId: selectedRequest.id,
                        reason: rejectionReason,
                      });
                    }}
                    isLoading={rejectMutation.isPending}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() =>
                      approveMutation.mutate({
                        requestId: selectedRequest.id,
                        notes: approvalNotes || undefined,
                      })
                    }
                    isLoading={approveMutation.isPending}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </>
            )}

            {/* Show reason for already reviewed requests */}
            {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm">
                  <strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}
                </p>
                {selectedRequest.reviewedBy && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Reviewed by {selectedRequest.reviewedBy.email} on{' '}
                    {formatDate(selectedRequest.reviewedAt)}
                  </p>
                )}
              </div>
            )}

            {selectedRequest.status === 'APPROVED' && (
              <div className="p-4 bg-green-500/10 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Approved</strong>
                  {selectedRequest.notes && `: ${selectedRequest.notes}`}
                </p>
                {selectedRequest.reviewedBy && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Approved by {selectedRequest.reviewedBy.email} on{' '}
                    {formatDate(selectedRequest.reviewedAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
