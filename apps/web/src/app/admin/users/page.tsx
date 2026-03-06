'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Search,
  Filter,
  MoreVertical,
  Shield,
  Ban,
  Trash2,
  Eye,
  UserCog,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { adminApi } from '@/lib/admin-api';
import { formatDate, formatRole, cn } from '@/lib/utils';
import { useDebounce } from '@/hooks';

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'CIVILIAN', label: 'Civilian' },
  { value: 'VETERAN_UNVERIFIED', label: 'Veteran (Unverified)' },
  { value: 'VETERAN_VERIFIED', label: 'Veteran (Verified)' },
  { value: 'VETERAN_PAID', label: 'Premium Veteran' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'ADMIN', label: 'Admin' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'BANNED', label: 'Banned' },
];

const actionOptions = [
  { value: 'ACTIVE', label: 'Activate' },
  { value: 'SUSPENDED', label: 'Suspend (7 days)' },
  { value: 'BANNED', label: 'Permanent Ban' },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newRole, setNewRole] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch, roleFilter, statusFilter],
    queryFn: () =>
      adminApi.getUsers({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string; status: string; reason?: string }) =>
      adminApi.updateUserStatus(userId, { status, reason }),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowStatusModal(false);
      setSelectedUser(null);
      setStatusReason('');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateUserRole(userId, { role }),
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowRoleModal(false);
      setSelectedUser(null);
    },
    onError: () => toast.error('Failed to update role'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowDeleteModal(false);
      setSelectedUser(null);
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const users = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
      ACTIVE: 'success',
      PENDING: 'warning',
      SUSPENDED: 'warning',
      BANNED: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage platform users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={roleOptions}
              className="w-full md:w-48"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              className="w-full md:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.profile?.profileImageUrl}
                            name={user.profile?.displayName || user.email}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium">
                              {user.profile?.displayName || 'No Name'}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{formatRole(user.role)}</Badge>
                      </td>
                      <td className="p-4">{getStatusBadge(user.status)}</td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/users/${user.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewStatus(user.status);
                              setShowStatusModal(true);
                            }}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                              setShowRoleModal(true);
                            }}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
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
        </CardContent>
      </Card>

      {/* Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedUser(null);
          setStatusReason('');
        }}
        title="Update User Status"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={actionOptions}
          />
          {newStatus !== 'ACTIVE' && (
            <Input
              label="Reason"
              placeholder="Reason for action..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateStatusMutation.mutate({
                  userId: selectedUser.id,
                  status: newStatus,
                  reason: statusReason || undefined,
                })
              }
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
        onClose={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
        }}
        title="Update User Role"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="New Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={roleOptions.filter((r) => r.value)}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRoleModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateRoleMutation.mutate({
                  userId: selectedUser.id,
                  role: newRole,
                })
              }
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
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete{' '}
            <strong>{selectedUser?.profile?.displayName || selectedUser?.email}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate(selectedUser.id)}
              isLoading={deleteUserMutation.isPending}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
