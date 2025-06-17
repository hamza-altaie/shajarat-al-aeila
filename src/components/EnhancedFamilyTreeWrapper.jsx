// src/components/EnhancedFamilyTreeWrapper.jsx
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

// استيراد المكونات المحسنة (ضع هذه الملفات في مجلد enhanced)
import EnhancedFamilyTreeD3 from './enhanced/EnhancedFamilyTreeD3';
import FamilyTreeExporter from './enhanced/FamilyTreeExporter';
import AdvancedFamilySearch from './enhanced/AdvancedFamilySearch';
import FamilyAnalyticsDashboard from './enhanced/FamilyAnalyticsDashboard';

// استيراد Hook المحسن
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
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  // معالج تغيير التبويب
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // معالج اختيار شخص من البحث
  const handlePersonSelect = (person) => {
    handleNodeClick(person);
    setSearchDialogOpen(false);
  };

  // معالج تسليط الضوء على المسار
  const handleHighlightPath = (path) => {
    console.log('تسليط الضوء على المسار:', path);
    // يمكن إضافة منطق لتسليط الضوء على المسار في الشجرة
  };

  // عرض حالة التحميل
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          جاري تحميل شجرة العائلة...
        </Typography>
      </Box>
    );
  }

  // عرض رسالة الخطأ
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">حدث خطأ أثناء تحميل البيانات</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  // عرض رسالة عدم وجود بيانات
  if (isEmpty) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <AccountTree sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          لا توجد بيانات شجرة العائلة
        </Typography>
        <Typography variant="body1" color="text.secondary">
          يرجى إضافة أفراد العائلة أولاً لعرض الشجرة
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* شريط التبويبات */}
      <Paper elevation={2} sx={{ borderRadius: 0 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="standard"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<AccountTree />} 
            label="شجرة العائلة" 
            sx={{ minHeight: 64 }}
          />
          <Tab 
            icon={<Search />} 
            label="البحث المتقدم" 
            sx={{ minHeight: 64 }}
          />
          <Tab 
            icon={<Analytics />} 
            label="التحليلات" 
            sx={{ minHeight: 64 }}
          />
        </Tabs>
      </Paper>

      {/* محتوى التبويبات */}
      <Box sx={{ height: 'calc(100vh - 120px)', position: 'relative' }}>
        
        {/* تبويب الشجرة */}
        {activeTab === 0 && (
          <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            {hasData && (
              <EnhancedFamilyTreeD3
                treeData={treeData}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                width={window.innerWidth - 40}
                height={window.innerHeight - 200}
                ref={svgRef}
              />
            )}
            
            {/* أزرار عائمة */}
            <Box sx={{ 
              position: 'absolute', 
              bottom: 20, 
              right: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <Fab 
                color="primary" 
                size="medium"
                onClick={() => setSearchDialogOpen(true)}
                sx={{ mb: 1 }}
              >
                <Search />
              </Fab>
              
              <Fab 
                color="secondary" 
                size="medium"
                onClick={() => setExportDialogOpen(true)}
                sx={{ mb: 1 }}
              >
                <Download />
              </Fab>
              
              <Fab 
                color="default" 
                size="medium"
                onClick={() => setFullscreenMode(true)}
              >
                <Fullscreen />
              </Fab>
            </Box>
          </Box>
        )}

        {/* تبويب البحث */}
        {activeTab === 1 && (
          <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <AdvancedFamilySearch
              treeData={treeData}
              familyData={familyData}
              onPersonSelect={handlePersonSelect}
              onHighlightPath={handleHighlightPath}
            />
          </Box>
        )}

        {/* تبويب التحليلات */}
        {activeTab === 2 && (
          <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <FamilyAnalyticsDashboard
              treeData={treeData}
              familyData={familyData}
            />
          </Box>
        )}
      </Box>

      {/* نافذة التصدير */}
      <Dialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <FamilyTreeExporter 
            treeData={treeData} 
            svgRef={svgRef}
          />
        </DialogContent>
      </Dialog>

      {/* نافذة البحث */}
      <Dialog 
        open={searchDialogOpen} 
        onClose={() => setSearchDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">البحث في شجرة العائلة</Typography>
            <Fab size="small" onClick={() => setSearchDialogOpen(false)}>
              <Close />
            </Fab>
          </Box>
          <AdvancedFamilySearch
            treeData={treeData}
            familyData={familyData}
            onPersonSelect={handlePersonSelect}
            onHighlightPath={handleHighlightPath}
          />
        </DialogContent>
      </Dialog>

      {/* وضع ملء الشاشة */}
      <Dialog 
        open={fullscreenMode} 
        onClose={() => setFullscreenMode(false)}
        fullScreen
        PaperProps={{
          sx: { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }
        }}
      >
        <DialogContent sx={{ p: 0, height: '100vh' }}>
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {hasData && (
              <EnhancedFamilyTreeD3
                treeData={treeData}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                width={window.innerWidth}
                height={window.innerHeight}
              />
            )}
            
            <Fab 
              color="primary" 
              sx={{ position: 'absolute', top: 20, right: 20 }}
              onClick={() => setFullscreenMode(false)}
            >
              <Close />
            </Fab>
          </Box>
        </DialogContent>
      </Dialog>

      {/* معلومات الشخص المحدد */}
      {selectedPerson && (
        <Paper 
          elevation={4}
          sx={{ 
            position: 'absolute', 
            bottom: 20, 
            left: 20,
            p: 2,
            maxWidth: 300,
            zIndex: 1000
          }}
        >
          <Typography variant="h6" gutterBottom>
            {selectedPerson.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            العلاقة: {selectedPerson.relation}
          </Typography>
          {selectedPerson.phone && (
            <Typography variant="body2" color="text.secondary">
              الهاتف: {selectedPerson.phone}
            </Typography>
          )}
          {selectedPerson.birthDate && (
            <Typography variant="body2" color="text.secondary">
              تاريخ الميلاد: {new Date(selectedPerson.birthDate).toLocaleDateString('ar-EG')}
            </Typography>
          )}
        </Paper>
      )}

      {/* إحصائيات سريعة */}
      {treeStatistics && activeTab === 0 && (
        <Paper 
          elevation={2}
          sx={{ 
            position: 'absolute', 
            top: 80, 
            left: 20,
            p: 1.5,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Typography variant="caption" display="block">
            👥 {treeStatistics.totalPersons} أشخاص
          </Typography>
          <Typography variant="caption" display="block">
            ⏳ {treeStatistics.totalGenerations} أجيال
          </Typography>
          <Typography variant="caption" display="block">
            ✅ اكتمال البيانات: {treeStatistics.completenessScore}%
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default EnhancedFamilyTreeWrapper;