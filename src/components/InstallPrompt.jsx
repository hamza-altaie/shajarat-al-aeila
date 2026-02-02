// src/components/InstallPrompt.jsx - النسخة المبسطة
import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

const InstallPrompt = () => {
  const [showInstallScreen, setShowInstallScreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  useEffect(() => {
    // التحقق من التنصيب المسبق
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // التحقق من localStorage للتذكير
    const installDeclined = localStorage.getItem('install-declined');
    if (installDeclined === 'true') {
      return;
    }

    // مستمع لحدث التنصيب التلقائي
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // إظهار واجهة التنصيب فوراً
      setTimeout(() => {
        setShowInstallScreen(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // للأجهزة التي لا تدعم التنصيب التلقائي - إظهار الواجهة أيضاً
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobi|android|iphone|ipad|ipod/i.test(userAgent);

    // إظهار واجهة التنصيب لجميع الأجهزة المحمولة بعد 3 ثوان
    if (isMobile) {
      setTimeout(() => {
        // إظهار الواجهة حتى لو لم يكن هناك deferredPrompt
        setShowInstallScreen(true);
      }, 3000);
    }

    // مستمع لحدث التنصيب المكتمل
    const handleAppInstalled = () => {
      setShowInstallScreen(false);
      setDeferredPrompt(null);
      // إظهار شاشة النجاح
      setShowSuccessScreen(true);
      localStorage.removeItem('install-declined');

      // إخفاء شاشة النجاح بعد 5 ثوان
      setTimeout(() => {
        setShowSuccessScreen(false);
        setIsInstalled(true);
      }, 5000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // تنصيب تلقائي للأجهزة التي تدعمه
      try {
        const result = await deferredPrompt.prompt();

        if (result.outcome === 'accepted') {
          localStorage.removeItem('install-declined');
          // إظهار شاشة النجاح
          setShowInstallScreen(false);
          setShowSuccessScreen(true);
          setTimeout(() => {
            setShowSuccessScreen(false);
            setIsInstalled(true);
          }, 5000);
        } else {
          localStorage.setItem('install-declined', 'true');
          setShowInstallScreen(false);
        }

        setDeferredPrompt(null);
      } catch (error) {
        console.error('❌ خطأ في التنصيب التلقائي:', error);
        setShowInstallScreen(false);
      }
    } else {
      // تنصيب عادي للأجهزة التي لا تدعم التنصيب التلقائي
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    let message = '';
    if (isIOS) {
      message =
        '📱 لتنصيب التطبيق على iPhone/iPad:\n\n1️⃣ اضغط على أيقونة المشاركة (📤) في الأسفل\n2️⃣ اختر "إضافة إلى الشاشة الرئيسية"\n3️⃣ اضغط "إضافة" لإنهاء التنصيب';
    } else if (isAndroid) {
      message =
        '🤖 لتنصيب التطبيق على Android:\n\n1️⃣ اضغط على قائمة المتصفح (⋮) في الأعلى\n2️⃣ اختر "إضافة إلى الشاشة الرئيسية"\n3️⃣ اضغط "إضافة" لإنهاء التنصيب';
    } else {
      message =
        '💻 لتنصيب التطبيق:\n\n1️⃣ ابحث عن أيقونة التنصيب في شريط العناوين\n2️⃣ أو اضغط Ctrl+D لإضافة للمفضلة\n3️⃣ استمتع بالوصول السريع للتطبيق';
    }

    alert(message + '\n\n✨ بعد التنصيب ستجد التطبيق في الشاشة الرئيسية مع أيقونة جميلة!');

    setShowInstallScreen(false);
    localStorage.setItem('install-declined', 'true');
  };

  const handleDecline = () => {
    setShowInstallScreen(false);
    localStorage.setItem('install-declined', 'true');
  };

  // تظهر الواجهة لجميع الأجهزة المحمولة
  if (isInstalled || (!showInstallScreen && !showSuccessScreen)) {
    return null;
  }

  // شاشة النجاح بعد التثبيت
  if (showSuccessScreen) {
    return (
      <Fade in={showSuccessScreen}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            p: 2,
          }}
        >
          <Card
            sx={{
              maxWidth: 400,
              width: '100%',
              borderRadius: 4,
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* أيقونة النجاح */}
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: '0 8px 24px rgba(46,125,50,0.4)',
                  animation: 'pulse 1.5s infinite',
                }}
              >
                <Typography sx={{ fontSize: 50 }}>✓</Typography>
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: '#2e7d32',
                  mb: 2,
                  fontFamily: 'Cairo, sans-serif',
                }}
              >
                🎉 تم التثبيت بنجاح!
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: '#1b5e20',
                  mb: 3,
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                }}
              >
                تم تثبيت التطبيق على جهازك.
                <br />
                ستجده الآن في الشاشة الرئيسية 📱
              </Typography>

              <Box
                sx={{
                  backgroundColor: 'rgba(46,125,50,0.1)',
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                }}
              >
                <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                  💡 يمكنك الآن فتح التطبيق من الشاشة الرئيسية للحصول على تجربة أفضل
                </Typography>
              </Box>

              <Button
                onClick={() => {
                  setShowSuccessScreen(false);
                  setIsInstalled(true);
                }}
                variant="contained"
                sx={{
                  mt: 2,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                حسناً، فهمت
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Fade>
    );
  }

  return (
    <Fade in={showInstallScreen}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          p: 2,
        }}
      >
        <Card
          sx={{
            maxWidth: 400,
            width: '100%',
            borderRadius: 4,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative',
          }}
        >
          {/* زر الإغلاق */}
          <IconButton
            onClick={handleDecline}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>

          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            {/* الأيقونة */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 8px 24px rgba(46,125,50,0.3)',
              }}
            >
              <PhoneIphoneIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>

            {/* العنوان */}
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                color: '#2e7d32',
                mb: 2,
                fontFamily: 'Cairo, sans-serif',
              }}
            >
              📱 نصب التطبيق
            </Typography>

            {/* الوصف */}
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                mb: 4,
                lineHeight: 1.6,
                fontSize: '1.1rem',
              }}
            >
              احصل على تجربة أفضل مع التطبيق المنصب على جهازك.
              <br />
              وصول سريع من الشاشة الرئيسية وأداء محسن.
            </Typography>

            {/* الأزرار */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                onClick={handleDecline}
                variant="outlined"
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  color: 'text.secondary',
                  borderColor: 'divider',
                }}
              >
                ليس الآن
              </Button>

              <Button
                onClick={handleInstallClick}
                variant="contained"
                size="large"
                startIcon={<GetAppIcon />}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 16px rgba(46,125,50,0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
                    boxShadow: '0 6px 20px rgba(46,125,50,0.6)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                تنصيب الآن
              </Button>
            </Box>

            {/* نص صغير */}
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                mt: 3,
                display: 'block',
                fontSize: '0.9rem',
              }}
            >
              💡 سيعمل التطبيق بشكل أسرع بعد التنصيب
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Fade>
  );
};

export default InstallPrompt;
