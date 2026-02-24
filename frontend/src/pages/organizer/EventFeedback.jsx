import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiStar } from 'react-icons/fi';
import api from '../../utils/api';

function StarRating({ rating }) {
  return (
    <div className="flex items-center space-x-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <FiStar key={s} size={14} className={s <= rating ? 'text-yellow-400 fill-current' : 'text-gray-200'} />
      ))}
    </div>
  );
}

export default function EventFeedback() {
  const { id: eventId } = useParams();
  const [ratingFilter, setRatingFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['event-feedback', eventId, ratingFilter],
    queryFn: () => api.get(`/feedback/${eventId}?ratingFilter=${ratingFilter}`).then(r => r.data)
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Event Feedback</h1>
        <p className="text-gray-500">Anonymous feedback from participants</p>
      </div>

      {/* Summary */}
      {data && (
        <div className="card mb-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-4xl font-bold text-gray-900">{data.avgRating}</span>
                <FiStar size={28} className="text-yellow-400 fill-current" />
              </div>
              <p className="text-gray-500 text-sm mt-1">Average Rating</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary-600">{data.total}</p>
              <p className="text-gray-500 text-sm mt-1">Total Responses</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Distribution</p>
              {data.distribution?.map(d => (
                <div key={d.rating} className="flex items-center space-x-2 mb-1">
                  <span className="text-xs text-gray-500 w-4">{d.rating}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: data.total > 0 ? `${(d.count / data.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-4">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-sm text-gray-600">Filter by rating:</span>
        <div className="flex space-x-2">
          <button onClick={() => setRatingFilter('')}
            className={`px-3 py-1 rounded-lg text-sm ${!ratingFilter ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map(r => (
            <button key={r} onClick={() => setRatingFilter(r === parseInt(ratingFilter) ? '' : r)}
              className={`px-3 py-1 rounded-lg text-sm ${parseInt(ratingFilter) === r ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {r}★
            </button>
          ))}
        </div>
      </div>

      {/* Feedback list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : data?.feedbacks?.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <FiStar size={48} className="mx-auto mb-3 opacity-20" />
          <p>No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.feedbacks?.map((fb, i) => (
            <div key={fb._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <StarRating rating={fb.rating} />
                  {fb.comment && <p className="text-gray-700 mt-2 text-sm leading-relaxed">{fb.comment}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(fb.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-gray-300 text-sm">#{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
