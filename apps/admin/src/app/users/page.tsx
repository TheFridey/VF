'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  profile?: {
    displayName?: string;
    location?: string;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', role: '', search: '' });

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers(filter);
      setUsers(data.users || data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (userId: string, status: string) => {
    try {
      await adminApi.updateUserStatus(userId, status);
      toast.success('User status updated');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const updateRole = async (userId: string, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      toast.success('User role updated');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-yellow-100 text-yellow-800',
    BANNED: 'bg-red-100 text-red-800',
    PENDING: 'bg-gray-100 text-gray-800',
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    MODERATOR: 'bg-blue-100 text-blue-800',
    VETERAN_VERIFIED: 'bg-green-100 text-green-800',
    VETERAN_PAID: 'bg-emerald-100 text-emerald-800',
    VETERAN_UNVERIFIED: 'bg-yellow-100 text-yellow-800',
    CIVILIAN: 'bg-gray-100 text-gray-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users Management</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by email..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>
          <select
            value={filter.role}
            onChange={(e) => setFilter({ ...filter, role: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MODERATOR">Moderator</option>
            <option value="VETERAN_VERIFIED">Veteran (Verified)</option>
            <option value="VETERAN_UNVERIFIED">Veteran (Unverified)</option>
            <option value="CIVILIAN">Civilian</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.profile?.displayName || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded ${roleColors[user.role] || 'bg-gray-100'}`}
                    >
                      <option value="CIVILIAN">Civilian</option>
                      <option value="VETERAN_UNVERIFIED">Veteran (Unverified)</option>
                      <option value="VETERAN_VERIFIED">Veteran (Verified)</option>
                      <option value="VETERAN_PAID">Veteran (Paid)</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.status}
                      onChange={(e) => updateStatus(user.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded ${statusColors[user.status] || 'bg-gray-100'}`}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="BANNED">Banned</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => window.open(`/users/${user.id}`, '_blank')}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
