export const API_CONSTANTS = {
  // BASE_URL: 'http://192.168.10.109:4444/api/v1',
  BASE_URL: 'https://axzycheckapi-production.up.railway.app/api/v1',
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
      END: '/rounds/end', // Note: Needs ID injected
      CURRENT: '/rounds/current',
    },
  },
};
