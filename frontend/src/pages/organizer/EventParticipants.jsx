import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiDownload, FiSearch, FiActivity, FiCreditCard } from 'react-icons/fi';
import api from '../../utils/api';

export default function EventParticipants() {
  const { id } = useParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['event-participants', id],
    queryFn: () => api.get(`/events/${id}/participants`).then(r => r.data)
  });

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data)
  });

  const registrations = data?.registrations || [];

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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event?.name}</h1>
          <p className="text-gray-500">Participant List ({data?.total || 0} total)</p>
        </div>
        <div className="flex space-x-3">
          {event?.eventType !== 'merchandise' && (
            <Link to={`/organizer/events/${id}/attendance`} className="btn-secondary flex items-center space-x-2 py-2">
              <FiActivity size={14}/>
              <span>Attendance</span>
            </Link>
          )}
          {event?.eventType === 'merchandise' && event?.requiresPaymentApproval && (
            <Link to={`/organizer/events/${id}/payments`} className="btn-secondary flex items-center space-x-2 py-2">
              <FiCreditCard size={14}/>
              <span>Payments</span>
            </Link>
          )}
          <button onClick={handleExport} className="btn-secondary flex items-center space-x-2">
            <FiDownload size={16}/>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

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
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field w-40"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Ticket ID', 'Name', 'Email', 'College/Org', 'Type', 'Status', 'Attendance', 'Registered At'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">No participants found</td>
                </tr>
              ) : (
                filtered.map(reg => (
                  <tr key={reg._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-primary-600">{reg.ticketId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {reg.user?.firstName} {reg.user?.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{reg.user?.email}</td>
                    <td className="px-4 py-3 text-gray-500">{reg.user?.collegeOrOrg || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${reg.user?.type === 'IIIT' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                        {reg.user?.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${reg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${reg.checkedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {reg.checkedIn ? `✓ ${new Date(reg.checkedInAt).toLocaleTimeString()}` : 'Not checked in'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
