const BASE = '/'; // определяем BASE здесь

export const API = {
  AUTH: {
    LOGIN: `${BASE}api/v1/auth/login`,
    REGISTER: `${BASE}api/v1/auth/register`,
    PROFILE: `${BASE}api/v1/auth/profile`,
    LOGOUT: `${BASE}api/v1/auth/logout`,
  },
  ACCOUNTS: {
    LIST: `${BASE}api/v1/accounts`,
    CREATE: `${BASE}api/v1/accounts/create`,
    UPDATE: (id) => `${BASE}api/v1/accounts/${id}/update`,
    DELETE: (id) => `${BASE}api/v1/accounts/${id}/delete`,
    CHECK_PROXY: `${BASE}api/v1/accounts/check-proxy`,
    SYNC_DOLPHIN: (id) => `${BASE}api/v1/accounts/${id}/sync-dolphin`,
  },
  FARMING: {
    BASE: `${BASE}api/v1/farm`,
    START: `${BASE}api/v1/farm/start`,
    STATUS: (accountId) => `${BASE}api/v1/farm/status/${accountId}`,
    STOP: (farmId) => `${BASE}api/v1/farm/stop/${farmId}`,
    HISTORY: `${BASE}api/v1/farm/history`,
    DETAILS: (farmId) => `${BASE}api/v1/farm/details/${farmId}`,
  },
  PROXY: {
    LIST: `${BASE}api/v1/proxy`,
    ASSIGN: (accountId) => `${BASE}api/v1/proxy/${accountId}/assign`,
  },
};