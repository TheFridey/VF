'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { adminApi } from '@/lib/admin-api';
import { formatDateTime, cn } from '@/lib/utils';
import { useDebounce } from '@/hooks';

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'USER_CREATED', label: 'User Created' },
  { value: 'USER_UPDATED', label: 'User Updated' },
  { value: 'USER_DELETED', label: 'User Deleted' },
  { value: 'USER_LOGIN', label: 'User Login' },
  { value: 'USER_LOGOUT', label: 'User Logout' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
  { value: 'ROLE_CHANGED', label: 'Role Changed' },
  { value: 'STATUS_CHANGED', label: 'Status Changed' },
  { value: 'VERIFICATION_SUBMITTED', label: 'Verification Submitted' },
  { value: 'VERIFICATION_APPROVED', label: 'Verification Approved' },
  { value: 'VERIFICATION_REJECTED', label: 'Verification Rejected' },
  { value: 'REPORT_CREATED', label: 'Report Created' },
  { value: 'REPORT_RESOLVED', label: 'Report Resolved' },
  { value: 'USER_BLOCKED', label: 'User Blocked' },
  { value: 'USER_UNBLOCKED', label: 'User Unblocked' },
  { value: 'DATA_EXPORT', label: 'Data Export' },
  { value: 'ACCOUNT_DELETION_REQUESTED', label: 'Account Deletion Requested' },
];

const getActionColor = (action: string) => {
  if (action.includes('DELETED') || action.includes('BANNED') || action.includes('REJECTED')) {
    return 'destructive';
  }
  if (action.includes('CREATED') || action.includes('APPROVED')) {
    return 'success';
  }
  if (action.includes('UPDATED') || action.includes('CHANGED')) {
    return 'warning';
  }
  return 'default';
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const debouncedUserId = useDebounce(userId, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, debouncedUserId, actionFilter, startDate, endDate],
    queryFn: () =>
      adminApi.getAuditLogs({
        page,
        limit: 50,
        userId: debouncedUserId || undefined,
        action: actionFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const logs = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const totalCount = data?.meta?.total || 0;

  const clearFilters = () => {
    setUserId('');
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all system activities and changes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="User ID..."
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              options={actionOptions}
            />
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} log entries
        </p>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No audit logs</h3>
              <p className="text-muted-foreground">No logs match your current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Timestamp</th>
                    <th className="text-left p-4 font-medium">Action</th>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Target</th>
                    <th className="text-left p-4 font-medium">Details</th>
                    <th className="text-left p-4 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateTime(log.createdAt)}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={getActionColor(log.action) as any}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {log.user.profile?.displayName || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">{log.user.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">System</span>
                        )}
                      </td>
                      <td className="p-4">
                        {log.targetUser ? (
                          <div className="text-sm">
                            <p className="font-medium">
                              {log.targetUser.profile?.displayName || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">{log.targetUser.email}</p>
                          </div>
                        ) : log.targetId ? (
                          <span className="text-sm text-muted-foreground">
                            ID: {log.targetId.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {log.details ? (
                          <div className="max-w-xs">
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                              {typeof log.details === 'string'
                                ? log.details.slice(0, 100)
                                : JSON.stringify(log.details, null, 2).slice(0, 100)}
                              {(typeof log.details === 'string' ? log.details : JSON.stringify(log.details)).length > 100 && '...'}
                            </pre>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground font-mono">
                          {log.ipAddress || '-'}
                        </span>
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
    </div>
  );
}
