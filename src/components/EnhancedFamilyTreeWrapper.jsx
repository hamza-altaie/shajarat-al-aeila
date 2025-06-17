// src/components/EnhancedFamilyTreeWrapper.jsx - تصحيح الاستيرادات
import React, { useState, useRef } from 'react';
import { 
  Box, Paper, Tabs, Tab, Typography, Alert, 
  CircularProgress, Fab, Dialog, DialogContent,
  useTheme, useMediaQuery
} from '@mui/material';
import { 
  AccountTree, Search, Analytics, Download,
  Settings, Fullscreen, Close
} from '@mui/icons-material';

// استيراد المكونات المحسنة بمسارات صحيحة
import EnhancedFamilyTreeD3 from './enhanced/EnhancedFamilyTreeD3';
import FamilyTreeExporter from './enhanced/FamilyTreeExporter';
import FamilyAnalyticsDashboard from './enhanced/FamilyAnalyticsDashboard';

// استيراد Hook المحسن بمسار صحيح
import useEnhancedFamilyTree from '../hooks/enhanced/useEnhancedFamilyTree';

// استيراد السياق الحالي
import { useAuth } from '../AuthContext';

/**
 * مكون شجرة العائلة المحسن - يحل محل FamilyTreeAdvanced
 */
const EnhancedFamilyTreeWrapper = () => {
  const svgRef = useRef(null);
  
  // الحصول على معلومات المستخدم
  const { userId } = useAuth();
  
  // استخدام Hook المحسن
  const {
    treeData,
    familyData,
    treeStatistics,
    loading,
    error,
    selectedPerson,
    hoveredPerson,
    searchQuery,
    setSearchQuery,
    searchResults,
    loadFamilyData,
    findPersonById,
    handleNodeClick,
    handleNodeHover,
    isReady,
    hasData,
    isEmpty
  } = useEnhancedFamilyTree(userId);

  // حالات المكون
  const [activeTab, setActiveTab] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);

  // معالج تغيير التبويب
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // معالج اختيار شخص من البحث
  const handlePersonSelect = (person) => {
    handleNodeClick(person);
  };

  // عرض حالة التحميل
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="400px"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>جاري تحميل شجرة العائلة...</Typography>
      </Box>
    );
  }

  // عرض حالة الخطأ
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  // عرض حالة عدم وجود بيانات
  if (isEmpty) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        height="400px"
        gap={2}
      >
        <AccountTree sx={{ fontSize: 64, color: 'text.secondary' }} />
        <Typography variant="h6" color="text.secondary">
          لا توجد بيانات عائلة بعد
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ابدأ بإضافة أفراد عائلتك من صفحة إدارة العائلة
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* شريط التبويبات */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<AccountTree />} label="شجرة العائلة" />
          <Tab icon={<Analytics />} label="الإحصائيات" />
        </Tabs>
      </Box>

      {/* محتوى التبويبات */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 0 && (
          <EnhancedFamilyTreeD3
            treeData={treeData}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            selectedPerson={selectedPerson}
            searchHighlight={searchResults.map(p => p.id)}
          />
        )}
        
        {activeTab === 1 && (
          <FamilyAnalyticsDashboard
            familyData={familyData}
            treeStatistics={treeStatistics}
          />
        )}
      </Box>

      {/* أزرار الإجراءات العائمة */}
      <Box 
        position="fixed" 
        bottom={20} 
        right={20}
        display="flex"
        flexDirection="column"
        gap={1}
      >
        <Fab
          size="medium"
          color="primary"
          onClick={() => setExportDialogOpen(true)}
        >
          <Download />
        </Fab>
      </Box>

      {/* حوار التصدير */}
      <FamilyTreeExporter
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        treeData={treeData}
        familyData={familyData}
      />
    </Paper>
  );
};

export default EnhancedFamilyTreeWrapper;