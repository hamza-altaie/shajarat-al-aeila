// src/pages/AddPerson.jsx
// صفحة إضافة شخص جديد مع الربط الذكي

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Grid,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Stepper, Step, StepLabel, StepContent, Chip, Avatar, Card,
  CardContent, CardActions, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Autocomplete, Divider, IconButton,
  Collapse, List, ListItem, ListItemAvatar, ListItemText,
  ListItemSecondaryAction, RadioGroup, FormControlLabel, Radio,
  Tooltip
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  ChildCare as ChildIcon,
  Face as FaceIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTribe } from '../contexts/TribeContext';
import { 
  createSmartPerson, 
  checkDuplicatePerson,
  findPotentialParent
} from '../services/tribeService';
import { validateName, validateBirthdate } from '../hooks/usePhoneAuth';

// =============================================
// 🎯 ثوابت
// =============================================
const RELATIONS = [
  { value: 'أنا', label: '🙋 أنا (صاحب الحساب)', category: 'أساسي', gender: null },
  { value: 'ابن', label: '👦 ابني', category: 'أولادي', gender: 'M' },
  { value: 'بنت', label: '👧 بنتي', category: 'أولادي', gender: 'F' },
  { value: 'أخ', label: '👨 أخي', category: 'إخوتي', gender: 'M' },
  { value: 'أخت', label: '👩 أختي', category: 'إخوتي', gender: 'F' },
  { value: 'والد', label: '👴 والدي', category: 'الآباء', gender: 'M' },
  { value: 'والدة', label: '👵 والدتي', category: 'الآباء', gender: 'F' },
  { value: 'جد', label: '🧓 جدي', category: 'الأجداد', gender: 'M' },
  { value: 'جدة', label: '👵 جدتي', category: 'الأجداد', gender: 'F' },
  { value: 'عم', label: '👨 عمي', category: 'الأعمام', gender: 'M' },
  { value: 'عمة', label: '👩 عمتي', category: 'الأعمام', gender: 'F' },
  { value: 'ابن_عم', label: '👦 ابن عمي', category: 'أبناء العم', gender: 'M' },
  { value: 'بنت_عم', label: '👧 بنت عمي', category: 'أبناء العم', gender: 'F' },
  { value: 'زوج', label: '💍 زوجي', category: 'الأزواج', gender: 'M' },
  { value: 'زوجة', label: '💍 زوجتي', category: 'الأزواج', gender: 'F' },
  { value: 'حفيد', label: '👶 حفيدي', category: 'الأحفاد', gender: 'M' },
  { value: 'حفيدة', label: '👶 حفيدتي', category: 'الأحفاد', gender: 'F' },
];

const INITIAL_FORM = {
  firstName: '',
  fatherName: '',
  grandfatherName: '',
  familyName: '',
  birthDate: '',
  gender: '',
  relation: '',
  isAlive: true,
  phone: '',
  notes: ''
};

