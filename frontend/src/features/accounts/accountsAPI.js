import api from '../../api/axios';
import { API } from '../../api/endpoints';

// Получить список аккаунтов
export const getAccounts = async () => {
  const res = await api.get(API.ACCOUNTS.LIST);
  return res.data;
};

// Создать аккаунт (куки + прокси + мета)
export const createAccount = async (accountData) => {
  const res = await api.post(API.ACCOUNTS.CREATE, accountData);
  return res.data;
};

// Обновить аккаунт
export const updateAccount = async (id, updates) => {
  const res = await api.put(API.ACCOUNTS.UPDATE(id), updates);
  return res.data;
};

// Удалить аккаунт
export const deleteAccount = async (id) => {
  const res = await api.delete(API.ACCOUNTS.DELETE(id));
  return res.data;
};
