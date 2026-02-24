import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../../utils/api';

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [closingRegistrations, setClosingRegistrations] = useState(false);
  const [merchandiseItems, setMerchandiseItems] = useState([]);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data)
  });

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (event) {
      reset({
        ...event,
        startDate: event.startDate?.slice(0, 16),
        endDate: event.endDate?.slice(0, 16),
        registrationDeadline: event.registrationDeadline?.slice(0, 16),
        tags: event.tags?.join(', ')
      });
      if (event.eventType === 'merchandise' && event.merchandiseItems?.length > 0) {
        setMerchandiseItems(event.merchandiseItems.map(v => ({
          _id: v._id,
          variantName: v.variantName || '',
          size: v.size || '',
          color: v.color || '',
          price: v.price || 0,
          stock: v.stock || 0
        })));
      }
    }
  }, [event, reset]);

  const mutation = useMutation({
    mutationFn: (data) => api.put(`/events/${id}`, {
      ...data,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
      closeRegistrations: closingRegistrations ? true : undefined,
      merchandiseItems: event?.eventType === 'merchandise' ? merchandiseItems : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizer-events']);
      toast.success('Event updated!');
      navigate('/organizer');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed')
  });

  if (isLoading) return <div className="animate-pulse h-96 bg-gray-200 rounded-xl" />;

  const isPublished = event?.status === 'published';
  const isDraft = event?.status === 'draft';
  const isLocked = event?.status === 'ongoing' || event?.status === 'completed';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Event</h1>
      {isPublished && (
        <p className="text-yellow-600 text-sm mb-6 bg-yellow-50 p-3 rounded-lg">
          ⚠️ Published event — you can update description, venue, image, tags, extend the deadline, increase the registration limit, or close registrations.
        </p>
      )}
      {isLocked && <p className="text-red-600 text-sm mb-6 bg-red-50 p-3 rounded-lg">This event cannot be edited in its current state.</p>}

      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
          <input {...register('name')} disabled={isPublished || isLocked} className="input-field disabled:bg-gray-50 disabled:text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea {...register('description')} disabled={isLocked} className="input-field disabled:bg-gray-50" rows={4} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
          <input {...register('venue')} disabled={isLocked} className="input-field disabled:bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <input {...register('imageUrl')} disabled={isLocked} className="input-field disabled:bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input {...register('tags')} disabled={isLocked} className="input-field disabled:bg-gray-50" />
        </div>

        {/* Published event: allow extending deadline + increasing limit */}
        {isPublished && (
          <>
            <hr className="my-2" />
            <h3 className="text-sm font-semibold text-gray-800">📅 Extend Registration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Deadline <span className="text-xs text-gray-400">(extend forward only)</span>
                </label>
                <input {...register('registrationDeadline')} type="datetime-local" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Limit <span className="text-xs text-gray-400">(increase only)</span>
                </label>
                <input {...register('registrationLimit')} type="number" className="input-field" />
                <p className="text-xs text-gray-400 mt-1">Current: {event?.registrationCount} / {event?.registrationLimit} registered</p>
              </div>
            </div>
            <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={closingRegistrations}
                  onChange={(e) => setClosingRegistrations(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm text-red-700 font-medium flex items-center space-x-1">
                  <FiAlertTriangle size={14} />
                  <span>Close registrations immediately</span>
                </span>
              </label>
              <p className="text-xs text-red-500 mt-1 ml-6">This sets the deadline to now — no more registrations will be accepted.</p>
            </div>
          </>
        )}

        {/* Draft: full editing */}
        {isDraft && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input {...register('startDate')} type="datetime-local" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input {...register('endDate')} type="datetime-local" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reg. Deadline</label>
                <input {...register('registrationDeadline')} type="datetime-local" className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility</label>
                <select {...register('eligibility')} className="input-field">
                  <option value="all">Open to All</option>
                  <option value="iiit-only">IIIT Only</option>
                  <option value="non-iiit-only">Non-IIIT Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Limit</label>
                <input {...register('registrationLimit')} type="number" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Fee (₹)</label>
                <input {...register('registrationFee')} type="number" className="input-field" />
              </div>
            </div>

            {/* Merchandise Variants Editor (draft only) */}
            {event?.eventType === 'merchandise' && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">🛍️ Merchandise Variants</h3>
                  <button type="button" onClick={() => setMerchandiseItems(prev => [...prev, { variantName: '', size: '', color: '', price: 0, stock: 0 }])} className="btn-secondary text-xs py-1 px-3 flex items-center space-x-1">
                    <FiPlus size={12} /><span>Add Variant</span>
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Limit per Person</label>
                  <input {...register('purchaseLimit')} type="number" className="input-field w-28 mb-3" defaultValue={1} />
                </div>
                <div className="space-y-2">
                  {merchandiseItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 p-3 border border-gray-200 rounded-xl items-center">
                      <input value={item.variantName} onChange={e => setMerchandiseItems(prev => prev.map((it, i) => i === idx ? { ...it, variantName: e.target.value } : it))} className="input-field text-sm" placeholder="Item Name" />
                      <input value={item.size} onChange={e => setMerchandiseItems(prev => prev.map((it, i) => i === idx ? { ...it, size: e.target.value } : it))} className="input-field text-sm" placeholder="Size" />
                      <input value={item.color} onChange={e => setMerchandiseItems(prev => prev.map((it, i) => i === idx ? { ...it, color: e.target.value } : it))} className="input-field text-sm" placeholder="Color" />
                      <input type="number" value={item.price} onChange={e => setMerchandiseItems(prev => prev.map((it, i) => i === idx ? { ...it, price: parseFloat(e.target.value) } : it))} className="input-field text-sm" placeholder="Price (₹)" />
                      <input type="number" value={item.stock} onChange={e => setMerchandiseItems(prev => prev.map((it, i) => i === idx ? { ...it, stock: parseInt(e.target.value) } : it))} className="input-field text-sm" placeholder="Stock" />
                      <button type="button" onClick={() => setMerchandiseItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><FiTrash2 /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="flex space-x-3 pt-2">
          <button type="submit" disabled={isLocked || mutation.isPending} className="btn-primary px-6 py-2.5">
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate('/organizer')} className="btn-secondary px-6 py-2.5">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
