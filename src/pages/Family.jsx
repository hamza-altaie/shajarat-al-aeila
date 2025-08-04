// src/pages/Family.jsx - إصلاح Grid للإصدار الحالي
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, TextField, Button, Typography, Paper, Box, IconButton, 
  Card, CardContent, CardActions, Snackbar, Alert, CircularProgress, 
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, 
  Grid, Menu, MenuItem, Divider, Chip, InputAdornment, Fab
} from '@mui/material';

import {
  Delete as DeleteIcon, Edit as EditIcon, Settings as SettingsIcon,
  Logout as LogoutIcon, WhatsApp as WhatsAppIcon, PhoneIphone as PhoneIphoneIcon,
  Close as CloseIcon, GppGood as GppGoodIcon, Search as SearchIcon,
  Person as PersonIcon, Cake as CakeIcon, PhotoCamera as PhotoCameraIcon,
  Add as AddIcon, Visibility as VisibilityIcon, Group as GroupIcon,
  People as FamilyIcon
} from '@mui/icons-material';

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { loadFamily, saveFamilyMemberData, deleteFamilyMemberData, validateMemberData, calculateAge } from '../services/familyService.js';

import { useNavigate } from 'react-router-dom';

// نموذج البيانات الافتراضي
const DEFAULT_FORM = {
  firstName: '',
  fatherName: '',
  grandfatherName: '',
  surname: '',
  birthdate: '',
  relation: '',
  parentId: '',
  id: null,
  avatar: '',
  manualParentName: ''
};

// علاقات العائلة المتاحة
const FAMILY_RELATIONS = [
  // العائلة المباشرة
  { value: 'رب العائلة', label: '👨‍👩‍👧‍👦 رب العائلة' },
  { value: 'زوجة', label: '👩 زوجة' },
  { value: 'ابن', label: '👦 ابن' },
  { value: 'بنت', label: '👧 بنت' },
  
  // الوالدين والأجداد
  { value: 'والد', label: '👨‍🦳 والد' },
  { value: 'والدة', label: '👵 والدة' },
  { value: 'جد', label: '👴 جد' },
  { value: 'جدة', label: '👵 جدة' },
  { value: 'جد الجد', label: '👴 جد الجد' },
  { value: 'جدة الجد', label: '👵 جدة الجد' },
  
  // الإخوة والأخوات
  { value: 'أخ', label: '👨 أخ' },
  { value: 'أخت', label: '👩 أخت' },
  { value: 'أخ غير شقيق', label: '👨 أخ غير شقيق' },
  { value: 'أخت غير شقيقة', label: '👩 أخت غير شقيقة' },
  
  // الأعمام والعمات
  { value: 'عم', label: '👨‍🦰 عم' },
  { value: 'عمة', label: '👩‍🦰 عمة' },
  { value: 'ابن عم', label: '👨 ابن عم' },
  { value: 'بنت عم', label: '👩 بنت عم' },
  
  // الأخوال والخالات
  { value: 'خال', label: '👨‍🦲 خال' },
  { value: 'خالة', label: '👩‍🦲 خالة' },
  { value: 'ابن خال', label: '👨 ابن خال' },
  { value: 'بنت خال', label: '👩 بنت خال' },
  
  // أطفال الإخوة والأخوات
  { value: 'ابن أخ', label: '👦 ابن أخ' },
  { value: 'بنت أخ', label: '👧 بنت أخ' },
  { value: 'ابن أخت', label: '👦 ابن أخت' },
  { value: 'بنت أخت', label: '👧 بنت أخت' },
  
  // الأحفاد
  { value: 'حفيد', label: '👦 حفيد' },
  { value: 'حفيدة', label: '👧 حفيدة' },
  { value: 'حفيد الحفيد', label: '👶 حفيد الحفيد' },
  { value: 'حفيدة الحفيد', label: '👶 حفيدة الحفيد' },
  
  // علاقات الزواج
  { value: 'زوج الابنة', label: '👨 زوج الابنة' },
  { value: 'زوجة الابن', label: '👩 زوجة الابن' },
  { value: 'صهر', label: '👨 صهر' },
  { value: 'كنة', label: '👩 كنة' },
  
  // أهل الزوجة/الزوج
  { value: 'حمو', label: '👨‍🦳 حمو (والد الزوج)' },
  { value: 'حماة', label: '👵 حماة (والدة الزوج)' },
  { value: 'أخو الزوج', label: '👨 أخو الزوج' },
  { value: 'أخت الزوج', label: '👩 أخت الزوج' },
  
  // علاقات أخرى
  { value: 'زوجة ثانية', label: '👩 زوجة ثانية' },
  { value: 'زوجة ثالثة', label: '👩 زوجة ثالثة' },
  { value: 'زوجة رابعة', label: '👩 زوجة رابعة' },
  
  // قرابة بعيدة
  { value: 'ابن عم الوالد', label: '👨 ابن عم الوالد' },
  { value: 'بنت عم الوالد', label: '👩 بنت عم الوالد' }
];

