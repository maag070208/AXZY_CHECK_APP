import { get, post, put, remove } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export type VehicleStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';

export interface Vehicle {
  id: number;
  propertyId: number;
  property?: { id: number; identifier: string; name: string } | null;
  ownerId: number;
  owner?: { id: number; name: string; lastName: string | null } | null;
  plate: string;
  tagCode: string | null;
  kind: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  status: VehicleStatus;
  notes: string | null;
  createdAt: string;
}

export interface VehicleInput {
  plate: string;
  kind?: string;
  brand?: string;
  model?: string;
  color?: string;
  notes?: string;
}

export const getMyVehicles = (): Promise<TResult<Vehicle[]>> => get('/vehicles/me');

export const createVehicle = (input: VehicleInput): Promise<TResult<Vehicle>> => post('/vehicles/me', input);

export const updateVehicle = (id: number, input: VehicleInput): Promise<TResult<Vehicle>> => put(`/vehicles/me/${id}`, input);

export const deleteVehicle = (id: number): Promise<TResult<{ id: number }>> => remove(`/vehicles/me/${id}`);

export const lookupVehicles = (q: string): Promise<TResult<Vehicle[]>> => get('/vehicles/lookup', { params: { q } });

export const registerVehicleAccess = (id: number, direction: 'ENTRY' | 'EXIT') =>
  post(`/vehicles/${id}/access`, { direction });
