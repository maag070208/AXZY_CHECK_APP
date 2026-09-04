import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { IconButton, Surface, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../../../core/store/redux.config';
import { getMessages, getRealtimeToken, IChatMessage, sendMessage } from '../service/chat.service';

const POLL_INTERVAL_MS = 10000;
const ABLY_CHAT_CHANNEL = 'chat:team';

/**
 * "4.1 Chat grupal" — canal de mensajería del equipo operativo (ADMIN, GUARD,
 * SHIFT, MAINT). Postgres es la fuente de verdad (persistido vía REST);
 * Ably es solo una mejora en vivo — si no conecta, la pantalla sigue
 * funcionando por polling cada 10s.
 */
export const ChatScreen = () => {
  const user = useSelector((state: RootState) => state.userState);
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const ablyRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await getMessages();
      if (res.success && res.data) {
        // API returns newest-first; FlatList is inverted, so keep newest-first.
        setMessages(res.data);
      }
    } catch (e) {
      console.warn('[Chat] Error cargando mensajes', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      const pollTimer = setInterval(loadMessages, POLL_INTERVAL_MS);

      // Best-effort realtime via Ably; if it can't connect, polling above
      // keeps the chat working.
      let client: any = null;
      (async () => {
        try {
          const Ably = require('ably');
          client = new Ably.Realtime({
            authCallback: async (_tokenParams: any, callback: any) => {
              try {
                const res = await getRealtimeToken();
                if (res.success && res.data) {
                  callback(null, res.data);
                } else {
                  callback('No se pudo obtener el token de tiempo real', null);
                }
              } catch (error) {
                callback(error, null);
              }
            },
          });
          ablyRef.current = client;
          const channel = client.channels.get(ABLY_CHAT_CHANNEL);
          channel.subscribe('new-message', (msg: any) => {
            const incoming: IChatMessage = msg.data;
            setMessages(prev =>
              prev.some(m => m.id === incoming.id) ? prev : [incoming, ...prev],
            );
          });
        } catch (e) {
          console.warn('[Chat] Ably no disponible, usando solo polling.', e);
        }
      })();

      return () => {
        clearInterval(pollTimer);
        client?.close?.();
      };
    }, [loadMessages]),
  );

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
            <Text style={styles.emptyText}>Todavía no hay mensajes.</Text>
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
  emptyText: {
    textAlign: 'center',
    color: '#9E9E9E',
    marginTop: 40,
    transform: [{ scaleY: -1 }],
  },
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
