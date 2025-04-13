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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Игнорируем некоторые пути, которые могут содержать не сериализуемые значения
        ignoredActions: ['farm/getDetails/fulfilled'],
        ignoredPaths: [
          'farm.farmDetails.results.screenshots',
          'payload.screenshots',
          'meta.arg'
        ],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;