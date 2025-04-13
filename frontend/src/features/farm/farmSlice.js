import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as farmAPI from './farmAPI';

// Асинхронные thunks
export const startFarm = createAsyncThunk(
  'farm/start',
  async ({ accountId, settings }, { rejectWithValue }) => {
    try {
      return await farmAPI.startFarm(accountId, settings);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Не удалось запустить фарминг');
    }
  }
);

export const getFarmStatus = createAsyncThunk(
  'farm/getStatus',
  async (accountId, { rejectWithValue }) => {
    try {
      return await farmAPI.getFarmStatus(accountId);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Не удалось получить статус фарминга');
    }
  }
);

export const stopFarm = createAsyncThunk(
  'farm/stop',
  async (farmId, { rejectWithValue }) => {
    try {
      return await farmAPI.stopFarm(farmId);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Не удалось остановить фарминг');
    }
  }
);

export const getFarmHistory = createAsyncThunk(
  'farm/getHistory',
  async (options, { rejectWithValue, getState }) => {
    try {
      // Получаем текущую историю
      const { farmHistory } = getState().farm;
      const result = await farmAPI.getFarmHistory(options);
      
      // Если загружается первая страница, возвращаем только её
      if (!options.skip || options.skip === 0) {
        return result;
      }
      
      // Иначе объединяем с предыдущими записями
      return [...farmHistory, ...result];
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Не удалось получить историю фарминга');
    }
  }
);

export const getFarmDetails = createAsyncThunk(
  'farm/getDetails',
  async (farmId, { rejectWithValue }) => {
    try {
      const result = await farmAPI.getFarmDetails(farmId);
      return result;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Не удалось получить детали фарминга');
    }
  }
);

// Начальное состояние
const initialState = {
  currentFarm: null,
  farmHistory: [],
  currentStatus: null,
  farmDetails: null,
  loading: false,
  error: null,
};

// Создаем slice
const farmSlice = createSlice({
  name: 'farm',
  initialState,
  reducers: {
    clearCurrentFarm: (state) => {
      state.currentFarm = null;
    },
    clearFarmDetails: (state) => {
      state.farmDetails = null;
    },
    clearFarmHistory: (state) => {
      state.farmHistory = [];
    },
    setFarmFilter: (state, action) => {
      state.filter = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Обработка запуска фарминга
      .addCase(startFarm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startFarm.fulfilled, (state, action) => {
        state.loading = false;
        state.currentFarm = action.payload;
      })
      .addCase(startFarm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Обработка получения статуса
      .addCase(getFarmStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFarmStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStatus = action.payload;
      })
      .addCase(getFarmStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Обработка остановки фарминга
      .addCase(stopFarm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(stopFarm.fulfilled, (state, action) => {
        state.loading = false;
        
        // Обновляем статус в текущем элементе статуса
        if (state.currentStatus && 
            state.currentStatus.farmId === action.meta.arg) {
          state.currentStatus.status = action.payload.status;
        }
        
        // Обновляем статус в истории фарминга
        state.farmHistory = state.farmHistory.map(item => {
          if ((item._id || item.id) === action.meta.arg) {
            return { ...item, status: action.payload.status };
          }
          return item;
        });
      })
      .addCase(stopFarm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Обработка получения истории
      .addCase(getFarmHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFarmHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.farmHistory = action.payload;
      })
      .addCase(getFarmHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Обработка получения деталей
      .addCase(getFarmDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFarmDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.farmDetails = action.payload;
      })
      .addCase(getFarmDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentFarm, clearFarmDetails, clearFarmHistory, setFarmFilter } = farmSlice.actions;
export default farmSlice.reducer;