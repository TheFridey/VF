'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  reason: string;
  description?: string;
  status: string;
  resolution?: string;
  createdAt: string;
  reporter: {
    email: string;
    profile?: { displayName?: string };
  };
  reportedUser: {
    id: string;
    email: string;
    status: string;
    profile?: { displayName?: string };
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReports({ status: filter || undefined });
      setReports(data.reports || data || []);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport || !resolution.trim()) {
      toast.error('Please provide a resolution');
      return;
    }
    try {
      await adminApi.resolveReport(selectedReport.id, resolution, action);
      toast.success('Report resolved');
      setSelectedReport(null);
      setResolution('');
      setAction('');
      fetchReports();
    } catch (err) {
      toast.error('Failed to resolve report');
    }
  };

  const reasonLabels: Record<string, string> = {
    FAKE_PROFILE: 'Fake Profile',
    HARASSMENT: 'Harassment',
    INAPPROPRIATE_CONTENT: 'Inappropriate Content',
    SPAM: 'Spam',
    SCAM: 'Scam',
    IMPERSONATION: 'Impersonation',
    UNDERAGE: 'Underage',
    OTHER: 'Other',
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    DISMISSED: 'bg-gray-100 text-gray-800',
    ACTION_TAKEN: 'bg-green-100 text-green-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports Management</h1>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Reports</option>
          <option value="PENDING">Pending</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ACTION_TAKEN">Action Taken</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No reports found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">
                        {report.reportedUser?.profile?.displayName || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{report.reportedUser?.email}</div>
                      <div className="text-xs text-gray-400">Status: {report.reportedUser?.status}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                      {reasonLabels[report.reason] || report.reason}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.reporter?.profile?.displayName || report.reporter?.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${statusColors[report.status]}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(report.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {report.status === 'PENDING' ? (
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-gray-400">
                        {report.resolution?.substring(0, 30)}...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Resolve Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Resolve Report</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Reported User</label>
                  <p className="text-gray-900">{selectedReport.reportedUser?.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Reason</label>
                  <p className="text-gray-900">{reasonLabels[selectedReport.reason]}</p>
                </div>

                {selectedReport.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-900">{selectedReport.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Action to take</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">No action (dismiss)</option>
                    <option value="warn">Warn user</option>
                    <option value="suspend">Suspend user</option>
                    <option value="ban">Ban user</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Resolution notes</label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Describe how this was resolved..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setResolution('');
                    setAction('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Resolve Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
