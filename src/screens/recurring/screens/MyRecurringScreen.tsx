import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, IconButton } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getMyRecurringAssignments } from '../service/recurring.service';
import { showToast } from '../../../core/store/slices/toast.slice';
import { useDispatch } from 'react-redux';

export const MyRecurringScreen = () => {
    const navigation = useNavigation<any>();
    const dispatch = useDispatch();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getMyRecurringAssignments();
            if (res.success) {
               setItems(res.data || []);
            }
        } catch (e) {
            console.error(e);
            dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} mode="elevated" onPress={() => console.log('Navigate to details', item.id)}>
            <Card.Content>
                <View style={styles.header}>
                    <View style={{flex: 1}}>
                        <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                            <Chip icon="map-marker" style={{backgroundColor: '#e8f5e9', marginRight: 8}} textStyle={{fontSize: 11}}>{item.recurringLocations?.length || 0} Ubicaciones</Chip>
                            {!item.active && <Chip icon="alert-circle" style={{backgroundColor: '#ffebee'}} textStyle={{fontSize: 11, color: '#c62828'}}>Inactiva</Chip>}
                        </View>
                    </View>
                    <IconButton icon="chevron-right" iconColor="#0288d1" />
                </View>

                {item.recurringLocations?.length > 0 && (
                     <View style={styles.details}>
                        <Text style={styles.subTitle}>Próximas Tareas:</Text>
                        {item.recurringLocations.slice(0, 2).map((loc: any, idx: number) => (
                             <Text key={idx} style={styles.locItem}>• {loc.location?.name}</Text>
                        ))}
                    </View>
                )}
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={loadData}
                ListHeaderComponent={() => (
                    <Text variant="titleLarge" style={styles.pageTitle}>Mis Rutinas Diarias</Text>
                )}
                ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No tienes rutinas asignadas.</Text> : null}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    listContent: { padding: 16, paddingBottom: 40 },
    pageTitle: { fontWeight: 'bold', marginBottom: 16, color: '#1A1C3D' },
    card: { marginBottom: 12, backgroundColor: '#fff', borderRadius: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontWeight: 'bold', color: '#1A1C3D', fontSize: 16 },
    details: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    subTitle: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
    locItem: { fontSize: 13, color: '#333', marginBottom: 2 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999' }
});
