import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FiUsers, FiActivity, FiBarChart2, FiCalendar } from 'react-icons/fi';
import api from '../../utils/api';

export default function OngoingEvents() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['organizer-ongoing'],
    queryFn: () => api.get('/organizers/my-ongoing').then(r => r.data)
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <FiActivity className="text-blue-500" />
          <span>Ongoing Events</span>
        </h1>
        <p className="text-gray-500">Currently active events requiring your attention</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card text-center py-20">
          <FiActivity size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 text-lg">No ongoing events right now</p>
          <p className="text-gray-300 text-sm mt-1">Events in "Ongoing" status will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <div key={event._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{event.name}</h3>
                    <span className="badge bg-blue-100 text-blue-700">ongoing</span>
                    <span className="badge bg-purple-100 text-purple-700 capitalize">{event.eventType}</span>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <FiCalendar size={13} />
                      <span>{format(new Date(event.startDate), 'MMM dd')} – {format(new Date(event.endDate), 'MMM dd, yyyy')}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FiUsers size={13} />
                      <span>{event.registrationCount}/{event.registrationLimit} registered</span>
                    </span>
                    {event.revenue > 0 && (
                      <span className="text-green-600 font-medium">₹{event.revenue} revenue</span>
                    )}
                  </div>
                  {/* Registration progress */}
                  <div className="mt-3 w-64">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="gradient-bg h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (event.registrationCount / event.registrationLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-6">
                  <Link to={`/organizer/events/${event._id}/participants`} className="btn-secondary text-xs py-2 flex items-center space-x-1">
                    <FiUsers size={12} />
                    <span>Participants</span>
                  </Link>
                  <Link to={`/organizer/events/${event._id}/attendance`} className="btn-primary text-xs py-2 flex items-center space-x-1">
                    <FiActivity size={12} />
                    <span>Attendance</span>
                  </Link>
                  <Link to={`/organizer/events/${event._id}/edit`} className="btn-secondary text-xs py-2 flex items-center space-x-1">
                    <FiBarChart2 size={12} />
                    <span>Analytics</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

