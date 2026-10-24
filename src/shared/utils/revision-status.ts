import { AssignmentStatus } from "../../screens/assignments/service/assignment.types";

export const getStatusColor = (status: AssignmentStatus): string => {
    switch (status) {
        case AssignmentStatus.PENDING:
            return '#F59E0B'; // Pendiente
        case AssignmentStatus.CHECKING:
            return '#0EA5E9'; // En verificación
        case AssignmentStatus.UNDER_REVIEW:
            return '#8B5CF6'; // En revisión
        case AssignmentStatus.REVIEWED:
            return '#12A36F'; // Completada
        case AssignmentStatus.ANOMALY:
            return '#E53935'; // Anomalía
        default:
            return '#94A3B8';
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
