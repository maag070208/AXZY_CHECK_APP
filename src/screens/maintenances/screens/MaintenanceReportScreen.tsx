import React from 'react';
import {
  ReportForm,
  ReportFormConfig,
  ReportFormState,
} from '../../../shared/components/ReportForm';
import { createMaintenance } from '../service/maintenance.service';

const config: ReportFormConfig = {
  title: 'Nuevo Mantenimiento',
  accent: '#FB8C00',
  uploadFolder: 'maintenance',
  catalogs: {
    categoryKey: 'incident_category',
    typeKey: 'incident_type',
    filterByType: 'MAINTENANCE',
  },
  labels: {
    category: 'CATEGORÍA',
    type: 'TIPO DE MANTENIMIENTO',
    submitButton: 'ENVIAR REPORTE',
  },
  offlineKind: 'MAINTENANCE',
  successMessage: 'Mantenimiento reportado con éxito',
};

export const MaintenanceReportScreen = () => {
  const handleSubmit = async (state: ReportFormState) => {
    return createMaintenance({
      title: state.title,
      categoryId: state.categoryId as number,
      typeId: state.typeId as number,
      description: state.description,
      media: state.media,
      latitude: state.latitude,
      longitude: state.longitude,
    });
  };

  return <ReportForm config={config} onSubmit={handleSubmit} />;
};
