import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiUsers, FiCalendar, FiShield, FiBarChart2, FiKey, FiDollarSign } from 'react-icons/fi';
import api from '../../utils/api';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data)
  });

  const topCards = [
    { label: 'Total Participants', value: stats?.totalUsers, icon: FiUsers, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/users' },
    { label: 'Organizers', value: stats?.totalOrganizers, icon: FiShield, color: 'text-purple-600', bg: 'bg-purple-50', link: '/admin/organizers' },
    { label: 'Total Events', value: stats?.totalEvents, icon: FiCalendar, color: 'text-green-600', bg: 'bg-green-50', link: '#' },
    { label: 'Active Registrations', value: stats?.totalRegistrations, icon: FiBarChart2, color: 'text-orange-600', bg: 'bg-orange-50', link: '#' },
    { label: 'Total Revenue', value: stats?.totalRevenue != null ? `₹${stats.totalRevenue.toLocaleString()}` : '—', icon: FiDollarSign, color: 'text-teal-600', bg: 'bg-teal-50', link: '#' },
    { label: 'Pending Resets', value: stats?.pendingResetRequests, icon: FiKey, color: 'text-red-600', bg: 'bg-red-50', link: '/admin/password-resets' },
  ];

  const eventStatuses = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {topCards.map(card => (
          <Link key={card.label} to={card.link} className="card hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon className={card.color} size={22} />
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            {card.label === 'Pending Resets' && stats?.pendingResetRequests > 0 && (
              <div className="mt-1 w-2 h-2 bg-red-500 rounded-full inline-block" />
            )}
          </Link>
        ))}
      </div>

      {/* Events by status */}
      {stats?.statusBreakdown && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Events by Status</h2>
          <div className="flex space-x-4">
            {eventStatuses.map(s => (
              <div key={s} className="flex-1 text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-gray-900">{stats.statusBreakdown[s] || 0}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/admin/organizers" className="flex items-center p-3 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
              <FiShield className="mr-3" /><span className="font-medium">Manage Organizers</span>
            </Link>
            <Link to="/admin/users" className="flex items-center p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              <FiUsers className="mr-3" /><span className="font-medium">Manage Users</span>
            </Link>
            <Link to="/admin/password-resets" className="flex items-center p-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
              <FiKey className="mr-3" />
              <span className="font-medium">Password Reset Requests</span>
              {stats?.pendingResetRequests > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {stats.pendingResetRequests}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Notes</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Organizers are provisioned by Admin only</p>
            <p>• Admin account created via backend seed script</p>
            <p>• IIIT emails auto-detected on registration</p>
            <p>• Auto-generated credentials for new organizers</p>
            <p>• Password resets require Admin approval</p>
          </div>
        </div>
      </div>
    </div>
  );
}
