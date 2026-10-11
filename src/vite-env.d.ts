/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRODUCTS_API_URL?: string;
  readonly VITE_ORDERS_API_URL?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_FORCE_PRODUCTS_LOADING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
