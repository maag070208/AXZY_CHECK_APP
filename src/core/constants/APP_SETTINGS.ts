export const APP_SETTINGS = {
  ENCRYPTION_KEY: 'x322Gu0VgFm0sya5SqX',
  DB_KEY: 'PACKDB',
  SCAN_REQUIRED: true,
  VIDEO_DURATION_LIMIT: 10, // General limit
  INCIDENT_VIDEO_DURATION_LIMIT: 60, // 1 minute for incidents
  SHIFTS: {
    MATUTINO: {
      start: '07:00',
      end: '15:00',
    },
    VESPERTINO: {
      start: '15:00',
      end: '23:00',
    },
    NOCTURNO: {
      start: '23:00',
      end: '07:00',
    },
  },
};
