# Booking Workflow Documentation

This document describes the lifecycle of a booking in the Lendly application, outlining the REST endpoints, expected request payloads, response data, and the roles required for each step.

## Booking Lifecycle Overview

1. **Request**: Renter requests a booking. Status becomes `PENDING`.
2. **Payment**: Renter puts a payment hold or pays the deposit.
3. **Acceptance**: Owner reviews and accepts the booking. Status becomes `CONFIRMED`.
4. **Completion**: After the booking period ends, both the Renter and Owner mark the booking as complete. Status becomes `COMPLETED` when both have confirmed.
*(At any point before acceptance, the Owner can decline or the Renter can cancel)*

---

### 1. Create a Booking (Renter)

**Endpoint**: `POST /v1/bookings`
**Role**: Renter
**Description**: Initiates a new booking request. Calculates pricing and creates a `PENDING` booking. The booking expires if not actioned within 24 hours.

**Request Body**:
```json
{
  "listingId": "uuid-of-the-listing",
  "startAt": "2025-03-01T10:00:00.000Z",
  "endAt": "2025-03-03T10:00:00.000Z",
  "unitPreference": "DAY" // Optional: "AUTO", "HOUR", "DAY", "WEEK", "MONTH"
}
```

**Response**:
```json
{
  "id": "uuid-of-booking",
  "listingId": "...",
  "renterId": "...",
  "ownerId": "...",
  "startAt": "2025-03-01T10:00:00.000Z",
  "endAt": "2025-03-03T10:00:00.000Z",
  "expiresAt": "2025-03-02T10:00:00.000Z",
  "status": "PENDING",
  "paymentStatus": "UNPAID",
  "pricingUnit": "DAY",
  "quantity": 2,
  "unitRate": "50.00",
  "subtotal": "100.00",
  "listing": { "id": "...", "title": "Listing Title" },
  "owner": { "id": "...", "firstName": "John", "lastName": "Doe" },
  "renter": { "id": "...", "firstName": "Jane", "lastName": "Smith" },
  "completion": {
    "renterConfirmedAt": null,
    "ownerConfirmedAt": null
  }
}
```

---

### 2. Update Payment Status (Renter)

**Endpoint**: `POST /v1/bookings/:id/payment`
**Role**: Renter
**Description**: Updates payment/hold info. The booking must be on `HOLD` or `PAID` before the owner can accept it.

**Request Body**:
```json
{
  "paymentStatus": "HOLD", // "UNPAID", "HOLD", "PAID", "FAILED"
  "depositAmount": 100.00, // Optional
  "paymentReference": "stripe_pi_12345" // Optional
}
```

**Response**: Returns the updated Booking object (same structure as Create response).

---

### 3. Accept a Booking (Owner)

**Endpoint**: `POST /v1/bookings/:id/accept`
**Role**: Owner
**Description**: Owner accepts a `PENDING` booking. The booking's payment status must be `HOLD` or `PAID`. Changes status to `CONFIRMED`.

**Request Body**: Empty

**Response**: Returns the updated Booking object with `"status": "CONFIRMED"`.

---

### 4. Decline or Cancel a Booking

**Endpoint (Decline)**: `POST /v1/bookings/:id/decline`
**Role**: Owner
**Description**: Owner declines a `PENDING` booking. Status becomes `DECLINED`.

**Endpoint (Cancel)**: `POST /v1/bookings/:id/cancel`
**Role**: Renter
**Description**: Renter cancels a `PENDING` or `CONFIRMED` booking. Status becomes `CANCELLED`.

**Request Body**: Empty
**Response**: Returns the updated Booking object with the new status.

---

### 5. Mark Booking as Complete (Renter & Owner)

**Endpoint**: `POST /v1/bookings/:id/complete`
**Role**: Renter or Owner
**Description**: After the end date (`endAt`) has passed, participants can mark the booking as completed. The overall booking `status` changes to `COMPLETED` only when **both** parties have completed it.

**Request Body**:
```json
{
  "party": "renter" // or "owner" depending on who is making the request
}
```

**Response**: 
```json
{
  // ... booking fields ...
  "status": "CONFIRMED", // Becomes "COMPLETED" when both have confirmed
  "completion": {
    "renterConfirmedAt": "2025-03-03T11:00:00.000Z",
    "ownerConfirmedAt": null 
  }
}
```

---

### 6. Booking Issues (Participants)

Participants (Renter or Owner) can report issues related to the booking.

**Create Issue Endpoint**: `POST /v1/bookings/:id/issues`
**Request Body**:
```json
{
  "message": "The item was scratched upon pickup.",
  "category": "DAMAGE" // Optional
}
```
**Response**:
```json
{
  "id": "uuid-of-issue",
  "bookingId": "uuid-of-booking",
  "authorId": "uuid-of-user",
  "message": "The item was scratched upon pickup.",
  "category": "DAMAGE",
  "createdAt": "2025-03-01T10:00:00.000Z"
}
```

**List Issues Endpoint**: `GET /v1/bookings/:id/issues`
**Response**: Array of issue objects.

---

### 7. List / View Bookings

**List Bookings**: `GET /v1/bookings?role=renter` (or `role=owner`)
**Response**: Array of Booking objects.

**Get Single Booking**: `GET /v1/bookings/:id`
**Response**: Single Booking object (includes additional details like user phone numbers).
