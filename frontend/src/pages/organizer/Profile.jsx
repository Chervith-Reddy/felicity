import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiSettings, FiLock, FiKey } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function OrganizerProfile() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const { register: regProfile, handleSubmit: submitProfile } = useForm({ defaultValues: user });
  const { register: regPwd, handleSubmit: submitPwd, reset: resetPwd, formState: { errors: pwdErrors } } = useForm();
  const { register: regReset, handleSubmit: submitReset, reset: resetReset } = useForm();

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-reset-requests'],
    queryFn: () => api.get('/password-reset-requests/my').then(r => r.data),
    enabled: activeTab === 'password-reset'
  });

  const profileMutation = useMutation({
    mutationFn: (data) => api.put('/users/profile', data),
    onSuccess: (res) => { setUser(prev => ({ ...prev, ...res.data })); toast.success('Profile updated!'); },
    onError: () => toast.error('Update failed')
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => api.post('/users/change-password', data),
    onSuccess: () => { toast.success('Password changed!'); resetPwd(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const resetRequestMutation = useMutation({
    mutationFn: (data) => api.post('/password-reset-requests', data),
    onSuccess: () => { toast.success('Reset request submitted to Admin'); resetReset(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const tabs = [
    { id: 'profile', icon: FiSettings, label: 'Club Info' },
    { id: 'password', icon: FiLock, label: 'Change Password' },
    { id: 'password-reset', icon: FiKey, label: 'Reset Request' },
  ];

  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600' };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Organizer Profile</h1>

      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
              }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={submitProfile(data => profileMutation.mutate(data))} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Club/Organization Name</label>
            <input {...regProfile('name')} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select {...regProfile('category')} className="input-field">
              <option value="">Select category...</option>
              <option value="Technical">Technical</option>
              <option value="Cultural">Cultural</option>
              <option value="Sports">Sports</option>
              <option value="Literary">Literary</option>
              <option value="Social">Social</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login Email (non-editable)</label>
            <input value={user?.email || user?.contactEmail} disabled className="input-field bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input {...regProfile('contactEmail')} type="email" className="input-field" placeholder="contact@club.org" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <input {...regProfile('contactNumber')} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...regProfile('description')} className="input-field" rows={4} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discord Webhook URL</label>
            <input {...regProfile('discordWebhook')} className="input-field" placeholder="https://discord.com/api/webhooks/..." />
            <p className="text-xs text-gray-400 mt-1">New published events will be auto-posted to Discord</p>
          </div>
          <button type="submit" disabled={profileMutation.isPending} className="btn-primary px-8 py-2.5">
            {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {activeTab === 'password' && (
        <form onSubmit={submitPwd(data => passwordMutation.mutate(data))} className="card space-y-4">
          <p className="text-sm text-gray-600">Enter your current password to update it.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input {...regPwd('currentPassword', { required: 'Required' })} type="password" className="input-field" placeholder="••••••••" />
            {pwdErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input {...regPwd('newPassword', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} type="password" className="input-field" placeholder="••••••••" />
            {pwdErrors.newPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input {...regPwd('confirmPassword', { required: 'Required', validate: (v, f) => v === f.newPassword || 'Passwords do not match' })} type="password" className="input-field" placeholder="••••••••" />
            {pwdErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={passwordMutation.isPending} className="btn-primary px-8 py-2.5">
            {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}

      {activeTab === 'password-reset' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Request Password Reset from Admin</h3>
            <p className="text-sm text-gray-500 mb-4">If you cannot log in, submit a request here. Admin will generate a new password.</p>
            <form onSubmit={submitReset(data => resetRequestMutation.mutate(data))} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea {...regReset('reason', { required: true })} className="input-field" rows={3} placeholder="Explain why you need a password reset..." />
              </div>
              <button type="submit" disabled={resetRequestMutation.isPending} className="btn-primary py-2.5 px-6">
                {resetRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>

          {myRequests.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">My Requests</h3>
              <div className="space-y-3">
                {myRequests.map(req => (
                  <div key={req._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`badge text-xs ${statusColors[req.status]}`}>{req.status}</span>
                      <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{req.reason}</p>
                    {req.adminComment && <p className="text-xs text-gray-500 mt-1">Admin: {req.adminComment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
