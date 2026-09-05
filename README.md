# RiseFlow Server

The backend API for **RiseFlow**, a full-stack crowdfunding platform where creators launch campaigns, supporters fund them with credits, and admins moderate the platform.

## Motive

The server provides the secure business layer for RiseFlow. It handles authentication, role-based authorization, campaign moderation, contributions, payments, notifications, reports, and withdrawals so important rules are enforced independently of the frontend.

## Features

- Express REST API with `/api` route prefixes.
- Better Auth email/password authentication.
- Google OAuth authentication.
- MongoDB-backed sessions, users, OAuth state, and application data.
- Secure cross-origin session cookies for the separate Vercel client and server.
- Roles: `supporter`, `creator`, and `admin`.
- Server-side authentication and role middleware.
- Campaign creation, approval, rejection, suspension, and deletion.
- Contribution lifecycle with creator approval or rejection.
- Credit economy: supporters purchase credits and use them to support campaigns.
- Creator withdrawal requests with admin processing.
- Payment records and payment history.
- Notifications for important campaign, contribution, and withdrawal events.
- Admin user management and platform reports.
- Script for promoting a registered user to admin.

## Tech stack

- Node.js
- Express
- MongoDB Node.js driver
- Mongoose
- Better Auth
- Stripe
- CORS
- dotenv

## Requirements

- Node.js 18 or newer
- npm
- MongoDB Atlas or a local MongoDB instance
- A stable Better Auth secret
- Google Cloud OAuth credentials for Google sign-in
- A Stripe secret key for real payments, or leave it empty to use the dummy payment fallback
- A deployed or local client URL for CORS and trusted origins

## Installation

From the `server` directory:

```bash
npm install
```

Create `.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:3000

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crowdfunding

BETTER_AUTH_SECRET=replace_with_a_long_random_secret
BETTER_AUTH_URL=http://localhost:5000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

IMGBB_API_KEY=your_imgbb_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

`STRIPE_SECRET_KEY` is optional when the dummy payment flow is acceptable. Keep `.env` private and never expose server secrets in the client.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Development

```bash
npm run dev
```

The API runs on `http://localhost:5000` by default.

For production, configure Vercel or another host with:

```env
CLIENT_URL=https://riseflow-ten.vercel.app
BETTER_AUTH_URL=https://riseflow-server.vercel.app
BETTER_AUTH_SECRET=the_same_stable_secret_used_for_the_deployment
MONGODB_URI=your_production_mongodb_uri
```

## Google OAuth setup

In Google Cloud Console, create a Web application OAuth client and add these authorized redirect URIs:

```text
http://localhost:5000/api/auth/callback/google
https://riseflow-server.vercel.app/api/auth/callback/google
```

The callback URI must match the deployed server URL exactly, including the path and the absence of a trailing slash.

## Make a user an admin

Register the user normally first, then run:

```bash
node scripts/makeAdmin.js user@example.com
```

The user must log out and log in again for the updated role to be reflected in the session/profile.

## API overview

All application routes are prefixed with `/api`:

| Area | Route | Purpose |
|---|---|---|
| Auth | `/api/auth/*` | Better Auth sign-in, sign-up, sessions, sign-out, and Google callback |
| Campaigns | `/api/campaigns` | Public campaigns and creator/admin campaign operations |
| Contributions | `/api/contributions` | Supporter contributions and creator review actions |
| Withdrawals | `/api/withdrawals` | Creator withdrawal requests and admin processing |
| Users | `/api/users` | Current profile and admin user management |
| Payments | `/api/payments` | Credit purchases and payment history |
| Notifications | `/api/notifications` | User notifications |
| Reports | `/api/reports` | Admin reporting data |

Protected routes require the Better Auth session cookie. The client must send requests with credentials enabled.

## Related project

The React frontend is documented in [`../client/README.md`](../client/README.md).
