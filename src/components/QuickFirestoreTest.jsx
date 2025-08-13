// src/components/QuickFirestoreTest.jsx - اختبار سريع للاتصال مع Firestore
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';

const QuickFirestoreTest = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testBasicOperations = async () => {
    if (!user) {
      addResult('يجب تسجيل الدخول أولاً', 'error');
      return;
    }

    setLoading(true);
    clearResults();

    try {
      // اختبار إنشاء مستخدم
      addResult('🔍 اختبار إنشاء بيانات المستخدم...', 'info');
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        phoneNumber: user.phoneNumber || '+9647XXXXXXXX',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        testData: true
      }, { merge: true });
      addResult('✅ تم إنشاء بيانات المستخدم بنجاح', 'success');

      // اختبار قراءة بيانات المستخدم
      addResult('🔍 اختبار قراءة بيانات المستخدم...', 'info');
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        addResult('✅ تم قراءة بيانات المستخدم بنجاح', 'success');
      } else {
        addResult('❌ فشل في قراءة بيانات المستخدم', 'error');
      }

      // اختبار إنشاء عضو عائلة
      addResult('🔍 اختبار إنشاء عضو عائلة...', 'info');
      const familyRef = doc(db, 'families', `test_${user.uid}_${Date.now()}`);
      await setDoc(familyRef, {
        userId: user.uid,
        firstName: 'أحمد',
        fatherName: 'محمد', 
        grandfatherName: 'علي',
        surname: 'الطائي',
        relation: 'الأب',
        birthdate: '1980-01-01',
        createdAt: serverTimestamp(),
        testMember: true
      });
      addResult('✅ تم إنشاء عضو العائلة بنجاح', 'success');

      // اختبار قراءة عضو العائلة
      addResult('🔍 اختبار قراءة عضو العائلة...', 'info');
      const familyDoc = await getDoc(familyRef);
      if (familyDoc.exists()) {
        addResult('✅ تم قراءة عضو العائلة بنجاح', 'success');
      } else {
        addResult('❌ فشل في قراءة عضو العائلة', 'error');
      }

      // اختبار الحذف
      addResult('🔍 اختبار حذف البيانات التجريبية...', 'info');
      await deleteDoc(familyRef);
      addResult('✅ تم حذف البيانات التجريبية بنجاح', 'success');

      addResult('🎉 جميع الاختبارات نجحت!', 'success');

    } catch (error) {
      addResult(`❌ خطأ في الاختبار: ${error.message}`, 'error');
      console.error('Firestore test error:', error);
    }

    setLoading(false);
  };

  const testConnection = async () => {
    if (!user) {
      addResult('يجب تسجيل الدخول أولاً', 'error');
      return;
    }

    setLoading(true);
    clearResults();

    try {
      addResult('🔍 اختبار الاتصال البسيط...', 'info');
      
      const testRef = doc(db, 'test_connection', `test_${Date.now()}`);
      await setDoc(testRef, {
        message: 'اختبار الاتصال',
        userId: user.uid,
        timestamp: serverTimestamp()
      });
      
      const testDoc = await getDoc(testRef);
      if (testDoc.exists()) {
        addResult('✅ الاتصال يعمل بشكل صحيح', 'success');
        await deleteDoc(testRef);
        addResult('✅ تم تنظيف بيانات الاختبار', 'success');
      }
      
    } catch (error) {
      addResult(`❌ فشل الاتصال: ${error.message}`, 'error');
      console.error('Connection test error:', error);
    }

    setLoading(false);
  };

  if (!user) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Alert severity="warning">
            يجب تسجيل الدخول أولاً لاختبار Firestore
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom align="center">
        🚀 اختبار سريع لـ Firestore
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            المستخدم الحالي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            معرف المستخدم: {user.uid}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            رقم الهاتف: {user.phoneNumber || 'غير متوفر'}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              onClick={testConnection}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              اختبار الاتصال البسيط
            </Button>
            
            <Button
              variant="outlined"
              onClick={testBasicOperations}
              disabled={loading}
            >
              اختبار العمليات الأساسية
            </Button>
            
            <Button
              variant="text"
              onClick={clearResults}
              disabled={loading}
            >
              مسح النتائج
            </Button>
          </Box>

          {results.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                نتائج الاختبار:
              </Typography>
              {results.map((result, index) => (
                <Alert 
                  key={index} 
                  severity={result.type} 
                  sx={{ mb: 1 }}
                >
                  <strong>{result.time}</strong> - {result.message}
                </Alert>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuickFirestoreTest;
