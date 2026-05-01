export interface IAuthToken {
  id: number;
  name: string;
  lastName: string;
  username: string;

  role: string;
  active: boolean;

  // Metadata
  iat: number;
  exp: number;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  SHIFT = 'SHIFT',
  GUARD = 'GUARD',
  MAINT = 'MAINT',
  RESDN = 'RESDN'
}
