// src/pages/AdminPanel.jsx - لوحة تحكم المدير
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, IconButton,
  Card, CardContent, CardActions, Divider, Alert,
  CircularProgress, Snackbar, List, ListItem, ListItemText,
  ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, LinearProgress
} from '@mui/material';

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

import { useTribe } from '../contexts/TribeContext';
import { 
  getUnlinkedRoots, 
  mergeRoots, 
  cleanDuplicateRelations,
  findDuplicatePersons,
  mergePersons,
  analyzeTreeHealth
} from '../services/tribeService';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { tribe, isAdmin } = useTribe();
  
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

  return (
    <Container maxWidth="md" sx={{ py: 4, pb: 12 }}>
      {/* الهيدر */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <AdminPanelSettingsIcon sx={{ fontSize: 40, color: '#8b5cf6', mr: 2 }} />
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold', color: '#8b5cf6' }}>
            لوحة تحكم المدير
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary' }}>
            أدوات إدارة الشجرة والبيانات
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Chip 
          icon={<SecurityIcon />} 
          label="مدير" 
          color="secondary" 
          sx={{ fontFamily: 'Cairo, sans-serif' }}
        />
      </Box>

      {/* التنبيه */}
      <Alert severity="warning" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
        ⚠️ هذه الصفحة تحتوي على أدوات متقدمة. استخدمها بحذر!
      </Alert>

      {/* البطاقات */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        
        {/* بطاقة ربط الجذور */}
        <Card elevation={3} sx={{ borderRadius: 3, border: '2px solid #f59e0b' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LinkIcon sx={{ fontSize: 40, color: '#f59e0b', mr: 2 }} />
              <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif', fontWeight: 'bold' }}>
                ربط الجذور المنفصلة
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif', color: 'text.secondary', mb: 2 }}>
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
              }}
            >
              فحص الآن
            </Button>
          </CardActions>
        </Card>
      </Box>

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
