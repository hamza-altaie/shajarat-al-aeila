// src/pages/Family.jsx - إصلاح Grid للإصدار الحالي
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  WhatsApp as WhatsAppIcon,
  PhoneIphone as PhoneIphoneIcon,
  Close as CloseIcon,
  GppGood as GppGoodIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Cake as CakeIcon,
  PhotoCamera as PhotoCameraIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Group as GroupIcon,
  People as FamilyIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { validateName, validateBirthdate } from '../hooks/usePhoneAuth';
import { useTribe } from '../contexts/TribeContext';
import { useAuth } from '../AuthContext';
import {
  listTribePersons,
  createTribePerson,
  updateTribePerson,
  deleteTribePerson,
  checkUserHasParent,
  updateUserPhone,
  confirmLinkToExistingPerson,
  createNewPersonForSelf,
} from '../services/tribeService';

// 📸 استيراد خدمة الصور
import {
  uploadAndUpdatePersonPhoto,
  validateImageFile,
  compressImage,
} from '../services/imageService';
import PhotoUploader, { PersonAvatar } from '../components/PhotoUploader';

// نموذج البيانات الافتراضي
const DEFAULT_FORM = {
  firstName: '',
  fatherName: '',
  grandfatherName: '',
  surname: '',
  birthdate: '',
  relation: '',
  gender: '',
  parentId: '',
  id: null,
  avatar: '',
  manualParentName: '',
};

// علاقات العائلة - الرجال هم من يبنون الشجرة
const FAMILY_RELATIONS = [
  // === أنا (رب العائلة - ذكر فقط) ===
  {
    value: 'أنا',
    label: '🙋‍♂️ أنا (رب العائلة)',
    category: 'أساسي',
    info: 'سجل نفسك أولاً - الرجال يبنون الشجرة',
  },

  // === أولادي ===
  { value: 'ابن', label: '👦 ابني', category: 'أولادي', info: 'أولادك الذكور' },
  { value: 'بنت', label: '👧 بنتي', category: 'أولادي', info: 'بناتك الإناث' },

  // === إخوتي ===
  { value: 'أخ', label: '👨 أخي', category: 'إخوتي', info: 'إخوتك (نفس الوالد)' },
  { value: 'أخت', label: '👩 أختي', category: 'إخوتي', info: 'أخواتك (نفس الوالد)' },

  // === أصولي ===
  { value: 'والد', label: '👨 والدي (أبي)', category: 'أصولي', info: 'والدك' },
  { value: 'جد', label: '👴 جدي', category: 'أصولي', info: 'جدك' },

  // === الزواج ===
  { value: 'زوجة', label: '💍 زوجتي', category: 'زواج', info: 'زوجتك الأولى' },
  { value: 'زوجة ثانية', label: '💍 زوجتي الثانية', category: 'زواج', info: 'زوجتك الثانية' },
  { value: 'زوجة ثالثة', label: '💍 زوجتي الثالثة', category: 'زواج', info: 'زوجتك الثالثة' },
  { value: 'زوجة رابعة', label: '💍 زوجتي الرابعة', category: 'زواج', info: 'زوجتك الرابعة' },
];

