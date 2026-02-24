import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const INTERESTS = [
  'Technology', 'Music', 'Sports', 'Arts & Culture', 'Science',
  'Business', 'Gaming', 'Photography', 'Literature', 'Dance',
  'Coding', 'Design', 'Entrepreneurship', 'Social Impact'
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const { data: organizers = [] } = useQuery({
    queryKey: ['organizers'],
    queryFn: () => api.get('/users/organizers').then(r => r.data)
  });

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleClub = (id) => {
    setFollowedClubs(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await api.post('/users/onboarding', {
        areasOfInterest: selectedInterests,
        followedClubs
      });
      setUser(res.data);
      toast.success('Profile set up complete! Welcome to Felicity 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        {/* Progress */}
        <div className="flex justify-between mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`flex-1 h-2 rounded-full mx-1 ${s <= step ? 'gradient-bg' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What are you interested in?</h2>
            <p className="text-gray-500 mb-6">Select topics to get personalized event recommendations</p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border-2 ${
                    selectedInterests.includes(interest)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full py-3">
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Follow your favorite clubs</h2>
            <p className="text-gray-500 mb-6">Stay updated with events from clubs you follow</p>
            <div className="space-y-3 mb-8 max-h-96 overflow-y-auto">
              {organizers.length === 0 && (
                <p className="text-gray-400 text-center py-8">No clubs available yet</p>
              )}
              {organizers.map(org => (
                <div
                  key={org._id}
                  onClick={() => toggleClub(org._id)}
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    followedClubs.includes(org._id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center text-white font-bold mr-4">
                    {org.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{org.name}</p>
                    <p className="text-sm text-gray-500">{org.category}</p>
                  </div>
                  {followedClubs.includes(org._id) && (
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">← Back</button>
              <button onClick={handleFinish} disabled={loading} className="btn-primary flex-1 py-3">
                {loading ? 'Saving...' : 'Get Started 🎉'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
