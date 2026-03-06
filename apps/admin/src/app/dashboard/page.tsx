'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Users, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  verifiedVeterans: number;
  pendingVerifications: number;
  pendingReports: number;
  matchesToday: number;
  newUsersToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await adminApi.getDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const statCards = [
    { name: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'bg-blue-500' },
    { name: 'Verified Veterans', value: stats?.verifiedVeterans || 0, icon: Shield, color: 'bg-green-500' },
    { name: 'Pending Verifications', value: stats?.pendingVerifications || 0, icon: CheckCircle, color: 'bg-yellow-500' },
    { name: 'Pending Reports', value: stats?.pendingReports || 0, icon: AlertTriangle, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-full p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">New Users</span>
              <span className="font-semibold">{stats?.newUsersToday || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">New Matches</span>
              <span className="font-semibold">{stats?.matchesToday || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Users</span>
              <span className="font-semibold">{stats?.activeUsers || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/verification"
              className="block p-3 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              Review {stats?.pendingVerifications || 0} pending verifications →
            </a>
            <a
              href="/reports"
              className="block p-3 bg-red-50 text-red-800 rounded-lg hover:bg-red-100 transition-colors"
            >
              Handle {stats?.pendingReports || 0} pending reports →
            </a>
            <a
              href="/users"
              className="block p-3 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Manage users →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
