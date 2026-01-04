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

import { useNavigate } from 'react-router-dom';
import { validateName, validateBirthdate } from '../hooks/usePhoneAuth';
import { useTribe } from '../contexts/TribeContext';
import { useAuth } from '../AuthContext';
import { 
  listTribePersons, 
  createTribePerson, 
  updateTribePerson, 
  deleteTribePerson 
} from "../services/tribeService";


// نموذج البيانات الافتراضي
const DEFAULT_FORM = {
  firstName: '',
  fatherName: '',
  grandfatherName: '',
  surname: '',
  birthdate: '',
  relation: '',
  gender: '', // إضافة حقل الجنس
  parentId: '',
  id: null,
  avatar: '',
  manualParentName: ''
};

// علاقات العائلة - نموذج شامل للربط الذكي
const FAMILY_RELATIONS = [
  // === أنا ===
  { value: 'أنا', label: '🙋‍♂️ أنا (صاحب الحساب)', category: 'أساسي', info: 'سجل نفسك أولاً' },
  
  // === أولادي ===
  { value: 'ابن', label: '👦 ابني', category: 'أولادي', info: 'أولادك الذكور' },
  { value: 'بنت', label: '👧 بنتي', category: 'أولادي', info: 'بناتك الإناث' },
  
  // === إخوتي ===
  { value: 'أخ', label: '👨 أخي', category: 'إخوتي', info: 'إخوتك (نفس الوالد)' },
  { value: 'أخت', label: '👩 أختي', category: 'إخوتي', info: 'أخواتك (نفس الوالد)' },
  
  // === أصولي (للربط) ===
  { value: 'والد', label: '👨 والدي (أبي)', category: 'أصولي', info: 'والدك - للربط مع شجرته' },
  { value: 'والدة', label: '👩 والدتي (أمي)', category: 'أصولي', info: 'والدتك' },
  { value: 'جد', label: '👴 جدي', category: 'أصولي', info: 'جدك - للربط مع شجرته' },
  { value: 'جدة', label: '👵 جدتي', category: 'أصولي', info: 'جدتك' },
  
  // === الزواج ===
  { value: 'زوج', label: '💍 زوجي', category: 'زواج', info: 'زوجك/زوجتك' },
  { value: 'زوجة', label: '💍 زوجتي', category: 'زواج', info: 'زوجك/زوجتك' },
];

