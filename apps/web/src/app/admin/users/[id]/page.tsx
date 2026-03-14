'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Shield,
  Mail,
  Calendar,
  MapPin,
  Ban,
  Trash2,
  UserCog,
  Flag,
  MessageSquare,
  Heart,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { adminApi } from '@/lib/admin-api';
import { formatDate, formatDateTime, formatRole, formatBranch, formatGender, cn } from '@/lib/utils';

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspend' },
  { value: 'BANNED', label: 'Ban' },
];

const roleOptions = [
  { value: 'CIVILIAN', label: 'Civilian' },
  { value: 'VETERAN_UNVERIFIED', label: 'Veteran (Unverified)' },
  { value: 'VETERAN_VERIFIED', label: 'Veteran (Verified)' },
  { value: 'VETERAN_MEMBER', label: 'BIA Member' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'ADMIN', label: 'Admin' },
];

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newRole, setNewRole] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => adminApi.getUser(userId),
    enabled: !!userId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      adminApi.updateUserStatus(userId, { status, reason }),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      setShowStatusModal(false);
      setStatusReason('');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ role }: { role: string }) =>
      adminApi.updateUserRole(userId, { role }),
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      setShowRoleModal(false);
    },
    onError: () => toast.error('Failed to update role'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted');
      router.push('/admin/users');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">User not found</h2>
        <Link href="/admin/users">
          <Button variant="outline">Back to Users</Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
      ACTIVE: 'success',
      PENDING: 'warning',
      SUSPENDED: 'warning',
      BANNED: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">User Details</h1>
            <p className="text-muted-foreground">ID: {userId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setNewStatus(user.status);
              setShowStatusModal(true);
            }}
          >
            <Ban className="h-4 w-4 mr-2" />
            Change Status
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setNewRole(user.role);
              setShowRoleModal(true);
            }}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Change Role
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* User Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar
              src={user.profile?.profileImageUrl}
              name={user.profile?.displayName || user.email}
              size="xl"
              className="w-24 h-24 text-2xl"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold">
                  {user.profile?.displayName || 'No Name'}
                </h2>
                {getStatusBadge(user.status)}
                <Badge variant="outline">{formatRole(user.role)}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user.email}
                  {user.emailVerified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(user.createdAt)}
                </div>
                {user.profile?.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {user.profile.location}
                  </div>
                )}
                {user.lastLoginAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last login: {formatDateTime(user.lastLoginAt)}
                  </div>
                )}
              </div>
            </div>
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Heart className="h-5 w-5 mx-auto mb-1 text-pink-500" />
                <p className="text-2xl font-bold">{user._count?.connections || 0}</p>
                <p className="text-xs text-muted-foreground">Connections</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <MessageSquare className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold">{user._count?.messagesSent || 0}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Flag className="h-5 w-5 mx-auto mb-1 text-red-500" />
                <p className="text-2xl font-bold">{user._count?.reportsReceived || 0}</p>
                <p className="text-xs text-muted-foreground">Reports</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="veteran">Veteran Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{user.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Verified</p>
                  <p className="font-medium">{user.emailVerified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(user.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suspension/Ban History */}
          {user.statusHistory && user.statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Status History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.statusHistory.map((entry: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium">{entry.status}</p>
                        <p className="text-sm text-muted-foreground">{entry.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(entry.createdAt)} by {entry.changedBy?.email || 'System'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              {user.profile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Display Name</p>
                    <p className="font-medium">{user.profile.displayName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{user.profile.gender ? formatGender(user.profile.gender) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{user.profile.dateOfBirth ? formatDate(user.profile.dateOfBirth) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{user.profile.location || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Bio</p>
                    <p className="font-medium">{user.profile.bio || '-'}</p>
                  </div>
                  {user.profile.interests && user.profile.interests.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground mb-2">Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {user.profile.interests.map((interest: string, i: number) => (
                          <Badge key={i} variant="outline">{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No profile information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="veteran" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Veteran Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.veteranDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-medium">{formatBranch(user.veteranDetails.branch)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rank</p>
                      <p className="font-medium">{user.veteranDetails.rank || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">MOS/Rate</p>
                      <p className="font-medium">{user.veteranDetails.mos || '-'}</p>
                    </div>
                  </div>

                  {user.veteranDetails.dutyStations && user.veteranDetails.dutyStations.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Duty Stations</p>
                      <div className="flex flex-wrap gap-2">
                        {user.veteranDetails.dutyStations.map((station: string, i: number) => (
                          <Badge key={i} variant="outline">{station}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verification Status */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Verification Status</p>
                        <p className="text-sm text-muted-foreground">
                          {user.verificationRequest?.status || 'Not Submitted'}
                        </p>
                      </div>
                      {user.verificationRequest?.status === 'APPROVED' && (
                        <Badge variant="success">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">User is not a veteran or has no veteran details</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Activity log coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports Received</CardTitle>
            </CardHeader>
            <CardContent>
              {user.reportsReceived && user.reportsReceived.length > 0 ? (
                <div className="space-y-3">
                  {user.reportsReceived.map((report: any) => (
                    <div key={report.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge>{report.reason.replace(/_/g, ' ')}</Badge>
                        <Badge variant={report.status === 'RESOLVED' ? 'outline' : 'warning'}>
                          {report.status}
                        </Badge>
                      </div>
                      {report.description && (
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Reported by {report.reporter?.email} on {formatDate(report.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No reports received</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Change User Status"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={statusOptions}
          />
          {newStatus !== 'ACTIVE' && (
            <Input
              label="Reason"
              placeholder="Reason for status change..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => updateStatusMutation.mutate({ status: newStatus, reason: statusReason })}
              isLoading={updateStatusMutation.isPending}
              className="flex-1"
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Change User Role"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="New Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={roleOptions}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRoleModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => updateRoleMutation.mutate({ role: newRole })}
              isLoading={updateRoleMutation.isPending}
              className="flex-1"
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive font-medium">Warning: This action cannot be undone!</p>
            <p className="text-sm text-muted-foreground mt-1">
              All user data including profile, connections, messages, and verification documents will be permanently deleted.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate()}
              isLoading={deleteUserMutation.isPending}
              className="flex-1"
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
