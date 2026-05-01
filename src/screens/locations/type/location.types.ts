export interface ILocation {
  id: number;
  name: string;
  aisle: string;
  spot: string;
  number: string;
  active: boolean;
  isOccupied?: boolean;
}

export interface ILocationCreate {
  name?: string;
  aisle: string;
  spot: string;
  number: string;
}

export interface ILocationBatch {
  aisle: string;
  spot: string;
  number: string;
}
