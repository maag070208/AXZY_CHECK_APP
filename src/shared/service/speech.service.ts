import {
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

const Speech = NativeModules.SpeechRecognition;

export const isSpeechAvailable = Platform.OS === 'android' && !!Speech;

export const stopSpeech = () => {
  Speech?.stopListening?.();
};

/**
 * Dictado por voz (Android). Devuelve el texto final y va entregando parciales.
 * El permiso RECORD_AUDIO se solicita aquí para que el botón sea de un toque.
 */
export const startSpeech = async (
  onPartial: (text: string) => void,
): Promise<string> => {
  if (!isSpeechAvailable) {
    throw new Error('El dictado no está disponible en este dispositivo.');
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Permiso de micrófono',
      message: 'CheckApp necesita el micrófono para dictar tus observaciones.',
      buttonPositive: 'Permitir',
      buttonNegative: 'Cancelar',
    },
  );

  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Permiso de micrófono denegado.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      partialSub.remove();
      resultSub.remove();
      errorSub.remove();
      clearTimeout(timeout);
    };
    const finish = (text?: string, error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(text ?? '');
    };

    const partialSub = DeviceEventEmitter.addListener(
      'SpeechRecognitionPartial',
      (event: { text?: string }) => {
        if (event?.text) onPartial(event.text);
      },
    );
    const resultSub = DeviceEventEmitter.addListener(
      'SpeechRecognitionResult',
      (event: { text?: string }) => finish(event?.text ?? ''),
    );
    const errorSub = DeviceEventEmitter.addListener(
      'SpeechRecognitionError',
      (event: { message?: string }) =>
        finish(undefined, new Error(event?.message || 'No se pudo dictar.')),
    );
    const timeout = setTimeout(
      () => finish(undefined, new Error('El dictado tardó demasiado. Intenta de nuevo.')),
      60000,
    );

    try {
      Speech.startListening();
    } catch (error: any) {
      finish(undefined, new Error(error?.message || 'No se pudo iniciar el dictado.'));
    }
  });
};
