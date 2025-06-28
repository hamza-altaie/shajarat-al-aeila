// src/components/InstallPrompt.jsx - النسخة المبسطة
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Card, CardContent,
  Fade, IconButton
} from '@mui/material';
import { 
  GetApp, Close, PhoneIphone
} from '@mui/icons-material';

const InstallPrompt = () => {
  const [showInstallScreen, setShowInstallScreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // التحقق من التنصيب المسبق
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
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
      console.log('💡 إمكانية التنصيب التلقائي متاحة!');
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
      console.log('✅ تم تنصيب التطبيق بنجاح!');
      setIsInstalled(true);
      setShowInstallScreen(false);
      setDeferredPrompt(null);
      localStorage.removeItem('install-declined');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('🔄 محاولة التنصيب...', { deferredPrompt: !!deferredPrompt });
    
    if (deferredPrompt) {
      // تنصيب تلقائي للأجهزة التي تدعمه
      try {
        console.log('💡 تنصيب تلقائي...');
        const result = await deferredPrompt.prompt();
        console.log('✅ نتيجة التنصيب:', result.outcome);
        
        if (result.outcome === 'accepted') {
          console.log('🎉 تم التنصيب بنجاح!');
          localStorage.removeItem('install-declined');
        } else {
          console.log('❌ المستخدم رفض التنصيب');
          localStorage.setItem('install-declined', 'true');
        }
        
        setDeferredPrompt(null);
        setShowInstallScreen(false);
        
      } catch (error) {
        console.error('❌ خطأ في التنصيب التلقائي:', error);
        setShowInstallScreen(false);
      }
    } else {
      // تنصيب عادي للأجهزة التي لا تدعم التنصيب التلقائي
      console.log('📱 تنصيب عادي...');
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    let message = '';
    if (isIOS) {
      message = '📱 لتنصيب التطبيق على iPhone/iPad:\n\n1️⃣ اضغط على أيقونة المشاركة (📤) في الأسفل\n2️⃣ اختر "إضافة إلى الشاشة الرئيسية"\n3️⃣ اضغط "إضافة" لإنهاء التنصيب';
    } else if (isAndroid) {
      message = '🤖 لتنصيب التطبيق على Android:\n\n1️⃣ اضغط على قائمة المتصفح (⋮) في الأعلى\n2️⃣ اختر "إضافة إلى الشاشة الرئيسية"\n3️⃣ اضغط "إضافة" لإنهاء التنصيب';
    } else {
      message = '💻 لتنصيب التطبيق:\n\n1️⃣ ابحث عن أيقونة التنصيب في شريط العناوين\n2️⃣ أو اضغط Ctrl+D لإضافة للمفضلة\n3️⃣ استمتع بالوصول السريع للتطبيق';
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
  if (isInstalled || !showInstallScreen) {
    return null;
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
          p: 2
        }}
      >
        <Card
          sx={{
            maxWidth: 400,
            width: '100%',
            borderRadius: 4,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative'
          }}
        >
          {/* زر الإغلاق */}
          <IconButton
            onClick={handleDecline}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary'
            }}
          >
            <Close />
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
                boxShadow: '0 8px 24px rgba(46,125,50,0.3)'
              }}
            >
              <PhoneIphone sx={{ fontSize: 40, color: 'white' }} />
            </Box>

            {/* العنوان */}
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#2e7d32',
                mb: 2,
                fontFamily: 'Cairo, sans-serif'
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
                fontSize: '1.1rem'
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
                  borderColor: 'divider'
                }}
              >
                ليس الآن
              </Button>
              
              <Button
                onClick={handleInstallClick}
                variant="contained"
                size="large"
                startIcon={<GetApp />}
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
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
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
                fontSize: '0.9rem'
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