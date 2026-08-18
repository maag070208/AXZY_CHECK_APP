import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple } from 'react-native-paper';
import { theme } from '../../../shared/theme/theme';
import {
  ChangelogResponse,
  summarizeChangelog,
} from '../../../core/offline/sync.changelog';
import { ChangeItem } from './ChangeItem';

interface ChangelogSectionProps {
  changelog: ChangelogResponse;
  onDismiss?: () => void;
}

/**
 * @description Sección visual que agrupa los cambios recibidos del servidor
 * tras una sincronización. Muestra resumen y, expandida, la lista por
 * recurso (rutas, ubicaciones, asignaciones, catálogos).
 */
export const ChangelogSection: React.FC<ChangelogSectionProps> = ({
  changelog,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(true);
  const summary = useMemo(() => summarizeChangelog(changelog), [changelog]);
  const totalChanges = summary.total;

  if (totalChanges === 0) return null;

  return (
    <Surface style={styles.container} elevation={0}>
      <TouchableRipple onPress={() => setExpanded(v => !v)}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Icon source="bell-ring-outline" size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>CAMBIOS RECIBIDOS</Text>
              <Text style={styles.subtitle}>
                {totalChanges} actualizacion{totalChanges > 1 ? 'es' : ''} desde la última sync
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalChanges}</Text>
            </View>
            <Icon
              source={expanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={theme.colors.grayDark}
            />
          </View>
        </View>
      </TouchableRipple>

      {expanded && (
        <View style={styles.body}>
          {summary.routesAdded + summary.routesModified > 0 && (
            <ResourceGroup
              title="Rutas / recorridos"
              icon="map-marker-path"
              count={summary.routesAdded + summary.routesModified}
            >
              {changelog.routes.added.map(r => (
                <ChangeItem
                  key={`route-added-${r.id}`}
                  kind="added"
                  title={r.title}
                  subtitle={`${r.locationCount} puntos de control`}
                  meta={formatDate(r.updatedAt)}
                />
              ))}
              {changelog.routes.modified.map(r => (
                <ChangeItem
                  key={`route-modified-${r.id}`}
                  kind="modified"
                  title={r.title}
                  subtitle={`${r.locationCount} puntos de control`}
                  meta={formatDate(r.updatedAt)}
                />
              ))}
            </ResourceGroup>
          )}

          {summary.locationsAdded + summary.locationsModified > 0 && (
            <ResourceGroup
              title="Puntos de control"
              icon="map-marker"
              count={summary.locationsAdded + summary.locationsModified}
            >
              {changelog.locations.added.map(l => (
                <ChangeItem
                  key={`loc-added-${l.id}`}
                  kind="added"
                  title={l.locationName}
                  subtitle={`${l.taskCount} tareas`}
                  meta={formatDate(l.updatedAt)}
                />
              ))}
              {changelog.locations.modified.map(l => (
                <ChangeItem
                  key={`loc-modified-${l.id}`}
                  kind="modified"
                  title={l.locationName}
                  subtitle={`${l.taskCount} tareas`}
                  meta={formatDate(l.updatedAt)}
                />
              ))}
            </ResourceGroup>
          )}

          {summary.assignmentsAdded + summary.assignmentsModified > 0 && (
            <ResourceGroup
              title="Asignaciones especiales"
              icon="star-outline"
              count={summary.assignmentsAdded + summary.assignmentsModified}
            >
              {changelog.specialAssignments.added.map(a => (
                <ChangeItem
                  key={`assign-added-${a.id}`}
                  kind="added"
                  title={a.locationName}
                  subtitle={a.notes || a.status}
                  meta={formatDate(a.updatedAt)}
                />
              ))}
              {changelog.specialAssignments.modified.map(a => (
                <ChangeItem
                  key={`assign-modified-${a.id}`}
                  kind="modified"
                  title={a.locationName}
                  subtitle={a.notes || a.status}
                  meta={formatDate(a.updatedAt)}
                />
              ))}
            </ResourceGroup>
          )}

          {summary.incidentTypesAdded > 0 && (
            <ResourceGroup
              title="Tipos de incidencia"
              icon="alert-octagon-outline"
              count={summary.incidentTypesAdded}
            >
              {changelog.catalogs.incidentTypes.added.map(t => (
                <ChangeItem
                  key={`inc-type-added-${t.id}`}
                  kind="added"
                  title={t.name}
                  subtitle={t.categoryName}
                  meta={formatDate(t.updatedAt)}
                />
              ))}
            </ResourceGroup>
          )}

          {summary.maintenanceTypesAdded > 0 && (
            <ResourceGroup
              title="Tipos de mantenimiento"
              icon="wrench-outline"
              count={summary.maintenanceTypesAdded}
            >
              {changelog.catalogs.maintenanceTypes.added.map(t => (
                <ChangeItem
                  key={`maint-type-added-${t.id}`}
                  kind="added"
                  title={t.name}
                  subtitle={t.categoryName}
                  meta={formatDate(t.updatedAt)}
                />
              ))}
            </ResourceGroup>
          )}

          {onDismiss && (
            <View style={styles.dismissRow}>
              <Text style={styles.dismissText} onPress={onDismiss}>
                Marcar como revisado
              </Text>
            </View>
          )}
        </View>
      )}
    </Surface>
  );
};

interface ResourceGroupProps {
  title: string;
  icon: string;
  count: number;
  children: React.ReactNode;
}

const ResourceGroup: React.FC<ResourceGroupProps> = ({ title, icon, count, children }) => (
  <View style={styles.group}>
    <View style={styles.groupHeader}>
      <Icon source={icon} size={14} color={theme.colors.grayDark} />
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCount}>
        <Text style={styles.groupCountText}>{count}</Text>
      </View>
    </View>
    <View style={styles.groupBody}>{children}</View>
  </View>
);

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.onSurface,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.grayDark,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  group: {
    paddingVertical: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  groupTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  groupCount: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  groupCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
  },
  groupBody: {
    paddingLeft: 0,
  },
  dismissRow: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 6,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
