import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiCopy, FiUserPlus, FiCheck, FiX, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function TeamPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then(r => r.data)
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => api.post(`/teams/${id}/invite`, data),
    onSuccess: () => { queryClient.invalidateQueries(['team', id]); toast.success('Invitation sent!'); reset(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to invite')
  });

  const respondMutation = useMutation({
    mutationFn: ({ teamId, action, memberId }) => api.post(`/teams/${teamId}/respond`, { action, memberId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['team', id]);
      queryClient.invalidateQueries(['my-teams']);
      toast.success(res.data.message);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.delete(`/teams/${id}/leave`),
    onSuccess: () => { toast.success('Left team'); queryClient.invalidateQueries(['my-teams']); }
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-200 rounded-xl" />;
  if (!team) return <div className="text-center py-20 text-gray-400">Team not found</div>;

  const isLeader = team.leader?._id === user?._id || team.leader === user?._id;
  const myMembership = team.members?.find(m => (m.user?._id || m.user) === user?._id);
  const acceptedCount = (team.members?.filter(m => m.status === 'accepted').length || 0) + 1;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-600',
  };

  const teamStatusColors = {
    forming: 'bg-blue-100 text-blue-700',
    complete: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <div className="max-w-2xl">
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            <p className="text-primary-600">{team.event?.name}</p>
          </div>
          <span className={`badge ${teamStatusColors[team.status]}`}>{team.status}</span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Team size</span>
            <span>{acceptedCount}/{team.maxSize}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="gradient-bg h-2 rounded-full transition-all" style={{ width: `${(acceptedCount / team.maxSize) * 100}%` }} />
          </div>
        </div>

        {/* Invite code */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Invite Code</p>
            <p className="font-mono font-bold text-lg text-primary-600">{team.inviteCode}</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(team.inviteCode); toast.success('Code copied!'); }}
            className="p-2 text-gray-400 hover:text-primary-600"
          >
            <FiCopy size={18} />
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <FiUsers className="text-primary-500" />
          <span>Members</span>
        </h2>
        <div className="space-y-3">
          {/* Leader */}
          <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{team.leader?.firstName} {team.leader?.lastName}</p>
              <p className="text-xs text-gray-500">{team.leader?.email}</p>
            </div>
            <span className="badge bg-primary-100 text-primary-700">Leader</span>
          </div>
          {/* Other members */}
          {team.members?.map((member, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{member.user?.firstName} {member.user?.lastName}</p>
                <p className="text-xs text-gray-500">{member.user?.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`badge text-xs ${statusColors[member.status]}`}>{member.status}</span>
                {/* Leader sees accept/decline for pending members */}
                {member.status === 'pending' && isLeader && (
                  <div className="flex space-x-1">
                    <button onClick={() => respondMutation.mutate({ teamId: id, action: 'accept', memberId: member.user?._id || member.user })}
                      className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Accept"
                    >
                      <FiCheck size={14} />
                    </button>
                    <button onClick={() => respondMutation.mutate({ teamId: id, action: 'decline', memberId: member.user?._id || member.user })}
                      className="p-1 bg-red-100 text-red-500 rounded hover:bg-red-200" title="Decline"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite (leader only) */}
      {isLeader && team.status === 'forming' && (
        <div className="card mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Invite by Email</h3>
          <form onSubmit={handleSubmit(data => inviteMutation.mutate(data))} className="flex space-x-3">
            <input {...register('email', { required: true })} type="email" className="input-field flex-1" placeholder="teammate@example.com" />
            <button type="submit" disabled={inviteMutation.isPending} className="btn-primary flex items-center space-x-2 px-4">
              <FiUserPlus size={16} />
              <span>Invite</span>
            </button>
          </form>
        </div>
      )}

      {!isLeader && (
        <button onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending} className="btn-danger w-full py-2.5">
          Leave Team
        </button>
      )}
    </div>
  );
}
