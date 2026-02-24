import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FiCalendar, FiTag, FiExternalLink } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-700',
};

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => api.get('/registrations/my').then(r => r.data)
  });

  const { data: trendingData = [] } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get('/events/trending').then(r => r.data)
  });

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'normal', label: 'Normal' },
    { id: 'merchandise', label: 'Merchandise' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  const filteredRegistrations = registrations.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') return r.event?.status === 'completed';
    if (activeTab === 'cancelled') return r.status === 'cancelled';
    return r.registrationType === activeTab && r.status !== 'cancelled';
  });

  const upcoming = registrations.filter(r =>
    r.status === 'active' && r.event?.status !== 'completed'
  ).slice(0, 3);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-500">Here's what's happening with your events</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Total Registrations</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">{registrations.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Upcoming Events</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{upcoming.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-3xl font-bold text-gray-600 mt-1">
            {registrations.filter(r => r.event?.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Participation History */}
        <div className="col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Participation History</h2>

            {/* Tabs */}
            <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FiCalendar size={48} className="mx-auto mb-3 opacity-50" />
                <p>No registrations found</p>
                <Link to="/events" className="text-primary-500 text-sm mt-2 inline-block hover:underline">
                  Browse Events
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRegistrations.map(reg => (
                  <div key={reg._id} className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{reg.event?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {reg.event?.organizer?.name} • {reg.event?.startDate && format(new Date(reg.event.startDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`badge ${statusColors[reg.status] || 'bg-gray-100 text-gray-600'}`}>
                        {reg.status}
                      </span>
                      <Link
                        to={`/tickets/${reg.ticketId}`}
                        className="text-primary-500 hover:text-primary-700 flex items-center space-x-1 text-xs font-medium"
                      >
                        <FiTag size={12} />
                        <span>{reg.ticketId}</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trending */}
        <div>
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🔥 Trending (24h)</h2>
            {trendingData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No trending events yet</p>
            ) : (
              <div className="space-y-3">
                {trendingData.map((item, idx) => (
                  <Link
                    key={item._id}
                    to={`/events/${item.event._id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-2xl font-bold text-gray-200">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.event.name}</p>
                      <p className="text-xs text-gray-500">{item.count} registrations</p>
                    </div>
                    <FiExternalLink size={14} className="text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
