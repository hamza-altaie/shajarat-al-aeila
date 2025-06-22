import React, { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  userData: null,
  login: () => {},
  logout: () => {},
  refreshUserData: () => {},
  clearError: () => {}
});

export const useAuth = () => {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
