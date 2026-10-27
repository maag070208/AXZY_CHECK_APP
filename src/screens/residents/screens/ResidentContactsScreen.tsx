import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {
  Text,
  Icon,
  FAB,
  ActivityIndicator,
  Portal,
  Button,
  Card,
  Avatar,
  TextInput,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  getResidentContacts,
  getResidentById,
  deleteResidentContact,
  ResidentContact,
} from '../service/resident.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResidentContactModal } from '../components/ResidentContactModal';
import { tokens } from '../../../shared/theme/tokens';
import { useRolePalette } from '../../../shared/theme/RoleThemeProvider';
import { ListAvatar, ListRowCard, ListSearch, ListSectionHeader, StatusChip } from '../../../shared/components/ListComponents';

const PRIMARY_GREEN = '#1f8a3a';
const SECONDARY_BG = tokens.color.card;

export const ResidentContactsScreen = () => {
    const palette = useRolePalette();
    const user = useSelector((state: RootState) => state.userState);
    const dispatch = useDispatch();
    const { navigateToScreen } = useAppNavigation();
    const insets = useSafeAreaInsets();
    
    const [contacts, setContacts] = useState<ResidentContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [propertyId, setPropertyId] = useState<number | null>(null);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState<ResidentContact | null>(null);

    const fetchContacts = useCallback(async () => {
        try {
            const [contactsRes, residentRes] = await Promise.all([
                getResidentContacts(Number(user.id)),
                getResidentById(Number(user.id))
            ]) as any[];

            setContacts(contactsRes.data || []);
            if (residentRes.success && residentRes.data?.propertyId) {
                setPropertyId(residentRes.data.propertyId);
            }
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Error al cargar datos' }));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user.id, dispatch]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const filteredContacts = useMemo(() => {
        if (!Array.isArray(contacts)) return [];
        return contacts.filter(c => 
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.relationship?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [contacts, searchQuery]);

    const handleGenerateQR = (contact: ResidentContact) => {
        if (!propertyId) {
            dispatch(showToast({ type: 'error', message: 'No tienes una propiedad asignada' }));
            return;
        }

        navigateToScreen('INVITATIONS_STACK', 'INVITATION_FORM', {
            guestName: contact.name,
            propertyId: propertyId,
            residentId: Number(user.id),
        });
    };

    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = (contactId: number) => setPendingDeleteId(contactId);

    const confirmDelete = async () => {
        if (pendingDeleteId === null) return;
        setDeleting(true);
        try {
            const res = await deleteResidentContact(Number(user.id), pendingDeleteId) as any;
            if (res.success) {
                dispatch(showToast({ type: 'success', message: 'Contacto eliminado' }));
                fetchContacts();
            } else {
                dispatch(showToast({ type: 'error', message: res.messages?.[0] || 'Error al eliminar' }));
            }
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Error al eliminar' }));
        } finally {
            setDeleting(false);
            setPendingDeleteId(null);
        }
    };

    const openForm = (contact?: ResidentContact) => {
        setEditingContact(contact || null);
        setModalVisible(true);
    };

    const handleCall = (phone?: string) => {
        if (phone) Linking.openURL(`tel:${phone}`);
    };

    const handleWhatsApp = (phone?: string) => {
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            Linking.openURL(`https://wa.me/${cleanPhone}`);
        }
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={palette.primary} />
                <Text style={styles.loadingText}>Cargando agenda...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={SECONDARY_BG} />

            <ConfirmDialog
                visible={pendingDeleteId !== null}
                title="Eliminar contacto"
                message="¿Estás seguro de que deseas eliminar este contacto? Ya no aparecerá en tu agenda."
                confirmLabel="Eliminar"
                tone="danger"
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDeleteId(null)}
            />
            

            <View style={styles.searchBox}>
                <ListSearch
                    placeholder="Buscar por nombre o relación"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList 
                data={filteredContacts}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => {setRefreshing(true); fetchContacts();}} 
                        colors={[palette.primary]}
                        tintColor={palette.primary}
                    />
                }
                ListHeaderComponent={<ListSectionHeader index={1} text="CONTACTOS" hint={`${filteredContacts.length} en total`} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Icon source="account-multiple-outline" size={40} color={palette.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Agenda vacía</Text>
                        <Text style={styles.emptySub}>
                            Agrega tus contactos de confianza para tenerlos siempre a mano.
                        </Text>
                        <Button 
                            mode="contained" 
                            onPress={() => openForm()} 
                            style={styles.emptyBtn} 
                            buttonColor={palette.primary}
                            labelStyle={styles.emptyBtnLabel}
                        >
                            Agregar contacto
                        </Button>
                    </View>
                }
                renderItem={({ item }) => (
                    <ListRowCard
                        avatar={<ListAvatar photoUrl={(item as any).photoUrl} initial={item.name.charAt(0).toUpperCase()} />}
                        title={item.name}
                        subtitle={item.phone || 'Sin teléfono'}
                        meta={item.relationship ? (
                            <View style={styles.relationRow}>
                                <StatusChip label={item.relationship} color={palette.primary} background={palette.primarySoft} />
                            </View>
                        ) : undefined}
                        actions={
                            <>
                                <TouchableOpacity onPress={() => handleGenerateQR(item)} style={styles.actionButton} accessibilityRole="button" accessibilityLabel={`Generar pase para ${item.name}`}>
                                    <Icon source="qrcode" size={20} color={palette.primary} />
                                </TouchableOpacity>
                                {item.phone && (
                                    <TouchableOpacity onPress={() => handleCall(item.phone)} style={styles.actionButton} accessibilityRole="button" accessibilityLabel={`Llamar a ${item.name}`}>
                                        <Icon source="phone" size={20} color={palette.primary} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton} accessibilityRole="button" accessibilityLabel={`Eliminar ${item.name}`}>
                                    <Icon source="delete-outline" size={20} color={tokens.color.danger} />
                                </TouchableOpacity>
                            </>
                        }
                        onPress={() => openForm(item)}
                    />
                )}
            />

            <Portal>
              <ResidentContactModal 
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                residentId={Number(user.id)}
                contact={editingContact}
                onSuccess={fetchContacts}
              />
            </Portal>

            <FAB 
                icon="plus"
                onPress={() => openForm()}
                style={[styles.fab, { bottom: insets.bottom + 20, backgroundColor: palette.primary, shadowColor: palette.primary }]}
                color="white"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.color.screen,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.color.screen,
    },
    loadingText: {
        marginTop: 12,
        color: tokens.color.textMuted,
        fontWeight: '500',
    },
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 8,
        backgroundColor: tokens.color.card,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: tokens.color.textStrong,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: tokens.color.textMuted,
        fontWeight: '400',
    },
    searchBox: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: tokens.color.card,
        borderBottomWidth: 1,
        borderBottomColor: tokens.color.screen,
    },
    simpleSearch: {
        backgroundColor: tokens.color.card,
        height: 48,
        fontSize: 15,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    contactCard: {
        backgroundColor: tokens.color.card,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    avatarSection: {
        position: 'relative',
        marginRight: 14,
    },
    relationRow: { flexDirection: 'row', marginTop: 2 },
    avatarPhoto: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: tokens.color.primarySoft,
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '700',
        color: PRIMARY_GREEN,
    },
    whatsappBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#25D366',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: tokens.color.card,
    },
    infoSection: {
        flex: 1,
        gap: 4,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: tokens.color.textStrong,
    },
    contactPhone: {
        fontSize: 13,
        color: tokens.color.textMuted,
    },
    relationshipBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: tokens.color.screen,
        borderRadius: 8,
        marginTop: 2,
    },
    relationshipText: {
        fontSize: 11,
        fontWeight: '600',
        color: tokens.color.textBody,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    actionsSection: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: tokens.color.screen,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: tokens.color.border,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: tokens.color.textStrong,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        color: tokens.color.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyBtn: {
        marginTop: 28,
        borderRadius: 12,
        paddingHorizontal: 20,
    },
    emptyBtnLabel: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    fab: {
        position: 'absolute',
        margin: 20,
        right: 0,
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 16,
        shadowColor: PRIMARY_GREEN,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
});