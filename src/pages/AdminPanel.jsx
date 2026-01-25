// src/pages/AdminPanel.jsx - لوحة تحكم المدير
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Tooltip from '@mui/material/Tooltip';

// الأيقونات
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LinkIcon from '@mui/icons-material/Link';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import PeopleIcon from '@mui/icons-material/People';
import BuildIcon from '@mui/icons-material/Build';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import TextField from '@mui/material/TextField';

import { useTribe } from '../contexts/TribeContext';
import { 
  getUnlinkedRoots, 
  mergeRoots, 
  cleanDuplicateRelations,
  findDuplicatePersons,
  mergePersons,
  analyzeTreeHealth,
  getTribeUsers,
  updateUserRole,
  updateUserStatus,
  removeUserFromTribe,
  getAuditLogs,
  getTribeSettings,
  updateTribeSettings,
  uploadTribeLogo
} from '../services/tribeService';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { tribe, isAdmin } = useTribe();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // التبويب الحالي
  const [activeTab, setActiveTab] = useState(0);
  
  // الحالات
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  // ربط الجذور
  const [rootsDialogOpen, setRootsDialogOpen] = useState(false);
  const [unlinkedRoots, setUnlinkedRoots] = useState([]);
  const [selectedChildRoot, setSelectedChildRoot] = useState(null);
  const [linking, setLinking] = useState(false);
  
  // الأشخاص المكررين
  const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [merging, setMerging] = useState(false);

  // إدارة المستخدمين
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', user: null });
  
  // سجل التعديلات
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  
  // إعدادات القبيلة
  const [tribeSettings, setTribeSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // فحص صحة الشجرة
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [healthReport, setHealthReport] = useState(null);

  // التحقق من صلاحية المدير
  if (!isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <SecurityIcon sx={{ fontSize: 100, color: '#ef4444', mb: 2 }} />
        <Typography variant="h4" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif', color: '#ef4444' }}>
          🚫 غير مصرح
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif', color: 'text.secondary' }}>
          هذه الصفحة متاحة للمدير فقط
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/tree')}
          sx={{ fontFamily: 'Cairo, sans-serif' }}
        >
          العودة للشجرة
        </Button>
      </Container>
    );
  }

  const showMessage = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // ========================================
  // 1️⃣ ربط الجذور المنفصلة
  // ========================================
  const handleOpenRootsDialog = async () => {
    if (!tribe?.id) return;
    
    setLoading(true);
    try {
      const roots = await getUnlinkedRoots(tribe.id);
      if (roots.length <= 1) {
        showMessage('✅ الشجرة مرتبطة بشكل صحيح!', 'success');
        return;
      }
      setUnlinkedRoots(roots);
      setRootsDialogOpen(true);
    } catch {
      showMessage('❌ خطأ في جلب الجذور', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkRoots = async (childId, parentId) => {
    if (!tribe?.id) return;
    
    setLinking(true);
    try {
      await mergeRoots(tribe.id, childId, parentId);
      showMessage('✅ تم الربط بنجاح!', 'success');
      setRootsDialogOpen(false);
      setSelectedChildRoot(null);
    } catch {
      showMessage('❌ خطأ في الربط', 'error');
    } finally {
      setLinking(false);
    }
  };

  // ========================================
  // 2️⃣ تنظيف العلاقات المكررة
  // ========================================
  const handleCleanDuplicates = async () => {
    if (!tribe?.id) return;
    
    setLoading(true);
    try {
      const result = await cleanDuplicateRelations(tribe.id);
      if (result.deleted > 0) {
        showMessage(`🧹 تم حذف ${result.deleted} علاقة مكررة!`, 'success');
      } else {
        showMessage('✅ لا توجد علاقات مكررة', 'info');
      }
    } catch {
      showMessage('❌ خطأ في التنظيف', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 3️⃣ إدارة الأشخاص المكررين
  // ========================================
  const handleOpenDuplicatesDialog = async () => {
    if (!tribe?.id) return;
    
    setLoading(true);
    try {
      const result = await findDuplicatePersons(tribe.id);
      if (result.length === 0) {
        showMessage('✅ لا يوجد أشخاص مكررين', 'success');
        return;
      }
      setDuplicates(result);
      setDuplicatesDialogOpen(true);
    } catch {
      showMessage('❌ خطأ في البحث عن المكررين', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMergePersons = async (keepId, mergeId) => {
    if (!tribe?.id) return;
    
    setMerging(true);
    try {
      await mergePersons(tribe.id, keepId, mergeId);
      showMessage('✅ تم دمج الشخصين بنجاح!', 'success');
      // تحديث القائمة
      const result = await findDuplicatePersons(tribe.id);
      setDuplicates(result);
      if (result.length === 0) {
        setDuplicatesDialogOpen(false);
      }
    } catch (err) {
      showMessage(`❌ خطأ في الدمج: ${err.message}`, 'error');
    } finally {
      setMerging(false);
    }
  };

  // ========================================
  // 4️⃣ فحص صحة الشجرة
  // ========================================
  const handleAnalyzeTree = async () => {
    if (!tribe?.id) return;
    
    setLoading(true);
    try {
      const report = await analyzeTreeHealth(tribe.id);
      setHealthReport(report);
      setHealthDialogOpen(true);
    } catch {
      showMessage('❌ خطأ في تحليل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 5️⃣ إدارة المستخدمين
  // ========================================
  
  // جلب المستخدمين عند فتح التبويب
  useEffect(() => {
    if (activeTab === 1 && tribe?.id) {
      loadUsers();
    }
  }, [activeTab, tribe?.id]);

  const loadUsers = async () => {
    if (!tribe?.id) return;
    setUsersLoading(true);
    try {
      const data = await getTribeUsers(tribe.id);
      setUsers(data);
    } catch {
      showMessage('❌ خطأ في جلب المستخدمين', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(tribe.id, userId, newRole);
      showMessage('✅ تم تغيير الصلاحية', 'success');
      loadUsers(); // تحديث القائمة
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    }
  };

  const handleStatusToggle = async (user) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    try {
      await updateUserStatus(tribe.id, user.id, newStatus);
      showMessage(newStatus === 'blocked' ? '🚫 تم حظر المستخدم' : '✅ تم تفعيل المستخدم', 'success');
      loadUsers();
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    }
  };

  const handleRemoveUser = async () => {
    if (!confirmDialog.user) return;
    try {
      await removeUserFromTribe(tribe.id, confirmDialog.user.id);
      showMessage('✅ تم حذف المستخدم', 'success');
      setConfirmDialog({ open: false, type: '', user: null });
      loadUsers();
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    }
  };

  // الحصول على اسم المستخدم
  const getUserDisplayName = (user) => {
    if (user.persons) {
      const p = user.persons;
      return `${p.first_name || ''} ${p.father_name || ''} ${p.family_name || ''}`.trim() || 'غير معروف';
    }
    return user.phone || 'مستخدم';
  };

  // الحصول على لون الصلاحية
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'contributor': return 'primary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  // ترجمة الصلاحية
  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'moderator': return 'مشرف';
      case 'contributor': return 'مساهم';
      case 'viewer': return 'مشاهد';
      default: return role;
    }
  };

  // ========================================
  // 6️⃣ سجل التعديلات
  // ========================================
  
  useEffect(() => {
    if (activeTab === 2 && tribe?.id) {
      loadAuditLogs();
    }
  }, [activeTab, tribe?.id]);

  const loadAuditLogs = async () => {
    if (!tribe?.id) return;
    setAuditLoading(true);
    try {
      const data = await getAuditLogs(tribe.id, { limit: 100 });
      setAuditLogs(data);
    } catch {
      showMessage('❌ خطأ في جلب سجل التعديلات', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'create': return { label: 'إضافة', color: 'success', icon: <AddIcon fontSize="small" /> };
      case 'update': return { label: 'تعديل', color: 'warning', icon: <EditIcon fontSize="small" /> };
      case 'delete': return { label: 'حذف', color: 'error', icon: <DeleteIcon fontSize="small" /> };
      default: return { label: action, color: 'default', icon: null };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ========================================
  // 7️⃣ إعدادات القبيلة
  // ========================================
  
  useEffect(() => {
    if (activeTab === 3 && tribe?.id) {
      loadTribeSettings();
    }
  }, [activeTab, tribe?.id]);

  const loadTribeSettings = async () => {
    if (!tribe?.id) return;
    setSettingsLoading(true);
    try {
      const data = await getTribeSettings(tribe.id);
      setTribeSettings(data);
      setSettingsForm({
        name: data.name || '',
        name_en: data.name_en || '',
        description: data.description || '',
        location: data.location || '',
        established_year: data.established_year || ''
      });
    } catch {
      showMessage('❌ خطأ في جلب الإعدادات', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!tribe?.id) return;
    setSettingsLoading(true);
    try {
      await updateTribeSettings(tribe.id, settingsForm);
      showMessage('✅ تم حفظ الإعدادات', 'success');
      setEditingSettings(false);
      loadTribeSettings();
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !tribe?.id) return;
    
    setUploadingLogo(true);
    try {
      await uploadTribeLogo(tribe.id, file);
      showMessage('✅ تم رفع الشعار', 'success');
      loadTribeSettings();
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, pb: 12, px: { xs: 2, sm: 3 } }}>
      {/* الهيدر */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        gap: { xs: 2, sm: 0 },
        mb: { xs: 3, sm: 4 } 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <AdminPanelSettingsIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#8b5cf6', mr: 1 }} />
          <Box flex={1}>
            <Typography variant="h4" sx={{ 
              fontFamily: 'Cairo, sans-serif', 
              fontWeight: 'bold', 
              color: '#8b5cf6',
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}>
              لوحة تحكم المدير
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
              أدوات إدارة الشجرة والبيانات
            </Typography>
          </Box>
          {!isMobile && <Box sx={{ flexGrow: 1 }} />}
          <Chip 
            icon={<SecurityIcon />} 
            label="مدير" 
            color="secondary" 
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontFamily: 'Cairo, sans-serif', ml: { xs: 'auto', sm: 0 } }}
          />
        </Box>
      </Box>

      {/* التبويبات */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              fontFamily: 'Cairo, sans-serif',
              fontWeight: 'bold',
              fontSize: { xs: '0.8rem', sm: '1rem' }
            }
          }}
        >
          <Tab icon={<BuildIcon />} label="الأدوات" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="المستخدمين" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="السجل" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="الإعدادات" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ====== تبويب الأدوات ====== */}
      {activeTab === 0 && (
        <>
          {/* التنبيه */}
          <Alert severity="warning" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            ⚠️ هذه الصفحة تحتوي على أدوات متقدمة. استخدمها بحذر!
          </Alert>

          {/* البطاقات */}
          <Box sx={{ display: 'grid', gap: { xs: 2, sm: 3 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            
            {/* بطاقة ربط الجذور */}
            <Card elevation={3} sx={{ borderRadius: 3, border: '2px solid #f59e0b' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LinkIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#f59e0b', mr: { xs: 1, sm: 2 } }} />
                  <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    ربط الجذور المنفصلة
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  إذا كان هناك أشخاص في الشجرة بدون والد، يمكنك ربطهم بوالد موجود لتوحيد الشجرة.
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button 
                  variant="contained"
                  onClick={handleOpenRootsDialog}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
                  sx={{ 
                    fontFamily: 'Cairo, sans-serif',
                    background: 'linear-gradient(45deg, #f59e0b 0%, #d97706 100%)',
                    '& .MuiButton-startIcon': { ml: 1 },
              }}
            >
              فتح أداة الربط
            </Button>
          </CardActions>
        </Card>

        {/* بطاقة تنظيف العلاقات */}
        <Card elevation={3} sx={{ borderRadius: 3, border: '2px solid #ef4444' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CleaningServicesIcon sx={{ fontSize: 40, color: '#ef4444', mr: 2 }} />
              <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>
                تنظيف العلاقات المكررة
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary', mb: 2 }}>
              يبحث عن علاقات مكررة (شخص له أكثر من والد) ويحذف التكرارات تلقائياً.
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button 
              variant="contained"
              onClick={handleCleanDuplicates}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CleaningServicesIcon />}
              sx={{ 
                fontFamily: 'Cairo, sans-serif',
                background: 'linear-gradient(45deg, #ef4444 0%, #dc2626 100%)',
                '& .MuiButton-startIcon': { ml: 1 },
              }}
            >
              تنظيف الآن
            </Button>
          </CardActions>
        </Card>

        {/* بطاقة دمج المكررين */}
        <Card elevation={3} sx={{ borderRadius: 3, border: '2px solid #8b5cf6' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MergeTypeIcon sx={{ fontSize: 40, color: '#8b5cf6', mr: 2 }} />
              <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>
                دمج الأشخاص المكررين
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary', mb: 2 }}>
              يبحث عن أشخاص لديهم نفس الاسم ويتيح لك دمجهم في شخص واحد.
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button 
              variant="contained"
              onClick={handleOpenDuplicatesDialog}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <MergeTypeIcon />}
              sx={{ 
                fontFamily: 'Cairo, sans-serif',
                background: 'linear-gradient(45deg, #8b5cf6 0%, #7c3aed 100%)',
                '& .MuiButton-startIcon': { ml: 1 },
              }}
            >
              البحث عن المكررين
            </Button>
          </CardActions>
        </Card>

        {/* بطاقة إعادة التحميل */}
        <Card elevation={3} sx={{ borderRadius: 3, border: '2px solid #10b981' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <RefreshIcon sx={{ fontSize: 40, color: '#10b981', mr: 2 }} />
              <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>
                تحديث الشجرة
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary', mb: 2 }}>
              بعد إجراء أي تعديلات، يُنصح بالذهاب للشجرة وتحديثها لرؤية التغييرات.
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button 
              variant="contained"
              onClick={() => navigate('/tree')}
              startIcon={<RefreshIcon />}
              sx={{ 
                fontFamily: 'Cairo, sans-serif',
                background: 'linear-gradient(45deg, #10b981 0%, #059669 100%)',
                '& .MuiButton-startIcon': { ml: 1 },
              }}
            >
              الذهاب للشجرة
            </Button>
          </CardActions>
        </Card>

        {/* بطاقة فحص صحة الشجرة */}
        <Card elevation={3} sx={{ borderRadius: 3, border: '2px solid #3b82f6', gridColumn: { md: 'span 2' } }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HealthAndSafetyIcon sx={{ fontSize: 40, color: '#3b82f6', mr: 2 }} />
              <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>
                📊 فحص صحة الشجرة
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary', mb: 2 }}>
              تحليل شامل للشجرة: عدد الأشخاص، الجذور، المكررين، العمق، والمشاكل المحتملة.
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button 
              variant="contained"
              onClick={handleAnalyzeTree}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <HealthAndSafetyIcon />}
              sx={{ 
                fontFamily: 'Cairo, sans-serif',
                background: 'linear-gradient(45deg, #3b82f6 0%, #2563eb 100%)',
                '& .MuiButton-startIcon': { ml: 1 },
              }}
            >
              فحص الآن
            </Button>
          </CardActions>
        </Card>
          </Box>
        </>
      )}

      {/* ====== تبويب المستخدمين ====== */}
      {activeTab === 1 && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon color="primary" />
              مستخدمي القبيلة ({users.length})
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={loadUsers}
              disabled={usersLoading}
              sx={{ fontFamily: 'Cairo, sans-serif', '& .MuiButton-startIcon': { ml: 1 } }}
            >
              تحديث
            </Button>
          </Box>

          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Alert severity="info" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              لا يوجد مستخدمين مسجلين
            </Alert>
          ) : (
            <TableContainer>
              <Table size={isMobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>المستخدم</TableCell>
                    <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>الصلاحية</TableCell>
                    <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar 
                            src={user.persons?.photo_url} 
                            sx={{ width: 36, height: 36, bgcolor: user.persons?.gender === 'F' ? '#ec4899' : '#3b82f6' }}
                          >
                            {getUserDisplayName(user).charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>
                              {getUserDisplayName(user)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                              {user.phone || 'بدون رقم'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            sx={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem' }}
                          >
                            <MenuItem value="admin" sx={{ fontFamily: 'Cairo, sans-serif' }}>🔴 مدير</MenuItem>
                            <MenuItem value="moderator" sx={{ fontFamily: 'Cairo, sans-serif' }}>🟡 مشرف</MenuItem>
                            <MenuItem value="contributor" sx={{ fontFamily: 'Cairo, sans-serif' }}>🔵 مساهم</MenuItem>
                            <MenuItem value="viewer" sx={{ fontFamily: 'Cairo, sans-serif' }}>⚪ مشاهد</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.status === 'active' ? 'نشط' : user.status === 'blocked' ? 'محظور' : 'معلق'}
                          color={user.status === 'active' ? 'success' : user.status === 'blocked' ? 'error' : 'warning'}
                          sx={{ fontFamily: 'Cairo, sans-serif' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={user.status === 'active' ? 'حظر' : 'تفعيل'}>
                            <IconButton
                              size="small"
                              color={user.status === 'active' ? 'error' : 'success'}
                              onClick={() => handleStatusToggle(user)}
                            >
                              {user.status === 'active' ? <BlockIcon /> : <CheckIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف من القبيلة">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setConfirmDialog({ open: true, type: 'delete', user })}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* دليل الصلاحيات */}
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', mb: 1 }}>
              📋 دليل الصلاحيات:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="caption" sx={{ fontFamily: 'Cairo, sans-serif' }}>🔴 <strong>مدير:</strong> كل الصلاحيات</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'Cairo, sans-serif' }}>🟡 <strong>مشرف:</strong> إضافة وتعديل</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'Cairo, sans-serif' }}>🔵 <strong>مساهم:</strong> إضافة فقط</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'Cairo, sans-serif' }}>⚪ <strong>مشاهد:</strong> عرض فقط</Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* ====== تبويب سجل التعديلات ====== */}
      {activeTab === 2 && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon color="primary" />
              سجل التعديلات ({auditLogs.length})
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={loadAuditLogs}
              disabled={auditLoading}
              sx={{ fontFamily: 'Cairo, sans-serif', '& .MuiButton-startIcon': { ml: 1 } }}
            >
              تحديث
            </Button>
          </Box>

          {auditLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : auditLogs.length === 0 ? (
            <Alert severity="info" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              لا توجد تعديلات مسجلة بعد
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f3f4f6' }}>
                    <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>التفاصيل</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => {
                    const actionInfo = getActionLabel(log.action);
                    const personName = log.new_data?.first_name || log.old_data?.first_name || 'غير معروف';
                    return (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {formatDate(log.changed_at)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={actionInfo.icon}
                            label={actionInfo.label}
                            color={actionInfo.color}
                            size="small"
                            sx={{ fontFamily: 'Cairo, sans-serif' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem' }}>
                          {log.action === 'create' && `تمت إضافة "${personName}"`}
                          {log.action === 'update' && `تم تعديل "${personName}"`}
                          {log.action === 'delete' && `تم حذف "${personName}"`}
                          {log.notes && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{log.notes}</Typography>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ====== تبويب إعدادات القبيلة ====== */}
      {activeTab === 3 && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, color: '#1f2937' }}>
              <SettingsIcon color="primary" />
              إعدادات القبيلة
            </Typography>
            {!editingSettings && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setEditingSettings(true)}
                sx={{ fontFamily: 'Cairo, sans-serif', '& .MuiButton-startIcon': { ml: 1 } }}
              >
                تعديل
              </Button>
            )}
          </Box>

          {settingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : tribeSettings ? (
            <Box>
              {/* الشعار */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4, p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                <Avatar
                  src={tribeSettings.logo_url}
                  sx={{ width: 100, height: 100, fontSize: '2rem', bgcolor: '#8b5cf6' }}
                >
                  {tribeSettings.name?.[0] || '🏠'}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', color: '#1f2937' }}>
                    {tribeSettings.name}
                  </Typography>
                  {tribeSettings.name_en && (
                    <Typography variant="body2" color="text.secondary">
                      {tribeSettings.name_en}
                    </Typography>
                  )}
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="logo-upload"
                    type="file"
                    onChange={handleLogoUpload}
                  />
                  <label htmlFor="logo-upload">
                    <Button
                      component="span"
                      size="small"
                      startIcon={uploadingLogo ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
                      disabled={uploadingLogo}
                      sx={{ mt: 1, fontFamily: 'Cairo, sans-serif', '& .MuiButton-startIcon': { ml: 1 } }}
                    >
                      تغيير الشعار
                    </Button>
                  </label>
                </Box>
              </Box>

              {/* النموذج */}
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  label="اسم القبيلة"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  disabled={!editingSettings}
                  fullWidth
                  InputProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                  InputLabelProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                />
                <TextField
                  label="الاسم بالإنجليزية"
                  value={settingsForm.name_en}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name_en: e.target.value })}
                  disabled={!editingSettings}
                  fullWidth
                  InputProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                  InputLabelProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                />
                <TextField
                  label="الوصف"
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  disabled={!editingSettings}
                  fullWidth
                  multiline
                  rows={3}
                  InputProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                  InputLabelProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField
                    label="الموقع"
                    value={settingsForm.location}
                    onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                    disabled={!editingSettings}
                    fullWidth
                    InputProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                    InputLabelProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                  />
                  <TextField
                    label="سنة التأسيس"
                    value={settingsForm.established_year}
                    onChange={(e) => setSettingsForm({ ...settingsForm, established_year: e.target.value })}
                    disabled={!editingSettings}
                    type="number"
                    fullWidth
                    InputProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                    InputLabelProps={{ sx: { fontFamily: 'Cairo, sans-serif' } }}
                  />
                </Box>
              </Box>

              {/* أزرار الحفظ */}
              {editingSettings && (
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSettings}
                    disabled={settingsLoading}
                    sx={{ fontFamily: 'Cairo, sans-serif', '& .MuiButton-startIcon': { ml: 1 } }}
                  >
                    حفظ التغييرات
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditingSettings(false);
                      loadTribeSettings(); // إعادة تحميل القيم الأصلية
                    }}
                    sx={{ fontFamily: 'Cairo, sans-serif' }}
                  >
                    إلغاء
                  </Button>
                </Box>
              )}

              {/* معلومات إضافية */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                    تاريخ الإنشاء
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                    {formatDate(tribeSettings.created_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                    آخر تحديث
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                    {formatDate(tribeSettings.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : (
            <Alert severity="error" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              لم يتم العثور على بيانات القبيلة
            </Alert>
          )}
        </Paper>
      )}

      {/* ================================================= */}
      {/* نافذة تأكيد الحذف */}
      {/* ================================================= */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: '', user: null })}
        dir="rtl"
      >
        <DialogTitle sx={{ fontFamily: 'Cairo, sans-serif' }}>
          ⚠️ تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: 'Cairo, sans-serif' }}>
            هل أنت متأكد من حذف المستخدم "{confirmDialog.user ? getUserDisplayName(confirmDialog.user) : ''}" من القبيلة؟
          </Typography>
          <Alert severity="warning" sx={{ mt: 2, fontFamily: 'Cairo, sans-serif' }}>
            سيتم حذف المستخدم نهائياً ولن يتمكن من الوصول للقبيلة.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, type: '', user: null })} sx={{ fontFamily: 'Cairo, sans-serif' }}>
            إلغاء
          </Button>
          <Button onClick={handleRemoveUser} color="error" variant="contained" sx={{ fontFamily: 'Cairo, sans-serif' }}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================= */}
      {/* نافذة ربط الجذور */}
      {/* ================================================= */}
      <Dialog 
        open={rootsDialogOpen} 
        onClose={() => {
          setRootsDialogOpen(false);
          setSelectedChildRoot(null);
        }}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle sx={{ fontFamily: 'Cairo, sans-serif', textAlign: 'center' }}>
          🔗 ربط الأشخاص المنفصلين
        </DialogTitle>
        <DialogContent>
          {unlinkedRoots.length > 1 && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                يوجد {unlinkedRoots.length} أشخاص بدون والد في الشجرة. اختر الشخص الابن ثم الوالد لربطهم.
              </Alert>
              
              {!selectedChildRoot ? (
                <>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                    1️⃣ اختر الشخص (الابن):
                  </Typography>
                  <List>
                    {unlinkedRoots.map((person) => (
                      <ListItem key={person.id} disablePadding>
                        <ListItemButton 
                          onClick={() => setSelectedChildRoot(person)}
                          sx={{ borderRadius: 2, mb: 0.5 }}
                        >
                          <ListItemText 
                            primary={`${person.first_name || ''} ${person.father_name || ''} ${person.family_name || ''}`}
                            secondary={person.relation || 'غير محدد'}
                            primaryTypographyProps={{ fontFamily: 'Cairo, sans-serif' }}
                            secondaryTypographyProps={{ fontFamily: 'Cairo, sans-serif' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              ) : (
                <>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                    ✅ الابن المختار: {selectedChildRoot.first_name} {selectedChildRoot.father_name}
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={() => setSelectedChildRoot(null)}
                    sx={{ mb: 2 }}
                  >
                    تغيير
                  </Button>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                    2️⃣ اختر الوالد:
                  </Typography>
                  <List>
                    {unlinkedRoots
                      .filter(p => p.id !== selectedChildRoot.id)
                      .map((person) => (
                        <ListItem key={person.id} disablePadding>
                          <ListItemButton 
                            onClick={() => handleLinkRoots(selectedChildRoot.id, person.id)}
                            disabled={linking}
                            sx={{ 
                              borderRadius: 2, 
                              mb: 0.5,
                              bgcolor: 'rgba(16,185,129,0.1)',
                              '&:hover': { bgcolor: 'rgba(16,185,129,0.2)' }
                            }}
                          >
                            <ListItemText 
                              primary={`${person.first_name || ''} ${person.father_name || ''} ${person.family_name || ''}`}
                              secondary={`اضغط لجعله والد ${selectedChildRoot.first_name}`}
                              primaryTypographyProps={{ fontFamily: 'Cairo, sans-serif' }}
                              secondaryTypographyProps={{ fontFamily: 'Cairo, sans-serif', color: 'success.main' }}
                            />
                            {linking && <CircularProgress size={20} />}
                          </ListItemButton>
                        </ListItem>
                      ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setRootsDialogOpen(false);
              setSelectedChildRoot(null);
            }}
            sx={{ fontFamily: 'Cairo, sans-serif' }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================= */}
      {/* نافذة الأشخاص المكررين */}
      {/* ================================================= */}
      <Dialog 
        open={duplicatesDialogOpen} 
        onClose={() => setDuplicatesDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle sx={{ fontFamily: 'Cairo, sans-serif', textAlign: 'center' }}>
          👥 الأشخاص المكررين ({duplicates.length} مجموعة)
        </DialogTitle>
        <DialogContent>
          {duplicates.map((group, index) => (
            <Paper key={group.key} sx={{ p: 2, mb: 2, bgcolor: 'rgba(139,92,246,0.05)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontFamily: 'Cairo, sans-serif', mb: 1 }}>
                {index + 1}. {group.name}
              </Typography>
              <List dense>
                {group.persons.map((person, pIndex) => (
                  <ListItem 
                    key={person.id}
                    secondaryAction={
                      pIndex > 0 && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => handleMergePersons(group.persons[0].id, person.id)}
                          disabled={merging}
                          sx={{ fontFamily: 'Cairo, sans-serif' }}
                        >
                          {merging ? <CircularProgress size={16} /> : 'دمج مع الأول'}
                        </Button>
                      )
                    }
                  >
                    <ListItemText
                      primary={`${person.first_name} ${person.father_name || ''}`}
                      secondary={`ID: ${person.id} | ${person.relation || 'غير محدد'}`}
                      primaryTypographyProps={{ fontFamily: 'Cairo, sans-serif' }}
                      secondaryTypographyProps={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem' }}
                    />
                    {pIndex === 0 && (
                      <Chip label="الأساسي" size="small" color="primary" sx={{ ml: 1 }} />
                    )}
                  </ListItem>
                ))}
              </List>
            </Paper>
          ))}
          
          {duplicates.length === 0 && (
            <Alert severity="success" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              ✅ لا يوجد أشخاص مكررين!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDuplicatesDialogOpen(false)}
            sx={{ fontFamily: 'Cairo, sans-serif' }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================= */}
      {/* نافذة فحص صحة الشجرة */}
      {/* ================================================= */}
      <Dialog 
        open={healthDialogOpen} 
        onClose={() => setHealthDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle sx={{ fontFamily: 'Cairo, sans-serif', textAlign: 'center' }}>
          📊 تقرير صحة الشجرة
        </DialogTitle>
        <DialogContent>
          {healthReport && (
            <Box>
              {/* حالة الصحة العامة */}
              <Alert 
                severity={healthReport.isHealthy ? 'success' : 'warning'} 
                icon={healthReport.isHealthy ? <CheckCircleIcon /> : <WarningIcon />}
                sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}
              >
                {healthReport.isHealthy 
                  ? '✅ الشجرة بحالة جيدة!' 
                  : '⚠️ توجد بعض المشاكل التي تحتاج معالجة'
                }
              </Alert>

              {/* الإحصائيات */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', mb: 2, fontWeight: 'bold', color: '#1e293b' }}>
                  📈 الإحصائيات
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="h4" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>{healthReport.stats.totalPersons}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: '#64748b' }}>إجمالي الأشخاص</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="h4" sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>{healthReport.stats.totalRelations}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: '#64748b' }}>العلاقات</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 'bold' }}>{healthReport.stats.maxDepth}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: '#64748b' }}>عمق الشجرة (أجيال)</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>{healthReport.stats.rootsCount}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: '#64748b' }}>عدد الجذور</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography variant="h4" sx={{ color: '#06b6d4', fontWeight: 'bold' }}>{healthReport.stats.linkedUsers}/{healthReport.stats.totalUsers}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: '#64748b' }}>مستخدمين مرتبطين</Typography>
                  </Box>
                </Box>
              </Paper>

              {/* الجذور */}
              {healthReport.roots.length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', mb: 2, fontWeight: 'bold', color: '#92400e' }}>
                    🌳 الجذور (الأشخاص بدون والد)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {healthReport.roots.map((root, i) => (
                      <Chip 
                        key={root.id} 
                        label={root.name} 
                        sx={{ 
                          bgcolor: i === 0 ? '#dcfce7' : '#fef3c7',
                          color: i === 0 ? '#166534' : '#92400e',
                          fontWeight: 'bold',
                          border: i === 0 ? '1px solid #86efac' : '1px solid #fcd34d'
                        }}
                      />
                    ))}
                  </Box>
                  {healthReport.roots.length > 1 && (
                    <Alert severity="info" sx={{ mt: 2, fontFamily: 'Cairo, sans-serif' }}>
                      💡 يوجد أكثر من جذر واحد. استخدم أداة "ربط الجذور" لتوحيد الشجرة.
                    </Alert>
                  )}
                </Paper>
              )}

              {/* المشاكل */}
              {healthReport.problems.length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', mb: 2, fontWeight: 'bold', color: '#991b1b' }}>
                    ⚠️ المشاكل المكتشفة
                  </Typography>
                  <List dense>
                    {healthReport.problems.map((problem, i) => (
                      <ListItem key={i} sx={{ bgcolor: 'white', borderRadius: 1, mb: 1, border: '1px solid #fecaca' }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {problem.severity === 'warning' ? <WarningIcon sx={{ color: '#f59e0b' }} /> : <InfoIcon sx={{ color: '#3b82f6' }} />}
                              <Typography sx={{ fontFamily: 'Cairo, sans-serif', color: '#1e293b' }}>{problem.message}</Typography>
                            </Box>
                          }
                          secondary={problem.details}
                          secondaryTypographyProps={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem', color: '#64748b' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              {/* لا توجد مشاكل */}
              {healthReport.problems.length === 0 && (
                <Alert severity="success" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                  🎉 لا توجد مشاكل! الشجرة بحالة ممتازة.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setHealthDialogOpen(false)}
            sx={{ fontFamily: 'Cairo, sans-serif' }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ fontFamily: 'Cairo, sans-serif' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
