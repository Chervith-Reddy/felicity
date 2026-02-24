import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { FiCalendar, FiMapPin, FiUsers, FiClock, FiTag, FiSend, FiStar, FiMessageSquare } from 'react-icons/fi';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formResponses, setFormResponses] = useState({});
  const [merchandiseSelections, setMerchandiseSelections] = useState([]);
  const [paymentProof, setPaymentProof] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [forumMessages, setForumMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data)
  });

  const { data: myRegistrations = [] } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => api.get('/registrations/my').then(r => r.data)
  });

  const isRegistered = myRegistrations.some(r => (r.event?._id || r.event) === id && r.status !== 'cancelled');
  const myReg = myRegistrations.find(r => (r.event?._id || r.event) === id && r.status !== 'cancelled');

  const { data: forumHistory = [] } = useQuery({
    queryKey: ['forum', id],
    queryFn: () => api.get(`/forum/${id}/messages`).then(r => r.data),
    enabled: isRegistered && activeTab === 'forum'
  });

  const { data: feedbackCheck } = useQuery({
    queryKey: ['feedback-check', id],
    queryFn: () => api.get(`/feedback/${id}/check`).then(r => r.data),
    enabled: event?.status === 'completed' && isRegistered
  });

  const { data: myTeams = [] } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => api.get('/teams/my').then(r => r.data),
    enabled: event?.eventType === 'hackathon'
  });

  useEffect(() => {
    if (id) api.post(`/events/${id}/view`).catch(() => { });
  }, [id]);

  useEffect(() => {
    if (forumHistory.length) setForumMessages(forumHistory);
  }, [forumHistory]);

  // Socket for forum
  useEffect(() => {
    if (!isRegistered || activeTab !== 'forum') return;
    const token = localStorage.getItem('felicity_token');
    socketRef.current = io('http://localhost:5000', { auth: { token } });
    socketRef.current.emit('join_forum', id);
    socketRef.current.on('new_message', (msg) => {
      setForumMessages(prev => [...prev, msg]);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    socketRef.current.on('message_deleted', ({ msgId }) => {
      setForumMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true, content: '[Deleted]' } : m));
    });
    return () => { socketRef.current?.emit('leave_forum', id); socketRef.current?.disconnect(); };
  }, [id, activeTab]);

  const myTeamForEvent = myTeams.find(t => (t.event?._id || t.event) === id);



  const registerMutation = useMutation({
    mutationFn: (formData) => api.post('/registrations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: (res) => {
      if (res.data.paymentStatus === 'pending') {
        toast.success('Order submitted! Awaiting payment approval from organizer.');
      } else {
        toast.success('Registered successfully! Check your email 🎫');
        navigate(`/tickets/${res.data.ticketId}`);
      }
      queryClient.invalidateQueries(['my-registrations']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Registration failed')
  });

  const createTeamMutation = useMutation({
    mutationFn: () => api.post('/teams', { eventId: id, teamName, teamSize: parseInt(teamSize) || event?.teamSize || 4 }),
    onSuccess: (res) => { toast.success('Team created!'); queryClient.invalidateQueries(['my-teams']); navigate(`/teams/${res.data._id}`); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const joinTeamMutation = useMutation({
    mutationFn: () => api.post('/teams/join', { inviteCode: joinCode }),
    onSuccess: (res) => { toast.success('Join request sent!'); queryClient.invalidateQueries(['my-teams']); navigate(`/teams/${res.data.team._id}`); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const feedbackMutation = useMutation({
    mutationFn: () => api.post(`/feedback/${id}`, { rating, comment: feedbackComment }),
    onSuccess: () => { toast.success('Feedback submitted anonymously!'); queryClient.invalidateQueries(['feedback-check', id]); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { eventId: id, content: newMessage.trim() });
    setNewMessage('');
  };

  const handleRegister = () => {
    const formData = new FormData();
    formData.append('eventId', id);
    if (event.eventType === 'merchandise') {
      if (merchandiseSelections.length === 0) { toast.error('Please select at least one item'); return; }
      formData.append('merchandisePurchases', JSON.stringify(merchandiseSelections));
      if (event.requiresPaymentApproval) {
        if (!paymentProof) { toast.error('Payment proof is required'); return; }
        formData.append('paymentProof', paymentProof);
      }
    } else if (event.eventType === 'normal') {
      const missing = event.customForm?.filter(f => f.required && !formResponses[f._id]);
      if (missing?.length > 0) { toast.error(`Fill in: ${missing.map(f => f.label).join(', ')}`); return; }
      formData.append('formResponses', JSON.stringify(Object.entries(formResponses).map(([fieldId, value]) => {
        const field = event.customForm.find(f => f._id === fieldId);
        return { fieldLabel: field?.label, value };
      })));
      // Paid normal event: require payment proof
      if (event.registrationFee > 0) {
        if (!paymentProof) { toast.error('Payment proof is required for this paid event'); return; }
        formData.append('paymentProof', paymentProof);
      }
    }
    registerMutation.mutate(formData);
  };

  if (isLoading) return <div className="animate-pulse space-y-6"><div className="h-64 bg-gray-200 rounded-xl" /><div className="h-8 bg-gray-200 rounded w-1/2" /></div>;
  if (!event) return <div className="text-center py-20 text-gray-400">Event not found</div>;

  const deadline = new Date(event.registrationDeadline);
  const isPastDeadline = new Date() > deadline;
  const isFull = event.registrationCount >= event.registrationLimit;
  const canRegister = !isRegistered && !isPastDeadline && !isFull && ['published', 'ongoing'].includes(event.status);
  const isCompleted = event.status === 'completed';

  const tabs = [
    { id: 'details', label: 'Details' },
    ...(isRegistered ? [{ id: 'forum', label: '💬 Forum' }] : []),
    ...(isCompleted && isRegistered && !feedbackCheck?.submitted ? [{ id: 'feedback', label: '⭐ Feedback' }] : []),
    ...(event.eventType === 'hackathon' ? [{ id: 'team', label: '👥 Team' }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.name} className="w-full h-72 object-cover rounded-2xl mb-6" />
      ) : (
        <div className="w-full h-72 gradient-bg rounded-2xl mb-6 flex items-center justify-center">
          <span className="text-white text-7xl font-bold opacity-30">{event.name[0]}</span>
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === t.id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
            >{t.label}</button>
          ))}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                  <Link to={`/clubs/${event.organizer?._id}`} className="text-primary-600 font-medium mt-1 hover:underline inline-block">
                    {event.organizer?.name}
                  </Link>
                </div>
                <span className={`badge ${event.eventType === 'merchandise' ? 'bg-orange-100 text-orange-700' : event.eventType === 'hackathon' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {event.eventType}
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
              {event.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {event.tags.map(tag => <span key={tag} className="badge bg-gray-100 text-gray-600"><FiTag size={10} className="mr-1" />{tag}</span>)}
                </div>
              )}
            </div>

            {/* Registration Form */}
            {canRegister && event.eventType === 'normal' && event.customForm?.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Registration Form</h3>
                <div className="space-y-4">
                  {event.customForm.map(field => (
                    <div key={field._id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.fieldType === 'textarea' ? (
                        <textarea className="input-field" rows={3} placeholder={field.placeholder} onChange={e => setFormResponses(f => ({ ...f, [field._id]: e.target.value }))} />
                      ) : field.fieldType === 'dropdown' ? (
                        <select className="input-field" onChange={e => setFormResponses(f => ({ ...f, [field._id]: e.target.value }))}>
                          <option value="">Select...</option>
                          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.fieldType === 'checkbox' ? (
                        <div className="space-y-2">
                          {field.options?.map(opt => (
                            <label key={opt} className="flex items-center space-x-2 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 text-primary-600 rounded"
                                onChange={e => { const cur = formResponses[field._id] || []; setFormResponses(f => ({ ...f, [field._id]: e.target.checked ? [...cur, opt] : cur.filter(v => v !== opt) })); }} />
                              <span className="text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input type={field.fieldType} className="input-field" placeholder={field.placeholder} onChange={e => setFormResponses(f => ({ ...f, [field._id]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment proof for paid normal events (no custom form) */}
            {canRegister && event.eventType === 'normal' && event.registrationFee > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-2">Payment Proof Required</h3>
                <p className="text-sm text-gray-500 mb-3">This event has a registration fee of <strong>₹{event.registrationFee}</strong>. Please upload your payment proof (screenshot/receipt) to complete registration. Your registration will be confirmed after organizer review.</p>
                <input type="file" accept="image/*,application/pdf" onChange={e => setPaymentProof(e.target.files[0])} className="input-field text-sm" />
              </div>
            )}

            {/* Merchandise */}
            {canRegister && event.eventType === 'merchandise' && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Select Items</h3>
                <div className="space-y-3">
                  {event.merchandiseItems?.map(variant => (
                    <div key={variant._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{variant.variantName || 'Item'}{variant.size ? ` · ${variant.size}` : ''}{variant.color ? ` · ${variant.color}` : ''}</p>
                        <p className="text-sm text-gray-500">₹{variant.price} · {variant.stock} left</p>
                      </div>
                      <input type="number" min="0" max={Math.min(variant.stock, event.purchaseLimit || 10)} defaultValue={0}
                        className="input-field w-20 text-center" disabled={variant.stock === 0}
                        onChange={e => {
                          const qty = parseInt(e.target.value) || 0;
                          setMerchandiseSelections(prev => {
                            const f = prev.filter(s => s.variantId !== variant._id);
                            if (qty > 0) return [...f, { variantId: variant._id, quantity: qty, size: variant.size, color: variant.color }];
                            return f;
                          });
                        }} />
                    </div>
                  ))}
                </div>
                {event.requiresPaymentApproval && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700 font-medium mb-2">Payment Proof Required</p>
                    <input type="file" accept="image/*,application/pdf" onChange={e => setPaymentProof(e.target.files[0])} className="input-field text-sm" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Event Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3"><FiCalendar className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div><p className="text-gray-500">Start Date</p><p className="font-medium">{format(new Date(event.startDate), 'MMM dd, yyyy · h:mm a')}</p></div>
                </div>
                <div className="flex items-start space-x-3"><FiCalendar className="text-orange-400 mt-0.5 flex-shrink-0" />
                  <div><p className="text-gray-500">End Date</p><p className="font-medium">{format(new Date(event.endDate), 'MMM dd, yyyy · h:mm a')}</p></div>
                </div>
                <div className="flex items-start space-x-3"><FiClock className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div><p className="text-gray-500">Reg. Deadline</p><p className="font-medium">{format(deadline, 'MMM dd, yyyy · h:mm a')}</p></div>
                </div>
                {event.venue && (
                  <div className="flex items-start space-x-3"><FiMapPin className="text-green-500 mt-0.5 flex-shrink-0" />
                    <div><p className="text-gray-500">Venue</p><p className="font-medium">{event.venue}</p></div>
                  </div>
                )}
                <div className="flex items-start space-x-3"><FiUsers className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Capacity</p>
                    <p className="font-medium">{event.registrationCount}/{event.registrationLimit}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                      <div className="gradient-bg h-1.5 rounded-full" style={{ width: `${Math.min(100, (event.registrationCount / event.registrationLimit) * 100)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3"><FiTag className="text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Eligibility</p>
                    <p className="font-medium capitalize">{event.eligibility === 'all' ? 'Open to All' : event.eligibility === 'iiit-only' ? 'IIIT Only' : 'Non-IIIT Only'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3"><span className="text-green-600 font-bold mt-0.5 flex-shrink-0 text-base">₹</span>
                  <div>
                    <p className="text-gray-500">Registration Fee</p>
                    <p className="font-medium">{event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</p>
                  </div>
                </div>
                {event.eventType === 'hackathon' && (
                  <div className="flex items-start space-x-3"><FiUsers className="text-purple-500 mt-0.5 flex-shrink-0" />
                    <div><p className="text-gray-500">Team Size</p><p className="font-medium">Up to {event.teamSize} members</p></div>
                  </div>
                )}
              </div>
            </div>
            <div className="card">
              {isRegistered ? (
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <p className="font-semibold text-green-700">You're registered!</p>
                  {myReg?.paymentStatus === 'pending' && <p className="text-xs text-yellow-600 mt-1">Awaiting payment approval</p>}
                  {myReg?.ticketId && <Link to={`/tickets/${myReg.ticketId}`} className="text-primary-500 text-sm mt-1 block hover:underline">View Ticket</Link>}
                </div>
              ) : isPastDeadline ? (
                <div className="text-center"><p className="text-gray-500 font-medium">Registration Closed</p></div>
              ) : isFull ? (
                <div className="text-center"><p className="text-red-500 font-medium">Event Full</p></div>
              ) : event.eventType === 'hackathon' ? (
                <div className="text-center text-sm text-gray-500">Register via Team tab</div>
              ) : (
                <button onClick={handleRegister} disabled={registerMutation.isPending} className="btn-primary w-full py-3">
                  {registerMutation.isPending ? 'Registering...' : 'Register Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forum */}
      {activeTab === 'forum' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Discussion</h2>
          <div className="h-96 overflow-y-auto border border-gray-100 rounded-xl p-4 mb-4 space-y-3">
            {forumMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400"><p>No messages yet. Start the conversation!</p></div>
            ) : (
              forumMessages.map((msg, i) => (
                <div key={msg._id || i} className={`flex ${msg.sender === user?._id || msg.sender?._id === user?._id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.isAnnouncement ? 'bg-primary-100 border border-primary-200 text-primary-800 max-w-sm w-full text-center' :
                    msg.isPinned ? 'bg-yellow-50 border border-yellow-200 text-gray-800 max-w-sm w-full' :
                      msg.sender === user?._id || msg.sender?._id === user?._id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {msg.isAnnouncement && <p className="text-xs font-bold text-primary-600 mb-1">📢 ANNOUNCEMENT</p>}
                    {msg.isPinned && <p className="text-xs font-bold text-yellow-600 mb-1">📌 Pinned</p>}
                    <p className="text-xs opacity-70 mb-0.5">{msg.senderName}</p>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex space-x-2">
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
              className="input-field flex-1" placeholder="Type a message..." />
            <button onClick={sendMessage} disabled={!newMessage.trim()} className="btn-primary px-4">
              <FiSend size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {activeTab === 'feedback' && (
        <div className="card max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Submit Feedback</h2>
          <p className="text-sm text-gray-500 mb-6">Your feedback is completely anonymous. Organizers cannot see your identity.</p>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Rating *</p>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${s <= rating ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                  <FiStar size={20} className={s <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'} />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
            <textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)}
              className="input-field" rows={4} placeholder="Share your experience..." maxLength={1000} />
          </div>
          <button onClick={() => feedbackMutation.mutate()} disabled={!rating || feedbackMutation.isPending} className="btn-primary py-2.5 px-6">
            {feedbackMutation.isPending ? 'Submitting...' : 'Submit Anonymously'}
          </button>
        </div>
      )}

      {/* Team */}
      {activeTab === 'team' && (
        <div className="max-w-lg space-y-4">
          {myTeamForEvent ? (
            <div className="card text-center">
              <p className="font-semibold text-gray-900 mb-2">You're in team: <span className="text-primary-600">{myTeamForEvent.name}</span></p>
              <Link to={`/teams/${myTeamForEvent._id}`} className="btn-primary inline-block py-2 px-6">Go to Team Dashboard</Link>
            </div>
          ) : (
            <>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-3">Create a Team</h3>
                <div className="flex space-x-3 mb-3">
                  <input value={teamName} onChange={e => setTeamName(e.target.value)} className="input-field flex-1" placeholder="Team name" />
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Size:</label>
                    <input type="number" min={2} max={event?.teamSize || 4} value={teamSize} onChange={e => setTeamSize(e.target.value)}
                      className="input-field w-20 text-center" placeholder={String(event?.teamSize || 4)} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3">Choose your team size (2 to {event?.teamSize || 4} members, including you)</p>
                <button onClick={() => createTeamMutation.mutate()} disabled={!teamName.trim() || createTeamMutation.isPending} className="btn-primary px-6 py-2">
                  Create Team
                </button>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-3">Join a Team</h3>
                <div className="flex space-x-3">
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="input-field flex-1 font-mono" placeholder="INVITE CODE" />
                  <button onClick={() => joinTeamMutation.mutate()} disabled={!joinCode.trim() || joinTeamMutation.isPending} className="btn-primary px-4">
                    Join
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
