import React, { useEffect, useState } from 'react';
import { auth } from './firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import PhoneLogin from './pages/PhoneLogin';
import Family from './pages/Family';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setPhoneVerified(!!localStorage.getItem('verifiedPhone'));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <p>جاري التحقق...</p>;
  if (!user || !phoneVerified) return <PhoneLogin />;
  return <Family />;
}
