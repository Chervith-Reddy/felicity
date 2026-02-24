import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiSearch } from 'react-icons/fi';
import api from '../../utils/api';

export default function ManageUsers() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search, typeFilter],
    queryFn: () => api.get(`/admin/users?search=${search}&type=${typeFilter}`).then(r => r.data)
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/users/${id}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('User status updated');
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-500">View and manage participant accounts</p>
      </div>

      <div className="card mb-4 flex space-x-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search by name or email..."
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="input-field w-40"
        >
          <option value="">All Types</option>
          <option value="IIIT">IIIT</option>
          <option value="Non-IIIT">Non-IIIT</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Email', 'Type', 'College/Org', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">No users found</td></tr>
            ) : (
              users.map(user => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.type === 'IIIT' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                      {user.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.collegeOrOrg || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => statusMutation.mutate({ id: user._id, isActive: !user.isActive })}
                      className={`text-xs font-medium ${user.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {user.isActive ? 'Disable' : 'Enable'}
                    </button>
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
