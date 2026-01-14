import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { getKardex, IKardexEntry, IKardexFilter } from '../service/kardex.service';

export const KardexScreen = ({ navigation }: any) => {
  const [entries, setEntries] = useState<IKardexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<IKardexFilter>({});
  
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

  useEffect(() => {
      fetchKardex();
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
                  <Text variant="titleMedium">{item.location.name}</Text>
                  <Text variant="bodySmall">{dayjs(item.timestamp).format('DD/MM/YYYY HH:mm')}</Text>
              </View>
              <Text variant="bodyMedium">Usuario: {item.user.username}</Text>
              {item.notes && <Text variant="bodySmall" style={{marginTop:4, fontStyle:'italic'}}>"{item.notes}"</Text>}
              
              <Divider style={{ marginVertical: 8 }} />
              
              {item.media && item.media.length > 0 && (
                  <View style={styles.mediaRow}>
                      {item.media.map((m, idx) => (
                          <Chip 
                            key={idx} 
                            icon={m.type === 'VIDEO' ? 'video' : 'camera'} 
                            onPress={() => handleOpenMedia(m)}
                            style={{marginRight: 4}}
                          >
                              {m.type === 'VIDEO' ? 'Ver Video' : `Foto ${idx+1}`}
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
            <Button mode="contained" onPress={fetchKardex} loading={loading}>
                Actualizar
            </Button>
        </View>

        <FlatList
            data={entries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20}}>No hay registros</Text>}
        />

        <Portal>
            <Modal visible={showFilterModal} onDismiss={() => setShowFilterModal(false)} contentContainerStyle={styles.modal}>
                <Text variant="titleLarge" style={{marginBottom: 16}}>Filtrar Kardex</Text>
                
                <TextInput 
                    label="ID Usuario (Opcional)"
                    keyboardType="numeric"
                    value={tempFilters.userId?.toString() || ''}
                    onChangeText={(t) => setTempFilters({...tempFilters, userId: t ? Number(t) : undefined})}
                    style={styles.input}
                />
                
                <TextInput 
                    label="ID Ubicación (Opcional)"
                    keyboardType="numeric"
                    value={tempFilters.locationId?.toString() || ''}
                    onChangeText={(t) => setTempFilters({...tempFilters, locationId: t ? Number(t) : undefined})}
                    style={styles.input}
                />

                <Text variant="labelMedium" style={{marginTop:10}}>Formato Fecha: YYYY-MM-DD</Text>
                <View style={styles.row}>
                    <TextInput 
                        label="Fecha Inicio"
                        value={tempFilters.startDate || ''}
                        onChangeText={(t) => setTempFilters({...tempFilters, startDate: t})}
                        style={[styles.input, {flex:1, marginRight:5}]}
                    />
                    <TextInput 
                        label="Fecha Fin"
                        value={tempFilters.endDate || ''}
                        onChangeText={(t) => setTempFilters({...tempFilters, endDate: t})}
                        style={[styles.input, {flex:1, marginLeft:5}]}
                    />
                </View>

                <View style={[styles.row, {marginTop: 20, justifyContent:'flex-end'}]}>
                    <Button onPress={clearFilters} style={{marginRight: 10}}>Limpiar</Button>
                    <Button mode="contained" onPress={applyFilters}>Aplicar Filtros</Button>
                </View>
            </Modal>
        </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
      marginBottom: 12
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
      borderRadius: 8
  },
  input: {
      marginBottom: 10,
      backgroundColor: 'white'
  }
});
