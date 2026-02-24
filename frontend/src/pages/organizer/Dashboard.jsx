import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { FiPlus, FiUsers, FiEdit, FiChevronLeft, FiChevronRight, FiBarChart2, FiCheckCircle } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../utils/api';

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  ongoing: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const statusTransitions = {
  draft: ['published', 'cancelled'],
  published: ['ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#4f46e5'];

export default function OrganizerDashboard() {
  const [carouselIdx, setCarouselIdx] = useState(0);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['organizer-events'],
    queryFn: () => api.get('/organizers/my-events').then(r => r.data)
  });

  const { data: analytics } = useQuery({
    queryKey: ['organizer-dashboard-analytics'],
    queryFn: () => api.get('/organizers/dashboard-analytics').then(r => r.data)
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/events/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizer-events']);
      queryClient.invalidateQueries(['organizer-dashboard-analytics']);
      toast.success('Event status updated!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed')
  });

  const visibleEvents = events.slice(Math.max(0, carouselIdx), carouselIdx + 3);

  const completedEvents = events.filter(e => e.status === 'completed');
  const totalRevenue = completedEvents.reduce((sum, e) => sum + (e.revenue || 0), 0);

  const chartData = (analytics?.perEvent || []).map(e => ({
    name: e.name.length > 16 ? e.name.slice(0, 14) + '…' : e.name,
    revenue: e.revenue,
    registrations: e.registrations,
    attendance: e.attendance
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h1>
          <p className="text-gray-500">Manage your events</p>
        </div>
        <Link to="/organizer/events/create" className="btn-primary flex items-center space-x-2 py-2.5 px-4">
          <FiPlus size={18} />
          <span>Create Event</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Events', value: events.length, color: 'text-primary-600' },
          { label: 'Published', value: events.filter(e => e.status === 'published').length, color: 'text-green-600' },
          { label: 'Completed', value: completedEvents.length, color: 'text-gray-600' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: 'text-blue-600' },
          { label: 'Total Attendance', value: analytics?.totals?.totalAttendance ?? '—', color: 'text-indigo-600' },
          { label: 'Attendance Rate', value: analytics?.totals?.avgAttendanceRate != null ? `${analytics.totals.avgAttendanceRate}%` : '—', color: 'text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="card text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Events Carousel */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card text-center py-20">
          <p className="text-gray-400 text-lg mb-4">No events yet</p>
          <Link to="/organizer/events/create" className="btn-primary">Create your first event</Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Events</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setCarouselIdx(Math.max(0, carouselIdx - 3))}
                disabled={carouselIdx === 0}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <FiChevronLeft />
              </button>
              <button
                onClick={() => setCarouselIdx(Math.min(events.length - 1, carouselIdx + 3))}
                disabled={carouselIdx + 3 >= events.length}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {visibleEvents.map(event => (
              <div key={event._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <span className={`badge ${statusColors[event.status]}`}>{event.status}</span>
                  <span className="badge bg-purple-100 text-purple-700 capitalize">{event.eventType}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{event.name}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {event.startDate && format(new Date(event.startDate), 'MMM dd, yyyy')}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{event.registrationCount}/{event.registrationLimit} registered</span>
                  {event.status === 'completed' && <span className="text-green-600 font-medium">₹{event.revenue}</span>}
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/organizer/events/${event._id}`}
                    className="flex-1 btn-primary text-xs py-1.5 flex items-center justify-center space-x-1"
                  >
                    <FiBarChart2 size={12} />
                    <span>View</span>
                  </Link>
                  <Link
                    to={`/organizer/events/${event._id}/participants`}
                    className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center space-x-1"
                  >
                    <FiUsers size={12} />
                    <span>Participants</span>
                  </Link>
                  {event.status !== 'completed' && event.status !== 'cancelled' && (
                    <Link
                      to={`/organizer/events/${event._id}/edit`}
                      className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center space-x-1"
                    >
                      <FiEdit size={12} />
                      <span>Edit</span>
                    </Link>
                  )}
                </div>
                {statusTransitions[event.status]?.length > 0 && (
                  <div className="mt-2 flex space-x-2">
                    {statusTransitions[event.status].map(nextStatus => (
                      <button
                        key={nextStatus}
                        onClick={() => statusMutation.mutate({ id: event._id, status: nextStatus })}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${nextStatus === 'cancelled'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                          }`}
                      >
                        → {nextStatus === 'published' ? 'publish' : nextStatus}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Event Analytics Section ── */}
      {analytics?.perEvent?.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center space-x-2 mb-6">
            <FiBarChart2 className="text-primary-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Event Analytics</h2>
            <span className="text-xs text-gray-400 ml-2">Completed events only</span>
          </div>

          {/* Revenue Chart */}
          <div className="card mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Event</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,.1)' }}
                  formatter={(value, name) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-event analytics table */}
          <div className="card overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Per-Event Breakdown</h3>
              <span className="text-xs text-gray-400">{analytics.perEvent.length} event{analytics.perEvent.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">Event</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium text-right">Registrations</th>
                    <th className="px-5 py-3 font-medium text-right">Revenue</th>
                    <th className="px-5 py-3 font-medium text-right">Items Sold</th>
                    <th className="px-5 py-3 font-medium text-right">Attendance</th>
                    <th className="px-5 py-3 font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analytics.perEvent.map(ev => (
                    <tr key={ev._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900 max-w-[200px] truncate">{ev.name}</td>
                      <td className="px-5 py-3">
                        <span className="badge bg-purple-50 text-purple-600 capitalize text-xs">{ev.eventType}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">{ev.registrations}</td>
                      <td className="px-5 py-3 text-right text-green-600 font-medium">₹{ev.revenue.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{ev.itemsSold || '—'}</td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        <span className="inline-flex items-center space-x-1">
                          <FiCheckCircle size={12} className="text-indigo-500" />
                          <span>{ev.attendance}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${ev.attendanceRate >= 75 ? 'text-green-600' : ev.attendanceRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {ev.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="bg-gray-50 font-semibold text-gray-900">
                    <td className="px-5 py-3" colSpan={2}>Totals</td>
                    <td className="px-5 py-3 text-right">{analytics.totals.totalRegistrations}</td>
                    <td className="px-5 py-3 text-right text-green-600">₹{analytics.totals.totalRevenue.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">{analytics.totals.totalItemsSold || '—'}</td>
                    <td className="px-5 py-3 text-right">{analytics.totals.totalAttendance}</td>
                    <td className="px-5 py-3 text-right text-primary-600">{analytics.totals.avgAttendanceRate}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
