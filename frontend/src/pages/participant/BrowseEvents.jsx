import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FiSearch, FiFilter, FiCalendar, FiUsers } from 'react-icons/fi';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const statusColors = {
  published: 'bg-green-100 text-green-700',
  ongoing: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
};

export default function BrowseEvents() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    eventType: '', eligibility: '', startDate: '', endDate: '', followedClubs: false
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const updateSearch = useCallback((val) => {
    setSearch(val);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => setDebouncedSearch(val), 400);
  }, []);

  const queryParams = new URLSearchParams({
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(filters.eventType && { eventType: filters.eventType }),
    ...(filters.eligibility && { eligibility: filters.eligibility }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(filters.followedClubs && { followedClubs: 'true' }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['events', queryParams.toString()],
    queryFn: () => api.get(`/events?${queryParams}`).then(r => r.data),
    keepPreviousData: true
  });

  const events = data?.events || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Browse Events</h1>
        <p className="text-gray-500">Discover and register for upcoming events</p>
      </div>

      {/* Search & Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => updateSearch(e.target.value)}
              className="input-field pl-10"
              placeholder="Search events, organizers..."
            />
          </div>
          <select
            value={filters.eventType}
            onChange={e => setFilters(f => ({ ...f, eventType: e.target.value }))}
            className="input-field w-40"
          >
            <option value="">All Types</option>
            <option value="normal">Normal</option>
            <option value="merchandise">Merchandise</option>
            <option value="hackathon">Hackathon</option>
          </select>
          <select
            value={filters.eligibility}
            onChange={e => setFilters(f => ({ ...f, eligibility: e.target.value }))}
            className="input-field w-44"
          >
            <option value="">All Eligibility</option>
            <option value="all">Open to All</option>
            <option value="iiit-only">IIIT Only</option>
            <option value="non-iiit-only">Non-IIIT Only</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="input-field w-44"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="input-field w-44"
          />
          {user?.followedClubs?.length > 0 && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.followedClubs}
                onChange={e => setFilters(f => ({ ...f, followedClubs: e.target.checked }))}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-600">Followed clubs only</span>
            </label>
          )}
          {Object.values(filters).some(Boolean) && (
            <button
              onClick={() => setFilters({ eventType: '', eligibility: '', startDate: '', endDate: '', followedClubs: false })}
              className="text-sm text-red-500 hover:text-red-600"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{data?.total || 0} events found</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiCalendar size={64} className="mx-auto mb-4 opacity-30" />
          <p className="text-xl font-medium">No events found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <Link key={event._id} to={`/events/${event._id}`} className="event-card">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 gradient-bg flex items-center justify-center">
                    <span className="text-white text-4xl font-bold opacity-50">{event.name[0]}</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`badge ${statusColors[event.status] || 'bg-gray-100 text-gray-600'}`}>
                      {event.status}
                    </span>
                    <span className="badge bg-purple-100 text-purple-700 capitalize">{event.eventType}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{event.name}</h3>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{event.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center space-x-1">
                      <FiCalendar size={11} />
                      <span>{event.startDate && format(new Date(event.startDate), 'MMM dd')}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FiUsers size={11} />
                      <span>{event.registrationCount}/{event.registrationLimit}</span>
                    </span>
                  </div>
                  <p className="text-xs text-primary-600 mt-2 font-medium">{event.organizer?.name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
