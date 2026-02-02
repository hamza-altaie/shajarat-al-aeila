import { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { deleteAccount } from '../firebase/auth';
import { deleteUserData } from '../services/tribeService';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmText !== 'حذف') {
      setError('يجب كتابة كلمة "حذف" للتأكيد');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. حذف بيانات المستخدم من Supabase أولاً
      await deleteUserData(user.uid);

      // 2. حذف الحساب من Firebase
      await deleteAccount();

      // 3. التوجيه لصفحة تسجيل الدخول
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('❌ خطأ في حذف الحساب:', err);
      setError(err.message || 'حدث خطأ أثناء حذف الحساب');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          إعدادات الحساب
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'error.main' }}>
            منطقة الخطر
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              حذف الحساب عملية نهائية ولا يمكن التراجع عنها. سيتم حذف جميع بياناتك من النظام.
            </Typography>
          </Alert>

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setOpenDeleteDialog(true)}
            fullWidth
            sx={{ mt: 2 }}
          >
            حذف حسابي نهائياً
          </Button>
        </Box>
      </Paper>

      {/* Dialog التأكيد */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => !loading && setOpenDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="error" />
          تأكيد حذف الحساب
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            هل أنت متأكد من حذف حسابك نهائياً؟ هذه العملية:
          </DialogContentText>
          <Box component="ul" sx={{ mb: 2, pr: 2 }}>
            <li>ستحذف جميع بياناتك من النظام</li>
            <li>ستحذف رقم هاتفك وإمكانية الوصول</li>
            <li>
              <strong>لا يمكن التراجع عنها</strong>
            </li>
          </Box>

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            للتأكيد، اكتب كلمة "حذف":
          </Typography>
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='اكتب كلمة "حذف"'
            disabled={loading}
            autoFocus
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} disabled={loading}>
            إلغاء
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={loading || confirmText !== 'حذف'}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteForeverIcon />}
          >
            {loading ? 'جاري الحذف...' : 'حذف نهائياً'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
