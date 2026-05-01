
export enum AssignmentStatus {
  PENDING = 'PENDING',
  CHECKING = 'CHECKING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REVIEWED = 'REVIEWED',
  ANOMALY = 'ANOMALY',
}

export interface IAssignment {
  id: number;
  guardId: number;
  locationId: number;
  assignedBy: number;
  status: AssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: number;
    name: string;
    aisle: string;
    spot: string;
    number: string;
  };
  guard?: {
    id: number;
    name: string;
    lastName: string;
  };
  tasks?: {
    id: number;
    description: string;
    reqPhoto: boolean;
    completed: boolean;
    completedAt?: string;
  }[];
}

export interface CreateAssignmentDTO {
  guardId: number;
  locationId: number;
  notes?: string;
  tasks?: { description: string; reqPhoto: boolean }[];
  assignedBy?: string;
}
