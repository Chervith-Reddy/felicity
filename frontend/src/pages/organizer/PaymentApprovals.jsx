import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiImage } from 'react-icons/fi';
import api from '../../utils/api';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  not_required: 'bg-gray-100 text-gray-500',
};

export default function PaymentApprovals() {
  const { id: eventId } = useParams();
  const queryClient = useQueryClient();

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['payment-approvals', eventId],
    queryFn: () => api.get(`/registrations/event/${eventId}/pending-payments`).then(r => r.data)
  });

  const reviewMutation = useMutation({
    mutationFn: ({ regId, action }) => api.patch(`/registrations/${regId}/payment-review`, { action }),
    onSuccess: (_, vars) => {
      toast.success(`Payment ${vars.action}d!`);
      queryClient.invalidateQueries(['payment-approvals', eventId]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed')
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Approvals</h1>
        <p className="text-gray-500">Review uploaded payment proofs for merchandise orders</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : registrations.length === 0 ? (
        <div className="card text-center py-20">
          <FiImage size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400">No payment approval requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map(reg => (
            <div key={reg._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <p className="font-semibold text-gray-900">{reg.user?.firstName} {reg.user?.lastName}</p>
                    <span className={`badge text-xs ${statusColors[reg.paymentStatus]}`}>{reg.paymentStatus}</span>
                  </div>
                  <p className="text-sm text-gray-500">{reg.user?.email}</p>
                  <p className="text-sm text-gray-500 mt-1">Ticket: <span className="font-mono text-primary-600">{reg.ticketId}</span></p>

                  {/* Merchandise items */}
                  <div className="mt-3 space-y-1">
                    {reg.merchandisePurchases?.map((p, i) => (
                      <div key={i} className="text-sm text-gray-600">
                        {p.size} {p.color} × {p.quantity} — ₹{p.priceAtPurchase * p.quantity}
                      </div>
                    ))}
                    <p className="font-semibold text-gray-900 mt-1">Total: ₹{reg.totalAmount}</p>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Submitted: {new Date(reg.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-col items-end space-y-3 ml-6">
                  {/* Payment proof image */}
                  {reg.paymentProofUrl && (
                    <a href={reg.paymentProofUrl} target="_blank" rel="noreferrer"
                      className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <FiImage size={14} />
                      <span>View Proof</span>
                    </a>
                  )}

                  {reg.paymentStatus === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => reviewMutation.mutate({ regId: reg._id, action: 'approve' })}
                        disabled={reviewMutation.isPending}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
                      >
                        <FiCheck size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => reviewMutation.mutate({ regId: reg._id, action: 'reject' })}
                        disabled={reviewMutation.isPending}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                      >
                        <FiX size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {reg.paymentStatus !== 'pending' && reg.paymentStatus !== 'not_required' && (
                    <p className="text-xs text-gray-400">
                      Reviewed: {reg.paymentReviewedAt && new Date(reg.paymentReviewedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
