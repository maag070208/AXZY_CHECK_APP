import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
    subscribeShiftNotifications,
    unsubscribeShiftNotifications,
} from '../service/shift-notifications.client';

/**
 * @description Hook que suscribe al canal de notificaciones Ably del usuario
 * autenticado para mostrar un Toast cuando se generan incidencias por un
 * ShiftCheck. Se monta en una pantalla de alto tráfico (Home).
 */
export const useShiftNotifications = () => {
    const dispatch = useDispatch();
    const userId = useSelector((state: RootState) => state.userState.id);
    const role = useSelector((state: RootState) => state.userState.role);

    useEffect(() => {
        if (!userId) return;
        // Solo ADMIN/SHIFT reciben alertas de turno.
        if (role !== 'ADMIN' && role !== 'SHIFT') return;

        let mounted = true;
        subscribeShiftNotifications(Number(userId), (payload) => {
            if (!mounted) return;
            const msg = payload.summary ?? 'Nueva notificación de turno';
            dispatch(showToast({ message: msg, type: 'info' }));
        }).catch((err) => {
            console.warn('[useShiftNotifications] connect failed:', err);
        });

        return () => {
            mounted = false;
            unsubscribeShiftNotifications();
        };
    }, [userId, role, dispatch]);
};
