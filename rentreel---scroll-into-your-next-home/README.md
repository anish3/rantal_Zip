# RentReel — Scroll into your next home 🏠📱

> An Instagram-style rental social marketplace web application for discovering rental homes, rooms, PGs, hostels, and tenants with short-form reels and 10-day expiring listings.

---

## 🌟 Overview

RentReel bridges the gap between traditional clunky classified portals and modern social media discovery. Instead of outdated static ads, RentReel brings:

1. **Instagram-Style Social Experience**: High-fidelity feeds, profile headers with highlights, verification badges, likes, comments, and saves.
2. **Short-Form Property Reels**: Full-height vertical video tours of rooms, bathrooms, kitchens, balconies, and student PGs with floating property context cards.
3. **Dual-Sided Marketplace Discovery**:
   - **Side 1 (Tenants)**: Discover verified PGs, rooms, flats, co-living suites, and hostels in Indore.
   - **Side 2 (Owners / PGs / Brokers)**: Discover active tenant rental requirements (students, IT professionals) with target budgets and move-in dates.
4. **10-Day Automatic Expiration Lifecycle**:
   - Every rental listing automatically expires after exactly 10 days (`status = EXPIRED`).
   - Expired listings disappear from feeds and search to prevent bogus/stale ads.
   - Idempotent background worker notifies owners 24h prior and allows 1-click renewal (`status = ACTIVE` + 10 more days) or marking as rented (`status = RENTED`).
5. **Contextual Direct Messaging**:
   - Real-time chat with attached interactive property/listing cards.
   - Read receipts, typing indicators, and instant inquiry presets.
6. **Rule-Based & AI-Ready Tenant Matching**:
   - Compares budget, location, gender preference, and amenities to compute match scores (e.g. 94% Match).

---

## 🏙️ Demo City: Indore, India

Configured with prime Indore rental hubs:
- **Vijay Nagar** (Student & IT hub, PU-4, near Medanta & Prestige)
- **Scheme 54** (Behind C21 Mall, residential flats)
- **Scheme 140 & Pipliyahana** (Boutique serviced apartments & tech hubs)
- **Bhawarkua** (DAVV Takshashila campus, coaching centers & budget student PGs)
- **Palasia** (Central prime residences)
- **Rau & Super Corridor** (TCS, Infosys campus techies)

---

## 🛠️ Architecture

```
├── server.ts                    # Full-Stack Express entry point with Vite middleware
├── src/
│   ├── server/                  # Backend Architecture
│   │   ├── types.ts             # Domain models (User, Property, Listing, Reel, etc.)
│   │   ├── store.ts             # Persistence store + 10-day background expiration worker
│   │   ├── routes.ts            # RESTful API endpoints (/api/*)
│   │   └── data/seed.ts         # Realistic Indore seed data (owners, brokers, tenants)
│   ├── context/
│   │   └── AppContext.tsx       # Global application state & demo persona switching
│   ├── components/
│   │   ├── layout/              # Sidebar, MobileNav, Header
│   │   ├── feed/                # FeedView, PropertyPostCard, RequirementCard
│   │   ├── reels/               # ReelsView (Full vertical video player + drawer)
│   │   ├── profile/             # PropertyProfileView (Instagram-style), TenantProfileView
│   │   ├── marketplace/         # FindPropertyView (Map/Grid/List), FindTenantView
│   │   ├── messages/            # MessagesView (Real-time chat with attached context)
│   │   ├── dashboard/           # OwnerDashboard (10d lifecycle management), AdminDashboard
│   │   ├── notifications/       # NotificationsDrawer with 1-click renewal action
│   │   ├── search/              # SearchModal (Global search across 5 tabs)
│   │   └── modals/              # VisitScheduleModal, CreateModal
│   ├── types/client.ts          # Client TypeScript declarations
│   └── lib/api.ts               # Clean async API client
```

---

## ⏰ The 10-Day Expiration Flow

```
+-------------------+
|  Listing Created  |  (status: ACTIVE, expiresAt: now + 10 days)
+-------------------+
          |
          v
   [ 9 Days Pass ] ----> System sends alert: "Expires tomorrow. Still available?"
          |
          v
   [ 10 Days Pass ]
          |
          +---> status: EXPIRED
                Disappears from Home Feed, Explore, and Search
                Owner dashboard shows: [Renew 10 Days] or [Mark Rented]
```

Owners can click **Renew 10 Days** at any time to reset `expiresAt = now + 10 days` and restore active status. When a room is taken, clicking **Mark Rented** updates the database and permanently removes it from active discovery.

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install
```

### 2. Development Server

Start the full-stack server (runs Express API on `/api` and Vite frontend on port 3000):

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### 3. Production Build & Start

```bash
npm run build
npm start
```

---

## 📡 REST API Reference

### Auth & Personas
- `GET /api/auth/me` — Current session user
- `GET /api/auth/demo-users` — Available marketplace personas
- `POST /api/auth/switch-user` — Switch active persona (Tenant, PG Owner, Broker, Admin)
- `POST /api/auth/switch-role` — Switch active role mode

### Feed & Social
- `GET /api/feed` — Combined social feed (active 10d listings, tenant requirements, reels)
- `POST /api/social/save` — Save/bookmark listing, property, or reel
- `GET /api/social/saved` — Retrieve saved items
- `POST /api/users/:id/follow` — Follow/unfollow profile
- `GET /api/users/:username` — Instagram-style profile details

### Properties & 10-Day Listings
- `GET /api/properties` — Filter by area, type, budget, gender, zero brokerage
- `GET /api/properties/:id` — Property profile with active rooms, reels & reviews
- `POST /api/properties` — Create property
- `GET /api/listings` — Active rental listings
- `POST /api/listings` — Create room listing (sets 10-day expiration timer)
- `POST /api/listings/:id/renew` — **Renew listing for 10 days**
- `POST /api/listings/:id/mark-rented` — **Mark as rented (removes from feeds)**

### Tenant Rental Requirements (Side 2)
- `GET /api/requirements` — Search tenant requests by budget, occupation & area
- `POST /api/requirements` — Post rental requirement
- `GET /api/requirements/:id/matches` — Compute compatibility match score

### Short-Form Reels
- `GET /api/reels` — Fetch video reels
- `POST /api/reels` — Upload new reel tour
- `POST /api/reels/:id/like` — Like/unlike reel
- `GET /api/reels/:id/comments` — Reel comments
- `POST /api/reels/:id/comments` — Post comment

### Real-time Messaging
- `GET /api/conversations` — Direct message inbox
- `POST /api/conversations` — Start or open conversation with attached property context
- `GET /api/conversations/:id/messages` — Fetch thread messages
- `POST /api/messages` — Send message with attached property inquiry card

### Notifications & Search
- `GET /api/notifications` — Retrieve alerts (expiring soon, new inquiry, matches)
- `GET /api/search?q=query&tab=all` — Global search across properties, people, reels & requirements
- `GET /api/admin/metrics` — Marketplace operational metrics
