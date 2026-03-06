'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  user?: {
    email: string;
    profile?: { displayName?: string };
  };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs({ page, action: actionFilter || undefined });
      setLogs(data.logs || data || []);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const actionColors: Record<string, string> = {
    USER_BANNED: 'bg-red-100 text-red-800',
    USER_SUSPENDED: 'bg-yellow-100 text-yellow-800',
    VERIFICATION_APPROVED: 'bg-green-100 text-green-800',
    VERIFICATION_REJECTED: 'bg-orange-100 text-orange-800',
    REPORT_RESOLVED: 'bg-blue-100 text-blue-800',
    ROLE_CHANGED: 'bg-purple-100 text-purple-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h1>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Actions</option>
          <option value="USER_BANNED">User Banned</option>
          <option value="USER_SUSPENDED">User Suspended</option>
          <option value="VERIFICATION_APPROVED">Verification Approved</option>
          <option value="VERIFICATION_REJECTED">Verification Rejected</option>
          <option value="REPORT_RESOLVED">Report Resolved</option>
          <option value="ROLE_CHANGED">Role Changed</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit logs found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {log.user?.profile?.displayName || log.user?.email || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.resource}
                    {log.resourceId && (
                      <span className="text-gray-400 ml-1">
                        ({log.resourceId.substring(0, 8)}...)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={logs.length < 20}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
