'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Shield, Upload, Loader2, Check, Clock, XCircle, Trash2,
  Download, LogOut, Bell, Eye, Lock, AlertTriangle,
  RefreshCw, FileCheck, Info, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

function isVerifiedVeteran(role: string) {
  return role === 'VETERAN_VERIFIED' || role === 'VETERAN_MEMBER';
}

// ─── Verification Status Card ─────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const ACCEPTED_EXTENSIONS = '.mp4,.mov,.avi,.webm,.jpg,.jpeg,.png,.webp,.pdf';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

function fileIcon(file: File) {
  if (file.type.startsWith('video/')) return '🎥';
  if (file.type.startsWith('image/')) return '🖼️';
  if (file.type === 'application/pdf') return '📄';
  return '📎';
}

function UploadModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  resubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (files: File[]) => void;
  isSubmitting: boolean;
  resubmit: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: File[] = [];
    Array.from(incoming).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`);
        return;
      }
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        toast.error(`${file.name} — unsupported file type`);
        return;
      }
      next.push(file);
    });
    setFiles((prev) => [...prev, ...next].slice(0, MAX_FILES));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  const handleSubmit = () => {
    if (files.length === 0) { toast.error('Add at least one file'); return; }
    onSubmit(files);
  };

  // Reset files when modal closes after successful submit
  useEffect(() => {
    if (!isOpen) setFiles([]);
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={resubmit ? 'Resubmit Verification Documents' : 'Submit Verification Documents'}
      description="Upload your MOD 90, discharge papers, or a video of your Digital Veteran ID."
      size="md"
    >
      <div className="space-y-4">
        {/* Instructions */}
        <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
          <p className="text-xs font-semibold text-foreground">Accepted documents</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>MOD 90 (photo or scan — PNG, JPEG, PDF)</li>
            <li>F-Med 133 discharge summary or service record (PDF)</li>
            <li>Video of your GOV.UK Digital Veteran ID card (MP4, MOV, WebM)</li>
          </ul>
          <p className="text-xs text-muted-foreground">Max {MAX_FILE_SIZE_MB}MB per file · up to {MAX_FILES} files</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
            files.length >= MAX_FILES && 'pointer-events-none opacity-50',
          )}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">MP4 · MOV · WebM · PNG · JPEG · PDF</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />

        {/* Selected files */}
        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 bg-muted rounded-lg text-sm">
                <span className="text-base leading-none">{fileIcon(file)}</span>
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((_, j) => j !== i)); }}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-amber-500/10 rounded-lg flex items-start gap-2 border border-amber-500/20">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Your files are stored in an access-restricted vault and <strong>permanently deleted</strong> once your review is complete — typically within 24–48 hours.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={files.length === 0 || isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
              : <><Shield className="h-4 w-4 mr-2" />{resubmit ? 'Resubmit' : 'Submit'}</>
            }
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function VerificationCard({ userId, userRole }: { userId: string; userRole: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [resubmitMode, setResubmitMode] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['verification-status'],
    queryFn: () => api.getVerificationStatus(),
    enabled: !!userId && !isVerifiedVeteran(userRole),
  });

  const latestRequest = Array.isArray(requests)
    ? requests[0]
    : requests?.status ? requests : null;

  const submitMutation = useMutation({
    mutationFn: (files: File[]) => api.submitVerification(files),
    onSuccess: () => {
      toast.success('Documents submitted — we\'ll review within 24–48 hours');
      setModalOpen(false);
      setResubmitMode(false);
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
    },
    onError: () => toast.error('Submission failed. Please try again.'),
  });

  if (isVerifiedVeteran(userRole)) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-400">Verified Veteran</p>
              <p className="text-sm text-green-700 dark:text-green-500">Full platform access unlocked</p>
            </div>
            <Badge className="ml-auto bg-green-500 text-white">Verified</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = latestRequest?.status;

  const openModal = (resubmit = false) => {
    setResubmitMode(resubmit);
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Veteran Verification
          </CardTitle>
          <CardDescription>
            VeteranFinder is a verified-veteran-only platform. Verification unlocks connections, BIA features, and messaging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-4 bg-muted rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking status...</span>
            </div>
          ) : status === 'PENDING' ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-400">Under Review</p>
                  <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                    Your documents are being reviewed by our team. This typically takes 24–48 hours.
                    You'll receive a notification once the review is complete.
                  </p>
                  {latestRequest?.createdAt && (
                    <p className="text-xs text-amber-600 dark:text-amber-600 mt-2">
                      Submitted {new Date(latestRequest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : status === 'REJECTED' ? (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 space-y-3">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-400">Verification Unsuccessful</p>
                  {latestRequest?.rejectionReason && (
                    <div className="mt-2 p-3 bg-red-500/10 rounded text-sm text-red-700 dark:text-red-400">
                      <p className="font-medium mb-1">Reason:</p>
                      <p>{latestRequest.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={() => openModal(true)} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Resubmit Documents
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 border border-border">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  How to verify — UK veterans only
                </p>
                <ol className="space-y-1.5">
                  {[
                    'Gather your MOD 90, discharge papers, or record a video of your GOV.UK Digital Veteran ID',
                    'Click "Add Files" below and upload up to 5 documents (PNG, JPEG, PDF, MP4 — max 10MB each)',
                    "Our team reviews within 24–48 hours and you'll be notified when complete",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <Button onClick={() => openModal(false)} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Add Files &amp; Submit for Verification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <UploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(files) => submitMutation.mutate(files)}
        isSubmitting={submitMutation.isPending}
        resubmit={resubmitMode}
      />
    </>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await api.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veteranfinder-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Your data has been exported');
      setShowExportModal(false);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') { toast.error('Please type DELETE to confirm'); return; }
    setIsDeleting(true);
    try {
      await api.deleteAccount();
      toast.success('Account permanently deleted');
      logout();
      router.push('/');
    } catch {
      toast.error('Deletion failed. Contact support if this continues.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    logout();
    window.location.href = '/auth/login';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, verification, and data</p>
      </div>

      {/* Verification — always shown at top */}
      <VerificationCard userId={user?.id || ''} userRole={user?.role || ''} />

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Profile Visibility', desc: 'Verified veterans can find and view your profile', value: 'Visible' },
            { label: 'Online Status', desc: 'Let connections see when you\'re active', value: 'On' },
            { label: 'Service History', desc: 'Share your service history for reconnection matching', value: 'Visible' },
          ].map(({ label, desc, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Badge variant="outline" className="flex-shrink-0">{value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Connection Requests', desc: 'Someone wants to connect with you', value: 'On' },
            { label: 'New Messages', desc: 'Receive message notifications', value: 'On' },
            { label: 'Verification Updates', desc: 'Status updates on your verification', value: 'On' },
            { label: 'Community Activity', desc: 'Forum replies, BIA updates', value: 'On' },
          ].map(({ label, desc, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Badge variant="outline" className="flex-shrink-0">{value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data & GDPR */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data & Account
          </CardTitle>
          <CardDescription>UK GDPR compliant. You have the right to access, export, or delete your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export My Data
            <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
            <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Log Out
      </Button>

      {/* Export Modal */}
      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Export Your Data"
        description="Download all your personal data (GDPR Right to Data Portability)" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Your export will include:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {['Profile information', 'Service history & veteran details', 'Connections & messages', 'Verification history', 'Account activity log'].map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowExportModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleExportData} className="flex-1" disabled={isExporting}>
              {isExporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</> : 'Export Data'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
        title="Delete Account" description="This action is permanent and cannot be undone." size="sm">
        <div className="space-y-4">
          <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">
              Deleting your account will permanently remove all your data, connections, and messages. This cannot be recovered.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Type DELETE to confirm</label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              className="flex-1"
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
