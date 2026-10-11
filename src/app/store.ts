import { configureStore } from '@reduxjs/toolkit';
import cartReducer from '../features/cart/cartSlice';
import productReducer from '../features/product/productSlice';
import snackbarReducer from '../features/snackbar/snackbarSlice';
import ordersReducer from '../features/orders/ordersSlice';
import authReducer from '../features/auth/authSlice';
import recentlyViewedReducer, {
  createRecentlyViewedMiddleware,
} from '../features/recentlyViewed/recentlyViewedSlice';

const store = configureStore({
  reducer: {
    cart: cartReducer,
    products: productReducer,
    snackbar: snackbarReducer,
    orders: ordersReducer,
    auth: authReducer,
    recentlyViewed: recentlyViewedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(createRecentlyViewedMiddleware()),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
