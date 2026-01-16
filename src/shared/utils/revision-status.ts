import { AssignmentStatus } from "../../screens/assignments/service/assignment.types";

export const getStatusColor = (status: AssignmentStatus): string => {
    switch (status) {
        case AssignmentStatus.PENDING:
            return '#9E9E9E'; // Gray
        case AssignmentStatus.CHECKING:
            return '#2196F3'; // Blue
        case AssignmentStatus.UNDER_REVIEW:
            return '#FF9800'; // Orange
        case AssignmentStatus.REVIEWED:
            return '#4CAF50'; // Green
        case AssignmentStatus.ANOMALY:
            return '#F44336'; // Red
        default:
            return '#9E9E9E';
    }
};

export const getStatusText = (status: AssignmentStatus): string => {
    switch (status) {
        case AssignmentStatus.PENDING:
            return 'Pendiente';
        case AssignmentStatus.CHECKING:
            return 'En Verificación';
        case AssignmentStatus.UNDER_REVIEW:
            return 'En Revisión';
        case AssignmentStatus.REVIEWED:
            return 'Completado';
        case AssignmentStatus.ANOMALY:
            return 'Anomalía';
        default:
            return 'Desconocido';
    }
};
