# 🎉 Felicity - Event Management Platform

A centralized event management platform built with the MERN Stack for IIIT Hyderabad's annual fest.

## Tech Stack

| Technology | Purpose | Justification |
|---|---|---|
| **React + Vite** | Frontend | React for component-based UI with fast HMR via Vite |
| **Tailwind CSS** | Styling | Rapid utility-first styling with consistent design system |
| **React Router v6** | Routing | Declarative routing with layout nesting and protected routes |
| **React Hook Form** | Forms | Minimal re-renders for complex forms (event creation, registration) |
| **TanStack Query** | Data fetching | Caching, auto-refetching, optimistic updates for API calls |
| **React Hot Toast** | Notifications | Lightweight toast notifications for user feedback |
| **Socket.IO Client** | Real-time | WebSocket client for live forum and attendance updates |
| **date-fns** | Dates | Lightweight date formatting (vs. moment.js which is heavy) |
| **react-icons** | Icons | Tree-shakable icon library, only imports used icons |
| **Express.js** | Backend | Minimal, unopinionated Node.js framework for REST APIs |
| **Mongoose** | ODM | Schema validation and middleware hooks for MongoDB |
| **bcryptjs** | Security | Password hashing with salt rounds for secure storage |
| **jsonwebtoken** | Auth | JWT-based stateless authentication across all roles |
| **Socket.IO** | Real-time | WebSocket server for forum chat and live attendance |
| **Nodemailer** | Email | SMTP email sending for ticket confirmations |
| **QRCode** | Tickets | QR code generation for participant tickets |
| **csv-stringify** | Export | CSV generation for participant/attendance exports |
| **Multer** | Uploads | File upload handling for payment proofs |
| **Axios** | HTTP (Discord) | HTTP client for Discord webhook integration |

---

## Project Structure
```
felicity/
├── backend/          # Express.js REST API
│   ├── controllers/  # Route handlers
│   ├── middleware/    # JWT auth + role-based access
│   ├── models/       # Mongoose schemas (9 models)
│   ├── routes/       # API routes (12 modules)
│   ├── utils/        # Email, Socket.IO, seed scripts, file upload
│   └── server.js
├── frontend/         # React + Vite
│   └── src/
│       ├── context/  # Auth context with JWT persistence
│       ├── pages/    # Role-based pages (participant/organizer/admin)
│       ├── components/
│       └── utils/    # Axios API client
├── deployment.txt    # Deployment URLs and instructions
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and other settings
npm run seed:admin   # Create admin account
npm run dev          # Start dev server on port 5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev          # Start on port 5173
```

---

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (default: 30d) |
| `IIIT_EMAIL_DOMAIN` | Email domain for IIIT users (default: `iiit.ac.in`) |
| `EMAIL_HOST` | SMTP host (default: smtp.gmail.com) |
| `EMAIL_PORT` | SMTP port (default: 587) |
| `EMAIL_USER` | Gmail/SMTP email for sending tickets |
| `EMAIL_PASS` | Gmail app password |
| `FRONTEND_URL` | Frontend URL for CORS |
| `ADMIN_EMAIL` | Admin email (for seed script) |
| `ADMIN_PASSWORD` | Admin password (for seed script) |

---

## Roles & Access

| Role | Registration | Login | Features |
|---|---|---|---|
| **Admin** | Backend only (`npm run seed:admin`) | `/login` | Manage organizers, users, password resets |
| **Organizer** | Admin provisions | `/login` → Organizer tab | Create/manage events, attendance, analytics |
| **Participant** | `/register` | `/login` | Browse, register, follow clubs, view tickets |

---

## Core Features Implemented

### Authentication & Security (Section 4)
- IIIT email domain auto-detection on signup
- JWT tokens persisted in localStorage across browser restarts
- bcrypt password hashing (12 salt rounds)
- Role-based access control (frontend `ProtectedRoute` + backend `requireRole` middleware)
- Logout clears all tokens and auth headers

### User Onboarding (Section 5)
- Post-signup onboarding page for areas of interest + club following
- Skip option available; editable from Profile page
- Preferences influence event ordering (followed clubs boosted +10, matching tags +3 per match)

### Event System (Sections 7-8)
- Three event types: Normal, Merchandise, Hackathon
- All required attributes: name, description, type, eligibility, dates, limits, registration fee, tags
- Dynamic form builder with 8 field types (locked after first registration)
- Merchandise variants with size/color/stock/price + configurable purchase limit
- Event state machine: Draft → Published → Ongoing → Completed/Cancelled

### Participant Features (Section 9)
- **Dashboard**: Stats, upcoming events, participation history with tabs (Normal/Merchandise/Completed/Cancelled), clickable ticket IDs
- **Browse Events**: Partial/fuzzy regex search on name/description/tags, trending (top 5 in 24h), filters (type/eligibility/date range/followed clubs)
- **Event Details**: Full info, registration/purchase with validation, deadline/limit/eligibility blocking
- **Registration Workflows**: QR code ticket generation, confirmation email with event details
- **Profile**: Editable personal info + interests/followed clubs, non-editable email/type, password change
- **Clubs Page**: All organizers listed with Follow/Unfollow
- **Organizer Detail**: Info + upcoming/past events

### Organizer Features (Section 10)
- **Dashboard**: Events carousel with cards (Name, Type, Status), status transitions, analytics (revenue, registrations)
- **Event Detail**: Participant list with search + CSV export, attendance data, payment status
- **Event Editing**: Draft (free edit), Published (description + extend deadline + increase limit + close registrations), Ongoing/Completed (locked)
- **Form Builder**: 8 field types, required/optional, options for dropdown/checkbox/radio, locked after first registration
- **Profile**: Editable club info, Discord webhook configuration
- **Discord Webhook**: Auto-posts new events to Discord on publish

