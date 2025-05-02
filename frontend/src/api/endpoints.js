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
    CHANGE_AVATAR: (id) => `${BASE}api/v1/accounts/${id}/avatar`,
    CREATE_DOLPHIN_PROFILE: `${BASE}api/v1/accounts/create-dolphin-profile`,
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
    GET: (id) => `${BASE}api/v1/proxy/${id}`,
    CREATE: `${BASE}api/v1/proxy`,
    CREATE_FROM_STRING: `${BASE}api/v1/proxy/create-from-string`,
    CREATE_BULK: `${BASE}api/v1/proxy/create-bulk`,
    UPDATE: (id) => `${BASE}api/v1/proxy/${id}`,
    DELETE: (id) => `${BASE}api/v1/proxy/${id}`,
    DELETE_BULK: `${BASE}api/v1/proxy/delete-bulk`,
    CHECK: (id) => `${BASE}api/v1/proxy/${id}/check`,
    CHECK_BULK: `${BASE}api/v1/proxy/check-bulk`,
    ASSIGN: (accountId) => `${BASE}api/v1/proxy/${accountId}/assign`,
    UNASSIGN: (id) => `${BASE}api/v1/proxy/${id}/unassign`,
  },
  REGISTRATION: {
    FACEBOOK: `${BASE}api/v1/registration/facebook`,
  },
  AGENT: {
    REGISTER_TOKEN: `${BASE}api/agent/register-token`,
    GET_STATUS: `${BASE}api/agent/status`,
    DOWNLOAD: `${BASE}api/agent/download`,
    COMMAND: `${BASE}api/agent/command`,
    RESET_CONNECTION: `${BASE}api/agent/reset-connection`,
  },
};