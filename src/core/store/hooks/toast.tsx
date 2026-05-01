import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { useAppDispatch, useAppSelector } from '.';
import { hideToast } from '../slices/toast.slice';

export const ToastHandler = () => {
  const dispatch = useAppDispatch();
  const toastState = useAppSelector(state => state.toastState);

  useEffect(() => {
    if (toastState.toast) {
      Toast.show({
        type: toastState.toast.type,
        text1: toastState.toast.type === 'error' ? 'Error' : 'Éxito',
        text2: toastState.toast.message,
      });
      const timer = setTimeout(() => {
        dispatch(hideToast());
      }, toastState.toast.hideMillis);

      return () => clearTimeout(timer);
    }
  }, [toastState.toast]);

  return null;
};
