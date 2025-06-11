import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, TextField, Button, Typography, Paper, Box, IconButton, 
  Card, CardContent, CardActions, Modal, Snackbar, Alert, CircularProgress, 
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
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/storage';
import { useNavigate } from 'react-router-dom';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
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
  const [changePhoneModal, setChangePhoneModal] = useState(false);
  
  // حالات تغيير رقم الهاتف
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [changePhoneMsg, setChangePhoneMsg] = useState('');
  
  // حالات الإشعارات
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // حالات القائمة المنسدلة
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const openSettings = Boolean(settingsAnchor);
  
  // بيانات المستخدم
  const uid = localStorage.getItem('verifiedUid');
  const phone = localStorage.getItem('verifiedPhone');
  const navigate = useNavigate();

  // تحميل بيانات العائلة عند تحميل المكون
  useEffect(() => {
    const initializeFamily = async () => {
      const storedPhone = localStorage.getItem('verifiedPhone');
      if (!storedPhone || !uid) {
        navigate('/login');
        return;
      }
      
      await loadFamily();
    };

    initializeFamily();
  }, [navigate, uid]);

  // تطبيق البحث والتصفية
  useEffect(() => {
    const timeoutId = setTimeout(() => {
    if (!search.trim()) {
      setFilteredMembers(members);
    } else {
      const searchTerm = search.toLowerCase().trim();
      const filtered = members.filter(member => {
        const fullName = `${member.firstName || ''} ${member.fatherName || ''} ${member.grandfatherName || ''} ${member.surname || ''}`.toLowerCase();
        const relation = (member.relation || '').toLowerCase();
        return fullName.includes(searchTerm) || relation.includes(searchTerm);
      });
      setFilteredMembers(filtered);
    }
  }, 300); // تأخير 300ms لتحسين الأداء

  return () => clearTimeout(timeoutId);
}, [search, members]);

  // تحميل بيانات العائلة من Firebase
  const loadFamily = useCallback(async () => {
    if (!uid) {
    console.warn('⚠️ No UID available for loading family data');
    navigate('/login');
    return;
  }
  
  setLoading(true);
  try {
    const snapshot = await getDocs(collection(db, 'users', uid, 'family'));
    const familyData = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id || data.id,
        // إضافة قيم افتراضية لتجنب undefined
        firstName: data.firstName || '',
        fatherName: data.fatherName || '',
        grandfatherName: data.grandfatherName || '',
        surname: data.surname || '',
        relation: data.relation || '',
        birthdate: data.birthdate || '',
        avatar: data.avatar || ''
      };
    }).filter(member => member.id && member.firstName); // تصفية أفضل

    setMembers(familyData);
    console.log('✅ تم تحميل بيانات العائلة:', familyData.length, 'فرد');
  } catch (error) {
    console.error('❌ خطأ في تحميل بيانات العائلة:', error);
    
    // معالجة أنواع مختلفة من الأخطاء
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
}, [uid, navigate]);

  // دالة عرض الإشعارات
  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

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
      errors.birthdate = '❌ أدخل تاريخ ميلاد صحيح (yyyy-mm-dd) وليس في المستقبل';
    }
    
    if (!form.relation) {
      errors.relation = '❌ اختر القرابة';
    }
    
    // التحقق من عدم تعارض الآباء
    if (form.id && form.parentId === form.id) {
      errors.parentId = '❌ لا يمكن للفرد أن يكون أبًا لنفسه';
    }
    
    return errors;
  };

  // معالجة تغيير قيم النموذج
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // إزالة رسالة الخطأ عند تصحيح الحقل
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // رفع صورة العضو
  const uploadAvatar = async (file) => {
    if (!file) return '';
    
    // التحقق من نوع وحجم الملف
    if (!file.type.startsWith('image/')) {
      throw new Error('يرجى اختيار ملف صورة صالح');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
    }
    
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `avatars/${uid}_${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      throw new Error('فشل في رفع الصورة');
    }
  };

  // معالجة رفع الصورة
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setStatus('جاري رفع الصورة...');
    
    try {
      const url = await uploadAvatar(file);
      setForm(prev => ({ ...prev, avatar: url }));
      setStatus('✅ تم رفع الصورة بنجاح');
      showSnackbar('تم رفع الصورة بنجاح');
    } catch (error) {
      const errorMsg = error.message || 'فشل في رفع الصورة';
      setStatus('❌ ' + errorMsg);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // حفظ بيانات العضو
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus('❌ يرجى تصحيح الحقول المميزة باللون الأحمر');
      return false;
    }

    setFieldErrors({});
    setStatus('');
    setLoading(true);

    try {
      // إعداد بيانات العضو
      let linkedParentUid = '';
      const parentId = form.parentId?.trim();
      
      if (parentId && parentId !== 'manual') {
        const familyRef = doc(db, 'users', uid, 'family', parentId);
        const familySnap = await getDoc(familyRef);
        if (familySnap.exists()) {
          linkedParentUid = familySnap.data().linkedParentUid || familySnap.id;
        }
      }

      const memberData = {
        ...form,
        linkedParentUid,
        updatedAt: new Date().toISOString(),
      };

      // حفظ أو تحديث العضو
      if (form.id) {
        await setDoc(doc(db, 'users', uid, 'family', form.id), memberData, { merge: true });
        showSnackbar('✅ تم تحديث بيانات العضو بنجاح');
      } else {
        const newDocRef = doc(collection(db, 'users', uid, 'family'));
        await setDoc(newDocRef, { 
          ...memberData, 
          id: newDocRef.id,
          createdAt: new Date().toISOString()
        });
        showSnackbar('✅ تم إضافة العضو بنجاح');
      }

      // إعادة تحميل البيانات وإعادة تعيين النموذج
      await loadFamily();
      setForm(DEFAULT_FORM);
      setStatus('');
      
      return true;
    } catch (error) {
      console.error('خطأ في حفظ البيانات:', error);
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

    setLoading(true);
    try {
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

  // تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('verifiedPhone');
    localStorage.removeItem('verifiedUid');
    handleSettingsClose();
    navigate('/login');
  };

  // فتح نافذة تغيير رقم الهاتف
  const handleChangePhone = () => {
    setChangePhoneModal(true);
    setNewPhone('');
    setCode('');
    setConfirmationResult(null);
    setChangePhoneMsg('');
    handleSettingsClose();
  };

  // إرسال كود تغيير رقم الهاتف
  const sendChangePhoneCode = async () => {
    if (!validatePhone(newPhone)) {
      setChangePhoneMsg('❌ أدخل رقم هاتف عراقي صالح');
      return;
    }

    try {
      if (!window.recaptchaVerifierChangePhone) {
        window.recaptchaVerifierChangePhone = new RecaptchaVerifier(
          'recaptcha-container-change-phone', 
          { size: 'invisible' }, 
          getAuth()
        );
        await window.recaptchaVerifierChangePhone.render();
      }
      
      const result = await signInWithPhoneNumber(getAuth(), newPhone, window.recaptchaVerifierChangePhone);
      setConfirmationResult(result);
      setChangePhoneMsg('✅ تم إرسال الكود');
    } catch (error) {
      console.error('خطأ في إرسال كود تغيير الرقم:', error);
      setChangePhoneMsg('❌ فشل في إرسال الكود: ' + error.message);
    }
  };

  // التحقق من كود تغيير رقم الهاتف
  const verifyChangePhoneCode = async () => {
    if (!confirmationResult) return;
    
    try {
      await confirmationResult.confirm(code);
      
      // تحديث رقم الهاتف في قاعدة البيانات
      await setDoc(doc(db, 'users', uid), {
        phone: newPhone,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      localStorage.setItem('verifiedPhone', newPhone);
      setChangePhoneModal(false);
      setChangePhoneMsg('');
      showSnackbar('✅ تم تغيير رقم الهاتف بنجاح');
    } catch (error) {
      console.error('خطأ في التحقق من كود تغيير الرقم:', error);
      setChangePhoneMsg('❌ فشل التحقق من الكود: ' + error.message);
    }
  };

  // مشاركة التطبيق
  const handleShare = () => {
    handleSettingsClose();
    const shareText = encodeURIComponent('جرب تطبيق شجرة العائلة: https://shajarat-al-aeila.web.app');
    window.open(`https://wa.me/?text=${shareText}`);
  };

  // تنظيف الذاكرة عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      setMembers([]);
      setFilteredMembers([]);
      setForm(DEFAULT_FORM);
    };
  }, []);

  // مكون النموذج
  const renderForm = () => (
    <Box component="form" onSubmit={handleSubmit}>
      {/* صورة العضو */}
      <Box textAlign="center" mb={3}>
        <label style={{ display: 'inline-block', cursor: 'pointer' }}>
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid #e3f2fd',
              mx: 'auto',
              mb: 2,
              position: 'relative',
              background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
              '&:hover': { 
                transform: 'scale(1.05)',
                transition: 'transform 0.2s',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
              }
            }}
          >
            <img
              src={form.avatar || '/boy.png'}
              alt="صورة العضو"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: '#2e7d32',
                borderRadius: '50%',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white'
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: 16, color: 'white' }} />
            </Box>
          </Box>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarUpload}
          />
          <Typography variant="body2" color="primary" fontWeight={500}>
            اختر صورة العضو
          </Typography>
        </label>
      </Box>

      {/* الحقول الأساسية باستخدام Box عادي */}
      <Box sx={{ flexGrow: 1 }}>
        <Box display="flex" flexWrap="wrap" gap={3}>
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
              {form.id ? 'حفظ التعديل' : 'إضافة العضو'}
            </>
          )}
        </Button>
        
        <Button
          variant="outlined"
          onClick={() => navigate('/tree')}
          sx={{ py: 1.8, px: 3, borderRadius: 2 }}
        >
          <VisibilityIcon sx={{ mr: 1 }} />
          عرض الشجرة
        </Button>
      </Box>

      {status && (
        <Alert 
          severity={status.includes('✅') ? 'success' : 'error'} 
          sx={{ mt: 2 }}
        >
          {status}
        </Alert>
      )}
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={6} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* رأس الصفحة المحسن */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
            color: 'white',
            p: 4,
            position: 'relative'
          }}
        >
          <IconButton
            onClick={handleSettingsClick}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <SettingsIcon />
          </IconButton>

          <Box textAlign="center">
            <FamilyIcon sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              إدارة أفراد العائلة
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              أضف وأدر أفراد عائلتك بسهولة
            </Typography>
            
            {/* إحصائيات سريعة */}
            <Box display="flex" justifyContent="center" gap={4} mt={3}>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight="bold">
                  {members.length}
                </Typography>
                <Typography variant="body2">
                  إجمالي الأفراد
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight="bold">
                  {members.filter(m => m.relation === 'ابن').length}
                </Typography>
                <Typography variant="body2">
                  الأبناء
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight="bold">
                  {members.filter(m => m.relation === 'بنت').length}
                </Typography>
                <Typography variant="body2">
                  البنات
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box p={4}>
          {/* قائمة الإعدادات */}
          <Menu
            anchorEl={settingsAnchor}
            open={openSettings}
            onClose={handleSettingsClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            PaperProps={{
              sx: { borderRadius: 2, minWidth: 250 }
            }}
          >
            <Box px={2} py={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                إعدادات الحساب
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {phone}
              </Typography>
            </Box>
            <Divider />
            
            <MenuItem onClick={handleChangePhone}>
              <PhoneIphoneIcon sx={{ mr: 2 }} />
              تغيير رقم الهاتف
            </MenuItem>
            
            <MenuItem onClick={handleShare}>
              <WhatsAppIcon sx={{ mr: 2, color: '#25D366' }} />
              مشاركة التطبيق
            </MenuItem>
            
            <MenuItem onClick={() => { handleSettingsClose(); navigate('/privacy'); }}>
              <GppGoodIcon sx={{ mr: 2, color: '#00796b' }} />
              سياسة الخصوصية
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <LogoutIcon sx={{ mr: 2 }} />
              تسجيل الخروج
            </MenuItem>
          </Menu>

          <Box sx={{ flexGrow: 1 }}>
            <Grid container spacing={4}>
              {/* قسم إضافة العضو */}
              <Grid item xs={12} md={5}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    border: '1px solid #e0e0e0',
                    display: editModalOpen ? 'none' : 'block'
                  }}
                >
                  <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AddIcon color="primary" />
                    {form.id ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  {renderForm()}
                </Paper>
              </Grid>

              {/* قسم عرض الأعضاء */}
              <Grid item xs={12} md={7}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon color="primary" />
                      أفراد العائلة ({filteredMembers.length})
                    </Typography>
                    
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/tree')}
                      startIcon={<VisibilityIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      عرض الشجرة
                    </Button>
                  </Box>

                  {/* البحث */}
                  <TextField
                    label="البحث في أفراد العائلة"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                    size="medium"
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    placeholder="ابحث بالاسم أو القرابة..."
                  />

                  {/* عرض أعضاء العائلة */}
                  {filteredMembers.length > 0 ? (
                    <Box sx={{ flexGrow: 1 }}>
                      <Grid container spacing={2}>
                        {filteredMembers.map((member) => (
                          <Grid item xs={12} md={6} lg={4} key={member.id}>
                            <Card
                              sx={{
                                height: '100%',
                                transition: 'all 0.3s ease',
                                borderRadius: 2,
                                border: '1px solid #e0e0e0',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                                  borderColor: '#2e7d32',
                                },
                              }}
                            >
                              <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                                {/* صورة العضو */}
                                <Box mb={2}>
                                  <img
                                    src={member.avatar || '/boy.png'}
                                    alt={`${member.firstName || ''} ${member.fatherName || ''}`}
                                    style={{
                                      width: 70,
                                      height: 70,
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '3px solid #e3f2fd',
                                    }}
                                  />
                                </Box>

                                {/* اسم العضو */}
                                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1rem' }}>
                                  {`${member.firstName || ''} ${member.fatherName || ''} ${member.grandfatherName || ''} ${member.surname || ''}`}
                                </Typography>

                                {/* معلومات العضو */}
                                <Box display="flex" flexDirection="column" gap={1}>
                                  <Chip
                                    label={member.relation || 'غير محدد'}
                                    color="primary"
                                    size="small"
                                    sx={{ mx: 'auto' }}
                                  />
                                  
                                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                    <CakeIcon sx={{ fontSize: 14 }} />
                                    {member.birthdate || 'تاريخ الميلاد غير محدد'}
                                  </Typography>

                                  {member.parentId && member.parentId !== 'manual' && (
                                    <Typography variant="body2" color="text.secondary">
                                      يتبع لـ: {
                                        members.find(m => m.id === member.parentId)?.firstName || 'غير معروف'
                                      }
                                    </Typography>
                                  )}

                                  {member.manualParentName && (
                                    <Typography variant="body2" color="text.secondary">
                                      يتبع لـ: {member.manualParentName}
                                    </Typography>
                                  )}
                                </Box>
                              </CardContent>

                              {/* أزرار التحكم */}
                              <CardActions sx={{ justifyContent: 'center', pt: 0, pb: 2 }}>
                                <IconButton
                                  onClick={() => handleEdit(member)}
                                  color="primary"
                                  size="small"
                                  title="تعديل"
                                  sx={{ 
                                    bgcolor: 'primary.light',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'primary.main' }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                
                                <IconButton
                                  onClick={() => handleDeleteConfirmation(member.id)}
                                  color="error"
                                  size="small"
                                  title="حذف"
                                  disabled={!isFamilyHead}
                                  sx={{ 
                                    bgcolor: 'error.light',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'error.main' },
                                    '&:disabled': { bgcolor: 'grey.300', color: 'grey.500' }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ) : (
                    /* رسالة عدم وجود أعضاء */
                    <Box textAlign="center" py={6}>
                      <FamilyIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
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
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>

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
          <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '95%', sm: 600 },
                maxHeight: '95vh',
                bgcolor: 'background.paper',
                boxShadow: 24,
                borderRadius: 3,
                overflow: 'auto',
              }}
            >
              <Box p={4}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h5" fontWeight="bold">
                    تعديل بيانات العضو
                  </Typography>
                  <IconButton onClick={() => setEditModalOpen(false)}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                
                <Box component="form" onSubmit={async (e) => {
                  e.preventDefault();
                  const success = await handleSubmit(e);
                  if (success) setEditModalOpen(false);
                }}>
                  {renderForm()}
                </Box>
              </Box>
            </Box>
          </Modal>

          {/* نافذة تغيير رقم الهاتف */}
          <Modal open={changePhoneModal} onClose={() => setChangePhoneModal(false)}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '90%', sm: 450 },
                bgcolor: 'background.paper',
                boxShadow: 24,
                borderRadius: 3,
                p: 4,
              }}
            >
              <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
                تغيير رقم الهاتف
              </Typography>
              
              <TextField
                label="رقم الهاتف الجديد"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                placeholder="+964XXXXXXXXXX"
                dir="ltr"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIphoneIcon />
                    </InputAdornment>
                  ),
                }}
              />
              
              {confirmationResult ? (
                <>
                  <TextField
                    label="كود التحقق"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                    placeholder="أدخل الكود المرسل"
                  />
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    onClick={verifyChangePhoneCode}
                    sx={{ mb: 2, py: 1.5, borderRadius: 2 }}
                  >
                    تأكيد الرقم الجديد
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={sendChangePhoneCode}
                  sx={{ mb: 2, py: 1.5, borderRadius: 2 }}
                >
                  إرسال كود التحقق
                </Button>
              )}
              
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setChangePhoneModal(false)}
                sx={{ py: 1.5, borderRadius: 2 }}
              >
                إلغاء
              </Button>
              
              <div id="recaptcha-container-change-phone" style={{ display: 'none' }}></div>
              
              {changePhoneMsg && (
                <Alert 
                  severity={changePhoneMsg.includes('✅') ? 'success' : 'error'} 
                  sx={{ mt: 2 }}
                >
                  {changePhoneMsg}
                </Alert>
              )}
            </Box>
          </Modal>

          {/* حوار تأكيد الحذف */}
          <Dialog 
            open={deleteDialogOpen} 
            onClose={() => setDeleteDialogOpen(false)}
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{ textAlign: 'center' }}>
              تأكيد حذف العضو
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ textAlign: 'center' }}>
                هل أنت متأكد من حذف هذا العضو؟ هذا الإجراء لا يمكن التراجع عنه.
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
              <Button 
                onClick={() => setDeleteDialogOpen(false)}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                إلغاء
              </Button>
              <Button 
                onClick={confirmDelete} 
                color="error" 
                variant="contained"
                sx={{ borderRadius: 2 }}
              >
                حذف نهائياً
              </Button>
            </DialogActions>
          </Dialog>

          {/* إشعارات النجاح والخطأ */}
          <Snackbar 
            open={snackbarOpen} 
            autoHideDuration={6000} 
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setSnackbarOpen(false)} 
              severity={snackbarSeverity}
              sx={{ 
                width: '100%',
                borderRadius: 2
              }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>

          {/* مؤشر التحميل العام */}
          {loading && (
            <Box
              position="fixed"
              top={0}
              left={0}
              width="100%"
              height="100%"
              bgcolor="rgba(255, 255, 255, 0.9)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex={9999}
              sx={{ backdropFilter: 'blur(2px)' }}
            >
              <Box textAlign="center">
                <CircularProgress size={60} sx={{ color: '#2e7d32', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  جاري المعالجة...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  يرجى الانتظار
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}