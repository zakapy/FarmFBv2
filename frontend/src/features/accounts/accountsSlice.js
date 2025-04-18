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
      return {
        id,
        avatarUrl: result.avatarUrl,
        account: result.account // Получаем обновленный аккаунт из ответа
      };
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
    avatarLoadingId: null,
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
        
        // Преобразуем данные аккаунтов, добавляя timestamp к URL аватарок для избежания кеширования
        state.list = action.payload.map(account => {
          // Копируем аккаунт
          const transformedAccount = { ...account };
          
          // Если есть мета-данные с URL аватарки
          if (transformedAccount.meta && transformedAccount.meta.avatarUrl) {
            // Получаем чистый URL без параметров
            let cleanUrl = transformedAccount.meta.avatarUrl;
            if (cleanUrl.includes('?')) {
              cleanUrl = cleanUrl.split('?')[0];
            }
            
            // Добавляем новый timestamp
            transformedAccount.meta.avatarUrl = `${cleanUrl}?t=${Date.now()}`;
          }
          
          return transformedAccount;
        });
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
      .addCase(changeAvatar.pending, (state, action) => {
        state.avatarLoadingId = action.meta.arg.id;
        state.avatarError = null;
      })
      .addCase(changeAvatar.fulfilled, (state, action) => {
        state.avatarLoadingId = null;
        
        // Обновляем аватарку аккаунта в списке
        const { id, avatarUrl, account } = action.payload;
        const index = state.list.findIndex(acc => acc._id === id || acc.id === id);
        
        if (index !== -1) {
          // Если получили полный объект аккаунта с сервера, используем его
          if (account) {
            // Сохраняем ID, который может быть в разных форматах
            const existingId = state.list[index]._id || state.list[index].id;
            
            // Обновляем аккаунт, сохраняя его ID (может быть в _id или id)
            state.list[index] = {
              ...(typeof account === 'object' ? account : {}),
              _id: existingId,
              id: existingId
            };
            
            // Убеждаемся, что meta существует и содержит avatarUrl
            if (!state.list[index].meta) {
              state.list[index].meta = {};
            }
            
            // Всегда обновляем URL аватарки с добавлением timestamp для избежания кеширования
            if (avatarUrl) {
              // Удаляем старый timestamp если есть и добавляем новый
              let cleanUrl = avatarUrl;
              if (cleanUrl.includes('?')) {
                cleanUrl = cleanUrl.split('?')[0];
              }
              
              state.list[index].meta.avatarUrl = `${cleanUrl}?t=${Date.now()}`;
            }
          } 
          // Если не получили полный аккаунт, просто обновляем avatarUrl
          else {
            // Инициализируем meta если не существует
            if (!state.list[index].meta) {
              state.list[index].meta = {};
            }
            
            // Всегда обновляем URL аватарки с добавлением timestamp для избежания кеширования
            if (avatarUrl) {
              // Удаляем старый timestamp если есть и добавляем новый
              let cleanUrl = avatarUrl;
              if (cleanUrl.includes('?')) {
                cleanUrl = cleanUrl.split('?')[0];
              }
              
              state.list[index].meta.avatarUrl = `${cleanUrl}?t=${Date.now()}`;
            }
          }
        }
      })
      .addCase(changeAvatar.rejected, (state, action) => {
        state.avatarLoadingId = null;
        state.avatarError = action.payload;
      });
  }
});

export default accountsSlice.reducer;
