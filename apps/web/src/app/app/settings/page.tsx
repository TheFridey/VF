'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Upload,
  Loader2,
  Check,
  Clock,
  XCircle,
  Trash2,
  Download,
  LogOut,
  Bell,
  Eye,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { isVeteran, isVerifiedVeteran } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: verificationStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['verification-status'],
    queryFn: () => api.getVerificationStatus(),
    enabled: isVeteran(user?.role || '') && !isVerifiedVeteran(user?.role || ''),
  });

  const submitVerificationMutation = useMutation({
    mutationFn: (files: File[]) => api.submitVerification(files),
    onSuccess: () => {
      toast.success('Verification documents submitted!');
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['verification-status'] });
    },
    onError: () => {
      toast.error('Failed to submit verification');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        toast.error(`${file.name} is not a valid file type`);
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitVerification = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    submitVerificationMutation.mutate(selectedFiles);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await api.exportUserData();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veteranfinder-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Your data has been exported');
      setShowExportModal(false);
    } catch {
      toast.error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteAccount();
      toast.success('Your account has been permanently deleted');
      logout();
      router.push('/');
    } catch {
      toast.error('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Continue with logout even if API fails
    }
    logout();
    window.location.href = '/auth/login';
  };

  const renderVerificationStatus = () => {
    if (isVerifiedVeteran(user?.role || '')) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Check className="h-5 w-5" />
          <span className="font-medium">Verified</span>
        </div>
      );
    }

    if (statusLoading) {
      return <Loader2 className="h-5 w-5 animate-spin" />;
    }

    if (verificationStatus?.status === 'PENDING') {
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <Clock className="h-5 w-5" />
          <span className="font-medium">Pending Review</span>
        </div>
      );
    }

    if (verificationStatus?.status === 'REJECTED') {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-5 w-5" />
          <span className="font-medium">Rejected</span>
          {verificationStatus.rejectionReason && (
            <span className="text-sm">- {verificationStatus.rejectionReason}</span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Shield className="h-5 w-5" />
        <span>Not Verified</span>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Verification Section (for veterans only) */}
      {isVeteran(user?.role || '') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Veteran Verification
            </CardTitle>
            <CardDescription>
              Verify your veteran status to unlock all features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-medium">Status</span>
              {renderVerificationStatus()}
            </div>

            {!isVerifiedVeteran(user?.role || '') &&
              verificationStatus?.status !== 'PENDING' && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload your DD-214, VA ID, or other official documentation. Files are
                      encrypted and automatically deleted after review.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={selectedFiles.length >= 5}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select Files ({selectedFiles.length}/5)
                    </Button>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <span className="text-sm truncate">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <Button
                        onClick={handleSubmitVerification}
                        isLoading={submitVerificationMutation.isPending}
                        className="w-full"
                      >
                        Submit for Verification
                      </Button>
                    </div>
                  )}
                </>
              )}

            {verificationStatus?.status === 'PENDING' && (
              <p className="text-sm text-muted-foreground">
                Your documents are being reviewed. This typically takes 1-3 business days.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Profile Visibility</p>
              <p className="text-sm text-muted-foreground">
                Control who can see your profile
              </p>
            </div>
            <Badge variant="outline">Visible</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Online Status</p>
              <p className="text-sm text-muted-foreground">
                Let others see when you&apos;re active
              </p>
            </div>
            <Badge variant="outline">On</Badge>
          </div>
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
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Matches</p>
              <p className="text-sm text-muted-foreground">
                Get notified when you match with someone
              </p>
            </div>
            <Badge variant="outline">On</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Messages</p>
              <p className="text-sm text-muted-foreground">
                Get notified when you receive a message
              </p>
            </div>
            <Badge variant="outline">On</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data & Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data &amp; Account
          </CardTitle>
          <CardDescription>
            Manage your data and account settings. We comply with UK GDPR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export My Data
          </Button>

          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Log Out
      </Button>

      {/* Export Data Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Your Data"
        description="Download a copy of your personal data (GDPR Right to Data Portability)"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can download a complete copy of all your personal data including:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Your profile information</li>
            <li>Your veteran details (if applicable)</li>
            <li>Your matches and connections</li>
            <li>Account activity</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            The export will be in JSON format and can be used to transfer your data to another service.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowExportModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleExportData} className="flex-1" disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText('');
        }}
        title="Delete Account Permanently"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Warning: This will permanently delete:
                </p>
                <ul className="text-sm text-destructive mt-2 list-disc list-inside space-y-1">
                  <li>Your profile and all photos</li>
                  <li>All your matches and connections</li>
                  <li>All your messages</li>
                  <li>Your verification status</li>
                  <li>All other personal data</li>
                </ul>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            In compliance with GDPR, your data will be completely erased from our systems. 
            This action is <strong>immediate and irreversible</strong>.
          </p>

          <div>
            <label className="text-sm font-medium">
              Type <span className="font-mono bg-muted px-1">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="mt-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-destructive"
            />
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount} 
              className="flex-1"
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Forever
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
