// src/components/ExtendedFamilyLinking.jsx - نسخة مُصححة ومبسطة
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Autocomplete, Chip,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Alert,
  LinearProgress, IconButton, Tooltip, Grid, Divider, CircularProgress
} from '@mui/material';
import {
  Link as LinkIcon, Search as SearchIcon, PersonAdd as PersonAddIcon,
  Close as CloseIcon, Check as CheckIcon, Warning as WarningIcon,
  Groups as GroupsIcon, AccountTree as TreeIcon
} from '@mui/icons-material';

// استيرادات Firebase
import { 
  collection, getDocs, doc, updateDoc, query, getDoc, setDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ExtendedFamilyLinking({ 
  currentUserUid, 
  onLinkingComplete, 
  existingLinks = [] 
}) {
  // الحالات الأساسية
  const [availableFamilies, setAvailableFamilies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [linkingDialogOpen, setLinkingDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [linkType, setLinkType] = useState('');
  const [relationDescription, setRelationDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // أنواع الروابط المتاحة
  const linkTypes = [
    { value: 'parent-child', label: 'والد - طفل', icon: '👨‍👧‍👦' },
    { value: 'sibling', label: 'أشقاء', icon: '👫' },
    { value: 'marriage', label: 'زواج', icon: '💒' },
    { value: 'cousin', label: 'أبناء عم/خال', icon: '👥' },
    { value: 'extended', label: 'قرابة ممتدة', icon: '🌳' }
  ];

  // إصلاح تحذيرات React Hooks
  const loadAvailableFamilies = useCallback(async () => {
    try {
      const familiesRef = collection(db, 'families');
      const familiesQuery = query(familiesRef);
      const familiesSnapshot = await getDocs(familiesQuery);

      const families = familiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAvailableFamilies(families);
    } catch (error) {
      console.error('خطأ في تحميل العائلات المتاحة:', error);
    }
  }, []);

  // تحميل العائلات المتاحة عند تحميل المكون
  useEffect(() => {
    if (currentUserUid) {
      loadAvailableFamilies();
    }
  }, [currentUserUid, loadAvailableFamilies]);

  // تحميل العائلات المتاحة للربط
  const loadFamiliesForLinking = useCallback(async () => {
    if (!currentUserUid) {
      console.warn('⚠️ لا يوجد معرف مستخدم');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 البحث عن العائلات المتاحة للربط...');
      
      // جلب جميع المستخدمين
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const families = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // تجاهل المستخدم الحالي
        if (userId === currentUserUid) continue;
        
        // تجاهل العائلات المرتبطة بالفعل
        if (existingLinks.includes(userId)) continue;
        
        try {
          // جلب بيانات العائلة
          const familySnapshot = await getDocs(collection(db, 'users', userId, 'family'));
          
          let familyHead = null;
          let membersCount = 0;
          const members = [];
          
          familySnapshot.forEach(doc => {
            const memberData = doc.data();
            if (memberData.firstName) {
              members.push(memberData);
              membersCount++;
              
              if (memberData.relation === 'رب العائلة') {
                familyHead = memberData;
              }
            }
          });
          
          if (membersCount > 0) {
            const familyName = familyHead 
              ? `عائلة ${familyHead.firstName} ${familyHead.surname || familyHead.fatherName || ''}`
              : `عائلة ${userId.substring(0, 8)}`;
            
            families.push({
              uid: userId,
              name: familyName.trim(),
              head: familyHead,
              membersCount,
              members,
              phone: userData.phone,
              createdAt: userData.createdAt
            });
          }
        } catch (error) {
          console.warn(`تجاهل العائلة ${userId} بسبب خطأ:`, error);
        }
      }
      
      setAvailableFamilies(families);
      console.log(`✅ تم العثور على ${families.length} عائلة متاحة للربط`);
      
    } catch (error) {
      console.error('❌ خطأ في تحميل العائلات:', error);
      setMessage('فشل في تحميل العائلات المتاحة');
    } finally {
      setLoading(false);
    }
  }, [currentUserUid, existingLinks]);

  // البحث في العائلات
  const searchFamilies = useCallback((searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = availableFamilies.filter(family => {
      const searchLower = searchTerm.toLowerCase();
      return (
        family.name.toLowerCase().includes(searchLower) ||
        family.head?.firstName?.toLowerCase().includes(searchLower) ||
        family.head?.surname?.toLowerCase().includes(searchLower) ||
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

  // تأكيد الربط
  const confirmLinking = useCallback(async () => {
    if (!selectedFamily || !linkType) {
      setMessage('يرجى اختيار نوع الرابط');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`🔗 ربط العائلة ${selectedFamily.name} بنوع: ${linkType}`);
      
      // إنشاء بيانات الرابط
      const linkData = {
        targetFamilyUid: selectedFamily.uid,
        targetFamilyName: selectedFamily.name,
        linkType,
        relationDescription: relationDescription.trim(),
        establishedAt: new Date().toISOString(),
        establishedBy: currentUserUid,
        status: 'active',
        mutual: true
      };
      
      // تحديث العائلة الحالية
      const currentUserRef = doc(db, 'users', currentUserUid);
      const currentUserDoc = await getDoc(currentUserRef);
      
      if (currentUserDoc.exists()) {
        const currentUserData = currentUserDoc.data();
        const existingLinks = currentUserData.linkedFamilies || [];
        
        await updateDoc(currentUserRef, {
          linkedFamilies: [...existingLinks, linkData],
          lastUpdated: new Date().toISOString()
        });
      } else {
        await setDoc(currentUserRef, {
          linkedFamilies: [linkData],
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
      
      // تحديث العائلة المستهدفة
      const reverseLinkData = {
        targetFamilyUid: currentUserUid,
        targetFamilyName: 'عائلة مرتبطة',
        linkType: getReverseLinkType(linkType),
        relationDescription: relationDescription.trim(),
        establishedAt: new Date().toISOString(),
        establishedBy: currentUserUid,
        status: 'active',
        mutual: true
      };
      
      const targetUserRef = doc(db, 'users', selectedFamily.uid);
      const targetUserDoc = await getDoc(targetUserRef);
      
      if (targetUserDoc.exists()) {
        const targetUserData = targetUserDoc.data();
        const existingTargetLinks = targetUserData.linkedFamilies || [];
        
        await updateDoc(targetUserRef, {
          linkedFamilies: [...existingTargetLinks, reverseLinkData],
          lastUpdated: new Date().toISOString()
        });
      } else {
        await setDoc(targetUserRef, {
          linkedFamilies: [reverseLinkData],
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
      
      console.log('✅ تم إنشاء الرابط بنجاح');
      setMessage('✅ تم ربط العائلة بنجاح');
      setLinkingDialogOpen(false);
      
      // إشعار المكون الأب
      if (onLinkingComplete) {
        onLinkingComplete(selectedFamily, linkType);
      }
      
      // إعادة تحميل العائلات
      await loadFamiliesForLinking();
      
    } catch (error) {
      console.error('❌ خطأ في ربط العائلة:', error);
      setMessage('❌ فشل في ربط العائلة');
    } finally {
      setLoading(false);
    }
  }, [selectedFamily, linkType, relationDescription, currentUserUid, onLinkingComplete, loadFamiliesForLinking, getReverseLinkType]);

  // الحصول على نوع الرابط العكسي
  const getReverseLinkType = useCallback((linkType) => {
    switch (linkType) {
      case 'parent-child':
        return 'child-parent';
      case 'sibling':
        return 'sibling';
      case 'marriage':
        return 'marriage';
      case 'cousin':
        return 'cousin';
      case 'extended':
        return 'extended';
      default:
        return '';
    }
  }, []); // ✅ إصلاح تحذيرات React Hooks

  // عرض كارت العائلة
  const renderFamilyCard = useCallback((family, showLinkButton = true) => (
    <Card 
      key={family.uid} 
      sx={{ 
        mb: 2, 
        border: '1px solid #e0e0e0',
        '&:hover': { 
          boxShadow: 3,
          borderColor: '#2e7d32'
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar 
            src={family.head?.avatar} 
            sx={{ bgcolor: '#2e7d32', width: 56, height: 56 }}
          >
            {family.head?.firstName?.charAt(0) || '👤'}
          </Avatar>
          
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {family.name}
            </Typography>
            
            {family.head && (
              <Typography variant="body2" color="text.secondary">
                رب العائلة: {family.head.firstName} {family.head.fatherName || ''}
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">
              📱 {family.phone} • 👥 {family.membersCount} فرد
            </Typography>
            
            <Box display="flex" gap={1} mt={1}>
              <Chip size="small" label="متاح للربط" color="success" variant="outlined" />
              {family.head?.relation && (
                <Chip size="small" label={family.head.relation} color="primary" variant="outlined" />
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
            >
              ربط
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  ), [loading, openLinkingDialog]);

  return (
    <Box sx={{ p: 3 }}>
      {/* رأس القسم */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <TreeIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold" color="primary">
            الربط الموسع بين العائلات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            اربط عائلتك مع العائلات الأخرى لبناء شجرة موسعة
          </Typography>
        </Box>
      </Box>

      {/* شريط البحث */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="ابحث عن العائلات بالاسم أو رقم الهاتف..."
          onChange={(e) => searchFamilies(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          size="medium"
        />
      </Box>

      {/* رسائل التنبيه */}
      {message && (
        <Alert 
          severity={message.includes('✅') ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      {/* مؤشر التحميل */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

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
                {existingLinks.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                رابط موجود
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* نتائج البحث أو العائلات المتاحة */}
      {searchResults.length > 0 ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            🔍 نتائج البحث ({searchResults.length})
          </Typography>
          {searchResults.map(family => renderFamilyCard(family))}
        </Box>
      ) : availableFamilies.length > 0 ? (
        <Box>
          <Typography variant="h6" gutterBottom>
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

      {/* نافذة تأكيد الربط */}
      <Dialog 
        open={linkingDialogOpen} 
        onClose={() => setLinkingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <LinkIcon color="primary" />
            ربط العائلات
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedFamily && (
            <Box>
              <Typography variant="body1" gutterBottom>
                هل تريد ربط عائلتك مع:
              </Typography>
              
              {renderFamilyCard(selectedFamily, false)}
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
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
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setLinkingDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={confirmLinking}
            disabled={!linkType || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {loading ? 'جاري الربط...' : 'تأكيد الربط'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}