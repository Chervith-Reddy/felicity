import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiPlus, FiCopy } from 'react-icons/fi';
import api from '../../utils/api';

export default function ManageOrganizers() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const queryClient = useQueryClient();

  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ['admin-organizers'],
    queryFn: () => api.get('/admin/organizers').then(r => r.data)
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/admin/organizers', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-organizers']);
      setNewCredentials(res.data.credentials);
      setShowCreateModal(false);
      reset();
      toast.success('Organizer created!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create organizer')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/organizers/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-organizers']);
      toast.success('Status updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/organizers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-organizers']);
      toast.success('Organizer deleted');
    }
  });

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    disabled: 'bg-red-100 text-red-600',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Organizers</h1>
          <p className="text-gray-500">Create and manage club/organizer accounts</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center space-x-2 py-2.5">
          <FiPlus size={18} />
          <span>Add Organizer</span>
        </button>
      </div>

      {/* Credentials Modal */}
      {newCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🎉 Organizer Created!</h2>
            <p className="text-gray-500 text-sm mb-4">Share these credentials with the organizer. The password cannot be retrieved again.</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-mono font-medium">{newCredentials.email}</p>
                </div>
                <button onClick={() => navigator.clipboard.writeText(newCredentials.email)} className="text-gray-400 hover:text-primary-600">
                  <FiCopy size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Password</p>
                  <p className="font-mono font-medium text-primary-600">{newCredentials.password}</p>
                </div>
                <button onClick={() => navigator.clipboard.writeText(newCredentials.password)} className="text-gray-400 hover:text-primary-600">
                  <FiCopy size={14} />
                </button>
              </div>
            </div>
            <button onClick={() => setNewCredentials(null)} className="btn-primary w-full">
              Done (I've saved the credentials)
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create Organizer Account</h2>
            <form onSubmit={handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Club/Organization Name *</label>
                <input {...register('name', { required: true })} className="input-field" placeholder="Tech Club" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <input {...register('category', { required: true })} className="input-field" placeholder="Technical / Cultural / Sports" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input {...register('contactEmail', { required: true })} type="email" className="input-field" placeholder="club@iiit.ac.in" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input {...register('contactNumber')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea {...register('description')} className="input-field" rows={3} />
              </div>
              <div className="flex space-x-3">
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 py-2.5">
                  {createMutation.isPending ? 'Creating...' : 'Create (Auto-generate Credentials)'}
                </button>
                <button type="button" onClick={() => { setShowCreateModal(false); reset(); }} className="btn-secondary px-4">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organizers Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Category', 'Email', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading...</td></tr>
            ) : organizers.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">No organizers yet</td></tr>
            ) : (
              organizers.map(org => (
                <tr key={org._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                  <td className="px-4 py-3 text-gray-500">{org.category}</td>
                  <td className="px-4 py-3 text-gray-600">{org.contactEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColors[org.status]}`}>{org.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(org.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {org.status === 'active' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: org._id, status: 'disabled' })}
                          className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                        >
                          Disable
                        </button>
                      )}
                      {org.status === 'disabled' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: org._id, status: 'active' })}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Enable
                        </button>
                      )}
                      {org.status !== 'archived' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: org._id, status: 'archived' })}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('Delete this organizer?')) deleteMutation.mutate(org._id); }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
