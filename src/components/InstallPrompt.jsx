// src/components/InstallPrompt.jsx
import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Typography, Box, IconButton, Card, CardContent,
  Slide, Fab, Badge
} from '@mui/material';
import { 
  GetApp, Close, PhoneIphone, Launch, 
  Share, MoreVert, Apple, Android, Download
} from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installMethod, setInstallMethod] = useState(null);

  useEffect(() => {
    // تحديد نوع المتصفح والجهاز
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isChrome = /chrome/.test(userAgent) && !/edg/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isFirefox = /firefox/.test(userAgent);
    const isMobile = /mobi|android|touch|mini/i.test(userAgent);

    // تحديد طريقة التنصيب
    if (isIOS && isSafari) {
      setInstallMethod('ios-safari');
    } else if (isAndroid && isChrome) {
      setInstallMethod('android-chrome');
    } else if (isChrome && !isMobile) {
      setInstallMethod('desktop-chrome');
    } else if (isFirefox) {
      setInstallMethod('firefox');
    } else {
      setInstallMethod('generic');
    }

    // التحقق من التنصيب المسبق
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      setIsInstalled(true);
      console.log('✅ التطبيق منصب بالفعل');
      return;
    }

    // التحقق من localStorage للتذكير
    const installDeclined = localStorage.getItem('install-declined');
    const installPromptShown = localStorage.getItem('install-prompt-shown');
    
    if (installDeclined === 'true') {
      console.log('🚫 المستخدم رفض التنصيب مسبقاً');
      return;
    }

    // مستمع لحدث التنصيب (Chrome/Edge)
    const handleBeforeInstallPrompt = (e) => {
      console.log('💡 إمكانية التنصيب متاحة');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // إظهار الزر العائم فوراً
      setShowFloatingButton(true);
      
      // إظهار النافذة بعد 5 ثوان إذا لم يسبق عرضها
      if (!installPromptShown) {
        setTimeout(() => {
          setShowInstallPrompt(true);
          localStorage.setItem('install-prompt-shown', 'true');
        }, 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // مستمع لحدث التنصيب المكتمل
    const handleAppInstalled = () => {
      console.log('✅ تم تنصيب التطبيق بنجاح');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setShowFloatingButton(false);
      setDeferredPrompt(null);
      localStorage.removeItem('install-declined');
      localStorage.removeItem('install-prompt-shown');
      
      // إظهار رسالة نجاح
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎉 تم تنصيب شجرة العائلة بنجاح!', {
          body: 'يمكنك الآن استخدام التطبيق من الشاشة الرئيسية',
          icon: '/icons/icon-192x192.png'
        });
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // للأجهزة التي تدعم PWA لكن لا تُطلق الحدث
    if ((isIOS && isSafari) || isFirefox) {
      if (!installPromptShown) {
        setTimeout(() => {
          setShowInstallPrompt(true);
          localStorage.setItem('install-prompt-shown', 'true');
        }, 3000);
      }
      setShowFloatingButton(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowInstallPrompt(true);
      return;
    }

    try {
      console.log('🔄 محاولة تنصيب التطبيق...');
      const result = await deferredPrompt.prompt();
      console.log('نتيجة التنصيب:', result.outcome);
      
      if (result.outcome === 'accepted') {
        console.log('✅ المستخدم وافق على التنصيب');
        localStorage.removeItem('install-declined');
      } else {
        console.log('❌ المستخدم رفض التنصيب');
        localStorage.setItem('install-declined', 'true');
      }
    } catch (error) {
      console.error('خطأ في التنصيب:', error);
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
    setShowFloatingButton(false);
  };

  const handleDecline = () => {
    setShowInstallPrompt(false);
    setShowFloatingButton(false);
    localStorage.setItem('install-declined', 'true');
    console.log('🚫 المستخدم رفض التنصيب');
  };

  const getInstallInstructions = () => {
    switch (installMethod) {
      case 'ios-safari':
        return {
          title: 'تنصيب التطبيق على iPhone/iPad',
          subtitle: 'استمتع بتجربة أفضل مع التطبيق المنصب',
          steps: [
            'اضغط على أيقونة المشاركة في الأسفل',
            'قم بالتمرير واختر "إضافة إلى الشاشة الرئيسية"',
            'اضغط "إضافة" لإنهاء التنصيب'
          ],
          icon: <Apple sx={{ color: '#000' }} />,
          buttonText: 'فهمت، سأقوم بالتنصيب',
          showNativeButton: false
        };
      
      case 'android-chrome':
        return {
          title: 'تنصيب التطبيق على Android',
          subtitle: 'احصل على تجربة تطبيق أصلي',
          steps: [
            'اضغط على قائمة المتصفح (⋮) في الأعلى',
            'اختر "إضافة إلى الشاشة الرئيسية"',
            'اضغط "إضافة" لإنهاء التنصيب'
          ],
          icon: <Android sx={{ color: '#4CAF50' }} />,
          buttonText: deferredPrompt ? 'تنصيب سريع' : 'فهمت، سأقوم بالتنصيب',
          showNativeButton: !!deferredPrompt
        };
      
      case 'desktop-chrome':
        return {
          title: 'تنصيب التطبيق على الكمبيوتر',
          subtitle: 'استخدم التطبيق كبرنامج منفصل',
          steps: [
            'اضغط على الزر أدناه',
            'وافق على تنصيب التطبيق',
            'ابحث عن التطبيق في قائمة البرامج'
          ],
          icon: <GetApp sx={{ color: '#1976d2' }} />,
          buttonText: 'تنصيب التطبيق الآن',
          showNativeButton: !!deferredPrompt
        };
        
      case 'firefox':
        return {
          title: 'تطبيق ويب متقدم',
          subtitle: 'يمكنك إضافة اختصار للوصول السريع',
          steps: [
            'اضغط على قائمة Firefox (☰)',
            'اختر "تثبيت الصفحة كتطبيق"',
            'أو أضف الموقع للمفضلة للوصول السريع'
          ],
          icon: <Launch sx={{ color: '#FF7139' }} />,
          buttonText: 'فهمت',
          showNativeButton: false
        };
      
      default:
        return {
          title: 'تطبيق ويب تفاعلي',
          subtitle: 'أضف اختصار للوصول السريع',
          steps: [
            'أضف هذا الموقع للمفضلة',
            'أو أنشئ اختصار على سطح المكتب',
            'استمتع بالوصول السريع للتطبيق'
          ],
          icon: <Launch sx={{ color: '#666' }} />,
          buttonText: 'فهمت',
          showNativeButton: false
        };
    }
  };

  // لا تظهر شيء إذا كان التطبيق منصب بالفعل
  if (isInstalled) {
    return null;
  }

  const instructions = getInstallInstructions();

  return (
    <>
      {/* الزر العائم */}
      {showFloatingButton && (
        <Fab
          color="primary"
          aria-label="تنصيب التطبيق"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.1)' },
              '100%': { transform: 'scale(1)' }
            }
          }}
          onClick={() => setShowInstallPrompt(true)}
        >
          <Badge badgeContent="!" color="error">
            <Download />
          </Badge>
        </Fab>
      )}

      {/* نافذة التنصيب */}
      <Dialog 
        open={showInstallPrompt} 
        onClose={() => setShowInstallPrompt(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              {instructions.icon}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
              {instructions.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {instructions.subtitle}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3 }}>
          <Box sx={{ mb: 3 }}>
            {instructions.steps.map((step, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Box 
                  sx={{ 
                    minWidth: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    bgcolor: '#2e7d32', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    mr: 2,
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(46,125,50,0.3)'
                  }}
                >
                  {index + 1}
                </Box>
                <Typography variant="body1" sx={{ flex: 1, pt: 0.5 }}>
                  {step}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ 
            textAlign: 'center', 
            p: 2, 
            bgcolor: 'rgba(46,125,50,0.1)', 
            borderRadius: 2,
            border: '1px solid rgba(46,125,50,0.2)'
          }}>
            <Typography variant="body2" color="text.secondary">
              💡 التطبيق المنصب سيعمل أسرع ويمكن الوصول إليه بسهولة من الشاشة الرئيسية
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleDecline}
            sx={{ color: 'text.secondary' }}
          >
            ليس الآن
          </Button>
          
          <Button
            variant="contained"
            size="large"
            startIcon={instructions.showNativeButton ? <GetApp /> : <Launch />}
            onClick={handleInstallClick}
            sx={{ 
              bgcolor: '#2e7d32', 
              color: 'white',
              px: 3,
              '&:hover': { 
                bgcolor: '#1b5e20',
                boxShadow: '0 6px 20px rgba(46,125,50,0.6)',
                transform: 'translateY(-1px)'
              },
              boxShadow: '0 4px 15px rgba(46,125,50,0.4)'
            }}
          >
            {instructions.buttonText}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InstallPrompt;