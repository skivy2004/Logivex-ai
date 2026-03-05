## Logivex – High-level architecture

This document implements the high-level architecture described in the original SaaS plan for Logivex, adapted to coexist with the current simple Node.js + Express quote form. It defines the target stack, MVP scope, core data model, integration contracts, and UX flows.

---

## 1. Tech stack (chosen)

- **Frontend & API**: Next.js (App Router) with **TypeScript**
  - Server Components for most pages
  - Client Components only where interactivity is needed (forms, dashboards, filters)
- **Backend runtime**: Node.js (via Next.js)
- **Database**: PostgreSQL
  - Managed Postgres (e.g. Supabase, Neon, RDS, etc.) for production
- **ORM**: Prisma
  - Single schema for multi-tenant app
- **Authentication**: NextAuth (Auth.js)
  - Email/password or magic links for initial version
  - Session-based auth with JWTs if needed for APIs
- **Email provider**: Resend or SendGrid
  - Transactional emails for signup, invitations, and quote notifications
- **Billing**: Stripe Billing
  - Subscriptions per company (tenant)
  - Stripe Customer per company
- **Background / async work**:
  - For v1, use simple job queues implemented with database tables and cron-like scheduled routes (e.g. Next.js Route Handlers triggered via external scheduler)
  - Optional future upgrade to a dedicated queue (e.g. BullMQ + Redis)
- **External APIs**:
  - Google Maps Platform (Distance Matrix + possibly Places, if needed for address quality in-app)
  - Make.com webhooks (both directions)

The current **Express app** in this repository remains as:

- A lightweight front-door for early quotes and Make.com integration.
- A potential migration path: later, the Next.js app can either replace this Express app or sit alongside it, gradually moving functionality.

---

## 2. MVP scope (features per phase)

### 2.1. First deployable SaaS version (MVP)

**Core capabilities**

- Multi-tenant structure:
  - Company accounts with a single owner and basic admin/dispatcher roles.
- Authentication:
  - Owner signs up, creates a company, invites team members.
  - Simple email-based login (magic links or email/password).
- Basic master data:
  - Vehicle types per company (e.g. Van, 7.5t Truck, Artic).
  - Service types (FTL, LTL, express, refrigerated).
- Customer and contact management:
  - CRUD for customers.
  - One or more contacts (emails) per customer.
- Quote creation and management:
  - Create quotes with:
    - Pickup and dropoff address
    - Service type and vehicle type
    - Date + free-form notes
  - Optional distance field (either manual or from a background process).
  - Statuses: `draft`, `sent`, `accepted`, `declined`, `expired`.
  - Internal reference number and validity date.
- Email sending:
  - Send quote emails directly from the app using the email provider.
  - Track `sent` status and basic open tracking (if supported).
- Basic Make.com integration:
  - Outbound webhook on key events:
    - `onQuoteCreated`
    - `onQuoteSent`
    - `onQuoteAccepted`
  - Inbound endpoint for Make.com to create/update a quote if needed.

**Out of scope for MVP**

- Full-blown client portal (read-only public quote pages are allowed).
- Complex reporting and dashboards.
- Advanced role-based access control beyond owner/admin/dispatcher.
- Complex pricing rules UI (these can initially live in Make scenarios or custom internal logic).

### 2.2. Phase 2 and later

- Client portal:
  - Public tokenized URLs for quotes (already part of plan, but can be hardened later).
  - Quote acceptance with optional PO reference and notes.
  - History of accepted quotes for customers with simple login or token-based access.
- Advanced reporting:
  - Conversion rate, quotes per customer, per lane, per vehicle type.
  - Time-to-quote metrics.
- Configurable pricing rules:
  - UI for per-vehicle, per-lane, and per-customer rules.
  - Versioning of pricing strategies.
- More granular roles:
  - Dispatcher teams, read-only roles, etc.
- Deeper Make.com integration:
  - Multiple endpoints per event type.
  - Configurable payload templates.

---

## 3. Data model (Prisma-style schema)

This section documents the core relational schema. It does **not** create the actual database yet but is meant to guide the Prisma schema.

