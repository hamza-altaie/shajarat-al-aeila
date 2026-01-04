// src/pages/PendingMatches.jsx
// صفحة إدارة المطابقات المعلقة للمراجعة

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Box, Grid, Card, CardContent, CardActions,
  Button, Chip, Avatar, CircularProgress, Alert, Snackbar, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Divider,
  List, ListItem, ListItemAvatar, ListItemText, Badge, Tooltip
} from '@mui/material';
import {
  Link as LinkIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  CompareArrows as CompareIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  ArrowBack as BackIcon,
  Merge as MergeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTribe } from '../contexts/TribeContext';
import { supabase } from '../supabaseClient';
import { getCurrentUser } from '../firebase/auth';

// =============================================
// 🧩 المكون الرئيسي
// =============================================
export default function PendingMatches() {
  const { tribe, loading: tribeLoading } = useTribe();
  const navigate = useNavigate();
  
  // الحالات
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // الإشعارات
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // =============================================
  // 📊 تحميل المطابقات
  // =============================================
  const loadMatches = useCallback(async () => {
    if (!tribe?.id) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('potential_matches')
        .select(`
          *,
          person1:persons!potential_matches_person1_id_fkey(*),
          person2:persons!potential_matches_person2_id_fkey(*)
        `)
        .eq('tribe_id', tribe.id)
        .eq('status', 'pending')
        .order('match_score', { ascending: false });
      
      if (error) throw error;
      
      setMatches(data || []);
    } catch (err) {
      console.error('خطأ في تحميل المطابقات:', err);
      setSnackbar({
        open: true,
        message: '❌ فشل تحميل المطابقات',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [tribe?.id]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // =============================================
  // 🔄 معالجة المطابقة
  // =============================================
  const handleReview = async (matchId, approved) => {
    setProcessing(matchId);
    
    try {
      const user = await getCurrentUser();
      if (!user?.uid) throw new Error('غير مسجل');
      
      const match = matches.find(m => m.id === matchId);
      
      if (approved) {
        // إنشاء العلاقة
        const { error: relError } = await supabase
          .from('relations')
          .insert({
            tribe_id: tribe.id,
            parent_id: match.person2_id,
            child_id: match.person1_id,
            created_by: user.uid
          });
        
        if (relError && relError.code !== '23505') { // تجاهل خطأ التكرار
          throw relError;
        }
        
        // تحديث جيل الشخص
        const { data: parent } = await supabase
          .from('persons')
          .select('generation')
          .eq('id', match.person2_id)
          .single();
        
        if (parent) {
          await supabase
            .from('persons')
            .update({ 
              generation: (parent.generation || 0) + 1,
              auto_linked: true,
              link_source: 'manual_review'
            })
            .eq('id', match.person1_id);
        }
      }
      
      // تحديث حالة المطابقة
      const { error } = await supabase
        .from('potential_matches')
        .update({
          status: approved ? 'confirmed' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.uid
        })
        .eq('id', matchId);
      
      if (error) throw error;
      
      // تحديث القائمة
      setMatches(prev => prev.filter(m => m.id !== matchId));
      
      setSnackbar({
        open: true,
        message: approved ? '✅ تم قبول الربط بنجاح' : '❌ تم رفض الربط',
        severity: approved ? 'success' : 'info'
      });
      
    } catch (err) {
      console.error('خطأ في معالجة المطابقة:', err);
      setSnackbar({
        open: true,
        message: `❌ حدث خطأ: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setProcessing(null);
    }
  };

  // =============================================
  // 🖼️ العرض
  // =============================================
  
  if (tribeLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* العنوان */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
              <LinkIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                المطابقات المعلقة
              </Typography>
              <Typography variant="body2" color="text.secondary">
                مراجعة اقتراحات الربط التلقائي
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Badge badgeContent={matches.length} color="warning">
              <Chip label="بانتظار المراجعة" color="warning" variant="outlined" />
            </Badge>
            <IconButton onClick={loadMatches} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* قائمة المطابقات */}
      {matches.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1">
            🎉 لا توجد مطابقات معلقة
          </Typography>
          <Typography variant="body2">
            سيتم عرض اقتراحات الربط هنا عندما يضيف الأعضاء أشخاصاً جدد
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {matches.map(match => (
            <Grid item xs={12} md={6} key={match.id}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  {/* درجة التطابق */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip
                      label={`تطابق ${match.match_score}%`}
                      color={match.match_score >= 80 ? 'success' : match.match_score >= 60 ? 'warning' : 'default'}
                      size="small"
                    />
                    <Tooltip title="عرض التفاصيل">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedMatch(match);
                          setShowDetails(true);
                        }}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {/* الشخصان */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* الشخص 1 (الجديد) */}
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Avatar sx={{ 
                        mx: 'auto', 
                        mb: 1,
                        bgcolor: match.person1?.gender === 'M' ? 'primary.main' : '#c2185b'
                      }}>
                        {match.person1?.gender === 'M' ? <MaleIcon /> : <FemaleIcon />}
                      </Avatar>
                      <Typography variant="subtitle2" noWrap>
                        {match.person1?.first_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        بن {match.person1?.father_name}
                      </Typography>
                      <Chip label="جديد" size="small" color="info" sx={{ mt: 0.5 }} />
                    </Box>
                    
                    {/* السهم */}
                    <CompareIcon color="action" />
                    
                    {/* الشخص 2 (الوالد المحتمل) */}
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Avatar sx={{ 
                        mx: 'auto', 
                        mb: 1,
                        bgcolor: match.person2?.gender === 'M' ? 'primary.main' : '#c2185b'
                      }}>
                        {match.person2?.gender === 'M' ? <MaleIcon /> : <FemaleIcon />}
                      </Avatar>
                      <Typography variant="subtitle2" noWrap>
                        {match.person2?.first_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        بن {match.person2?.father_name}
                      </Typography>
                      <Chip label="والد محتمل" size="small" color="success" sx={{ mt: 0.5 }} />
                    </Box>
                  </Box>
                  
                  {/* أسباب التطابق */}
                  {match.match_reasons?.reasons && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        أسباب التطابق:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {(Array.isArray(match.match_reasons.reasons) 
                          ? match.match_reasons.reasons 
                          : [match.match_reasons.reasons]
                        ).map((reason, i) => (
                          <Chip key={i} label={reason} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
                
                <Divider />
                
                <CardActions sx={{ justifyContent: 'center', gap: 1 }}>
                  <Button
                    color="success"
                    startIcon={processing === match.id ? <CircularProgress size={16} /> : <ApproveIcon />}
                    onClick={() => handleReview(match.id, true)}
                    disabled={processing !== null}
                  >
                    قبول الربط
                  </Button>
                  <Button
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => handleReview(match.id, false)}
                    disabled={processing !== null}
                  >
                    رفض
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* زر العودة */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/family')}
        >
          العودة
        </Button>
      </Box>

      {/* نافذة التفاصيل */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedMatch && (
          <>
            <DialogTitle>
              تفاصيل المطابقة
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    الشخص الجديد
                  </Typography>
                  <Typography>
                    <strong>الاسم:</strong> {selectedMatch.person1?.first_name}
                  </Typography>
                  <Typography>
                    <strong>الأب:</strong> {selectedMatch.person1?.father_name}
                  </Typography>
                  <Typography>
                    <strong>الجد:</strong> {selectedMatch.person1?.grandfather_name || '-'}
                  </Typography>
                  <Typography>
                    <strong>العائلة:</strong> {selectedMatch.person1?.family_name || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom color="success.main">
                    الوالد المحتمل
                  </Typography>
                  <Typography>
                    <strong>الاسم:</strong> {selectedMatch.person2?.first_name}
                  </Typography>
                  <Typography>
                    <strong>الأب:</strong> {selectedMatch.person2?.father_name}
                  </Typography>
                  <Typography>
                    <strong>الجد:</strong> {selectedMatch.person2?.grandfather_name || '-'}
                  </Typography>
                  <Typography>
                    <strong>العائلة:</strong> {selectedMatch.person2?.family_name || '-'}
                  </Typography>
                </Grid>
              </Grid>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  إذا قبلت هذا الربط، سيصبح "{selectedMatch.person2?.first_name}" والداً لـ "{selectedMatch.person1?.first_name}" في الشجرة.
                </Typography>
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDetails(false)}>
                إغلاق
              </Button>
              <Button 
                color="success" 
                variant="contained"
                onClick={() => {
                  handleReview(selectedMatch.id, true);
                  setShowDetails(false);
                }}
              >
                قبول الربط
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* الإشعارات */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
