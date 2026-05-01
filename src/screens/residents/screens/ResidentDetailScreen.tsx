import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Icon,
  IconButton,
  Modal,
  Provider as PaperProvider,
  Portal,
  Text,
  TextInput
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';

import { showToast } from '../../../core/store/slices/toast.slice';
import { InvitationTicket } from '../../invitations/components/InvitationTicket';
import { ResidentContactModal } from '../components/ResidentContactModal';
import {
  deleteResidentContact,
  getResidentById,
  getResidentContacts,
  getResidentRelationships,
  ResidentContact,
  ResidentUser
} from '../service/resident.service';

export const ResidentDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const loggedUser = useSelector((state: RootState) => state.userState);
  
  // Use residentId from params or fallback to logged user ID if missing
  const residentId = route.params?.residentId || Number(loggedUser.id);

  const [resident, setResident] = useState<ResidentUser | null>(null);
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ResidentContact[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<ResidentContact | null>(null);
  const [invitationTicketVisible, setInvitationTicketVisible] = useState(false);
  const [currentInvitation, setCurrentInvitation] = useState<any>(null);
  const [expandedContactId, setExpandedContactId] = useState<number | null>(
    null,
  );
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Contact statistics
  const contactStats = useMemo(() => {
    return {
      total: contacts.length,
      withPhone: contacts.filter(c => c.phone).length,
    };
  }, [contacts]);
  console.log(resident);
  const fetchData = useCallback(async () => {
    try {
      const [residentRes, contactsRes, relationshipsRes]: any[] =
        await Promise.all([
          getResidentById(residentId),
          getResidentContacts(residentId),
          getResidentRelationships(),
        ]);

      if (residentRes.success) setResident(residentRes.data);
      if (contactsRes.success) {
        setContacts(contactsRes.data || []);
        setFilteredContacts(contactsRes.data || []);
      }
      if (relationshipsRes.success && relationshipsRes.data.length > 0) {
      }
    } catch (error) {
      console.error(error);
      dispatch(showToast({ type: 'error', message: 'Error al cargar datos' }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [residentId, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter contacts by search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(
        contact =>
          contact.name.toLowerCase().includes(query) ||
          (contact.relationship &&
            contact.relationship.toLowerCase().includes(query)) ||
          (contact.phone && contact.phone.includes(query)),
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  const handleCall = (phone?: string) =>
    phone && Linking.openURL(`tel:${phone}`);
  const handleEmail = (email?: string) =>
    email && Linking.openURL(`mailto:${email}`);
  const handleWhatsApp = (phone?: string) =>
    phone && Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);

  const handleEditResident = () =>
    navigation.navigate('RESIDENT_FORM', { residentId: resident?.id });

  const openContactModal = (contact?: ResidentContact) => {
    setSelectedContact(contact || null);
    setContactModalVisible(true);
  };

  const handleDeleteContact = (id: number) => {
    Alert.alert(
      'Eliminar contacto',
      '¿Estás seguro de que deseas eliminar este contacto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteResidentContact(residentId, id);
              if (res.success) {
                dispatch(
                  showToast({ type: 'success', message: 'Contacto eliminado' }),
                );
                fetchData();
                if (expandedContactId === id) setExpandedContactId(null);
              }
            } catch (error) {
              dispatch(
                showToast({ type: 'error', message: 'Error al eliminar' }),
              );
            }
          },
        },
      ],
    );
  };

  const handleGenerateQR = async (contact: ResidentContact) => {
    if (!resident?.propertyId) {
      dispatch(
        showToast({
          type: 'error',
          message: 'El residente no tiene propiedad asignada',
        }),
      );
      return;
    }

    navigation.navigate('INVITATIONS_STACK', {
      screen: 'INVITATION_FORM',
      params: {
        guestName: contact.name,
        propertyId: resident.propertyId,
        residentId: residentId,
      },
    });
  };

  const toggleContactExpand = (id: number) => {
    setExpandedContactId(expandedContactId === id ? null : id);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getRelationIcon = (relation?: string) => {
    return 'account-circle';
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(
        6,
      )}`;
    }
    return phone;
  };

  const openImageViewer = (url: string) => {
    setSelectedImage(url);
    setImageViewerVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F4C3A" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!resident) {
    return (
      <View style={styles.errorContainer}>
        <Icon source="account-alert" size={64} color="#CBD5E1" />
        <Text style={styles.errorText}>Residente no encontrado</Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          buttonColor="#0F4C3A"
        >
          Volver
        </Button>
      </View>
    );
  }

  return (
    <PaperProvider>
      <View style={styles.container}>
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0F4C3A']}
              tintColor="#0F4C3A"
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
          keyboardShouldPersistTaps="handled"
        >
          {/* Premium Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.avatarWrapper}>
                <Avatar.Text
                  size={64}
                  label={`${resident.name[0]}${resident.lastName?.[0] || ''}`}
                  style={styles.avatar}
                  labelStyle={styles.avatarLabel}
                />
                <View
                  style={[styles.statusDot, { backgroundColor: '#10B981' }]}
                />
              </View>
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.headerName}>
                    {resident.name} {resident.lastName}
                  </Text>
                  <TouchableOpacity
                    onPress={handleEditResident}
                    style={styles.editBtnSmall}
                  >
                    <Icon source="pencil-outline" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <View style={styles.roleBadges}>
                  <View
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor:
                          resident.role === 'OWNER' ? '#ECFDF5' : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        {
                          color:
                            resident.role === 'OWNER' ? '#059669' : '#64748B',
                        },
                      ]}
                    >
                      {resident.role === 'OWNER' ? 'Propietario' : 'Residente'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.headerMeta}>
              <View style={styles.metaBox}>
                <View style={styles.metaIconBg}>
                  <Icon source="home-city" size={16} color="#0F4C3A" />
                </View>
                <View>
                  <Text style={styles.metaLabel}>PROPIEDAD</Text>
                  <Text style={styles.metaValue}>
                    {resident.property?.identifier || 'N/A'}
                  </Text>
                  <Text style={styles.metaSubValue} numberOfLines={1}>
                    {resident.property?.name || 'Sin asignar'}
                  </Text>
                </View>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaBox}>
                <View style={styles.metaIconBg}>
                  <Icon source="at" size={16} color="#64748B" />
                </View>
                <View>
                  <Text style={styles.metaLabel}>USUARIO</Text>
                  <Text style={styles.metaValue}>@{resident.username}</Text>
                  <Text style={styles.metaSubValue}>Acceso Móvil</Text>
                </View>
              </View>
            </View>
            <Button
              mode="contained"
              onPress={handleEditResident}
              style={styles.editMainButton}
              labelStyle={styles.editMainButtonLabel}
              buttonColor="#0F4C3A"
            >
              <Text style={styles.editMainButtonLabel}>Editar Perfil</Text>
            </Button>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.quickAction,
                !resident.residentProfile?.phoneNumber &&
                  styles.quickActionDisabled,
              ]}
              onPress={() => handleCall(resident.residentProfile?.phoneNumber)}
              disabled={!resident.residentProfile?.phoneNumber}
            >
              <View style={[styles.quickActionIcon, styles.callIconBg]}>
                <Icon source="phone" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Llamar</Text>
            </TouchableOpacity>
{/* 
            <TouchableOpacity
              style={[
                styles.quickAction,
                !resident.residentProfile?.phoneNumber &&
                  styles.quickActionDisabled,
              ]}
              onPress={() =>
                handleWhatsApp(resident.residentProfile?.phoneNumber)
              }
              disabled={!resident.residentProfile?.phoneNumber}
            >
              <View style={[styles.quickActionIcon, styles.whatsappIconBg]}>
                <Icon source="whatsapp" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>WhatsApp</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={[
                styles.quickAction,
                !resident.residentProfile?.email && styles.quickActionDisabled,
              ]}
              onPress={() => handleEmail(resident.residentProfile?.email)}
              disabled={!resident.residentProfile?.email}
            >
              <View style={[styles.quickActionIcon, styles.emailIconBg]}>
                <Icon source="email" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Email</Text>
            </TouchableOpacity>
          </View>

          {/* Identification Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documentación</Text>
            <Text style={styles.sectionSubtitle}>Identificación Oficial (INE)</Text>
          </View>

          <View style={styles.idContainer}>
            <View style={styles.idCardRow}>
                <TouchableOpacity 
                    style={[styles.idCard, !resident.residentProfile?.ineFrontUrl && styles.idCardEmpty]}
                    onPress={() => resident.residentProfile?.ineFrontUrl && openImageViewer(resident.residentProfile.ineFrontUrl)}
                    activeOpacity={0.8}
                >
                    {resident.residentProfile?.ineFrontUrl ? (
                        <View style={styles.idImageWrapper}>
                             <Image 
                                source={{ uri: resident.residentProfile.ineFrontUrl }} 
                                style={styles.idPreviewImage}
                                resizeMode="cover"
                             />
                             <View style={styles.idOverlay}>
                                <Text style={styles.idImageText}>INE Frente</Text>
                                <View style={styles.viewBadge}>
                                    <Icon source="eye" size={12} color="#fff" />
                                </View>
                             </View>
                        </View>
                    ) : (
                        <View style={styles.idEmptyWrapper}>
                            <Icon source="image-off-outline" size={32} color="#CBD5E1" />
                            <Text style={styles.idEmptyText}>Sin foto frente</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.idCard, !resident.residentProfile?.ineBackUrl && styles.idCardEmpty]}
                    onPress={() => resident.residentProfile?.ineBackUrl && openImageViewer(resident.residentProfile.ineBackUrl)}
                    activeOpacity={0.8}
                >
                    {resident.residentProfile?.ineBackUrl ? (
                        <View style={styles.idImageWrapper}>
                             <Image 
                                source={{ uri: resident.residentProfile.ineBackUrl }} 
                                style={styles.idPreviewImage}
                                resizeMode="cover"
                             />
                             <View style={styles.idOverlay}>
                                <Text style={styles.idImageText}>INE Vuelta</Text>
                                <View style={styles.viewBadge}>
                                    <Icon source="eye" size={12} color="#fff" />
                                </View>
                             </View>
                        </View>
                    ) : (
                        <View style={styles.idEmptyWrapper}>
                            <Icon source="image-off-outline" size={32} color="#CBD5E1" />
                            <Text style={styles.idEmptyText}>Sin foto vuelta</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
          </View>

          {/* Contacts Section Header */}
          <View style={styles.contactsHeader}>
            <View>
              <Text style={styles.contactsTitle}>Contactos</Text>
              <Text style={styles.contactsSubtitle}>
                {contactStats.total}{' '}
                {contactStats.total === 1 ? 'persona' : 'personas'} de confianza
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addContactButton}
              onPress={() => openContactModal()}
              activeOpacity={0.8}
            >
              <Icon source="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addContactText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          {contacts.length > 0 && (
            <View style={styles.searchContainer}>
              <Icon source="magnify" size={20} color="#94A3B8" />
              <TextInput
                placeholder="Buscar contacto..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                mode="flat"
                underlineColorAndroid="transparent"
                style={styles.searchInput}
                contentStyle={styles.searchInputContent}
                theme={{ colors: { primary: 'transparent' } }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon source="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Contacts List */}
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <TouchableOpacity
                key={contact.id}
                activeOpacity={0.7}
                onPress={() => toggleContactExpand(contact.id)}
              >
                <View style={styles.contactItem}>
                  <View style={styles.contactAvatar}>
                    <Icon
                      source={getRelationIcon(contact.relationship)}
                      size={24}
                      color="#0F4C3A"
                    />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <View style={styles.contactDetails}>
                      {contact.relationship && (
                        <Text style={styles.contactRelation}>
                          {contact.relationship}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.cardQuickActions}>
                    <TouchableOpacity
                      style={[
                        styles.smallQuickBtn,
                        { backgroundColor: '#F5F3FF' },
                      ]}
                      onPress={() => handleGenerateQR(contact)}
                    >
                      <Icon source="qrcode" size={18} color="#8B5CF6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.smallQuickBtn,
                        { backgroundColor: '#FFFBEB' },
                      ]}
                      onPress={() => openContactModal(contact)}
                    >
                      <Icon source="pencil" size={18} color="#F59E0B" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.smallQuickBtn,
                      { backgroundColor: '#f1f1f1ff' },
                    ]}
                onPress={() => toggleContactExpand(contact.id)}

                  >
                    <Icon
                      source={
                        expandedContactId === contact.id
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={20}
                      color="#CBD5E1"
                    />
                  </TouchableOpacity>
                </View>

                {expandedContactId === contact.id && (
                  <View style={styles.expandedActions}>
                    {contact.phone && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionChip, styles.callChip]}
                          onPress={() => handleCall(contact.phone)}
                        >
                          <Icon source="phone" size={16} color="#10B981" />
                          <Text
                            style={[styles.actionChipText, styles.callChipText]}
                          >
                            Llamar
                          </Text>
                        </TouchableOpacity>
                      
                      </>
                    )}
                    <TouchableOpacity
                      style={[styles.actionChip, styles.qrChip]}
                      onPress={() => handleGenerateQR(contact)}
                    >
                      <Icon source="qrcode" size={16} color="#8B5CF6" />
                      <Text style={[styles.actionChipText, styles.qrChipText]}>
                        Invitación
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionChip, styles.editChip]}
                      onPress={() => openContactModal(contact)}
                    >
                      <Icon source="pencil" size={16} color="#F59E0B" />
                      <Text
                        style={[styles.actionChipText, styles.editChipText]}
                      >
                        Editar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionChip, styles.deleteChip]}
                      onPress={() => handleDeleteContact(contact.id)}
                    >
                      <Icon source="delete" size={16} color="#EF4444" />
                      <Text
                        style={[styles.actionChipText, styles.deleteChipText]}
                      >
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Icon
                  source={searchQuery ? 'account-search' : 'account-plus'}
                  size={48}
                  color="#CBD5E1"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No hay resultados' : 'Sin contactos'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No se encontraron contactos para "${searchQuery}"`
                  : 'Agrega familiares, amigos o proveedores de confianza'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => openContactModal()}
                >
                  <Text style={styles.emptyButtonText}>Agregar contacto</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </KeyboardAwareScrollView>

        {/* Modals & Portals Layer */}
        <Portal>
          {/* Contact Modal Reusable Component */}
          <ResidentContactModal 
            visible={contactModalVisible}
            onDismiss={() => setContactModalVisible(false)}
            residentId={residentId}
            contact={selectedContact}
            onSuccess={fetchData}
          />

          {/* Invitation Ticket Modal */}
          <Modal
            visible={invitationTicketVisible}
            onDismiss={() => setInvitationTicketVisible(false)}
            contentContainerStyle={styles.ticketModalContainer}
          >
            <Card style={styles.ticketCard}>
              {currentInvitation && (
                <InvitationTicket invitation={currentInvitation} />
              )}
              <TouchableOpacity
                style={styles.closeTicketButton}
                onPress={() => setInvitationTicketVisible(false)}
              >
                <Text style={styles.closeTicketText}>Cerrar</Text>
              </TouchableOpacity>
            </Card>
          </Modal>

          {/* Relationship Picker Modal Handled by SearchComponent */}
          
          {/* Image Viewer Modal */}
          <Modal
            visible={imageViewerVisible}
            onDismiss={() => setImageViewerVisible(false)}
            contentContainerStyle={styles.imageViewerContainer}
          >
            <View style={styles.imageViewerContent}>
                <IconButton 
                    icon="close-circle" 
                    size={32} 
                    onPress={() => setImageViewerVisible(false)}
                    style={styles.closeImageBtn}
                    iconColor="#fff"
                />
                {selectedImage && (
                    <Card style={styles.imageCard}>
                        <Card.Cover 
                            source={{ uri: selectedImage }} 
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    </Card>
                )}
            </View>
          </Modal>
        </Portal>

      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 16,
    padding: 20,
  },
  errorText: {
    color: '#64748B',
    fontSize: 16,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#0F4C3A',
  },
  avatarLabel: {
    color: '#0F4C3A',
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  editBtnSmall: {
    padding: 4,
  },
  roleBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  headerMeta: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  metaSubValue: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
    height: '80%',
    alignSelf: 'center',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  quickActionDisabled: {
    opacity: 0.4,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIconBg: {
    backgroundColor: '#10B981',
  },
  whatsappIconBg: {
    backgroundColor: '#25D366',
  },
  emailIconBg: {
    backgroundColor: '#3B82F6',
  },
  // Document Section
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  idContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  idCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  idCard: {
    flex: 1,
    height: 100,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  idCardEmpty: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  idImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idPreviewImage: {
    width: '100%',
    height: '100%',
  },
  idOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 76, 58, 0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  idImageText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  idEmptyWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  idEmptyText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  viewBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  // Image Viewer
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 0,
    margin: 0,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  imageCard: {
    width: '95%',
    height: '70%',
    backgroundColor: 'transparent',
    elevation: 0,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },

  quickActionLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  // Contacts Header
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  contactsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  contactsSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F4C3A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 40,
  },
  addContactText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
    height: 44,
  },
  searchInputContent: {
    paddingVertical: 0,
  },
  // Contact Item
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  cardQuickActions: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 12,
  },
  smallQuickBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  contactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactRelation: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  contactPhone: {
    fontSize: 12,
    color: '#94A3B8',
  },
  // Expanded Actions
  expandedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: '#F1F5F9',
    borderRightColor: '#F1F5F9',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  callChip: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  callChipText: {
    color: '#10B981',
  },
  whatsappChip: {
    borderColor: '#25D366',
    backgroundColor: '#ECFDF5',
  },
  whatsappChipText: {
    color: '#25D366',
  },
  qrChip: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  qrChipText: {
    color: '#8B5CF6',
  },
  editChip: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  editChipText: {
    color: '#F59E0B',
  },
  deleteChip: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  deleteChipText: {
    color: '#EF4444',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    marginTop: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#0F4C3A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 40,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Ticket Modal
  ticketModalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  ticketCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  closeTicketButton: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  closeTicketText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F4C3A',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#0F4C3A',
    borderRadius: 28,
  },
  // Modal (Placeholder for legacy if needed, but we keep it empty to match shared component)
  modalContainer: {
    padding: 20,
  },
  editMainButton: {
    marginTop: 20,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  editMainButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
