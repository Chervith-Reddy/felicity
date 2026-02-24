import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiCamera, FiUser, FiDownload, FiRefreshCw, FiCheck, FiX } from 'react-icons/fi';
import api from '../../utils/api';
import { io } from 'socket.io-client';

export default function AttendanceScanner() {
  const { id: eventId } = useParams();
  const queryClient = useQueryClient();
  const [scanResult, setScanResult] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [qrInputVal, setQrInputVal] = useState('');
  const { register, handleSubmit, reset } = useForm();
  const socketRef = useRef(null);

  const { data: attendanceData, isLoading, refetch } = useQuery({
    queryKey: ['attendance', eventId],
    queryFn: () => api.get(`/attendance/${eventId}`).then(r => r.data),
    refetchInterval: 10000
  });

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.get(`/events/${eventId}`).then(r => r.data)
  });

  const { data: participants } = useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: () => api.get(`/events/${eventId}/participants`).then(r => r.data)
  });

  // Real-time attendance updates via socket
  useEffect(() => {
    const token = localStorage.getItem('felicity_token');
    const socketUrl = import.meta.env.PROD ? 'https://felicity-nual.onrender.com' : 'http://localhost:5000';
    socketRef.current = io(socketUrl, { auth: { token } });
    socketRef.current.emit('join_attendance', eventId);
    socketRef.current.on('new_checkin', () => { refetch(); });
    socketRef.current.on('checkin_reverted', () => { refetch(); });
    return () => socketRef.current?.disconnect();
  }, [eventId]);

  const scanMutation = useMutation({
    mutationFn: (qrData) => api.post('/attendance/scan', { qrData, eventId }),
    onSuccess: (res) => {
      setScanResult({ success: true, attendee: res.data.attendee });
      toast.success(`✓ ${res.data.attendee.firstName} ${res.data.attendee.lastName} checked in!`);
      queryClient.invalidateQueries(['attendance', eventId]);
      setQrInputVal('');
      setTimeout(() => setScanResult(null), 3000);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Scan failed';
      setScanResult({ success: false, message: msg });
      toast.error(msg);
      setTimeout(() => setScanResult(null), 3000);
    }
  });

  const manualMutation = useMutation({
    mutationFn: (data) => api.post('/attendance/manual', { ...data, eventId }),
    onSuccess: () => {
      toast.success('Manual check-in recorded');
      queryClient.invalidateQueries(['attendance', eventId]);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const revertMutation = useMutation({
    mutationFn: (attendanceId) => api.delete(`/attendance/${eventId}/${attendanceId}`, { data: { reason: 'Reverted by organizer' } }),
    onSuccess: () => { toast.success('Check-in reverted'); queryClient.invalidateQueries(['attendance', eventId]); }
  });

  // Manual QR input simulation (for environments without camera)
  const handleQRInput = (e) => {
    if (e.key === 'Enter' && qrInputVal.trim()) {
      scanMutation.mutate(qrInputVal.trim());
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/attendance/${eventId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${eventId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const checkedPct = attendanceData ? Math.round((attendanceData.checked / (attendanceData.total || 1)) * 100) : 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Scanner</h1>
          <p className="text-gray-500">{event?.name}</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => refetch()} className="btn-secondary flex items-center space-x-2 py-2">
            <FiRefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center space-x-2 py-2">
            <FiDownload size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{attendanceData?.checked ?? '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Checked In</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-400">{attendanceData?.notChecked ?? '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Not Yet</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{checkedPct}%</p>
          <p className="text-sm text-gray-500 mt-1">Attendance Rate</p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${checkedPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Scanner Panel */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">QR Scanner</h3>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setManualMode(false)}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${!manualMode ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                >
                  <FiCamera size={12} className="inline mr-1" />QR Input
                </button>
                <button onClick={() => setManualMode(true)}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${manualMode ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                >
                  <FiUser size={12} className="inline mr-1" />Manual
                </button>
              </div>
            </div>

            {!manualMode ? (
              <div>
                <div className={`w-full h-48 rounded-xl border-2 border-dashed flex items-center justify-center mb-4 transition-colors ${scanResult?.success ? 'border-green-400 bg-green-50' :
                  scanResult?.success === false ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                  {scanResult ? (
                    <div className="text-center">
                      {scanResult.success ? (
                        <>
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FiCheck className="text-green-600" size={24} />
                          </div>
                          <p className="font-semibold text-green-700">{scanResult.attendee?.firstName} {scanResult.attendee?.lastName}</p>
                          <p className="text-green-600 text-sm">Checked In ✓</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FiX className="text-red-500" size={24} />
                          </div>
                          <p className="text-red-600 font-medium">{scanResult.message}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <FiCamera size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Paste/type QR data below and press Enter</p>
                      <p className="text-xs mt-1 text-gray-300">(In production: use device camera via html5-qrcode)</p>
                    </div>
                  )}
                </div>
                <input
                  value={qrInputVal}
                  onChange={e => setQrInputVal(e.target.value)}
                  onKeyDown={handleQRInput}
                  className="input-field text-sm"
                  placeholder='Paste QR JSON data and press Enter...'
                  disabled={scanMutation.isPending}
                />
                <p className="text-xs text-gray-400 mt-1">Press Enter to process scan</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(data => manualMutation.mutate(data))} className="space-y-3">
                <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded-lg">Manual check-in is logged for audit purposes</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Registration ID</label>
                  <select {...register('registrationId', { required: true })} className="input-field text-sm">
                    <option value="">Select participant...</option>
                    {participants?.registrations?.filter(r => !r.checkedIn).map(r => (
                      <option key={r._id} value={r._id}>
                        {r.user?.firstName} {r.user?.lastName} ({r.ticketId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Reason for manual override *</label>
                  <input {...register('reason', { required: true })} className="input-field text-sm" placeholder="e.g., QR code damaged" />
                </div>
                <button type="submit" disabled={manualMutation.isPending} className="btn-primary w-full py-2 text-sm">
                  {manualMutation.isPending ? 'Processing...' : 'Mark as Attended'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Attendance List */}
        <div className="card overflow-hidden p-0">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Checked In ({attendanceData?.checked || 0})</h3>
          </div>
          <div className="overflow-y-auto max-h-96">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : attendanceData?.attendances?.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No check-ins yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {attendanceData?.attendances?.map(a => (
                  <div key={a._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.user?.firstName} {a.user?.lastName}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(a.checkedInAt).toLocaleTimeString()} · {a.method}
                        {a.isManualOverride && <span className="text-yellow-500 ml-1">· manual</span>}
                      </p>
                    </div>
                    <button onClick={() => revertMutation.mutate(a._id)} className="text-xs text-red-400 hover:text-red-600">
                      Revert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
