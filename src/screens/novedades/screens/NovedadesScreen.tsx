import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../../core/store/hooks';
import { RootState } from '../../../core/store/redux.config';
import { theme } from '../../../shared/theme/theme';
import { NovedadesMessage } from '../components/NovedadesMessage';
import { useNovedades } from '../hooks/useNovedades';

/**
 * @description Pantalla completa de novedades: historial persistido + streaming
 * en tiempo real por Ably, con composer para publicar.
 */
export const NovedadesScreen = ({ navigation }: any) => {
  const user = useAppSelector((state: RootState) => state.userState);
  const { messages, connected, loading, canPublish, send } = useNovedades();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Escucha el teclado para empujar el composer hacia arriba. Se usa
  // marginBottom dinámico en lugar de KeyboardAvoidingView porque este patrón
  // funciona de forma idéntica en iOS y Android sin depender de
  // windowSoftInputMode ni de offsets calculados.
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    const ok = await send(draft);
    setSending(false);
    if (ok) setDraft('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.flex}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>Aún no hay novedades. Publica la primera.</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map(novedad => (
              <NovedadesMessage
                key={novedad.id}
                novedad={novedad}
                isOwn={Number(novedad.userId) === Number(user.id)}
              />
            ))}
          </ScrollView>
        )}

        {canPublish && (
          <View
            style={[
              styles.composerWrapper,
              { marginBottom: keyboardHeight },
            ]}
          >
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Escribe una novedad..."
                placeholderTextColor={theme.colors.grayDark}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
                onPress={() => void handleSend()}
                disabled={!draft.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                ) : (
                  <Icon source="send" size={18} color={theme.colors.onPrimary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.grayDark,
  },
  composerWrapper: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
