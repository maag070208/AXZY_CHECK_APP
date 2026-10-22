import React from 'react';
import {
  ReportForm,
  ReportFormConfig,
  ReportFormState,
} from '../../../shared/components/ReportForm';
import { createClub } from '../service/club.service';

const config: ReportFormConfig = {
  title: 'Nuevo Reporte Casa Club',
  accent: '#0EA5E9',
  uploadFolder: 'club',
  catalogs: {
    categoryKey: 'club_category',
    typeKey: 'club_type',
    autoSelectFirst: true,
  },
  labels: {
    category: 'CATEGORÍA',
    type: 'TIPO DE REPORTE',
    submitButton: 'ENVIAR REPORTE',
  },
  offlineKind: 'CLUB',
  successMessage: 'Reporte de Casa Club enviado',
};

export const ClubReportScreen = () => {
  const handleSubmit = async (state: ReportFormState) => {
    return createClub({
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
