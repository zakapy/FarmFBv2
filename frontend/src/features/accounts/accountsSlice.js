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

// Thunk для смены аватарки аккаунта
export const changeAvatar = createAsyncThunk('accounts/changeAvatar', async ({ id, file }, thunkAPI) => {
  try {
    const result = await accountsAPI.changeAvatar(id, file);
    
    // Если операция успешна, обновим аккаунт в состоянии
    if (result.success) {
      // Получим обновленные данные аккаунта
      const updatedAccount = await accountsAPI.getAccounts();
      // Найдем обновленный аккаунт
      const account = updatedAccount.find(acc => acc._id === id || acc.id === id);
      return account || { id }; // В случае если аккаунт не найден, возвращаем хотя бы id
    }
    
    return thunkAPI.rejectWithValue(result.error || 'Неизвестная ошибка при смене аватарки');
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.error || 'Ошибка при смене аватарки');
  }
});

const accountsSlice = createSlice({
  name: 'accounts',
  initialState: {
    list: [],
    loading: false,
    error: null,
    avatarLoading: false,
    avatarError: null
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
        const updatedId = action.payload._id || action.payload.id;
        const index = state.list.findIndex(acc => acc._id === updatedId || acc.id === updatedId);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })

      .addCase(removeAccount.fulfilled, (state, action) => {
        state.list = state.list.filter(acc => acc._id !== action.payload);
      })
      
      // Обработчики для смены аватарки
      .addCase(changeAvatar.pending, (state) => {
        state.avatarLoading = true;
        state.avatarError = null;
      })
      .addCase(changeAvatar.fulfilled, (state, action) => {
        state.avatarLoading = false;
        // Обновляем аккаунт в списке
        const updatedId = action.payload._id || action.payload.id;
        const index = state.list.findIndex(acc => acc._id === updatedId || acc.id === updatedId);
        if (index !== -1 && action.payload._id) {
          state.list[index] = action.payload;
        }
      })
      .addCase(changeAvatar.rejected, (state, action) => {
        state.avatarLoading = false;
        state.avatarError = action.payload;
      });
  }
});

export default accountsSlice.reducer;
