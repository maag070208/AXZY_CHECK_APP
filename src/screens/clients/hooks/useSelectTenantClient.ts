import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../core/store/hooks';
import { selectClient } from '../../../core/store/slices/tenant.slice';
import { persistTenantClientId } from '../../../core/tenant/tenant.storage';

/**
 * Elige el cliente activo del tenant y lo persiste para el usuario. El header `X-Client-Id`
 * y la hidratación de `GET /users/me` reaccionan a `selectedClientId` desde `MainNavigation`.
 */
export const useSelectTenantClient = () => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(state => state.userState.id);

  return useCallback(
    async (clientId: number) => {
      dispatch(selectClient(clientId));
      if (userId) await persistTenantClientId(Number(userId), clientId);
    },
    [dispatch, userId],
  );
};
