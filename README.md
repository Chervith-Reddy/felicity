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
| **Framer Motion** | Animations | Declarative animations for page transitions and UI interactions |
| **Recharts** | Charts | Composable chart library for organizer/admin analytics dashboards |
| **html5-qrcode** | QR Scanning | Browser-based QR code scanning for attendance check-in |
| **Express.js** | Backend | Minimal, unopinionated Node.js framework for REST APIs |
| **Mongoose** | ODM | Schema validation and middleware hooks for MongoDB |
| **bcryptjs** | Security | Password hashing with salt rounds for secure storage |
| **jsonwebtoken** | Auth | JWT-based stateless authentication across all roles |
| **express-validator** | Validation | Input validation and sanitization middleware for API routes |
| **Socket.IO** | Real-time | WebSocket server for forum chat and live attendance |
| **Nodemailer** | Email | SMTP email sending for ticket confirmations |
| **QRCode** | Tickets | QR code generation for participant tickets |
| **csv-stringify** | Export | CSV generation for participant/attendance exports |
| **Multer** | Uploads | File upload handling for payment proofs |
| **Fuse.js** | Search | Fuzzy search library for partial/approximate event matching |
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
# Create .env with your MongoDB URI, JWT secret, and SMTP settings (see Environment Variables below)
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
- Event state machine: Draft → Published → Ongoing → Completed/ Cancelled

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

## Design & Technical Decisions

- **MERN Stack**: Chose MongoDB + Express + React + Node.js for a unified JavaScript stack across frontend and backend, reducing context-switching and enabling shared validation logic. MongoDB's document model maps naturally to event objects with variable schemas (normal vs. merchandise vs. hackathon).
- **JWT over Sessions**: Stateless JWT tokens allow horizontal scaling without shared session stores. Tokens are persisted in `localStorage` so users stay logged in across browser restarts — critical for a fest platform where users check back frequently over multiple days.
- **Socket.IO over SSE/polling**: Server-Sent Events are unidirectional, but the forum requires bidirectional communication (typing indicators, real-time replies). Socket.IO provides WebSocket transport with automatic fallback to long-polling, plus built-in room management (`join`/`leave`) which maps directly to per-event forum channels.
- **Event State Machine (Draft → Published → Ongoing → Completed/Cancelled)**: Enforced at the backend level to prevent invalid transitions. Editing rules are tied to state — Draft allows full editing, Published restricts to description/deadline/limit changes, Ongoing/Completed locks the event. This prevents data inconsistency once participants have registered.
- **Preference-based Event Ordering**: Events from followed clubs are boosted by +10 score, and each matching interest tag adds +3. This scoring approach (vs. strict filtering) ensures users still discover events outside their preferences while seeing relevant ones first.
- **Payment Approval Decoupled from Stock**: For merchandise, stock is **not decremented** at purchase time — only on organizer approval. This eliminates race conditions where rejected payments would need stock rollback, and gives organizers full visibility before committing inventory.
- **Anonymous Feedback via SHA-256 Hashing**: User identity is hashed with `SHA-256 + JWT_SECRET` before storage. The database stores only the hash, making it impossible to reverse-lookup who submitted feedback, while the unique constraint on `(eventId, userHash)` still prevents duplicate submissions.
- **TanStack Query for Server State**: Chose over Redux/Zustand because the app is primarily server-state driven (events, registrations, tickets). TanStack Query provides automatic caching, background refetching, and cache invalidation — eliminating manual loading/error state management that would otherwise bloat every component.
- **React Hook Form over Formik**: Event creation forms have 10+ fields with conditional sections (merchandise variants, hackathon team size). React Hook Form uses uncontrolled inputs by default, avoiding re-renders on every keystroke — measurably faster for complex forms.
- **Multer for File Uploads**: Chose disk storage over cloud (S3) to keep the project self-contained with zero external service dependencies beyond MongoDB and SMTP. Payment proof images are served statically from the `/uploads/` directory.
- **Role-Based Access at Two Layers**: Both frontend (`ProtectedRoute` component) and backend (`requireRole` middleware) enforce role checks. Frontend guards improve UX by preventing navigation to unauthorized pages; backend guards are the actual security boundary, preventing API abuse via direct requests.
- **Tailwind CSS over Component Libraries (MUI/Bootstrap)**: Utility-first approach enables rapid custom design without fighting component library defaults. Combined with Vite's JIT compilation, only used utilities ship to production, keeping bundle size minimal.

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

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register participant |
| POST | `/api/auth/login` | Participant/Admin login |
| POST | `/api/auth/organizer/login` | Organizer login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout current user |

