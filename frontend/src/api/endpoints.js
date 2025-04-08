const BASE = '/'; // можно оставить пустым если API идет с корня

export const API = {
  AUTH: {
    LOGIN: `${BASE}auth/login`,
    REGISTER: `${BASE}auth/register`,
    PROFILE: `${BASE}auth/profile`,
    LOGOUT: `${BASE}auth/logout`,
  },
  ACCOUNTS: {
    LIST: `${BASE}accounts`,
    CREATE: `${BASE}accounts/create`,
    UPDATE: (id) => `${BASE}accounts/${id}/update`,
    DELETE: (id) => `${BASE}accounts/${id}/delete`,
  },
  FARMING: {
    START: `${BASE}farm/start`,
    STATUS: (accountId) => `${BASE}farm/status/${accountId}`,
  },
  PROXY: {
    LIST: `${BASE}proxy`,
    ASSIGN: (accountId) => `${BASE}proxy/${accountId}/assign`,
  },
};
