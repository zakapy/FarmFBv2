import api from '../../api/axios';
import { API } from '../../api/endpoints';

// Получить список прокси с возможностью фильтрации
export const getProxies = async (filters = {}) => {
  try {
    const res = await api.get(API.PROXY.LIST, { params: filters });
    return res.data;
  } catch (error) {
    console.error('Ошибка при получении списка прокси:', error);
    throw error.response?.data?.error || error.message || 'Ошибка при получении списка прокси';
  }
};

// Получить прокси по ID
export const getProxyById = async (id) => {
  try {
    const res = await api.get(API.PROXY.GET(id));
    return res.data;
  } catch (error) {
    console.error(`Ошибка при получении прокси с ID ${id}:`, error);
    throw error.response?.data?.error || error.message || 'Ошибка при получении прокси';
  }
};

// Создать прокси 
export const createProxy = async (proxyData) => {
  try {
    const res = await api.post(API.PROXY.CREATE, proxyData);
    return res.data;
  } catch (error) {
    console.error('Ошибка при создании прокси:', error);
    throw error.response?.data?.error || error.message || 'Ошибка при создании прокси';
  }
};

// Создать прокси из строки ip:port:login:pass
export const createProxyFromString = async (data) => {
  try {
    const res = await api.post(API.PROXY.CREATE_FROM_STRING, data);
    return res.data;
  } catch (error) {
    console.error('Ошибка при создании прокси из строки:', error);
    throw error.response?.data?.error || error.message || 'Ошибка при создании прокси из строки';
  }
};

// Массовое создание прокси
export const createProxiesBulk = async (data) => {
  try {
    const res = await api.post(API.PROXY.CREATE_BULK, data);
    return res.data;
  } catch (error) {
    console.error('Ошибка при массовом создании прокси:', error);
    throw error.response?.data?.error || error.message || 'Ошибка при массовом создании прокси';
  }
};

// Обновить прокси
export const updateProxy = async (id, updates) => {
  try {
    const res = await api.put(API.PROXY.UPDATE(id), updates);
    return res.data;
  } catch (error) {
    console.error(`Ошибка при обновлении прокси с ID ${id}:`, error);
    throw error.response?.data?.error || error.message || 'Ошибка при обновлении прокси';
  }
};

// Удалить прокси
export const deleteProxy = async (id) => {
  try {
    const res = await api.delete(API.PROXY.DELETE(id));
    return res.data;
  } catch (error) {
    console.error(`Ошибка при удалении прокси с ID ${id}:`, error);
    throw error.response?.data?.error || error.message || 'Ошибка при удалении прокси';
  }
};

// Массовое удаление прокси
export const deleteProxiesBulk = async (ids) => {
  try {
    const res = await api.post(API.PROXY.DELETE_BULK, { ids });
    return res.data;
  } catch (error) {
    console.error('Ошибка при массовом удалении прокси:', error);
    throw error.response?.data?.error || error.message || 'Ошибка при массовом удалении прокси';
  }
};

// Проверить прокси
export const checkProxy = async (id) => {
  try {
    const res = await api.post(API.PROXY.CHECK(id));
    return res.data;
  } catch (error) {
    console.error(`Ошибка при проверке прокси с ID ${id}:`, error);
    throw error.response?.data?.error || error.message || 'Ошибка при проверке прокси';
  }
};

// Массовая проверка прокси
export const checkProxiesBulk = async (ids) => {
  try {
    const res = await api.post(API.PROXY.CHECK_BULK, { ids });
    return res.data;
  } catch (error) {
    console.error('Ошибка при массовой проверке прокси:', error);
    throw error.response?.data?.error || error.message || 'Ошибка при массовой проверке прокси';
  }
};

// Назначить прокси на аккаунт
export const assignProxy = async (accountId, proxyId) => {
  try {
    const res = await api.post(API.PROXY.ASSIGN(accountId), { proxyId });
    return res.data;
  } catch (error) {
    console.error(`Ошибка при назначении прокси аккаунту ${accountId}:`, error);
    throw error.response?.data?.error || error.message || 'Ошибка при назначении прокси';
  }
};

// Освободить прокси от аккаунта
export const unassignProxy = async (id) => {
  try {
    const res = await api.post(API.PROXY.UNASSIGN(id));
    return res.data;
  } catch (error) {
    console.error(`Ошибка при освобождении прокси с ID ${id}:`, error);
    throw error.response?.data?.error || error.message || 'Ошибка при освобождении прокси';
  }
}; 