import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { login, register, getProfile } from './authAPI';

const initialState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

export const loginUser = createAsyncThunk('auth/login', async (data, thunkAPI) => {
  try {
    const res = await login(data);
    localStorage.setItem('access_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    return res.user;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data, thunkAPI) => {
  try {
    const res = await register(data);
    return res;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Register failed');
  }
});

export const fetchUserProfile = createAsyncThunk('auth/profile', async (_, thunkAPI) => {
  try {
    const res = await getProfile();
    return res.user;
  } catch (error) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return thunkAPI.rejectWithValue('Session expired');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchUserProfile.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
