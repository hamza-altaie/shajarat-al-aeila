// src/components/MobileNavigation.jsx - قائمة تنقل سفلية للهاتف
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Badge from '@mui/material/Badge';

// الأيقونات
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HomeIcon from '@mui/icons-material/Home';

// تعريف صفحات التنقل
const NAV_ITEMS = [
  {
    label: 'الشجرة',
    path: '/tree',
    icon: <AccountTreeIcon />,
    color: '#10b981',
  },
  {
    label: 'العائلة',
    path: '/family',
    icon: <PeopleIcon />,
    color: '#3b82f6',
  },
  {
    label: 'إحصائيات',
    path: '/statistics',
    icon: <BarChartIcon />,
    color: '#f59e0b',
  },
];

export default function MobileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // إظهار فقط على الشاشات الصغيرة (أقل من 768px)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // الصفحة الحالية
  const currentPath = location.pathname;
  const currentIndex = NAV_ITEMS.findIndex((item) => currentPath.startsWith(item.path));

  // لا تظهر في صفحة تسجيل الدخول
  if (currentPath === '/login' || currentPath === '/privacy') {
    return null;
  }

  // لا تظهر على الشاشات الكبيرة
  if (!isMobile) {
    return null;
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderRadius: '20px 20px 0 0',
        overflow: 'hidden',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        // دعم الـ Safe Area على الأيفون
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      elevation={8}
    >
      <BottomNavigation
        value={currentIndex >= 0 ? currentIndex : false}
        onChange={(event, newValue) => {
          navigate(NAV_ITEMS[newValue].path);
        }}
        showLabels
        sx={{
          height: 65,
          backgroundColor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '8px 12px',
            transition: 'all 0.3s ease',
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                transform: 'scale(1.2)',
              },
              '& .MuiBottomNavigationAction-label': {
                fontWeight: 700,
                fontSize: '0.75rem',
              },
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontFamily: 'Cairo, sans-serif',
            fontSize: '0.7rem',
            marginTop: '4px',
            transition: 'all 0.3s ease',
          },
          '& .MuiSvgIcon-root': {
            fontSize: '1.5rem',
            transition: 'all 0.3s ease',
          },
        }}
      >
        {NAV_ITEMS.map((item, index) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
            sx={{
              color: currentIndex === index ? item.color : '#9ca3af',
              '&.Mui-selected': {
                color: item.color,
              },
              '& .MuiSvgIcon-root': {
                color: 'inherit',
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

// مكون لإضافة مسافة سفلية لمنع تغطية المحتوى
export function MobileNavSpacer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) return null;

  return (
    <div
      style={{
        height: 'calc(65px + env(safe-area-inset-bottom, 0px))',
        width: '100%',
      }}
    />
  );
}
