import api from '../../api/axios';
import { API } from '../../api/endpoints';

export const login = async (credentials) => {
  const res = await api.post(API.AUTH.LOGIN, credentials);
  return res.data;
};

export const register = async (data) => {
  const res = await api.post(API.AUTH.REGISTER, data);
  return res.data;
};

export const getProfile = async () => {
  const res = await api.get(API.AUTH.PROFILE);
  return res.data;
};

