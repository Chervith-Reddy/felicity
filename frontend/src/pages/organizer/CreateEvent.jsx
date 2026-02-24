import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiMove } from 'react-icons/fi';
import api from '../../utils/api';

const FIELD_TYPES = ['text', 'textarea', 'email', 'number', 'date', 'dropdown', 'checkbox', 'radio'];

export default function CreateEvent() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { eventType: 'normal', eligibility: 'all' }
  });
  const navigate = useNavigate();
  const eventType = watch('eventType');

  // Form builder state
  const [formFields, setFormFields] = useState([]);
  const [merchandiseItems, setMerchandiseItems] = useState([{ variantName: '', size: '', color: '', price: 0, stock: 0 }]);

  const addField = () => {
    setFormFields(prev => [...prev, {
      id: Date.now(),
      label: '',
      fieldType: 'text',
      options: [],
      required: false,
      placeholder: ''
    }]);
  };

  const updateField = (id, key, value) => {
    setFormFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeField = (id) => setFormFields(prev => prev.filter(f => f.id !== id));

  const addMerchandiseItem = () => {
    setMerchandiseItems(prev => [...prev, { variantName: '', size: '', color: '', price: 0, stock: 0 }]);
  };

  const updateMerchandise = (idx, key, value) => {
    setMerchandiseItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  };

  const mutation = useMutation({
    mutationFn: (data) => api.post('/events', data),
    onSuccess: (res) => {
      toast.success('Event created successfully!');
      navigate('/organizer');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create event')
  });

  const onSubmit = (data) => {
    const payload = {
      ...data,
      registrationLimit: parseInt(data.registrationLimit),
      customForm: eventType === 'normal' ? formFields.map(({ id, ...f }) => f) : [],
      merchandiseItems: eventType === 'merchandise' ? merchandiseItems : [],
      purchaseLimit: parseInt(data.purchaseLimit) || 1,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()) : []
    };
    mutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Event</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
            <input {...register('name', { required: 'Name required' })} className="input-field" placeholder="Event name" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea {...register('description', { required: true })} className="input-field" rows={4} placeholder="Describe your event..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
              <select {...register('eventType')} className="input-field">
                <option value="normal">Normal Event</option>
                <option value="merchandise">Merchandise Event</option>
                <option value="hackathon">Hackathon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility</label>
              <select {...register('eligibility')} className="input-field">
                <option value="all">Open to All</option>
                <option value="iiit-only">IIIT Only</option>
                <option value="non-iiit-only">Non-IIIT Only</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
              <input {...register('venue')} className="input-field" placeholder="Auditorium / Online" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Limit *</label>
              <input {...register('registrationLimit', { required: true })} type="number" className="input-field" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Fee (₹)</label>
              <input {...register('registrationFee')} type="number" className="input-field" placeholder="0" defaultValue={0} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input {...register('startDate', { required: true })} type="datetime-local" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input {...register('endDate', { required: true })} type="datetime-local" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reg. Deadline *</label>
              <input {...register('registrationDeadline', { required: true })} type="datetime-local" className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input {...register('tags')} className="input-field" placeholder="tech, workshop, ai" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input {...register('imageUrl')} className="input-field" placeholder="https://..." />
          </div>
          {eventType === 'hackathon' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Team Size</label>
              <input {...register('teamSize')} type="number" min={2} max={10} defaultValue={4} className="input-field w-32" />
            </div>
          )}
          {eventType === 'merchandise' && (
            <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
              <input {...register('requiresPaymentApproval')} type="checkbox" id="payApproval" className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="payApproval" className="text-sm text-gray-700">Require payment proof (manual approval workflow)</label>
            </div>
          )}
        </div>

        {/* Dynamic Form Builder for Normal Events */}
        {eventType === 'normal' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Registration Form Builder</h2>
              <button type="button" onClick={addField} className="btn-secondary text-sm py-1.5 flex items-center space-x-1">
                <FiPlus size={14} />
                <span>Add Field</span>
              </button>
            </div>
            {formFields.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm">No custom fields. Add fields to collect registration info.</p>
                <p className="text-xs mt-1 text-gray-300">Optional — participants can still register without a form</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formFields.map((field, idx) => (
                  <div key={field.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400 font-medium">Field {idx + 1}</span>
                      <button type="button" onClick={() => removeField(field.id)} className="text-red-400 hover:text-red-600">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Label *</label>
                        <input
                          value={field.label}
                          onChange={e => updateField(field.id, 'label', e.target.value)}
                          className="input-field text-sm"
                          placeholder="Field label"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                          value={field.fieldType}
                          onChange={e => updateField(field.id, 'fieldType', e.target.value)}
                          className="input-field text-sm"
                        >
                          {FIELD_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Placeholder</label>
                        <input
                          value={field.placeholder}
                          onChange={e => updateField(field.id, 'placeholder', e.target.value)}
                          className="input-field text-sm"
                          placeholder="Hint text"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={e => updateField(field.id, 'required', e.target.checked)}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-xs text-gray-600">Required field</span>
                        </label>
                      </div>
                    </div>
                    {['dropdown', 'checkbox', 'radio'].includes(field.fieldType) && (
                      <div className="mt-3">
                        <label className="block text-xs text-gray-500 mb-1">Options (one per line)</label>
                        <textarea
                          rows={3}
                          className="input-field text-sm"
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          onChange={e => updateField(field.id, 'options', e.target.value.split('\n').filter(Boolean))}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Merchandise Items */}
        {eventType === 'merchandise' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Merchandise Items</h2>
              <button type="button" onClick={addMerchandiseItem} className="btn-secondary text-sm py-1.5 flex items-center space-x-1">
                <FiPlus size={14} />
                <span>Add Variant</span>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Limit per Person</label>
              <input {...register('purchaseLimit')} type="number" className="input-field w-32 mb-4" defaultValue={1} />
            </div>
            <div className="space-y-3">
              {merchandiseItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-3 p-3 border border-gray-200 rounded-xl items-center">
                  <input
                    value={item.variantName}
                    onChange={e => updateMerchandise(idx, 'variantName', e.target.value)}
                    className="input-field text-sm"
                    placeholder="Item Name"
                  />
                  <input
                    value={item.size}
                    onChange={e => updateMerchandise(idx, 'size', e.target.value)}
                    className="input-field text-sm"
                    placeholder="Size (S/M/L)"
                  />
                  <input
                    value={item.color}
                    onChange={e => updateMerchandise(idx, 'color', e.target.value)}
                    className="input-field text-sm"
                    placeholder="Color"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => updateMerchandise(idx, 'price', parseFloat(e.target.value))}
                    className="input-field text-sm"
                    placeholder="Price (₹)"
                  />
                  <input
                    type="number"
                    value={item.stock}
                    onChange={e => updateMerchandise(idx, 'stock', parseInt(e.target.value))}
                    className="input-field text-sm"
                    placeholder="Stock qty"
                  />
                  <button
                    type="button"
                    onClick={() => setMerchandiseItems(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button type="submit" disabled={mutation.isPending} className="btn-primary px-8 py-3">
            {mutation.isPending ? 'Creating...' : 'Create Event (Draft)'}
          </button>
          <button type="button" onClick={() => navigate('/organizer')} className="btn-secondary px-8 py-3">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
