import api from '../../api/axios';
import { API } from '../../api/endpoints';

// Запуск фарминга
export const startFarm = async (accountId, settings = {}) => {
  const res = await api.post(API.FARMING.START, { accountId, settings });
  return res.data;
};

// Получение статуса фарминга для аккаунта
export const getFarmStatus = async (accountId) => {
  const res = await api.get(API.FARMING.STATUS(accountId));
  return res.data;
};

// Остановка фарминга
export const stopFarm = async (farmId) => {
  const res = await api.post(API.FARMING.STOP(farmId));
  return res.data;
};

// Получение истории фарминга
export const getFarmHistory = async (options = {}) => {
  const { limit, skip, accountId } = options;
  let url = API.FARMING.HISTORY;
  
  // Добавляем параметры запроса, если они переданы
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit);
  if (skip) params.append('skip', skip);
  if (accountId) params.append('accountId', accountId);
  
  // Если есть параметры, добавляем их к URL
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const res = await api.get(url);
  return res.data;
};

// Получение деталей фарминга
export const getFarmDetails = async (farmId) => {
  const res = await api.get(API.FARMING.DETAILS(farmId));
  return res.data;
};