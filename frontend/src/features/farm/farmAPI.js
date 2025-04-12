import api from '../../api/axios';
import { API } from '../../api/endpoints';

/**
 * Запуск фарминга для аккаунта
 * @param {string} accountId - ID аккаунта
 * @param {Object} settings - Настройки фарминга
 * @returns {Promise<Object>} - Результат запроса
 */
export const startFarm = async (accountId, settings = {}) => {
  const res = await api.post(API.FARMING.START, { accountId, settings });
  return res.data;
};

/**
 * Получение статуса фарминга для аккаунта
 * @param {string} accountId - ID аккаунта
 * @returns {Promise<Object>} - Информация о статусе
 */
export const getFarmStatus = async (accountId) => {
  const res = await api.get(API.FARMING.STATUS(accountId));
  return res.data;
};

/**
 * Остановка фарминга
 * @param {string} farmId - ID записи фарминга
 * @returns {Promise<Object>} - Результат операции
 */
export const stopFarm = async (farmId) => {
  const res = await api.post(API.FARMING.STOP(farmId));
  return res.data;
};

/**
 * Получение истории фарминга с возможностью фильтрации и пагинации
 * @param {Object} options - Параметры запроса
 * @param {number} options.limit - Ограничение количества записей
 * @param {number} options.skip - Смещение для пагинации
 * @param {string} options.accountId - Фильтр по ID аккаунта
 * @param {string} options.status - Фильтр по статусу
 * @returns {Promise<Array>} - Список записей истории
 */
export const getFarmHistory = async (options = {}) => {
  const { limit, skip, accountId, status } = options;
  let url = API.FARMING.HISTORY;
  
  // Добавляем параметры запроса, если они переданы
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit);
  if (skip) params.append('skip', skip);
  if (accountId) params.append('accountId', accountId);
  if (status) params.append('status', status);
  
  // Если есть параметры, добавляем их к URL
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const res = await api.get(url);
  return res.data;
};

/**
 * Получение деталей фарминга
 * @param {string} farmId - ID записи фарминга
 * @returns {Promise<Object>} - Детальная информация
 */
export const getFarmDetails = async (farmId) => {
  const res = await api.get(API.FARMING.DETAILS(farmId));
  return res.data;
};

/**
 * Получение подробной статистики фарминга
 * @param {Object} options - Параметры запроса
 * @returns {Promise<Object>} - Статистические данные
 */
export const getFarmStats = async (options = {}) => {
  const { period, accountId } = options;
  let url = `${API.FARMING.BASE}/stats`;
  
  // Добавляем параметры запроса, если они переданы
  const params = new URLSearchParams();
  if (period) params.append('period', period);
  if (accountId) params.append('accountId', accountId);
  
  // Если есть параметры, добавляем их к URL
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const res = await api.get(url);
  return res.data;
};