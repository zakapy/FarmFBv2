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

// Сменить аватарку аккаунта
export const changeAvatar = async (id, file) => {
  // Создаем FormData для отправки файла
  const formData = new FormData();
  formData.append('avatar', file);
  
  const res = await api.post(API.ACCOUNTS.CHANGE_AVATAR(id), formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return res.data;
};

// Создать профиль Dolphin для создания FB аккаунта
export const createDolphinProfile = async (proxyData) => {
  const res = await api.post(API.ACCOUNTS.CREATE_DOLPHIN_PROFILE, proxyData);
  return res.data;
};