export default function Family() {
  // الحصول على بيانات القبيلة والمصادقة
  const { tribe, membership, loading: tribeLoading, canEdit, isAdmin } = useTribe();
  const { logout, user } = useAuth();
  
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

  // ✅ التحقق من ملكية البيانات - هل المستخدم هو من أضاف هذا الشخص؟
  const canEditMember = useCallback((member) => {
    if (!user?.uid) return false;
    // Admin يمكنه تعديل أي شيء
    if (isAdmin) return true;
    // المستخدم يمكنه تعديل البيانات التي أضافها فقط
    return member.createdBy === user.uid;
  }, [user?.uid, isAdmin]);

  
  // دالة حذف الصورة القديمة
  const deleteOldAvatar = async (oldAvatarUrl) => {
    // حالياً لا يوجد حذف فعلي من الخادم، فقط نتجاهل العملية
    if (!oldAvatarUrl) return true;
    return true;
  };


  // دالة حساب العمر
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
    } catch {
      return '';
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

  // تحميل بيانات العائلة (من القبيلة) - فقط البيانات التي أضافها المستخدم الحالي
const loadFamily = useCallback(async () => {
  if (!tribe?.id) {
    console.log('⏳ في انتظار تحميل القبيلة...');
    return; // انتظر تحميل القبيلة
  }

  if (!user?.uid) {
    console.log('⏳ في انتظار تسجيل الدخول...');
    return;
  }

  console.log('🔄 تحميل أفراد المستخدم:', user.uid);
  setLoading(true);
  try {
    const response = await listTribePersons(tribe.id, search);
    console.log('✅ استجابة الخادم:', response);
    const dataArray = Array.isArray(response) ? response : [];

    // ✅ تصفية البيانات - فقط البيانات التي أضافها المستخدم الحالي
    const familyData = dataArray
      .filter((data) => data.created_by === user.uid) // فقط بيانات المستخدم الحالي
      .map((data) => ({
        id: String(data.id || ''),
        firstName: data.first_name || '',
        fatherName: data.father_name || '',
        grandfatherName: data.grandfather_name || '',
        surname: data.family_name || '',
        relation: data.relation || '',
        birthdate: data.birth_date || '',
        avatar: data.photo_url || '',
        parentId: data.parent_id || '',
        createdAt: data.created_at || '',
        updatedAt: data.updated_at || '',
        createdBy: data.created_by || '',
        generation: data.generation || 0,
      }))
      .filter((member) => member.id && member.firstName);

    console.log('✅ تم تحميل', familyData.length, 'من أفرادك');
    setMembers(familyData);
  } catch (error) {
    console.error('❌ خطأ في تحميل بيانات العائلة:', error);
    showSnackbar('حدث خطأ أثناء تحميل بيانات العائلة', 'error');
  } finally {
    setLoading(false);
  }
}, [tribe?.id, user?.uid, search, showSnackbar]);

  
  // التحقق من صحة البيانات
  const validateForm = () => {
    const errors = {};
    
    if (!validateName(form.firstName)) {
      errors.firstName = 'أدخل الاسم الأول (2-40 حرف، عربي أو إنجليزي)';
    }
    
    if (!validateName(form.fatherName)) {
      errors.fatherName = 'أدخل اسم الأب (2-40 حرف، عربي أو إنجليزي)';
    }
    
    if (!validateName(form.grandfatherName)) {
      errors.grandfatherName = 'أدخل اسم الجد (2-40 حرف، عربي أو إنجليزي)';
    }
    
    if (!validateName(form.surname)) {
      errors.surname = 'أدخل اللقب (2-40 حرف، عربي أو إنجليزي)';
    }
    
    if (!validateBirthdate(form.birthdate)) {
      errors.birthdate = 'أدخل تاريخ ميلاد صحيح وليس في المستقبل';
    }
    
    if (!form.relation) {
      errors.relation = 'اختر القرابة';
    }
    
    // ✅ إذا كانت العلاقة "أنا"، يجب اختيار الجنس
    if (form.relation === 'أنا' && !form.gender) {
      errors.gender = 'يجب اختيار الجنس';
    }
    
    if (form.id && form.parentId === form.id) {
      errors.parentId = 'لا يمكن للفرد أن يكون أبًا لنفسه';
    }
    
    return errors;
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
      // تحويل الصورة إلى Data URL (Base64) ليتم حفظها مع بيانات العضو
      const toDataUrl = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const dataUrl = await toDataUrl(file);

      setForm(prev => ({ ...prev, avatar: dataUrl }));
      setAvatarUploadSuccess(true);
      showSnackbar('تم رفع الصورة بنجاح', 'success');
      return dataUrl;
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
  
  if (!tribe?.id) {
    showSnackbar('لم يتم تحميل بيانات القبيلة', 'error');
    return false;
  }

  if (!canEdit) {
    showSnackbar('ليس لديك صلاحية للتعديل', 'error');
    return false;
  }
  
  const errors = validateForm();
  setFieldErrors(errors);
  
  if (Object.keys(errors).length > 0) {
    showSnackbar('يرجى تصحيح الأخطاء أولاً', 'error');
    return false;
  }

  setLoading(true);

  try {
    // تحديد الجنس بناءً على العلاقة
    let gender;
    
    // إذا كان المستخدم اختار الجنس يدوياً (عند اختيار "أنا")
    if (form.gender) {
      gender = form.gender;
    } else {
      // أو تحديد تلقائي بناءً على العلاقة
      const maleRelations = ['رب العائلة', 'ابن', 'أخ', 'والد', 'جد', 'عم', 'خال', 
                             'ابن عم', 'ابن خال', 'ابن أخ', 'ابن أخت', 'حفيد', 
                             'زوج الابنة', 'صهر', 'حمو', 'أخو الزوج', 'جد الجد', 'حفيد الحفيد', 'زوج'];
      
      gender = maleRelations.includes(form.relation) ? 'M' : 'F';
    }

    const memberData = {
      first_name: form.firstName || '',
      father_name: form.fatherName || '',
      grandfather_name: form.grandfatherName || '',
      family_name: form.surname || '',
      gender: gender,
      relation: form.relation,
      is_root: form.relation === 'رب العائلة',
      birth_date: form.birthdate || null,
    };

    if (form.id) {
      await updateTribePerson(tribe.id, form.id, memberData);
      showSnackbar('تم تحديث بيانات العضو بنجاح');
    } else {
      await createTribePerson(tribe.id, memberData);
      showSnackbar('تم إضافة العضو بنجاح');
    }

    await loadFamily();
    setForm(DEFAULT_FORM);
    setAvatarUploadSuccess(false);
    setShowAddForm(false);
    return true;
  } catch (error) {
    console.error('خطأ في حفظ البيانات:', error);
    showSnackbar(error.message || 'حدث خطأ أثناء حفظ البيانات', 'error');
    return false;
  } finally {
    setLoading(false);
  }
};


  // معالجة تعديل العضو
  const handleEdit = (member) => {
    // التحقق من أن المستخدم يملك هذه البيانات
    if (!canEditMember(member)) {
      showSnackbar('لا يمكنك تعديل بيانات أضافها شخص آخر', 'warning');
      return;
    }
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
    
    // التحقق من أن المستخدم يملك هذه البيانات
    const member = members.find(m => m.id === id);
    if (member && !canEditMember(member)) {
      showSnackbar('لا يمكنك حذف بيانات أضافها شخص آخر', 'warning');
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

    if (!tribe?.id) {
      showSnackbar('لم يتم تحميل بيانات القبيلة', 'error');
      return;
    }

    if (!canEdit) {
      showSnackbar('ليس لديك صلاحية للحذف', 'error');
      return;
    }

    const memberToDelete = members.find(m => m.id === deleteMemberId);

    setLoading(true);
    try {
      if (memberToDelete?.avatar) {
        await deleteOldAvatar(memberToDelete.avatar);
      }
      
      await deleteTribePerson(tribe.id, deleteMemberId);
      await loadFamily();
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
  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('verifiedUid');
      localStorage.removeItem('verifiedPhone');
      navigate('/login');
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      // حتى لو فشل، ننتقل لصفحة تسجيل الدخول
      navigate('/login');
    }
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

  // تحميل البيانات عند بداية المكون أو تغير المستخدم
  useEffect(() => {
    if (tribe?.id && user?.uid && !tribeLoading) {
      loadFamily();
    }
  }, [tribe?.id, user?.uid, tribeLoading, loadFamily]);

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
            
            {/* ✅ حقل الجنس (يظهر فقط عند اختيار "أنا") */}
            {form.relation === 'أنا' && (
              <TextField
                select
                label="الجنس"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                fullWidth
                size="medium"
                SelectProps={{ native: true }}
                required
                error={!!fieldErrors.gender}
                helperText={fieldErrors.gender || "اختر الجنس"}
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
                <option value="">اختر الجنس</option>
                <option value="M">👨 ذكر</option>
                <option value="F">👩 أنثى</option>
              </TextField>
            )}
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
          {/* أزرار التعديل والحذف - تظهر فقط لصاحب البيانات أو Admin */}
          {canEditMember(member) ? (
            <>
              <IconButton
                color="primary"
                onClick={() => handleEdit(member)}
                sx={{ mx: 1 }}
                title="تعديل"
              >
                <EditIcon />
              </IconButton>
              
              <IconButton
                color="error"
                onClick={() => handleDeleteConfirmation(member.id)}
                sx={{ mx: 1 }}
                title="حذف"
              >
                <DeleteIcon />
              </IconButton>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>
              🔒 أُضيف بواسطة عضو آخر
            </Typography>
          )}
        </CardActions>
      </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* مؤشر التحميل الأولي */}
      {(tribeLoading || (loading && members.length === 0)) && (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            {tribeLoading ? 'جاري تحميل بيانات القبيلة...' : 'جاري تحميل الأفراد...'}
          </Typography>
        </Box>
      )}

      {!tribeLoading && (
        <>
      {/* الهيدر */}
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={4} gap={2}>
        <Box textAlign={{ xs: 'center', sm: 'left' }}>
          <Typography 
            variant="h3" 
            fontWeight="bold" 
            gutterBottom 
            fontSize={{ xs: '2rem', sm: '3rem' }}
            sx={{ color: '#1976d2' }}
          >
            🌳 {tribe?.name || 'شجرة القبيلة'}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            أضف عائلتك المباشرة • النظام يحسب جميع العلاقات تلقائياً
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.5, fontWeight: 'bold' }}>
            🎯 أنت + أولادك + إخوتك + والديك = الشجرة الكاملة تلقائياً (أعمام، أخوال، أحفاد، إلخ)
          </Typography>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="contained"
            color="success"
            startIcon={<VisibilityIcon />}
            onClick={() => {
              console.log('🌳 الانتقال إلى صفحة الشجرة...');
              navigate('/tree');
            }}
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
          
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/add-person')}
            sx={{ 
              borderRadius: 2,
              display: { xs: 'none', sm: 'flex' }
            }}
          >
            إضافة ذكية
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
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          ➕ بناء شجرتك العائلية
        </Typography>
        
        {/* رسالة توضيحية بسيطة */}
        {members.length === 0 ? (
          <Alert severity="info" icon="🎯" sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              أضف فقط 4 أشياء - النظام يحسب الباقي تلقائياً!
            </Typography>
            <Typography variant="body2" component="div" sx={{ lineHeight: 2.2 }}>
              <Box component="span" sx={{ display: 'block', mb: 1 }}>
                1️⃣ <strong>سجّل نفسك</strong> (أنا) - اسمك الرباعي<br/>
                2️⃣ <strong>أضف أولادك</strong> (ابني، بنتي)<br/>
                3️⃣ <strong>أضف إخوتك</strong> (أخي، أختي)<br/>
                4️⃣ <strong>أضف والديك وأجدادك</strong> (والدي، جدي)
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2, border: '2px solid', borderColor: 'success.main' }}>
                <Typography variant="body2" fontWeight="bold" color="success.dark" gutterBottom>
                  ✨ النظام الذكي يحسب تلقائياً:
                </Typography>
                <Typography variant="caption" component="div" sx={{ lineHeight: 1.8 }}>
                  ✅ <strong>أولاد أخي</strong> = أبناء إخوتي<br/>
                  ✅ <strong>أولاد عمي</strong> = أبناء إخوة والدي<br/>
                  ✅ <strong>أعمامي</strong> = إخوة والدي<br/>
                  ✅ <strong>أخوالي</strong> = إخوة والدتي<br/>
                  ✅ <strong>أحفادي</strong> = أبناء أبنائي<br/>
                  ✅ <strong>أجداد الأجداد</strong> = كل السلسلة للأعلى<br/>
                  ✅ <strong>وجميع العلاقات الأخرى</strong> - لا نهاية!
                </Typography>
              </Box>
              
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
                <Typography variant="caption" fontWeight="bold" color="info.dark">
                  💡 كلما أضاف المزيد من الناس بياناتهم، كلما اكتملت الشجرة أكثر وظهرت علاقات جديدة تلقائياً!
                </Typography>
              </Box>
            </Typography>
          </Alert>
        ) : (
          <Alert severity="success" icon="✅" sx={{ mb: 3 }}>
            <Typography variant="body2">
              ممتاز! استمر - فقط أضف: <strong>أولادك، إخوتك، والديك</strong> والنظام يحسب الباقي
            </Typography>
          </Alert>
        )}
        
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
              <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 8 }}>
                <Typography variant="h1" sx={{ fontSize: '80px', mb: 2 }}>
                  🌱
                </Typography>
                <Typography variant="h4" color="text.primary" gutterBottom fontWeight="bold">
                  {search ? 'لا توجد نتائج' : 'ابدأ شجرتك الآن'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}>
                  {search 
                    ? 'جرّب البحث بكلمات أخرى' 
                    : 'فقط أضف: أنت + أولادك + إخوتك + والديك. النظام يحسب باقي العلاقات (أعمام، أخوال، أحفاد، إلخ) تلقائياً!'
                  }
                </Typography>
                {!search && (
                  <>
                    <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 3, maxWidth: 700, mx: 'auto', border: '2px solid', borderColor: 'primary.main', boxShadow: 2 }}>
                      <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom textAlign="center">
                        🎯 النظام الذكي - مثال عملي
                      </Typography>
                      
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Paper sx={{ p: 2, bgcolor: 'info.lighter', height: '100%' }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="info.dark" gutterBottom>
                              📝 ما تضيفه أنت (4 أشياء فقط):
                            </Typography>
                            <Typography variant="caption" component="div" sx={{ lineHeight: 2 }}>
                              1. نفسك: "علي محمد أحمد"<br/>
                              2. أولادك: "حسن"، "فاطمة"<br/>
                              3. أخوك: "كريم"<br/>
                              4. والدك: "محمد أحمد"
                            </Typography>
                          </Paper>
                        </Grid>
                        
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Paper sx={{ p: 2, bgcolor: 'success.lighter', height: '100%' }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="success.dark" gutterBottom>
                              ✨ النظام يحسب تلقائياً:
                            </Typography>
                            <Typography variant="caption" component="div" sx={{ lineHeight: 2 }}>
                              ✅ كريم = أخوك<br/>
                              ✅ أبناء كريم = <strong>أولاد أخيك</strong><br/>
                              ✅ إخوة محمد = أعمامك<br/>
                              ✅ أبناء إخوة محمد = <strong>أولاد عمك</strong><br/>
                              ✅ أبناء حسن = أحفادك<br/>
                              ✅ وجميع العلاقات - لا نهاية!
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 2 }}>
                        <Typography variant="body2" fontWeight="bold" color="warning.dark" textAlign="center">
                          💡 كلما أضاف المزيد من الناس، كلما اكتشف النظام علاقات جديدة!
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setShowAddForm(true);
                        setForm({...DEFAULT_FORM, relation: 'أنا'});
                        setAvatarUploadSuccess(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      sx={{ 
                        borderRadius: 3, 
                        px: 5, 
                        py: 2, 
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        boxShadow: 3
                      }}
                    >
                      🙋‍♂️ سجّل نفسك الآن
                    </Button>
                  </>
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
      </>
      )}
    </Container>
  );
}
