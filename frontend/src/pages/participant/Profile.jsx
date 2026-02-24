import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiLock, FiUser, FiStar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const INTERESTS = [
  'Technology', 'Music', 'Sports', 'Arts & Culture', 'Science',
  'Business', 'Gaming', 'Photography', 'Literature', 'Dance',
  'Coding', 'Design', 'Entrepreneurship', 'Social Impact'
];

export default function ParticipantProfile() {
  const { user, setUser } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState(user?.areasOfInterest || []);
  const [activeTab, setActiveTab] = useState('profile');

  const { register: regProfile, handleSubmit: submitProfile } = useForm({ defaultValues: user });
  const { register: regPwd, handleSubmit: submitPwd, reset: resetPwd, formState: { errors: pwdErrors } } = useForm();

  const profileMutation = useMutation({
    mutationFn: (data) => api.put('/users/profile', { ...data, areasOfInterest: selectedInterests }),
    onSuccess: (res) => { setUser(prev => ({ ...prev, ...res.data })); toast.success('Profile updated!'); },
    onError: () => toast.error('Failed to update profile')
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => api.post('/users/change-password', data),
    onSuccess: () => { toast.success('Password changed successfully!'); resetPwd(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password')
  });

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const tabs = [
    { id: 'profile', icon: FiUser, label: 'Personal Info' },
    { id: 'interests', icon: FiStar, label: 'Interests' },
    { id: 'password', icon: FiLock, label: 'Change Password' },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={submitProfile(data => profileMutation.mutate(data))} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input {...regProfile('firstName')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input {...regProfile('lastName')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={user?.email} disabled className="input-field bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input {...regProfile('contactNumber')} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">College/Organization</label>
              <input {...regProfile('collegeOrOrg')} className="input-field" />
            </div>
          </div>
          <span className={`badge ${user?.type === 'IIIT' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
            {user?.type} Participant
          </span>
          <button type="submit" disabled={profileMutation.isPending} className="btn-primary px-8 py-2.5 block">
            {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {activeTab === 'interests' && (
        <div className="card space-y-4">
          <p className="text-gray-600 text-sm">Select topics to personalize event recommendations</p>
          <div className="grid grid-cols-3 gap-2">
            {INTERESTS.map(interest => (
              <button type="button" key={interest} onClick={() => toggleInterest(interest)}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                  selectedInterests.includes(interest)
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
          <button
            onClick={() => profileMutation.mutate({ firstName: user?.firstName, lastName: user?.lastName })}
            disabled={profileMutation.isPending}
            className="btn-primary px-8 py-2.5"
          >
            Save Interests
          </button>
        </div>
      )}

      {activeTab === 'password' && (
        <form onSubmit={submitPwd(data => passwordMutation.mutate(data))} className="card space-y-4">
          <p className="text-gray-600 text-sm">Enter your current password to update it.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input {...regPwd('currentPassword', { required: 'Required' })} type="password" className="input-field" placeholder="••••••••" />
            {pwdErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input {...regPwd('newPassword', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })} type="password" className="input-field" placeholder="••••••••" />
            {pwdErrors.newPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input {...regPwd('confirmPassword', { required: 'Required', validate: (val, form) => val === form.newPassword || 'Passwords do not match' })} type="password" className="input-field" placeholder="••••••••" />
            {pwdErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={passwordMutation.isPending} className="btn-primary px-8 py-2.5">
            {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}
