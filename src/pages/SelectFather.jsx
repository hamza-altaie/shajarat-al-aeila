// ✅ SelectFather.jsx - صفحة اختيار الأب بعد التسجيل (محمي)

import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, query, where } from 'firebase/firestore';
import { Box, Typography, MenuItem, Select, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

function SelectFatherContent() {
  const [familyRoots, setFamilyRoots] = useState([]);
  const [selectedFather, setSelectedFather] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const myPhone = localStorage.getItem('verifiedPhone');

  useEffect(() => {
    const fetchFamilyRoots = async () => {
      const q = query(collection(db, 'users'), where('isFamilyRoot', '==', true));
      const snapshot = await getDocs(q);
      const roots = snapshot.docs.map(doc => ({
        phone: doc.id,
        name: doc.data().firstName + ' ' + doc.data().surname,
        ...doc.data()
      }));
      setFamilyRoots(roots);
    };
    fetchFamilyRoots();
  }, []);

  const handleSave = async () => {
    if (!selectedFather || !myPhone) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', myPhone), {
        linkedParentUid: selectedFather,
        parentId: selectedFather,
        isFamilyRoot: false
      }, { merge: true });

      await cloneFullFamilyTree(selectedFather, myPhone);

      navigate('/family');
    } catch (err) {
      console.error('Error linking to father:', err);
    } finally {
      setLoading(false);
    }
  };

  const cloneFullFamilyTree = async (sourceUid, targetPhone) => {
    try {
      const rootDoc = await getDoc(doc(db, 'users', sourceUid));
      if (!rootDoc.exists()) return;

      await setDoc(doc(db, 'users', targetPhone, 'family', sourceUid), {
        ...rootDoc.data(),
        id: sourceUid,
        isFamilyRoot: false
      });

      const subDocs = await getDocs(collection(db, 'users', sourceUid, 'family'));
      for (let docSnap of subDocs.docs) {
        const data = docSnap.data();
        await setDoc(doc(db, 'users', targetPhone, 'family', docSnap.id), {
          ...data,
          id: docSnap.id
        });
      }

      const parentUid = rootDoc.data().linkedParentUid;
      if (parentUid) await cloneFullFamilyTree(parentUid, targetPhone);
    } catch (error) {
      console.error('فشل نسخ شجرة العائلة الكاملة:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>🔗 اختر والدك من قائمة أرباب العوائل</Typography>
      <Select
        fullWidth
        value={selectedFather}
        onChange={(e) => setSelectedFather(e.target.value)}
        displayEmpty
      >
        <MenuItem value="">-- اختر والدك --</MenuItem>
        {familyRoots.map(root => (
          <MenuItem key={root.phone} value={root.phone}>{root.name} ({root.phone})</MenuItem>
        ))}
      </Select>

      <Button
        variant="contained"
        onClick={handleSave}
        sx={{ mt: 2 }}
        disabled={!selectedFather || loading}
      >
        حفظ والانتقال
      </Button>

      <Button
        variant="text"
        color="secondary"
        sx={{ mt: 1 }}
        onClick={async () => {
          if (!myPhone) return;
          await setDoc(doc(db, 'users', myPhone), {
            linkedParentUid: '',
            parentId: '',
            isFamilyRoot: true
          }, { merge: true });
          navigate('/family');
        }}
      >
        أبي غير موجود في القائمة حاليًا
      </Button>
    </Box>
  );
}

export default function SelectFather() {
  return (
    <ProtectedRoute>
      <SelectFatherContent />
    </ProtectedRoute>
  );
}
