import React from 'react';
import { Container, Paper, Typography, Box, Divider, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function PrivacyPolicy() {
  return (
    <Container maxWidth="sm" sx={{ p: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ width: '100%', p: { xs: 2, sm: 4 }, borderRadius: 3, boxShadow: 2, mt: 6, position: 'relative' }}>
        <IconButton
          aria-label="إغلاق"
          onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/family')}
          sx={{ position: 'absolute', top: 10, left: 10, color: '#888' }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold" textAlign="center" gutterBottom>
          سياسة الخصوصية والشروط
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Box textAlign="center" mb={2}>
          <span style={{
            display: 'inline-block',
            background: '#e0f2f1',
            color: '#00796b',
            borderRadius: 8,
            padding: '6px 18px',
            fontWeight: 600,
            fontSize: 16,
            boxShadow: '0 1px 4px #b2dfdb',
            marginBottom: 8
          }}>
            🔒 نحن نهتم بخصوصيتك! يرجى قراءة هذه الصفحة بعناية.
          </span>
        </Box>
        <Box textAlign="right" color="text.secondary" fontSize={16}>
          <p>نحن نولي خصوصيتك أهمية كبيرة. جميع بياناتك العائلية تحفظ بشكل آمن في قاعدة بيانات مشفرة ولا يتم مشاركتها مع أي طرف ثالث.</p>
          <p>استخدام التطبيق يتطلب تسجيل الدخول برقم هاتفك للتحقق من الهوية وحماية بياناتك.</p>
          <p>يحق لك حذف بياناتك في أي وقت من خلال حذف الحساب  .</p>
          <p>باستخدامك لهذا التطبيق فإنك توافق على هذه الشروط وسياسة الخصوصية.</p>
        </Box>
      </Paper>
    </Container>
  );
}
