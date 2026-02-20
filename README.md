# Lendly Backend

NestJS API with Prisma, JWT auth, Swagger, and modules for auth, users, listings, availability, quotes, and bookings.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy the example env and edit with your values:

```bash
cp .env.example .env
```

Required in `.env`:

- `DATABASE_URL` — Postgres connection string (e.g. `postgresql://user:password@localhost:5432/lendly`)
- `JWT_ACCESS_SECRET` — secret for access tokens (min 32 chars)
- `JWT_REFRESH_SECRET` — secret for refresh tokens (min 32 chars)
- Optional: `JWT_ACCESS_EXPIRES_IN` (default `15m`), `JWT_REFRESH_EXPIRES_IN` (default `30d`), `PORT` (default `3000`)

### 3. Database (Docker, optional)

Run Postgres with Docker Compose:

```bash
docker compose up -d
```

Default compose uses user `lendly`, password `lendly`, database `lendly` on port `5432`. Set:

```env
DATABASE_URL="postgresql://lendly:lendly@localhost:5432/lendly"
```

### 4. Migrations

Generate Prisma client and run migrations:

```bash
npx prisma migrate dev
# or
npm run prisma:migrate
```

### 5. Start the app

```bash
# development (watch)
npm run start:dev

# production
npm run start:prod
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/api`

---

## API overview and curl examples

Base URL: `http://localhost:3000`.  
Auth: use `Authorization: Bearer <access_token>` for protected routes.  
Replace `$TOKEN` with an access token and `$REFRESH` with a refresh token where needed.

### Auth (`/v1/auth`)

```bash
# Register
curl -s -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123","name":"Alice"}'

# Login
curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'

# Refresh tokens
curl -s -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"'$REFRESH'"}'

# Logout (revoke session)
curl -s -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"'$REFRESH'"}'

# Current user (JWT required)
curl -s http://localhost:3000/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

### Users (`/v1/users`)

```bash
# Update my profile (JWT)
curl -s -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Updated","phone":"+1234567890"}'

# Get user by ID (public: id, name, createdAt)
curl -s http://localhost:3000/v1/users/<user-id>
```

### Listings (`/v1/listings`)

```bash
# Create listing (JWT)
curl -s -X POST http://localhost:3000/v1/listings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Road bike",
    "description":"Great condition.",
    "category":"bikes",
    "condition":"good",
    "city":"Berlin",
    "dailyRate":50,
    "images":["https://example.com/1.jpg"]
  }'

# List listings (query: search, category, city, page, limit, sort=newest|price)
curl -s "http://localhost:3000/v1/listings?category=bikes&city=Berlin&page=1&limit=10&sort=newest"

# Get listing by ID
curl -s http://localhost:3000/v1/listings/<listing-id>

# Update listing (JWT, owner only)
curl -s -X PATCH http://localhost:3000/v1/listings/<listing-id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title","dailyRate":55}'

# Delete listing / set status DELETED (JWT, owner only)
curl -s -X DELETE http://localhost:3000/v1/listings/<listing-id> \
  -H "Authorization: Bearer $TOKEN"
```

### Availability (`/v1/listings/:id/availability`)

```bash
# Get availability blocks for a listing
curl -s http://localhost:3000/v1/listings/<listing-id>/availability

# Add availability block (JWT, owner only)
curl -s -X POST http://localhost:3000/v1/listings/<listing-id>/availability/blocks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startAt":"2025-03-01T00:00:00.000Z","endAt":"2025-03-02T00:00:00.000Z","reason":"Maintenance"}'

# Delete availability block (JWT, owner only)
curl -s -X DELETE http://localhost:3000/v1/listings/<listing-id>/availability/blocks/<block-id> \
  -H "Authorization: Bearer $TOKEN"
```

### Quotes (`/v1/quotes`)

```bash
# Get a quote (listingId, startAt, endAt, optional unitPreference: AUTO|HOUR|DAY|WEEK|MONTH)
curl -s -X POST http://localhost:3000/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "listingId":"<listing-id>",
    "startAt":"2025-03-01T10:00:00.000Z",
    "endAt":"2025-03-03T10:00:00.000Z",
    "unitPreference":"AUTO"
  }'
```

### Bookings (`/v1/bookings`)

```bash
# Create booking (JWT)
curl -s -X POST http://localhost:3000/v1/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId":"<listing-id>",
    "startAt":"2025-03-01T10:00:00.000Z",
    "endAt":"2025-03-03T10:00:00.000Z",
    "unitPreference":"DAY"
  }'

# List my bookings (query: role=renter|owner)
curl -s "http://localhost:3000/v1/bookings?role=renter" -H "Authorization: Bearer $TOKEN"

# Get booking by ID (JWT, renter or owner only)
curl -s http://localhost:3000/v1/bookings/<booking-id> -H "Authorization: Bearer $TOKEN"

# Accept booking (JWT, owner only)
curl -s -X POST http://localhost:3000/v1/bookings/<booking-id>/accept \
  -H "Authorization: Bearer $TOKEN"

# Decline booking (JWT, owner only)
curl -s -X POST http://localhost:3000/v1/bookings/<booking-id>/decline \
  -H "Authorization: Bearer $TOKEN"

# Cancel booking (JWT, renter only)
curl -s -X POST http://localhost:3000/v1/bookings/<booking-id>/cancel \
  -H "Authorization: Bearer $TOKEN"
```

---

## Notes

### Availability overlap logic

Two ranges overlap if and only if:

```text
(startA < endB) AND (endA > startB)
```

- Creating an **availability block**: the new block must not overlap any existing block for the same listing.
- Creating or **accepting a booking**: the requested range must not overlap any availability block for the listing, and must not overlap any existing **ACCEPTED** booking for that listing. On accept, availability is re-checked inside a DB transaction (excluding the current booking).

### Price sorting limitation

- **`sort=newest`**: listings are ordered by `createdAt` desc in the database; pagination is fully DB-based.
- **`sort=price`**: the API fetches up to a fixed limit of listings (e.g. 1000) from the DB, then computes a “min available rate” in memory (minimum of non-null hourly/daily/weekly/monthly rates), sorts by that value, and then applies the requested page/limit. So:
  - Pagination for `sort=price` is over this fetched set, not over the full result set.
  - Very large catalogs may not show all listings when sorting by price.

### Error responses

The API uses standard HTTP status and Nest exception types:

- **400** `BadRequestException` — validation, business rule (e.g. dates, overlap, listing not bookable).
- **401** `UnauthorizedException` — missing/invalid JWT or refresh token.
- **403** `ForbiddenException` — not allowed (e.g. not owner/renter).
- **404** `NotFoundException` — resource not found.
- **409** `ConflictException` — conflict (e.g. email already registered).

### Money and dates

- All monetary values in the database (rates, unitRate, subtotal) are stored using **Prisma `Decimal`** (no float math in storage).
- Date/time fields are stored and compared as **`Date`** objects; request bodies use ISO 8601 strings and are converted to `Date` for validation and persistence.

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run migrations (`prisma migrate dev`) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run lint` | Lint and fix |
| `npm run test` | Unit tests |

---

## License

UNLICENSED (private).
