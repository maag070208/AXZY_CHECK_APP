export const API_CONSTANTS = {
  // BASE_URL: 'http://192.168.10.100:4444/api/v1',
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
    TRAVEL: {
      GET_ALL: '/Travel',
      SEARCH: '/Travel/Search',
      BY_ID: '/Travel/', // + {id}
      STATUS: '/Travel/{id}/status',
    },
    TRAVEL_CONFIRM: {
      BASE: '/TravelConfirm',
      BY_REQUEST: '/TravelConfirm/ByRequest/',
    },
    TRAVEL_DEPOSIT: {
      BASE: '/TravelDeposit',
      BY_REQUEST: '/TravelDeposit/ByRequest/',
    },
  },
};
