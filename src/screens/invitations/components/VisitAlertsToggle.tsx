import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Switch, Text } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { tokens } from '../../../shared/theme/tokens';
import { getVisitAlerts, setVisitAlerts } from '../service/invitation.service';

/** Interruptor del residente para los avisos de entrada y salida. Las autorizaciones siempre llegan. */
export const VisitAlertsToggle = () => {
    const dispatch = useDispatch();
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getVisitAlerts()
            .then((res) => setEnabled(res.success && res.data ? res.data.enabled : null))
            .catch(() => setEnabled(null));
    }, []);

    const toggle = async (value: boolean) => {
        const previous = enabled;
        setEnabled(value);
        setSaving(true);
        try {
            const res = await setVisitAlerts(value);
            if (!res.success) throw new Error();
        } catch {
            setEnabled(previous);
            dispatch(showToast({ type: 'error', message: 'No se pudo guardar tu preferencia' }));
        } finally {
            setSaving(false);
        }
    };

    if (enabled === null) return null;

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12, gap: 12 }}>
            <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ color: tokens.color.textStrong, fontWeight: '800' }}>Avisos de mis visitas</Text>
                <Text variant="bodySmall" style={{ color: tokens.color.textMuted }}>Te avisamos cuando entran y salen.</Text>
            </View>
            <Switch
                value={enabled}
                onValueChange={toggle}
                disabled={saving}
                color={tokens.color.primary}
                accessibilityLabel="Avisos cuando mis visitas entran y salen"
            />
        </View>
    );
};
