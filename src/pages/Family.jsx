import React, { useState, useEffect } from 'react';
import {
  Container, TextField, Button, Typography, Paper,
  Box, List, ListItem, ListItemText, IconButton, Divider, Card, CardContent, CardActions, Modal,
  Snackbar, Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import LinkIcon from '@mui/icons-material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CloseIcon from '@mui/icons-material/Close';
import GppGoodIcon from '@mui/icons-material/GppGood';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { doc, getDoc, setDoc, addDoc,collection, getDocs, query, where, deleteDoc  } from 'firebase/firestore';
import { db } from '../firebase/config';
import { storage, ref, uploadBytes, getDownloadURL } from '../firebase/storage';
import { useNavigate } from 'react-router-dom';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { validateName, validateBirthdate, validatePhone } from '../hooks/usePhoneAuth';

export default function Family() {
  const [form, setForm] = useState({
    firstName: '', // الاسم الأول
    fatherName: '', // اسم الأب
    grandfatherName: '', // اسم الجد
    surname: '', // اللقب
    birthdate: '',
    relation: '',
    parentId: '',
    id: null,
    avatar: '',
    manualParentName: ''
  });
  const [status, setStatus] = useState('');
  const [members, setMembers] = useState([]);
  const [phone, setPhone] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const openSettings = Boolean(settingsAnchor);
  const [changePhoneModal, setChangePhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [changePhoneMsg, setChangePhoneMsg] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [loading, setLoading] = useState(false);
  const [myFamilyMembers, setMyFamilyMembers] = useState([]);
  const myPhone = localStorage.getItem('verifiedPhone');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState(null);
  const [search, setSearch] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [removePhoneLoading, setRemovePhoneLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
  const storedPhone = localStorage.getItem('verifiedPhone');
  if (!storedPhone) {
    navigate('/login');
  } else {
    setPhone(storedPhone);

    // 👇 تحميل أفراد العائلة المرتبطين بالمستخدم الحالي
    loadFamily(storedPhone);
  }
}, [navigate]);



  const handleSettingsClick = (event) => setSettingsAnchor(event.currentTarget);
  const handleSettingsClose = () => setSettingsAnchor(null);

  const handleLogout = () => {
    localStorage.removeItem('verifiedPhone');
    handleSettingsClose();
    navigate('/login');
  };

  const handleChangePhone = () => {
    setChangePhoneModal(true);
    setNewPhone('');
    setCode('');
    setConfirmationResult(null);
    setChangePhoneMsg('');
    handleSettingsClose();
  };

  const sendChangePhoneCode = async () => {
    if (!newPhone || newPhone.length < 10) {
      setChangePhoneMsg('❌ أدخل رقم هاتف صالح');
      return;
    }
    try {
      if (!window.recaptchaVerifierChangePhone) {
        window.recaptchaVerifierChangePhone = new RecaptchaVerifier('recaptcha-container-change-phone', { size: 'invisible' }, getAuth());
        await window.recaptchaVerifierChangePhone.render();
      }
      const result = await signInWithPhoneNumber(getAuth(), newPhone, window.recaptchaVerifierChangePhone);
      setConfirmationResult(result);
      setChangePhoneMsg('✅ تم إرسال الكود');
    } catch (error) {
      setChangePhoneMsg('❌ فشل في إرسال الكود: ' + error.message);
    }
  };

  const verifyChangePhoneCode = async () => {
    if (!confirmationResult) return;
    try {
      await confirmationResult.confirm(code);
      localStorage.setItem('verifiedPhone', newPhone);
      setPhone(newPhone);
      setChangePhoneModal(false);
      setChangePhoneMsg('✅ تم تغيير الرقم بنجاح');
      loadFamily(newPhone);
    } catch (error) {
      setChangePhoneMsg('❌ فشل التحقق من الكود: ' + error.message);
    }
  };

  const handleShare = () => {
    handleSettingsClose();
    const shareText = encodeURIComponent('جرب تطبيق شجرة العائلة: https://shajarat-al-aeila.web.app');
    window.open(`https://wa.me/?text=${shareText}`);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const errors = {};
  if (!validateBirthdate(form.birthdate)) {
    errors.birthdate = '❌ أدخل تاريخ ميلاد صحيح (yyyy-mm-dd) وليس في المستقبل';
  }
  if (!form.relation) {
    errors.relation = '❌ اختر القرابة';
  }
  if (!form.firstName || form.firstName.length < 2) {
    errors.firstName = '❌ أدخل الاسم الأول (2 أحرف على الأقل)';
  }
  if (!form.fatherName || form.fatherName.length < 2) {
    errors.fatherName = '❌ أدخل اسم الأب (2 أحرف على الأقل)';
  }
  if (!form.grandfatherName || form.grandfatherName.length < 2) {
    errors.grandfatherName = '❌ أدخل اسم الجد (2 أحرف على الأقل)';
  }
  if (!form.surname || form.surname.length < 2) {
    errors.surname = '❌ أدخل اللقب (2 أحرف على الأقل)';
  }

  // تعيين parentId تلقائيًا إن أمكن
  if ((form.relation === 'ابن' || form.relation === 'بنت') && (!form.parentId || form.parentId === '')) {
    const heads = members.filter(m => m.relation === 'رب العائلة' && m.id && m.id !== 'manual');
    if (heads.length === 1) {
      form.parentId = heads[0].id;
    }
  }

  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    setStatus('يرجى تصحيح الحقول بالأسفل');
    return false;
  }

  if (form.id && form.parentId === form.id) {
    setStatus('❌ لا يمكن للفرد أن يكون أبًا لنفسه');
    return false;
  }

  if (!form.id && form.relation === 'رب العائلة' && members.some(m => m.relation === 'رب العائلة')) {
    setStatus('❌ لا يمكن إضافة أكثر من رب عائلة واحد');
    return false;
  }

  setFieldErrors({});
  setStatus('');
  setLoading(true);

  try {
    // ✅ هذا الكود الذكي يبحث عن الأب في كلا المكانين
    let linkedParentUid = '';
    if (form.parentId && form.parentId !== 'manual') {
      // إذا كان الأب موجود داخل نفس الحساب
      const familyRef = doc(db, 'users', phone, 'family', form.parentId);
      const familySnap = await getDoc(familyRef);

      if (familySnap.exists()) {
        linkedParentUid = familySnap.id;
      } else {
        // لو ما موجود ضمن نفس الحساب، جرب جلبه كـ Root مستخدم آخر
        const otherUserRef = doc(db, 'users', form.parentId); // نعتبر parentId هو uid لحساب آخر
        const otherUserSnap = await getDoc(otherUserRef);
        if (otherUserSnap.exists()) {
          linkedParentUid = otherUserSnap.id;
        }
      }
    }


    if (form.id) {
      if (form.relation !== 'رب العائلة') {
        await setDoc(doc(db, 'users', phone), {
          isFamilyRoot: false,
          relation: '',
        }, { merge: true });
      }

      await setDoc(doc(db, 'users', phone, 'family', form.id), {
        ...form,
        linkedParentUid: linkedParentUid || ''
      });

      if (form.relation === 'رب العائلة') {
        await setDoc(doc(db, 'users', phone), {
          ...form,
          phone,
          isFamilyRoot: true
        }, { merge: true });
      }

      setStatus('✅ تم التعديل بنجاح');
    } else {
      await addDoc(collection(db, 'users', phone, 'family'), {
        ...form,
        parentId: form.parentId || phone,
        linkedParentUid: linkedParentUid || ''
      });

      if (form.relation === 'رب العائلة') {
        await setDoc(doc(db, 'users', phone), {
          ...form,
          phone,
          isFamilyRoot: true
        }, { merge: true });
        setMembers(m => [...m, { ...form, phone }]);
      }

      setStatus('✅ تمت الإضافة بنجاح');
    }

    setForm({
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
    });

    await loadFamily(phone);
    return true;

  } catch (err) {
    console.error('🔥 Error in handleSubmit:', err);
    setStatus('❌ حدث خطأ أثناء الحفظ');
    return false;
  } finally {
    setLoading(false);
  }
};



  const loadFamily = async (parentPhone) => {
  const snapshot = await getDocs(collection(db, 'users', parentPhone, 'family'));
  const relatives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setMembers(relatives);
};


  const handleDeleteConfirmation = (id) => {
    setDeleteMemberId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
  setDeleteDialogOpen(false);
  setLoading(true);
  try {
  

    // ✅ التصحيح:
    await deleteDoc(doc(db, 'users', phone, 'family', deleteMemberId));

    loadFamily(phone);
    setSnackbarMessage('✅ تم الحذف بنجاح');
    setSnackbarSeverity('success');
  } catch (err) {
    console.error("Delete error:", err); // 🪵 مهم لتشخيص السبب الحقيقي
    setSnackbarMessage('❌ حدث خطأ أثناء الحذف');
    setSnackbarSeverity('error');
  } finally {
    setLoading(false);
    setSnackbarOpen(true);
  }
};


  const handleEdit = (member) => {
    setForm(member);
    setEditModalOpen(true);
  };

  const uploadAvatar = async (file) => {
    if (!file) return '';
    const storageRef = ref(storage, `avatars/${phone}_${Date.now()}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  // تحديد رب العائلة الحقيقي بناءً على رقم الهاتف
  const familyHead = members.find(m => m.relation === 'رب العائلة');
  const isFamilyHead = familyHead && phone === (familyHead.phone || phone);

  

  return (
    <Container maxWidth="md" sx={{ p: 0, minHeight: '100vh', overflowX: 'hidden' }}>
      <Paper sx={{ p: { xs: 1, sm: 3 }, mt: { xs: 1, sm: 4 }, minHeight: '90vh', overflowX: 'auto' }}>
        <Box position="relative" mb={2}>
          <Typography
            variant="h5"
            fontWeight="bold"
            textAlign="center"
            gutterBottom
            sx={{
              width: '100%',
              textAlign: 'center',
              lineHeight: 1.6,
              pt: 0.5,
              pr: 5.5, // مساحة لزر الإعدادات
            }}
          >
            👨‍👩‍👧‍👦 أفراد العائلة
          </Typography>
          <IconButton
            onClick={handleSettingsClick}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              bgcolor: '#fff',
              boxShadow: 1,
              p: 0.7,
              zIndex: 2,
              '&:hover': { bgcolor: '#f5f5f5' }
            }}
            aria-label="الإعدادات"
          >
            <SettingsIcon />
          </IconButton>
        </Box>
        <Menu anchorEl={settingsAnchor} open={openSettings} onClose={handleSettingsClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" px={1} py={0.5}>
            <Typography fontWeight={600} fontSize={15}>الإعدادات</Typography>
            <IconButton size="small" onClick={handleSettingsClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          {/* رقم الهاتف المسجل */}
          <Box px={2} py={0.5}>
            <Typography variant="body2" color="text.secondary" sx={{ direction: 'ltr', fontSize: 13 }}>
              {phone}
            </Typography>
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={handleChangePhone}>
            <PhoneIphoneIcon sx={{ ml: 1 }} /> تغيير الرقم
          </MenuItem>
          <MenuItem onClick={handleShare}>
            <WhatsAppIcon sx={{ ml: 1, color: '#25D366' }} /> مشاركة عبر واتساب
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ ml: 1 }} /> تسجيل الخروج
          </MenuItem>
          <MenuItem onClick={() => { handleSettingsClose(); navigate('/privacy'); }}>
            <GppGoodIcon sx={{ ml: 1, color: '#00796b' }} />
            سياسة الخصوصية والشروط
          </MenuItem>
        </Menu>
        <Box component="form" onSubmit={handleSubmit} dir="rtl" sx={{ display: editModalOpen ? 'none' : 'block' }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Box textAlign="center" mb={1}>
              <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                <img
                  src={form.avatar || '/boy.png'}
                  alt="avatar"
                  style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 0 0 4px #e2d1c3', objectFit: 'cover' }}
                  title="اضغط لتغيير الصورة"
                />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setLoading(true);
                      setStatus('جاري رفع الصورة...');
                      try {
                        const url = await uploadAvatar(file);
                        setForm(f => ({ ...f, avatar: url }));
                        setStatus('تم رفع الصورة بنجاح');
                      } catch {
                        setStatus('فشل رفع الصورة');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                />
                <Box mt={0.5} display="flex" alignItems="center" justifyContent="center" fontSize={14} color="#1976d2" fontWeight={500}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 10 }}><path d="M23 19V7a2 2 0 0 0-2-2h-3.17a2 2 0 0 1-1.41-.59l-1.83-1.83A2 2 0 0 0 12.17 2H11.83a2 2 0 0 0-1.41.59l-1.83 1.83A2 2 0 0 1 7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0-2 2h16a2 2 0 0 0 2-2z" /><circle cx="12" cy="13" r="4" /></svg>
                  تغيير الصورة
                </Box>
              </label>
            </Box>
            <TextField label="الاسم الأول" name="firstName" value={form.firstName} onChange={handleChange} fullWidth size="small"
              error={!!fieldErrors.firstName}
              helperText={fieldErrors.firstName || ''}
            />
            <TextField label="اسم الأب" name="fatherName" value={form.fatherName} onChange={handleChange} fullWidth size="small"
              sx={{ mt: 1 }}
              error={!!fieldErrors.fatherName}
              helperText={fieldErrors.fatherName || ''}
            />
            <TextField label="اسم الجد" name="grandfatherName" value={form.grandfatherName} onChange={handleChange} fullWidth size="small"
              sx={{ mt: 1 }}
              error={!!fieldErrors.grandfatherName}
              helperText={fieldErrors.grandfatherName || ''}
            />
            <TextField label="اللقب" name="surname" value={form.surname} onChange={handleChange} fullWidth size="small"
              sx={{ mt: 1 }}
              error={!!fieldErrors.surname}
              helperText={fieldErrors.surname || ''}
            />
            <TextField
              type="date"
              label="تاريخ الميلاد"
              name="birthdate"
              value={form.birthdate}
              onChange={handleChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              error={!!fieldErrors.birthdate}
              helperText={fieldErrors.birthdate || ''}
            />
            <TextField
              select
              label="القرابة"
              name="relation"
              value={form.relation}
              onChange={handleChange}
              fullWidth
              size="small"
              SelectProps={{ native: true }}
              error={!!fieldErrors.relation}
              helperText={fieldErrors.relation || ''}
            >
              <option value="">-- اختر --</option>
              <option value="رب العائلة">  👨‍👩‍👧‍👦 &nbsp;رب العائلة</option>
              <option value="ابن">👦&nbsp;ابن</option>
              <option value="بنت">👧&nbsp;بنت</option>
            </TextField>
            <TextField
              select
              label="يتبع لـ"
              name="parentId"
              value={form.parentId}
              onChange={handleChange}
              fullWidth
              size="small"
              SelectProps={{ native: true }}
            >
              <option value="">-- اختر الأب --</option>
              {members.filter((m) => m.relation === 'رب العائلة' || m.relation === 'ابن').map((m) => (
                <option key={m.id} value={m.id}>
                  {`${m.firstName} ${m.fatherName} ${m.grandfatherName} ${m.surname}`} ({m.relation})
                </option>
              ))}
              <option value="manual">إضافة أب غير موجود في القائمة </option>
            </TextField>
            {form.parentId === 'manual' && (
              <TextField
                label="اسم الأب "
                name="manualParentName"
                value={form.manualParentName || ''}
                onChange={e => setForm(f => ({ ...f, manualParentName: e.target.value }))}
                fullWidth
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Box mt={3} textAlign="center">
            <Button variant="contained" type="submit" fullWidth sx={{ py: 1.2, fontSize: { xs: 15, sm: 16 } }}>
              {form.id ? 'حفظ التعديل' : 'إضافة'}
            </Button>
          </Box>
          <Box textAlign="center" mt={3}>
            <Button variant="outlined" onClick={() => navigate('/tree')} fullWidth sx={{ py: 1.2, fontSize: { xs: 15, sm: 16 } }}>
              🌳 عرض شجرة العائلة
            </Button>
          </Box>
          {status && (
            <Typography variant="body2" color="success.main" mt={1} textAlign="right">
              {status}
            </Typography>
          )}
        </Box>
        <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: 320, sm: 400 },
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
            outline: 'none',
          }}>
            <IconButton onClick={() => setEditModalOpen(false)} sx={{ position: 'absolute', top: 8, left: 8, color: '#888' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </IconButton>
            <Typography variant="h6" mb={2} textAlign="center">تعديل بيانات الفرد</Typography>
            <Box component="form" onSubmit={async (e) => {
              e.preventDefault();
              const success = await handleSubmit(e);
              if (success) setEditModalOpen(false);
            }} dir="rtl">
              <Box display="flex" flexDirection="column" gap={2}>
                <Box textAlign="center" mb={1}>
                  <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                    <img
                      src={form.avatar || '/boy.png'}
                      alt="avatar"
                      style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 0 0 4px #e2d1c3', objectFit: 'cover' }}
                      title="اضغط لتغيير الصورة"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setLoading(true);
                          setStatus('جاري رفع الصورة...');
                          try {
                            const url = await uploadAvatar(file);
                            setForm(f => ({ ...f, avatar: url }));
                            setStatus('تم رفع الصورة بنجاح');
                          } catch {
                            setStatus('فشل رفع الصورة');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                    />
                    <Box mt={0.5} display="flex" alignItems="center" justifyContent="center" fontSize={14} color="#1976d2" fontWeight={500}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 10 }}><path d="M23 19V7a2 2 0 0 0-2-2h-3.17a2 2 0 0 1-1.41-.59l-1.83-1.83A2 2 0 0 0 12.17 2H11.83a2 2 0 0 0-1.41.59l-1.83 1.83A2 2 0 0 1 7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0-2 2h16a2 2 0 0 0 2-2z" /><circle cx="12" cy="13" r="4" /></svg>
                      <span>تغيير الصورة</span>
                    </Box>
                  </label>
                </Box>
                <TextField label="الاسم الأول" name="firstName" value={form.firstName} onChange={handleChange} fullWidth size="small"
                  error={!!fieldErrors.firstName}
                  helperText={fieldErrors.firstName || ''}
                />
                <TextField label="اسم الأب" name="fatherName" value={form.fatherName} onChange={handleChange} fullWidth size="small"
                  sx={{ mt: 1 }}
                  error={!!fieldErrors.fatherName}
                  helperText={fieldErrors.fatherName || ''}
                />
                <TextField label="اسم الجد" name="grandfatherName" value={form.grandfatherName} onChange={handleChange} fullWidth size="small"
                  sx={{ mt: 1 }}
                  error={!!fieldErrors.grandfatherName}
                  helperText={fieldErrors.grandfatherName || ''}
                />
                <TextField label="اللقب" name="surname" value={form.surname} onChange={handleChange} fullWidth size="small"
                  sx={{ mt: 1 }}
                  error={!!fieldErrors.surname}
                  helperText={fieldErrors.surname || ''}
                />
                <TextField
                  type="date"
                  label="تاريخ الميلاد"
                  name="birthdate"
                  value={form.birthdate}
                  onChange={handleChange}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  error={!!fieldErrors.birthdate}
                  helperText={fieldErrors.birthdate || ''}
                />
                <TextField
                  select
                  label="القرابة"
                  name="relation"
                  value={form.relation}
                  onChange={handleChange}
                  fullWidth
                  size="small"
                  SelectProps={{ native: true }}
                  error={!!fieldErrors.relation}
                  helperText={fieldErrors.relation || ''}
                >
                  <option value="">-- اختر --</option>
                  <option value="رب العائلة">👨‍👩‍👧‍👦&nbsp;رب العائلة</option>
                  <option value="ابن">👦&nbsp;ابن</option>
                  <option value="بنت">👧&nbsp;بنت</option>
                </TextField>
                <TextField
                  select
                  label="يتبع لـ"
                  name="parentId"
                  value={form.parentId}
                  onChange={handleChange}
                  fullWidth
                  size="small"
                  SelectProps={{ native: true }}
                >
                  <option value="">-- اختر الأب --</option>
                  {members.filter((m) => m.relation === 'رب العائلة' || m.relation === 'ابن').map((m) => (
                    <option key={m.id} value={m.id}>
                      {`${m.firstName} ${m.fatherName} ${m.grandfatherName} ${m.surname}`} ({m.relation})
                    </option>
                  ))}
                  <option value="manual">إضافة أب غير موجود في القائمة </option>
                </TextField>
                {form.parentId === 'manual' && (
                  <TextField
                    label="اسم الأب "
                    name="manualParentName"
                    value={form.manualParentName || ''}
                    onChange={e => setForm(f => ({ ...f, manualParentName: e.target.value }))}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
              <Box mt={3} textAlign="center">
                <Button variant="contained" type="submit" fullWidth sx={{ py: 1.2, fontSize: { xs: 15, sm: 16 } }}>
                  حفظ التعديل
                </Button>
                <Button variant="outlined" onClick={() => setEditModalOpen(false)} fullWidth sx={{ py: 1.2, fontSize: { xs: 15, sm: 16 }, mt: 1 }}>
                  إلغاء
                </Button>
              </Box>
            </Box>
          </Box>
        </Modal>
        {/* نافذة تغيير رقم الهاتف */}
        <Modal open={changePhoneModal} onClose={() => setChangePhoneModal(false)}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 340,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
            outline: 'none',
          }}>
            <Typography variant="h6" mb={2} textAlign="center">تغيير رقم الهاتف</Typography>
            <TextField
              label="رقم الهاتف الجديد"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
              placeholder="مثال: +964XXXXXXXXXX"
            />
            {confirmationResult ? (
              <>
                <TextField
                  label="أدخل الكود المرسل"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" color="success" fullWidth onClick={verifyChangePhoneCode} sx={{ mb: 1 }}>
                  تأكيد الرقم الجديد
                </Button>
              </>
            ) : (
              <Button variant="contained" color="primary" fullWidth onClick={sendChangePhoneCode} sx={{ mb: 1 }}>
                إرسال كود التحقق
              </Button>
            )}
            <Button variant="outlined" fullWidth onClick={() => setChangePhoneModal(false)}>
              إلغاء
            </Button>
            <div id="recaptcha-container-change-phone" style={{ display: 'none' }}></div>
            <Typography variant="body2" color="error" mt={2} textAlign="center">
              {changePhoneMsg}
            </Typography>
          </Box>
        </Modal>
        <Divider sx={{ my: 3 }} />
        {/* حقل البحث */}
        <Box mb={2}>
          <TextField
            label="بحث عن فرد..."
            variant="outlined"
            size="small"
            fullWidth
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ mb: 2 }}
          />
        </Box>
        {/* عرض الكروت بشكل متناسق */}
        <Grid container spacing={2} mt={4} dir="rtl" justifyContent="center" alignItems="stretch">
          {members.filter(member =>
            `${member.firstName} ${member.fatherName} ${member.grandfatherName} ${member.surname}`.toLowerCase().includes(search.toLowerCase())
          ).map((member) => (
            <Grid item xs={6} sm={6} md={6} key={member.id} display="flex">
              <Card sx={{ borderRadius: 2, boxShadow: 1, minWidth: 140, maxWidth: 250, width: '100%', margin: '0 auto', minHeight: 170, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 1.5 }}>
                <CardContent sx={{ p: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Box textAlign="center" mb={1}>
                    <img src={member.avatar || '/boy.png'} alt="avatar" style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 0 0 4px #e2d1c3', objectFit: 'cover' }} />
                  </Box>
                  <Typography variant="h6" fontWeight="bold" fontSize={{ xs: 15, sm: 16 }}>
                    👤 {member.firstName} {member.fatherName} {member.grandfatherName} {member.surname}
                  </Typography>
                  <Typography variant="body2">القرابة: {member.relation ? member.relation : 'غير محدد'}</Typography>
                  <Typography variant="body2">تاريخ الميلاد: {member.birthdate ? member.birthdate : 'غير محدد'}</Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 1, width: '100%' }}>
                  <IconButton onClick={() => handleEdit(member)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteConfirmation(member.id)} color="error" disabled={!isFamilyHead}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        {/* Snackbar for success/error messages */}
        <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
          <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
        {/* Dialog for delete confirmation */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogContent>
            <DialogContentText>
              هل أنت متأكد أنك تريد حذف هذا الفرد؟.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
              إلغاء
            </Button>
            <Button onClick={confirmDelete} color="error" autoFocus>
              حذف
            </Button>
          </DialogActions>
        </Dialog>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" position="fixed" top={0} left={0} width="100%" height="100%" bgcolor="rgba(255, 255, 255, 0.7)" zIndex={9999}>
            <CircularProgress />
          </Box>
        )}
      </Paper>
    </Container>
  );
}
