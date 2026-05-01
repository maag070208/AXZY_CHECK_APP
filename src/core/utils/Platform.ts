import { Platform } from 'react-native';

/**
 * Returns the value for the current platform
 * @param ios - Value for iOS
 * @param android - Value for Android
 * @returns The value for the current platform
 */
export const getPlatformValue = (ios: any, android: any) => {
  if (Platform.OS === 'ios') {
    return ios;
  }
  return android;
};
