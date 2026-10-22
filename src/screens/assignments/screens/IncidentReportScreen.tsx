import React from 'react';
import {
  ReportForm,
  ReportFormConfig,
  ReportFormState,
} from '../../../shared/components/ReportForm';
import { createIncident } from '../service/incident.service';

const config: ReportFormConfig = {
  title: 'Nuevo Reporte',
  accent: '#E53935',
  uploadFolder: 'incident',
  catalogs: {
    categoryKey: 'incident_category',
    typeKey: 'incident_type',
    filterByType: 'INCIDENT',
  },
  labels: {
    category: 'CATEGORÍA',
    type: 'TIPO DE INCIDENCIA',
    submitButton: 'ENVIAR REPORTE',
  },
  offlineKind: 'INCIDENT',
  successMessage: 'Reporte enviado con éxito',
};

export const IncidentReportScreen = () => {
  const handleSubmit = async (state: ReportFormState) => {
    return createIncident({
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
