// src/pages/AdminPanel.jsx - لوحة تحكم المدير
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, IconButton,
  Card, CardContent, CardActions, Divider, Alert,
  CircularProgress, Snackbar, List, ListItem, ListItemText,
  ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip
} from '@mui/material';

// الأيقونات
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LinkIcon from '@mui/icons-material/Link';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';

import { useTribe } from '../contexts/TribeContext';
import { 
  getUnlinkedRoots, 
  mergeRoots, 
  cleanDuplicateRelations,
  findDuplicatePersons,
  mergePersons
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
