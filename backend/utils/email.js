const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendTicketEmail = async (user, event, registration) => {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🎉 Registration Confirmed!</h1>
        <p style="color: rgba(255,255,255,0.9);">Felicity Event Management</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333;">Hi ${user.firstName}!</h2>
        <p>You've successfully registered for <strong>${event.name}</strong>.</p>
        
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0;">Event Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Event</td><td style="padding: 8px 0; font-weight: bold;">${event.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0;">${new Date(event.startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Venue</td><td style="padding: 8px 0;">${event.venue || 'TBD'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Organizer</td><td style="padding: 8px 0;">${event.organizer?.name}</td></tr>
          </table>
        </div>

        <div style="background: #667eea; color: white; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; opacity: 0.9;">Your Ticket ID</p>
          <h2 style="margin: 5px 0; font-size: 24px; letter-spacing: 3px;">${registration.ticketId}</h2>
        </div>

        ${registration.qrCode ? `
        <div style="text-align: center; margin: 20px 0;">
          <p style="color: #666;">Scan QR Code at the event</p>
          <img src="${registration.qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
        </div>` : ''}

        ${registration.totalAmount > 0 ? `<p><strong>Amount Paid:</strong> ₹${registration.totalAmount}</p>` : ''}

        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
          This is an automated email from Felicity. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Felicity Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🎫 Ticket Confirmed: ${event.name}`,
    html
  });
};
