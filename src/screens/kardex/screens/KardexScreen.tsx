import dayjs from 'dayjs';
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, FlatList, Linking, StyleSheet, View, RefreshControl } from 'react-native';
import { Button, Card, Chip, Divider, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { getKardex, getUsers, IKardexEntry, IKardexFilter } from '../service/kardex.service';
import { getLocations } from '../../locations/service/location.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';

export const KardexScreen = ({ navigation }: any) => {
  const [entries, setEntries] = useState<IKardexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<IKardexFilter>({});
  
  // Catalogs
  const [usersCatalog, setUsersCatalog] = useState<{label: string, value: number}[]>([]);
  const [locationsCatalog, setLocationsCatalog] = useState<{label: string, value: number}[]>([]);

  // UI State for Filters
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<IKardexFilter>({});

  const fetchKardex = async () => {
      setLoading(true);
      const res = await getKardex(filters);
      if (res.success && res.data) {
          setEntries(res.data);
      } else {
          setEntries([]);
      }
      setLoading(false);
  };

  const fetchCatalogs = async () => {
      const [uRes, lRes] = await Promise.all([getUsers(), getLocations()]);
      
      if (uRes.success && Array.isArray(uRes.data)) {
          setUsersCatalog(uRes.data.map((u: any) => ({
              label: `${u.name} ${u.lastName || ''} (${u.username})`,
              value: u.id
          })));
      }

      if (lRes.success && Array.isArray(lRes.data)) {
          setLocationsCatalog(lRes.data.map((l: any) => ({
              label: l.name,
              value: l.id
          })));
      }
  };

  useEffect(() => {
      fetchKardex();
  }, [filters]);

  useEffect(() => {
      fetchCatalogs();
  }, []);

  const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await fetchKardex();
      setRefreshing(false);
  }, [filters]);

  const applyFilters = () => {
      setFilters(tempFilters);
      setShowFilterModal(false);
  };

  const clearFilters = () => {
      setTempFilters({});
      setFilters({});
      setShowFilterModal(false);
  };

  const handleOpenMedia = (media: any) => {
    if (media.url) {
        const baseUrl = API_CONSTANTS.BASE_URL.replace('/api/v1', '');
        const fullUrl = `${baseUrl}${media.url}`;
        Linking.openURL(fullUrl).catch(err => Alert.alert("Error", "No se pudo abrir el archivo"));
    }
  };

  const renderItem = ({ item }: { item: IKardexEntry }) => (
      <Card style={styles.card} onPress={() => navigation.navigate('KARDEX_DETAIL', { item })}>
          <Card.Content>
              <View style={styles.row}>
                  <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.location.name}</Text>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Text variant="bodySmall">{dayjs(item.timestamp).format('DD/MM/YYYY HH:mm')}</Text>
                    {/* Show status only if completed (REVIEWED) */}
                    {(item.assignment?.status === 'REVIEWED') && (
                        <Chip 
                            style={{backgroundColor:'#e6fffa', height: 24, marginLeft: 8}} 
                            textStyle={{fontSize: 10, color: '#065911', fontWeight: '700', lineHeight: 10}}
                        >
                            VALIDADO
                        </Chip>
                    )}
                  </View>
              </View>
              <Text variant="bodyMedium">Usuario: <Text style={{fontWeight:'bold'}}>{item.user.username}</Text></Text>
              {item.notes && <Text variant="bodySmall" style={{marginTop:4, fontStyle:'italic', color:'#666'}}>"{item.notes}"</Text>}
              
              <Divider style={{ marginVertical: 8 }} />
              
              {item.media && item.media.length > 0 && (
                  <View style={styles.mediaRow}>
                      {item.media.map((m, idx) => (
                          <Chip 
                            key={idx} 
                            icon={m.type === 'VIDEO' ? 'video' : 'camera'} 
                            onPress={() => handleOpenMedia(m)}
                            style={{marginRight: 4, marginBottom: 4}}
                            compact
                          >
                              {m.type === 'VIDEO' ? 'Video' : `Foto ${idx+1}`}
                          </Chip>
                      ))}
                  </View>
              )}
          </Card.Content>
      </Card>
  );

  return (
    <View style={styles.container}>
        <View style={styles.filterBar}>
            <Button mode="outlined" icon="filter" onPress={() => { setTempFilters(filters); setShowFilterModal(true); }}>
                Filtros
            </Button>
            <View />
        </View>

        <FlatList
            data={entries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#065911']} />
            }
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20}}>No hay registros</Text>}
        />

        <Portal>
            <Modal visible={showFilterModal} onDismiss={() => setShowFilterModal(false)} contentContainerStyle={styles.modal}>
                <Text variant="titleLarge" style={{marginBottom: 16, fontWeight:'bold'}}>Filtrar Busqueda</Text>
                
                <SearchComponent
                    label="Usuario"
                    placeholder="Buscar usuario..."
                    searchPlaceholder="Nombre o usuario..."
                    options={usersCatalog}
                    value={tempFilters.userId}
                    onSelect={(val) => setTempFilters({...tempFilters, userId: Number(val)})}
                />

                <SearchComponent
                    label="Ubicación"
                    placeholder="Buscar ubicación..."
                    searchPlaceholder="Nombre de ubicación..."
                    options={locationsCatalog}
                    value={tempFilters.locationId}
                    onSelect={(val) => setTempFilters({...tempFilters, locationId: Number(val)})}
                />

                <Text variant="labelMedium" style={{marginTop:10, marginBottom:5}}>Fecha (YYYY-MM-DD)</Text>
                <View style={[styles.row, {marginBottom: 10}]}>
                    <TextInput 
                        label="Inicio"
                        placeholder="YYYY-MM-DD"
                        value={tempFilters.startDate || ''}
                        onChangeText={(t) => setTempFilters({...tempFilters, startDate: t})}
                        style={[styles.input, {flex:1, marginRight:5}]}
                        mode="outlined"
                        dense
                    />
                    <TextInput 
                        label="Fin"
                        placeholder="YYYY-MM-DD"
                        value={tempFilters.endDate || ''}
                        onChangeText={(t) => setTempFilters({...tempFilters, endDate: t})}
                        style={[styles.input, {flex:1, marginLeft:5}]}
                        mode="outlined"
                        dense
                    />
                </View>

                <View style={[styles.row, {marginTop: 10, justifyContent:'flex-end'}]}>
                    <Button onPress={clearFilters} style={{marginRight: 10}}>Limpiar</Button>
                    <Button mode="contained" onPress={applyFilters}>Aplicar</Button>
                </View>
            </Modal>
        </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbf4',
  },
  filterBar: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-between',
    backgroundColor: 'white',
    elevation: 2
  },
  list: {
      padding: 16
  },
  card: {
      marginBottom: 12,
      backgroundColor: 'white',
      borderRadius: 12,
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
  },
  mediaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap'
  },
  modal: {
      backgroundColor: 'white',
      padding: 20,
      margin: 20,
      borderRadius: 16
  },
  input: {
      backgroundColor: 'white'
  }
});
