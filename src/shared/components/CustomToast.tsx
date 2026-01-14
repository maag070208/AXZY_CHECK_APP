import React from 'react';
import { View, Text, Platform, Image, StyleSheet } from 'react-native';

import {
  BaseToast,
  BaseToastProps,
  ToastConfig,
} from 'react-native-toast-message';
import { theme } from '../theme/theme';
import { icons } from '../utils/icon';

const toastProps: BaseToastProps = {
  style: {
    height: 'auto',
    width: '98%',
    marginTop: Platform.OS === 'ios' ? 10 : 0,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 10,
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  text2Style: {
    flex: 1,
    textAlign: 'left',
    paddingRight: 10,
    flexWrap: 'wrap',
    color: 'white',
  },
};

const styles = StyleSheet.create({
  image: {
    marginHorizontal: 10,
  },
  success: {
    borderLeftColor: theme.colors.success,
    backgroundColor: theme.colors.success,
  },
  error: {
    borderLeftColor: theme.colors.error,
    backgroundColor: theme.colors.error,
  },
  warning: {
    borderLeftColor: theme.colors.warning,
    backgroundColor: theme.colors.warning,
  },
});

const image = {
  width: 25,
  height: 25,
};

export const toastConfig: ToastConfig = {
  success: props => (
    <View style={[toastProps.style, styles.success]}>
      <Image source={{ uri: icons.success, ...image }} style={styles.image} />
      <Text style={toastProps.text2Style}>{props.text2}</Text>
    </View>
  ),
  error: props => (
    <View style={[toastProps.style, styles.error]}>
      <Image source={{ uri: icons.error, ...image }} style={styles.image} />
      <Text style={toastProps.text2Style}>{props.text2}</Text>
    </View>
  ),
  warning: props => (
    <View style={[toastProps.style, styles.warning]}>
      <Image source={{ uri: icons.error, ...image }} style={styles.image} />
      <Text style={toastProps.text2Style}>{props.text2}</Text>
    </View>
  ),

  customProps: ({
    text1 = '',
    props,
  }: {
    text1?: string;
    props: {
      uuid: string;
    };
  }) => (
    <View style={[toastProps.style, styles.warning]}>
      <Image source={{ uri: icons.success, ...image }} style={styles.image} />
      <Text style={toastProps.text2Style}>{text1}</Text>
      <Text style={toastProps.text2Style}>{props.uuid}</Text>
    </View>
  ),
};
