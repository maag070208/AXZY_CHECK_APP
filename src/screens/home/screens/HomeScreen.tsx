import { FlatList, StyleSheet, View } from 'react-native';
import ModernStyles from '../../../shared/theme/app.styles';
import { HomeItemComponent } from '../components/HomeItemComponent';

const MODULES = [
  {
    id: 'locations',
    label: 'Ubicaciones',
    icon: 'map-marker-outline',
    stack: 'LOCATIONS_STACK',
    screen: 'LOCATIONS_MAIN',
    color: '#0e6ed4ff',
    gradient: ['#6366f1', '#818cf8'],
  },
];

export const HomeScreen = () => {
  return (
    <View style={[ModernStyles.screenContainer, styles.container]}>
      {/* Grid de módulos */}
      <FlatList
        data={MODULES}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <HomeItemComponent
            icon={item.icon}
            label={item.label}
            stack={item.stack}
            screen={item.screen}
            color={item.color}
            gradient={item.gradient}
          />
        )}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...ModernStyles.shadowLg,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  grid: {
    padding: 16,
    paddingBottom: 120,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...ModernStyles.shadowLg,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    minWidth: 80,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    textAlign: 'center',
  },
});
