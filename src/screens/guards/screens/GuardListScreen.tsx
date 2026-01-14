import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Avatar, Card, FAB, Text, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getUsers } from '../../kardex/service/kardex.service';
import { UserRole } from '../../../core/types/IUser';
import ModernStyles from '../../../shared/theme/app.styles';
import LoaderComponent from '../../../shared/components/LoaderComponent';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../shared/theme/theme';

export const GuardListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [guards, setGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGuards = async () => {
    setLoading(true);
    try {
      const response = await getUsers();
      if (response.success && response.data) {
        const onlyGuards = response.data.filter(
          (u: any) =>
            u.role === UserRole.GUARD || u.role === UserRole.SHIFT_GUARD,
        );
        setGuards(onlyGuards);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGuards();
    }, []),
  );

  const renderItem = ({ item }: { item: any }) => (
    <Card
      style={styles.card}
      onPress={() => {
        console.log(item);
        navigation.navigate('GUARD_DETAIL', { guard: item })
      }}
    >
      <Card.Title
        title={`${item.name} ${item.lastName || ''}`}
        subtitle={`@${item.username} • Turno: ${item.shiftStart || '--'} - ${
          item.shiftEnd || '--'
        }`}
        left={props => (
          <Avatar.Text
            {...props}
            label={item.name.charAt(0).toUpperCase()}
            style={{ backgroundColor: theme.colors.primary }}
          />
        )}
        right={props => (
          <Text variant="bodySmall" style={{ marginRight: 16, color: '#666' }}>
            {item.active ? 'Activo' : 'Inactivo'}
          </Text>
        )}
      />
    </Card>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#f6fbf4' }}
      edges={['right', 'left', 'bottom']}
    >
      <View style={{ flex: 1 }}>
        {loading && guards.length === 0 ? (
          <LoaderComponent />
        ) : (
          <FlatList
            data={guards}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadGuards}
                colors={[theme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Text>No hay guardias registrados.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...ModernStyles.shadowSm,
  },
  fab: {
    position: 'absolute',
    margin: 24,
    right: 0,
    bottom: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 22,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
