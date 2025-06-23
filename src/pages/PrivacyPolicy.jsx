import React from 'react';
import {
  Container, Paper, Typography, Box, Divider, IconButton, 
  Card, CardContent, List, ListItem, ListItemIcon, ListItemText,
  Chip, Alert
} from '@mui/material';
import {
  Close as CloseIcon, Security as SecurityIcon, 
  Shield as ShieldIcon, Lock as LockIcon, 
  Visibility as VisibilityIcon, Delete as DeleteIcon,
  Phone as PhoneIcon, Storage as StorageIcon,
  Share as ShareIcon, Update as UpdateIcon
} from '@mui/icons-material';

export default function PrivacyPolicy() {
  const handleClose = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign('/family');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* رأس الصفحة */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
            color: 'white',
            p: 4,
            position: 'relative'
          }}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              color: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box textAlign="center">
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }}
            >
              <SecurityIcon sx={{ fontSize: 40 }} />
            </Box>
            
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              سياسة الخصوصية والشروط
            </Typography>
            
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية
            </Typography>
            
            <Chip
              label="آخر تحديث: يونيو 2025"
              sx={{ 
                mt: 2,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white'
              }}
            />
          </Box>
        </Box>

        <Box p={4}>
          {/* تنبيه مهم */}
          <Alert severity="info" sx={{ mb: 4 }}>
            <Typography variant="body2">
              <strong>مهم :</strong> باستخدامك لتطبيق شجرة العائلة، فإنك توافق على هذه السياسة والشروط. 
              يرجى قراءتها بعناية.
            </Typography>
          </Alert>

          {/* المعلومات التي نجمعها */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon color="primary" />
                المعلومات التي نجمعها
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="رقم الهاتف"
                    secondary="نستخدم رقم هاتفك للتحقق من الهوية وتسجيل الدخول الآمن"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <PhoneIcon color="primary" />
                  </ListItemIcon>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="بيانات العائلة"
                    secondary="أسماء أفراد العائلة، تواريخ الميلاد، والعلاقات الأسرية"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <VisibilityIcon color="primary" />
                  </ListItemIcon>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="الصور"
                    secondary="صور أفراد العائلة التي تختار رفعها (اختيارية)"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <ShareIcon color="primary" />
                  </ListItemIcon>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* كيف نحمي بياناتك */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LockIcon color="primary" />
                كيف نحمي بياناتك
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="تشفير البيانات"
                    secondary="جميع بياناتك محفوظة بتقنيات التشفير المتقدمة في خوادم Google Firebase الآمنة"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <SecurityIcon color="success" />
                  </ListItemIcon>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="حماية الوصول"
                    secondary="لا يمكن الوصول لبياناتك إلا من خلال رقم هاتفك المسجل"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <ShieldIcon color="success" />
                  </ListItemIcon>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="التحقق المتقدم"
                    secondary="نستخدم نظام التحقق برسائل SMS مع تقنية reCAPTCHA لمنع الاستخدام غير المصرح"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <PhoneIcon color="success" />
                  </ListItemIcon>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* حقوقك */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon color="primary" />
                حقوقك في البيانات
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="حذف البيانات"
                    secondary="يمكنك حذف جميع بياناتك نهائياً في أي وقت من خلال إعدادات التطبيق"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <DeleteIcon color="error" />
                  </ListItemIcon>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="تعديل البيانات"
                    secondary="يمكنك تعديل أو تحديث بياناتك في أي وقت"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <UpdateIcon color="primary" />
                  </ListItemIcon>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="تصدير البيانات"
                    secondary="يمكنك تصدير شجرة عائلتك كصورة أو ملف"
                  />
                  <ListItemIcon sx={{ order: -1 }}>
                    <StorageIcon color="primary" />
                  </ListItemIcon>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* المشاركة */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error">
                عدم مشاركة البيانات مع الغير
              </Typography>
              
              <Typography variant="body1" paragraph>
                نتعهد بعدم مشاركة أو بيع أو تأجير بياناتك الشخصية لأي طرف ثالث تحت أي ظرف من الظروف.
                بياناتك ملكك الخاص ولن نستخدمها إلا لتشغيل التطبيق وتحسين خدماتنا.
              </Typography>
            </CardContent>
          </Card>

          {/* شروط الاستخدام */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                شروط الاستخدام
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="• يجب استخدام التطبيق لأغراض شخصية وعائلية فقط"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="• يحظر استخدام التطبيق لأي أغراض تجارية أو غير قانونية"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="• يجب أن تكون البيانات المدخلة صحيحة وحقيقية"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="• نحتفظ بالحق في تعطيل الحسابات المخالفة للشروط"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ align: 'right' }}
                    secondaryTypographyProps={{ align: 'right' }}
                    primary="• التطبيق مقدم كما هو دون ضمانات صريحة أو ضمنية"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* معلومات الاتصال */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                معلومات الاتصال
              </Typography>
              
              <Typography variant="body1" paragraph>
                إذا كان لديك أي أسئلة حول سياسة الخصوصية أو شروط الاستخدام، 
                يمكنك التواصل معنا من خلال:
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                البريد الإلكتروني: Hamza.Altaie@gmail.com
              </Typography>
            </CardContent>
          </Card>

          <Divider sx={{ my: 4 }} />

          {/* ملاحظة أخيرة */}
          <Box textAlign="center" py={2}>
            <Typography variant="body2" color="text.secondary">
              تم تصميم هذا التطبيق بحب وعناية لخدمة العائلات العربية 🌳
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              © 2025 تطبيق شجرة العائلة - جميع الحقوق محفوظة
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}