// src/components/DuplicatesManager.jsx
// إدارة الأشخاص المكررين - للمدير فقط

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  LinearProgress
} from '@mui/material';
import MergeIcon from '@mui/icons-material/MergeType';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { 
  findAllDuplicates, 
  mergePersons,
  buildFullName 
} from '../services/smartTribeService';
import { useTribe } from '../contexts/TribeContext';

/**
 * مكون إدارة الأشخاص المكررين
 * متاح للمدير فقط
 */
export default function DuplicatesManager({ open, onClose, onMergeComplete }) {
  const { tribe, membership } = useTribe();
  
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);

  // التحقق من صلاحية المدير
  const isAdmin = membership?.role === 'admin';

  // جلب المكررين
  const fetchDuplicates = useCallback(async () => {
    if (!tribe?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const groups = await findAllDuplicates(tribe.id, 85);
      setDuplicateGroups(groups);
      
      if (groups.length === 0) {
        setSuccessMessage('✅ لا يوجد أشخاص مكررين!');
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ في البحث');
    } finally {
      setLoading(false);
    }
  }, [tribe?.id]);

  // جلب المكررين عند فتح النافذة
  useEffect(() => {
    if (open && tribe?.id) {
      fetchDuplicates();
    }
  }, [open, tribe?.id, fetchDuplicates]);

  // دمج شخصين
  const handleMerge = useCallback(async (keepId, removeId) => {
    if (!isAdmin) {
      setError('فقط المدير يمكنه دمج الأشخاص');
      return;
    }

    setMerging(true);
    setError(null);
    
    try {
      await mergePersons(tribe.id, keepId, removeId);
      setSuccessMessage('✅ تم الدمج بنجاح!');
      
      // إعادة جلب المكررين
      await fetchDuplicates();
      
      // إبلاغ المكون الأب
      onMergeComplete?.();
    } catch (err) {
      setError(err.message || 'حدث خطأ في الدمج');
    } finally {
      setMerging(false);
    }
  }, [tribe?.id, isAdmin, fetchDuplicates, onMergeComplete]);

  // إغلاق النافذة
  const handleClose = () => {
    setDuplicateGroups([]);
    setError(null);
    setSuccessMessage(null);
    onClose?.();
  };

  // حساب لون نسبة التشابه
  const getSimilarityColor = (similarity) => {
    if (similarity >= 95) return 'error';
    if (similarity >= 85) return 'warning';
    return 'info';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{
        fontFamily: 'Cairo, sans-serif',
        fontWeight: 'bold',
        background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MergeIcon />
          إدارة الأشخاص المكررين
        </Box>
        <IconButton
          onClick={fetchDuplicates}
          disabled={loading}
          sx={{ color: 'white' }}
          title="تحديث"
        >
          <RefreshIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* شريط التحميل */}
        {loading && <LinearProgress />}

        <Box sx={{ p: 3 }}>
          {/* التحقق من الصلاحية */}
          {!isAdmin && (
            <Alert severity="warning" sx={{ mb: 2, fontFamily: 'Cairo' }}>
              ⚠️ فقط المدير يمكنه دمج الأشخاص المكررين
            </Alert>
          )}

          {/* رسالة الخطأ */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, fontFamily: 'Cairo' }}>
              {error}
            </Alert>
          )}

          {/* رسالة النجاح */}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2, fontFamily: 'Cairo' }}>
              {successMessage}
            </Alert>
          )}

          {/* قائمة المكررين */}
          {duplicateGroups.length > 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2, fontFamily: 'Cairo' }}>
                تم العثور على {duplicateGroups.length} مجموعة من الأشخاص المكررين المحتملين
              </Alert>

              {duplicateGroups.map((group, groupIndex) => (
                <Card 
                  key={groupIndex} 
                  sx={{ 
                    mb: 2, 
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <CardContent>
                    {/* الشخص الأساسي */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      mb: 2,
                      p: 1.5,
                      bgcolor: 'success.light',
                      borderRadius: 2
                    }}>
                      <PersonIcon color="success" />
                      <Typography fontFamily="Cairo" fontWeight="bold">
                        {buildFullName(group.primary)}
                      </Typography>
                      <Chip 
                        label="سيبقى" 
                        color="success" 
                        size="small"
                        icon={<CheckCircleIcon />}
                      />
                      {group.primary.relation && (
                        <Chip 
                          label={group.primary.relation} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      fontFamily="Cairo"
                      sx={{ mb: 1 }}
                    >
                      الأشخاص المشابهين:
                    </Typography>

                    {/* الأشخاص المكررين */}
                    <List dense>
                      {group.duplicates.map((duplicate, dupIndex) => (
                        <ListItem
                          key={dupIndex}
                          sx={{
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            mb: 0.5
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography fontFamily="Cairo">
                                  {buildFullName(duplicate)}
                                </Typography>
                                <Chip
                                  label={`${duplicate.similarity}%`}
                                  color={getSimilarityColor(duplicate.similarity)}
                                  size="small"
                                />
                                {duplicate.relation && (
                                  <Chip 
                                    label={duplicate.relation} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                fontFamily="Cairo"
                              >
                                {duplicate.gender === 'male' ? 'ذكر' : 'أنثى'}
                                {duplicate.birthdate && ` • ${duplicate.birthdate}`}
                              </Typography>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              disabled={!isAdmin || merging}
                              onClick={() => handleMerge(group.primary.id, duplicate.id)}
                              startIcon={merging ? <CircularProgress size={16} /> : <MergeIcon />}
                              sx={{ fontFamily: 'Cairo', fontSize: '0.75rem' }}
                            >
                              دمج
                            </Button>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography fontFamily="Cairo" variant="h6" color="text.secondary">
                لا يوجد أشخاص مكررين
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleClose}
          sx={{ fontFamily: 'Cairo' }}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
