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
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { storage, ref, uploadBytes, getDownloadURL } from '../firebase/storage';
import { useNavigate } from 'react-router-dom';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { validateName, validateBirthdate, validatePhone } from '../hooks/usePhoneAuth';

export default function Family() {
  const [form, setForm] = useState({
    name: '',
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState(null);
  const [search, setSearch] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkedPhones, setLinkedPhones] = useState(() => {
    const saved = localStorage.getItem('linkedPhones');
    return saved ? JSON.parse(saved) : [];
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [linkPhoneError, setLinkPhoneError] = useState('');
  const [linkPhoneLoading, setLinkPhoneLoading] = useState(false);
  const [removePhoneLoading, setRemovePhoneLoading] = useState(false);
  const [phoneToRemove, setPhoneToRemove] = useState(null);
  const [confirmRemoveDialog, setConfirmRemoveDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedPhone = localStorage.getItem('verifiedPhone');
    if (!storedPhone) {
      navigate('/login');
    } else {
      setPhone(storedPhone);
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
    if (!validateName(form.name)) {
      errors.name = '❌ أدخل اسمًا صحيحًا (2-40 حرفًا، عربي أو إنجليزي)';
    }
    if (!validateBirthdate(form.birthdate)) {
      errors.birthdate = '❌ أدخل تاريخ ميلاد صحيح (yyyy-mm-dd) وليس في المستقبل';
    }
    if (!form.relation) {
      errors.relation = '❌ اختر القرابة';
    }
    // منطق افتراضي: إذا كان ابن/بنت ولم يحدد الأب، عيّن parentId لرب العائلة الحقيقي فقط إذا كان له id حقيقي وليس 'manual'
    if ((form.relation === 'ابن' || form.relation === 'بنت') && (!form.parentId || form.parentId === '')) {
      const heads = members.filter(m => m.relation === 'رب العائلة' && m.id && m.id !== 'manual');
      if (heads.length === 1) {
        form.parentId = heads[0].id;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus('يرجى تصحيح الحقول بالأسفل');
      return;
    }
    setFieldErrors({});
    setStatus('');
    setLoading(true);
    try {
      if (form.id) {
        await setDoc(doc(db, 'users', phone, 'family', form.id), {
          name: form.name,
          birthdate: form.birthdate,
          relation: form.relation,
          parentId: form.parentId,
          avatar: form.avatar || '',
          manualParentName: form.manualParentName || ''
        });
        setStatus('✅ تم التعديل بنجاح');
      } else {
        await addDoc(collection(db, 'users', phone, 'family'), {
          name: form.name,
          birthdate: form.birthdate,
          relation: form.relation,
          parentId: form.parentId,
          avatar: form.avatar || '',
          manualParentName: form.manualParentName || ''
        });
        setStatus('✅ تمت الإضافة بنجاح');
      }
      setForm({ name: '', birthdate: '', relation: '', parentId: '', id: null, avatar: '', manualParentName: '' });
      loadFamily(phone);
    } catch {
      setStatus('❌ حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const loadFamily = async (phoneNumber) => {
    const snapshot = await getDocs(collection(db, 'users', phoneNumber, 'family'));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setMembers(data);
  };

  const handleDeleteConfirmation = (id) => {
    setDeleteMemberId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', phone, 'family', deleteMemberId));
      loadFamily(phone);
      setSnackbarMessage('✅ تم الحذف بنجاح');
      setSnackbarSeverity('success');
    } catch {
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

  const handleAddLinkedPhone = async () => {
    if (!validatePhone(newPhone)) {
      setLinkPhoneError('❌ أدخل رقم هاتف عراقي صحيح (مثال: +9647xxxxxxxxx)');
      return;
    }
    setLinkPhoneError('');
    setLinkPhoneLoading(true);
    try {
      // تحقق من وجود الحساب في قاعدة البيانات (Firestore)
      const snapshot = await getDocs(collection(db, 'users', newPhone, 'family'));
      if (snapshot.empty) {
        setLinkPhoneError('❌ لا يوجد حساب بهذا الرقم. تأكد من أن الرقم مسجل في التطبيق.');
        setLinkPhoneLoading(false);
        return;
      }
      if (!linkedPhones.includes(newPhone)) {
        const updated = [...linkedPhones, newPhone];
        setLinkedPhones(updated);
        localStorage.setItem('linkedPhones', JSON.stringify(updated));
      }
      setNewPhone(''); // إعادة تعيين الحقل بعد الربط
      setLinkDialogOpen(false);
      setSnackbarMessage('✅ تم ربط الحساب بنجاح');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      setLinkPhoneError('❌ حدث خطأ أثناء التحقق من الحساب');
    } finally {
      setLinkPhoneLoading(false);
    }
  };

  // إزالة حساب مرتبط
  const handleRemoveLinkedPhone = (phone) => {
    setPhoneToRemove(phone);
    setConfirmRemoveDialog(true);
  };
  const confirmRemoveLinkedPhone = () => {
    setRemovePhoneLoading(true);
    const updated = linkedPhones.filter(p => p !== phoneToRemove);
    setLinkedPhones(updated);
    localStorage.setItem('linkedPhones', JSON.stringify(updated));
    setRemovePhoneLoading(false);
    setConfirmRemoveDialog(false);
    setPhoneToRemove(null);
    setSnackbarMessage('✅ تمت إزالة الحساب المرتبط بنجاح');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

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
          <MenuItem onClick={() => setLinkDialogOpen(true)}>
            <LinkIcon sx={{ ml: 1 }} /> ربط حساب آخر
          </MenuItem>
          {/* <MenuItem onClick={() => { handleSettingsClose(); navigate('/settings'); }}>
            <SettingsIcon sx={{ ml: 1 }} /> صفحة الإعدادات المتقدمة
          </MenuItem> */}
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
            <TextField label="الاسم" name="name" value={form.name} onChange={handleChange} fullWidth size="small"
              error={!!fieldErrors.name}
              helperText={fieldErrors.name || ''}
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
                  {m.name} ({m.relation})
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
            <Box component="form" onSubmit={(e) => { handleSubmit(e); setEditModalOpen(false); }} dir="rtl">
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
                <TextField label="الاسم" name="name" value={form.name} onChange={handleChange} fullWidth size="small"
                  error={!!fieldErrors.name}
                  helperText={fieldErrors.name || ''}
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
                      {m.name} ({m.relation})
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
        {/* نافذة ربط حساب آخر */}
        <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)}>
          <DialogTitle>ربط حساب جديد</DialogTitle>
          <DialogContent>
            <TextField
              label="رقم هاتف الحساب الآخر"
              value={newPhone}
              onChange={e => { setNewPhone(e.target.value); setLinkPhoneError(''); }}
              fullWidth
              sx={{ mt: 1 }}
              error={!!linkPhoneError}
              helperText={linkPhoneError || ''}
              disabled={linkPhoneLoading}
              inputProps={{ 'aria-label': 'رقم هاتف الحساب الآخر' }}
              autoFocus
            />
            {/* عرض الحسابات المرتبطة سابقاً */}
            {linkedPhones.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  الحسابات المرتبطة:
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  {linkedPhones.map((phone, idx) => (
                    <Box key={phone} sx={{
                      background: '#f1f8e9',
                      color: '#33691e',
                      borderRadius: 2,
                      px: 2, py: 0.7,
                      fontSize: 15,
                      display: 'flex', alignItems: 'center', gap: 1
                    }}>
                      <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 600 }}>{phone}</span>
                      <IconButton
                        aria-label={`إزالة الحساب المرتبط ${phone}`}
                        size="small"
                        color="error"
                        onClick={() => handleRemoveLinkedPhone(phone)}
                        sx={{ ml: 1 }}
                        disabled={removePhoneLoading}
                        tabIndex={0}
                      >
                        <RemoveCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLinkDialogOpen(false)} disabled={linkPhoneLoading}>إلغاء</Button>
            <Button onClick={handleAddLinkedPhone} variant="contained" disabled={linkPhoneLoading}>
              {linkPhoneLoading ? 'جاري التحقق...' : 'ربط'}
            </Button>
          </DialogActions>
        </Dialog>
        {/* نافذة تأكيد حذف الحساب المرتبط */}
        <Dialog open={confirmRemoveDialog} onClose={() => setConfirmRemoveDialog(false)}>
          <DialogTitle>تأكيد إزالة الحساب المرتبط</DialogTitle>
          <DialogContent>
            <DialogContentText>
              هل أنت متأكد أنك تريد إزالة الحساب المرتبط:
              <br />
              <b style={{ direction: 'ltr', fontFamily: 'monospace' }}>{phoneToRemove}</b>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmRemoveDialog(false)} color="primary" disabled={removePhoneLoading}>إلغاء</Button>
            <Button onClick={confirmRemoveLinkedPhone} color="error" variant="contained" disabled={removePhoneLoading}>
              حذف
            </Button>
          </DialogActions>
        </Dialog>
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
            member.name.toLowerCase().includes(search.toLowerCase()) ||
            (member.relation && member.relation.toLowerCase().includes(search.toLowerCase()))
          ).map((member) => (
            <Grid item xs={6} sm={6} md={6} key={member.id} display="flex">
              <Card sx={{ borderRadius: 2, boxShadow: 1, minWidth: 140, maxWidth: 250, width: '100%', margin: '0 auto', minHeight: 170, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 1.5 }}>
                <CardContent sx={{ p: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Box textAlign="center" mb={1}>
                    <img src={member.avatar || '/boy.png'} alt="avatar" style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 0 0 4px #e2d1c3', objectFit: 'cover' }} />
                  </Box>
                  <Typography variant="h6" fontWeight="bold" fontSize={{ xs: 15, sm: 16 }}>
                    👤 {member.name}
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
