import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
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
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  getResidentContacts,
  getResidentById,
  deleteResidentContact,
  ResidentContact,
} from '../service/resident.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResidentContactModal } from '../components/ResidentContactModal';

const PRIMARY_GREEN = '#1f8a3a';
const SECONDARY_BG = '#ffffff';

export const ResidentContactsScreen = () => {
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

    const handleDelete = (contactId: number) => {
        Alert.alert(
            'Eliminar Contacto',
            '¿Estás seguro de que deseas eliminar este contacto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Eliminar', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await deleteResidentContact(Number(user.id), contactId) as any;
                            if (res.success) {
                                dispatch(showToast({ type: 'success', message: 'Contacto eliminado' }));
                                fetchContacts();
                            } else {
                                dispatch(showToast({ type: 'error', message: res.messages?.[0] || 'Error al eliminar' }));
                            }
                        } catch (error) {
                            dispatch(showToast({ type: 'error', message: 'Error al eliminar' }));
                        }
                    }
                }
            ]
        );
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
                <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                <Text style={styles.loadingText}>Cargando agenda...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={SECONDARY_BG} />
            

            <View style={styles.searchBox}>
                <TextInput 
                    mode="outlined"
                    placeholder="Buscar por nombre o relación"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.simpleSearch}
                    left={<TextInput.Icon icon="magnify" color="#94a3b8" />}
                    outlineColor="#e2e8f0"
                    activeOutlineColor={PRIMARY_GREEN}
                    theme={{ roundness: 12 }}
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
                        colors={[PRIMARY_GREEN]}
                        tintColor={PRIMARY_GREEN}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Icon source="account-multiple-outline" size={40} color={PRIMARY_GREEN} />
                        </View>
                        <Text style={styles.emptyTitle}>Agenda vacía</Text>
                        <Text style={styles.emptySub}>
                            Agrega tus contactos de confianza para tenerlos siempre a mano.
                        </Text>
                        <Button 
                            mode="contained" 
                            onPress={() => openForm()} 
                            style={styles.emptyBtn} 
                            buttonColor={PRIMARY_GREEN}
                            labelStyle={styles.emptyBtnLabel}
                        >
                            Agregar contacto
                        </Button>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.contactCard}
                        onPress={() => openForm(item)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardContent}>
                            <View style={styles.avatarSection}>
                                <View style={styles.avatarContainer}>
                                    <Text style={styles.avatarText}>
                                        {item.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                {item.phone && (
                                    <View style={styles.whatsappBadge}>
                                        <Icon source="whatsapp" size={12} color="#fff" />
                                    </View>
                                )}
                            </View>

                            <View style={styles.infoSection}>
                                <Text style={styles.contactName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={styles.contactPhone} numberOfLines={1}>
                                    {item.phone || 'Sin teléfono'}
                                </Text>
                                <View style={styles.relationshipBadge}>
                                    <Text style={styles.relationshipText}>{item.relationship}</Text>
                                </View>
                            </View>

                            <View style={styles.actionsSection}>
                                <TouchableOpacity 
                                    onPress={() => handleGenerateQR(item)} 
                                    style={styles.actionButton}
                                >
                                    <Icon source="qrcode" size={20} color="#8b5cf6" />
                                </TouchableOpacity>
                                {item.phone && (
                                    <TouchableOpacity 
                                        onPress={() => handleCall(item.phone)} 
                                        style={styles.actionButton}
                                    >
                                        <Icon source="phone" size={20} color={PRIMARY_GREEN} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity 
                                    onPress={() => handleDelete(item.id)} 
                                    style={styles.actionButton}
                                >
                                    <Icon source="delete-outline" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
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
                style={[styles.fab, { bottom: insets.bottom + 20 }]}
                color="white"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 8,
        backgroundColor: '#ffffff',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '400',
    },
    searchBox: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    simpleSearch: {
        backgroundColor: '#ffffff',
        height: 48,
        fontSize: 15,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    contactCard: {
        backgroundColor: '#ffffff',
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
        borderColor: '#ffffff',
    },
    infoSection: {
        flex: 1,
        gap: 4,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    contactPhone: {
        fontSize: 13,
        color: '#64748b',
    },
    relationshipBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        marginTop: 2,
    },
    relationshipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
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
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
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
        color: '#0f172a',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        color: '#64748b',
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