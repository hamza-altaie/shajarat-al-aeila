// src/components/ExtendedFamilyLinking.jsx - إصلاح مشاكل ESLint
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Autocomplete, Chip,
  Avatar, Alert, LinearProgress, IconButton, CircularProgress,
  InputAdornment, Divider, Grid, Tabs, Tab, Badge
} from '@mui/material';
import {
  Link as LinkIcon, Search as SearchIcon, PersonAdd as PersonAddIcon,
  Close as CloseIcon, Check as CheckIcon, Warning as WarningIcon,
  Groups as GroupsIcon, AccountTree as TreeIcon, Phone as PhoneIcon,
  Person as PersonIcon, LinkOff as UnlinkIcon, Delete as DeleteIcon,
  History as HistoryIcon, Info as InfoIcon
} from '@mui/icons-material';

// استيرادات Firebase
import { 
  collection, getDocs, doc, updateDoc, getDoc, setDoc, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ExtendedFamilyLinking({ 
  currentUserUid, 
  onLinkingComplete, 
  existingLinks = [] 
}) {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  const [currentTab, setCurrentTab] = useState(0); // 0: ربط جديد، 1: الروابط الحالية
  const [availableFamilies, setAvailableFamilies] = useState([]);
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // حوارات
  const [linkingDialogOpen, setLinkingDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedLinkToRemove, setSelectedLinkToRemove] = useState(null);
  
  // بيانات النماذج
  const [linkType, setLinkType] = useState('');
  const [relationDescription, setRelationDescription] = useState('');
  
  // حالات التحميل والرسائل
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // أنواع الروابط المتاحة - استخدام useMemo لتجنب إعادة الإنشاء
  const linkTypes = useMemo(() => [
    { value: 'parent-child', label: 'والد - طفل', icon: '👨‍👧‍👦', description: 'رابط بين والد وطفل' },
    { value: 'sibling', label: 'أشقاء', icon: '👫', description: 'رابط بين الأشقاء' },
    { value: 'marriage', label: 'زواج', icon: '💒', description: 'رابط زواج بين العائلتين' },
    { value: 'cousin', label: 'أبناء عم/خال', icon: '👥', description: 'رابط أبناء عم أو خال' },
    { value: 'extended', label: 'قرابة ممتدة', icon: '🌳', description: 'رابط قرابة ممتد' }
  ], []);

  // ===========================================================================
  // دوال مساعدة
  // ===========================================================================
  
  const showMessage = useCallback((msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
    }, 5000);
  }, []);

  const sanitizeName = useCallback((firstName, fatherName, surname) => {
    const parts = [firstName, fatherName, surname].filter(part => part && part.trim() !== '');
    return parts.length > 0 ? parts.join(' ').trim() : 'غير محدد';
  }, []);

  // الحصول على نوع الرابط العكسي - نقل هذه الدالة إلى أعلى
  const getReverseLinkType = useCallback((linkType) => {
    switch (linkType) {
      case 'parent-child':
        return 'child-parent';
      case 'child-parent':
        return 'parent-child';
      case 'sibling':
        return 'sibling';
      case 'marriage':
        return 'marriage';
      case 'cousin':
        return 'cousin';
      case 'extended':
        return 'extended';
      default:
        return 'extended';
    }
  }, []);

  const getLinkTypeInfo = useCallback((linkType) => {
    return linkTypes.find(type => type.value === linkType) || 
           { label: linkType, icon: '🔗', description: 'نوع رابط غير معروف' };
  }, [linkTypes]);

  // ===========================================================================
  // دوال التحميل
  // ===========================================================================

  // تحميل العائلات المتاحة للربط
  const loadFamiliesForLinking = useCallback(async () => {
    if (!currentUserUid) {
      console.warn('⚠️ لا يوجد معرف مستخدم حالي');
      return;
    }
    
    setInitialLoading(true);
    
    try {
      // الحصول على جميع المستخدمين
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const families = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // تجاهل المستخدم الحالي والعائلات المرتبطة بالفعل
        if (userId === currentUserUid || existingLinks.includes(userId)) {
          continue;
        }
        
        try {
          // تحميل أفراد هذه العائلة
          const familySnapshot = await getDocs(collection(db, 'users', userId, 'family'));
          const members = [];
          
          familySnapshot.forEach(doc => {
            const memberData = doc.data();
            if (memberData.firstName && memberData.firstName.trim() !== '') {
              members.push({
                ...memberData,
                id: doc.id,
                globalId: `${userId}_${doc.id}`
              });
            }
          });
          
          // إذا كان لديه أفراد عائلة
          if (members.length > 0) {
            // العثور على رب العائلة
            const familyHead = members.find(m => m.relation === 'رب العائلة') || members[0];
            const membersCount = members.length;
            
            const familyName = familyHead 
              ? `عائلة ${sanitizeName(familyHead.firstName, familyHead.fatherName, familyHead.surname)}`
              : `عائلة ${userId.substring(0, 8)}`;
            
            families.push({
              uid: userId,
              name: familyName.trim(),
              head: familyHead,
              membersCount,
              members,
              phone: userData.phone || familyHead?.phone || 'غير محدد',
              createdAt: userData.createdAt || new Date().toISOString(),
              userData
            });
          }
        } catch (error) {
          console.warn(`⚠️ تجاهل العائلة ${userId} بسبب خطأ:`, error.message);
        }
      }
      
      setAvailableFamilies(families);
      
    } catch (error) {
      console.error('❌ خطأ في تحميل العائلات:', error);
      showMessage('فشل في تحميل العائلات المتاحة', 'error');
    } finally {
      setInitialLoading(false);
    }
  }, [currentUserUid, existingLinks, sanitizeName, showMessage]);

  // تحميل العائلات المرتبطة حالياً
  const loadLinkedFamilies = useCallback(async () => {
    if (!currentUserUid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserUid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const linkedFamiliesData = userData.linkedFamilies || [];
        
        // إثراء بيانات العائلات المرتبطة
        const enrichedLinkedFamilies = [];
        
        for (const link of linkedFamiliesData) {
          try {
            const targetUserDoc = await getDoc(doc(db, 'users', link.targetFamilyUid));
            if (targetUserDoc.exists()) {
              const targetUserData = targetUserDoc.data();
              
              // تحميل رئيس العائلة المستهدفة
              const targetFamilySnapshot = await getDocs(collection(db, 'users', link.targetFamilyUid, 'family'));
              let targetFamilyHead = null;
              let membersCount = 0;
              
              targetFamilySnapshot.forEach(doc => {
                const memberData = doc.data();
                if (memberData.firstName) {
                  membersCount++;
                  if (memberData.relation === 'رب العائلة') {
                    targetFamilyHead = memberData;
                  }
                }
              });
              
              enrichedLinkedFamilies.push({
                ...link,
                targetFamilyHead,
                targetUserData,
                membersCount,
                phone: targetUserData.phone || 'غير محدد'
              });
            }
          } catch (error) {
            console.warn(`تجاهل الرابط مع ${link.targetFamilyUid}:`, error);
          }
        }
        
        setLinkedFamilies(enrichedLinkedFamilies);
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل العائلات المرتبطة:', error);
    }
  }, [currentUserUid]);

  // ===========================================================================
  // دوال البحث والتفاعل
  // ===========================================================================

  // البحث في العائلات
  const searchFamilies = useCallback((searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchQuery('');
      return;
    }
    
    setSearchQuery(searchTerm);
    const results = availableFamilies.filter(family => {
      const searchLower = searchTerm.toLowerCase();
      return (
        family.name.toLowerCase().includes(searchLower) ||
        family.head?.firstName?.toLowerCase().includes(searchLower) ||
        family.head?.surname?.toLowerCase().includes(searchLower) ||
        family.head?.fatherName?.toLowerCase().includes(searchLower) ||
        family.phone?.includes(searchTerm)
      );
    });
    
    setSearchResults(results);
  }, [availableFamilies]);

  // فتح نافذة الربط
  const openLinkingDialog = useCallback((family) => {
    setSelectedFamily(family);
    setLinkType('');
    setRelationDescription('');
    setLinkingDialogOpen(true);
  }, []);

  // فتح نافذة فك الربط
  const openUnlinkDialog = useCallback((linkedFamily) => {
    setSelectedLinkToRemove(linkedFamily);
    setUnlinkDialogOpen(true);
  }, []);

  // ===========================================================================
  // دوال الربط وفك الربط - المُحدثة
  // ===========================================================================

  // تأكيد الربط
  const confirmLinking = useCallback(async () => {
    if (!selectedFamily || !linkType) {
      showMessage('يرجى اختيار نوع الرابط', 'warning');
      return;
    }
    
    setLoading(true);
    
    try {
      // إنشاء معرف فريد للرابط
      const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // إنشاء بيانات الرابط
      const linkData = {
        linkId, // إضافة معرف فريد
        targetFamilyUid: selectedFamily.uid,
        targetFamilyName: selectedFamily.name,
        linkType,
        relationDescription: relationDescription.trim() || '',
        establishedAt: new Date().toISOString(),
        establishedBy: currentUserUid,
        status: 'active',
        mutual: true
      };

      // تحديث بيانات المستخدم الحالي
      const currentUserRef = doc(db, 'users', currentUserUid);
      const currentUserDoc = await getDoc(currentUserRef);
      
      if (currentUserDoc.exists()) {
        await updateDoc(currentUserRef, {
          linkedFamilies: arrayUnion(linkData),
          lastUpdated: new Date().toISOString()
        });
      } else {
        await setDoc(currentUserRef, {
          linkedFamilies: [linkData],
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }

      // إنشاء الرابط العكسي مع معرف فريد منفصل
      const reverseLinkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const reverseLinkType = getReverseLinkType(linkType);
      const reverseLinkData = {
        linkId: reverseLinkId, // معرف فريد منفصل للرابط العكسي
        targetFamilyUid: currentUserUid,
        targetFamilyName: `عائلة مرتبطة`,
        linkType: reverseLinkType,
        relationDescription: relationDescription.trim() || '',
        establishedAt: new Date().toISOString(),
        establishedBy: currentUserUid,
        status: 'active',
        mutual: true,
        isReverseLink: true,
        originalLinkId: linkId // ربط بالرابط الأصلي
      };

      // تحديث بيانات العائلة المستهدفة
      const targetUserRef = doc(db, 'users', selectedFamily.uid);
      const targetUserDoc = await getDoc(targetUserRef);
      
      if (targetUserDoc.exists()) {
        await updateDoc(targetUserRef, {
          linkedFamilies: arrayUnion(reverseLinkData),
          lastUpdated: new Date().toISOString()
        });
      } else {
        await setDoc(targetUserRef, {
          linkedFamilies: [reverseLinkData],
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
      
      showMessage('✅ تم ربط العائلة بنجاح', 'success');
      setLinkingDialogOpen(false);
      
      // إشعار المكون الأب
      if (onLinkingComplete) {
        onLinkingComplete(selectedFamily, linkType);
      }
      
      // إعادة تحميل البيانات
      await Promise.all([
        loadFamiliesForLinking(),
        loadLinkedFamilies()
      ]);
      
    } catch (error) {
      console.error('❌ خطأ في ربط العائلة:', error);
      showMessage('❌ فشل في ربط العائلة: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedFamily, linkType, relationDescription, currentUserUid, onLinkingComplete, loadFamiliesForLinking, loadLinkedFamilies, showMessage, getReverseLinkType]);

  // تأكيد فك الربط - الطريقة المُحدثة والمُحسنة
  const confirmUnlinking = useCallback(async () => {
    if (!selectedLinkToRemove) {
      showMessage('لا يوجد رابط محدد لفكه', 'warning');
      return;
    }
    
    setLoading(true);
    
    try {
      // الطريقة 1: جلب البيانات الحالية وإعادة كتابة المصفوفة بدون العنصر المحذوف
      const currentUserRef = doc(db, 'users', currentUserUid);
      const currentUserDoc = await getDoc(currentUserRef);
      
      if (currentUserDoc.exists()) {
        const currentUserData = currentUserDoc.data();
        const currentLinks = currentUserData.linkedFamilies || [];
        
        // إزالة الرابط بناءً على المعرف الفريد أو البيانات الفريدة
        const updatedLinks = currentLinks.filter(link => {
          // مقارنة متعددة المعايير لضمان الحذف الصحيح
          return !(
            link.targetFamilyUid === selectedLinkToRemove.targetFamilyUid &&
            link.linkType === selectedLinkToRemove.linkType &&
            link.establishedAt === selectedLinkToRemove.establishedAt
          );
        });
        
        // تحديث البيانات
        await updateDoc(currentUserRef, {
          linkedFamilies: updatedLinks,
          lastUpdated: new Date().toISOString()
        });
      }

      // إزالة الرابط العكسي من العائلة المستهدفة
      const targetUserRef = doc(db, 'users', selectedLinkToRemove.targetFamilyUid);
      const targetUserDoc = await getDoc(targetUserRef);
      
      if (targetUserDoc.exists()) {
        const targetUserData = targetUserDoc.data();
        const targetLinks = targetUserData.linkedFamilies || [];
        
        // البحث عن الرابط العكسي وإزالته
        const updatedTargetLinks = targetLinks.filter(link => {
          return !(
            link.targetFamilyUid === currentUserUid &&
            (link.originalLinkId === selectedLinkToRemove.linkId || // إذا كان مرتبط بالمعرف الأصلي
             (link.linkType === getReverseLinkType(selectedLinkToRemove.linkType) &&
              Math.abs(new Date(link.establishedAt) - new Date(selectedLinkToRemove.establishedAt)) < 5000)) // مقارنة الوقت مع هامش خطأ
          );
        });
        
        await updateDoc(targetUserRef, {
          linkedFamilies: updatedTargetLinks,
          lastUpdated: new Date().toISOString()
        });
      }
      
      
      showMessage('✅ تم فك ربط العائلة بنجاح', 'success');
      setUnlinkDialogOpen(false);
      setSelectedLinkToRemove(null);
      
      // إشعار المكون الأب
      if (onLinkingComplete) {
        onLinkingComplete(null, 'unlink');
      }
      
      // إعادة تحميل البيانات
      await Promise.all([
        loadFamiliesForLinking(),
        loadLinkedFamilies()
      ]);
      
    } catch (error) {
      console.error('❌ خطأ في فك ربط العائلة:', error);
      showMessage('❌ فشل في فك ربط العائلة: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedLinkToRemove, currentUserUid, onLinkingComplete, loadFamiliesForLinking, loadLinkedFamilies, showMessage, getReverseLinkType]);

  // ===========================================================================
  // دوال العرض
  // ===========================================================================

  // عرض كارت العائلة المتاحة للربط
  const renderFamilyCard = useCallback((family, showLinkButton = true) => (
    <Card 
      key={family.uid} 
      sx={{ 
        mb: 2, 
        border: '1px solid #e0e0e0',
        transition: 'all 0.3s ease',
        '&:hover': { 
          boxShadow: 3,
          borderColor: '#2e7d32',
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar 
            src={family.head?.avatar} 
            sx={{ 
              bgcolor: '#2e7d32', 
              width: 56, 
              height: 56,
              fontSize: '1.5rem'
            }}
          >
            {family.head?.firstName?.charAt(0) || '👤'}
          </Avatar>
          
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
              {family.name}
            </Typography>
            
            {family.head && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <PersonIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                رب العائلة: {sanitizeName(
                  family.head.firstName, 
                  family.head.fatherName, 
                  family.head.surname
                )}
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              👥 {family.membersCount} فرد
            </Typography>
            
            <Box display="flex" gap={1} mt={1}>
              <Chip 
                size="small" 
                label="متاح للربط" 
                color="success" 
                variant="outlined" 
              />
              {family.head?.relation && (
                <Chip 
                  size="small" 
                  label={family.head.relation} 
                  color="primary" 
                  variant="outlined" 
                />
              )}
            </Box>
          </Box>
          
          {showLinkButton && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LinkIcon />}
              onClick={() => openLinkingDialog(family)}
              disabled={loading}
              sx={{ 
                minWidth: 100,
                borderRadius: 2,
                gap: 1
              }}
            >
              ربط
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  ), [loading, openLinkingDialog, sanitizeName]);

  // عرض كارت العائلة المرتبطة
  const renderLinkedFamilyCard = useCallback((linkedFamily) => {
    const linkTypeInfo = getLinkTypeInfo(linkedFamily.linkType);
    
    return (
      <Card 
        key={`${linkedFamily.targetFamilyUid}_${linkedFamily.establishedAt}`} 
        sx={{ 
          mb: 2, 
          border: '1px solid #e3f2fd',
          backgroundColor: '#fafafa',
          transition: 'all 0.3s ease',
          '&:hover': { 
            boxShadow: 3,
            borderColor: '#2196f3'
          }
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar 
              src={linkedFamily.targetFamilyHead?.avatar} 
              sx={{ 
                bgcolor: '#2196f3', 
                width: 56, 
                height: 56,
                fontSize: '1.5rem'
              }}
            >
              {linkedFamily.targetFamilyHead?.firstName?.charAt(0) || '🔗'}
            </Avatar>
            
            <Box flex={1}>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                {linkedFamily.targetFamilyName}
              </Typography>
              
              {linkedFamily.targetFamilyHead && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <PersonIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  رب العائلة: {sanitizeName(
                    linkedFamily.targetFamilyHead.firstName, 
                    linkedFamily.targetFamilyHead.fatherName, 
                    linkedFamily.targetFamilyHead.surname
                  )}
                </Typography>
              )}
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                👥 {linkedFamily.membersCount} فرد
              </Typography>
              
              <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                <Chip 
                  size="small" 
                  label={`${linkTypeInfo.icon} ${linkTypeInfo.label}`}
                  color="primary" 
                  variant="filled" 
                />
                {linkedFamily.relationDescription && (
                  <Chip 
                    size="small" 
                    label={linkedFamily.relationDescription}
                    color="info" 
                    variant="outlined" 
                  />
                )}
                <Chip 
                  size="small" 
                  label={`مرتبط منذ ${new Date(linkedFamily.establishedAt).toLocaleDateString('ar-SA')}`}
                  color="success" 
                  variant="outlined" 
                />
              </Box>
            </Box>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<UnlinkIcon />}
              onClick={() => openUnlinkDialog(linkedFamily)}
              disabled={loading}
              sx={{ 
                minWidth: 100,
                borderRadius: 2,
                gap: 1
              }}
            >
              فك الربط
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }, [loading, openUnlinkDialog, getLinkTypeInfo, sanitizeName]);

  // ===========================================================================
  // تأثيرات ودورة الحياة
  // ===========================================================================

  useEffect(() => {
    if (currentUserUid) {
      Promise.all([
        loadFamiliesForLinking(),
        loadLinkedFamilies()
      ]);
    }
  }, [currentUserUid, loadFamiliesForLinking, loadLinkedFamilies]);

  // ===========================================================================
  // العرض الرئيسي (مختصر للطول)
  // ===========================================================================

  return (
    <Box sx={{ p: 3, fontFamily: 'Cairo, sans-serif' }}>
      {/* رأس القسم */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <TreeIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold" color="primary">
            إدارة روابط العائلات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            اربط عائلتك مع العائلات الأخرى أو فك الروابط الموجودة
          </Typography>
        </Box>
      </Box>

      {/* رسائل التنبيه */}
      {message && (
        <Alert 
          severity={messageType}
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      {/* إحصائيات سريعة */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {availableFamilies.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                عائلة متاحة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {linkedFamilies.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                رابط نشط
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* تبويبات */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              borderRadius: 2,
              margin: 1,
              minHeight: 64,
              padding: '12px 16px'
            },
            '& .MuiTabs-flexContainer': {
              gap: 1
            }
          }}
        >
          <Tab 
            label={
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                gap={1.5}
                sx={{ 
                  flexDirection: { xs: 'column', sm: 'row' },
                  textAlign: 'center',
                  minWidth: 0
                }}
              >
                <LinkIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>
                  ربط عائلات جديدة
                </Typography>
                <Badge badgeContent={availableFamilies.length} color="primary" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                gap={1.5}
                sx={{ 
                  flexDirection: { xs: 'column', sm: 'row' },
                  textAlign: 'center',
                  minWidth: 0
                }}
              >
                <GroupsIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>
                  العائلات المرتبطة
                </Typography>
                <Badge badgeContent={linkedFamilies.length} color="success" />
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* محتوى التبويبات */}
      {currentTab === 0 && (
        <Box>
          {/* شريط البحث */}
          <Box mb={3}>
            <TextField
              fullWidth
              placeholder="ابحث عن العائلات بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => searchFamilies(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              size="medium"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Box>

          {/* محتوى العائلات المتاحة */}
          {initialLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" py={6}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                جاري تحميل العائلات المتاحة...
              </Typography>
            </Box>
          ) : searchQuery && searchResults.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🔍 نتائج البحث ({searchResults.length})
              </Typography>
              {searchResults.map(family => renderFamilyCard(family))}
            </Box>
          ) : searchQuery && searchResults.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <SearchIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  لا توجد نتائج للبحث
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  لم يتم العثور على عائلات تطابق "{searchQuery}"
                </Typography>
              </CardContent>
            </Card>
          ) : availableFamilies.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🏠 العائلات المتاحة للربط ({availableFamilies.length})
              </Typography>
              {availableFamilies.slice(0, 10).map(family => renderFamilyCard(family))}
              {availableFamilies.length > 10 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
                  وعائلات أخرى... استخدم البحث للعثور على عائلة محددة
                </Typography>
              )}
            </Box>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <GroupsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  لا توجد عائلات متاحة للربط
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  جميع العائلات مرتبطة بالفعل أو لا توجد عائلات أخرى في النظام
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {currentTab === 1 && (
        <Box>
          {linkedFamilies.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🔗 العائلات المرتبطة ({linkedFamilies.length})
              </Typography>
              {linkedFamilies.map(linkedFamily => renderLinkedFamilyCard(linkedFamily))}
            </Box>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <LinkIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  لا توجد عائلات مرتبطة
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  لم تقم بربط أي عائلات بعد. انتقل إلى تبويب "ربط عائلات جديدة" لبدء الربط
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setCurrentTab(0)}
                  startIcon={<LinkIcon />}
                  sx={{ gap: 1 }}
                >
                  ابدأ الربط
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* نوافذ الحوار */}
      {/* نافذة تأكيد الربط */}
      <Dialog 
        open={linkingDialogOpen} 
        onClose={() => setLinkingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <LinkIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              ربط العائلات
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedFamily && (
            <Box>
              <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                هل تريد ربط عائلتك مع:
              </Typography>
              
              {renderFamilyCard(selectedFamily, false)}
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                اختر نوع العلاقة بين العائلتين:
              </Typography>
              
              <Autocomplete
                options={linkTypes}
                getOptionLabel={(option) => option.label}
                onChange={(event, newValue) => setLinkType(newValue?.value || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="نوع العلاقة"
                    required
                    error={!linkType}
                    helperText={!linkType ? 'يرجى اختيار نوع العلاقة' : ''}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <span style={{ fontSize: '1.2rem' }}>{option.icon}</span>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {option.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
                sx={{ mb: 3 }}
              />
              
              <TextField
                fullWidth
                label="وصف العلاقة (اختياري)"
                value={relationDescription}
                onChange={(e) => setRelationDescription(e.target.value)}
                placeholder="مثال: أبناء عم من جهة الأب"
                multiline
                rows={2}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setLinkingDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={confirmLinking}
            disabled={!linkType || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
            sx={{ borderRadius: 2, minWidth: 120, gap: 1 }}
          >
            {loading ? 'جاري الربط...' : 'تأكيد الربط'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة تأكيد فك الربط */}
      <Dialog 
        open={unlinkDialogOpen} 
        onClose={() => setUnlinkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <UnlinkIcon color="error" />
            <Typography variant="h6" fontWeight="bold">
              فك ربط العائلة
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedLinkToRemove && (
            <Box>
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body2">
                  ⚠️ هذا الإجراء سيؤدي إلى فك الربط نهائياً بين العائلتين. 
                  هل أنت متأكد من أنك تريد المتابعة؟
                </Typography>
              </Alert>
              
              <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                العائلة المراد فك ربطها:
              </Typography>
              
              {renderLinkedFamilyCard(selectedLinkToRemove)}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setUnlinkDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmUnlinking}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <UnlinkIcon />}
            sx={{ borderRadius: 2, minWidth: 120, gap: 1 }}
          >
            {loading ? 'جاري فك الربط...' : 'تأكيد فك الربط'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}