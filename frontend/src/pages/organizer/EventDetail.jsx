import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    FiCalendar, FiUsers, FiMapPin, FiTag, FiDollarSign,
    FiBarChart2, FiCheckCircle, FiDownload, FiSearch,
    FiEdit, FiActivity, FiCreditCard, FiMessageSquare
} from 'react-icons/fi';
import api from '../../utils/api';

const statusColors = {
    draft: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    ongoing: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
};

export default function OrganizerEventDetail() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('overview');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const { data: event, isLoading } = useQuery({
        queryKey: ['event', id],
        queryFn: () => api.get(`/events/${id}`).then(r => r.data)
    });

    const { data: analyticsData } = useQuery({
        queryKey: ['organizer-analytics', id],
        queryFn: () => api.get(`/organizers/analytics/${id}`).then(r => r.data),
        enabled: activeTab === 'analytics' || activeTab === 'overview'
    });

    const { data: attendanceData } = useQuery({
        queryKey: ['attendance', id],
        queryFn: () => api.get(`/attendance/${id}`).then(r => r.data),
        enabled: activeTab === 'analytics' || activeTab === 'overview'
    });

    const { data: participantsData } = useQuery({
        queryKey: ['event-participants', id],
        queryFn: () => api.get(`/events/${id}/participants`).then(r => r.data),
        enabled: activeTab === 'participants'
    });

    const registrations = participantsData?.registrations || [];
    const filtered = registrations.filter(r => {
        const matchSearch = !search ||
            r.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
            r.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
            r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
            r.ticketId?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleExport = () => window.open(`/api/events/${id}/export`, '_blank');

    // Aggregate analytics
    const regStats = analyticsData?.registrationStats || [];
    const activeRegs = regStats.find(s => s._id === 'active');
    const cancelledRegs = regStats.find(s => s._id === 'cancelled');
    const totalRevenue = regStats.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const checkedIn = attendanceData?.checked ?? 0;
    const totalActive = attendanceData?.total ?? event?.registrationCount ?? 0;
    const attendanceRate = totalActive > 0 ? Math.round((checkedIn / totalActive) * 100) : 0;

    const tabs = [
        { id: 'overview', icon: FiCalendar, label: 'Overview' },
        { id: 'analytics', icon: FiBarChart2, label: 'Analytics' },
        { id: 'participants', icon: FiUsers, label: 'Participants' },
    ];

    if (isLoading) return <div className="animate-pulse h-96 bg-gray-200 rounded-xl" />;

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900">{event?.name}</h1>
                        <span className={`badge ${statusColors[event?.status]}`}>{event?.status}</span>
                        <span className="badge bg-purple-100 text-purple-700 capitalize">{event?.eventType}</span>
                    </div>
                    <p className="text-gray-500 text-sm">{event?.description?.slice(0, 120)}{event?.description?.length > 120 ? '…' : ''}</p>
                </div>
                <div className="flex space-x-2">
                    {event?.status !== 'completed' && event?.status !== 'cancelled' && (
                        <Link to={`/organizer/events/${id}/edit`} className="btn-secondary flex items-center space-x-1 py-2 px-3 text-sm">
                            <FiEdit size={14} /><span>Edit</span>
                        </Link>
                    )}
                    {event?.eventType !== 'merchandise' && (
                        <Link to={`/organizer/events/${id}/attendance`} className="btn-primary flex items-center space-x-1 py-2 px-3 text-sm">
                            <FiActivity size={14} /><span>Attendance</span>
                        </Link>
                    )}
                    {event?.eventType === 'merchandise' && event?.requiresPaymentApproval && (
                        <Link to={`/organizer/events/${id}/payments`} className="btn-secondary flex items-center space-x-1 py-2 px-3 text-sm">
                            <FiCreditCard size={14} /><span>Payments</span>
                        </Link>
                    )}
                    <Link to={`/organizer/events/${id}/feedback`} className="btn-secondary flex items-center space-x-1 py-2 px-3 text-sm">
                        <FiMessageSquare size={14} /><span>Feedback</span>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon size={15} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ─── Overview Tab ─── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Quick stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="card text-center">
                            <p className="text-2xl font-bold text-primary-600">{event?.registrationCount || 0}</p>
                            <p className="text-sm text-gray-500 mt-1">Registrations</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-2xl font-bold text-green-600">₹{(event?.revenue || 0).toLocaleString()}</p>
                            <p className="text-sm text-gray-500 mt-1">Revenue</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-2xl font-bold text-indigo-600">{checkedIn}</p>
                            <p className="text-sm text-gray-500 mt-1">Checked In</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-2xl font-bold text-purple-600">{attendanceRate}%</p>
                            <p className="text-sm text-gray-500 mt-1">Attendance Rate</p>
                        </div>
                    </div>

                    {/* Event Details Grid */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Event Details</h3>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                            <div className="flex items-center space-x-2">
                                <FiCalendar className="text-gray-400" size={14} />
                                <span className="text-gray-500">Start:</span>
                                <span className="text-gray-900 font-medium">{event?.startDate && format(new Date(event.startDate), 'MMM dd, yyyy h:mm a')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <FiCalendar className="text-gray-400" size={14} />
                                <span className="text-gray-500">End:</span>
                                <span className="text-gray-900 font-medium">{event?.endDate && format(new Date(event.endDate), 'MMM dd, yyyy h:mm a')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <FiCalendar className="text-gray-400" size={14} />
                                <span className="text-gray-500">Reg Deadline:</span>
                                <span className="text-gray-900 font-medium">{event?.registrationDeadline && format(new Date(event.registrationDeadline), 'MMM dd, yyyy h:mm a')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <FiUsers className="text-gray-400" size={14} />
                                <span className="text-gray-500">Eligibility:</span>
                                <span className="text-gray-900 font-medium capitalize">{event?.eligibility?.replace('-', ' ')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <FiMapPin className="text-gray-400" size={14} />
                                <span className="text-gray-500">Venue:</span>
                                <span className="text-gray-900 font-medium">{event?.venue || 'TBD'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <FiDollarSign className="text-gray-400" size={14} />
                                <span className="text-gray-500">Reg Fee:</span>
                                <span className="text-gray-900 font-medium">{event?.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <FiUsers className="text-gray-400" size={14} />
                                <span className="text-gray-500">Limit:</span>
                                <span className="text-gray-900 font-medium">{event?.registrationCount}/{event?.registrationLimit}</span>
                            </div>
                            {event?.eventType === 'hackathon' && (
                                <div className="flex items-center space-x-2">
                                    <FiUsers className="text-gray-400" size={14} />
                                    <span className="text-gray-500">Team Size:</span>
                                    <span className="text-gray-900 font-medium">{event?.teamSize}</span>
                                </div>
                            )}
                        </div>
                        {event?.tags?.length > 0 && (
                            <div className="mt-4 flex items-center space-x-2">
                                <FiTag className="text-gray-400" size={14} />
                                <div className="flex flex-wrap gap-1">
                                    {event.tags.map(tag => (
                                        <span key={tag} className="badge bg-gray-100 text-gray-600 text-xs">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Analytics Tab ─── */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card text-center">
                            <p className="text-2xl font-bold text-primary-600">{activeRegs?.count || 0}</p>
                            <p className="text-sm text-gray-500 mt-1">Active Registrations</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-2xl font-bold text-red-500">{cancelledRegs?.count || 0}</p>
                            <p className="text-sm text-gray-500 mt-1">Cancelled</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
                            <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-2xl font-bold text-indigo-600">{checkedIn}/{totalActive}</p>
                            <p className="text-sm text-gray-500 mt-1">Attendance</p>
                        </div>
                    </div>

                    {/* Attendance progress */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Attendance Rate</h3>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1">
                                <div className="w-full bg-gray-100 rounded-full h-3">
                                    <div className="gradient-bg h-3 rounded-full transition-all" style={{ width: `${attendanceRate}%` }} />
                                </div>
                            </div>
                            <span className="text-lg font-bold text-primary-600">{attendanceRate}%</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{checkedIn} checked in out of {totalActive} active registrations</p>
                    </div>

                    {/* Registration breakdown */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Registration Breakdown</h3>
                        <div className="space-y-2">
                            {regStats.map(stat => (
                                <div key={stat._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <span className="capitalize text-sm text-gray-700">{stat._id}</span>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm font-medium text-gray-900">{stat.count} registrations</span>
                                        <span className="text-sm text-green-600">₹{(stat.revenue || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {event?.eventType === 'hackathon' && (
                        <div className="card">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Team Completion</h3>
                            <p className="text-sm text-gray-500">Max team size: {event.teamSize} members</p>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Participants Tab ─── */}
            {activeTab === 'participants' && (
                <div>
                    {/* Filters */}
                    <div className="card mb-4 flex space-x-4">
                        <div className="flex-1 relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="input-field pl-10"
                                placeholder="Search by name, email, or ticket ID..."
                            />
                        </div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-40">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                        </select>
                        <button onClick={handleExport} className="btn-secondary flex items-center space-x-2 py-2 px-3">
                            <FiDownload size={14} />
                            <span>Export CSV</span>
                        </button>
                    </div>

                    {/* Table */}
                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        {['Name', 'Email', 'Reg Date', 'Payment', 'Team', 'Attendance', 'Status'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-gray-400">No participants found</td>
                                        </tr>
                                    ) : (
                                        filtered.map(reg => (
                                            <tr key={reg._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {reg.user?.firstName} {reg.user?.lastName}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{reg.user?.email}</td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {new Date(reg.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {reg.paymentStatus && reg.paymentStatus !== 'not_required' ? (
                                                        <span className={`badge text-xs ${reg.paymentStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                                                reg.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-600'}`}>{reg.paymentStatus}</span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {reg.team ? reg.team.name || 'In team' : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`badge text-xs ${reg.checkedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                                        {reg.checkedIn ? '✓ Checked in' : 'Not yet'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`badge text-xs ${reg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                        {reg.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
