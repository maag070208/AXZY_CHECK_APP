export type Environment = 'DEV' | 'PROD' | 'LOCAL';

export const ENVIRONMENTS: Record<Environment, string> = {
  // BARCELONA: pendiente de publicar; reemplazar por la URL real cuando exista.
  DEV: 'https://api-barcerlona-residencial-checkapp-dev.up.railway.app/api/v1',
  PROD: 'https://pendiente-barcelona-prod.invalid/api/v1',
  LOCAL: 'http://192.168.10.102 :4444/api/v1',
};

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  DEV: 'Desarrollo',
  PROD: 'Producción',
  LOCAL: 'Local',
};

export const DEFAULT_ENVIRONMENT: Environment = 'LOCAL';

export const API_CONSTANTS = {
  BASE_URL: ENVIRONMENTS[DEFAULT_ENVIRONMENT],
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
