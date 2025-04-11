import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as accountsAPI from './accountsAPI';

// Thunks
export const fetchAccounts = createAsyncThunk('accounts/fetch', async (_, thunkAPI) => {
  try {
    return await accountsAPI.getAccounts();
  } catch (err) {
    return thunkAPI.rejectWithValue('Не удалось получить аккаунты');
  }
});

export const addAccount = createAsyncThunk('accounts/add', async (data, thunkAPI) => {
  try {
    return await accountsAPI.createAccount(data);
  } catch (err) {
    const errorMessage = err.response?.data?.error || 'Ошибка при создании аккаунта';
    return thunkAPI.rejectWithValue(errorMessage);
  }
});


export const editAccount = createAsyncThunk('accounts/update', async ({ id, data }, thunkAPI) => {
  try {
    return await accountsAPI.updateAccount(id, data);
  } catch (err) {
    return thunkAPI.rejectWithValue('Ошибка при обновлении аккаунта');
  }
});

export const removeAccount = createAsyncThunk('accounts/delete', async (id, thunkAPI) => {
  try {
    await accountsAPI.deleteAccount(id);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue('Ошибка при удалении аккаунта');
  }
});

const accountsSlice = createSlice({
  name: 'accounts',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(addAccount.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })

      .addCase(editAccount.fulfilled, (state, action) => {
        const index = state.list.findIndex(acc => acc.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
      })

      .addCase(removeAccount.fulfilled, (state, action) => {
        state.list = state.list.filter(acc => acc.id !== action.payload);
      });
  }
});

export default accountsSlice.reducer;