### Admin Features (Section 11)
- **Dashboard**: Platform stats (users, organizers, events, registrations, revenue, pending resets)
- **Organizer Management**: Create with auto-generated credentials displayed once, Disable/Archive/Delete
- **Password Reset Requests**: View/approve/reject with admin comments, auto-generated new passwords

---

## Advanced Features Implemented (Part 2)

### Tier A — 2 Features Selected [16 Marks]

#### 1. Hackathon Team Registration (8 marks)
**Justification**: Hackathons are the flagship events at Felicity, requiring complex team coordination. This feature supports the core use case of the fest.

**Implementation**:
- Team model with leader, member list, invite codes, and status tracking (forming → complete → cancelled)
- Team leader creates team, sets size, gets auto-generated invite code
- Members join via invite code or are invited by email
- Accept/decline flow for invitations with timestamps
- Auto-registration for ALL team members when team is fully formed (with individual QR codes + email tickets)
- Team management page with member status, invite code sharing, and leave/disband options
- Backend validates: no duplicate team membership, team size limits, event-type check (hackathon only)

#### 2. Merchandise Payment Approval Workflow (8 marks)
**Justification**: Merchandise purchases require payment verification before fulfillment. This eliminates the manual screenshot-checking chaos described in the problem statement.

**Implementation**:
- Events can be flagged with `requiresPaymentApproval`
- Participants upload payment proof image (Multer file upload) during purchase
- Order enters "Pending Approval" state — **no QR generated, no stock decremented**
- Organizer sees dedicated Payment Approvals page with all orders, proof images, and status
- On approval: stock decremented, QR with ticket generated, confirmation email sent
- On rejection: order marked rejected, stock untouched
- Prevents race conditions: stock check only at approval time

### Tier B — 2 Features Selected [12 Marks]

#### 1. Real-Time Discussion Forum (6 marks)
**Justification**: Participants need a way to ask questions about events, and organizers need to make announcements. This replaces the chaotic WhatsApp groups mentioned in the problem statement.

**Implementation**:
- Socket.IO-based real-time messaging on Event Detail pages
- JWT authentication on socket connections
- Access control: only registered participants + event organizer can access
- Message threading (parent-child replies)
- Organizer moderation: pin/unpin messages, delete messages (soft delete), post announcements
- Emoji reactions with toggle (add/remove)
- Typing indicators (user_typing / user_stop_typing events)
- Real-time broadcast to all connected clients in the event room

#### 2. Organizer Password Reset Workflow (6 marks)
**Justification**: Since organizers cannot self-register and credentials are admin-provisioned, a formal password reset workflow is essential. This is explicitly called out in the spec (Section 13.2).

**Implementation**:
- Organizers submit reset request with reason (prevents duplicate pending requests)
- Admin views all requests (filterable by status: pending/approved/rejected)
- Admin can approve (auto-generates new password, shown once) or reject (with comment)
- Request history visible to organizer in their Profile page with status tracking
- Password hashed via bcrypt pre-save hook on organizer model
- Credential acknowledgment endpoint to clear stored plain-text password after admin views

### Tier C — 1 Feature Selected [2 Marks]

#### 1. Anonymous Feedback System (2 marks)
**Justification**: Post-event feedback is critical for improving future editions. Anonymity encourages honest responses.

**Implementation**:
- Participants submit star rating (1-5) + text comments for attended events
- User identity hashed with SHA-256 + JWT secret — **true anonymity** (no user reference stored)
- Unique constraint on event + userHash prevents double submissions
- Organizers view aggregated ratings and individual feedback on EventFeedback page
- Feedback accessible from Event Detail page for submitted participants

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register participant |
| POST | `/api/auth/login` | Participant/Admin login |
| POST | `/api/auth/organizer/login` | Organizer login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/events` | List events (with search/filters) |
| GET | `/api/events/trending` | Top 5 events last 24h |
| POST | `/api/events` | Create event (organizer) |
| PUT | `/api/events/:id` | Update event |
| PATCH | `/api/events/:id/status` | Change event status |
| PUT | `/api/events/:id/form` | Update form builder |
| GET | `/api/events/:id/participants` | List participants |
| GET | `/api/events/:id/participants/csv` | Export participants CSV |
| POST | `/api/registrations` | Register for event |
| GET | `/api/registrations/my` | My registrations |
| GET | `/api/tickets/:ticketId` | Get ticket details |
| POST | `/api/teams` | Create team |
| POST | `/api/teams/:id/join` | Join team via code |
| POST | `/api/teams/:id/respond` | Accept/decline invite |
| POST | `/api/attendance/scan` | QR scan check-in |
| POST | `/api/attendance/manual` | Manual check-in |
| GET | `/api/attendance/:eventId` | Attendance dashboard |
| GET | `/api/attendance/:eventId/csv` | Export attendance CSV |
| GET | `/api/forum/:eventId` | Get forum messages |
| POST | `/api/forum/:eventId/announce` | Post announcement |
| POST | `/api/feedback` | Submit anonymous feedback |
| GET | `/api/feedback/event/:eventId` | View event feedback |
| POST | `/api/admin/organizers` | Create organizer (admin) |
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/password-reset-requests` | View reset requests (admin) |
| POST | `/api/password-reset-requests` | Submit reset request (organizer) |

---

## Development Notes
- Seeded admin credentials printed to console after `npm run seed:admin`
- Email sending is optional; ticket is created regardless of email success
- Discord webhook calls fail silently if URL is invalid
- QR codes stored as base64 data URLs in MongoDB
- Payment proofs stored in `/uploads/` directory
