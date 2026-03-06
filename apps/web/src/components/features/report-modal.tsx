'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const REPORT_REASONS = [
  { value: 'FAKE_PROFILE', label: 'Fake Profile' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'SCAM', label: 'Scam' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'UNDERAGE', label: 'Underage User' },
  { value: 'OTHER', label: 'Other' },
];

export function ReportModal({ isOpen, onClose, userId, userName }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const reportMutation = useMutation({
    mutationFn: () =>
      api.reportUser({
        reportedUserId: userId,
        reason: selectedReason!,
        description: description || undefined,
      }),
    onSuccess: () => {
      toast.success('Report submitted. Thank you for keeping our community safe.');
      handleClose();
    },
    onError: () => {
      toast.error('Failed to submit report. Please try again.');
    },
  });

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedReason) {
      toast.error('Please select a reason');
      return;
    }
    reportMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Report ${userName}`}
      description="Help us understand what's wrong"
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Why are you reporting this user?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason.value}
                type="button"
                onClick={() => setSelectedReason(reason.value)}
                className={cn(
                  'p-3 text-sm rounded-md border text-left transition-colors',
                  selectedReason === reason.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-input hover:border-primary/50'
                )}
              >
                {reason.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Additional details (optional)"
          placeholder="Provide any additional information that might help us understand the issue..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={reportMutation.isPending}
            disabled={!selectedReason}
            className="flex-1"
          >
            Submit Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onBlocked?: () => void;
}

export function BlockModal({ isOpen, onClose, userId, userName, onBlocked }: BlockModalProps) {
  const [reason, setReason] = useState('');

  const blockMutation = useMutation({
    mutationFn: () => api.blockUser(userId, reason || undefined),
    onSuccess: () => {
      toast.success(`${userName} has been blocked`);
      onBlocked?.();
      handleClose();
    },
    onError: () => {
      toast.error('Failed to block user. Please try again.');
    },
  });

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Block ${userName}`}
      description="Are you sure you want to block this user?"
      size="sm"
    >
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg text-sm">
          <p className="font-medium mb-2">What happens when you block someone:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>They won&apos;t be able to see your profile</li>
            <li>They won&apos;t be able to message you</li>
            <li>Any existing match will be cancelled</li>
            <li>You won&apos;t appear in each other&apos;s network views</li>
          </ul>
        </div>

        <Textarea
          label="Reason (optional)"
          placeholder="Why are you blocking this user?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => blockMutation.mutate()}
            isLoading={blockMutation.isPending}
            className="flex-1"
          >
            Block User
          </Button>
        </div>
      </div>
    </Modal>
  );
}
