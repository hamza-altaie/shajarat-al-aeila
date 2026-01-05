// src/components/SmartPersonForm.jsx
// نموذج إضافة شخص ذكي مع اكتشاف التكرار

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';

import { 
  smartAddPerson, 
  confirmAddPerson, 
  confirmLinkToExisting,
  buildFullName 
} from '../services/smartTribeService';

/**
 * نموذج إضافة شخص ذكي
 * يكتشف التكرار ويقترح الربط بدلاً من الإضافة
 */
export default function SmartPersonForm({ 
  open, 
  onClose, 
  tribeId, 
  onSuccess,
  initialRelation = '',
  parentId = null 
}) {
  // حالات النموذج
  const [formData, setFormData] = useState({
    first_name: '',
    father_name: '',
    grandfather_name: '',
    family_name: '',
    gender: 'male',
    relation: initialRelation,
    birthdate: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // حالات اكتشاف التكرار
  const [matchState, setMatchState] = useState(null);
  // matchState يمكن أن يكون:
  // null - الحالة الابتدائية
  // { type: 'suggest_link', ... } - اقتراح ربط
  // { type: 'confirm_needed', ... } - تأكيد مطلوب
  // { type: 'duplicate_found', ... } - مكرر موجود

  // تحديث حقول النموذج
  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // إعادة تعيين حالة المطابقة عند تغيير البيانات
    setMatchState(null);
    setError(null);
  };

  // إرسال النموذج
  const handleSubmit = useCallback(async () => {
    if (!formData.first_name.trim()) {
      setError('الاسم الأول مطلوب');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await smartAddPerson(tribeId, {
        ...formData,
        parent_id: parentId
      });

      switch (result.action) {
        case 'created':
        case 'linked':
          // نجاح - إغلاق النموذج
          onSuccess?.(result);
          handleClose();
          break;

        case 'suggest_link':
          // اقتراح ربط
          setMatchState({
            type: 'suggest_link',
            suggestion: result.suggestion,
            similarity: result.similarity,
            message: result.message
          });
          break;

        case 'confirm_needed':
          // تأكيد مطلوب
          setMatchState({
            type: 'confirm_needed',
            suggestion: result.suggestion,
            similarity: result.similarity,
            message: result.message
          });
          break;

        case 'duplicate_found':
          // مكرر موجود
          setMatchState({
            type: 'duplicate_found',
            existingPerson: result.existingPerson,
            similarity: result.similarity,
            message: result.message
          });
          break;

        default:
          console.warn('نتيجة غير متوقعة:', result);
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [formData, tribeId, parentId, onSuccess]);

  // تأكيد الإضافة (تجاهل التكرار)
  const handleConfirmAdd = useCallback(async () => {
    setLoading(true);
    try {
      const result = await confirmAddPerson(tribeId, {
        ...formData,
        parent_id: parentId
      });
      onSuccess?.(result);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [formData, tribeId, parentId, onSuccess]);

  // تأكيد الربط بشخص موجود
  const handleConfirmLink = useCallback(async (personId) => {
    setLoading(true);
    try {
      const result = await confirmLinkToExisting(tribeId, personId);
      onSuccess?.(result);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tribeId, onSuccess]);

  // إغلاق النموذج وإعادة التعيين
  const handleClose = () => {
    setFormData({
      first_name: '',
      father_name: '',
      grandfather_name: '',
      family_name: '',
      gender: 'male',
      relation: initialRelation,
      birthdate: ''
    });
    setMatchState(null);
    setError(null);
    onClose?.();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      dir="rtl"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ 
        fontFamily: 'Cairo, sans-serif',
        fontWeight: 'bold',
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <PersonIcon />
        إضافة شخص جديد
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* رسالة الخطأ */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontFamily: 'Cairo' }}>
            {error}
          </Alert>
        )}

        {/* ================================ */}
        {/* حالة اكتشاف التكرار */}
        {/* ================================ */}
        {matchState && (
          <Box sx={{ mb: 3 }}>
            {matchState.type === 'suggest_link' && (
              <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LinkIcon />
                    <Typography variant="h6" fontFamily="Cairo">
                      وجدنا تطابق!
                    </Typography>
                    <Chip 
                      label={`${matchState.similarity}%`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                  <Typography fontFamily="Cairo" sx={{ mb: 2 }}>
                    {matchState.message}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<LinkIcon />}
                      onClick={() => handleConfirmLink(matchState.suggestion.id)}
                      disabled={loading}
                      sx={{ fontFamily: 'Cairo' }}
                    >
                      نعم، هذا أنا
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleConfirmAdd}
                      disabled={loading}
                      sx={{ fontFamily: 'Cairo' }}
                    >
                      لا، أضف كشخص جديد
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {matchState.type === 'confirm_needed' && (
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WarningIcon color="warning" />
                    <Typography variant="h6" fontFamily="Cairo">
                      شخص مشابه موجود
                    </Typography>
                    <Chip 
                      label={`${matchState.similarity}% تشابه`} 
                      color="warning" 
                      size="small" 
                    />
                  </Box>
                  <Typography fontFamily="Cairo" sx={{ mb: 1 }}>
                    {matchState.message}
                  </Typography>
                  <Typography fontFamily="Cairo" variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    الشخص الموجود: <strong>{buildFullName(matchState.suggestion)}</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<AddIcon />}
                      onClick={handleConfirmAdd}
                      disabled={loading}
                      sx={{ fontFamily: 'Cairo' }}
                    >
                      إضافة كشخص جديد
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setMatchState(null)}
                      sx={{ fontFamily: 'Cairo' }}
                    >
                      تعديل البيانات
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {matchState.type === 'duplicate_found' && (
              <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WarningIcon />
                    <Typography variant="h6" fontFamily="Cairo">
                      شخص مكرر!
                    </Typography>
                  </Box>
                  <Typography fontFamily="Cairo" sx={{ mb: 2 }}>
                    {matchState.message}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => setMatchState(null)}
                    sx={{ fontFamily: 'Cairo' }}
                  >
                    تعديل البيانات
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {/* ================================ */}
        {/* نموذج البيانات */}
        {/* ================================ */}
        {!matchState && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* الاسم الأول */}
            <TextField
              label="الاسم الأول *"
              value={formData.first_name}
              onChange={handleChange('first_name')}
              fullWidth
              required
              InputProps={{ sx: { fontFamily: 'Cairo' } }}
              InputLabelProps={{ sx: { fontFamily: 'Cairo' } }}
            />

            {/* اسم الأب */}
            <TextField
              label="اسم الأب"
              value={formData.father_name}
              onChange={handleChange('father_name')}
              fullWidth
              InputProps={{ sx: { fontFamily: 'Cairo' } }}
              InputLabelProps={{ sx: { fontFamily: 'Cairo' } }}
            />

            {/* اسم الجد */}
            <TextField
              label="اسم الجد"
              value={formData.grandfather_name}
              onChange={handleChange('grandfather_name')}
              fullWidth
              InputProps={{ sx: { fontFamily: 'Cairo' } }}
              InputLabelProps={{ sx: { fontFamily: 'Cairo' } }}
            />

            {/* اسم العائلة */}
            <TextField
              label="اسم العائلة"
              value={formData.family_name}
              onChange={handleChange('family_name')}
              fullWidth
              InputProps={{ sx: { fontFamily: 'Cairo' } }}
              InputLabelProps={{ sx: { fontFamily: 'Cairo' } }}
            />

            <Divider />

            {/* الجنس */}
            <Box>
              <Typography fontFamily="Cairo" variant="body2" color="text.secondary" gutterBottom>
                الجنس
              </Typography>
              <RadioGroup
                row
                value={formData.gender}
                onChange={handleChange('gender')}
              >
                <FormControlLabel 
                  value="male" 
                  control={<Radio />} 
                  label="ذكر"
                  sx={{ '& .MuiFormControlLabel-label': { fontFamily: 'Cairo' } }}
                />
                <FormControlLabel 
                  value="female" 
                  control={<Radio />} 
                  label="أنثى"
                  sx={{ '& .MuiFormControlLabel-label': { fontFamily: 'Cairo' } }}
                />
              </RadioGroup>
            </Box>

            {/* العلاقة */}
            <TextField
              label="العلاقة"
              value={formData.relation}
              onChange={handleChange('relation')}
              fullWidth
              placeholder="مثال: أنا، أب، أخ، ابن..."
              InputProps={{ sx: { fontFamily: 'Cairo' } }}
              InputLabelProps={{ sx: { fontFamily: 'Cairo' } }}
            />

            {/* تاريخ الميلاد */}
            <TextField
              label="تاريخ الميلاد"
              type="date"
              value={formData.birthdate}
              onChange={handleChange('birthdate')}
              fullWidth
              InputLabelProps={{ shrink: true, sx: { fontFamily: 'Cairo' } }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose}
          sx={{ fontFamily: 'Cairo' }}
        >
          إلغاء
        </Button>
        {!matchState && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !formData.first_name.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            sx={{ fontFamily: 'Cairo' }}
          >
            {loading ? 'جاري البحث...' : 'إضافة'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
