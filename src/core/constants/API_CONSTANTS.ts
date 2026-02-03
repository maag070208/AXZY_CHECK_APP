export const API_CONSTANTS = {
  // BASE_URL: 'http://10.116.18.28:4444/api/v1',
  BASE_URL: 'https://axzycheckapi-production.up.railway.app/api/v1',
    ROUND_COOLDOWN_MINUTES: 5,
  TIMEOUT: 5000,
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },  
  URLS: {
    AUTH: {
      LOGIN: '/users/login',
    },
    ROUNDS: {
      START: '/rounds/start',
      END: '/rounds/end',
      CURRENT: '/rounds/current',
      ALL: '/rounds',
    },
  },
};
