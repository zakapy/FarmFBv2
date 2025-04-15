import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as proxiesAPI from './proxiesAPI';

// Thunks
export const fetchProxies = createAsyncThunk(
  'proxies/fetch',
  async (filters, thunkAPI) => {
    try {
      return await proxiesAPI.getProxies(filters);
    } catch (err) {
      return thunkAPI.rejectWithValue('Не удалось получить прокси');
    }
  }
);

export const addProxy = createAsyncThunk(
  'proxies/add',
  async (data, thunkAPI) => {
    try {
      return await proxiesAPI.createProxy(data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Ошибка при создании прокси';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

export const addProxyFromString = createAsyncThunk(
  'proxies/addFromString',
  async (data, thunkAPI) => {
    try {
      return await proxiesAPI.createProxyFromString(data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Ошибка при создании прокси из строки';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

export const addProxiesBulk = createAsyncThunk(
  'proxies/addBulk',
  async (data, thunkAPI) => {
    try {
      return await proxiesAPI.createProxiesBulk(data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Ошибка при массовом создании прокси';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

export const editProxy = createAsyncThunk(
  'proxies/update',
  async ({ id, data }, thunkAPI) => {
    try {
      return await proxiesAPI.updateProxy(id, data);
    } catch (err) {
      return thunkAPI.rejectWithValue('Ошибка при обновлении прокси');
    }
  }
);

export const removeProxy = createAsyncThunk(
  'proxies/delete',
  async (id, thunkAPI) => {
    try {
      await proxiesAPI.deleteProxy(id);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue('Ошибка при удалении прокси');
    }
  }
);

export const removeProxiesBulk = createAsyncThunk(
  'proxies/deleteBulk',
  async (ids, thunkAPI) => {
    try {
      await proxiesAPI.deleteProxiesBulk(ids);
      return ids;
    } catch (err) {
      return thunkAPI.rejectWithValue('Ошибка при массовом удалении прокси');
    }
  }
);

export const checkProxyStatus = createAsyncThunk(
  'proxies/check',
  async (id, thunkAPI) => {
    try {
      return await proxiesAPI.checkProxy(id);
    } catch (err) {
      return thunkAPI.rejectWithValue('Ошибка при проверке прокси');
    }
  }
);

export const checkProxiesBulkStatus = createAsyncThunk(
  'proxies/checkBulk',
  async (ids, thunkAPI) => {
    try {
      return await proxiesAPI.checkProxiesBulk(ids);
    } catch (err) {
      return thunkAPI.rejectWithValue('Ошибка при массовой проверке прокси');
    }
  }
);

const proxiesSlice = createSlice({
  name: 'proxies',
  initialState: {
    list: [],
    selectedProxies: [],
    loading: false,
    error: null,
    searchTerm: '',
  },
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    selectProxy: (state, action) => {
      const id = action.payload;
      if (!state.selectedProxies.includes(id)) {
        state.selectedProxies.push(id);
      }
    },
    deselectProxy: (state, action) => {
      const id = action.payload;
      state.selectedProxies = state.selectedProxies.filter(proxyId => proxyId !== id);
    },
    selectAllProxies: (state) => {
      state.selectedProxies = state.list.map(proxy => proxy._id);
    },
    deselectAllProxies: (state) => {
      state.selectedProxies = [];
    },
    resetProxiesError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Получение списка прокси
      .addCase(fetchProxies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProxies.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchProxies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Создание прокси
      .addCase(addProxy.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(addProxy.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Создание прокси из строки
      .addCase(addProxyFromString.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(addProxyFromString.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Массовое создание прокси
      .addCase(addProxiesBulk.fulfilled, (state, action) => {
        if (action.payload.results && action.payload.results.length > 0) {
          state.list = [...action.payload.results, ...state.list];
        }
      })
      .addCase(addProxiesBulk.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Обновление прокси
      .addCase(editProxy.fulfilled, (state, action) => {
        const updatedProxy = action.payload;
        const index = state.list.findIndex(proxy => proxy._id === updatedProxy._id);
        if (index !== -1) {
          state.list[index] = updatedProxy;
        }
      })
      .addCase(editProxy.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Удаление прокси
      .addCase(removeProxy.fulfilled, (state, action) => {
        state.list = state.list.filter(proxy => proxy._id !== action.payload);
        state.selectedProxies = state.selectedProxies.filter(id => id !== action.payload);
      })
      .addCase(removeProxy.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Массовое удаление прокси
      .addCase(removeProxiesBulk.fulfilled, (state, action) => {
        const deletedIds = action.payload;
        state.list = state.list.filter(proxy => !deletedIds.includes(proxy._id));
        state.selectedProxies = state.selectedProxies.filter(id => !deletedIds.includes(id));
      })
      .addCase(removeProxiesBulk.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Проверка прокси
      .addCase(checkProxyStatus.fulfilled, (state, action) => {
        const updatedProxy = action.payload;
        const index = state.list.findIndex(proxy => proxy._id === updatedProxy._id);
        if (index !== -1) {
          state.list[index] = updatedProxy;
        }
      })
      .addCase(checkProxyStatus.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Массовая проверка прокси
      .addCase(checkProxiesBulkStatus.fulfilled, (state, action) => {
        const updatedProxies = action.payload;
        updatedProxies.forEach(updatedProxy => {
          if (updatedProxy._id) {
            const index = state.list.findIndex(proxy => proxy._id === updatedProxy._id);
            if (index !== -1) {
              state.list[index] = updatedProxy;
            }
          }
        });
      })
      .addCase(checkProxiesBulkStatus.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

export const { 
  setSearchTerm, 
  selectProxy, 
  deselectProxy, 
  selectAllProxies, 
  deselectAllProxies,
  resetProxiesError
} = proxiesSlice.actions;

export default proxiesSlice.reducer; 