export default function Family() {
  // الحصول على بيانات القبيلة والمصادقة
  const {
    tribe,
    membership,
    loading: tribeLoading,
    canEdit,
    isAdmin,
    refreshMembership,
  } = useTribe();
  const { logout, user, sendPhoneUpdateOtp, verifyAndUpdatePhone } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
  const [deleteAffectedChildren, setDeleteAffectedChildren] = useState([]); // الأبناء المتأثرين
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  // ✅ حالات تحديث رقم الهاتف
  const [phoneUpdateStep, setPhoneUpdateStep] = useState('input'); // 'input' | 'otp' | 'success'
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneUpdateLoading, setPhoneUpdateLoading] = useState(false);

  // ✅ حالات تأكيد الربط بشخص موجود
  const [confirmLinkDialogOpen, setConfirmLinkDialogOpen] = useState(false);
  const [pendingExistingPerson, setPendingExistingPerson] = useState(null);
  const [pendingNewPersonData, setPendingNewPersonData] = useState(null);
  const [pendingAllMatches, setPendingAllMatches] = useState([]); // كل المطابقات المحتملة
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0); // الشخص المختار حالياً

  // حالات الإشعارات والصور
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadSuccess, setAvatarUploadSuccess] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // ✅ ref لتتبع حالة تحميل المكون
  const isMountedRef = useRef(true);

  const navigate = useNavigate();
  const phone = localStorage.getItem('verifiedPhone');

  // تتبع حالة تحميل المكون
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // دالة عرض الإشعارات
  const showSnackbar = useCallback((message, severity = 'success') => {
    if (!isMountedRef.current) return; // تجاهل إذا كان المكون غير محمّل
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // ✅ التحقق من ملكية البيانات - هل المستخدم يمكنه تعديل هذا الشخص؟
  const canEditMember = useCallback(
    (member) => {
      if (!user?.uid) return false;
      // Admin يمكنه تعديل أي شيء
      if (isAdmin) return true;
      // ✅ المستخدم يمكنه تعديل سجله الخاص (المرتبط به عبر person_id) - هذا هو الأهم!
      if (membership?.person_id && String(member.id) === String(membership.person_id)) return true;
      // المستخدم يمكنه تعديل البيانات التي أضافها
      if (member.createdBy && member.createdBy === user.uid) return true;
      return false;
    },
    [user?.uid, isAdmin, membership?.person_id]
  );

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
        const monthsDiff =
          today.getMonth() - birth.getMonth() + 12 * (today.getFullYear() - birth.getFullYear());

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
        day: 'numeric',
      });
    } catch {
      return birthdate; // Removed unused 'error' variable
    }
  };

  // تحميل بيانات العائلة (من القبيلة) - الأشخاص المرتبطين بالمستخدم + الذين أضافهم
  const loadFamily = useCallback(async () => {
    if (!tribe?.id) {
      return; // انتظر تحميل القبيلة
    }

    if (!user?.uid) {
      return;
    }

    setLoading(true);
    try {
      const response = await listTribePersons(tribe.id, search);

      // ✅ التحقق من أن المكون لا يزال محمّلاً قبل تحديث الـ state
      if (!isMountedRef.current) {
        return;
      }

      const dataArray = Array.isArray(response) ? response : [];

      // ✅ الحصول على person_id المرتبط بالمستخدم من membership
      const linkedPersonId = membership?.person_id;

      // ✅ تصفية البيانات - الأشخاص الذين أضافهم المستخدم + الشخص المرتبط به
      const familyData = dataArray
        .filter(
          (data) =>
            data.created_by === user.uid || // الأشخاص الذين أضافهم
            data.id === linkedPersonId // أو الشخص المرتبط به (أنا)
        )
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

      // ✅ التحقق مرة أخرى قبل تحديث الـ state
      if (isMountedRef.current) {
        setMembers(familyData);
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات العائلة:', error);
      if (isMountedRef.current) {
        showSnackbar('حدث خطأ أثناء تحميل بيانات العائلة', 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [tribe?.id, user?.uid, search, showSnackbar, membership?.person_id]);

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

    if (form.id && form.parentId === form.id) {
      errors.parentId = 'لا يمكن للفرد أن يكون أبًا لنفسه';
    }

    return errors;
  };

  // معالجة تغيير قيم النموذج
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // معالجة رفع الصورة - محسّنة لاستخدام Supabase Storage
  const handleAvatarUpload = async (file) => {
    if (!file) return null;

    // التحقق من الملف
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showSnackbar(validation.errors.join(', '), 'error');
      return null;
    }

    setAvatarUploading(true);

    try {
      // إذا كان الشخص موجود، نرفع مباشرة إلى Storage
      if (form.id && tribe?.id) {
        const photoUrl = await uploadAndUpdatePersonPhoto(tribe.id, form.id, file);
        setForm((prev) => ({ ...prev, avatar: photoUrl }));
        setAvatarUploadSuccess(true);
        showSnackbar('✅ تم رفع الصورة بنجاح', 'success');
        // تحديث القائمة لعرض الصورة الجديدة
        loadFamily();
        return photoUrl;
      }

      // إذا كان شخص جديد، نحفظ كـ Data URL مؤقتاً
      const compressedFile = await compressImage(file);
      const toDataUrl = (f) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });

      const dataUrl = await toDataUrl(compressedFile);
      setForm((prev) => ({ ...prev, avatar: dataUrl }));
      setAvatarUploadSuccess(true);
      showSnackbar('✅ تم تحميل الصورة (سيتم رفعها عند الحفظ)', 'info');
      return dataUrl;
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      showSnackbar('❌ فشل رفع الصورة: ' + (error.message || 'خطأ غير معروف'), 'error');
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

    // ✅ التحقق من وجود والد قبل إضافة أخ/أخت
    if ((form.relation === 'أخ' || form.relation === 'أخت') && !form.id) {
      const userPersonId = membership?.person_id;
      if (!userPersonId) {
        showSnackbar('يجب إضافة نفسك أولاً (اختر علاقة "أنا")', 'warning');
        return false;
      }
      const hasParent = await checkUserHasParent(tribe.id, userPersonId);
      if (!hasParent) {
        showSnackbar('يجب إضافة والدك أولاً قبل إضافة أخ أو أخت', 'warning');
        return false;
      }
    }

    setLoading(true);

    try {
      // تحديد الجنس تلقائياً بناءً على العلاقة
      const maleRelations = [
        'رب العائلة',
        'ابن',
        'أخ',
        'والد',
        'جد',
        'عم',
        'خال',
        'ابن عم',
        'ابن خال',
        'ابن أخ',
        'ابن أخت',
        'حفيد',
        'زوج الابنة',
        'صهر',
        'حمو',
        'أخو الزوج',
        'جد الجد',
        'حفيد الحفيد',
        'زوج',
        'أنا',
      ];

      const gender = maleRelations.includes(form.relation) ? 'M' : 'F';

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
        const result = await createTribePerson(tribe.id, memberData);

        // ✅ التحقق من طلب التأكيد (شخص موجود بنفس الاسم)
        if (result?.needsConfirmation) {
          setPendingExistingPerson(result.existingPerson);
          setPendingNewPersonData(memberData);
          setPendingAllMatches(result.allMatches || [result.existingPerson]);
          setSelectedMatchIndex(0);
          setConfirmLinkDialogOpen(true);
          setLoading(false);
          return false; // لا نغلق النموذج - ننتظر التأكيد
        }

        if (result?.alreadyExists) {
          showSnackbar(
            `⚠️ "${result.first_name} ${result.father_name}" موجود بالفعل في الشجرة`,
            'warning'
          );
        } else if (result?.merged) {
          showSnackbar(`✅ تم ربط "${result.first_name}" بسجل موجود في الشجرة`, 'success');
        } else {
          showSnackbar('تم إضافة العضو بنجاح');
        }

        // ✅ إذا كان المستخدم يسجل نفسه، أعد تحميل العضوية لتحديث person_id
        if ((form.relation === 'أنا' || form.relation === 'رب العائلة') && refreshMembership) {
          await refreshMembership();
        }
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

  // =====================================================
  // ✅ معالجة تأكيد/رفض الربط بشخص موجود
  // =====================================================

  // تأكيد الربط - نعم، أنا هذا الشخص
  const handleConfirmLink = async () => {
    if (!pendingExistingPerson || !tribe?.id) return;

    setLoading(true);
    try {
      // استخدام الشخص المختار من القائمة
      const selectedPerson =
        pendingAllMatches.length > 1
          ? pendingAllMatches[selectedMatchIndex]
          : pendingExistingPerson;

      const result = await confirmLinkToExistingPerson(
        tribe.id,
        selectedPerson.id,
        pendingNewPersonData
      );

      showSnackbar(
        `✅ تم ربطك بسجل "${result.first_name} ${result.father_name}" بنجاح!`,
        'success'
      );

      // إعادة تحميل العضوية والبيانات
      if (refreshMembership) {
        await refreshMembership();
      }
      await loadFamily();

      // إغلاق كل شيء
      setConfirmLinkDialogOpen(false);
      setPendingExistingPerson(null);
      setPendingNewPersonData(null);
      setPendingAllMatches([]);
      setSelectedMatchIndex(0);
      setForm(DEFAULT_FORM);
      setShowAddForm(false);
    } catch (error) {
      console.error('خطأ في تأكيد الربط:', error);
      showSnackbar(error.message || 'حدث خطأ أثناء الربط', 'error');
    } finally {
      setLoading(false);
    }
  };

  // رفض الربط - لا، أنا شخص مختلف
  const handleRejectLink = async () => {
    if (!pendingNewPersonData || !tribe?.id) return;

    setLoading(true);
    try {
      const result = await createNewPersonForSelf(tribe.id, pendingNewPersonData);

      showSnackbar(`✅ تم إنشاء سجل جديد لـ "${result.first_name}" بنجاح!`, 'success');

      // إعادة تحميل العضوية والبيانات
      if (refreshMembership) {
        await refreshMembership();
      }
      await loadFamily();

      // إغلاق كل شيء
      setConfirmLinkDialogOpen(false);
      setPendingExistingPerson(null);
      setPendingNewPersonData(null);
      setPendingAllMatches([]);
      setSelectedMatchIndex(0);
      setForm(DEFAULT_FORM);
      setShowAddForm(false);
    } catch (error) {
      console.error('خطأ في إنشاء سجل جديد:', error);
      showSnackbar(error.message || 'حدث خطأ أثناء الإنشاء', 'error');
    } finally {
      setLoading(false);
    }
  };

  // إلغاء - العودة للنموذج
  const handleCancelLink = () => {
    setConfirmLinkDialogOpen(false);
    setPendingExistingPerson(null);
    setPendingNewPersonData(null);
    setPendingAllMatches([]);
    setSelectedMatchIndex(0);
  };

  // معالجة تعديل العضو
  const handleEdit = (member) => {
    // التحقق من أن المستخدم يملك هذه البيانات
    if (!canEditMember(member)) {
      showSnackbar('لا يمكنك تعديل بيانات أضافها شخص آخر', 'warning');
      return;
    }

    // ✅ إذا كان هذا سجل المستخدم الحالي، نعرض "أنا" في حقل القرابة للعرض فقط
    const isMyRecord = membership?.person_id && String(member.id) === String(membership.person_id);
    const formData = { ...member };
    if (isMyRecord) {
      formData.relation = 'أنا'; // للعرض في النموذج فقط
    }

    setForm(formData);
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
    const member = members.find((m) => m.id === id);
    if (member && !canEditMember(member)) {
      showSnackbar('لا يمكنك حذف بيانات أضافها شخص آخر', 'warning');
      return;
    }

    // البحث عن الأبناء المتأثرين (من parentId = id أو fatherName = firstName)
    const affectedChildren = members.filter(
      (m) =>
        String(m.parentId) === String(id) ||
        (member && m.fatherName === member.firstName && m.id !== id)
    );

    setDeleteMemberId(id);
    setDeleteAffectedChildren(affectedChildren);
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

    const memberToDelete = members.find((m) => m.id === deleteMemberId);

    setLoading(true);
    try {
      if (memberToDelete?.avatar) {
        await deleteOldAvatar(memberToDelete.avatar);
      }

      await deleteTribePerson(tribe.id, deleteMemberId);
      await loadFamily();

      const childrenCount = deleteAffectedChildren.length;
      if (childrenCount > 0) {
        showSnackbar(
          `تم حذف العضو. ⚠️ ${childrenCount} من الأبناء قد يحتاجون تحديث بياناتهم`,
          'warning'
        );
      } else {
        showSnackbar('تم حذف العضو بنجاح');
      }
    } catch (error) {
      console.error('خطأ في الحذف:', error);
      showSnackbar('حدث خطأ أثناء حذف العضو', 'error');
    } finally {
      setLoading(false);
      setDeleteMemberId(null);
      setDeleteAffectedChildren([]);
    }
  };

  // معالجة قائمة الإعدادات
  const handleSettingsClick = (event) => setSettingsAnchor(event.currentTarget);
  const handleSettingsClose = () => setSettingsAnchor(null);

  // ✅ إرسال رمز التحقق للرقم الجديد
  const handleSendPhoneOtp = async () => {
    if (!newPhone.trim()) {
      showSnackbar('يرجى إدخال رقم الهاتف', 'error');
      return;
    }

    const cleanPhone = newPhone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^07[0-9]{8,9}$/;

    if (!phoneRegex.test(cleanPhone)) {
      showSnackbar('رقم الهاتف غير صحيح. يجب أن يبدأ بـ 07', 'error');
      return;
    }

    const fullPhone = `+964${cleanPhone.substring(1)}`;

    // تأكد من أن الرقم الجديد مختلف عن الحالي
    if (fullPhone === user?.phoneNumber) {
      showSnackbar('الرقم الجديد يجب أن يكون مختلفاً عن الرقم الحالي', 'error');
      return;
    }

    setPhoneUpdateLoading(true);
    try {
      await sendPhoneUpdateOtp(fullPhone);
      setPhoneUpdateStep('otp');
      showSnackbar('تم إرسال رمز التحقق إلى الرقم الجديد');
    } catch (error) {
      console.error('خطأ في إرسال رمز التحقق:', error);
      if (error.code === 'auth/invalid-phone-number') {
        showSnackbar('رقم الهاتف غير صالح', 'error');
      } else if (error.code === 'auth/too-many-requests') {
        showSnackbar('محاولات كثيرة. يرجى الانتظار قليلاً', 'error');
      } else if (error.code === 'auth/phone-number-already-exists') {
        showSnackbar('هذا الرقم مستخدم بالفعل', 'error');
      } else {
        showSnackbar('فشل في إرسال رمز التحقق: ' + (error.message || 'خطأ غير معروف'), 'error');
      }
    } finally {
      setPhoneUpdateLoading(false);
    }
  };

  // ✅ التحقق من الرمز وتحديث الرقم
  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpCode || phoneOtpCode.length < 6) {
      showSnackbar('يرجى إدخال رمز التحقق المكون من 6 أرقام', 'error');
      return;
    }

    setPhoneUpdateLoading(true);
    try {
      const cleanPhone = newPhone.replace(/[\s\-()]/g, '');
      const fullPhone = `+964${cleanPhone.substring(1)}`;

      // ✅ التحقق من نتيجة الدالة
      const result = await verifyAndUpdatePhone(phoneOtpCode);

      if (!result.success) {
        throw new Error(result.error || 'فشل في تحديث رقم الهاتف');
      }

      // تحديث في localStorage
      localStorage.setItem('verifiedPhone', fullPhone);

      // تحديث في Supabase
      if (tribe?.id && user?.uid) {
        try {
          await updateUserPhone(tribe.id, user.uid, fullPhone);
        } catch (dbError) {
          console.error('تحديث قاعدة البيانات:', dbError);
          // لا نفشل العملية بسبب هذا الخطأ
        }
      }

      setPhoneUpdateStep('success');
      showSnackbar('تم تحديث رقم الهاتف بنجاح! ✅');

      // إغلاق النافذة بعد ثانيتين
      setTimeout(() => {
        handleClosePhoneModal();
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('خطأ في تحديث رقم الهاتف:', error);
      const errorMsg = error.message || '';
      if (errorMsg.includes('غير صحيح') || error.code === 'auth/invalid-verification-code') {
        showSnackbar('رمز التحقق غير صحيح', 'error');
      } else if (errorMsg.includes('صلاحية') || error.code === 'auth/code-expired') {
        showSnackbar('انتهت صلاحية الرمز. يرجى طلب رمز جديد', 'error');
        setPhoneUpdateStep('input');
        setPhoneOtpCode('');
      } else {
        showSnackbar('فشل في تحديث رقم الهاتف: ' + (errorMsg || 'خطأ غير معروف'), 'error');
      }
    } finally {
      setPhoneUpdateLoading(false);
    }
  };

  // ✅ إغلاق نافذة تغيير الهاتف وإعادة الضبط
  const handleClosePhoneModal = () => {
    setPhoneModalOpen(false);
    setNewPhone('');
    setPhoneOtpCode('');
    setPhoneUpdateStep('input');
    setPhoneUpdateLoading(false);
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
      filtered = members.filter((member) => {
        const fullName = `${member.firstName} ${member.fatherName}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
      });
    }

    // ✅ ترتيب الأعضاء حسب الأهمية والعلاقة
    const relationPriority = {
      'رب العائلة': 1,
      زوجة: 2,
      'زوجة ثانية': 2,
      'زوجة ثالثة': 2,
      'زوجة رابعة': 2,
      والد: 3,
      والدة: 3,
      جد: 4,
      جدة: 4,
      'جد الجد': 4,
      'جدة الجد': 4,
      ابن: 5,
      بنت: 5,
      أخ: 6,
      أخت: 6,
      'أخ غير شقيق': 6,
      'أخت غير شقيقة': 6,
      عم: 7,
      عمة: 7,
      'ابن عم': 7,
      'بنت عم': 7,
      خال: 8,
      خالة: 8,
      'ابن خال': 8,
      'بنت خال': 8,
      حفيد: 9,
      حفيدة: 9,
      'حفيد الحفيد': 9,
      'حفيدة الحفيد': 9,
      'ابن أخ': 10,
      'بنت أخ': 10,
      'ابن أخت': 10,
      'بنت أخت': 10,
      'زوج الابنة': 11,
      'زوجة الابن': 11,
      صهر: 11,
      كنة: 11,
      حمو: 12,
      حماة: 12,
      'أخو الزوج': 12,
      'أخت الزوج': 12,
      'ابن عم الوالد': 13,
      'بنت عم الوالد': 13,
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
          border: '1px solid #e3f2fd',
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
              overflow: 'hidden',
            }}
          >
            {form.avatar?.trim() ? (
              <img
                src={form.avatar}
                alt="صورة العضو"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => (e.target.style.display = 'none')}
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
                    fontSize: { xs: '18px', sm: '20px' },
                  },
                },
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
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
              mb: 3,
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
              required
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
              required
              error={!!fieldErrors.surname}
              helperText={fieldErrors.surname}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 2,
              mb: 3,
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
              helperText={fieldErrors.relation || ' '}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiFormHelperText-root': {
                  minHeight: '20px',
                },
                '& .MuiSelect-select': {
                  textAlign: 'right',
                },
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
            borderRadius: 2,
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

  // دالة لتحديد ألوان الكارت حسب العلاقة
  const getCardColors = (relation) => {
    const colorMap = {
      // أصول العائلة - أزرق
      'والد': { bg: '#f0f9ff', border: '#3b82f6' },
      'جد': { bg: '#eff6ff', border: '#2563eb' },
      'رب العائلة': { bg: '#f0f9ff', border: '#1d4ed8' },
      'أنا': { bg: '#f0f9ff', border: '#1d4ed8' },
      
      // الأبناء - أخضر
      'ابن': { bg: '#f0fdf4', border: '#22c55e' },
      'بنت': { bg: '#fdf2f8', border: '#ec4899' },
      
      // الإخوة - برتقالي/أصفر
      'أخ': { bg: '#fff7ed', border: '#f97316' },
      'أخت': { bg: '#fef3c7', border: '#f59e0b' },
      
      // الزوجات - بنفسجي
      'زوجة': { bg: '#faf5ff', border: '#a855f7' },
      'زوجة ثانية': { bg: '#f3e8ff', border: '#9333ea' },
      'زوجة ثالثة': { bg: '#f3e8ff', border: '#7c3aed' },
      'زوجة رابعة': { bg: '#f3e8ff', border: '#6d28d9' },
    };
    
    return colorMap[relation] || { bg: '#f9fafb', border: '#9ca3af' };
  };

  // عرض كارت العضو
  const renderMemberCard = (member) => {
    const colors = getCardColors(member.relation);
    
    return (
    <Card
      key={member.id}
      elevation={2}
      sx={{
        height: '100%',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        bgcolor: colors.bg,
        border: `3px solid ${colors.border}`,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
          borderWidth: '4px',
        },
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
            position: 'relative',
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
                display: 'block',
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
              justifyContent: 'center',
            }}
          >
            <PersonIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: '#2196f3' }} />
          </Box>
        </Box>

        {/* اسم العضو */}
        <Typography
          variant="h6"
          fontWeight="bold"
          gutterBottom
          fontSize={{ xs: '1.1rem', sm: '1.25rem' }}
          sx={{ color: '#1976d2' }}
        >
          {`${member.firstName} ${member.fatherName} ${member.surname}`}
        </Typography>

        {/* القرابة - إظهار "أنا" فقط للمستخدم الحالي */}
        <Chip
          label={(() => {
            // التحقق إذا كان هذا سجل المستخدم الحالي
            const isMyRecord =
              membership?.person_id && String(member.id) === String(membership.person_id);

            if (isMyRecord) {
              return 'أنا'; // سجلي الخاص
            }

            // للآخرين: إذا كانت العلاقة "أنا" أو "رب العائلة"، نعرض العلاقة حسب الجنس
            if (member.relation === 'أنا' || member.relation === 'رب العائلة') {
              return member.gender === 'F' ? 'بنت' : 'ابن';
            }

            return member.relation;
          })()}
          color={
            membership?.person_id && String(member.id) === String(membership.person_id)
              ? 'success'
              : 'primary'
          }
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
                mb: 1,
              }}
            >
              <CakeIcon fontSize="small" />
              {calculateAge(member.birthdate)}
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
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
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* مؤشر التحميل الأولي */}
      {(tribeLoading || (loading && members.length === 0)) && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3, color: '#166534' }}>
            {tribeLoading ? 'جاري تحميل بيانات القبيلة...' : 'جاري تحميل الأفراد...'}
          </Typography>
        </Box>
      )}

      {!tribeLoading && (
        <>
          {/* الهيدر */}
          <Box
            display="flex"
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            mb={3}
            gap={2}
          >
            <Box textAlign={{ xs: 'center', sm: 'left' }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#166534' }}>
                🌳 {tribe?.name || 'شجرة القبيلة'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                أضف عائلتك المباشرة • النظام يربط العلاقات تلقائياً
              </Typography>
            </Box>

            <Box display="flex" gap={2} alignItems="center">
              <Button
                variant="contained"
                color="success"
                startIcon={<VisibilityIcon sx={{ fontSize: '1.1rem' }} />}
                onClick={() => navigate('/tree')}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  py: 1,
                  fontWeight: 600,
                  gap: 1,
                  '& .MuiButton-startIcon': {
                    marginLeft: 1,
                    marginRight: 0,
                  },
                }}
              >
                عرض الشجرة
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
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(2, 1fr)',
              },
              gap: 2,
              mb: 4,
            }}
          >
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: '#f0f9ff',
                border: '1px solid #bae6fd',
              }}
            >
              <FamilyIcon sx={{ fontSize: 36, color: '#0284c7', mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#0284c7' }}>
                {members.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                إجمالي الأفراد
              </Typography>
            </Paper>

            {/* عدد الأبناء - مع استثناء رب العائلة */}
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: '#f0fdf4',
                border: '1px solid #86efac',
              }}
            >
              <GroupIcon sx={{ fontSize: 36, color: '#16a34a', mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#16a34a' }}>
                {(() => {
                  // استثناء رب العائلة (الذي علاقته "أنا" أو المرتبط بـ membership)
                  const myPersonId = membership?.person_id;
                  return members.filter(
                    (m) =>
                      (m.relation === 'ابن' || m.relation === 'بنت') &&
                      m.relation !== 'أنا' &&
                      String(m.id) !== String(myPersonId)
                  ).length;
                })()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                الأبناء
              </Typography>
            </Paper>
          </Box>

          {/* قسم إضافة عضو جديد */}
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 3 }}>
            {/* ⚠️ تنبيه مهم إذا لم يضف المستخدم نفسه */}
            {!membership?.person_id && members.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2, border: '2px solid #f59e0b' }}>
                <Typography variant="body2" fontWeight="bold">
                  ⚠️ مهم جداً: لم تضف نفسك بعد!
                </Typography>
                <Typography variant="body2">
                  يجب أن تضيف نفسك أولاً باختيار علاقة <strong>&quot;أنا&quot;</strong> لكي تظهر في
                  الشجرة وتُربط بأولادك.
                </Typography>
              </Alert>
            )}

            {/* رسالة توضيحية مختصرة */}
            {members.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  🎯 ابدأ بإضافة نفسك، ثم والدك، ثم إخوتك وأولادك
                </Typography>
              </Alert>
            ) : membership?.person_id ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  ✅ ممتاز! أضف: <strong>أولادك، إخوتك، والديك</strong> - النظام يربط الباقي
                  تلقائياً
                </Typography>
              </Alert>
            ) : null}

            {!showAddForm && (
              <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => setShowAddForm(true)}
                sx={{ fontWeight: 'bold', fontSize: 16, px: 3, py: 1.5 }}
                fullWidth
              >
                +إضافة العضو
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
            <Box
              display="flex"
              flexDirection={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems="center"
              mb={3}
              gap={2}
            >
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
                    lg: 'repeat(3, 1fr)',
                  },
                  gap: 3,
                }}
              >
                {filteredMembers.length > 0 ? (
                  filteredMembers.map(renderMemberCard)
                ) : (
                  <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
                    {/* أيقونة وعنوان */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h1" sx={{ fontSize: '64px', mb: 1 }}>
                        🌳
                      </Typography>
                      <Typography variant="h4" color="text.primary" fontWeight="bold">
                        {search ? 'لا توجد نتائج' : 'أهلاً بك في شجرة القبيلة'}
                      </Typography>
                    </Box>

                    {!search && (
                      <>
                        {/* وصف قصير */}
                        <Typography
                          variant="body1"
                          color="text.secondary"
                          sx={{ mb: 4, maxWidth: 450, mx: 'auto' }}
                        >
                          ابدأ ببناء شجرة قبيلتك وتواصل مع أقاربك
                        </Typography>

                        {/* زر التسجيل */}
                        <Button
                          variant="contained"
                          color="primary"
                          size="large"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setShowAddForm(true);
                            setForm({ ...DEFAULT_FORM, relation: 'أنا' });
                            setAvatarUploadSuccess(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          sx={{
                            borderRadius: 3,
                            px: 5,
                            py: 1.5,
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            boxShadow: 2,
                          }}
                        >
                          ابدأ الآن
                        </Button>
                      </>
                    )}

                    {search && (
                      <Typography variant="body2" color="text.secondary">
                        جرّب البحث بكلمات أخرى
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Paper>

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
              <Box
                component="form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const success = await handleSubmit(e);
                  if (success) setEditModalOpen(false);
                }}
                sx={{ mt: 2 }}
              >
                {renderForm()}
              </Box>
            </DialogContent>
          </Dialog>

          {/* نافذة تغيير رقم الهاتف - مع التحقق بخطوتين */}
          <Dialog open={phoneModalOpen} onClose={handleClosePhoneModal} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                <PhoneIphoneIcon sx={{ color: '#2196f3' }} />
                <Typography variant="h6" fontWeight="bold">
                  {phoneUpdateStep === 'success' ? 'تم بنجاح! ✅' : 'تغيير رقم الهاتف'}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {/* الخطوة 1: إدخال الرقم الجديد */}
              {phoneUpdateStep === 'input' && (
                <>
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
                          fontWeight: 'bold',
                        },
                      }}
                    />

                    <TextField
                      autoFocus
                      label="رقم الهاتف"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      fullWidth
                      placeholder="7xxxxxxxx"
                      disabled={phoneUpdateLoading}
                      inputProps={{
                        maxLength: 11,
                        style: { direction: 'ltr', textAlign: 'left' },
                      }}
                      helperText="مثال: 7701234567 أو 07701234567"
                      sx={{
                        order: 2,
                        '& .MuiInputBase-input': {
                          direction: 'ltr',
                          textAlign: 'left',
                        },
                      }}
                    />
                  </Box>

                  {/* حاوية reCAPTCHA */}
                  <Box
                    id="recaptcha-container-update"
                    sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
                  />

                  <Box
                    sx={{
                      p: 2,
                      mt: 2,
                      backgroundColor: '#e3f2fd',
                      borderRadius: 2,
                      border: '1px solid #bbdefb',
                    }}
                  >
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                      📱 الرقم الحالي: {phone || 'غير محدد'}
                    </Typography>
                  </Box>
                </>
              )}

              {/* الخطوة 2: إدخال رمز التحقق */}
              {phoneUpdateStep === 'otp' && (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    تم إرسال رمز التحقق إلى الرقم الجديد
                  </Alert>

                  <TextField
                    autoFocus
                    label="رمز التحقق"
                    value={phoneOtpCode}
                    onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ''))}
                    fullWidth
                    placeholder="123456"
                    disabled={phoneUpdateLoading}
                    inputProps={{
                      maxLength: 6,
                      style: {
                        direction: 'ltr',
                        textAlign: 'center',
                        fontSize: '24px',
                        letterSpacing: '8px',
                        fontWeight: 'bold',
                      },
                    }}
                    helperText="أدخل الرمز المكون من 6 أرقام"
                    sx={{
                      '& .MuiInputBase-input': {
                        direction: 'ltr',
                        textAlign: 'center',
                      },
                    }}
                  />

                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setPhoneUpdateStep('input');
                      setPhoneOtpCode('');
                    }}
                    disabled={phoneUpdateLoading}
                    sx={{ mt: 2 }}
                  >
                    ← العودة لتغيير الرقم
                  </Button>
                </>
              )}

              {/* الخطوة 3: النجاح */}
              {phoneUpdateStep === 'success' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  تم تحديث رقم الهاتف بنجاح! سيتم إعادة تحميل الصفحة...
                </Alert>
              )}
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
              {phoneUpdateStep === 'input' && (
                <>
                  <Button
                    onClick={handleSendPhoneOtp}
                    variant="contained"
                    disabled={phoneUpdateLoading || !newPhone.trim()}
                    sx={{ borderRadius: 2, minWidth: 150 }}
                  >
                    {phoneUpdateLoading ? <CircularProgress size={24} /> : 'إرسال رمز التحقق'}
                  </Button>
                  <Button
                    onClick={handleClosePhoneModal}
                    variant="outlined"
                    disabled={phoneUpdateLoading}
                    sx={{ borderRadius: 2 }}
                  >
                    إلغاء
                  </Button>
                </>
              )}

              {phoneUpdateStep === 'otp' && (
                <>
                  <Button
                    onClick={handleVerifyPhoneOtp}
                    variant="contained"
                    color="success"
                    disabled={phoneUpdateLoading || phoneOtpCode.length < 6}
                    sx={{ borderRadius: 2, minWidth: 150 }}
                  >
                    {phoneUpdateLoading ? <CircularProgress size={24} /> : 'تأكيد وتحديث'}
                  </Button>
                  <Button
                    onClick={handleClosePhoneModal}
                    variant="outlined"
                    disabled={phoneUpdateLoading}
                    sx={{ borderRadius: 2 }}
                  >
                    إلغاء
                  </Button>
                </>
              )}
            </DialogActions>
          </Dialog>

          {/* نافذة حذف العضو */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false);
              setDeleteAffectedChildren([]);
            }}
          >
            <DialogTitle sx={{ color: deleteAffectedChildren.length > 0 ? '#d32f2f' : 'inherit' }}>
              {deleteAffectedChildren.length > 0 ? '⚠️ تحذير - حذف مع أبناء' : 'تأكيد الحذف'}
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                هل أنت متأكد من حذف هذا العضو؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogContentText>

              {/* تحذير الأبناء المتأثرين */}
              {deleteAffectedChildren.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    ⚠️ هذا الشخص لديه {deleteAffectedChildren.length} من الأبناء/المرتبطين:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {deleteAffectedChildren.slice(0, 5).map((child, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">
                          {child.firstName} {child.fatherName} ({child.relation})
                        </Typography>
                      </li>
                    ))}
                    {deleteAffectedChildren.length > 5 && (
                      <li>
                        <Typography variant="body2" color="text.secondary">
                          ... و {deleteAffectedChildren.length - 5} آخرين
                        </Typography>
                      </li>
                    )}
                  </Box>
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    سيتم فقط حذف هذا الشخص. الأبناء سيبقون لكن قد يحتاجون تحديث.
                  </Typography>
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteAffectedChildren([]);
                }}
              >
                إلغاء
              </Button>
              <Button onClick={confirmDelete} color="error" variant="contained">
                {deleteAffectedChildren.length > 0 ? 'حذف على أي حال' : 'حذف'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* ✅ نافذة تأكيد الربط بشخص موجود */}
          <Dialog open={confirmLinkDialogOpen} onClose={handleCancelLink} maxWidth="sm" fullWidth>
            <DialogTitle
              sx={{
                bgcolor: '#e3f2fd',
                color: '#1565c0',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              🔗 وجدنا{' '}
              {pendingAllMatches.length > 1 ? `${pendingAllMatches.length} أشخاص` : 'شخصاً'} مطابقاً
              في الشجرة!
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              {pendingExistingPerson && (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight="bold">
                      هل أنت نفس هذا الشخص؟
                    </Typography>
                    {pendingAllMatches.length > 1 && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        ⚠️ يوجد {pendingAllMatches.length} أشخاص بنفس الاسم - تصفح للتأكد
                      </Typography>
                    )}
                  </Alert>

                  {/* أزرار التنقل إذا كان هناك عدة مطابقات */}
                  {pendingAllMatches.length > 1 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={selectedMatchIndex === 0}
                        onClick={() => setSelectedMatchIndex((prev) => prev - 1)}
                      >
                        ◀ السابق
                      </Button>
                      <Chip
                        label={`${selectedMatchIndex + 1} من ${pendingAllMatches.length}`}
                        color="primary"
                        variant="outlined"
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={selectedMatchIndex === pendingAllMatches.length - 1}
                        onClick={() => setSelectedMatchIndex((prev) => prev + 1)}
                      >
                        التالي ▶
                      </Button>
                    </Box>
                  )}

                  {/* بطاقة الشخص المختار */}
                  {(() => {
                    const displayPerson =
                      pendingAllMatches.length > 1
                        ? pendingAllMatches[selectedMatchIndex]
                        : pendingExistingPerson;
                    return (
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          bgcolor: '#f5f5f5',
                          border: '2px solid #1976d2',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="h6" color="primary" gutterBottom>
                          👤 {displayPerson.first_name} {displayPerson.father_name}
                        </Typography>

                        {displayPerson.grandfather_name && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>🧓 الجد:</strong> {displayPerson.grandfather_name}
                          </Typography>
                        )}

                        {displayPerson.family_name && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>🏠 العائلة:</strong> {displayPerson.family_name}
                          </Typography>
                        )}

                        {displayPerson.relation && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>👥 العلاقة:</strong> {displayPerson.relation}
                          </Typography>
                        )}

                        {displayPerson.birth_date && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#1976d2',
                              fontWeight: 'bold',
                              bgcolor: '#e3f2fd',
                              p: 0.5,
                              borderRadius: 1,
                              mt: 1,
                            }}
                          >
                            🎂 تاريخ الميلاد: {displayPerson.birth_date}
                          </Typography>
                        )}

                        {!displayPerson.birth_date && !displayPerson.grandfather_name && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              ⚠️ لا توجد معلومات إضافية للتمييز (الجد/تاريخ الميلاد)
                            </Typography>
                          </Alert>
                        )}
                      </Paper>
                    );
                  })()}

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2, textAlign: 'center' }}
                  >
                    إذا كنت أنت هذا الشخص، اضغط <strong>"نعم"</strong> لربط حسابك به.
                    <br />
                    إذا كنت شخصاً مختلفاً بنفس الاسم، اضغط <strong>"لا"</strong> لإنشاء سجل جديد.
                  </Typography>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button onClick={handleCancelLink} color="inherit" disabled={loading}>
                إلغاء
              </Button>
              <Button
                onClick={handleRejectLink}
                color="warning"
                variant="outlined"
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : '❌ لا، أنا شخص مختلف'}
              </Button>
              <Button
                onClick={handleConfirmLink}
                color="primary"
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : '✅ نعم، أنا هذا الشخص'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* قائمة الإعدادات */}
          <Menu
            anchorEl={settingsAnchor}
            open={Boolean(settingsAnchor)}
            onClose={handleSettingsClose}
          >
            {/* لوحة المدير - تظهر للمدير فقط */}
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  navigate('/admin');
                  handleSettingsClose();
                }}
              >
                <AdminIcon sx={{ mr: 1, color: '#8b5cf6' }} />
                لوحة تحكم المدير
              </MenuItem>
            )}
            {isAdmin && <Divider />}
            <MenuItem
              onClick={() => {
                const message = `أنضم إلينا في شجرة القبيلة! يمكنك الآن إدارة وعرض شجرة قبيلتك بسهولة. الرابط: ${window.location.origin}`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
                handleSettingsClose();
              }}
            >
              <WhatsAppIcon sx={{ mr: 1, color: '#25d366' }} />
              مشاركة عبر واتساب
            </MenuItem>
            <Divider />
            {/* عرض رقم الهاتف المسجل */}
            <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50', borderRadius: 1, mx: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                رقم الهاتف المسجل:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 'bold', direction: 'ltr', textAlign: 'right' }}
              >
                {phone || 'غير متوفر'}
              </Typography>
            </Box>
            <MenuItem
              onClick={() => {
                const currentPhone = phone || '';
                const localPhone = currentPhone.startsWith('+964')
                  ? '0' + currentPhone.substring(4)
                  : currentPhone;
                setNewPhone(localPhone);
                setPhoneModalOpen(true);
                handleSettingsClose();
              }}
            >
              <PhoneIphoneIcon sx={{ mr: 1 }} />
              تغيير رقم الهاتف
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                navigate('/settings');
                handleSettingsClose();
              }}
            >
              <SettingsIcon sx={{ mr: 1, color: '#6b7280' }} />
              إعدادات الحساب
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                handleLogout();
                handleSettingsClose();
              }}
            >
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
            sx={{ mb: isMobile ? 8 : 0 }}
          >
            <Alert
              onClose={() => setSnackbarOpen(false)}
              severity={snackbarSeverity}
              sx={{ width: '100%', borderRadius: 2 }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>

          {/* مسافة سفلية للقائمة على الهاتف */}
          {isMobile && <Box sx={{ height: 80 }} />}
        </>
      )}
    </Container>
  );
}
