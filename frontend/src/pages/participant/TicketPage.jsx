import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../utils/api';

export default function TicketPage() {
  const { ticketId } = useParams();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => api.get(`/tickets/${ticketId}`).then(r => r.data)
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  );

  if (!ticket) return <div className="text-center py-20 text-gray-400">Ticket not found</div>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Ticket</h1>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="gradient-bg p-6 text-white text-center">
          <p className="text-white/80 text-sm mb-1">Ticket ID</p>
          <h2 className="text-3xl font-bold tracking-widest">{ticket.ticketId}</h2>
          <p className="text-white/70 text-sm mt-2 capitalize">{ticket.status}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500">Event</p>
            <p className="font-semibold text-gray-900 mt-1">{ticket.event?.name}</p>
            <p className="text-sm text-primary-600">{ticket.event?.organizer?.name}</p>
          </div>

          {ticket.event?.startDate && (
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium mt-1">
                {format(new Date(ticket.event.startDate), 'EEEE, MMMM dd, yyyy')}
              </p>
            </div>
          )}

          {ticket.event?.venue && (
            <div>
              <p className="text-sm text-gray-500">Venue</p>
              <p className="font-medium mt-1">{ticket.event.venue}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500">Attendee</p>
            <p className="font-medium mt-1">{ticket.user?.firstName} {ticket.user?.lastName}</p>
            <p className="text-sm text-gray-500">{ticket.user?.email}</p>
          </div>

          {ticket.totalAmount > 0 && (
            <div>
              <p className="text-sm text-gray-500">Amount Paid</p>
              <p className="font-semibold text-gray-900 mt-1">₹{ticket.totalAmount}</p>
            </div>
          )}

          {ticket.merchandisePurchases?.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Items Purchased</p>
              {ticket.merchandisePurchases.map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                  <span>{p.size} - {p.color} × {p.quantity}</span>
                  <span>₹{p.priceAtPurchase * p.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {/* QR Code */}
          {ticket.qrCode && (
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-3">Scan at event check-in</p>
              <img src={ticket.qrCode} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl" />
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 text-center">
          <p className="text-xs text-gray-400">
            Registered on {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
      </div>

      <button onClick={() => window.print()} className="btn-secondary w-full mt-4 py-3">
        🖨️ Print Ticket
      </button>
    </div>
  );
}