```prisma
// Example Prisma schema snippet (not exhaustive)

model Company {
  id            String    @id @default(cuid())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  name          String
  slug          String    @unique
  email         String
  logoUrl       String?   // branding
  defaultCurrency String   @default("EUR")
  timeZone      String     @default("Europe/Berlin")

  stripeCustomerId String?
  stripeSubscriptionId String?
  plan            Plan         @default(BASIC)

  settings       Json?

  users          User[]
  customers      Customer[]
  vehicleTypes   VehicleType[]
  serviceTypes   ServiceType[]
  quotes         Quote[]
  automationEndpoints AutomationEndpoint[]
}

enum Plan {
  BASIC
  PRO
  ENTERPRISE
}

model User {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  email       String   @unique
  name        String?
  role        UserRole @default(DISPATCHER)

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])

  // Auth-related fields (depends on NextAuth adapter)
  // Example (if using email/password in addition to provider-based auth):
  passwordHash String?
}

enum UserRole {
  OWNER
  ADMIN
  DISPATCHER
}

model Customer {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])

  name        String
  reference   String?  // internal reference code
  billingAddress String?
  notes       String?

  contacts    Contact[]
  quotes      Quote[]
}

model Contact {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])

  name        String?
  email       String
  phone       String?
  isPrimary   Boolean  @default(false)
}

model VehicleType {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])

  name        String   // e.g. "Van", "7.5t Truck"
  code        String?  // short code

  maxWeightKg Float?
  volumeM3    Float?

  basePriceCents Int?  // optional convenience field
}

model ServiceType {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])

  name        String   // e.g. "FTL", "LTL", "Express"
  description String?
}

model Quote {
  id          String       @id @default(cuid())
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  companyId   String
  company     Company      @relation(fields: [companyId], references: [id])

  customerId  String
  customer    Customer     @relation(fields: [customerId], references: [id])

  contactId   String?
  contact     Contact?     @relation(fields: [contactId], references: [id])

  createdById String
  createdBy   User         @relation(fields: [createdById], references: [id])

  status      QuoteStatus  @default(DRAFT)

  reference   String?      @unique
  externalRef String?      // e.g. from TMS/CRM

  pickupAddress   String
  dropoffAddress  String
  pickupDate      DateTime

  distanceMeters  Int?
  durationSeconds Int?

  vehicleTypeId   String?
  vehicleType     VehicleType? @relation(fields: [vehicleTypeId], references: [id])

  serviceTypeId   String?
  serviceType     ServiceType? @relation(fields: [serviceTypeId], references: [id])

  currency        String       @default("EUR")
  basePriceCents  Int?
  totalPriceCents Int?

  validUntil      DateTime?
  notes           String?

  publicToken     String?      @unique

  items           QuoteItem[]
  events          QuoteEvent[]
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  DECLINED
  EXPIRED
}

model QuoteItem {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  quoteId     String
  quote       Quote    @relation(fields: [quoteId], references: [id])

  label       String
  description String?
  amountCents Int
}

model QuoteEvent {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  quoteId     String
  quote       Quote    @relation(fields: [quoteId], references: [id])

  type        String   // e.g. "CREATED", "SENT", "ACCEPTED", "VIEWED"
  data        Json?
}

model AutomationEndpoint {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])

  eventType   String   // e.g. "onQuoteCreated", "onQuoteAccepted"
  url         String
  secret      String?  // for signing payloads (HMAC)
  enabled     Boolean  @default(true)
}
```

---

## 4. Integration contracts with Make.com

### 4.1. Outbound (app → Make.com)

The app triggers HTTP POST requests to Make.com when notable events occur. Each company can configure one or more `AutomationEndpoint` records per event type.

**Common HTTP request pattern**

- Method: `POST`
- URL: `AutomationEndpoint.url`
- Headers:
  - `Content-Type: application/json`
  - `X-Logivex-Event: <eventType>` (e.g. `onQuoteCreated`)
  - `X-Logivex-Company-Id: <companyId>`
  - `X-Logivex-Signature: <HMAC_SHA256>` (optional if `secret` is present)

**Example payload: `onQuoteCreated`**

```json
{
  "eventType": "onQuoteCreated",
  "occurredAt": "2026-03-04T10:15:30.000Z",
  "company": {
    "id": "cmp_123",
    "name": "Acme Logistics",
    "plan": "PRO"
  },
  "quote": {
    "id": "qt_456",
    "reference": "ACM-2026-00045",
    "status": "DRAFT",
    "pickupAddress": "123 Warehouse St, Berlin",
    "dropoffAddress": "45 Distribution Rd, Hamburg",
    "pickupDate": "2026-03-05",
    "distanceMeters": 325000,
    "distanceText": "325 km",
    "currency": "EUR",
    "basePriceCents": null,
    "totalPriceCents": null,
    "vehicleType": "7.5t Truck",
    "serviceType": "FTL"
  },
  "customer": {
    "id": "cust_789",
    "name": "Client GmbH"
  },
  "contact": {
    "id": "ct_001",
    "name": "Jane Doe",
    "email": "jane.doe@client.com"
  },
  "meta": {
    "source": "web-app",
    "version": "1.0.0"
  }
}
```

**Example payload: `onQuoteSent`**

Same structure, but with:

- `eventType: "onQuoteSent"`
- `quote.status: "SENT"`
- Additional field: `emailMessageId` if available from email provider.

**Example payload: `onQuoteAccepted`**

- `eventType: "onQuoteAccepted"`
- `quote.status: "ACCEPTED"`
- Additional fields:
  - `acceptedAt`
  - Optional `poNumber`, `customerNotes`.

**Signature calculation (optional)**

If `AutomationEndpoint.secret` is set:

- Compute `HMAC_SHA256(secret, rawBody)` where `rawBody` is the exact JSON string of the payload.
- Hex-encode the result and send as `X-Logivex-Signature`.

Make.com scenarios can then:

- Validate the `X-Logivex-Signature` against the request body.
- Branch logic based on `eventType`.

### 4.2. Inbound (Make.com → app)

Endpoint: `POST /api/make/quotes`

