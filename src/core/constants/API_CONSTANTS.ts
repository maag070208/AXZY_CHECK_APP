export const API_CONSTANTS = {
  BASE_URL: 'https://axzy-checkapp-bonaterra-dev-api.up.railway.app/api/v1',
  // BONATERRA
  // BASE_URL: 'https://axzy-checkapp-bonaterra-prod-api.up.railway.app/api/v1',
  //DEMO
  // BASE_URL: 'https://axzy-checkapp-bonaterra-dev-api.up.railway.app/api/v1',
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
    SYNC: {
      CHANGELOG: '/sync/changelog',
    },
  },
};