// =============================================
// 🧩 المكون الرئيسي
// =============================================
export default function AddPerson() {
  const { tribe, loading: tribeLoading } = useTribe();
  const navigate = useNavigate();
  
  // حالات النموذج
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  
  // حالات الربط الذكي
  const [duplicates, setDuplicates] = useState([]);
  const [potentialParents, setPotentialParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  
  // حالات التحميل
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // الإشعارات
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // =============================================
  // 🔍 التحقق من التكرار والبحث عن الوالد
  // =============================================
  const checkForDuplicatesAndParents = useCallback(async () => {
    if (!tribe?.id || !form.firstName || !form.fatherName) return;
    
    setChecking(true);
    
    try {
      // البحث عن أشخاص مشابهين
      const similar = await checkDuplicatePerson(
        tribe.id,
        form.firstName,
        form.fatherName,
        form.grandfatherName
      );
      setDuplicates(similar);
      
      // البحث عن والد محتمل
      const parents = await findPotentialParent(
        tribe.id,
        form.fatherName,
        form.grandfatherName
      );
      setPotentialParents(parents);
      
      if (parents.length > 0) {
        // اختيار أفضل مطابقة تلقائياً
        if (parents.length === 1) {
          setSelectedParent(parents[0]);
        }
      }
      
    } catch (err) {
      console.error('خطأ في البحث:', err);
    } finally {
      setChecking(false);
    }
  }, [tribe?.id, form.firstName, form.fatherName, form.grandfatherName]);

  // التحقق عند تغيير الاسم
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.firstName && form.fatherName) {
        checkForDuplicatesAndParents();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [form.firstName, form.fatherName, form.grandfatherName, checkForDuplicatesAndParents]);

  // =============================================
  // 📝 معالجة النموذج
  // =============================================
  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    // مسح الخطأ
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // تعيين الجنس تلقائياً من العلاقة
    if (field === 'relation') {
      const rel = RELATIONS.find(r => r.value === value);
      if (rel?.gender) {
        setForm(prev => ({ ...prev, gender: rel.gender }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.firstName || !validateName(form.firstName)) {
      newErrors.firstName = 'أدخل الاسم الأول (2-40 حرف)';
    }
    
    if (!form.fatherName || !validateName(form.fatherName)) {
      newErrors.fatherName = 'أدخل اسم الأب (2-40 حرف)';
    }
    
    if (!form.relation) {
      newErrors.relation = 'اختر صلة القرابة';
    }
    
    if (form.relation === 'أنا' && !form.gender) {
      newErrors.gender = 'اختر الجنس';
    }
    
    if (form.birthDate && !validateBirthdate(form.birthDate)) {
      newErrors.birthDate = 'تاريخ ميلاد غير صحيح';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================
  // 💾 الحفظ
  // =============================================
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!tribe?.id) return;
    
    setSubmitting(true);
    
    try {
      // تحضير البيانات
      const personData = {
        first_name: form.firstName.trim(),
        father_name: form.fatherName.trim(),
        grandfather_name: form.grandfatherName?.trim() || null,
        family_name: form.familyName?.trim() || null,
        birth_date: form.birthDate || null,
        gender: form.gender || null,
        relation: form.relation,
        is_alive: form.isAlive,
        phone: form.phone || null,
        notes: form.notes || null
      };
      
      // إضافة الشخص مع الربط الذكي
      const result = await createSmartPerson(tribe.id, personData);
      
      if (!result.success && result.error === 'duplicate') {
        setSnackbar({
          open: true,
          message: `⚠️ ${result.message}`,
          severity: 'warning'
        });
        return;
      }
      
      // نجاح
      setSuccess(true);
      
      let message = `✅ تمت إضافة "${form.firstName}" بنجاح`;
      if (result.linkResult?.linked) {
        message += ` وتم ربطه بـ "${result.linkResult.parentName}" تلقائياً`;
      }
      
      setSnackbar({
        open: true,
        message,
        severity: 'success'
      });
      
      // إعادة تعيين النموذج بعد 2 ثانية
      setTimeout(() => {
        setForm(INITIAL_FORM);
        setDuplicates([]);
        setPotentialParents([]);
        setSelectedParent(null);
        setActiveStep(0);
        setSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error('خطأ في الحفظ:', err);
      setSnackbar({
        open: true,
        message: `❌ حدث خطأ: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // =============================================
  // 🖼️ العرض
  // =============================================
  
  if (tribeLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        {/* العنوان */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <PersonAddIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              إضافة شخص جديد
            </Typography>
            <Typography variant="body2" color="text.secondary">
              أضف نفسك أو أحد أفراد عائلتك للشجرة
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* خطوات الإضافة */}
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* الخطوة 1: المعلومات الأساسية */}
          <Step>
            <StepLabel>
              المعلومات الأساسية
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                {/* صلة القرابة */}
                <Grid item xs={12}>
                  <FormControl fullWidth error={!!errors.relation}>
                    <InputLabel>صلة القرابة *</InputLabel>
                    <Select
                      value={form.relation}
                      onChange={handleChange('relation')}
                      label="صلة القرابة *"
                    >
                      {Object.entries(
                        RELATIONS.reduce((acc, rel) => {
                          if (!acc[rel.category]) acc[rel.category] = [];
                          acc[rel.category].push(rel);
                          return acc;
                        }, {})
                      ).map(([category, items]) => [
                        <MenuItem key={category} disabled sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          — {category} —
                        </MenuItem>,
                        ...items.map(rel => (
                          <MenuItem key={rel.value} value={rel.value}>
                            {rel.label}
                          </MenuItem>
                        ))
                      ])}
                    </Select>
                    {errors.relation && (
                      <Typography variant="caption" color="error">{errors.relation}</Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* الاسم الأول */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الاسم الأول *"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                    placeholder="مثال: محمد"
                    InputProps={{
                      endAdornment: checking && <CircularProgress size={20} />
                    }}
                  />
                </Grid>

                {/* اسم الأب */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="اسم الأب *"
                    value={form.fatherName}
                    onChange={handleChange('fatherName')}
                    error={!!errors.fatherName}
                    helperText={errors.fatherName}
                    placeholder="مثال: أحمد"
                  />
                </Grid>

                {/* اسم الجد */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="اسم الجد"
                    value={form.grandfatherName}
                    onChange={handleChange('grandfatherName')}
                    placeholder="مثال: علي"
                  />
                </Grid>

                {/* اسم العائلة */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="اسم العائلة/القبيلة"
                    value={form.familyName}
                    onChange={handleChange('familyName')}
                    placeholder="مثال: الطائي"
                  />
                </Grid>

                {/* الجنس */}
                {form.relation === 'أنا' && (
                  <Grid item xs={12}>
                    <FormControl component="fieldset" error={!!errors.gender}>
                      <Typography variant="subtitle2" gutterBottom>
                        الجنس *
                      </Typography>
                      <RadioGroup
                        row
                        value={form.gender}
                        onChange={handleChange('gender')}
                      >
                        <FormControlLabel
                          value="M"
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MaleIcon color="primary" />
                              ذكر
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="F"
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FemaleIcon sx={{ color: '#c2185b' }} />
                              أنثى
                            </Box>
                          }
                        />
                      </RadioGroup>
                      {errors.gender && (
                        <Typography variant="caption" color="error">{errors.gender}</Typography>
                      )}
                    </FormControl>
                  </Grid>
                )}
              </Grid>

              {/* تحذير التكرار */}
              {duplicates.length > 0 && (
                <Alert 
                  severity={duplicates[0].isExactMatch ? 'warning' : 'info'}
                  sx={{ mt: 2 }}
                  action={
                    <IconButton size="small" onClick={() => setDuplicates([])}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Typography variant="subtitle2">
                    {duplicates[0].isExactMatch ? '⚠️ شخص مشابه موجود!' : 'ℹ️ أشخاص مشابهون'}
                  </Typography>
                  {duplicates.slice(0, 3).map(dup => (
                    <Chip
                      key={dup.id}
                      label={`${dup.first_name} بن ${dup.father_name}`}
                      size="small"
                      sx={{ mr: 1, mt: 1 }}
                    />
                  ))}
                </Alert>
              )}

              {/* خيارات الربط */}
              {potentialParents.length > 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    🔗 تم العثور على والد محتمل
                  </Typography>
                  <List dense>
                    {potentialParents.slice(0, 3).map(parent => (
                      <ListItem
                        key={parent.id}
                        button
                        selected={selectedParent?.id === parent.id}
                        onClick={() => setSelectedParent(parent)}
                        sx={{ borderRadius: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: parent.gender === 'M' ? 'primary.main' : '#c2185b' }}>
                            {parent.gender === 'M' ? <MaleIcon /> : <FemaleIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${parent.first_name} بن ${parent.father_name}`}
                          secondary={parent.family_name}
                        />
                        {selectedParent?.id === parent.id && (
                          <CheckIcon color="success" />
                        )}
                      </ListItem>
                    ))}
                  </List>
                  <Typography variant="caption" color="text.secondary">
                    سيتم ربط الشخص الجديد تلقائياً مع الوالد المحدد
                  </Typography>
                </Alert>
              )}

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(1)}
                  disabled={!form.firstName || !form.fatherName || !form.relation}
                  endIcon={<ForwardIcon />}
                >
                  التالي
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* الخطوة 2: معلومات إضافية */}
          <Step>
            <StepLabel>
              معلومات إضافية (اختياري)
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="تاريخ الميلاد"
                    value={form.birthDate}
                    onChange={handleChange('birthDate')}
                    error={!!errors.birthDate}
                    helperText={errors.birthDate}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="رقم الهاتف"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="+966XXXXXXXXX"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <Typography variant="subtitle2" gutterBottom>
                      حالة الحياة
                    </Typography>
                    <RadioGroup
                      row
                      value={form.isAlive ? 'alive' : 'deceased'}
                      onChange={(e) => setForm(prev => ({ ...prev, isAlive: e.target.value === 'alive' }))}
                    >
                      <FormControlLabel
                        value="alive"
                        control={<Radio />}
                        label="🟢 على قيد الحياة"
                      />
                      <FormControlLabel
                        value="deceased"
                        control={<Radio />}
                        label="🕊️ متوفي"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="ملاحظات"
                    value={form.notes}
                    onChange={handleChange('notes')}
                    placeholder="أي معلومات إضافية..."
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={() => setActiveStep(0)} startIcon={<BackIcon />}>
                  السابق
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                  endIcon={<ForwardIcon />}
                >
                  التالي
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* الخطوة 3: المراجعة والتأكيد */}
          <Step>
            <StepLabel>
              المراجعة والتأكيد
            </StepLabel>
            <StepContent>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ملخص البيانات
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">الاسم:</Typography>
                      <Typography fontWeight="bold">
                        {form.firstName} بن {form.fatherName}
                        {form.grandfatherName && ` بن ${form.grandfatherName}`}
                      </Typography>
                    </Box>
                    
                    {form.familyName && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">العائلة:</Typography>
                        <Typography>{form.familyName}</Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">صلة القرابة:</Typography>
                      <Chip 
                        label={RELATIONS.find(r => r.value === form.relation)?.label || form.relation}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">الجنس:</Typography>
                      <Typography>
                        {form.gender === 'M' ? '👨 ذكر' : form.gender === 'F' ? '👩 أنثى' : 'غير محدد'}
                      </Typography>
                    </Box>
                    
                    {form.birthDate && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">تاريخ الميلاد:</Typography>
                        <Typography>{new Date(form.birthDate).toLocaleDateString('ar')}</Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">الحالة:</Typography>
                      <Typography>
                        {form.isAlive ? '🟢 على قيد الحياة' : '🕊️ متوفي'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {selectedParent && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        🔗 سيتم ربط هذا الشخص تلقائياً بـ 
                        <strong> "{selectedParent.first_name}" </strong>
                        كوالد
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {success ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">
                    ✅ تمت الإضافة بنجاح!
                  </Typography>
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={() => setActiveStep(1)} startIcon={<BackIcon />}>
                    السابق
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleSubmit}
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} /> : <CheckIcon />}
                  >
                    {submitting ? 'جاري الحفظ...' : 'تأكيد الإضافة'}
                  </Button>
                </Box>
              )}
            </StepContent>
          </Step>
        </Stepper>

        {/* أزرار التنقل */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/family')}
            startIcon={<BackIcon />}
          >
            العودة للقائمة
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/tree')}
            startIcon={<PersonIcon />}
          >
            عرض الشجرة
          </Button>
        </Box>
      </Paper>

      {/* الإشعارات */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
