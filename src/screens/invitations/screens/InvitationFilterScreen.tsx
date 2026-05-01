import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, IconButton, RadioButton, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPropertiesList, Property } from '../../properties/service/property.service';
import { theme } from '../../../shared/theme/theme';

export const InvitationFilterScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    
    // Initial state from route params if available
    const currentFilters = route.params?.currentFilters || {};
    
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK'>(currentFilters.dateFilter || 'ALL');
    const [selectedPropId, setSelectedPropId] = useState<number | null>(currentFilters.selectedPropId || null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const res = await getPropertiesList();
                if (res.success && res.data) {
                    setProperties(res.data);
                }
            } catch (e) {
                console.error('Error fetching props', e);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    const applyFilters = () => {
        navigation.navigate('INVITATIONS_MAIN', {
            filters: {
                dateFilter,
                selectedPropId,
                active: true
            }
        });
    };

    const clearFilters = () => {
        navigation.navigate('INVITATIONS_MAIN', {
            filters: {
                dateFilter: 'ALL',
                selectedPropId: null,
                active: false
            }
        });
    };

    return (
        <View style={[ModernStyles.screenContainer, { paddingBottom: insets.bottom }]}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Rango de Fecha</Text>
                <Surface style={styles.card} elevation={0}>
                    <RadioButton.Group onValueChange={value => setDateFilter(value as any)} value={dateFilter}>
                        {[
                            { value: 'ALL', label: 'Todos los registros' },
                            { value: 'TODAY', label: 'Solo hoy' },
                            { value: 'TOMORROW', label: 'Mañana' },
                            { value: 'WEEK', label: 'Próximos 7 días' },
                        ].map((item, index) => (
                            <React.Fragment key={item.value}>
                                <TouchableOpacity 
                                    style={styles.row} 
                                    onPress={() => setDateFilter(item.value as any)}
                                    activeOpacity={0.6}
                                >
                                    <Text style={[styles.rowLabel, dateFilter === item.value && styles.activeLabel]}>{item.label}</Text>
                                    <RadioButton.Android value={item.value} color={theme.colors.primary} />
                                </TouchableOpacity>
                                {index < 3 && <Divider style={styles.divider} />}
                            </React.Fragment>
                        ))}
                    </RadioButton.Group>
                </Surface>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Propiedad</Text>
                <Surface style={styles.card} elevation={0}>
                    <TouchableOpacity 
                        style={styles.row} 
                        onPress={() => setSelectedPropId(null)}
                        activeOpacity={0.6}
                    >
                        <Text style={[styles.rowLabel, selectedPropId === null && styles.activeLabel]}>Todas las propiedades</Text>
                        <RadioButton.Android 
                            value="null" 
                            status={selectedPropId === null ? 'checked' : 'unchecked'} 
                            onPress={() => setSelectedPropId(null)}
                            color={theme.colors.primary} 
                        />
                    </TouchableOpacity>
                    <Divider style={styles.divider} />
                    
                    {properties.map((prop, index) => (
                        <React.Fragment key={prop.id}>
                            <TouchableOpacity 
                                style={styles.row} 
                                onPress={() => setSelectedPropId(prop.id)}
                                activeOpacity={0.6}
                            >
                                <View>
                                    <Text style={[styles.rowLabel, selectedPropId === prop.id && styles.activeLabel]}>{prop.identifier}</Text>
                                    <Text style={styles.rowSubtitle}>{prop.name}</Text>
                                </View>
                                <RadioButton.Android 
                                    value={prop.id.toString()} 
                                    status={selectedPropId === prop.id ? 'checked' : 'unchecked'} 
                                    onPress={() => setSelectedPropId(prop.id)}
                                    color={theme.colors.primary} 
                                />
                            </TouchableOpacity>
                            {index < properties.length - 1 && <Divider style={styles.divider} />}
                        </React.Fragment>
                    ))}
                </Surface>
            </ScrollView>

            <View style={styles.footer}>
                <Button 
                    mode="text" 
                    onPress={clearFilters} 
                    style={styles.clearBtn}
                    textColor="#64748B"
                >
                    Limpiar Filtros
                </Button>
                <Button 
                    mode="contained" 
                    onPress={applyFilters} 
                    style={styles.applyBtn}
                    contentStyle={styles.applyBtnContent}
                >
                    Aplicar Filtros
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569'
    },
    activeLabel: {
        color: '#10B981',
        fontWeight: 'bold'
    },
    rowSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2
    },
    divider: {
        backgroundColor: '#F1F5F9'
    },
    footer: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        flexDirection: 'row',
        gap: 12
    },
    clearBtn: {
        flex: 1,
        borderRadius: 14,
    },
    applyBtn: {
        flex: 2,
        borderRadius: 14,
        backgroundColor: '#10B981',
    },
    applyBtnContent: {
        height: 52,
    }
});
