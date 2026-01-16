import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Avatar,
  Card,
  FAB,
  Text,
  useTheme,
  TouchableRipple,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ModernStyles from '../../../shared/theme/app.styles';
import { getAllUsers } from '../../users/service/user.service';
import { IUser } from '../../users/service/user.types';
import LoaderComponent from '../../../shared/components/LoaderComponent';
import { UserRole } from '../../../core/types/IUser';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY_GREEN = '#065911';

export const UserListScreen = () => {
    const insets = useSafeAreaInsets();
  
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await getAllUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, []),
  );

  const getRoleStyles = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return { color: '#dc2626', bg: '#fee2e2' };
      case UserRole.SHIFT_GUARD:
        return { color: '#7c3aed', bg: '#f5f3ff' };
      case UserRole.GUARD:
        return { color: PRIMARY_GREEN, bg: '#d0f8d3' };
      default:
        return { color: '#4b5563', bg: '#f3f4f6' };
    }
  };

  const renderItem = ({ item }: { item: IUser }) => {
    const roleStyle = getRoleStyles(item.role);

    return (
      <Card
        style={styles.card}
        elevation={0}
        onPress={() => navigation.navigate('EDIT_USER', { user: item })}
      >
        <View style={styles.cardInner}>
          <View style={styles.leftSection}>
            <Avatar.Text
              size={48}
              label={item.name.charAt(0).toUpperCase()}
              style={[styles.avatar, { backgroundColor: roleStyle.bg }]}
              labelStyle={{ color: roleStyle.color, fontWeight: '700' }}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {`${item.name} ${item.lastName || ''}`}
              </Text>
              <Text style={styles.usernameTag}>@{item.username}</Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
              <Text style={[styles.roleText, { color: roleStyle.color }]}>
                {item.role}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.active ? '#22c55e' : '#9ca3af' },
                ]}
              />
              <Text style={styles.statusText}>
                {item.active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.mainContainer}>
        {loading && users.length === 0 ? (
          <LoaderComponent />
        ) : (
          <FlatList
            data={users}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadUsers}
                colors={[PRIMARY_GREEN]}
              />
            }
          />
        )}

        <FAB
          icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 16 }]}
          color="#fff"
          onPress={() => navigation.navigate('CREATE_USER')}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbf4', // Fondo con tinte verde muy sutil
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f6fbf4',
  },
  listContent: {
    padding: 24,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 22,
    // Pro Shadow
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 0, // Removed border for cleaner look
  },
  cardInner: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    borderRadius: 18,
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C3D', // Dark blue text from check report
    marginBottom: 2,
  },
  usernameTag: {
    fontSize: 13,
    color: '#7E84A3', // Muted text from check report
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#7E84A3',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 24,
    right: 0,
    bottom: 10,
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 22,
    // Fab Shadow
    shadowColor: PRIMARY_GREEN,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
