import { configureStore } from '@reduxjs/toolkit';

// Reducers
import authReducer from '../features/auth/authSlice';
import accountsReducer from '../features/accounts/accountsSlice';
import farmReducer from '../features/farm/farmSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    farm: farmReducer,
    // settings: settingsReducer, // можно добавить в будущем
  },
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // если будешь использовать Date, FormData и т.п.
    }),
});

export default store;