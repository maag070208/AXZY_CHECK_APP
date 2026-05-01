import { store } from '../../core/store/redux.config';

export const getRoleValid = (role: string): boolean => {
  const state = store.getState();
  const userRoles = state.userState.roles || [];

  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  return userRoles.includes(role);
};
