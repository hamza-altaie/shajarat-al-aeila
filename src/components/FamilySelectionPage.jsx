import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, Box, List, ListItem, ListItemText,
  Button, RadioGroup, FormControlLabel, Radio, TextField, Alert,
  CircularProgress, Chip, Card, CardContent, Avatar, Divider
} from '@mui/material';
import {
  AccountTree as FamilyIcon, 
  Person as PersonIcon, 
  Groups as GroupsIcon,
  ArrowForward as NextIcon, 
  SkipNext as SkipIcon
} from '@mui/icons-material';
import { db } from '../firebase/config';
import { 
  collection, getDocs, doc, getDoc, setDoc, updateDoc, 
  query, orderBy, where 
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function FamilySelectionPage() {
  const [familyHeads, setFamilyHeads] = useState([]);
  const [selectedHead, setSelectedHead] = useState('');
  const [relationToHead, setRelationToHead] = useState('');
  const [customFatherName, setCustomFatherName] = useState('');
  const [showCustomOption, setShowCustomOption] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();

  // العلاقات المتاحة
  const relations = [
    { value: 'ابن', label: 'ابن', icon: '👦' },
    { value: 'بنت', label: 'بنت', icon: '👧' },
    { value: 'أخ', label: 'أخ', icon: '👨' },
    { value: 'أخت', label: 'أخت', icon: '👩' },
    { value: 'ابن أخ', label: 'ابن أخ', icon: '👦' },
    { value: 'بنت أخ', label: 'بنت أخ', icon: '👧' },
    { value: 'ابن أخت', label: 'ابن أخت', icon: '👦' },
    { value: 'بنت أخت', label: 'بنت أخت', icon: '👧' },
    { value: 'حفيد', label: 'حفيد', icon: '👶' },
    { value: 'حفيدة', label: 'حفيدة', icon: '👶' }
  ];

  useEffect(() => {
    const fetchFamilyHeads = async () => {
      try {
        const familyHeadsRef = collection(db, 'family_heads');
        const familyHeadsQuery = query(familyHeadsRef, orderBy('name'));
        const familyHeadsSnapshot = await getDocs(familyHeadsQuery);

        const heads = familyHeadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFamilyHeads(heads);
      } catch (error) {
        console.error('خطأ أثناء تحميل رؤوس العائلة:', error);
        setError('حدث خطأ أثناء تحميل رؤوس العائلة');
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyHeads();
  }, []); // ✅ إصلاح تحذيرات React Hooks

  // تحميل أرباب العوائل المسجلين
  const loadFamilyHeads = async () => {
    try {
      setLoading(true);
      setError('');
      
      // جلب جميع المستخدمين
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const heads = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // تخطي المستخدم الحالي
        if (userId === uid) continue;
        
        // محاولة جلب بيانات العائلة للحصول على الاسم الحقيقي
        try {
          const familySnapshot = await getDocs(collection(db, 'users', userId, 'family'));
          let displayName = 'رب عائلة';
          let familyName = 'عائلة غير محددة';
          
          // البحث عن رب العائلة في family collection
          let familyHead = null;
          familySnapshot.docs.forEach(doc => {
            const memberData = doc.data();
            if (memberData.relation === 'رب العائلة') {
              familyHead = memberData;
            }
          });
          
          // بناء الاسم من بيانات العائلة
          if (familyHead) {
            const firstName = familyHead.firstName || '';
            const fatherName = familyHead.fatherName || '';
            const grandfatherName = familyHead.grandfatherName || '';
            const surname = familyHead.surname || '';
            
            displayName = `${firstName} ${fatherName}`.trim() || firstName || 'رب العائلة';
            
            if (surname) {
              familyName = `🏠 عائلة ${surname}`;
            } else if (grandfatherName) {
              familyName = `🏠 عائلة ${grandfatherName}`;
            } else if (firstName) {
              familyName = `🏠 عائلة ${firstName}`;
            }
          } else {
            // إذا لم يوجد رب عائلة، استخدم بيانات المستخدم
            if (userData.firstName) {
              displayName = userData.firstName;
              familyName = `🏠 عائلة ${userData.firstName}`;
            } else {
              const phoneEnd = userData.phone ? userData.phone.slice(-4) : '0000';
              displayName = `العضو ${phoneEnd}`;
              familyName = `🏠 العائلة ${phoneEnd}`;
            }
          }
          
          heads.push({
            id: userId,
            name: displayName,
            familyName: familyName,
            phone: userData.phone,
            createdAt: userData.createdAt,
            membersCount: familySnapshot.docs.length,
            avatar: familyHead?.avatar || userData.avatar
          });
          
          console.log('تمت إضافة عائلة:', displayName, familyName);
          
        } catch (familyError) {
          console.error('خطأ في جلب بيانات العائلة:', familyError);
          // fallback للبيانات الأساسية
          const phoneEnd = userData.phone ? userData.phone.slice(-4) : '0000';
          heads.push({
            id: userId,
            name: `العضو ${phoneEnd}`,
            familyName: `🏠 العائلة ${phoneEnd}`,
            phone: userData.phone,
            createdAt: userData.createdAt,
            membersCount: 0,
            avatar: userData.avatar
          });
        }
      }
      
      setFamilyHeads(heads);
      console.log('تم تحميل العوائل:', heads);
      
    } catch (error) {
      console.error('خطأ في تحميل أرباب العوائل:', error);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ربط المستخدم بعائلة موجودة
  const linkToExistingFamily = async () => {
    if (!selectedHead || !relationToHead) {
      setError('يرجى اختيار رب العائلة وتحديد علاقتك به');
      return;
    }

    try {
      setSubmitting(true);
      
      // تحديث بيانات المستخدم الحالي
      await updateDoc(doc(db, 'users', uid), {
        linkedToFamilyHead: selectedHead,
        relationToHead: relationToHead,
        isLinkedMember: true,
        linkedAt: new Date().toISOString(),
        showInExtendedTree: true, // يظهر في الشجرة الموسعة افتراضياً
        hasCompletedSetup: true, // اكتمل الإعداد
        isNewUser: false // لم يعد مستخدم جديد
      });

      // إضافة المستخدم لقائمة الأعضاء المرتبطين برب العائلة
      const headDoc = doc(db, 'users', selectedHead);
      const headData = await getDoc(headDoc);
      
      if (headData.exists()) {
        const currentLinkedMembers = headData.data().linkedMembers || [];
        await updateDoc(headDoc, {
          linkedMembers: [...currentLinkedMembers, {
            uid: uid,
            name: await getUserDisplayName(uid),
            relation: relationToHead,
            linkedAt: new Date().toISOString()
          }]
        });
      }

      // التوجه لصفحة إدارة العائلة
      navigate('/family');
      
    } catch (error) {
      console.error('خطأ في الربط:', error);
      setError('حدث خطأ أثناء ربط الحساب');
    } finally {
      setSubmitting(false);
    }
  };

  // إنشاء رب عائلة جديد (للحالات الخاصة)
  const createCustomFamilyHead = async () => {
    if (!customFatherName) {
      setError('يرجى إدخال اسم والدك الكامل');
      return;
    }

    try {
      setSubmitting(true);
      
      // إنشاء معرف فريد لرب العائلة الافتراضي
      const customHeadId = `custom_${uid}_${Date.now()}`;
      
      // إنشاء وثيقة رب عائلة افتراضية
      await setDoc(doc(db, 'virtual_family_heads', customHeadId), {
        name: customFatherName,
        createdBy: uid,
        createdAt: new Date().toISOString(),
        isVirtual: true, // رب عائلة افتراضي (غير مسجل)
        linkedMembers: [{
          uid: uid,
          name: await getUserDisplayName(uid),
          relation: 'ابن',
          linkedAt: new Date().toISOString()
        }]
      });

      // تحديث بيانات المستخدم
      await updateDoc(doc(db, 'users', uid), {
        linkedToFamilyHead: customHeadId,
        relationToHead: 'ابن',
        isLinkedMember: true,
        linkedAt: new Date().toISOString(),
        showInExtendedTree: true,
        hasVirtualHead: true, // مرتبط برب عائلة افتراضي
        hasCompletedSetup: true, // اكتمل الإعداد
        isNewUser: false // لم يعد مستخدم جديد
      });

      navigate('/family');
      
    } catch (error) {
      console.error('خطأ في إنشاء رب العائلة:', error);
      setError('حدث خطأ أثناء إعداد العائلة');
    } finally {
      setSubmitting(false);
    }
  };

  // تخطي الربط والانتقال للاستخدام العادي
  const skipLinking = async () => {
    try {
      // تحديث المستخدم كرب عائلة مستقل
      await updateDoc(doc(db, 'users', uid), {
        isFamilyRoot: true,
        isLinkedMember: false,
        showInExtendedTree: false, // لا يظهر في الشجرة الموسعة
        skippedLinking: true,
        skippedAt: new Date().toISOString(),
        hasCompletedSetup: true, // اكتمل الإعداد
        isNewUser: false // لم يعد مستخدم جديد
      });

      navigate('/family');
    } catch (error) {
      console.error('خطأ في التخطي:', error);
      setError('حدث خطأ، يرجى المحاولة مرة أخرى');
    }
  };

  // الحصول على اسم المستخدم
  const getUserDisplayName = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.name || `${userData.firstName || ''} ${userData.fatherName || ''}`.trim() || 'مستخدم';
      }
    } catch (error) {
      console.error('خطأ في جلب اسم المستخدم:', error);
    }
    return 'مستخدم';
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Box textAlign="center">
            <CircularProgress size={60} sx={{ color: '#2e7d32', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              جاري تحميل العوائل المتاحة...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* رأس الصفحة */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
            color: 'white',
            p: 4,
            textAlign: 'center'
          }}
        >
          <FamilyIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            مرحباً بك في شجرة العائلة
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            هل تريد ربط حسابك بشجرة عائلة موجودة؟
          </Typography>
        </Box>

        <Box p={4}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* عرض أرباب العوائل المتاحة */}
          {familyHeads.length > 0 && !showCustomOption && (
            <Box mb={4}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupsIcon color="primary" />
                اختر عائلتك من القائمة ({familyHeads.length} عائلة متاحة)
              </Typography>
              
              <RadioGroup value={selectedHead} onChange={(e) => setSelectedHead(e.target.value)}>
                {familyHeads.map((head) => (
                  <Card 
                    key={head.id} 
                    sx={{ 
                      mb: 2, 
                      border: selectedHead === head.id ? '2px solid #2e7d32' : '1px solid #e0e0e0',
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3 }
                    }}
                    onClick={() => setSelectedHead(head.id)}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <FormControlLabel
                        value={head.id}
                        control={<Radio />}
                        label=""
                        sx={{ m: 0 }}
                      />
                      <Box display="flex" alignItems="center" gap={2} ml={4}>
                        <Avatar src={head.avatar} sx={{ bgcolor: '#2e7d32' }}>
                          {head.name.charAt(0)}
                        </Avatar>
                        <Box flexGrow={1}>
                          <Typography variant="h6" fontWeight="bold" color="primary">
                            {head.familyName}
                          </Typography>
                          <Typography variant="body1" fontWeight="500">
                            رب العائلة: {head.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            📱 {head.phone}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Chip 
                              label={`${head.membersCount} فرد`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip 
                              label="متاح للربط"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>

              {/* اختيار العلاقة */}
              {selectedHead && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    ما علاقتك برب هذه العائلة؟
                  </Typography>
                  <RadioGroup 
                    value={relationToHead} 
                    onChange={(e) => setRelationToHead(e.target.value)}
                    row
                    sx={{ gap: 2 }}
                  >
                    {relations.map((relation) => (
                      <FormControlLabel
                        key={relation.value}
                        value={relation.value}
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            <span>{relation.icon}</span>
                            <span>{relation.label}</span>
                          </Box>
                        }
                        sx={{ 
                          border: '1px solid #e0e0e0',
                          borderRadius: 2,
                          px: 2,
                          py: 1,
                          m: 0,
                          '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                      />
                    ))}
                  </RadioGroup>
                </Box>
              )}

              {/* أزرار العمل للربط بعائلة موجودة */}
              {selectedHead && relationToHead && (
                <Box mt={4} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<NextIcon />}
                    onClick={linkToExistingFamily}
                    disabled={submitting}
                    sx={{ flex: 1 }}
                  >
                    {submitting ? 'جاري الربط...' : 'ربط حسابي بهذه العائلة'}
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* خيار العائلة غير الموجودة */}
          {!showCustomOption && (
            <Box textAlign="center" mb={3}>
              <Divider sx={{ mb: 2 }}>أو</Divider>
              <Button
                variant="outlined"
                startIcon={<PersonIcon />}
                onClick={() => setShowCustomOption(true)}
                sx={{ mb: 2 }}
              >
                والدي/عائلتي ليست في القائمة
              </Button>
            </Box>
          )}

          {/* نموذج العائلة المخصصة */}
          {showCustomOption && (
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                إدخال بيانات والدك (سيتم ربطه عند انضمامه لاحقاً)
              </Typography>
              
              <TextField
                fullWidth
                label="الاسم الكامل لوالدك"
                value={customFatherName}
                onChange={(e) => setCustomFatherName(e.target.value)}
                placeholder="مثال: أحمد محمد علي العلي"
                sx={{ mb: 3 }}
              />

              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<NextIcon />}
                  onClick={createCustomFamilyHead}
                  disabled={submitting || !customFatherName}
                  sx={{ flex: 1 }}
                >
                  {submitting ? 'جاري الإعداد...' : 'إنشاء شجرة عائلة جديدة'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => setShowCustomOption(false)}
                  disabled={submitting}
                >
                  رجوع
                </Button>
              </Box>
            </Box>
          )}

          {/* خيار التخطي */}
          <Box textAlign="center" pt={2} borderTop="1px solid #e0e0e0">
            <Typography variant="body2" color="text.secondary" mb={2}>
              يمكنك تخطي هذه الخطوة والعودة إليها لاحقاً من الإعدادات
            </Typography>
            <Button
              variant="text"
              startIcon={<SkipIcon />}
              onClick={skipLinking}
              color="inherit"
            >
              تخطي - أريد استخدام التطبيق بمفردي الآن
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}