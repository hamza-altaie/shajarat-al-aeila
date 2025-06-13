// src/pages/Family.jsx - الكود الكامل النهائي مع إصلاح شامل للصور
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

// استيرادات Firebase
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';

import { useNavigate } from 'react-router-dom';
import { validateName, validateBirthdate, validatePhone } from '../hooks/usePhoneAuth';

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
  { value: 'رب العائلة', label: '👨‍👩‍👧‍👦 رب العائلة', icon: '👨‍👩‍👧‍👦' },
  { value: 'ابن', label: '👦 ابن', icon: '👦' },
  { value: 'بنت', label: '👧 بنت', icon: '👧' }
];

export default function Family() {
  // حالات النموذج والبيانات
  const [form, setForm] = useState(DEFAULT_FORM);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  
  // حالات البحث والتصفية
  const [search, setSearch] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  
  // حالات النوافذ المنبثقة
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState(null);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  
  // حالات الصور والتحديث
  const [avatarUploading, setAvatarUploading] = useState(false);
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

  // دالة حذف الصورة القديمة من Firebase Storage
  const deleteOldAvatar = async (oldAvatarUrl) => {
    if (!oldAvatarUrl || !oldAvatarUrl.includes('firebase')) {
      return true;
    }
    
    try {
      const url = new URL(oldAvatarUrl);
      const pathSegments = url.pathname.split('/');
      const encodedPath = pathSegments[pathSegments.length - 1];
      const filePath = decodeURIComponent(encodedPath.split('?')[0]);
      
      console.log('🗑️ حذف الصورة القديمة:', filePath);
      
      const oldAvatarRef = ref(storage, filePath);
      await deleteObject(oldAvatarRef);
      
      console.log('✅ تم حذف الصورة القديمة بنجاح');
      return true;
    } catch (error) {
      console.error('❌ خطأ في حذف الصورة القديمة:', error);
      return false;
    }
  };

  // دالة حساب العمر بالتاريخ الميلادي
  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    
    try {
      const birth = new Date(birthdate);
      const today = new Date();
      
      if (isNaN(birth.getTime())) return '';
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      if (age === 0) {
        const monthsDiff = today.getMonth() - birth.getMonth() + 
                         (12 * (today.getFullYear() - birth.getFullYear()));
        
        if (monthsDiff < 1) {
          const daysDiff = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
          return `${daysDiff} يوم`;
        } else {
          return `${monthsDiff} شهر`;
        }
      }
      
      return `${age} سنة`;
    } catch (error) {
      console.error('خطأ في حساب العمر:', error);
      return '';
    }
  };

  // دالة تنسيق التاريخ الميلادي
  const formatGregorianDate = (birthdate) => {
    if (!birthdate) return '';
    
    try {
      const date = new Date(birthdate);
      if (isNaN(date.getTime())) return '';
      
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        calendar: 'gregory'
      };
      
      return date.toLocaleDateString('ar-SA', options);
    } catch (error) {
      console.error('خطأ في تنسيق التاريخ:', error);
      return birthdate;
    }
  };

  // تحميل بيانات العائلة مع تشخيص مُحسن للصور
  const loadFamily = useCallback(async () => {
    if (!uid) {
      console.warn('⚠️ UID غير موجود، إعادة توجيه للتسجيل');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      console.log('📥 تحميل بيانات العائلة للمستخدم:', uid);
      
      const familyCollection = collection(db, 'users', uid, 'family');
      const snapshot = await getDocs(familyCollection);
      
      console.log('📊 عدد المستندات المُحملة:', snapshot.docs.length);
      
      const familyData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 بيانات خام من قاعدة البيانات:', data);
        
        const member = {
          id: doc.id || data.id,
          firstName: data.firstName || '',
          fatherName: data.fatherName || '',
          grandfatherName: data.grandfatherName || '',
          surname: data.surname || '',
          relation: data.relation || '',
          birthdate: data.birthdate || '',
          avatar: data.avatar || '', // 🔥 التأكد من تحميل رابط الصورة
          parentId: data.parentId || '',
          manualParentName: data.manualParentName || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || ''
        };
        
        console.log('👤 عضو مُعالج:', {
          name: member.firstName,
          avatar: member.avatar,
          hasAvatar: !!member.avatar && member.avatar.trim() !== ''
        });
        
        return member;
      }).filter(member => member.id && member.firstName);

      console.log('📊 جميع البيانات المُحملة:', familyData);
      console.log('🖼️ تفاصيل الصور:');
      familyData.forEach(member => {
        console.log(`  - ${member.firstName}: ${member.avatar ? '✅ يحتوي على صورة' : '❌ لا يحتوي على صورة'}`);
        if (member.avatar) {
          console.log(`    الرابط: ${member.avatar}`);
        }
      });

      setMembers(familyData);
      console.log('✅ تم تحميل بيانات العائلة:', familyData.length, 'فرد');
      
      // فحص إضافي للصور
      const membersWithAvatars = familyData.filter(m => m.avatar && m.avatar.trim() !== '');
      console.log(`🖼️ الأعضاء الذين لديهم صور: ${membersWithAvatars.length} من ${familyData.length}`);
      
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات العائلة:', error);
      
      if (error.code === 'permission-denied') {
        showSnackbar('ليس لديك صلاحية للوصول إلى هذه البيانات', 'error');
        navigate('/login');
      } else if (error.code === 'unavailable') {
        showSnackbar('الخدمة غير متاحة حالياً، يرجى المحاولة لاحقاً', 'error');
      } else {
        showSnackbar('حدث خطأ أثناء تحميل بيانات العائلة', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [uid, navigate, showSnackbar]);

  // التحقق من صحة البيانات
  const validateForm = () => {
    const errors = {};
    
    if (!validateName(form.firstName)) {
      errors.firstName = '❌ أدخل الاسم الأول (2-40 حرف، عربي أو إنجليزي)';
    }
    
    if (!validateName(form.fatherName)) {
      errors.fatherName = '❌ أدخل اسم الأب (2-40 حرف، عربي أو إنجليزي)';
    }
    
    if (!validateName(form.grandfatherName)) {
      errors.grandfatherName = '❌ أدخل اسم الجد (2-40 حرف، عربي أو إنجليزي)';
    }
    
    if (!validateName(form.surname)) {
      errors.surname = '❌ أدخل اللقب (2-40 حرف، عربي أو إنجليزي)';
    }
    
    if (!validateBirthdate(form.birthdate)) {
      errors.birthdate = '❌ أدخل تاريخ ميلاد صحيح وليس في المستقبل';
    }
    
    if (!form.relation) {
      errors.relation = '❌ اختر القرابة';
    }
    
    if (form.id && form.parentId === form.id) {
      errors.parentId = '❌ لا يمكن للفرد أن يكون أبًا لنفسه';
    }
    
    return errors;
  };

  // معالجة تغيير قيم النموذج
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // إزالة رسالة الخطأ عند التصحيح
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // معالجة رفع الصورة مع حفظ فوري مُحسن
  const handleAvatarUpload = async (file) => {
    if (!file) {
      console.warn('⚠️ لم يتم اختيار ملف');
      return null;
    }
    
    console.log('📤 بدء رفع الصورة:', file.name, 'حجم:', file.size);
    
    // التحقق من نوع الملف
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.error('❌ نوع ملف غير مدعوم:', file.type);
      showSnackbar('❌ نوع الملف غير مدعوم. استخدم JPEG, PNG, أو WebP', 'error');
      return null;
    }
    
    // التحقق من حجم الملف (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('❌ حجم الملف كبير:', file.size);
      showSnackbar('❌ حجم الصورة كبير جداً. الحد الأقصى 5MB', 'error');
      return null;
    }

    setAvatarUploading(true);
    
    try {
      // التحقق من وجود storage
      if (!storage) {
        throw new Error('Firebase Storage غير مُهيأ');
      }
      
      // 🗑️ حذف الصورة القديمة أولاً إذا كانت موجودة
      const oldAvatarUrl = form.avatar;
      if (oldAvatarUrl && oldAvatarUrl.trim() !== '') {
        console.log('🗑️ حذف الصورة القديمة أولاً...');
        await deleteOldAvatar(oldAvatarUrl);
      }
      
      // إنشاء اسم ملف فريد
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `avatars/${uid}/${timestamp}_${cleanFileName}`;
      
      console.log('📁 إنشاء مرجع للملف:', fileName);
      
      // إنشاء مرجع للملف
      const avatarRef = ref(storage, fileName);
      
      console.log('⬆️ رفع الملف...');
      
      // رفع الملف
      const snapshot = await uploadBytes(avatarRef, file);
      console.log('✅ تم رفع الملف بنجاح:', snapshot.metadata.fullPath);
      
      // الحصول على رابط التحميل
      console.log('🔗 الحصول على رابط التحميل...');
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ تم الحصول على الرابط:', downloadURL);
      
      // 🔥 تحديث الحالة فوراً لعرض الصورة
      setForm(prev => {
        const updatedForm = { ...prev, avatar: downloadURL };
        console.log('🖼️ تم تحديث النموذج بالصورة:', updatedForm);
        console.log('🔗 الرابط المُخزن في النموذج:', downloadURL);
        return updatedForm;
      });
      
      // 🔥 حفظ الصورة فوراً في قاعدة البيانات إذا كان العضو موجود
      if (form.id) {
        console.log('💾 حفظ رابط الصورة فوراً للعضو الموجود:', form.id);
        try {
          await setDoc(doc(db, 'users', uid, 'family', form.id), {
            avatar: downloadURL,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log('✅ تم حفظ رابط الصورة بنجاح');
          
          // إعادة تحميل البيانات لإظهار الصورة فوراً
          await loadFamily();
        } catch (saveError) {
          console.error('❌ خطأ في حفظ رابط الصورة:', saveError);
        }
      }
      
      showSnackbar('✅ تم رفع الصورة بنجاح', 'success');
      
      return downloadURL;
      
    } catch (error) {
      console.error('❌ خطأ مفصل في رفع الصورة:', error);
      
      // معالجة أنواع مختلفة من الأخطاء
      let errorMessage = 'فشل رفع الصورة';
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'ليس لديك صلاحية لرفع الصور';
        console.error('❌ خطأ صلاحية:', error);
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'تم إلغاء رفع الصورة';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'خطأ غير معروف في الخادم';
      } else if (error.message.includes('network')) {
        errorMessage = 'مشكلة في الاتصال بالإنترنت';
      } else if (error.message.includes('Firebase Storage')) {
        errorMessage = 'مشكلة في إعدادات Firebase Storage';
      }
      
      showSnackbar(`❌ ${errorMessage}`, 'error');
      return null;
      
    } finally {
      setAvatarUploading(false);
    }
  };

  // معالجة إرسال النموذج مع حفظ الصورة المُحسن
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات
    const errors = validateForm();
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showSnackbar('❌ يرجى تصحيح الأخطاء أولاً', 'error');
      return false;
    }

    setLoading(true);
    setStatus('جاري الحفظ...');

    try {
      console.log('💾 حفظ بيانات العضو:', form);

      // تحديد الربط مع الأب
      let linkedParentUid = null;
      if (form.parentId && form.parentId !== 'manual') {
        const parentMember = members.find(m => m.id === form.parentId);
        linkedParentUid = parentMember ? uid : null;
      }

      // 🔥 التأكد من حفظ رابط الصورة بشكل صحيح
      const memberData = {
        firstName: form.firstName || '',
        fatherName: form.fatherName || '',
        grandfatherName: form.grandfatherName || '',
        surname: form.surname || '',
        birthdate: form.birthdate || '',
        relation: form.relation || '',
        parentId: form.parentId || '',
        avatar: form.avatar || '', // 🔥 هذا هو المهم!
        manualParentName: form.manualParentName || '',
        linkedParentUid,
        updatedAt: new Date().toISOString(),
      };

      console.log('📊 البيانات التي سيتم حفظها:', memberData);
      console.log('🖼️ رابط الصورة في البيانات:', memberData.avatar);
      console.log('🖼️ طول رابط الصورة:', memberData.avatar?.length);

      // حفظ أو تحديث العضو
      if (form.id) {
        console.log('🔄 تحديث عضو موجود:', form.id);
        await setDoc(doc(db, 'users', uid, 'family', form.id), memberData, { merge: true });
        showSnackbar('✅ تم تحديث بيانات العضو بنجاح');
      } else {
        console.log('➕ إضافة عضو جديد');
        const newDocRef = doc(collection(db, 'users', uid, 'family'));
        const newMemberData = { 
          ...memberData, 
          id: newDocRef.id,
          createdAt: new Date().toISOString()
        };
        console.log('📊 بيانات العضو الجديد:', newMemberData);
        await setDoc(newDocRef, newMemberData);
        showSnackbar('✅ تم إضافة العضو بنجاح');
      }

      // إعادة تحميل البيانات وإعادة تعيين النموذج
      console.log('🔄 إعادة تحميل قائمة الأعضاء...');
      await loadFamily();
      setForm(DEFAULT_FORM);
      setStatus('');
      
      return true;
    } catch (error) {
      console.error('❌ خطأ في حفظ البيانات:', error);
      const errorMsg = 'حدث خطأ أثناء حفظ البيانات';
      setStatus('❌ ' + errorMsg);
      showSnackbar(errorMsg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // تحديد رب العائلة
  const familyHead = members.find(m => m.relation === 'رب العائلة');
  const isFamilyHead = familyHead && phone === (familyHead.phone || phone);

  // معالجة تعديل العضو
  const handleEdit = (member) => {
    console.log('✏️ تعديل العضو:', member);
    setForm({ ...member });
    setEditModalOpen(true);
  };

  // معالجة حذف العضو
  const handleDeleteConfirmation = (id) => {
    if (!id) {
      console.warn('⚠️ لا يمكن حذف: id غير معروف');
      showSnackbar('خطأ: معرف العضو غير موجود', 'error');
      return;
    }
    setDeleteMemberId(id);
    setDeleteDialogOpen(true);
  };

  // تأكيد الحذف
  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    
    if (!deleteMemberId) {
      showSnackbar('خطأ: لم يتم تحديد العضو المراد حذفه', 'error');
      return;
    }

    // العثور على العضو المراد حذفه
    const memberToDelete = members.find(m => m.id === deleteMemberId);

    setLoading(true);
    try {
      // 🗑️ حذف صورة العضو إذا كانت موجودة
      if (memberToDelete?.avatar) {
        console.log('🗑️ حذف صورة العضو المحذوف...');
        await deleteOldAvatar(memberToDelete.avatar);
      }
      
      await deleteDoc(doc(db, 'users', uid, 'family', deleteMemberId));
      await loadFamily();
      showSnackbar('✅ تم حذف العضو بنجاح');
    } catch (error) {
      console.error('خطأ في الحذف:', error);
      showSnackbar('❌ حدث خطأ أثناء حذف العضو', 'error');
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
      showSnackbar('❌ يرجى إدخال رقم الهاتف', 'error');
      return;
    }

    // التحقق من صحة رقم الهاتف العراقي (فقط الأرقام بعد 07)
    const cleanPhone = newPhone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^07[0-9]{8,9}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      showSnackbar('❌ رقم الهاتف غير صحيح. يجب أن يبدأ بـ 07', 'error');
      return;
    }

    // تكوين الرقم الكامل
    const fullPhone = `+964${cleanPhone.substring(1)}`;

    try {
      localStorage.setItem('verifiedPhone', fullPhone);
      setPhoneModalOpen(false);
      setNewPhone('');
      showSnackbar('✅ تم تحديث رقم الهاتف بنجاح');
      // إعادة تحميل الصفحة لتظهر الرقم الجديد
      window.location.reload();
    } catch (error) {
      console.error('خطأ في تحديث رقم الهاتف:', error);
      showSnackbar('❌ حدث خطأ أثناء تحديث رقم الهاتف', 'error');
    }
  };

  // تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('verifiedUid');
    localStorage.removeItem('verifiedPhone');
    navigate('/login');
  };

  // تحديث البحث والتصفية
  useEffect(() => {
    if (!search.trim()) {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(member => {
        const fullName = `${member.firstName} ${member.fatherName} ${member.grandfatherName} ${member.surname}`.toLowerCase();
        const searchTerm = search.toLowerCase();
        return fullName.includes(searchTerm) || member.relation.toLowerCase().includes(searchTerm);
      });
      setFilteredMembers(filtered);
    }
  }, [search, members]);

  // تحميل البيانات عند بداية المكون
  useEffect(() => {
    if (uid) {
      loadFamily();
    } else {
      navigate('/login');
    }
  }, [uid, loadFamily, navigate]);

  // عرض النموذج
  const renderForm = () => (
    <Box>
      {/* شريط رفع الصورة */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 3, 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          border: '1px solid #e3f2fd'
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #2196f3',
              overflow: 'hidden'
            }}
          >
            {form.avatar && form.avatar.trim() !== '' ? (
              <img 
                src={form.avatar} 
                alt="صورة العضو" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  console.error('❌ فشل تحميل صورة النموذج:', form.avatar);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('✅ تم تحميل صورة النموذج بنجاح:', form.avatar);
                }}
              />
            ) : (
              <PersonIcon sx={{ fontSize: 40, color: '#2196f3' }} />
            )}
          </Box>
          
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              صورة العضو
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={avatarUploading ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
              disabled={avatarUploading}
              sx={{ borderRadius: 2 }}
            >
              {avatarUploading ? 'جاري الرفع...' : 'اختر صورة'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    console.log('📎 تم اختيار ملف:', file.name);
                    const avatarURL = await handleAvatarUpload(file);
                    if (avatarURL) {
                      console.log('🎉 تم رفع الصورة وتحديث النموذج');
                    }
                  }
                }}
              />
            </Button>
            {form.avatar && (
              <Typography variant="caption" color="success.main" display="block" sx={{ mt: 1 }}>
                ✅ تم رفع الصورة بنجاح
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* حقول النموذج */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          بيانات العضو
        </Typography>
        
        <Box 
          display="flex" 
          flexDirection="column" 
          gap={3}
        >
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Box flex="1" minWidth="300px">
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
            </Box>
            
            <Box flex="1" minWidth="300px">
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
            </Box>
            
            <Box flex="1" minWidth="300px">
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
            </Box>
            
            <Box flex="1" minWidth="300px">
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
            
            <Box flex="1" minWidth="300px">
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
            </Box>
            
            <Box flex="1" minWidth="300px">
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
                helperText={fieldErrors.relation}
              >
                <option value="">-- اختر القرابة --</option>
                {FAMILY_RELATIONS.map((relation) => (
                  <option key={relation.value} value={relation.value}>
                    {relation.label}
                  </option>
                ))}
              </TextField>
            </Box>
            
            <Box width="100%">
              <TextField
                select
                label="يتبع لـ"
                name="parentId"
                value={form.parentId}
                onChange={handleChange}
                fullWidth
                size="medium"
                SelectProps={{ native: true }}
                helperText="اختر الأب إذا لم يكن رب العائلة"
              >
                <option value="">-- لا يتبع لأحد (رب العائلة) --</option>
                {members
                  .filter(m => m.relation === 'رب العائلة' || m.relation === 'ابن')
                  .filter(m => m.id !== form.id)
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {`${m.firstName || ''} ${m.fatherName || ''} ${m.grandfatherName || ''} ${m.surname || ''}`} ({m.relation})
                    </option>
                  ))}
                <option value="manual">إضافة أب غير موجود في القائمة</option>
              </TextField>
            </Box>
            
            {form.parentId === 'manual' && (
              <Box width="100%">
                <TextField
                  label="اسم الأب الكامل"
                  name="manualParentName"
                  value={form.manualParentName || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, manualParentName: e.target.value }))}
                  fullWidth
                  size="medium"
                  placeholder="أدخل اسم الأب الكامل"
                />
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* أزرار الحفظ */}
      <Box mt={4} display="flex" gap={2}>
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
            onClick={() => setForm(DEFAULT_FORM)}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            إلغاء التعديل
          </Button>
        )}
      </Box>
    </Box>
  );

  // عرض كارت العضو مع عرض صور مُحسن
  const renderMemberCard = (member) => (
    <Grid item xs={12} sm={6} md={4} key={member.id}>
      <Card 
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
        <CardContent sx={{ textAlign: 'center', p: 3 }}>
          {/* صورة العضو المُحسنة */}
          <Box
            sx={{
              width: 80,
              height: 80,
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
            {member.avatar && member.avatar.trim() !== '' ? (
              <>
                {console.log('🖼️ محاولة عرض صورة العضو:', member.firstName, 'الرابط:', member.avatar)}
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
                    console.error('❌ فشل تحميل صورة العضو:', member.firstName);
                    console.error('❌ رابط الصورة المُستخدم:', member.avatar);
                    console.error('❌ تفاصيل الخطأ:', e);
                    // إخفاء الصورة وإظهار الأيقونة الافتراضية
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                  onLoad={() => {
                    console.log('✅ تم تحميل صورة العضو بنجاح:', member.firstName);
                    console.log('✅ رابط الصورة:', member.avatar);
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PersonIcon sx={{ fontSize: 40, color: '#2196f3' }} />
                </Box>
              </>
            ) : (
              <>
                {console.log('❓ لا توجد صورة للعضو:', member.firstName, 'البيانات:', member)}
                <PersonIcon sx={{ fontSize: 40, color: '#2196f3' }} />
              </>
            )}
          </Box>

          {/* اسم العضو */}
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {`${member.firstName} ${member.fatherName}`}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {`${member.grandfatherName} ${member.surname}`}
          </Typography>

          {/* القرابة */}
          <Chip 
            label={member.relation} 
            color="primary" 
            size="small" 
            sx={{ mb: 2, borderRadius: 2 }}
          />

          {/* العمر والتاريخ الميلادي */}
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
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* الهيدر */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            🏠 إدارة العائلة
          </Typography>
          <Typography variant="h6" color="text.secondary">
            أضف وأدر أفراد عائلتك
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <IconButton onClick={handleSettingsClick}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* إحصائيات سريعة */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <FamilyIcon sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold" color="primary">
              {members.length}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              إجمالي الأفراد
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <GppGoodIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {members.filter(m => m.relation === 'رب العائلة').length}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              أرباب العائلات
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <GroupIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {members.filter(m => m.relation === 'ابن' || m.relation === 'بنت').length}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              الأطفال
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* قسم إضافة عضو جديد */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          إضافة عضو جديد
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit}>
          {renderForm()}
        </Box>
        
        {status && (
          <Typography 
            variant="body1" 
            sx={{ 
              mt: 2, 
              p: 2, 
              backgroundColor: status.includes('❌') ? '#ffebee' : '#e8f5e8',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            {status}
          </Typography>
        )}
      </Paper>

      {/* قسم قائمة الأفراد */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold">
            قائمة أفراد العائلة ({filteredMembers.length})
          </Typography>
          
          {/* شريط البحث */}
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
            sx={{ minWidth: 250 }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredMembers.length > 0 ? (
              filteredMembers.map(renderMemberCard)
            ) : (
              <Grid item xs={12}>
                <Box textAlign="center" py={6}>
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
                        document.querySelector('input[name="firstName"]')?.focus();
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      إضافة أول فرد
                    </Button>
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        )}
      </Paper>

      {/* زر عائم لإضافة عضو سريع */}
      <Fab
        color="primary"
        aria-label="إضافة"
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 1000,
        }}
        onClick={() => {
          setForm(DEFAULT_FORM);
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
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            {/* كود الدولة الثابت */}
            <TextField
              label="كود الدولة"
              value="+964"
              disabled
              sx={{ 
                width: 100,
                '& .MuiInputBase-input': {
                  textAlign: 'center',
                  fontWeight: 'bold'
                }
              }}
            />
            
            {/* حقل إدخال الرقم */}
            <TextField
              autoFocus
              label="رقم الهاتف"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              fullWidth
              placeholder="07xxxxxxxx"
              inputProps={{
                maxLength: 11,
                style: { direction: 'ltr', textAlign: 'left' }
              }}
              helperText="أدخل الرقم بصيغة 07xxxxxxxx"
              sx={{ 
                '& .MuiInputBase-input': {
                  direction: 'ltr',
                  textAlign: 'left'
                }
              }}
            />
          </Box>
          
          {/* عرض الرقم النهائي فقط إذا كان الإدخال صحيحاً */}
          {newPhone && newPhone.startsWith('07') && newPhone.length >= 10 && (
            <Box 
              sx={{ 
                p: 2, 
                mt: 2,
                backgroundColor: '#e8f5e8', 
                borderRadius: 2,
                border: '1px solid #4caf50'
              }}
            >
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                📱 الرقم النهائي: +964{newPhone.substring(1)}
              </Typography>
            </Box>
          )}
          
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
        <DialogActions sx={{ p: 3, gap: 1 }}>
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
          <Button 
            onClick={handlePhoneChange}
            variant="contained"
            sx={{ 
              borderRadius: 2,
              minWidth: 120
            }}
            startIcon={<PhoneIphoneIcon />}
          >
            تحديث الرقم
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
          // استخراج الرقم المحلي من الرقم الكامل
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