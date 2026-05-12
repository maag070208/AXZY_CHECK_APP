export const API_CONSTANTS = {
  // BASE_URL: 'http://192.168.10.106:4444/api/v1',
  // BONATERRA
  // BASE_URL: 'https://axzy-checkapp-bonaterra-prod-api.up.railway.app/api/v1',
  //DEMO
  // BASE_URL: 'https://glorious-quietude-production-77ab.up.railway.app/api/v1',
  //Villas DEMO
  BASE_URL: 'https://demo-checkapp-hotel-villas.up.railway.app/api/v1',

  ROUND_COOLDOWN_MINUTES: 0,
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
//
