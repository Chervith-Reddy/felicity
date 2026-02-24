import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FiMail, FiCalendar, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function OrganizerDetailPage() {
  const { id } = useParams();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['organizer-detail', id],
    queryFn: () => api.get(`/organizers/${id}`).then(r => r.data)
  });

  const isFollowing = user?.followedClubs?.includes(id);

  const followMutation = useMutation({
    mutationFn: (followedClubs) => api.put('/users/profile', { followedClubs }),
    onSuccess: (res) => { setUser(res.data); queryClient.invalidateQueries(['organizers']); }
  });

  const toggleFollow = () => {
    const current = user?.followedClubs || [];
    const updated = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
    followMutation.mutate(updated);
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded-xl"/><div className="h-64 bg-gray-200 rounded-xl"/></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Organizer not found</div>;

  const { organizer, upcomingEvents = [], pastEvents = [] } = data;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-5">
            <div className="w-20 h-20 gradient-bg rounded-2xl flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
              {organizer.name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organizer.name}</h1>
              <p className="text-primary-600 font-medium">{organizer.category}</p>
              {organizer.description && <p className="text-gray-500 mt-2 max-w-xl">{organizer.description}</p>}
              {organizer.contactEmail && (
                <a href={`mailto:${organizer.contactEmail}`} className="flex items-center space-x-1 text-sm text-gray-500 mt-2 hover:text-primary-600">
                  <FiMail size={13} />
                  <span>{organizer.contactEmail}</span>
                </a>
              )}
            </div>
          </div>
          <button
            onClick={toggleFollow}
            disabled={followMutation.isPending}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${
              isFollowing
                ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                : 'btn-primary'
            }`}
          >
            {isFollowing ? '✓ Following' : '+ Follow'}
          </button>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <FiCalendar className="text-primary-500" />
          <span>Upcoming Events</span>
          <span className="badge bg-green-100 text-green-700">{upcomingEvents.length}</span>
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">No upcoming events</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {upcomingEvents.map(event => (
              <Link key={event._id} to={`/events/${event._id}`} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <span className="badge bg-green-100 text-green-700 text-xs">{event.status}</span>
                  <span className="badge bg-purple-100 text-purple-700 text-xs capitalize">{event.eventType}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{event.name}</h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{event.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{event.startDate && format(new Date(event.startDate), 'MMM dd, yyyy')}</span>
                  <span className="flex items-center space-x-1">
                    <FiUsers size={10} />
                    <span>{event.registrationCount}/{event.registrationLimit}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <span>Past Events</span>
          <span className="badge bg-gray-100 text-gray-600">{pastEvents.length}</span>
        </h2>
        {pastEvents.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">No past events</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {pastEvents.map(event => (
              <div key={event._id} className="card opacity-75">
                <div className="flex items-start justify-between mb-2">
                  <span className="badge bg-gray-100 text-gray-500 text-xs">completed</span>
                </div>
                <h3 className="font-semibold text-gray-700 mb-1">{event.name}</h3>
                <p className="text-xs text-gray-400">{event.startDate && format(new Date(event.startDate), 'MMM dd, yyyy')}</p>
                <p className="text-xs text-gray-400 mt-1">{event.registrationCount} attended</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
