# ServiceBid

A full-stack **PERN** (PostgreSQL, Express, React, Node.js) student project where authenticated users post service requirements and receive competitive price quotes from other users. The system automatically extends the quoting deadline when a bid arrives in the final 5 minutes — ensuring fair competition.

## Features

- **JWT Authentication** — Register, Login, protected routes
- **Two Roles** — `user` and `admin`
- **Post Requirements** — Any authenticated user can post a service requirement
- **Submit Quotes** — Any user can quote on others' requirements (self-quoting blocked)
- **L1 / L2 / L3 Ranking** — Quotes ranked by lowest amount
- **Auto-Extension Rule** — Deadline extends by 5 min if a quote arrives within the last 5 min
- **My Requirements** — View requirements you have posted
- **My Quotes** — View all quotes you have submitted
- **Admin Panel** — Create/edit/delete users, force-close requirements, view platform stats

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router, Axios |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL (local or Neon cloud) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |

## Project Structure

```
ServiceBid/
├── backend/
│   ├── index.js                 # Express entry point
│   ├── schema.sql               # PostgreSQL schema (4 tables)
│   ├── config/db.js             # PG connection pool
│   ├── middleware/authMiddleware.js
│   ├── controllers/
│   │   ├── authController.js    # Register, Login, User CRUD
│   │   ├── rfqController.js     # Requirements CRUD + force-close
│   │   ├── bidController.js     # Place quote, My quotes
│   │   └── adminController.js   # Platform stats
│   └── routes/
│       ├── authRoutes.js
│       ├── rfqRoutes.js
│       ├── bidRoutes.js
│       └── adminRoutes.js
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── context/AuthContext.jsx
        ├── services/api.js
        ├── components/
        │   ├── Navbar.jsx
        │   └── StatusBadge.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── HomePage.jsx          # Browse all requirements
            ├── RequirementDetailPage.jsx # Quotes + bidding form
            ├── PostRequirementPage.jsx   # Post a new requirement
            ├── MyRequirementsPage.jsx    # My posted requirements
            ├── MyQuotesPage.jsx          # My submitted quotes
            └── AdminPage.jsx             # Admin user management
```

## Quick Start

### 1. Database Setup

Run `backend/schema.sql` in your PostgreSQL database:
```sql
psql -U postgres -d servicebid -f backend/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL and JWT_SECRET
npm run dev               # starts on http://localhost:5000
```

**First run:** Default admin is seeded automatically:
```
Email:    admin@servicebid.com
Password: admin123
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # starts on http://localhost:5173
```

## API Reference

### Public
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login — returns JWT |

### Authenticated (Bearer token required)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/rfqs` | All requirements |
| GET | `/api/rfqs/mine` | My posted requirements |
| GET | `/api/rfq/:id` | Requirement detail + quote rankings |
| POST | `/api/rfq` | Post new requirement |
| POST | `/api/bid` | Submit a quote |
| GET | `/api/bids/mine` | My submitted quotes |

### Admin Only
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/users` | All users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| DELETE | `/api/rfq/:id` | Delete requirement |
| PUT | `/api/rfq/:id/force-close` | Force-close requirement |

## Database Schema

4 tables: `users`, `rfq`, `bids`, `rfq_audit`

See `backend/schema.sql` for the complete DDL.

## Key Business Rules

1. Any authenticated user can post requirements and submit quotes
2. A user **cannot** submit a quote on their own requirement
3. Quotes are ranked **L1, L2, L3…** by lowest amount
4. If a quote arrives within the last **5 minutes** before close, the deadline is extended by **5 minutes** (up to the forced close time)
5. Admin can force-close any requirement immediately