export default function Family() {
  // الحالات الأساسية
  const [form, setForm] = useState(DEFAULT_FORM);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false); // حالة إظهار/إخفاء نموذج إضافة العضو
  
  // حالات النوافذ المنبثقة
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState(null);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  
  // حالات الإشعارات والصور
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadSuccess, setAvatarUploadSuccess] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const navigate = useNavigate();
  const uid = localStorage.getItem('verifiedUid');
  const phone = localStorage.getItem('verifiedPhone');

  // دالة عرض الإشعارات
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // دالة حذف الصورة القديمة
  const deleteOldAvatar = async (oldAvatarUrl) => {
    if (!oldAvatarUrl?.includes('firebase')) return true;
    
    try {
      const url = new URL(oldAvatarUrl);
      const pathSegments = url.pathname.split('/');
      const encodedPath = pathSegments[pathSegments.length - 1];
      const filePath = decodeURIComponent(encodedPath.split('?')[0]);
      
      const oldAvatarRef = ref(storage, filePath);
      await deleteObject(oldAvatarRef);
      return true;
    } catch (error) {
      console.error('خطأ في حذف الصورة القديمة:', error);
      return false;
    }
  };

  // دالة تنسيق التاريخ الميلادي
  const formatGregorianDate = (birthdate) => {
    if (!birthdate) return '';
    
    try {
      const date = new Date(birthdate);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      });
    } catch {
      return birthdate; // Removed unused 'error' variable
    }
  };

  // تحميل بيانات العائلة
  const loadFamilyData = useCallback(async () => {
    if (!uid) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const familyData = await loadFamily(uid);
      setMembers(familyData);
      
    } catch (error) {
      console.error('خطأ في تحميل بيانات العائلة:', error);
      showSnackbar('حدث خطأ أثناء تحميل بيانات العائلة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, navigate, showSnackbar]);

  // التحقق من صحة البيانات
  const validateForm = () => {
    const validationResult = validateMemberData(form);
    return validationResult.errors;
  };

  // معالجة تغيير قيم النموذج
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // معالجة رفع الصورة
  const handleAvatarUpload = async (file) => {
    if (!file) return null;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showSnackbar('نوع الملف غير مدعوم. استخدم JPEG, PNG, أو WebP', 'error');
      return null;
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showSnackbar('حجم الصورة كبير جداً. الحد الأقصى 5MB', 'error');
      return null;
    }

    setAvatarUploading(true);
    
    try {
      if (!storage) throw new Error('Firebase Storage غير مُهيأ');
      
      const oldAvatarUrl = form.avatar;
      if (oldAvatarUrl?.trim()) {
        await deleteOldAvatar(oldAvatarUrl);
      }
      
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `avatars/${uid}/${timestamp}_${cleanFileName}`;
      
      const avatarRef = ref(storage, fileName);
      const snapshot = await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setForm(prev => ({ ...prev, avatar: downloadURL }));
      setAvatarUploadSuccess(true); // ✅ تعيين حالة النجاح
      
      if (form.id) {
        // تحديث الصورة فقط للعضو الموجود
        await saveFamilyMemberData(uid, {
          id: form.id,
          ...form,
          avatar: downloadURL
        });
        
        await loadFamilyData();
      }
      
      showSnackbar('تم رفع الصورة بنجاح', 'success');
      return downloadURL;
      
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      showSnackbar('فشل رفع الصورة', 'error');
      return null;
    } finally {
      setAvatarUploading(false);
    }
  };

  // معالجة إرسال النموذج
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showSnackbar('يرجى تصحيح الأخطاء أولاً', 'error');
      return false;
    }

    setLoading(true);

    try {
      let linkedParentUid = null;
      if (form.parentId && form.parentId !== 'manual') {
        const parentMember = members.find(m => m.id === form.parentId);
        linkedParentUid = parentMember ? uid : null;
      }

      const memberData = {
        id: form.id || undefined,
        firstName: form.firstName || '',
        fatherName: form.fatherName || '',
        grandfatherName: form.grandfatherName || '',
        surname: form.surname || '',
        birthdate: form.birthdate || '',
        relation: form.relation || '',
        parentId: form.parentId || '',
        avatar: form.avatar || '',
        manualParentName: form.manualParentName || '',
        linkedParentUid
      };

      await saveFamilyMemberData(uid, memberData);
      
      if (form.id) {
        showSnackbar('تم تحديث بيانات العضو بنجاح');
      } else {
        showSnackbar('تم إضافة العضو بنجاح');
      }

      await loadFamilyData();
      setForm(DEFAULT_FORM);
      setAvatarUploadSuccess(false); // ✅ إعادة تعيين حالة رفع الصورة
      setShowAddForm(false); // ✅ إخفاء النموذج بعد الإضافة
      return true;
    } catch (error) {
      console.error('خطأ في حفظ البيانات:', error);
      showSnackbar('حدث خطأ أثناء حفظ البيانات', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // معالجة تعديل العضو
  const handleEdit = (member) => {
    setForm({ ...member });
    setAvatarUploadSuccess(false); // ✅ إعادة تعيين حالة رفع الصورة
    setEditModalOpen(true);
  };

  // معالجة حذف العضو
  const handleDeleteConfirmation = (id) => {
    if (!id) {
      showSnackbar('معرف العضو غير موجود', 'error');
      return;
    }
    setDeleteMemberId(id);
    setDeleteDialogOpen(true);
  };

  // تأكيد الحذف
  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    
    if (!deleteMemberId) {
      showSnackbar('لم يتم تحديد العضو المراد حذفه', 'error');
      return;
    }

    const memberToDelete = members.find(m => m.id === deleteMemberId);

    setLoading(true);
    try {
      if (memberToDelete?.avatar) {
        await deleteOldAvatar(memberToDelete.avatar);
      }
      
      await deleteFamilyMemberData(uid, deleteMemberId);
      await loadFamilyData();
      showSnackbar('تم حذف العضو بنجاح');
    } catch (error) {
      console.error('خطأ في الحذف:', error);
      showSnackbar('حدث خطأ أثناء حذف العضو', 'error');
    } finally {
      setLoading(false);
      setDeleteMemberId(null);
    }
  };

  // معالجة قائمة الإعدادات
  const handleSettingsClick = (event) => setSettingsAnchor(event.currentTarget);
  const handleSettingsClose = () => setSettingsAnchor(null);

  // تغيير رقم الهاتف
  const handlePhoneChange = async () => {
    if (!newPhone.trim()) {
      showSnackbar('يرجى إدخال رقم الهاتف', 'error');
      return;
    }

    const cleanPhone = newPhone.replace(/[\s\-()]/g, ''); // Fixed unnecessary escape characters
    const phoneRegex = /^07[0-9]{8,9}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      showSnackbar('رقم الهاتف غير صحيح. يجب أن يبدأ بـ 07', 'error');
      return;
    }

    const fullPhone = `+964${cleanPhone.substring(1)}`;

    try {
      localStorage.setItem('verifiedPhone', fullPhone);
      setPhoneModalOpen(false);
      setNewPhone('');
      showSnackbar('تم تحديث رقم الهاتف بنجاح');
      window.location.reload();
    } catch (error) {
      console.error('خطأ في تحديث رقم الهاتف:', error);
      showSnackbar('حدث خطأ أثناء تحديث رقم الهاتف', 'error');
    }
  };

  // تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('verifiedUid');
    localStorage.removeItem('verifiedPhone');
    navigate('/login');
  };

  // تحديث البحث والتصفية مع الترتيب
  useEffect(() => {
    let filtered;

    if (!search.trim()) {
      filtered = members;
    } else {
      filtered = members.filter(member => {
        const fullName = `${member.firstName} ${member.fatherName}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
      });
    }

    // ✅ ترتيب الأعضاء حسب الأهمية والعلاقة
    const relationPriority = {
      'رب العائلة': 1,
      'زوجة': 2, 'زوجة ثانية': 2, 'زوجة ثالثة': 2, 'زوجة رابعة': 2,
      'والد': 3, 'والدة': 3,
      'جد': 4, 'جدة': 4, 'جد الجد': 4, 'جدة الجد': 4,
      'ابن': 5, 'بنت': 5,
      'أخ': 6, 'أخت': 6, 'أخ غير شقيق': 6, 'أخت غير شقيقة': 6,
      'عم': 7, 'عمة': 7, 'ابن عم': 7, 'بنت عم': 7,
      'خال': 8, 'خالة': 8, 'ابن خال': 8, 'بنت خال': 8,
      'حفيد': 9, 'حفيدة': 9, 'حفيد الحفيد': 9, 'حفيدة الحفيد': 9,
      'ابن أخ': 10, 'بنت أخ': 10, 'ابن أخت': 10, 'بنت أخت': 10,
      'زوج الابنة': 11, 'زوجة الابن': 11, 'صهر': 11, 'كنة': 11,
      'حمو': 12, 'حماة': 12, 'أخو الزوج': 12, 'أخت الزوج': 12,
      'ابن عم الوالد': 13, 'بنت عم الوالد': 13
    };
    
    const sortedMembers = filtered.sort((a, b) => {
      // 1. ترتيب حسب أولوية العلاقة
      const priorityA = relationPriority[a.relation] || 99;
      const priorityB = relationPriority[b.relation] || 99;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 2. إذا كانت نفس العلاقة، ترتيب حسب العمر (الأكبر أولاً)
      if (a.relation === b.relation && (a.relation === 'ابن' || a.relation === 'بنت')) {
        return b.age - a.age;
      }

      // 3. إذا كان نفس النوع من العلاقة ولها نفس الأولوية، ترتيب أبجدي
      const nameA = `${a.firstName} ${a.fatherName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.fatherName}`.toLowerCase();
      return nameA.localeCompare(nameB, 'ar');
    });

    setFilteredMembers(sortedMembers);
  }, [search, members]);

  // تحميل البيانات عند بداية المكون
  useEffect(() => {
    if (uid) {
      loadFamilyData();
    } else {
      navigate('/login');
    }
  }, [uid, loadFamilyData, navigate]);

  // عرض النموذج
  const renderForm = () => (
    <Box>
      {/* شريط رفع الصورة */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 3, 
          borderRadius: 3, 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          border: '1px solid #e3f2fd'
        }}
      >
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" gap={2}>
          <Box
            sx={{
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
              borderRadius: '50%',
              bgcolor: '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #2196f3',
              overflow: 'hidden'
            }}
          >
            {form.avatar?.trim() ? (
              <img 
                src={form.avatar} 
                alt="صورة العضو" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => e.target.style.display = 'none'}
              />
            ) : (
              <PersonIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: '#2196f3' }} />
            )}
          </Box>
          
          <Box flex={1} textAlign={{ xs: 'center', sm: 'left' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={avatarUploading ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
              disabled={avatarUploading}
              sx={{ 
                borderRadius: 2,
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
                minWidth: { xs: 120, sm: 140 },
                '& .MuiButton-startIcon': {
                  marginLeft: { xs: '8px', sm: '12px' },
                  marginRight: '0px',
                  '& > svg': {
                    fontSize: { xs: '18px', sm: '20px' }
                  }
                }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {avatarUploading ? 'جاري الرفع...' : 'اختر صورة'}
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                {avatarUploading ? 'رفع...' : 'صورة'}
              </Box>
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    await handleAvatarUpload(file);
                  }
                }}
              />
            </Button>
            {avatarUploadSuccess && !avatarUploading && (
              <Typography variant="caption" color="success.main" display="block" sx={{ mt: 1 }}>
                ✅ تم رفع الصورة بنجاح
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* حقول النموذج */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          بيانات العضو
        </Typography>
        
        <Box display="flex" flexDirection="column" gap={3}>
          {/* ✅ استخدام Grid التقليدي الآمن */}
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                md: 'repeat(4, 1fr)' 
              }, 
              gap: 2,
              mb: 3
            }}
          >
            <TextField
              label="الاسم الأول"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              fullWidth
              size="medium"
              error={!!fieldErrors.firstName}
              helperText={fieldErrors.firstName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color={fieldErrors.firstName ? 'error' : 'action'} />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              label="اسم الأب"
              name="fatherName"
              value={form.fatherName}
              onChange={handleChange}
              fullWidth
              size="medium"
              error={!!fieldErrors.fatherName}
              helperText={fieldErrors.fatherName}
            />
            
            <TextField
              label="اسم الجد"
              name="grandfatherName"
              value={form.grandfatherName}
              onChange={handleChange}
              fullWidth
              size="medium"
              error={!!fieldErrors.grandfatherName}
              helperText={fieldErrors.grandfatherName}
            />
            
            <TextField
              label="اللقب"
              name="surname"
              value={form.surname}
              onChange={handleChange}
              fullWidth
              size="medium"
              error={!!fieldErrors.surname}
              helperText={fieldErrors.surname}
            />
          </Box>

          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)' 
              }, 
              gap: 2,
              mb: 3
            }}
          >
            <TextField
              type="date"
              label="تاريخ الميلاد"
              name="birthdate"
              value={form.birthdate}
              onChange={handleChange}
              fullWidth
              size="medium"
              InputLabelProps={{ shrink: true }}
              error={!!fieldErrors.birthdate}
              helperText={fieldErrors.birthdate}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CakeIcon color={fieldErrors.birthdate ? 'error' : 'action'} />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              select
              label="القرابة"
              name="relation"
              value={form.relation}
              onChange={handleChange}
              fullWidth
              size="medium"
              SelectProps={{ native: true }}
              error={!!fieldErrors.relation}
              helperText={fieldErrors.relation || " "}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiFormHelperText-root': {
                  minHeight: '20px'
                },
                '& .MuiSelect-select': {
                  textAlign: 'right'
                }
              }}
            >
              <option value="">اختر القرابة</option>
              {FAMILY_RELATIONS.map((relation) => (
                <option key={relation.value} value={relation.value}>
                  {relation.label}
                </option>
              ))}
            </TextField>
          </Box>
        </Box>
      </Paper>

      {/* أزرار الحفظ */}
      <Box mt={4} display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
        <Button
          variant="contained"
          type="submit"
          disabled={loading}
          sx={{ 
            flex: 1,
            py: 1.8,
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 2
          }}
        >
          {loading ? (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={20} color="inherit" />
              جاري الحفظ...
            </Box>
          ) : (
            <>
              <AddIcon sx={{ mr: 1 }} />
              {form.id ? 'تحديث العضو' : 'إضافة العضو'}
            </>
          )}
        </Button>
        
        {form.id && (
          <Button
            variant="outlined"
            onClick={() => {
              setForm(DEFAULT_FORM);
              setAvatarUploadSuccess(false); // ✅ إعادة تعيين حالة رفع الصورة
            }}
            disabled={loading}
            sx={{ borderRadius: 2, minWidth: { xs: '100%', sm: 'auto' } }}
          >
            إلغاء التعديل
          </Button>
        )}
      </Box>
    </Box>
  );

  // عرض كارت العضو
  const renderMemberCard = (member) => (
    <Card 
      key={member.id}
      elevation={3}
      sx={{ 
        height: '100%', 
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        }
      }}
    >
        <CardContent sx={{ textAlign: 'center', p: { xs: 2, sm: 3 } }}>
          {/* صورة العضو */}
          <Box
            sx={{
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
              borderRadius: '50%',
              bgcolor: '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              border: '3px solid #2196f3',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {member.avatar?.trim() ? (
              <img 
                src={member.avatar} 
                alt={member.firstName} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <Box
              sx={{
                position: member.avatar?.trim() ? 'absolute' : 'static',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: member.avatar?.trim() ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PersonIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: '#2196f3' }} />
            </Box>
          </Box>

          {/* اسم العضو */}
          <Typography variant="h6" fontWeight="bold" gutterBottom fontSize={{ xs: '1.1rem', sm: '1.25rem' }}sx={{ color: '#1976d2' }}>
            {`${member.firstName} ${member.fatherName} ${member.surname}`}
          </Typography>
          
          {/* القرابة */}
          <Chip 
            label={member.relation} 
            color="primary" 
            size="small" 
            sx={{ mb: 2, borderRadius: 2 }}
          />

          {/* العمر والتاريخ */}
          {member.birthdate && (
            <Box sx={{ mt: 1 }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 1,
                  mb: 1
                }}
              >
                <CakeIcon fontSize="small" />
                {calculateAge(member.birthdate)}
              </Typography>
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                ولد في: {formatGregorianDate(member.birthdate)}
              </Typography>
            </Box>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
          <IconButton
            color="primary"
            onClick={() => handleEdit(member)}
            sx={{ mx: 1 }}
          >
            <EditIcon />
          </IconButton>
          
          <IconButton
            color="error"
            onClick={() => handleDeleteConfirmation(member.id)}
            sx={{ mx: 1 }}
          >
            <DeleteIcon />
          </IconButton>
        </CardActions>
      </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* الهيدر */}
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={4} gap={2}>
        <Box textAlign={{ xs: 'center', sm: 'left' }}>
          <Typography 
            variant="h3" 
            fontWeight="bold" 
            gutterBottom 
            fontSize={{ xs: '2rem', sm: '3rem' }}
            sx={{ color: '#1976d2' }}  // أو أي لون تريده
          >
            🏠 إدارة العائلة
          </Typography>
          <Typography variant="h6" color="text.secondary">
            أضف وأدر أفراد عائلتك
          </Typography>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="contained"
            color="success"
            startIcon={<VisibilityIcon />}
            onClick={() => navigate('/tree')}
            sx={{ 
              borderRadius: 2,
              px: { xs: 2, sm: 3 },
              py: { xs: 1, sm: 1.5 },
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 600,
              minWidth: { xs: 100, sm: 140 },
              '& .MuiButton-startIcon': {
                marginLeft: { xs: '4px', sm: '8px' },
                marginRight: '0px',
                '& > svg': {
                  fontSize: { xs: '18px', sm: '20px' }
                }
              }
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              عرض الشجرة
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              الشجرة
            </Box>
          </Button>
          
          <IconButton onClick={handleSettingsClick}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* إحصائيات سريعة */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(3, 1fr)' 
          }, 
          gap: 3,
          mb: 4
        }}
      >
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
          <FamilyIcon sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
          <Typography variant="h4" fontWeight="bold" color="primary">
            {members.length}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إجمالي الأفراد
          </Typography>
        </Paper>
        
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
          <GppGoodIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
          <Typography variant="h4" fontWeight="bold" color="success.main">
            {members.filter(m => m.relation === 'رب العائلة').length}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            أرباب العائلات
          </Typography>
        </Paper>
        
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
          <GroupIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
          <Typography variant="h4" fontWeight="bold" color="warning.main">
            {members.filter(m => m.relation === 'ابن' || m.relation === 'بنت').length}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            الأطفال
          </Typography>
        </Paper>
      </Box>

      {/* قسم إضافة عضو جديد */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, mb: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          إضافة عضو جديد
        </Typography>
        {!showAddForm && (
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => setShowAddForm(true)}
            sx={{ fontWeight: 'bold', fontSize: 18, px: 4, py: 2 }}
            fullWidth
          >
            إضافة العضو
          </Button>
        )}
        {showAddForm && (
          <Box component="form" onSubmit={handleSubmit}>
            {renderForm()}
          </Box>
        )}
      </Paper>

      {/* قسم قائمة الأفراد */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} gap={2}>
          <Typography variant="h5" fontWeight="bold">
            قائمة أفراد العائلة ({filteredMembers.length})
          </Typography>
          
          <TextField
            size="small"
            placeholder="البحث في الأفراد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: '100%', sm: 250 } }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                lg: 'repeat(3, 1fr)' 
              }, 
              gap: 3 
            }}
          >
            {filteredMembers.length > 0 ? (
              filteredMembers.map(renderMemberCard)
            ) : (
              <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
                <PersonIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  {search ? 'لا توجد نتائج للبحث' : 'لم يتم إضافة أي أفراد بعد'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {search ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإضافة أول فرد في العائلة'}
                </Typography>
                {!search && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setForm(DEFAULT_FORM);
                      setAvatarUploadSuccess(false); // ✅ إعادة تعيين حالة رفع الصورة
                      document.querySelector('input[name="firstName"]')?.focus();
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    إضافة أول فرد
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* زر عائم */}
      <Fab
        color="primary"
        aria-label="إضافة"
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 1000,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => {
          setForm(DEFAULT_FORM);
          setAvatarUploadSuccess(false); // ✅ إعادة تعيين حالة رفع الصورة
          document.querySelector('input[name="firstName"]')?.focus();
        }}
      >
        <AddIcon />
      </Fab>

      {/* نافذة التعديل */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">
              تعديل بيانات العضو
            </Typography>
            <IconButton onClick={() => setEditModalOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={async (e) => {
            e.preventDefault();
            const success = await handleSubmit(e);
            if (success) setEditModalOpen(false);
          }} sx={{ mt: 2 }}>
            {renderForm()}
          </Box>
        </DialogContent>
      </Dialog>

      {/* نافذة تغيير رقم الهاتف */}
      <Dialog
        open={phoneModalOpen}
        onClose={() => {
          setPhoneModalOpen(false);
          setNewPhone('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <PhoneIphoneIcon sx={{ color: '#2196f3' }} />
            <Typography variant="h6" fontWeight="bold">
              تغيير رقم الهاتف
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            أدخل رقم الهاتف الجديد (مثال: 07xxxxxxxx)
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', direction: 'ltr' }}>
            <TextField
              label="كود الدولة"
              value="+964"
              disabled
              sx={{ 
                width: 100,
                order: 1,
                '& .MuiInputBase-input': {
                  textAlign: 'center',
                  fontWeight: 'bold'
                }
              }}
            />
            
            <TextField
              autoFocus
              label="رقم الهاتف"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              fullWidth
              placeholder="7xxxxxxxx"
              inputProps={{
                maxLength: 11,
                style: { direction: 'ltr', textAlign: 'left' }
              }}
              helperText="مثال: 7701234567 أو 07701234567"
              sx={{ 
                order: 2,
                '& .MuiInputBase-input': {
                  direction: 'ltr',
                  textAlign: 'left'
                }
              }}
            />
          </Box>
          <Box 
            sx={{ 
              p: 2, 
              mt: 2,
              backgroundColor: '#e3f2fd', 
              borderRadius: 2,
              border: '1px solid #bbdefb'
            }}
          >
            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
              📱 الرقم الحالي: {phone || 'غير محدد'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2 }}>
          <Button 
            onClick={handlePhoneChange}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            تحديث الرقم
          </Button>
          <Button 
            onClick={() => {
              setPhoneModalOpen(false);
              setNewPhone('');
            }}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            إلغاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة حذف العضو */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف هذا العضو؟ لا يمكن التراجع عن هذا الإجراء.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            إلغاء
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* قائمة الإعدادات */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
      >
        <MenuItem onClick={() => {
          const message = `أنضم إلينا في شجرة العائلة! يمكنك الآن إدارة وعرض شجرة عائلتك بسهولة. الرابط: ${window.location.origin}`;
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
          handleSettingsClose();
        }}>
          <WhatsAppIcon sx={{ mr: 1, color: '#25d366' }} />
          مشاركة عبر واتساب
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          const currentPhone = phone || '';
          const localPhone = currentPhone.startsWith('+964') ? 
            '0' + currentPhone.substring(4) : currentPhone;
          setNewPhone(localPhone);
          setPhoneModalOpen(true);
          handleSettingsClose();
        }}>
          <PhoneIphoneIcon sx={{ mr: 1 }} />
          تغيير رقم الهاتف
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleLogout(); handleSettingsClose(); }}>
          <LogoutIcon sx={{ mr: 1 }} />
          تسجيل الخروج
        </MenuItem>
      </Menu>

      {/* إشعارات */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
