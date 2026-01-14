import { get, post, put, remove } from '../../../core/axios';
import { ILocationCreate } from '../type/location.types';

export const getLocations = async () => {
  const response = await get('/locations');
  return { success: true, data: response.data };
};

export const createLocation = async (data: ILocationCreate) => {
  const response = await post('/locations', data);
  return { success: true, data: response.data };
};

export const updateLocation = async (id: number, data: ILocationCreate) => {
  const response = await put(`/locations/${id}`, data);
  return { success: true, data: response.data };
};

export const deleteLocation = async (id: number) => {
  const response = await remove(`/locations/${id}`);
  return { success: true, data: response.data };
};
