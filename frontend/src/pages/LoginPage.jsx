import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LoginPage() {
  const [loginType, setLoginType] = useState('participant');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const endpoint = loginType === 'organizer' ? '/auth/organizer/login' : '/auth/login';
      const res = await api.post(endpoint, data);
      login(res.data.token, res.data.user);
      toast.success('Welcome back!');

      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'organizer') navigate('/organizer');
      else if (!res.data.user.onboardingCompleted) navigate('/onboarding');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Felicity</h1>
          <p className="text-gray-500 text-sm mt-1">Event Management Platform</p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {['participant', 'organizer'].map(type => (
            <button
              key={type}
              onClick={() => setLoginType(type)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                loginType === type ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email', { required: 'Email is required' })}
              type="email"
              className="input-field"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              {...register('password', { required: 'Password is required' })}
              type="password"
              className="input-field"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3 text-base"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {loginType === 'participant' && (
          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </Link>
          </p>
        )}

        {loginType === 'organizer' && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Organizer accounts are provisioned by Admin
          </p>
        )}
      </div>
    </div>
  );
}
