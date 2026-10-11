import { configureStore } from '@reduxjs/toolkit';
import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import productReducer from '../features/product/productSlice';
import cartReducer from '../features/cart/cartSlice';
import ordersReducer from '../features/orders/ordersSlice';
import snackbarReducer from '../features/snackbar/snackbarSlice';
import recentlyViewedReducer, {
  createRecentlyViewedMiddleware,
  RECENTLY_VIEWED_KEY,
} from '../features/recentlyViewed/recentlyViewedSlice';
import { earphones, headphones, products, speakers } from './products';
import type { Product } from '../types/product';
import authReducer from '../features/auth/authSlice';

vi.mock('../features/auth/AuthSession', () => ({ default: () => null }));

const fetchMock = vi.fn<typeof fetch>();
const apiUrl = 'http://localhost:3000';
const applicationSources = import.meta.glob(
  ['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../test/**'],
  { eager: true, query: '?raw', import: 'default' }
);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestPath(input: Parameters<typeof fetch>[0]) {
  return new URL(input instanceof Request ? input.url : String(input)).pathname;
}

function mockCatalogue(catalogue: Product[] = products) {
  fetchMock.mockImplementation(async (input) => {
    const path = requestPath(input);
    if (path === '/products') return jsonResponse({ products: catalogue });
    const product = catalogue.find((item) => path === `/products/${item.id}`);
    return product ? jsonResponse(product) : jsonResponse({ error: 'Product not found' }, 404);
  });
}

function NavigationControl() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(`/article/${speakers.id}`)}>Open next service product</button>
      <button onClick={() => navigate(`/article/${headphones.id}`)}>Open headphones</button>
      <button onClick={() => navigate('/')}>Go home</button>
      <button onClick={() => navigate('/products')}>Show full catalogue</button>
      <button onClick={() => navigate('/products?popular=true')}>Show popular catalogue</button>
    </>
  );
}

