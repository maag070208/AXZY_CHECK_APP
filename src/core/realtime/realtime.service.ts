import { get } from '../axios';

/** Token subscribe-only de Ably para los canales del alcance del usuario. */
export const getRealtimeToken = () => {
  return get<any>('/realtime/token');
};