### Events
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | List events (with search/filters) |
| GET | `/api/events/trending` | Top 5 events last 24h |
| GET | `/api/events/:id` | Get single event details |
| POST | `/api/events` | Create event (organizer) |
| PUT | `/api/events/:id` | Update event (organizer) |
| DELETE | `/api/events/:id` | Delete event (organizer/admin) |
| PATCH | `/api/events/:id/status` | Change event status (organizer) |
| PUT | `/api/events/:id/form` | Update form builder (organizer) |
| POST | `/api/events/:id/view` | Increment view count |
| GET | `/api/events/:id/participants` | List participants (organizer/admin) |
| GET | `/api/events/:id/export` | Export participants CSV (organizer/admin) |

### Registrations & Payments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/registrations` | Register for event (with optional payment proof) |
| GET | `/api/registrations/my` | My registrations |
| DELETE | `/api/registrations/:id` | Cancel registration |
| GET | `/api/registrations/event/:eventId/pending-payments` | Pending payment approvals (organizer) |
| PATCH | `/api/registrations/:id/payment-review` | Approve/reject payment (organizer) |

### Tickets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tickets/:ticketId` | Get ticket details |

### Teams (Hackathon)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/teams` | Create team |
| GET | `/api/teams/my` | Get my teams |
| GET | `/api/teams/join/:inviteCode` | Get team by invite code |
| POST | `/api/teams/join` | Join team via invite code |
| POST | `/api/teams/:id/respond` | Accept/decline team invite |
| POST | `/api/teams/:id/invite` | Invite member to team |
| DELETE | `/api/teams/:id/leave` | Leave team |
| GET | `/api/teams/:id` | Get team details |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/attendance/scan` | QR scan check-in |
| POST | `/api/attendance/manual` | Manual check-in |
| GET | `/api/attendance/:eventId` | Attendance dashboard |
| GET | `/api/attendance/:eventId/export` | Export attendance CSV |
| DELETE | `/api/attendance/:eventId/:attendanceId` | Revert check-in |

### Forum
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forum/:eventId/messages` | Get forum messages |
| POST | `/api/forum/:eventId/announce` | Post announcement (organizer) |
| PATCH | `/api/forum/:eventId/messages/:msgId/pin` | Pin/unpin message (organizer) |
| DELETE | `/api/forum/:eventId/messages/:msgId` | Delete message (organizer) |
| POST | `/api/forum/:eventId/messages/:msgId/react` | React to message |

### Feedback
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/feedback/:eventId` | Submit anonymous feedback |
| GET | `/api/feedback/:eventId` | View event feedback (organizer) |
| GET | `/api/feedback/:eventId/check` | Check if already submitted |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/organizers` | Create organizer |
| GET | `/api/admin/organizers` | List organizers |
| PATCH | `/api/admin/organizers/:id/status` | Update organizer status |
| DELETE | `/api/admin/organizers/:id` | Delete organizer |
| GET | `/api/admin/users` | List users |
| PATCH | `/api/admin/users/:id/status` | Update user status |
| GET | `/api/admin/stats` | Platform statistics |

### Password Reset
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/password-reset-requests` | Submit reset request (organizer) |
| GET | `/api/password-reset-requests/my` | My reset requests (organizer) |
| GET | `/api/password-reset-requests` | View all requests (admin) |
| PATCH | `/api/password-reset-requests/:id/approve` | Approve request (admin) |
| PATCH | `/api/password-reset-requests/:id/reject` | Reject request (admin) |
| POST | `/api/password-reset-requests/:id/acknowledge` | Acknowledge credential (admin) |

### User & Profile
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users/onboarding` | Complete onboarding (participant) |
| POST | `/api/users/change-password` | Change password |
| PUT | `/api/users/profile` | Update profile |
| GET | `/api/users/organizers` | List all organizers (for follow) |

### Organizer
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/organizers/my-events` | Get organizer's events |
| GET | `/api/organizers/dashboard-analytics` | Dashboard analytics |
| GET | `/api/organizers/my-ongoing` | Get ongoing events |
| GET | `/api/organizers/analytics/:eventId` | Event analytics |
| GET | `/api/organizers/:id` | Public organizer profile + events |

---

## Development Notes
- Seeded admin credentials printed to console after `npm run seed:admin`
- Email sending is optional; ticket is created regardless of email success
- Discord webhook calls fail silently if URL is invalid
- QR codes stored as base64 data URLs in MongoDB
- Payment proofs stored in `/uploads/` directory
