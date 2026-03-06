'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

interface VerificationRequest {
  id: string;
  userId: string;
  status: string;
  evidenceUrls: string[];
  notes?: string;
  createdAt: string;
  user: {
    email: string;
    profile?: {
      displayName?: string;
    };
    veteranDetails?: {
      branch?: string;
      rank?: string;
    };
  };
}

export default function VerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await adminApi.getPendingVerifications();
      setRequests(data.requests || data || []);
    } catch (err) {
      toast.error('Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await adminApi.approveVerification(requestId, 'Verified via admin panel');
      toast.success('Verification approved');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to approve verification');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await adminApi.rejectVerification(requestId, rejectionReason);
      toast.success('Verification rejected');
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      toast.error('Failed to reject verification');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Verification Queue</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No pending verification requests
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch / Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">
                        {request.user?.profile?.displayName || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{request.user?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {request.user?.veteranDetails?.branch || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.user?.veteranDetails?.rank || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.evidenceUrls?.length || 0} document(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(request.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="inline-flex items-center px-2 py-1 text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Review
                    </button>
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="inline-flex items-center px-2 py-1 text-green-600 hover:text-green-900"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Review Verification Request</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">User</label>
                  <p className="text-gray-900">
                    {selectedRequest.user?.profile?.displayName} ({selectedRequest.user?.email})
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Military Details</label>
                  <p className="text-gray-900">
                    {selectedRequest.user?.veteranDetails?.branch} - {selectedRequest.user?.veteranDetails?.rank}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Documents</label>
                  <ul className="list-disc list-inside text-gray-900">
                    {selectedRequest.evidenceUrls?.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Document {i + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedRequest.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-gray-900">{selectedRequest.notes}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Rejection Reason (if rejecting)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
