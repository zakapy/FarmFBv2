import { configureStore } from '@reduxjs/toolkit';

// Reducers
import authReducer from '../features/auth/authSlice';
import accountsReducer from '../features/accounts/accountsSlice';

// Можно подключать другие позже: farmReducer, settingsReducer и т.д.

const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    // farm: farmReducer,
    // settings: settingsReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // если будешь использовать Date, FormData и т.п.
    }),
});

export default store;
