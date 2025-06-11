import React, { useEffect, useState } from 'react';
import { auth } from './firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import PhoneLogin from './pages/PhoneLogin';
import Family from './pages/Family';
import { CircularProgress, Box } from '@mui/material';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const phone = localStorage.getItem('verifiedPhone');
      setPhoneVerified(!!phone);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
  if (!user || !phoneVerified) return <PhoneLogin />;
  return <Family />;
}