function renderStorefront(path = '/products') {
  const store = configureStore({
    reducer: {
      products: productReducer,
      cart: cartReducer,
      orders: ordersReducer,
      snackbar: snackbarReducer,
      recentlyViewed: recentlyViewedReducer,
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        status: path === '/admin' ? 'authenticated' : 'anonymous',
        session:
          path === '/admin'
            ? {
                user: {
                  id: 'c7428fe9-a8b6-4ec4-ab48-93e8bfa86a0b',
                  email: 'admin@example.com',
                  role: 'admin',
                },
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
              }
            : null,
        operation: null,
        error: null,
        sessionError: null,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(createRecentlyViewedMiddleware()),
  });

  render(
    <StrictMode>
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <SnackbarProvider>
            <NavigationControl />
            <App />
          </SnackbarProvider>
        </MemoryRouter>
      </Provider>
    </StrictMode>
  );
  return store;
}

describe('sticky navigation layout', () => {
  it('keeps the home hero outside the header and removes it on catalogue navigation', async () => {
    mockCatalogue();
    renderStorefront('/');
    const header = screen
      .getAllByRole('banner')
      .find((element) => element.classList.contains('Layout-Header'));
    if (!header) throw new Error('Sticky layout header is missing.');
    expect(within(header).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: 'BROWSE PRODUCTS' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'BROWSE PRODUCTS' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show full catalogue' }));
    expect(screen.queryByRole('link', { name: 'BROWSE PRODUCTS' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('banner')).toContain(header);
    await screen.findByText(headphones.shortName);
  });
});

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_PRODUCTS_API_URL', apiUrl);
  mockCatalogue();
});

describe('admin responsive products', () => {
  afterEach(() => vi.unstubAllGlobals());

  function mobileViewport() {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(max-width: 700px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
  }

  it('keeps the desktop table and its sortable columns', async () => {
    renderStorefront('/admin');
    await screen.findByText(headphones.shortName);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Products' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Price' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stock' })).toBeInTheDocument();
  });

  it('shows mobile cards with identity, type, price, stock and existing edit/delete dialogs', async () => {
    mobileViewport();
    renderStorefront('/admin');
    const list = await screen.findByRole('list', { name: 'Products' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const card = within(list).getByRole('heading', { name: headphones.shortName }).closest('li');
    if (!card) throw new Error('Product card is missing.');
    expect(within(card).getByText(headphones.id)).toBeInTheDocument();
    expect(within(card).getByText('Headphones')).toBeInTheDocument();
    expect(within(card).getByText(/123,45\s*\u20ac/)).toBeInTheDocument();
    expect(within(card).getByText('2')).toBeInTheDocument();
    expect(within(card).getByText('Low stock')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: `Edit ${headphones.shortName}` }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(within(card).getByRole('button', { name: `Delete ${headphones.shortName}` }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(headphones.shortName);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(fetchMock.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(true);
  });

  it('preserves mobile sorting, pagination, category and search filters and empty results', async () => {
    mobileViewport();
    mockCatalogue(
      Array.from({ length: 9 }, (_, index) => ({
        ...headphones,
        id: `mobile-${index}`,
        title: `Mobile product ${index}`,
        shortName: `Mobile product ${index}`,
        type: index === 8 ? 'speakers' : 'headphones',
        price: index + 1,
        inStock: 20 - index,
      }))
    );
    renderStorefront('/admin');
    const list = await screen.findByRole('list', { name: 'Products' });
    await screen.findByText('Mobile product 0');
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Mobile product 8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sort by price' }));
    expect(within(list).getAllByRole('heading')[0]).toHaveTextContent('Mobile product 0');
    fireEvent.click(screen.getByRole('button', { name: 'Sort by price, ascending' }));
    expect(within(list).getAllByRole('heading')[0]).toHaveTextContent('Mobile product 8');
    fireEvent.click(screen.getByRole('button', { name: 'Sort by stock' }));
    expect(within(list).getAllByRole('heading')[0]).toHaveTextContent('Mobile product 8');
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by type' })).getByRole('button', {
        name: 'Speakers',
      })
    );
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search by name or SKU' }), {
      target: { value: 'missing product' },
    });
    expect(screen.getByText('No products found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });
});

describe('products service integration contract', () => {
  it('places the SKU at the bottom of the product card without empty title metadata', async () => {
    mockCatalogue([{ ...headphones, newProduct: false }]);
    renderStorefront(`/article/${headphones.id}`);

    const title = await screen.findByRole('heading', { name: headphones.title });
    const card = title.closest('.Article-Description');
    expect(card).not.toBeNull();
    expect(card?.lastElementChild).toBe(screen.getByText(`SKU ${headphones.id}`));
    expect(card?.querySelector('.Article-Metadata')).toBeNull();
    expect(screen.getByText('2-Year Warranty')).toBeVisible();
    expect(screen.getByText('Fast shipping')).toBeVisible();
    expect(screen.getByText('Secure payment')).toBeVisible();
  });

  it('keeps the product detail skeleton visible when development loading is forced', async () => {
    vi.stubEnv('VITE_FORCE_PRODUCTS_LOADING', 'true');
    const store = renderStorefront(`/article/${headphones.id}`);

    await waitFor(() =>
      expect(store.getState().products.details[headphones.id]?.status).toBe('succeeded')
    );
    expect(screen.getByRole('progressbar', { name: 'Loading products' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'ADD TO CART' })).not.toBeInTheDocument();
    expect(store.getState().recentlyViewed.ids).toEqual([]);
  });

  it('uses the existing toast when adding a catalogue product to the cart', async () => {
    const store = renderStorefront();

    const add = await screen.findByRole('button', {
      name: `Add to cart: ${headphones.title}`,
    });
    fireEvent.click(add);

    expect(await screen.findByText('The article has been added to your cart!')).toBeVisible();
    expect(store.getState().cart.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: headphones.id, quantity: 1 })])
    );
    expect(store.getState().snackbar.isOpen).toBe(false);
  });

  it('does not import the static catalogue in application code', () => {
    for (const [path, source] of Object.entries(applicationSources)) {
      expect(source, path).not.toMatch(
        /(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"]*products\.json['"]/
      );
    }
  });

  it('starts without a bundled static catalogue', () => {
    expect(productReducer(undefined, { type: 'test/init' }).data).toEqual([]);
  });

  it('loads the response envelope and preserves server order and every product field', async () => {
    const store = renderStorefront();

    await screen.findByRole('heading', { name: headphones.title });
    expect(store.getState().products.data).toEqual(products);
    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings.map((heading) => heading.textContent)).toEqual(
      products.map((product) => product.title)
    );
  });

  it('uses the configured base URL with a plain credential-free GET', async () => {
    renderStorefront();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const catalogueCall = fetchMock.mock.calls.find(
      ([input]) => requestPath(input) === '/products'
    );
    expect(
      fetchMock.mock.calls.filter(([input]) => requestPath(input) === '/products')
    ).toHaveLength(1);
    expect(catalogueCall).toBeDefined();
    const [input, init] = catalogueCall!;
    const request = new Request(input, init);
    expect(request.url).toBe(`${apiUrl}/products`);
    expect(request.method).toBe('GET');
    expect(request.credentials).toBe('omit');
    expect([...request.headers.entries()]).toEqual([]);
    expect(request.body).toBeNull();
    for (const [requestedInput, options] of fetchMock.mock.calls) {
      expect(new Request(requestedInput, options).method).toBe('GET');
    }
  });

  it('uses a different environment URL rather than a hardcoded service address', async () => {
    vi.stubEnv('VITE_PRODUCTS_API_URL', 'https://catalogue.example.test');
    renderStorefront();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        return url.href === 'https://catalogue.example.test/products';
      })
    ).toBe(true);
  });

  it('reports missing configuration instead of using a static or hardcoded fallback', async () => {
    vi.stubEnv('VITE_PRODUCTS_API_URL', '');
    const store = renderStorefront();

    await screen.findByText(/VITE_PRODUCTS_API_URL|configuration|configured/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState().products.data).toEqual([]);
  });

  it('reports an invalid API URL before attempting a request', async () => {
    vi.stubEnv('VITE_PRODUCTS_API_URL', 'not-a-url');
    const store = renderStorefront();

    await screen.findByText(/VITE_PRODUCTS_API_URL|configuration|invalid.*url/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState().products.data).toEqual([]);
  });

  it('shows loading until the catalogue request completes', async () => {
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      })
    );
    renderStorefront();

    await screen.findByRole('progressbar');
    expect(screen.queryByRole('heading', { name: headphones.title })).not.toBeInTheDocument();
    await act(async () => resolveResponse(jsonResponse({ products })));
    await screen.findByRole('heading', { name: headphones.title });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders an empty catalogue as an empty result, not endless loading', async () => {
    mockCatalogue([]);
    const store = renderStorefront();

    await screen.findByText(/no products|no items|catalogue is empty|catalog is empty/i);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(store.getState().products.data).toEqual([]);
  });

  it.each([
    ['server error', () => Promise.resolve(jsonResponse({ error: 'Internal server error' }, 500))],
    ['network error', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['invalid envelope', () => Promise.resolve(jsonResponse(products))],
    ['invalid product', () => Promise.resolve(jsonResponse({ products: [{ id: 'broken' }] }))],
    ['invalid JSON', () => Promise.resolve(new Response('not JSON', { status: 200 }))],
  ])('surfaces a %s with retry and no static catalogue fallback', async (_name, respond) => {
    fetchMock.mockImplementation(respond);
    const store = renderStorefront();

    const retry = await screen.findByRole('button', { name: /retry|try again/i });
    expect(screen.getByRole('alert')).toHaveTextContent(/error|failed|unable|invalid/i);
    expect(store.getState().products.data).toEqual([]);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    mockCatalogue();
    fireEvent.click(retry);
    await screen.findByRole('heading', { name: headphones.title });
    expect(store.getState().products.data).toEqual(products);
  });

  it.each([
    ['/headphones', headphones],
    ['/speakers', speakers],
    ['/earphones', earphones],
  ])('filters the service catalogue on %s', async (path, expectedProduct) => {
    renderStorefront(path);

    await screen.findByRole('heading', { name: expectedProduct.title });
    for (const other of products.filter((product) => product.id !== expectedProduct.id)) {
      expect(screen.queryByRole('heading', { name: other.title })).not.toBeInTheDocument();
    }
  });

  it('renders only popular service products on the home page', async () => {
    renderStorefront('/');

    await screen.findByText(headphones.title);
    expect(screen.queryByText(speakers.title)).not.toBeInTheDocument();
    expect(screen.queryByText(earphones.title)).not.toBeInTheDocument();
  });

  it('shows four popular and compact recent skeletons until the home catalogue loads', async () => {
    let resolveCatalogue!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveCatalogue = resolve;
      })
    );
    renderStorefront('/');

    const loading = await screen.findByRole('progressbar', { name: 'Loading products' });
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading.querySelectorAll('.Home-Popular-Grid > .Product-Card')).toHaveLength(4);
    expect(loading.querySelectorAll('.Home-Recent-Grid > .Home-Recent-Card')).toHaveLength(3);
    expect(loading.querySelector('.Product-Request-Skeleton-List')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument();

    await act(async () => resolveCatalogue(jsonResponse({ products })));
    await screen.findByRole('heading', { name: headphones.title });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Products you view will appear here.')).toBeVisible();
  });

  it('uses the saved history count for recently viewed skeletons', async () => {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify([speakers.id, headphones.id]));
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    renderStorefront('/');

    const loading = await screen.findByRole('progressbar', { name: 'Loading products' });
    expect(loading.querySelectorAll('.Home-Recent-Grid > .Home-Recent-Card')).toHaveLength(2);
  });

  it('keeps the home skeleton visible when development loading is forced', async () => {
    vi.stubEnv('VITE_FORCE_PRODUCTS_LOADING', 'true');
    const store = renderStorefront('/');
    await waitFor(() => expect(store.getState().products.status).toBe('succeeded'));

    const loading = screen.getByRole('progressbar', { name: 'Loading products' });
    expect(loading.querySelectorAll('.Home-Popular-Grid > .Product-Card')).toHaveLength(4);
    expect(loading.querySelectorAll('.Home-Recent-Grid > .Home-Recent-Card')).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: headphones.title })).not.toBeInTheDocument();
  });

  it('replaces the home skeleton with an error and recovers through retry', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Service unavailable' }, 500));
    renderStorefront('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    mockCatalogue();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('heading', { name: headphones.title });
    expect(screen.getByRole('region', { name: 'Recently viewed' })).toBeVisible();
  });

  it('shows only the first four popular products in server order on the home page', async () => {
    const popularProducts = Array.from({ length: 6 }, (_, index) => ({
      ...headphones,
      id: `popular-${index}`,
      title: `Popular product ${index}`,
    }));
    mockCatalogue([earphones, ...popularProducts]);
    renderStorefront('/');

    await screen.findByRole('heading', { name: popularProducts[0].title });
    const section = await screen.findByRole('region', { name: 'Popular products' });
    expect(
      within(section)
        .getAllByRole('heading', { level: 4 })
        .map((node) => node.textContent)
    ).toEqual(popularProducts.slice(0, 4).map((product) => product.title));
    expect(within(section).queryByText(popularProducts[4].title)).not.toBeInTheDocument();
    expect(within(section).queryByText(popularProducts[5].title)).not.toBeInTheDocument();

    fireEvent.click(within(section).getByRole('link', { name: 'View all' }));
    await screen.findByRole('heading', { name: popularProducts[5].title });
    expect(screen.getByRole('heading', { level: 1, name: 'Popular products' })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 4 }).map((node) => node.textContent)).toEqual(
      popularProducts.map((product) => product.title)
    );
    expect(screen.queryByRole('heading', { name: earphones.title })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([input]) => requestPath(input) === '/products')
    ).toHaveLength(1);
  });

  it('keeps pagination scoped to popular products and resets when the query changes', async () => {
    const popularProducts = Array.from({ length: 8 }, (_, index) => ({
      ...headphones,
      id: `popular-${index}`,
      title: `Popular product ${index}`,
    }));
    mockCatalogue([earphones, ...popularProducts]);
    renderStorefront('/products?popular=true');

    await screen.findByRole('heading', { name: popularProducts[0].title });
    expect(screen.getByText('8 products')).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Show More' }));
    expect(screen.getAllByRole('heading', { level: 4 }).map((node) => node.textContent)).toEqual(
      popularProducts.map((product) => product.title)
    );
    expect(screen.queryByRole('heading', { name: earphones.title })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show full catalogue' }));
    await screen.findByRole('heading', { level: 1, name: 'All products' });
    expect(screen.getByText('9 products')).toBeVisible();
    expect(screen.getByRole('heading', { name: earphones.title })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'Show popular catalogue' }));
    await screen.findByRole('heading', { level: 1, name: 'Popular products' });
    expect(screen.getByText('8 products')).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(6);
    expect(screen.queryByRole('heading', { name: earphones.title })).not.toBeInTheDocument();
  });

  it.each(['/products', '/products?popular=false', '/products?popular=other'])(
    'preserves the full catalogue on %s',
    async (path) => {
      renderStorefront(path);
      await screen.findByRole('heading', { name: headphones.title });
      expect(screen.getByRole('heading', { level: 1, name: 'All products' })).toBeVisible();
      expect(screen.getAllByRole('heading', { level: 4 }).map((node) => node.textContent)).toEqual(
        products.map((product) => product.title)
      );
    }
  );

  it('shows the popular title during loading and an empty result when none are popular', async () => {
    let resolveCatalogue!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveCatalogue = resolve;
      })
    );
    renderStorefront('/products?popular=true');

    await screen.findByRole('progressbar', { name: 'Loading products' });
    expect(screen.getByRole('heading', { level: 1, name: 'Popular products' })).toBeVisible();
    await act(async () =>
      resolveCatalogue(
        jsonResponse({
          products: products.map((product) => ({ ...product, popularProduct: false })),
        })
      )
    );
    await screen.findByText('No products found.');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Popular products' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: headphones.title })).not.toBeInTheDocument();
  });

  it('preserves the popular query through an API error and retry', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Service unavailable' }, 500));
    renderStorefront('/products?popular=true');

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    expect(screen.getByRole('heading', { level: 1, name: 'Popular products' })).toBeVisible();
    mockCatalogue();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('heading', { name: headphones.title });
    expect(screen.getByText('1 product')).toBeVisible();
    expect(screen.queryByRole('heading', { name: earphones.title })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: speakers.title })).not.toBeInTheDocument();
  });

  it('records successful views, moves revisited products first, and clears persisted history', async () => {
    const store = renderStorefront(`/article/${headphones.id}`);
    await screen.findByRole('heading', { name: headphones.title });
    await waitFor(() => expect(store.getState().recentlyViewed.ids).toEqual([headphones.id]));

    fireEvent.click(screen.getByRole('button', { name: 'Open next service product' }));
    await screen.findByRole('heading', { name: speakers.title });
    await waitFor(() =>
      expect(store.getState().recentlyViewed.ids).toEqual([speakers.id, headphones.id])
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open headphones' }));
    await screen.findByRole('heading', { name: headphones.title });
    await waitFor(() =>
      expect(store.getState().recentlyViewed.ids).toEqual([headphones.id, speakers.id])
    );
    expect(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY)!)).toEqual([
      headphones.id,
      speakers.id,
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Go home' }));
    const recentSection = await screen.findByRole('region', { name: 'Recently viewed' });
    expect(
      within(recentSection)
        .getAllByRole('heading', { level: 3 })
        .map((node) => node.textContent)
    ).toEqual([headphones.title, speakers.title]);
    fireEvent.click(within(recentSection).getByRole('button', { name: 'Clear' }));
    expect(store.getState().recentlyViewed.ids).toEqual([]);
    expect(localStorage.getItem(RECENTLY_VIEWED_KEY)).toBeNull();
    expect(within(recentSection).getByText('Products you view will appear here.')).toBeVisible();
  });

  it('restores recent IDs in view order using current catalogue data and skips deleted products', async () => {
    localStorage.setItem(
      RECENTLY_VIEWED_KEY,
      JSON.stringify([speakers.id, 'deleted', earphones.id])
    );
    mockCatalogue(products.map((product) => ({ ...product, popularProduct: false })));
    renderStorefront('/');

    await screen.findByRole('heading', { name: speakers.title });
    const recentSection = await screen.findByRole('region', { name: 'Recently viewed' });
    expect(
      within(recentSection)
        .getAllByRole('heading', { level: 3 })
        .map((node) => node.textContent)
    ).toEqual([speakers.title, earphones.title]);
    expect(
      within(recentSection).getByRole('link', { name: new RegExp(speakers.title) })
    ).toHaveAttribute('href', `/article/${speakers.id}`);
    expect(within(recentSection).getAllByText(/123,45/)).toHaveLength(2);
    expect(screen.getByText('No popular products available.')).toBeVisible();
    expect(screen.queryByText('deleted')).not.toBeInTheDocument();
  });

  it('shows separate popular and recent sections with working cart and catalogue actions', async () => {
    const store = renderStorefront('/');
    await screen.findByRole('heading', { name: headphones.title });
    const popularSection = await screen.findByRole('region', { name: 'Popular products' });
    expect(within(popularSection).getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/products?popular=true'
    );
    expect(screen.getByRole('region', { name: 'Recently viewed' })).toBeVisible();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    fireEvent.click(
      within(popularSection).getByRole('button', {
        name: `Add to cart: ${headphones.title}`,
      })
    );
    fireEvent.click(
      within(popularSection).getByRole('button', {
        name: `Add to cart: ${headphones.title}`,
      })
    );
    expect(store.getState().cart.items[0].quantity).toBe(2);
    expect(
      within(popularSection).getByRole('button', {
        name: `All available stock is in your cart: ${headphones.title}`,
      })
    ).toBeDisabled();
  });

  it.each([404, 500])(
    'does not record a product whose detail request fails with HTTP %s',
    async (status) => {
      fetchMock.mockImplementation(async (input) =>
        requestPath(input) === '/products'
          ? jsonResponse({ products })
          : jsonResponse({ error: 'Product unavailable' }, status)
      );
      const store = renderStorefront(`/article/${headphones.id}`);
      await waitFor(() =>
        expect(store.getState().products.details[headphones.id]?.status).toBe(
          status === 404 ? 'not-found' : 'failed'
        )
      );
      expect(store.getState().recentlyViewed.ids).toEqual([]);
      expect(localStorage.getItem(RECENTLY_VIEWED_KEY)).toBeNull();
    }
  );

  it('records a view only after the detail request succeeds', async () => {
    let resolveDetail!: (response: Response) => void;
    fetchMock.mockImplementation(async (input) =>
      requestPath(input) === '/products'
        ? jsonResponse({ products })
        : new Promise<Response>((resolve) => {
            resolveDetail = resolve;
          })
    );
    const store = renderStorefront(`/article/${headphones.id}`);
    await screen.findByRole('progressbar', { name: 'Loading products' });
    expect(store.getState().recentlyViewed.ids).toEqual([]);
    expect(localStorage.getItem(RECENTLY_VIEWED_KEY)).toBeNull();
    await act(async () => resolveDetail(jsonResponse(headphones)));
    await waitFor(() => expect(store.getState().recentlyViewed.ids).toEqual([headphones.id]));
  });

  it('shows service products in the existing admin without sending write requests', async () => {
    renderStorefront('/admin');

    await screen.findByText(headphones.shortName);
    expect(screen.getByText(speakers.shortName)).toBeInTheDocument();
    expect(screen.getByText(earphones.shortName)).toBeInTheDocument();
    for (const [input, init] of fetchMock.mock.calls) {
      expect(new Request(input, init).method).toBe('GET');
    }
  });

  it('opens a product directly using the detail endpoint, euro price and frontend images', async () => {
    fetchMock.mockImplementation(async (input) =>
      requestPath(input) === '/products'
        ? jsonResponse({
            products: [{ ...headphones, title: 'Outdated list title', price: 999, inStock: 10 }],
          })
        : jsonResponse(headphones)
    );
    renderStorefront(`/article/${headphones.id}`);

    await screen.findByRole('heading', { name: headphones.title });
    expect(fetchMock.mock.calls.some(([input]) => requestPath(input) === '/products/h-01')).toBe(
      true
    );
    expect(screen.getByText(/123,45\s*\u20ac/)).toBeInTheDocument();
    expect(screen.getByText(/In stock/)).toHaveTextContent('2');
    const images = screen.getAllByRole('img', { name: `${headphones.title}, view 1` });
    expect(images[0]).toHaveAttribute('src', expect.stringContaining('xx99II/main.png'));
    expect(images[0].getAttribute('src')).not.toContain(apiUrl);
  });

  it('uses a credential-free plain GET for product details too', async () => {
    renderStorefront(`/article/${headphones.id}`);

    await screen.findByRole('heading', { name: headphones.title });
    const detailCall = fetchMock.mock.calls.find(
      ([input]) => requestPath(input) === `/products/${headphones.id}`
    );
    expect(detailCall).toBeDefined();
    const [input, init] = detailCall!;
    const request = new Request(input, init);
    expect(request.url).toBe(`${apiUrl}/products/${headphones.id}`);
    expect(request.method).toBe('GET');
    expect(request.credentials).toBe('omit');
    expect([...request.headers.entries()]).toEqual([]);
    expect(request.body).toBeNull();
  });

  it('loads detail independently when the catalogue endpoint fails', async () => {
    fetchMock.mockImplementation(async (input) =>
      requestPath(input) === '/products'
        ? jsonResponse({ error: 'Internal server error' }, 500)
        : jsonResponse(headphones)
    );
    renderStorefront(`/article/${headphones.id}`);

    await screen.findByRole('heading', { name: headphones.title });
    expect(screen.getByRole('button', { name: 'ADD TO CART' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables buying when the service reports zero stock', async () => {
    mockCatalogue([{ ...headphones, inStock: 0 }]);
    const store = renderStorefront(`/article/${headphones.id}`);

    const add = await screen.findByRole('button', { name: 'ADD TO CART' });
    expect(add).toBeDisabled();
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    fireEvent.click(add);
    expect(store.getState().cart.items).toEqual([]);
  });

  it('adds the fetched product to the cart and respects service stock', async () => {
    const store = renderStorefront(`/article/${headphones.id}`);

    const add = await screen.findByRole('button', { name: 'ADD TO CART' });
    fireEvent.click(add);
    fireEvent.click(add);

    expect(store.getState().cart.items).toEqual([
      {
        id: headphones.id,
        title: headphones.shortName,
        price: 123.45,
        image: '/xx99II/main.png',
        inStock: 2,
        quantity: 2,
      },
    ]);
    expect(add).toBeDisabled();
  });

  it.each(['missing-id', '__proto__', 'constructor', 'toString'])(
    'distinguishes missing product %s from a server failure',
    async (id) => {
      renderStorefront(`/article/${id}`);

      await screen.findByText(/product not found/i);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'ADD TO CART' })).not.toBeInTheDocument();
      expect(fetchMock.mock.calls.some(([input]) => requestPath(input) === `/products/${id}`)).toBe(
        true
      );
    }
  );

  it('honors detail 404 even when the list still contains that product', async () => {
    fetchMock.mockImplementation(async (input) =>
      requestPath(input) === '/products'
        ? jsonResponse({ products })
        : jsonResponse({ error: 'Product not found' }, 404)
    );
    renderStorefront(`/article/${headphones.id}`);

    await screen.findByText(/product not found/i);
    expect(
      fetchMock.mock.calls.some(([input]) => requestPath(input) === `/products/${headphones.id}`)
    ).toBe(true);
    expect(screen.queryByRole('heading', { name: headphones.title })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ADD TO CART' })).not.toBeInTheDocument();
  });

  it('shows a retryable detail server error rather than product not found', async () => {
    fetchMock.mockImplementation(async (input) =>
      requestPath(input) === '/products'
        ? jsonResponse({ products })
        : jsonResponse({ error: 'Internal server error' }, 500)
    );
    renderStorefront(`/article/${headphones.id}`);

    const retry = await screen.findByRole('button', { name: /retry|try again/i });
    expect(screen.getByRole('alert')).toHaveTextContent(/error|failed|unable/i);
    expect(screen.queryByText(/product not found/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ADD TO CART' })).not.toBeInTheDocument();

    mockCatalogue();
    fireEvent.click(retry);
    await screen.findByRole('heading', { name: headphones.title });
  });

  it('does not let a late detail response replace the newly selected product', async () => {
    let resolveFirst!: (response: Response) => void;
    fetchMock.mockImplementation(async (input) => {
      const path = requestPath(input);
      if (path === '/products') return jsonResponse({ products });
      if (path === `/products/${headphones.id}`) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return jsonResponse(speakers);
    });
    renderStorefront(`/article/${headphones.id}`);

    await waitFor(() => expect(resolveFirst).toBeTypeOf('function'));
    fireEvent.click(screen.getByRole('button', { name: 'Open next service product' }));
    await screen.findByRole('heading', { name: speakers.title });
    await act(async () => resolveFirst(jsonResponse(headphones)));

    expect(screen.getByRole('heading', { name: speakers.title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: headphones.title })).not.toBeInTheDocument();
  });
});
