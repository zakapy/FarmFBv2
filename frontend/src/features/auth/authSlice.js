import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authAPI from './authAPI';

// Thunks
export const loginUser = createAsyncThunk('auth/login', async (data, thunkAPI) => {
  try {
    const res = await authAPI.login(data);
    localStorage.setItem('access_token', res.access_token);
    return res.user;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Ошибка входа');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data, thunkAPI) => {
  try {
    const res = await authAPI.register(data);
    return res.user;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Ошибка регистрации');
  }
});

export const fetchProfile = createAsyncThunk('auth/profile', async (_, thunkAPI) => {
  try {
    const res = await authAPI.getProfile();
    return res;
  } catch (err) {
    return thunkAPI.rejectWithValue('Не удалось загрузить профиль');
  }
});

const initialState = {
  user: null,
  role: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('access_token');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.role = action.payload.role || 'user';
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        // Можно сразу логинить: state.user = action.payload; state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
         state.role = action.payload.role || 'user';
      })

      // Profile
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.role = action.payload.role || 'user';
        state.isAuthenticated = true;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
