import { useAuth } from '../AuthContext';

export const useRequireAuth = () => {
  const { isAuthenticated, loading } = useAuth();

  return {
    isAuthenticated,
    loading,
    isReady: !loading && isAuthenticated
  };
};

export const usePermissions = () => {
  const { hasPermission, userData } = useAuth();

  return {
    hasPermission,
    canDeleteMembers: hasPermission('DELETE_MEMBERS'),
    canEditFamily: hasPermission('EDIT_FAMILY'),
    canInviteMembers: hasPermission('INVITE_MEMBERS')
  };
};
