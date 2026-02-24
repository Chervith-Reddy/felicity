import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiCopy, FiCheck, FiX } from 'react-icons/fi';
import api from '../../utils/api';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

export default function PasswordResetRequests() {
  const [statusFilter, setStatusFilter] = useState('');
  const [resolvedCredentials, setResolvedCredentials] = useState(null);
  const [actionRequestId, setActionRequestId] = useState(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['password-reset-requests', statusFilter],
    queryFn: () => api.get(`/password-reset-requests?status=${statusFilter}`).then(r => r.data)
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, adminComment }) => api.patch(`/password-reset-requests/${id}/approve`, { adminComment }),
    onSuccess: (res) => {
      setResolvedCredentials(res.data.newCredentials);
      queryClient.invalidateQueries(['password-reset-requests']);
      setActionRequestId(null);
      reset();
      toast.success('Request approved!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminComment }) => api.patch(`/password-reset-requests/${id}/reject`, { adminComment }),
    onSuccess: () => {
      queryClient.invalidateQueries(['password-reset-requests']);
      setActionRequestId(null);
      reset();
      toast.success('Request rejected');
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id) => api.post(`/password-reset-requests/${id}/acknowledge`),
    onSuccess: () => { setResolvedCredentials(null); queryClient.invalidateQueries(['password-reset-requests']); }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Password Reset Requests</h1>
        <p className="text-gray-500">Review and process organizer password reset requests</p>
      </div>

      {/* Credentials modal */}
      {resolvedCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🔑 New Credentials Generated</h2>
            <p className="text-gray-500 text-sm mb-4">Share these with the organizer. Cleared after acknowledgment.</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-gray-400">Email</p><p className="font-mono font-medium">{resolvedCredentials.email}</p></div>
                <button onClick={() => navigator.clipboard.writeText(resolvedCredentials.email)} className="text-gray-400 hover:text-primary-600"><FiCopy size={14} /></button>
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-gray-400">New Password</p><p className="font-mono font-medium text-primary-600">{resolvedCredentials.password}</p></div>
                <button onClick={() => navigator.clipboard.writeText(resolvedCredentials.password)} className="text-gray-400 hover:text-primary-600"><FiCopy size={14} /></button>
              </div>
            </div>
            <button onClick={() => {
              // Find the request ID to acknowledge — find approved request without acknowledged
              const req = requests.find(r => r.status === 'approved' && r.newPasswordPlain);
              if (req) acknowledgeMutation.mutate(req._id);
              else setResolvedCredentials(null);
            }} className="btn-primary w-full">
              Done — I've shared the credentials
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex space-x-2 mb-6">
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">No requests found</div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <p className="font-semibold text-gray-900">{req.organizer?.name}</p>
                    <span className={`badge text-xs ${statusColors[req.status]}`}>{req.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{req.organizer?.contactEmail} · {req.organizer?.category}</p>
                  <p className="text-sm text-gray-700 mt-2"><strong>Reason:</strong> {req.reason}</p>
                  {req.adminComment && (
                    <p className="text-sm text-gray-500 mt-1"><strong>Admin comment:</strong> {req.adminComment}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(req.createdAt).toLocaleDateString()}</p>
                  {req.resolvedAt && <p className="text-xs text-gray-400">Resolved: {new Date(req.resolvedAt).toLocaleDateString()}</p>}
                </div>

                {req.status === 'pending' && (
                  <div className="flex flex-col space-y-2 ml-4">
                    {actionRequestId === req._id ? (
                      <form onSubmit={handleSubmit(data => approveMutation.mutate({ id: req._id, adminComment: data.comment }))} className="space-y-2 w-64">
                        <input {...register('comment')} className="input-field text-sm" placeholder="Admin comment (optional)" />
                        <div className="flex space-x-2">
                          <button type="submit" disabled={approveMutation.isPending} className="flex-1 bg-green-500 text-white py-1.5 rounded-lg text-sm hover:bg-green-600">
                            Approve
                          </button>
                          <button type="button" onClick={() => rejectMutation.mutate({ id: req._id, adminComment: '' })}
                            disabled={rejectMutation.isPending}
                            className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-sm hover:bg-red-600"
                          >
                            Reject
                          </button>
                          <button type="button" onClick={() => setActionRequestId(null)} className="px-2 text-gray-400">✕</button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setActionRequestId(req._id)} className="btn-primary text-sm py-2 px-4">
                        Review
                      </button>
                    )}
                  </div>
                )}

                {req.status === 'approved' && req.newPasswordPlain && (
                  <div className="ml-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">New password (pending share)</p>
                    <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                      <p className="font-mono text-primary-600">{req.newPasswordPlain}</p>
                      <button onClick={() => navigator.clipboard.writeText(req.newPasswordPlain)}><FiCopy size={12} className="text-gray-400" /></button>
                    </div>
                    <button onClick={() => acknowledgeMutation.mutate(req._id)} className="text-xs text-gray-400 mt-2 hover:text-gray-600">
                      Mark as shared
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
