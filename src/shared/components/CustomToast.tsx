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
    textAlign: 'left',
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
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
  info: {
    borderLeftColor: theme.colors.info,
    backgroundColor: theme.colors.info,
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
      <View style={{ flex: 1, paddingRight: 10 }}>
        {props.text1 && <Text style={[toastProps.text2Style, { fontWeight: 'bold', fontSize: 15 }]}>{props.text1}</Text>}
        {props.text2 && <Text style={toastProps.text2Style}>{props.text2}</Text>}
      </View>
    </View>
  ),
  error: props => (
    <View style={[toastProps.style, styles.error]}>
      <Image source={{ uri: icons.error, ...image }} style={styles.image} />
      <View style={{ flex: 1, paddingRight: 10 }}>
        {props.text1 && <Text style={[toastProps.text2Style, { fontWeight: 'bold', fontSize: 15 }]}>{props.text1}</Text>}
        {props.text2 && <Text style={toastProps.text2Style}>{props.text2}</Text>}
      </View>
    </View>
  ),
  warning: props => (
    <View style={[toastProps.style, styles.warning]}>
      <Image source={{ uri: icons.error, ...image }} style={styles.image} />
      <View style={{ flex: 1, paddingRight: 10 }}>
        {props.text1 && <Text style={[toastProps.text2Style, { fontWeight: 'bold', fontSize: 15 }]}>{props.text1}</Text>}
        {props.text2 && <Text style={toastProps.text2Style}>{props.text2}</Text>}
      </View>
    </View>
  ),
  info: props => (
    <View style={[toastProps.style, styles.info]}>
      <Image source={{ uri: icons.error, ...image }} style={styles.image} />
      <View style={{ flex: 1, paddingRight: 10 }}>
        {props.text1 && <Text style={[toastProps.text2Style, { fontWeight: 'bold', fontSize: 15 }]}>{props.text1}</Text>}
        {props.text2 && <Text style={toastProps.text2Style}>{props.text2}</Text>}
      </View>
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
