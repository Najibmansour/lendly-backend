# Lendly API Documentation

**Version:** 1.0  
**Last Updated:** May 24, 2026  
**Target Audience:** Frontend Engineers

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Global Error Handling](#global-error-handling)
4. [Rate Limiting](#rate-limiting)
5. [API Endpoints by Module](#api-endpoints-by-module)

---

## Overview

### Base URL

```
https://api.lendly.app/
```

### API Versioning

All endpoints are prefixed with `/v1/` to support future versioning.

**Example:** `GET https://api.lendly.app/v1/users/me`

### Date & Time Format

All dates and times use **ISO 8601 format with UTC timezone**:

```
2025-03-15T14:30:00.000Z
```

### Request Headers

All requests should include:

```
Content-Type: application/json
```

Authenticated requests should include:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication

### JWT Bearer Token

The API uses **JWT (JSON Web Tokens)** for authentication. Tokens are returned from login/register endpoints and must be included in the `Authorization` header for protected routes.

### Token Lifetime

- **Access Token:** Valid for 1 hour
- **Refresh Token:** Valid for 7 days

### How to Authenticate

1. Call `POST /v1/auth/register` or `POST /v1/auth/login` to get tokens
2. Include the access token in subsequent requests: `Authorization: Bearer <accessToken>`
3. When access token expires, use `POST /v1/auth/refresh` with the refresh token to get a new access token

---

## Global Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "statusCode": 400,
  "message": "Error message describing what went wrong",
  "error": "BadRequest"
}
```

### Common HTTP Status Codes

| Code | Meaning | Common Scenarios |
|------|---------|------------------|
| **200** | OK | Successful GET request |
| **201** | Created | Successful POST request that creates a resource |
| **400** | Bad Request | Invalid input data, validation failed |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Authenticated but not authorized (e.g., not admin, not owner) |
| **404** | Not Found | Resource does not exist |
| **409** | Conflict | Resource already exists (e.g., duplicate email) |
| **422** | Unprocessable Entity | Validation error with field details |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server-side error |

---

## Rate Limiting

### Global Rate Limit

**50 requests per 60 seconds** — applies to all endpoints by default.

### Endpoint-Specific Rate Limits

Some endpoints have stricter limits to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /v1/auth/register` | 5 requests | 60 seconds |
| `POST /v1/auth/login` | 8 requests | 60 seconds |
| `POST /v1/auth/refresh` | 30 requests | 60 seconds |
| `POST /v1/quotes` | 20 requests | 60 seconds |
| `POST /v1/api/upload-url` | 20 requests | 60 seconds |

### Rate Limit Response Headers

When approaching or exceeding rate limits, check these response headers:

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 12
X-RateLimit-Reset: 1679999999
```

If rate limit is exceeded, you'll receive a `429 Too Many Requests` response.

---

## API Endpoints by Module

---

## Authentication Module

### POST /v1/auth/register

**Register a new user account**

- **Rate Limit:** 5 requests per 60 seconds
- **Authentication:** Not required
- **Description:** Creates a new user account. User must accept Terms of Service and privacy policy to register.

#### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+15551234567",
  "password": "SecurePassword123",
  "acceptTerms": true,
  "acceptPrivacy": true
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `firstName` | string | Yes | Min 2 characters |
| `lastName` | string | Yes | Min 2 characters |
| `email` | string | Yes | Valid email format, must be unique |
| `phone` | string | Yes | E.164 format (e.g., `+15551234567`) |
| `password` | string | Yes | Min 6 characters |
| `acceptTerms` | boolean | Yes | Must be `true` |
| `acceptPrivacy` | boolean | Yes | Must be `true` |

#### Success Response (201 Created)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Terms or privacy policy not accepted |
| 400 | BadRequest | Invalid email format |
| 400 | BadRequest | Invalid phone format |
| 409 | Conflict | Email already registered |
| 422 | UnprocessableEntity | Validation failed (password too short, etc.) |

---

### POST /v1/auth/login

**Authenticate and get access tokens**

- **Rate Limit:** 8 requests per 60 seconds
- **Authentication:** Not required
- **Description:** Authenticates a user and returns JWT tokens.

#### Request Body

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

#### Request Parameters

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

#### Success Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Invalid email or password |
| 401 | Unauthorized | User credentials are incorrect |

---

### GET /v1/auth/me

**Get current authenticated user**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Returns the currently logged-in user's information.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+15551234567",
  "role": "USER",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### POST /v1/auth/refresh

**Refresh access token**

- **Rate Limit:** 30 requests per 60 seconds
- **Authentication:** Not required
- **Description:** Returns a new access token using a valid refresh token.

#### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Request Parameters

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | Yes |

#### Success Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or expired refresh token |

---

### POST /v1/auth/logout

**Logout and revoke refresh token**

- **Authentication:** Not required
- **Description:** Invalidates the provided refresh token, ending the session.

#### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Request Parameters

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | Yes |

#### Success Response (200 OK)

```json
null
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Invalid refresh token |

---

## Users Module

### GET /v1/users/me

**Get current user's profile**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Returns the full profile of the authenticated user.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+15551234567",
  "role": "USER",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### PATCH /v1/users/me

**Update current user's profile**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Updates the first and/or last name of the authenticated user.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Request Body

```json
{
  "firstName": "Johnny",
  "lastName": "Smith"
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `firstName` | string | No | Min 2 characters |
| `lastName` | string | No | Min 2 characters |

#### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "Johnny",
  "lastName": "Smith",
  "phone": "+15551234567",
  "role": "USER",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T11:45:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Name too short |
| 401 | Unauthorized | Missing or invalid token |

---

### GET /v1/users/me/data

**Get current user's personal data**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Returns the user's personal data for export purposes (GDPR compliance).

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Success Response (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+15551234567",
    "createdAt": "2025-01-15T10:30:00.000Z"
  },
  "listings": [
    {
      "id": "listing-uuid",
      "title": "Road Bike",
      "createdAt": "2025-02-01T08:00:00.000Z"
    }
  ],
  "bookings": [
    {
      "id": "booking-uuid",
      "status": "COMPLETED",
      "createdAt": "2025-03-01T10:00:00.000Z"
    }
  ]
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### POST /v1/users/me/delete-request

**Request account deletion**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Initiates a GDPR-compliant account deletion. The account will be anonymized after a grace period.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "message": "Deletion request submitted",
  "deletionScheduledAt": "2025-05-31T00:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 400 | BadRequest | Deletion already requested |

---

### GET /v1/users/me/tos-agreement-latest

**Get latest Terms of Service agreement**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Returns the user's latest accepted ToS version.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Success Response (200 OK)

```json
{
  "id": "tos-agreement-uuid",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "tosVersion": 1,
  "acceptedAt": "2025-01-15T10:30:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 404 | NotFound | No ToS agreement found |

---

### GET /v1/users/:id/tos-agreements

**Get user's ToS agreement audit trail (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Returns all ToS agreements accepted by a specific user. Admin endpoint for auditing.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Success Response (200 OK)

```json
[
  {
    "id": "tos-agreement-uuid-1",
    "userId": "target-user-uuid",
    "tosVersion": 1,
    "acceptedAt": "2025-01-15T10:30:00.000Z"
  },
  {
    "id": "tos-agreement-uuid-2",
    "userId": "target-user-uuid",
    "tosVersion": 2,
    "acceptedAt": "2025-02-20T14:15:00.000Z"
  }
]
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 404 | NotFound | User not found |

---

### GET /v1/users/:id

**Get public user information**

- **Authentication:** Not required
- **Description:** Returns publicly available user information. Only reveals basic info (ID, name, creation date).

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | User does not exist |

---

### POST /v1/admin/users/:id/anonymize

**Anonymize user account (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Completely anonymizes a user account, removing personal information.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "message": "User anonymized successfully",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 404 | NotFound | User not found |

---

## Listings Module

### POST /v1/listings

**Create a new listing**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Creates a new rental listing. User must provide all required fields.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Request Body

```json
{
  "title": "Road Bike",
  "description": "Great condition road bike for weekend rides. Carbon frame, Shimano gears.",
  "categoryId": "category-uuid",
  "city": "Berlin",
  "latitude": 52.520008,
  "longitude": 13.404954,
  "address": "Mitte, Berlin, Germany",
  "condition": "Like New",
  "tagIds": ["tag-uuid-1", "tag-uuid-2"],
  "images": [
    "https://cdn.yourdomain.com/images/bike-1.jpg",
    "https://cdn.yourdomain.com/images/bike-2.jpg"
  ],
  "hourlyRate": 10,
  "dailyRate": 50,
  "weeklyRate": 280
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `title` | string | Yes | Min 5 characters |
| `description` | string | Yes | Min 20 characters |
| `categoryId` | UUID | Yes | Must be valid category |
| `city` | string | No | Min 2 characters |
| `latitude` | number | Yes | Valid latitude (-90 to 90) |
| `longitude` | number | Yes | Valid longitude (-180 to 180) |
| `address` | string | Yes | Min 5 characters |
| `condition` | string | No | Min 2 characters |
| `tagIds` | UUID[] | No | Max 5 tags |
| `images` | string[] | Yes | At least 1 image URL |
| `hourlyRate` | decimal | No | Min 0.01 |
| `dailyRate` | decimal | No | Min 0.01 |
| `weeklyRate` | decimal | No | Min 0.01 |

#### Success Response (201 Created)

```json
{
  "id": "listing-uuid",
  "title": "Road Bike",
  "description": "Great condition road bike for weekend rides.",
  "categoryId": "category-uuid",
  "ownerId": "550e8400-e29b-41d4-a716-446655440000",
  "city": "Berlin",
  "latitude": 52.520008,
  "longitude": 13.404954,
  "address": "Mitte, Berlin, Germany",
  "status": "ACTIVE",
  "images": [
    "https://cdn.yourdomain.com/images/bike-1.jpg",
    "https://cdn.yourdomain.com/images/bike-2.jpg"
  ],
  "hourlyRate": 10.00,
  "dailyRate": 50.00,
  "weeklyRate": 280.00,
  "createdAt": "2025-03-01T10:00:00.000Z",
  "updatedAt": "2025-03-01T10:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Title too short or description too short |
| 401 | Unauthorized | Missing or invalid token |
| 422 | UnprocessableEntity | Invalid category or tag IDs |

---

### GET /v1/listings

**List all active listings with filters and pagination**

- **Authentication:** Not required
- **Description:** Returns paginated list of active (non-deleted) listings. Supports searching, filtering by category/city, and sorting.

#### Query Parameters

| Parameter | Type | Required | Rules | Default |
|-----------|------|----------|-------|---------|
| `search` | string | No | Search in title/description | - |
| `category` | string | No | Filter by category slug | - |
| `city` | string | No | Filter by city name | - |
| `page` | integer | No | Page number (pagination) | 1 |
| `limit` | integer | No | Results per page (1-100) | 20 |
| `sort` | enum | No | `newest` or `price` | `newest` |

#### Example Requests

```
GET /v1/listings?search=bike&page=1&limit=20
GET /v1/listings?category=bikes&city=Berlin&sort=price
GET /v1/listings?page=2&limit=50
```

#### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "listing-uuid-1",
      "title": "Road Bike",
      "description": "Great condition road bike...",
      "categoryId": "category-uuid",
      "ownerId": "owner-uuid",
      "city": "Berlin",
      "latitude": 52.520008,
      "longitude": 13.404954,
      "address": "Mitte, Berlin, Germany",
      "status": "ACTIVE",
      "images": ["https://cdn.yourdomain.com/bike-1.jpg"],
      "hourlyRate": 10.00,
      "dailyRate": 50.00,
      "weeklyRate": 280.00,
      "createdAt": "2025-03-01T10:00:00.000Z",
      "updatedAt": "2025-03-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 245,
    "page": 1,
    "limit": 20,
    "pages": 13
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Invalid limit (must be 1-100) |

---

### GET /v1/listings/:id

**Get listing details**

- **Authentication:** Not required
- **Description:** Returns detailed information about a specific listing.

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Success Response (200 OK)

```json
{
  "id": "listing-uuid",
  "title": "Road Bike",
  "description": "Great condition road bike for weekend rides.",
  "categoryId": "category-uuid",
  "categoryName": "Bikes & Scooters",
  "ownerId": "owner-uuid",
  "ownerName": "John Doe",
  "city": "Berlin",
  "latitude": 52.520008,
  "longitude": 13.404954,
  "address": "Mitte, Berlin, Germany",
  "condition": "Like New",
  "status": "ACTIVE",
  "images": [
    "https://cdn.yourdomain.com/bike-1.jpg",
    "https://cdn.yourdomain.com/bike-2.jpg"
  ],
  "tags": ["Lightweight", "Carbon"],
  "hourlyRate": 10.00,
  "dailyRate": 50.00,
  "weeklyRate": 280.00,
  "createdAt": "2025-03-01T10:00:00.000Z",
  "updatedAt": "2025-03-01T10:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | Listing does not exist or is deleted |

---

### PATCH /v1/listings/:id

**Update listing (Owner only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Updates an existing listing. Only the listing owner can update it.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{
  "title": "Updated Title",
  "description": "Updated description...",
  "hourlyRate": 12,
  "dailyRate": 55,
  "weeklyRate": 300
}
```

#### Request Parameters

| Field | Type | Required |
|-------|------|----------|
| `title` | string | No |
| `description` | string | No |
| `city` | string | No |
| `address` | string | No |
| `condition` | string | No |
| `hourlyRate` | decimal | No |
| `dailyRate` | decimal | No |
| `weeklyRate` | decimal | No |
| `images` | string[] | No |

#### Success Response (200 OK)

```json
{
  "id": "listing-uuid",
  "title": "Updated Title",
  "description": "Updated description...",
  "hourlyRate": 12.00,
  "updatedAt": "2025-03-05T14:20:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not the listing owner |
| 404 | NotFound | Listing does not exist |

---

### DELETE /v1/listings/:id

**Delete listing (Owner only, soft delete)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Soft-deletes a listing (sets status to DELETED). Listing remains in database but is hidden from public view.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "id": "listing-uuid",
  "status": "DELETED",
  "deletedAt": "2025-03-05T14:20:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not the listing owner |
| 404 | NotFound | Listing does not exist |

---

### GET /v1/listings/nearby

**Get nearby listings**

- **Authentication:** Not required
- **Description:** Returns listings near specified coordinates (radius filtering coming soon).

#### Query Parameters

| Parameter | Type | Required | Rules |
|-----------|------|----------|-------|
| `lat` | number | Yes | Latitude (-90 to 90) |
| `lng` | number | Yes | Longitude (-180 to 180) |

#### Example Request

```
GET /v1/listings/nearby?lat=52.520008&lng=13.404954
```

#### Success Response (200 OK)

```json
[
  {
    "id": "listing-uuid-1",
    "title": "Road Bike",
    "city": "Berlin",
    "latitude": 52.520008,
    "longitude": 13.404954,
    "distance": 0.2
  },
  {
    "id": "listing-uuid-2",
    "title": "Mountain Bike",
    "city": "Berlin",
    "latitude": 52.525000,
    "longitude": 13.410000,
    "distance": 0.7
  }
]
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Invalid lat/lng values |

---

### POST /v1/listings/:id/availability/blocks

**Add availability block (Owner only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Blocks a date range when the listing is unavailable (e.g., for personal use, maintenance).

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{
  "startAt": "2025-04-01T00:00:00.000Z",
  "endAt": "2025-04-05T00:00:00.000Z",
  "reason": "Personal use"
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `startAt` | ISO DateTime | Yes | - |
| `endAt` | ISO DateTime | Yes | Must be after startAt |
| `reason` | string | No | - |

#### Success Response (201 Created)

```json
{
  "id": "block-uuid",
  "listingId": "listing-uuid",
  "startAt": "2025-04-01T00:00:00.000Z",
  "endAt": "2025-04-05T00:00:00.000Z",
  "reason": "Personal use",
  "createdAt": "2025-03-05T14:20:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Invalid date range |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not the listing owner |
| 404 | NotFound | Listing does not exist |

---

### GET /v1/listings/:id/availability

**Get availability blocks for listing**

- **Authentication:** Not required
- **Description:** Returns all availability blocks (unavailable date ranges) for a listing.

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Success Response (200 OK)

```json
[
  {
    "id": "block-uuid-1",
    "listingId": "listing-uuid",
    "startAt": "2025-04-01T00:00:00.000Z",
    "endAt": "2025-04-05T00:00:00.000Z",
    "reason": "Personal use",
    "createdAt": "2025-03-05T14:20:00.000Z"
  },
  {
    "id": "block-uuid-2",
    "listingId": "listing-uuid",
    "startAt": "2025-05-10T00:00:00.000Z",
    "endAt": "2025-05-12T00:00:00.000Z",
    "reason": "Maintenance",
    "createdAt": "2025-03-06T10:00:00.000Z"
  }
]
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | Listing does not exist |

---

### DELETE /v1/listings/:id/availability/blocks/:blockId

**Delete availability block (Owner only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Removes an availability block, making those dates available again.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |
| `blockId` | UUID | Yes |

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "message": "Availability block deleted successfully"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not the listing owner |
| 404 | NotFound | Block or listing not found |

---

### GET /v1/listings/:id/availability/calendar

**Get daily availability calendar for listing**

- **Authentication:** Not required
- **Description:** Returns a daily calendar view of availability for a listing within a date range.

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Query Parameters

| Parameter | Type | Required | Rules |
|-----------|------|----------|-------|
| `startAt` | ISO DateTime | Yes | - |
| `endAt` | ISO DateTime | Yes | Must be after startAt |

#### Example Request

```
GET /v1/listings/listing-uuid/availability/calendar?startAt=2025-04-01T00:00:00.000Z&endAt=2025-04-30T00:00:00.000Z
```

#### Success Response (200 OK)

```json
{
  "listingId": "listing-uuid",
  "startAt": "2025-04-01T00:00:00.000Z",
  "endAt": "2025-04-30T00:00:00.000Z",
  "availability": {
    "2025-04-01": "UNAVAILABLE",
    "2025-04-02": "UNAVAILABLE",
    "2025-04-03": "UNAVAILABLE",
    "2025-04-04": "UNAVAILABLE",
    "2025-04-05": "UNAVAILABLE",
    "2025-04-06": "AVAILABLE",
    "2025-04-07": "AVAILABLE",
    "2025-04-08": "BOOKED",
    "2025-04-09": "BOOKED"
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Invalid date range |
| 404 | NotFound | Listing does not exist |

---

## Bookings Module

### POST /v1/bookings

**Create a booking**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Creates a new booking request for a listing. Renter and owner can then accept/decline/cancel.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Request Body

```json
{
  "listingId": "listing-uuid",
  "startAt": "2025-03-15T10:00:00.000Z",
  "endAt": "2025-03-18T10:00:00.000Z",
  "unitPreference": "DAY"
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `listingId` | UUID | Yes | Must be valid listing |
| `startAt` | ISO DateTime | Yes | - |
| `endAt` | ISO DateTime | Yes | Must be after startAt |
| `unitPreference` | enum | No | `AUTO`, `HOUR`, `DAY`, `WEEK`, `MONTH` |

#### Success Response (201 Created)

```json
{
  "id": "booking-uuid",
  "listingId": "listing-uuid",
  "listingTitle": "Road Bike",
  "renterId": "renter-uuid",
  "ownerId": "owner-uuid",
  "startAt": "2025-03-15T10:00:00.000Z",
  "endAt": "2025-03-18T10:00:00.000Z",
  "status": "PENDING",
  "totalPrice": 150.00,
  "currency": "EUR",
  "createdAt": "2025-03-10T15:20:00.000Z",
  "updatedAt": "2025-03-10T15:20:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Invalid date range or unavailable dates |
| 401 | Unauthorized | Missing or invalid token |
| 404 | NotFound | Listing does not exist |

---

### GET /v1/bookings

**List user's bookings**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Returns paginated list of user's bookings (either as renter or owner).

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Query Parameters

| Parameter | Type | Required | Rules | Default |
|-----------|------|----------|-------|---------|
| `role` | enum | No | `renter` or `owner` | `renter` |

#### Example Requests

```
GET /v1/bookings?role=renter
GET /v1/bookings?role=owner
```

#### Success Response (200 OK)

```json
[
  {
    "id": "booking-uuid-1",
    "listingId": "listing-uuid",
    "listingTitle": "Road Bike",
    "renterId": "renter-uuid",
    "ownerId": "owner-uuid",
    "otherPartyName": "John Doe",
    "startAt": "2025-03-15T10:00:00.000Z",
    "endAt": "2025-03-18T10:00:00.000Z",
    "status": "PENDING",
    "totalPrice": 150.00,
    "currency": "EUR",
    "createdAt": "2025-03-10T15:20:00.000Z"
  },
  {
    "id": "booking-uuid-2",
    "listingId": "listing-uuid-2",
    "listingTitle": "Mountain Bike",
    "renterId": "renter-uuid",
    "ownerId": "owner-uuid-2",
    "otherPartyName": "Jane Smith",
    "startAt": "2025-04-01T10:00:00.000Z",
    "endAt": "2025-04-05T10:00:00.000Z",
    "status": "ACCEPTED",
    "totalPrice": 200.00,
    "currency": "EUR",
    "createdAt": "2025-03-12T09:00:00.000Z"
  }
]
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### GET /v1/bookings/:id

**Get booking details (Renter or Owner only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Returns details of a specific booking. Only the renter or owner can view.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Success Response (200 OK)

```json
{
  "id": "booking-uuid",
  "listingId": "listing-uuid",
  "listingTitle": "Road Bike",
  "listingImages": ["https://cdn.yourdomain.com/bike-1.jpg"],
  "renterId": "renter-uuid",
  "renterName": "Jane Smith",
  "ownerId": "owner-uuid",
  "ownerName": "John Doe",
  "startAt": "2025-03-15T10:00:00.000Z",
  "endAt": "2025-03-18T10:00:00.000Z",
  "status": "PENDING",
  "totalPrice": 150.00,
  "currency": "EUR",
  "paymentHeld": false,
  "paymentHeldAt": null,
  "completedByRenter": false,
  "completedByOwner": false,
  "createdAt": "2025-03-10T15:20:00.000Z",
  "updatedAt": "2025-03-10T15:20:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not renter or owner of this booking |
| 404 | NotFound | Booking does not exist |

---

### POST /v1/bookings/:id/payment

**Update booking payment info (Renter only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Updates payment/hold information for a booking. Renter confirms payment.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{
  "paymentHeld": true
}
```

#### Request Parameters

| Field | Type | Required |
|-------|------|----------|
| `paymentHeld` | boolean | Yes |

#### Success Response (200 OK)

```json
{
  "id": "booking-uuid",
  "status": "PENDING",
  "paymentHeld": true,
  "paymentHeldAt": "2025-03-10T15:30:00.000Z",
  "totalPrice": 150.00,
  "updatedAt": "2025-03-10T15:30:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not the renter of this booking |
| 404 | NotFound | Booking does not exist |

---

### POST /v1/bookings/:id/accept

**Accept booking (Owner only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Owner accepts the booking request, moving status from PENDING to ACCEPTED.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "id": "booking-uuid",
  "status": "ACCEPTED",
  "acceptedAt": "2025-03-11T10:00:00.000Z",
  "updatedAt": "2025-03-11T10:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Booking is not in PENDING status |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not the owner of this booking |
| 404 | NotFound | Booking does not exist |

---

### POST /v1/bookings/:id/decline

**Decline booking (Owner only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Owner declines the booking request.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "id": "booking-uuid",
  "status": "DECLINED",
  "declinedAt": "2025-03-11T10:00:00.000Z",
  "updatedAt": "2025-03-11T10:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Booking is not in PENDING status |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not the owner of this booking |
| 404 | NotFound | Booking does not exist |

---

### POST /v1/bookings/:id/cancel

**Cancel booking (Renter only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Renter cancels the booking request.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "id": "booking-uuid",
  "status": "CANCELLED",
  "cancelledAt": "2025-03-11T10:00:00.000Z",
  "updatedAt": "2025-03-11T10:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Booking cannot be cancelled in current status |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not the renter of this booking |
| 404 | NotFound | Booking does not exist |

---

### POST /v1/bookings/:id/complete

**Mark booking completion**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Either renter or owner marks their part of the booking as complete (e.g., return/delivery).

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{
  "completedByParty": "renter",
  "notes": "Item returned in excellent condition"
}
```

#### Request Parameters

| Field | Type | Required |
|-------|------|----------|
| `completedByParty` | enum | Yes | `renter` or `owner` |
| `notes` | string | No | Optional completion notes |

#### Success Response (200 OK)

```json
{
  "id": "booking-uuid",
  "status": "COMPLETED",
  "completedByRenter": true,
  "completedByOwner": false,
  "renterCompletionNotes": "Item returned in excellent condition",
  "completedAt": "2025-03-18T15:00:00.000Z",
  "updatedAt": "2025-03-18T15:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Booking not in ACCEPTED or COMPLETED status |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not a participant in this booking |
| 404 | NotFound | Booking does not exist |

---

### POST /v1/bookings/:id/issues

**Report booking issue (Participant only)**

- **Authentication:** Required (JWT Bearer Token)
- **Description:** Renter or owner reports an issue with the booking (e.g., item damaged, late return).

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{
  "issueType": "ITEM_DAMAGED",
  "description": "The bike handlebars are bent"
}
```

#### Request Parameters

| Field | Type | Required |
|-------|------|----------|
| `issueType` | enum | Yes | Issue category (e.g., `ITEM_DAMAGED`, `LATE_RETURN`, `NO_SHOW`) |
| `description` | string | Yes | Detailed description of the issue |

#### Success Response (201 Created)

```json
{
  "id": "issue-uuid",
  "bookingId": "booking-uuid",
  "reportedByUserId": "user-uuid",
  "issueType": "ITEM_DAMAGED",
  "description": "The bike handlebars are bent",
  "status": "OPEN",
  "createdAt": "2025-03-18T15:30:00.000Z",
  "updatedAt": "2025-03-18T15:30:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not a participant in this booking |
| 404 | NotFound | Booking does not exist |

---

## Categories Module

### GET /v1/categories

**List all active categories (Public)**

- **Authentication:** Not required
- **Description:** Returns all active categories available for browsing and filtering listings.

#### Success Response (200 OK)

```json
[
  {
    "id": "category-uuid-1",
    "name": "Bikes & Scooters",
    "slug": "bikes-scooters",
    "description": "Bicycles, e-scooters, and other wheeled items",
    "icon": "🚴",
    "color": "#FF6B6B",
    "sortOrder": 1,
    "isActive": true
  },
  {
    "id": "category-uuid-2",
    "name": "Tools & DIY",
    "slug": "tools-diy",
    "description": "Power tools, hand tools, and DIY equipment",
    "icon": "🔧",
    "color": "#F59E0B",
    "sortOrder": 2,
    "isActive": true
  }
]
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| - | - | Always succeeds (empty array if none exist) |

---

### GET /v1/categories/:slug

**Get category by slug (Public)**

- **Authentication:** Not required
- **Description:** Returns details of a specific category by its slug.

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `slug` | string | Yes |

#### Example Request

```
GET /v1/categories/bikes-scooters
```

#### Success Response (200 OK)

```json
{
  "id": "category-uuid",
  "name": "Bikes & Scooters",
  "slug": "bikes-scooters",
  "description": "Bicycles, e-scooters, and other wheeled items",
  "icon": "🚴",
  "color": "#FF6B6B",
  "sortOrder": 1,
  "isActive": true,
  "listingCount": 42
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | Category slug does not exist |

---

### POST /v1/admin/categories

**Create category (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Creates a new category. Only admins can create categories.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### Request Body

```json
{
  "name": "Tools & DIY",
  "description": "Power tools, hand tools, and DIY equipment",
  "icon": "🔧",
  "color": "#F59E0B",
  "sortOrder": 2,
  "isActive": true
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Min 2, Max 50 characters |
| `description` | string | No | Max 255 characters |
| `icon` | string | No | Max 10 characters (emoji or symbol) |
| `color` | string | No | Hex color code (e.g., `#F59E0B`) |
| `sortOrder` | integer | No | 0-9999, default 0 |
| `isActive` | boolean | No | Default true |

#### Success Response (201 Created)

```json
{
  "id": "category-uuid",
  "name": "Tools & DIY",
  "slug": "tools-diy",
  "description": "Power tools, hand tools, and DIY equipment",
  "icon": "🔧",
  "color": "#F59E0B",
  "sortOrder": 2,
  "isActive": true,
  "createdAt": "2025-03-15T10:00:00.000Z",
  "updatedAt": "2025-03-15T10:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 409 | Conflict | Category name already exists |

---

### GET /v1/admin/categories

**List all categories with filters (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Returns all categories (active and inactive) for admin management.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### Query Parameters

| Parameter | Type | Required | Rules |
|-----------|------|----------|-------|
| `search` | string | No | Search in name/description |
| `isActive` | boolean | No | Filter by active status |
| `page` | integer | No | Page number |
| `limit` | integer | No | Results per page (1-100) |

#### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "category-uuid-1",
      "name": "Bikes & Scooters",
      "slug": "bikes-scooters",
      "description": "Bicycles, e-scooters, and other wheeled items",
      "icon": "🚴",
      "color": "#FF6B6B",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |

---

### GET /v1/admin/categories/:id

**Get category by ID (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Returns detailed information about a specific category.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Success Response (200 OK)

```json
{
  "id": "category-uuid",
  "name": "Bikes & Scooters",
  "slug": "bikes-scooters",
  "description": "Bicycles, e-scooters, and other wheeled items",
  "icon": "🚴",
  "color": "#FF6B6B",
  "sortOrder": 1,
  "isActive": true,
  "listingCount": 42,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-03-10T14:30:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 404 | NotFound | Category does not exist |

---

### PATCH /v1/admin/categories/:id

**Update category (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Updates category information.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#00FF00",
  "isActive": false
}
```

#### Request Parameters

All fields optional (omitted fields are not updated).

#### Success Response (200 OK)

```json
{
  "id": "category-uuid",
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#00FF00",
  "isActive": false,
  "updatedAt": "2025-03-15T11:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 404 | NotFound | Category does not exist |

---

### DELETE /v1/admin/categories/:id

**Delete/disable category (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Disables/deletes a category. Category is marked inactive.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "message": "Category deleted successfully"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 404 | NotFound | Category does not exist |

---

## Tags Module

### GET /v1/tags

**List all active tags (Public)**

- **Authentication:** Not required
- **Description:** Returns all active tags for filtering listings.

#### Success Response (200 OK)

```json
[
  {
    "id": "tag-uuid-1",
    "name": "Lightweight",
    "slug": "lightweight",
    "isActive": true
  },
  {
    "id": "tag-uuid-2",
    "name": "Carbon Frame",
    "slug": "carbon-frame",
    "isActive": true
  }
]
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| - | - | Always succeeds |

---

### POST /v1/admin/tags

**Create tag (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Creates a new tag.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### Request Body

```json
{
  "name": "Lightweight",
  "isActive": true
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Min 2, Max 50 characters |
| `isActive` | boolean | No | Default true |

#### Success Response (201 Created)

```json
{
  "id": "tag-uuid",
  "name": "Lightweight",
  "slug": "lightweight",
  "isActive": true,
  "createdAt": "2025-03-15T10:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 409 | Conflict | Tag already exists |

---

### GET /v1/admin/tags

**List all tags (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Returns all tags (active and inactive).

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### Query Parameters

| Parameter | Type | Required |
|-----------|------|----------|
| `search` | string | No |
| `isActive` | boolean | No |
| `page` | integer | No |
| `limit` | integer | No |

#### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "tag-uuid-1",
      "name": "Lightweight",
      "slug": "lightweight",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |

---

### GET /v1/admin/tags/:id

**Get tag by ID (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Success Response (200 OK)

```json
{
  "id": "tag-uuid",
  "name": "Lightweight",
  "slug": "lightweight",
  "isActive": true,
  "usageCount": 12,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 404 | NotFound | Tag does not exist |

---

### PATCH /v1/admin/tags/:id

**Update tag (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{
  "name": "Updated Tag Name",
  "isActive": false
}
```

#### Success Response (200 OK)

```json
{
  "id": "tag-uuid",
  "name": "Updated Tag Name",
  "slug": "updated-tag-name",
  "isActive": false,
  "updatedAt": "2025-03-15T11:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 404 | NotFound | Tag does not exist |

---

### DELETE /v1/admin/tags/:id

**Delete tag (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Yes |

#### Request Body

```json
{}
```

#### Success Response (200 OK)

```json
{
  "message": "Tag deleted successfully"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |
| 404 | NotFound | Tag does not exist |

---

## Quotes Module

### POST /v1/quotes

**Get price quote for listing**

- **Rate Limit:** 20 requests per 60 seconds
- **Authentication:** Not required
- **Description:** Calculates a price quote for renting a listing for a specific date range and unit preference.

#### Request Body

```json
{
  "listingId": "listing-uuid",
  "startAt": "2025-03-15T10:00:00.000Z",
  "endAt": "2025-03-18T10:00:00.000Z",
  "unitPreference": "DAY"
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `listingId` | UUID | Yes | Must be valid listing |
| `startAt` | ISO DateTime | Yes | - |
| `endAt` | ISO DateTime | Yes | Must be after startAt |
| `unitPreference` | enum | No | `AUTO`, `HOUR`, `DAY`, `WEEK`, `MONTH` |

#### Success Response (200 OK)

```json
{
  "listingId": "listing-uuid",
  "listingTitle": "Road Bike",
  "startAt": "2025-03-15T10:00:00.000Z",
  "endAt": "2025-03-18T10:00:00.000Z",
  "unitUsed": "DAY",
  "units": 3,
  "unitPrice": 50.00,
  "subtotal": 150.00,
  "serviceFee": 15.00,
  "totalPrice": 165.00,
  "currency": "EUR",
  "breakdown": {
    "hourlyRate": null,
    "dailyRate": 50.00,
    "weeklyRate": null,
    "daysBooked": 3
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | BadRequest | Invalid date range |
| 404 | NotFound | Listing does not exist |

---

## Upload Module

### POST /v1/api/upload-url

**Generate presigned URL for cloud upload**

- **Rate Limit:** 20 requests per 60 seconds
- **Authentication:** Required (JWT Bearer Token)
- **Description:** Generates a presigned URL for direct upload to cloud storage (Cloudflare R2) and returns a public URL for storing in the database.

#### Request Headers

```
Authorization: Bearer <accessToken>
```

#### Request Body

```json
{
  "fileType": "image",
  "extension": "jpg",
  "folder": "listings"
}
```

#### Request Parameters

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `fileType` | enum | Yes | `image`, `video`, `document`, etc. |
| `extension` | string | Yes | File extension (e.g., `jpg`, `png`, `pdf`) |
| `folder` | string | Yes | Storage folder (e.g., `listings`, `avatars`) |

#### Success Response (201 Created)

```json
{
  "signedUrl": "https://your-bucket.r2.cloudflarestorage.com/listings/image-123456-abc123.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "publicUrl": "https://cdn.yourdomain.com/listings/image-123456-abc123.jpg",
  "key": "listings/image-123456-abc123.jpg"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 400 | BadRequest | Invalid file type or extension |

---

## Legal & Terms Module

### GET /v1/legal/privacy

**Get privacy policy**

- **Authentication:** Not required
- **Description:** Returns the current privacy policy document.

#### Success Response (200 OK)

```json
{
  "type": "privacy",
  "version": 1,
  "content": "# Privacy Policy\n\nYour privacy is important to us...",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "effectiveAt": "2025-01-01T00:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | Privacy policy not available |

---

### GET /v1/legal/terms

**Get terms of service**

- **Authentication:** Not required
- **Description:** Returns the current terms of service document.

#### Success Response (200 OK)

```json
{
  "type": "terms",
  "version": 1,
  "content": "# Terms of Service\n\n...",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "effectiveAt": "2025-01-01T00:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | Terms not available |

---

### GET /v1/legal/retention

**Get data retention policy**

- **Authentication:** Not required
- **Description:** Returns the data retention policy document.

#### Success Response (200 OK)

```json
{
  "type": "retention",
  "version": 1,
  "content": "# Data Retention Policy\n\n...",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "effectiveAt": "2025-01-01T00:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | Retention policy not available |

---

### GET /v1/legal/versions

**Get available legal document versions**

- **Authentication:** Not required
- **Description:** Returns metadata about all available versions of legal documents.

#### Success Response (200 OK)

```json
{
  "privacy": [
    { "version": 1, "effectiveAt": "2025-01-01T00:00:00.000Z" }
  ],
  "terms": [
    { "version": 1, "effectiveAt": "2025-01-01T00:00:00.000Z" },
    { "version": 2, "effectiveAt": "2025-02-15T00:00:00.000Z" }
  ],
  "retention": [
    { "version": 1, "effectiveAt": "2025-01-01T00:00:00.000Z" }
  ]
}
```

---

### GET /v1/tos/current

**Get current active Terms of Service**

- **Authentication:** Not required
- **Description:** Returns the currently active Terms of Service. Supports multiple locales.

#### Query Parameters

| Parameter | Type | Required | Rules | Default |
|-----------|------|----------|-------|---------|
| `locale` | string | No | Language code (e.g., `en`, `de`, `fr`) | `en` |

#### Example Request

```
GET /v1/tos/current?locale=en
```

#### Success Response (200 OK)

```json
{
  "version": 1,
  "locale": "en",
  "content": "# Terms of Service\n\n...",
  "effectiveAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | Terms of Service not found for locale |

---

### GET /v1/tos/:version

**Get specific Terms of Service version**

- **Authentication:** Not required
- **Description:** Returns a specific version of the Terms of Service.

#### URL Parameters

| Field | Type | Required |
|-------|------|----------|
| `version` | integer | Yes |

#### Query Parameters

| Parameter | Type | Required | Rules | Default |
|-----------|------|----------|-------|---------|
| `locale` | string | No | Language code | `en` |

#### Example Request

```
GET /v1/tos/2?locale=en
```

#### Success Response (200 OK)

```json
{
  "version": 2,
  "locale": "en",
  "content": "# Terms of Service v2\n\n...",
  "effectiveAt": "2025-02-15T00:00:00.000Z",
  "updatedAt": "2025-02-15T00:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | NotFound | Specific ToS version not found |

---

### POST /v1/tos

**Create new Terms of Service version (Admin only)**

- **Authentication:** Required (JWT Bearer Token + Admin Role)
- **Description:** Creates a new version of the Terms of Service. Admins only.

#### Request Headers

```
Authorization: Bearer <adminAccessToken>
```

#### Request Body

```json
{
  "content": "# Terms of Service v3\n\n...",
  "locale": "en",
  "effectiveAt": "2025-04-01T00:00:00.000Z"
}
```

#### Request Parameters

| Field | Type | Required |
|-------|------|----------|
| `content` | string | Yes |
| `locale` | string | Yes |
| `effectiveAt` | ISO DateTime | Yes |

#### Success Response (201 Created)

```json
{
  "version": 3,
  "locale": "en",
  "content": "# Terms of Service v3\n\n...",
  "effectiveAt": "2025-04-01T00:00:00.000Z",
  "createdAt": "2025-03-20T10:00:00.000Z"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not an admin user |

---

## Home & Taxonomy Module

### GET /v1/home

**Get homepage data**

- **Authentication:** Not required
- **Description:** Returns homepage data including featured categories, banners, and sections.

#### Query Parameters

| Parameter | Type | Required | Rules |
|-----------|------|----------|-------|
| `locale` | string | No | Language code (e.g., `en`) |

#### Success Response (200 OK)

```json
{
  "sections": [
    {
      "id": "featured-categories",
      "title": "Popular Categories",
      "items": [
        {
          "id": "category-uuid",
          "name": "Bikes & Scooters",
          "slug": "bikes-scooters",
          "icon": "🚴",
          "color": "#FF6B6B"
        }
      ]
    }
  ],
  "banners": [
    {
      "id": "banner-uuid",
      "title": "Rent or Lend",
      "description": "Find what you need or earn money by renting",
      "imageUrl": "https://cdn.yourdomain.com/banner.jpg",
      "ctaUrl": "/listings"
    }
  ]
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| - | - | Always succeeds |

---

### GET /v1/taxonomy

**Get combined categories and tags (Public, cached)**

- **Authentication:** Not required
- **Description:** Returns all active categories and tags combined. Useful for mobile apps and static pages. Results are heavily cached.

#### Success Response (200 OK)

```json
{
  "categories": [
    {
      "id": "category-uuid-1",
      "name": "Bikes & Scooters",
      "slug": "bikes-scooters",
      "icon": "🚴",
      "color": "#FF6B6B"
    }
  ],
  "tags": [
    {
      "id": "tag-uuid-1",
      "name": "Lightweight",
      "slug": "lightweight"
    }
  ]
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| - | - | Always succeeds |

---

## Root Endpoint

### GET /

**Health check**

- **Authentication:** Not required
- **Description:** Simple health check endpoint.

#### Success Response (200 OK)

```
Hello world!
```

---

## Common Patterns & Best Practices

### Authentication Flow

1. **Register or Login** → Get `accessToken` and `refreshToken`
2. **Use `accessToken`** for subsequent authenticated requests
3. **When `accessToken` expires** (401 error) → Use `refreshToken` to get new tokens via `/v1/auth/refresh`
4. **On logout** → Call `/v1/auth/logout` to invalidate refresh token

### Pagination

Endpoints that support pagination use these query parameters:

```
?page=1&limit=20
```

Response includes metadata:

```json
{
  "data": [...],
  "meta": {
    "total": 245,
    "page": 1,
    "limit": 20,
    "pages": 13
  }
}
```

### Filtering & Searching

Most list endpoints support:

```
?search=query&category=value&page=1&limit=20
```

### Sorting

Some endpoints support sorting:

```
?sort=newest   // or price
```

### Date Range Queries

Calendar and availability endpoints often require start/end dates:

```
?startAt=2025-04-01T00:00:00.000Z&endAt=2025-04-30T00:00:00.000Z
```

---

## Error Handling Best Practices

### Always Check Status Code

```javascript
if (response.status === 401) {
  // Token expired or invalid - refresh or redirect to login
}

if (response.status === 403) {
  // User doesn't have permission - show permission denied error
}

if (response.status === 404) {
  // Resource not found
}
```

### Parse Error Message

```javascript
const error = await response.json();
console.log(error.message); // "Email already registered"
```

### Handle Rate Limiting

```javascript
if (response.status === 429) {
  // Wait and retry after X seconds
  const resetTime = response.headers.get('X-RateLimit-Reset');
}
```

---

## Quick Reference: All Endpoints

| Method | Path | Auth | Rate Limit |
|--------|------|------|-----------|
| POST | `/v1/auth/register` | No | 5/60s |
| POST | `/v1/auth/login` | No | 8/60s |
| GET | `/v1/auth/me` | Yes | - |
| POST | `/v1/auth/refresh` | No | 30/60s |
| POST | `/v1/auth/logout` | No | - |
| GET | `/v1/users/me` | Yes | - |
| PATCH | `/v1/users/me` | Yes | - |
| GET | `/v1/users/me/data` | Yes | - |
| POST | `/v1/users/me/delete-request` | Yes | - |
| GET | `/v1/users/me/tos-agreement-latest` | Yes | - |
| GET | `/v1/users/:id/tos-agreements` | Yes (Admin) | - |
| GET | `/v1/users/:id` | No | - |
| POST | `/v1/admin/users/:id/anonymize` | Yes (Admin) | - |
| POST | `/v1/listings` | Yes | - |
| GET | `/v1/listings` | No | - |
| GET | `/v1/listings/:id` | No | - |
| PATCH | `/v1/listings/:id` | Yes (Owner) | - |
| DELETE | `/v1/listings/:id` | Yes (Owner) | - |
| GET | `/v1/listings/nearby` | No | - |
| POST | `/v1/listings/:id/availability/blocks` | Yes (Owner) | - |
| GET | `/v1/listings/:id/availability` | No | - |
| DELETE | `/v1/listings/:id/availability/blocks/:blockId` | Yes (Owner) | - |
| GET | `/v1/listings/:id/availability/calendar` | No | - |
| POST | `/v1/bookings` | Yes | - |
| GET | `/v1/bookings` | Yes | - |
| GET | `/v1/bookings/:id` | Yes (Participant) | - |
| POST | `/v1/bookings/:id/payment` | Yes (Renter) | - |
| POST | `/v1/bookings/:id/accept` | Yes (Owner) | - |
| POST | `/v1/bookings/:id/decline` | Yes (Owner) | - |
| POST | `/v1/bookings/:id/cancel` | Yes (Renter) | - |
| POST | `/v1/bookings/:id/complete` | Yes (Participant) | - |
| POST | `/v1/bookings/:id/issues` | Yes (Participant) | - |
| GET | `/v1/categories` | No | - |
| GET | `/v1/categories/:slug` | No | - |
| POST | `/v1/admin/categories` | Yes (Admin) | - |
| GET | `/v1/admin/categories` | Yes (Admin) | - |
| GET | `/v1/admin/categories/:id` | Yes (Admin) | - |
| PATCH | `/v1/admin/categories/:id` | Yes (Admin) | - |
| DELETE | `/v1/admin/categories/:id` | Yes (Admin) | - |
| GET | `/v1/tags` | No | - |
| POST | `/v1/admin/tags` | Yes (Admin) | - |
| GET | `/v1/admin/tags` | Yes (Admin) | - |
| GET | `/v1/admin/tags/:id` | Yes (Admin) | - |
| PATCH | `/v1/admin/tags/:id` | Yes (Admin) | - |
| DELETE | `/v1/admin/tags/:id` | Yes (Admin) | - |
| POST | `/v1/quotes` | No | 20/60s |
| POST | `/v1/api/upload-url` | Yes | 20/60s |
| GET | `/v1/legal/privacy` | No | - |
| GET | `/v1/legal/terms` | No | - |
| GET | `/v1/legal/retention` | No | - |
| GET | `/v1/legal/versions` | No | - |
| GET | `/v1/tos/current` | No | - |
| GET | `/v1/tos/:version` | No | - |
| POST | `/v1/tos` | Yes (Admin) | - |
| GET | `/v1/home` | No | - |
| GET | `/v1/taxonomy` | No | - |
| GET | `/` | No | - |

---

**End of API Documentation**
