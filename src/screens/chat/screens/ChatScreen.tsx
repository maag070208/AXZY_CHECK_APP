import React, { useCallback, useRef, useState } from 'react';
import {
  AppState,
  DeviceEventEmitter,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, IconButton, Surface, Text, TextInput } from 'react-native-paper';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { getMessages, IChatMessage, sendMessage } from '../service/chat.service';
import { resolveChatClientId, useChatRealtime } from '../service/chat.realtime';
import { CLIENT_CHANGED_EVENT, CLIENT_UPDATED_EVENT } from '../../../offline/client';
import { AppButton } from '../../../shared/components/AppButton';

const POLL_INTERVAL_MS = 10000;

/** Roles con operación offline: su cliente activo (fase 4) vive en la meta local. */
const OFFLINE_CHAT_ROLES: string[] = [UserRole.GUARD, UserRole.MAINT, UserRole.SHIFT];

/**
 * "4.1 Chat grupal" — canal de mensajería del equipo operativo (ADMIN, GUARD,
 * SHIFT, MAINT). Postgres es la fuente de verdad (persistido vía REST);
 * Ably es solo una mejora en vivo — si no conecta, la pantalla sigue
 * funcionando por polling cada 10s.
 *
 * Multicliente: el chat en vivo escucha `chat:team:<clientId>` (nunca el canal global
 * `chat:team`). Sin cliente activo no se suscribe y queda el polling.
 */
export const ChatScreen = () => {
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  /** Cliente activo del canal de tiempo real; `null` = sin cliente (solo polling). */
  const [realtimeClientId, setRealtimeClientId] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await getMessages();
      if (res.success && Array.isArray(res.data)) {
        // API returns newest-first; FlatList is inverted, so keep newest-first.
        setMessages(res.data);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const includeOfflineClient = OFFLINE_CHAT_ROLES.includes(String(user.role));
  // ADMIN/MAINT de organización: el canal es el del cliente elegido en el selector multicliente.
  const tenantClientId = useSelector(
    (state: RootState) => state.tenantState.selectedClientId,
  );

  // El pull/selector pueden cambiar el cliente: se vuelve a resolver para re-suscribirse.
  const syncRealtimeClient = useCallback(async () => {
    const clientId = await resolveChatClientId({
      userId: user.id,
      sessionClientId: user.clientId,
      tenantClientId,
      useOfflineClient: includeOfflineClient,
    });
    setRealtimeClientId(clientId);
  }, [user.id, user.clientId, tenantClientId, includeOfflineClient]);

  useFocusEffect(
    useCallback(() => {
      void loadMessages();
      const pollTimer = setInterval(() => void loadMessages(), POLL_INTERVAL_MS);

      void syncRealtimeClient();
      const updatedSub = DeviceEventEmitter.addListener(CLIENT_UPDATED_EVENT, () => {
        void syncRealtimeClient();
      });
      const changedSub = DeviceEventEmitter.addListener(CLIENT_CHANGED_EVENT, () => {
        void syncRealtimeClient();
      });
      const appSub = AppState.addEventListener('change', next => {
        if (next === 'active') void syncRealtimeClient();
      });

      return () => {
        clearInterval(pollTimer);
        updatedSub.remove();
        changedSub.remove();
        appSub.remove();
      };
    }, [loadMessages, syncRealtimeClient]),
  );

  // Suscripción al canal del cliente mientras la pantalla está enfocada. Al cambiar de cliente
  // el hook cierra la conexión anterior y abre `chat:team:<nuevoClientId>`.
  useChatRealtime(isFocused ? realtimeClientId : null, (incoming: IChatMessage) => {
    setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [incoming, ...prev]));
  });

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await sendMessage(trimmed);
      if (res.success && res.data) {
        setMessages(prev => [res.data as IChatMessage, ...prev]);
        setDraft('');
      }
    } catch (e) {
      console.warn('[Chat] Error enviando mensaje', e);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: IChatMessage }) => {
    const isOwn = String(item.user.id) === String(user.id);
    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
        <Surface
          style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
          elevation={1}
        >
          {!isOwn && (
            <Text style={styles.senderName}>
              {item.user.name} {item.user.lastName || ''}
            </Text>
          )}
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {item.message}
          </Text>
          <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>
            {new Date(item.createdAt).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Surface>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          inverted
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {loading ? (
                <ActivityIndicator size="small" color="#065911" />
              ) : error ? (
                <>
                  <Text style={styles.emptyText}>No se pudo cargar el chat.</Text>
                  <AppButton
                    label="Reintentar"
                    icon="refresh"
                    size="sm"
                    variant="outline"
                    style={styles.unflip}
                    onPress={() => {
                      setLoading(true);
                      void loadMessages();
                    }}
                  />
                </>
              ) : (
                <Text style={styles.emptyText}>Todavía no hay mensajes.</Text>
              )}
            </View>
          }
        />

        <Surface style={styles.inputBar} elevation={2}>
          <TextInput
            mode="outlined"
            placeholder="Escribe un mensaje..."
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#065911"
            dense
          />
          <IconButton
            icon="send"
            mode="contained"
            containerColor="#065911"
            iconColor="#FFFFFF"
            disabled={sending || !draft.trim()}
            onPress={handleSend}
          />
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  flex: { flex: 1 },
  listContent: { padding: 16, flexGrow: 1 },
  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    marginTop: 40,
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    textAlign: 'center',
    color: '#9E9E9E',
  },
  unflip: { transform: [{ scaleY: -1 }] },
  row: { marginVertical: 4, flexDirection: 'row' },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  bubbleOwn: { backgroundColor: '#065911', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4 },
  senderName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065911',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  messageText: { fontSize: 14, color: '#333333' },
  messageTextOwn: { color: '#FFFFFF' },
  timeText: { fontSize: 10, color: '#9E9E9E', marginTop: 4, alignSelf: 'flex-end' },
  timeTextOwn: { color: 'rgba(255,255,255,0.75)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  input: { flex: 1, backgroundColor: 'white' },
});
