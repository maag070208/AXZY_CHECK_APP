import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Chip, Divider, IconButton, Searchbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllUsers } from '../../users/service/user.service';
import { IUser } from '../../users/service/user.types';

// Paleta de colores
const COLORS = {
  primary: '#065911',
  primaryLight: '#d0f8d3',
  primaryDark: '#022104',
  secondary: '#54634d',
  secondaryLight: '#d7e8cd',
  tertiary: '#38656a',
  tertiaryLight: '#bcebf0',
  background: '#FFFFFF',
  surface: '#F9FBF9',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E5E9E5',
  error: '#D32F2F',
  success: '#065911',
  warning: '#FF9800',
};

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onAssign: (guardIds: number[]) => void;
  loading?: boolean;
  initialSelectedIds?: number[];
}

export const AssignGuardModal = ({ visible, onDismiss, onAssign, loading, initialSelectedIds = [] }: Props) => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      loadGuards();
      setSelectedIds(initialSelectedIds);
    } else {
      // Reset search when closing
      setSearch('');
    }
  }, [visible, initialSelectedIds]);

  const loadGuards = async () => {
    setFetching(true);
    try {
      const res = await getAllUsers();
      if (res.success) {
        // Filter mainly guards or shift guards
        const guards = (res.data || []).filter((u: any) => u.role === 'GUARD' || u.role === 'SHIFT_GUARD');
        setUsers(guards);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      const allIds = filteredUsers.map(u => u.id);
      setSelectedIds(allIds);
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.name} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) 
  );

  const getAvatarLabel = (user: IUser) => {
    if (user.name && user.lastName) {
      return `${user.name.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user.name ? user.name.substring(0, 2).toUpperCase() : '??';
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'SHIFT_GUARD': return 'Jefe de Turno';
      case 'GUARD': return 'Guardia';
      case 'SUPERVISOR': return 'Supervisor';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'SHIFT_GUARD': return COLORS.tertiary;
      case 'GUARD': return COLORS.primary;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet" 
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <IconButton 
              icon="close" 
              size={24} 
              onPress={onDismiss}
              iconColor={COLORS.textPrimary}
              style={styles.backButton}
            />
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.title}>
                Asignar Guardias
              </Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Selecciona el personal responsable
              </Text>
            </View>
          </View>
          
          <View style={styles.headerStats}>
            <Chip 
              icon="account-group" 
              style={styles.totalChip}
              textStyle={styles.chipText}
            >
              {users.length} disponibles
            </Chip>
            {selectedIds.length > 0 && (
              <Chip 
                icon="check-circle" 
                style={styles.selectedChip}
                textStyle={styles.chipText}
              >
                {selectedIds.length} seleccionados
              </Chip>
            )}
          </View>
        </View>

        {/* Search and Select All */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar por nombre..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
            iconColor={COLORS.primary}
            placeholderTextColor={COLORS.textSecondary}
            elevation={0}
          />
          
          {filteredUsers.length > 0 && (
            <Button 
              mode="text" 
              onPress={handleSelectAll}
              icon={selectedIds.length === filteredUsers.length ? "checkbox-multiple-marked" : "checkbox-multiple-blank-outline"}
              labelStyle={styles.selectAllLabel}
              compact
              style={styles.selectAllButton}
            >
              {selectedIds.length === filteredUsers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Button>
          )}
        </View>

        {/* Content */}
        <View style={{flex: 1}}>
            {fetching ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator 
                size="large" 
                color={COLORS.primary}
                animating={true}
                />
                <Text style={styles.loadingText}>
                Cargando personal...
                </Text>
            </View>
            ) : (
            <>
                {/* Empty State */}
                {filteredUsers.length === 0 && (
                <View style={styles.emptyContainer}>
                    <IconButton 
                    icon="account-search" 
                    size={60} 
                    iconColor={COLORS.border}
                    style={styles.emptyIcon}
                    />
                    <Text style={styles.emptyTitle}>
                    {search ? 'No se encontraron resultados' : 'No hay guardias disponibles'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                    {search ? 'Intenta con otros términos de búsqueda' : 'No hay personal asignable en este momento'}
                    </Text>
                </View>
                )}

                {/* Users List */}
                <FlatList
                data={filteredUsers}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => (
                    <Divider style={styles.divider} />
                )}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isSelected = selectedIds.includes(item.id);
                    const roleColor = getRoleColor(item.role);
                    
                    return (
                      <TouchableOpacity 
                        onPress={() => toggleSelection(item.id)}
                        activeOpacity={0.7}
                        style={[
                            styles.userCard,
                            isSelected && styles.userCardSelected
                        ]}
                      >
                        <View style={styles.cardContent}>
                            <View style={styles.avatarContainer}>
                                 <Avatar.Text 
                                    size={46} 
                                    label={getAvatarLabel(item)}
                                    style={[
                                        styles.avatar,
                                        { backgroundColor: isSelected ? COLORS.primary : '#F0F0F0' },
                                        isSelected && { borderWidth: 2, borderColor: COLORS.primary }
                                    ]}
                                    color={isSelected ? '#fff' : '#555'}
                                    labelStyle={{fontWeight: 'bold', fontSize: 18}}
                                 />
                                 {isSelected && (
                                     <View style={styles.checkBadge}>
                                         <IconButton icon="check" iconColor="#fff" size={12} style={{margin:0}} />
                                     </View>
                                 )}
                            </View>

                            <View style={styles.cardTextContainer}>
                                <Text style={[styles.cardName, isSelected && styles.cardNameSelected]} numberOfLines={1}>
                                    {item.name} {item.lastName}
                                </Text>
                                <View style={styles.roleContainer}>
                                    <View style={[styles.roleIndicator, { backgroundColor: roleColor }]} />
                                    <Text style={styles.roleName}>{getRoleLabel(item.role)}</Text>
                                </View>
                            </View>

                            <View style={styles.checkboxContainer}>
                                <View style={[
                                    styles.radioCircle,
                                    isSelected && styles.radioCircleSelected
                                ]}>
                                    {isSelected && <View style={styles.radioInner} />}
                                </View>
                            </View>
                        </View>
                      </TouchableOpacity>
                    );
                }}
                />
            </>
            )}
        </View>

        {/* Footer with Action Buttons */}
        <View style={styles.footer}>
          <Button 
            mode="outlined" 
            onPress={onDismiss}
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonLabel}
            contentStyle={styles.buttonContent}
          >
            Cancelar
          </Button>
          
          <Button 
            mode="contained" 
            onPress={() => onAssign(selectedIds)} 
            loading={loading} 
            disabled={loading || selectedIds.length === 0}
            style={[
              styles.assignButton,
              selectedIds.length === 0 && styles.assignButtonDisabled
            ]}
            labelStyle={styles.assignButtonLabel}
            contentStyle={styles.buttonContent}
            icon={selectedIds.length > 0 ? "check-circle" : "account-check"}
          >
            {selectedIds.length > 0 
              ? `Asignar (${selectedIds.length})`
              : 'Seleccionar guardias'
            }
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.surface,
    marginTop: 20,  
  },
  header: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  headerStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  totalChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 28,
  },
  selectedChip: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    height: 28,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  searchbar: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 0,
    marginBottom: 8,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  selectAllButton: {
    alignSelf: 'flex-start',
  },
  selectAllLabel: {
    fontSize: 13,
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  divider: {
    backgroundColor: COLORS.border,
    marginLeft: 68,
  },
  userCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  userCardSelected: {
    backgroundColor: COLORS.primaryLight + '30',
    borderColor: COLORS.primaryLight,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
      elevation: 2,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardNameSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  roleName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  checkboxContainer: {
    marginLeft: 12,
  },
  radioCircle: {
      height: 22,
      width: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
  },
  radioCircleSelected: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary,
  },
  radioInner: {
      height: 10,
      width: 10,
      borderRadius: 5,
      backgroundColor: '#fff',
  },
  footer: {
    backgroundColor: COLORS.background,
    padding: 20,
    paddingBottom: 10, // Reduced as safe area handles bottom
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cancelButton: {
    flex: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  cancelButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  assignButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    elevation: 2,
  },
  assignButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  assignButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.background,
  },
  buttonContent: {
    height: 48,
  },
});