- Purpose: allow Make.com scenarios to create or update quotes in Logivex (for example, when a CRM event occurs or when a complex pricing engine runs externally).

**Authentication**

- Header: `X-Logivex-Api-Key: <companyApiKey>`
  - `companyApiKey` is stored in the `Company.settings` JSON and rotated by admins if needed.

**Request payload**

```json
{
  "externalRef": "CRM-12345",
  "companyId": "cmp_123",
  "customer": {
    "name": "Client GmbH",
    "billingAddress": "Invoice St 1, Berlin",
    "reference": "C-001"
  },
  "contact": {
    "name": "Jane Doe",
    "email": "jane.doe@client.com",
    "phone": "+49 123 456 789"
  },
  "route": {
    "pickupAddress": "123 Warehouse St, Berlin",
    "dropoffAddress": "45 Distribution Rd, Hamburg",
    "pickupDate": "2026-03-05"
  },
  "shipment": {
    "weightKg": 500,
    "colli": 10,
    "packagingType": "Pallet"
  },
  "pricing": {
    "distanceMeters": 325000,
    "currency": "EUR",
    "totalPriceCents": 45000,
    "breakdown": [
      {
        "label": "Base transport",
        "amountCents": 40000
      },
      {
        "label": "Fuel surcharge",
        "amountCents": 5000
      }
    ]
  },
  "status": "SENT",
  "notes": "Priority load."
}
```

**Response**

- `201 Created` with:

```json
{
  "success": true,
  "quoteId": "qt_456",
  "reference": "ACM-2026-00045",
  "publicUrl": "https://app.logivex.com/quote/qt_public_token",
  "status": "SENT"
}
```

- Error responses:
  - `401` if API key invalid.
  - `400` if payload invalid.
  - `500` for unexpected server errors.

---

## 5. UX flows

### 5.1. Dispatcher flow – creating and sending a quote

1. **Login**
   - Dispatcher navigates to Logivex app and logs in with email/password or magic link.
2. **Select customer**
   - Dispatcher goes to `Quotes > New`.
   - Chooses an existing customer from a searchable list or creates a new one inline.
3. **Route & shipment**
   - Enters or selects pickup and dropoff addresses (with address autocomplete).
   - Picks pickup date, vehicle type, and service type.
   - Optionally enters shipment details (weight, colli, packaging type).
4. **Pricing**
   - Dispatcher either:
     - Lets the system auto-calculate a suggested price (using internal logic and distance), or
     - Manually enters a price.
   - System shows a breakdown preview (base price, surcharges, discounts).
5. **Review**
   - A preview panel shows the quote as the customer will see it (line items, totals, terms, validity).
6. **Send**
   - Dispatcher clicks “Send quote”.
   - App:
     - Saves the quote as `SENT`.
     - Sends an email to the selected contact using the email provider.
     - Emits `onQuoteSent` outbound webhook to Make.com (optional).
7. **Follow-up**
   - Dispatcher can see the quote in the list with status `SENT`.
   - If a public link exists, they can copy/share it.

### 5.2. Customer flow – viewing and accepting a quote

1. **Receive email**
   - Customer gets a professional quote email with a “View quote” button linking to a public tokenized URL.
2. **View quote**
   - Customer opens the URL (no login required).
   - Page shows:
     - Origin and destination
     - Date
     - Vehicle and service type
     - Price and currency
     - Validity date
     - Terms and notes
3. **Accept / Decline**
   - Customer clicks “Accept quote” or “Decline quote”.
   - If accepting:
     - Optional fields: PO number, reference, short comment.
   - System:
     - Updates `Quote.status` to `ACCEPTED` or `DECLINED`.
     - Records a `QuoteEvent`.
     - Emits `onQuoteAccepted` (or `onQuoteDeclined`) webhook to Make.com.
4. **Confirmation**
   - Customer sees a confirmation page and optionally a summary email.

### 5.3. Admin flow – configuring company settings & Make.com

1. **Company setup**
   - Admin configures:
     - Company name, logo, and branding colors.
     - Time zone and default currency.
     - Default vehicle types and service types.
2. **Users**
   - Admin invites new users:
     - OWNER can manage billing and all settings.
     - ADMIN can manage users, master data, quotes.
     - DISPATCHER can create and manage quotes.
3. **Automation / Make.com**
   - Admin goes to `Settings > Automation`.
   - Creates `AutomationEndpoint` records:
     - Event type (e.g. `onQuoteCreated`, `onQuoteSent`, `onQuoteAccepted`).
     - URL (Make.com webhook URL).
     - Optional secret for signature verification.
   - Tests endpoints via a “Send test event” button that emits a sample payload.
4. **Billing**
   - Admin selects a plan (Basic / Pro / Enterprise) via Stripe Checkout.
   - App:
     - Stores `stripeCustomerId` and subscription details in `Company`.
     - Enforces limits (e.g. quotes per month, number of active AutomationEndpoints).

---

This document provides the concrete architecture, schema, contracts, and UX flows to implement the multi-tenant Logivex SaaS described in the attached plan, while keeping your current Express + Make.com quote form as a stepping stone toward the full application.

