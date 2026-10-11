# Audiophile

A portfolio e-commerce demo for audio equipment, built with React, TypeScript and Redux Toolkit.
It connects to separate products, orders and authentication services.

**[Live demo](https://audiophile-store-beryl.vercel.app/)**

**Admin access:** Contact [Stefan Rakonjac](https://github.com/xarambash) to request
credentials and explore the [admin area](https://audiophile-store-beryl.vercel.app/admin).
Credentials are shared privately. Product create, edit and delete are currently UI-only.

## Highlights

- Responsive catalogue with category filters, product details, image galleries and stock availability.
- Popular products and a device-local recently viewed history.
- Shopping cart with stock-aware quantity controls.
- Cash checkout with validation, VAT/shipping totals and orders saved by the backend.
- Cookie-based admin sign-in, session restoration and protected routes.
- Admin product search, filtering, sorting and pagination, with mobile cards and a desktop table.
- Loading, error and retry states, plus unit and integration tests.

**Demo scope:** No real payments are processed. The cart resets on page reload;
recently viewed history is stored locally. Admin product management is not yet connected
to write endpoints.

## Tech stack

React, TypeScript (strict mode), Redux Toolkit, Material UI, React Router and Vite.
Tests use Vitest and React Testing Library; code quality uses ESLint and Prettier.
The UI is hosted on Vercel.

## Screenshots

<details>
<summary>View home, catalogue, product, cart and checkout screens</summary>

### Home

![Home page](docs/screenshots/home.png)

### Catalogue

![Products page](docs/screenshots/products.png)

### Product

![Product page](docs/screenshots/product.png)

### Cart

![Shopping cart](docs/screenshots/cart.png)

### Checkout

![Checkout page](docs/screenshots/checkout.png)

</details>

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. Start the backend services separately and configure
their base URLs in `.env.local`:

| Variable                | Local service           |
| ----------------------- | ----------------------- |
| `VITE_PRODUCTS_API_URL` | `http://localhost:3000` |
| `VITE_ORDERS_API_URL`   | `http://localhost:3001` |
| `VITE_AUTH_API_URL`     | `http://localhost:3002` |

The services must allow the frontend origin through CORS. Auth uses
`AUTH_ALLOWED_ORIGINS=http://localhost:5173` and `NODE_ENV=development` locally.
Restart Vite after changing environment variables; never put secrets in `VITE_*` values.

Backend setup and API details:
[products](https://github.com/xarambash/audiophile-products-service),
[orders](https://github.com/audiophile-store/orders-service),
[auth](https://github.com/audiophile-store/auth-service).

**Checks:** `npm test`, `npm run lint`, `npm run build`.

## Next steps

- Connect admin product management to authorized backend endpoints.
- Persist the cart across page reloads.

## Author

Stefan Rakonjac — [@xarambash](https://github.com/xarambash)

Product images and brand names belong to their respective owners and are used for demonstration purposes.
