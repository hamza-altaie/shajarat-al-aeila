// src/components/FirestoreTest.jsx - مكون اختبار الاتصال مع Firestore
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config.js';
import { 
  testFirestoreConnection, 
  createTestUser, 
  createTestFamilyMember, 
  cleanupTestData 
} from '../utils/firestoreTest.js';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';

const FirestoreTest = () => {
  const [user, setUser] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testUser, setTestUser] = useState(null);
  const [testMember, setTestMember] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const runConnectionTest = async () => {
    if (!user) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);
    try {
      const results = await testFirestoreConnection(user.uid);
      setTestResults(results);
    } catch (error) {
      setTestResults({ error: error.message });
    }
    setLoading(false);
  };

  const createTestUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await createTestUser(user.uid, user.phoneNumber || '+9647XXXXXXXX');
      setTestUser(result);
    } catch (error) {
      setTestUser({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const createTestFamilyData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await createTestFamilyMember(user.uid);
      setTestMember(result);
    } catch (error) {
      setTestMember({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const cleanupData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await cleanupTestData(user.uid);
      setTestUser(null);
      setTestMember(null);
      setTestResults(null);
      alert('تم تنظيف البيانات بنجاح');
    } catch (error) {
      alert(`خطأ في التنظيف: ${error.message}`);
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
      <Typography variant="h4" gutterBottom align="center">
        🔥 اختبار الاتصال مع Firestore
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            معلومات المستخدم
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>معرف المستخدم:</strong> {user.uid}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>رقم الهاتف:</strong> {user.phoneNumber || 'غير متوفر'}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            اختبارات Firestore
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              onClick={runConnectionTest}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              اختبار الاتصال
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={createTestUserData}
              disabled={loading}
            >
              إنشاء مستخدم تجريبي
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={createTestFamilyData}
              disabled={loading}
            >
              إنشاء عضو عائلة تجريبي
            </Button>
            
            <Button 
              variant="outlined" 
              color="error"
              onClick={cleanupData}
              disabled={loading}
            >
              تنظيف البيانات
            </Button>
          </Box>

          {testResults && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                نتائج اختبار الاتصال:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`الاتصال: ${testResults.connection ? '✅' : '❌'}`}
                  color={testResults.connection ? 'success' : 'error'}
                  size="small"
                />
                <Chip 
                  label={`الكتابة: ${testResults.write ? '✅' : '❌'}`}
                  color={testResults.write ? 'success' : 'error'}
                  size="small"
                />
                <Chip 
                  label={`القراءة: ${testResults.read ? '✅' : '❌'}`}
                  color={testResults.read ? 'success' : 'error'}
                  size="small"
                />
                <Chip 
                  label={`الحذف: ${testResults.delete ? '✅' : '❌'}`}
                  color={testResults.delete ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              {testResults.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {testResults.error}
                </Alert>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {testUser && (
            <Box sx={{ mb: 2 }}>
              <Alert severity={testUser.success ? 'success' : 'error'}>
                {testUser.success ? 
                  'تم إنشاء المستخدم التجريبي بنجاح' : 
                  `خطأ في إنشاء المستخدم: ${testUser.error}`
                }
              </Alert>
            </Box>
          )}

          {testMember && (
            <Box sx={{ mb: 2 }}>
              <Alert severity={testMember.success ? 'success' : 'error'}>
                {testMember.success ? 
                  `تم إنشاء عضو العائلة التجريبي: ${testMember.memberId}` : 
                  `خطأ في إنشاء عضو العائلة: ${testMember.error}`
                }
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 تعليمات الاختبار
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            1. <strong>اختبار الاتصال:</strong> يختبر جميع العمليات الأساسية (كتابة، قراءة، حذف)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            2. <strong>إنشاء مستخدم تجريبي:</strong> ينشئ بيانات مستخدم في collection 'users'
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            3. <strong>إنشاء عضو عائلة تجريبي:</strong> ينشئ عضو عائلة في collection 'families'
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            4. <strong>تنظيف البيانات:</strong> يحذف جميع البيانات التجريبية المنشأة
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FirestoreTest;
