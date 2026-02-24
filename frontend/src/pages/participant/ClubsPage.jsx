import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ClubsPage() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ['organizers'],
    queryFn: () => api.get('/users/organizers').then(r => r.data)
  });

  const followMutation = useMutation({
    mutationFn: (followedClubs) => api.put('/users/profile', { followedClubs }),
    onSuccess: (res) => {
      setUser(res.data);
      queryClient.invalidateQueries(['organizers']);
      toast.success('Preferences updated!');
    }
  });

  const toggleFollow = (orgId) => {
    const current = user?.followedClubs || [];
    const updated = current.includes(orgId)
      ? current.filter(id => id !== orgId)
      : [...current, orgId];
    followMutation.mutate(updated);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Clubs & Organizers</h1>
        <p className="text-gray-500">Follow clubs to get personalized event recommendations</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizers.map(org => {
            const isFollowed = user?.followedClubs?.includes(org._id);
            return (
              <div key={org._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <Link to={`/clubs/${org._id}`} className="w-16 h-16 gradient-bg rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {org.name[0]}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/clubs/${org._id}`} className="font-semibold text-gray-900 truncate hover:text-primary-600 block">{org.name}</Link>
                    <p className="text-sm text-primary-600">{org.category}</p>
                    {org.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{org.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(org._id)}
                  disabled={followMutation.isPending}
                  className={`mt-4 w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                    isFollowed
                      ? 'bg-primary-50 text-primary-600 border border-primary-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                      : 'btn-primary'
                  }`}
                >
                  {isFollowed ? '✓ Following (click to unfollow)' : '+ Follow'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
