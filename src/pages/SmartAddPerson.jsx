// src/pages/SmartAddPerson.jsx
// 🧠 صفحة إضافة شخص مع الربط الذكي التلقائي

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Stepper, Step, StepLabel,
  Alert, CircularProgress, Card, CardContent, Chip, Avatar,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemAvatar, ListItemText, ListItemSecondaryAction, Radio,
  Snackbar, Divider, IconButton, Tooltip, LinearProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  AccountTree as TreeIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Link as LinkIcon,
  PersonAdd as AddIcon,
  Merge as MergeIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTribe } from '../contexts/TribeContext';
import { addPersonWithSmartLinking, findPotentialFather } from '../services/smartTribeService';

// =============================================
// 🎨 ثوابت التصميم
// =============================================
const STEPS = [
  { label: 'سلسلة النسب', icon: '📜' },
  { label: 'معلومات إضافية', icon: '📝' },
  { label: 'التأكيد والربط', icon: '🔗' }
];

// =============================================
// 🧩 المكون الرئيسي
// =============================================
export default function SmartAddPerson() {
  const navigate = useNavigate();
  const { tribe, loading: tribeLoading } = useTribe();
  
  // الخطوة الحالية
  const [activeStep, setActiveStep] = useState(0);
  
  // بيانات النموذج
  const [formData, setFormData] = useState({
    firstName: '',
    fatherName: '',
    grandfatherName: '',
    greatGrandfatherName: '',
    familyName: tribe?.name || '',
    gender: 'M',
    birthDate: '',
    isAlive: true
  });
  
  // حالات
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // =============================================
  // 🔍 البحث عن الوالد المحتمل
  // =============================================
  const checkForMatches = useCallback(async () => {
    if (!tribe?.id || !formData.fatherName) return;
    
    setChecking(true);
    try {
      const matches = await findPotentialFather(
        tribe.id, 
        formData.fatherName, 
        formData.grandfatherName
      );
      setPotentialMatches(matches);
      
      // اختيار تلقائي إذا كانت الثقة عالية
      if (matches.length > 0 && matches[0].score >= 80) {
        setSelectedParent(matches[0].person);
      }
    } catch (err) {
      console.error('خطأ في البحث:', err);
    } finally {
      setChecking(false);
    }
  }, [tribe?.id, formData.fatherName, formData.grandfatherName]);

  // البحث عند تغيير اسم الأب
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.fatherName.length >= 2) {
        checkForMatches();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.fatherName, formData.grandfatherName, checkForMatches]);

  // =============================================
  // 📝 التعامل مع النموذج
  // =============================================
  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!formData.firstName.trim()) return 'الاسم الأول مطلوب';
        if (!formData.fatherName.trim()) return 'اسم الأب مطلوب';
        return null;
      case 1:
        return null; // اختياري
      case 2:
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const error = validateStep(activeStep);
    if (error) {
      setSnackbar({ open: true, message: error, severity: 'warning' });
      return;
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // =============================================
  // 💾 حفظ الشخص
  // =============================================
  const handleSubmit = async () => {
    if (!tribe?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const uid = localStorage.getItem('verifiedUid');
      
      const result = await addPersonWithSmartLinking(tribe.id, {
        ...formData,
        // إذا اختار المستخدم والداً محدداً
        ...(selectedParent && { parentId: selectedParent.id })
      }, uid);
      
      setResult(result);
      
      if (result.success) {
        setSnackbar({ 
          open: true, 
          message: result.message, 
          severity: 'success' 
        });
        
        // الانتقال للشجرة بعد 2 ثانية
        setTimeout(() => {
          navigate('/tree');
        }, 2000);
      } else if (result.error === 'duplicate') {
        setError({
          type: 'duplicate',
          message: result.message,
          existingPerson: result.existingPerson
        });
      }
    } catch (err) {
      console.error('خطأ في الحفظ:', err);
      setSnackbar({ 
        open: true, 
        message: 'حدث خطأ أثناء الحفظ', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // 🎨 عرض الخطوات
  // =============================================
  const renderStep0 = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        📜 أدخل سلسلة نسبك
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        أدخل اسمك واسم والدك وجدك. النظام سيربطك تلقائياً مع أقاربك في الشجرة.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* الاسم الأول */}
        <TextField
          fullWidth
          required
          label="الاسم الأول"
          value={formData.firstName}
          onChange={handleChange('firstName')}
          placeholder="مثال: حمزة"
          InputProps={{
            startAdornment: <PersonIcon color="primary" sx={{ mr: 1 }} />
          }}
        />

        {/* اسم الأب */}
        <TextField
          fullWidth
          required
          label="اسم الأب"
          value={formData.fatherName}
          onChange={handleChange('fatherName')}
          placeholder="مثال: علي"
          helperText={checking ? 'جاري البحث عن الوالد...' : ''}
          InputProps={{
            startAdornment: <PersonIcon color="secondary" sx={{ mr: 1 }} />,
            endAdornment: checking && <CircularProgress size={20} />
          }}
        />

        {/* عرض الوالد المحتمل */}
        {potentialMatches.length > 0 && (
          <Alert 
            severity={potentialMatches[0].score >= 70 ? 'success' : 'info'}
            icon={<LinkIcon />}
          >
            <Typography variant="subtitle2">
              {potentialMatches[0].score >= 70 
                ? '✅ تم العثور على الوالد في الشجرة!'
                : '🔍 وجدنا أشخاص قد يكونون الوالد'
              }
            </Typography>
            <Typography variant="body2">
              {potentialMatches[0].person.first_name} بن {potentialMatches[0].person.father_name}
              {' '}({Math.round(potentialMatches[0].score)}% تطابق)
            </Typography>
          </Alert>
        )}

        {/* اسم الجد */}
        <TextField
          fullWidth
          label="اسم الجد"
          value={formData.grandfatherName}
          onChange={handleChange('grandfatherName')}
          placeholder="مثال: عبد القادر"
          helperText="يساعد في التحقق من صحة الربط"
        />

        {/* اسم جد الأب */}
        <TextField
          fullWidth
          label="اسم جد الأب (اختياري)"
          value={formData.greatGrandfatherName}
          onChange={handleChange('greatGrandfatherName')}
          placeholder="مثال: محمد"
        />

        {/* اسم العائلة/القبيلة */}
        <TextField
          fullWidth
          label="اسم العائلة/القبيلة"
          value={formData.familyName}
          onChange={handleChange('familyName')}
          placeholder="مثال: الطائي"
        />
      </Box>
    </Box>
  );

  const renderStep1 = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        📝 معلومات إضافية (اختياري)
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* الجنس */}
        <FormControl fullWidth>
          <InputLabel>الجنس</InputLabel>
          <Select
            value={formData.gender}
            onChange={handleChange('gender')}
            label="الجنس"
          >
            <MenuItem value="M">👨 ذكر</MenuItem>
            <MenuItem value="F">👩 أنثى</MenuItem>
          </Select>
        </FormControl>

        {/* تاريخ الميلاد */}
        <TextField
          fullWidth
          type="date"
          label="تاريخ الميلاد"
          value={formData.birthDate}
          onChange={handleChange('birthDate')}
          InputLabelProps={{ shrink: true }}
        />

        {/* على قيد الحياة */}
        <FormControlLabel
          control={
            <Switch 
              checked={formData.isAlive} 
              onChange={handleChange('isAlive')} 
            />
          }
          label={formData.isAlive ? '🌿 على قيد الحياة' : '🕊️ متوفي'}
        />
      </Box>
    </Box>
  );

  const renderStep2 = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🔗 التأكيد والربط
      </Typography>

      {/* ملخص البيانات */}
      <Card variant="outlined" sx={{ mb: 3, bgcolor: 'primary.50' }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            📋 ملخص البيانات
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography>
              <strong>الاسم:</strong> {formData.firstName} بن {formData.fatherName}
              {formData.grandfatherName && ` بن ${formData.grandfatherName}`}
              {formData.familyName && ` ${formData.familyName}`}
            </Typography>
            <Typography>
              <strong>الجنس:</strong> {formData.gender === 'M' ? 'ذكر' : 'أنثى'}
            </Typography>
            {formData.birthDate && (
              <Typography>
                <strong>تاريخ الميلاد:</strong> {formData.birthDate}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* الربط المتوقع */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon color="primary" />
            الربط المتوقع
          </Typography>
          
          {potentialMatches.length > 0 && potentialMatches[0].score >= 70 ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="body2">
                ✅ سيتم ربطك كابن/بنت لـ <strong>{potentialMatches[0].person.first_name}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                الثقة: {Math.round(potentialMatches[0].score)}%
              </Typography>
            </Alert>
          ) : potentialMatches.length > 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                وجدنا أشخاص قد يكونون والدك، اختر الصحيح:
              </Alert>
              <List>
                {potentialMatches.slice(0, 5).map((match) => (
                  <ListItem 
                    key={match.person.id}
                    button
                    selected={selectedParent?.id === match.person.id}
                    onClick={() => setSelectedParent(match.person)}
                    sx={{ 
                      borderRadius: 1, 
                      mb: 1,
                      border: '1px solid',
                      borderColor: selectedParent?.id === match.person.id ? 'primary.main' : 'divider'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: match.score >= 70 ? 'success.main' : 'grey.400' }}>
                        {match.person.first_name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${match.person.first_name} بن ${match.person.father_name || '?'}`}
                      secondary={`التطابق: ${Math.round(match.score)}%`}
                    />
                    <Radio checked={selectedParent?.id === match.person.id} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                🆕 لم نجد "{formData.fatherName}" في الشجرة. سيتم إنشاؤه تلقائياً.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                يمكن لشخص آخر إكمال بياناته لاحقاً
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* خطأ التكرار */}
      {error?.type === 'duplicate' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            ⚠️ {error.message}
          </Typography>
          <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/tree')}>
            عرض الشجرة
          </Button>
        </Alert>
      )}
    </Box>
  );

  // =============================================
  // 🎨 الواجهة الرئيسية
  // =============================================
  if (tribeLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      {/* العنوان */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <TreeIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5">إضافة شخص للشجرة</Typography>
            <Typography variant="body2" color="text.secondary">
              {tribe?.name || 'شجرة القبيلة'}
            </Typography>
          </Box>
        </Box>

        {/* شريط التقدم */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 3 }}>
          {STEPS.map((step) => (
            <Step key={step.label}>
              <StepLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{step.icon}</span>
                  <span>{step.label}</span>
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* محتوى الخطوة */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        {activeStep === 0 && renderStep0()}
        {activeStep === 1 && renderStep1()}
        {activeStep === 2 && renderStep2()}

        {/* أزرار التنقل */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<BackIcon />}
          >
            السابق
          </Button>
          
          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<NextIcon />}
            >
              التالي
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ وربط'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* نتيجة الإضافة */}
      {result?.success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {result.message}
          </Typography>
        </Alert>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
