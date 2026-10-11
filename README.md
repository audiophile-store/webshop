# Audiophile

A demo e-commerce storefront for audio equipment, built with React, TypeScript and Redux Toolkit.

**Live demo: [audiophile-store-beryl.vercel.app](https://audiophile-store-beryl.vercel.app/)**

---

## Screenshots

### Home

![Home page](docs/screenshots/home.png)

### Products page

![Products page](docs/screenshots/products.png)

### Product page

![Product page](docs/screenshots/product.png)

### Cart

![Shopping cart](docs/screenshots/cart.png)

### Checkout

![Checkout page](docs/screenshots/checkout.png)

---

## Features

- API-backed catalogue with loading states, error handling, and retry
- Browse products by category (headphones, speakers, earphones) or view the full catalogue
- Product detail pages with an image gallery, specs, and stock availability
- Home page with up to four popular product cards in a desktop row and the last 10 recently viewed products
- Popular products "View all" opens `/products?popular=true`, filtering the current catalogue on the frontend; `/products` still shows the full catalogue
- Home loading skeletons matching the popular and compact recently viewed card layouts
- Recently viewed history saved as product IDs in localStorage, newest first, with a clear action
- Slide-in cart with quantity controls that respect the available stock
- API-backed cash checkout with form validation, VAT breakdown, shipping, and server-confirmed orders
- Client-side routing with breadcrumbs and scroll restoration
- Responsive layout for mobile, tablet, and desktop
- Cookie-backed administrator sign-in, session restoration, logout and protected admin route

### Authentication

`/sign-in` uses the existing [auth-service](https://github.com/audiophile-store/auth-service):
`POST /login` sends only `{ email, password }`, `GET /me` restores the session on
startup and window focus, and `POST /logout` requires HTTP 204 before clearing
the local session. Requests include cookies and disable caching. Sessions expire
after one hour; the UI also removes expired sessions. Credentials and session
tokens are never stored in localStorage. No "Remember me", password reset or
profile endpoint is available.

The backend currently accepts **administrators only**. There is no public
registration endpoint, so the frontend provides no account-creation form.
Accounts must be provisioned using the auth-service administrator tooling.
The frontend route guard is a UX control, not API authorization; write endpoints
must enforce authorization on the backend.

Locally, run auth-service on port 3002 with `NODE_ENV=development` and
`AUTH_ALLOWED_ORIGINS=http://localhost:5173`. Vite proxies `/api/auth/*` to
`AUTH_PROXY_TARGET` (default `http://localhost:3002`), stripping `/api/auth`
while preserving the browser's Origin header and the service's Set-Cookie.
Restart Vite after changing the target. No backend CORS changes are required
for this same-origin setup. The existing products and orders configuration is
unchanged.

Verify that the running auth service includes the authentication routes:
`GET http://localhost:3002/me` without a cookie should return HTTP 401 with
`code: "INVALID_SESSION"`. HTTP 404 means the endpoint is not available at
that target; check the target and update/rebuild the auth-service application
or container from its current `main`. A successful `/health` response alone
does not verify that login/session routes are installed.

For production, configure a **same-origin reverse proxy** for `/api/auth/login`,
`/api/auth/me` and `/api/auth/logout` to the corresponding service paths.
Preserve Origin, Cookie and Set-Cookie, disable caching, and use HTTPS with the
auth service in production mode and the exact approved frontend origin in
`AUTH_ALLOWED_ORIGINS`. The Vite development proxy is **not** included in the
production bundle or `vite preview`. Without a production proxy, authentication
will report an error; simply pointing at a cross-origin service is not supported
by the current backend's CORS and SameSite cookie contract.

## Tech stack

| Area          | Choice                        |
| ------------- | ----------------------------- |
| Language      | TypeScript 5 (strict mode)    |
| UI            | React 18, Material UI 5       |
| State         | Redux Toolkit, React Redux    |
| Routing       | React Router 6                |
| Carousel      | Swiper 11                     |
| Notifications | notistack                     |
| Build         | Vite 5                        |
| Hosting       | Vercel                        |
| Testing       | Vitest, React Testing Library |
| Tooling       | ESLint, Prettier              |

## Running locally

```bash
git clone https://github.com/xarambash/audiophile-store.git
cd audiophile-store
npm install
cp .env.example .env.local
npm run dev
```

The app runs at `http://localhost:5173` and expects `audiophile-products-service` at
`http://localhost:3000`, configured through `VITE_PRODUCTS_API_URL` in `.env.local`.
Orders use `orders-service` at `http://localhost:3001`, configured through
`VITE_ORDERS_API_URL`. Set both API variables to their public service base URLs in
Vercel for production. Vite variables are public; never put secrets in them.
Restart Vite after changing env configuration. The orders backend must allow the
frontend origin (`http://localhost:5173` locally) through its CORS configuration.

### Orders integration

Checkout sends one credential-free JSON `POST /orders` with only customer name,
email and phone, shipping address, `paymentMethod: "cash"`, and product IDs/quantities.
Prices, stock and totals are never sent. Text is trimmed and validated against the
[orders API contract](https://github.com/audiophile-store/orders-service#http-api):
name/city/country up to 100 characters, email 254, phone 32, address 200, ZIP 20;
1–50 distinct product IDs (up to 100 characters), quantities 1–99.

Only HTTP 201 with a valid confirmation matching the requested IDs and quantities
is successful. The server's product snapshots, order ID and totals are used for
the modal and `/order-success`; EUR cent amounts are divided by 100 for display.
The form draft, pending request lock, error and confirmation live in a separate Redux
orders slice, so they survive navigation away from checkout. The confirmation is also
passed in browser navigation state, independent of cart data. Confirmed success removes
only submitted units still present in the cart: products or extra quantities added while
waiting are preserved, including items discarded and re-added during the request.
The existing modal redirects after three seconds; if checkout was closed, reopening it
shows the saved success or failure without resubmitting. `/order-success` can also show
the last confirmed order from Redux. Viewing the confirmation resets the form for a new
order. Direct access without a valid confirmation shows a warning, not a fabricated
successful order. Drafts and Redux confirmation are memory-only and do not survive a
full page reload; no customer data is written to localStorage. There is no
order-history API or permanent confirmation storage in this frontend.

Submission is locked while pending. HTTP 400, 409, 413, 422, 503 and 500 show
actionable errors; network failures, unexpected statuses and invalid responses show
an uncertain-outcome warning. Errors preserve the cart and form. There is **no
automatic retry**: the backend has no idempotency support, so a lost response may
mean an order was already saved. Check with the store before manually resubmitting
an uncertain request. Cash on delivery is the only supported method; no payment
or confirmation email is processed by this UI.
Phone uses a telephone input/keyboard and autofill, preserving `+`, formatting and
leading zeros. ZIP uses a text input and postal-code autofill for international codes
with letters and leading zeros. Both are strings, not numeric quantities.

`npm run build` type-checks the project and writes a
production bundle to `dist/`, and `npm run preview` serves that bundle locally.

| Script                 | What it does                            |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start the Vite dev server               |
| `npm run build`        | Type-check and build for production     |
| `npm run preview`      | Serve the production build              |
| `npm test`             | Run unit and integration tests          |
| `npm run lint`         | Run ESLint (warnings fail the run)      |
| `npm run format`       | Format the project with Prettier        |
| `npm run format:check` | Verify formatting without writing files |

## Project structure

```
src/
├── app/          # Redux store and shared constants
├── components/   # Reusable UI components
├── features/     # Redux slices (cart, products, recently viewed, snackbar)
├── pages/        # Route-level views
├── db/           # Legacy catalogue (unused)
├── types/        # Shared TypeScript types
└── utils/        # Formatting helpers, image resolution, MUI theme
```

## Notes

This is a portfolio demo, not a production store. The catalogue comes from the read-only
products service, orders are persisted through the orders service, the cart lives
in memory only, and no payment is ever processed.
Prices are displayed in euros with VAT included.
Recently viewed history is device-local, recorded only after a product detail loads successfully,
and resolved against the current catalogue; products no longer in the catalogue are not displayed.

Product images and brand names belong to their respective owners and are used here purely
for demonstration purposes.

## What I'd do next

- Persist the cart across page reloads
- Finish the admin panel (product create, edit, and delete are currently UI-only)
- Add an error boundary and a 404 page

## Author

Stefan Rakonjac — [@xarambash](https://github.com/xarambash)
