import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Modal, FormControlLabel, Switch, Alert,
  Snackbar, CircularProgress, Chip, Card, CardContent, Grid,
  IconButton, Tooltip, TextField, InputAdornment, Paper,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  SpeedDial, SpeedDialAction, Slider
} from '@mui/material';
import {
  AccountTree, Search, Analytics, Groups, Edit, Person,
  Visibility, Close, ZoomIn, ZoomOut, CenterFocusStrong, Download,
  Share, Print, Settings, Refresh, Speed, SaveAlt,
  FilterList, Timeline, Info, Warning, CheckCircle
} from '@mui/icons-material';

// استيراد Hook المُصحح
import useAdvancedFamilyGraph from '../hooks/useAdvancedFamilyGraph';

// =============================================================================
// المكون الرئيسي
// =============================================================================

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const {
    familyGraph,
    treeData,
    loading,
    error,
    loadingProgress,
    loadingStage,
    statistics,
    searchResults,
    selectedPersons,
    loadExtendedTree,
    searchInTree,
    findRelationshipPath,
    selectPerson,
    clearSelection,
    getPersonDetails,
    exportTreeData,
    isReady,
    hasData
  } = useAdvancedFamilyGraph({
    maxDepth: 4,
    includeExtended: true,
    autoOptimize: true
  });

  // حالات الواجهة
  const [showExtendedTree, setShowExtendedTree] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentView, setCurrentView] = useState('tree');
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [treeOrientation, setTreeOrientation] = useState('vertical');
  const [showGenerations, setShowGenerations] = useState(true);
  const [nodeStyle, setNodeStyle] = useState('detailed');
  
  // حالات البحث والفلاتر
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // حالات النوافذ المنبثقة
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  // حالات الإشعارات
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  // المتغيرات
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();

  // ===========================================================================
  // تأثيرات ودورة الحياة
  // ===========================================================================

  // تحميل البيانات عند تحميل المكون
  useEffect(() => {
    if (!uid) {
      navigate('/login');
      return;
    }

    loadInitialData();
  }, [uid, navigate]);

  // مراقبة تغيير وضع الشجرة الموسعة
  useEffect(() => {
    if (uid && isReady) {
      loadExtendedTree(uid, showExtendedTree, { forceRefresh: false });
    }
  }, [showExtendedTree, uid]);

  // ===========================================================================
  // دوال التحميل والإدارة
  // ===========================================================================

  /**
   * تحميل البيانات الأولي
   */
  const loadInitialData = useCallback(async () => {
    try {
      console.log('🚀 [FamilyTree] بدء تحميل البيانات الأولي');
      
      await loadExtendedTree(uid, showExtendedTree);
      
      console.log('✅ [FamilyTree] اكتمل التحميل الأولي');
      
    } catch (error) {
      console.error('❌ [FamilyTree] خطأ في التحميل الأولي:', error);
      showSnackbar('فشل في تحميل البيانات', 'error');
    }
  }, [uid, showExtendedTree, loadExtendedTree]);

  /**
   * إعادة تحميل البيانات
   */
  const handleRefresh = useCallback(async () => {
    showSnackbar('جاري إعادة تحميل البيانات...', 'info');
    
    try {
      await loadExtendedTree(uid, showExtendedTree, { 
        forceRefresh: true,
        clearCache: true 
      });
      
      showSnackbar('تم تحديث البيانات بنجاح', 'success');
      
    } catch (error) {
      showSnackbar('فشل في تحديث البيانات', 'error');
    }
  }, [uid, showExtendedTree, loadExtendedTree]);

  // ===========================================================================
  // دوال البحث والفلترة
  // ===========================================================================

  /**
   * التعامل مع البحث
   */
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await searchInTree(query, searchFilters);
      setShowSearchResults(true);
      
      showSnackbar(`تم العثور على ${results.length} نتيجة`, 'info');
      
    } catch (error) {
      showSnackbar('خطأ في البحث', 'error');
    }
  }, [searchInTree, searchFilters]);

  /**
   * البحث عن علاقة بين شخصين
   */
  const handleFindRelationship = useCallback((person1, person2) => {
    if (!person1 || !person2) {
      showSnackbar('اختر شخصين للبحث عن العلاقة بينهما', 'warning');
      return;
    }

    const path = findRelationshipPath(person1.globalId, person2.globalId);
    
    if (path) {
      showSnackbar(`تم العثور على علاقة: ${path.length} خطوات`, 'success');
    } else {
      showSnackbar('لا توجد علاقة مباشرة بين الشخصين', 'info');
    }
  }, [findRelationshipPath]);

  // ===========================================================================
  // دوال التفاعل مع الشجرة
  // ===========================================================================

  /**
   * التعامل مع النقر على عقدة
   */
  const handleNodeClick = useCallback((nodeData) => {
    console.log('👆 [FamilyTree] تم النقر على العقدة:', nodeData.name);
    
    setSelectedNode(nodeData);
    selectPerson(nodeData.attributes);
    setPersonModalOpen(true);
  }, [selectPerson]);

  /**
   * التعامل مع تغيير الزووم
   */
  const handleZoomChange = useCallback((newZoom) => {
    setZoomLevel(Math.max(0.1, Math.min(3, newZoom)));
  }, []);

  // ===========================================================================
  // دوال التصدير والمشاركة
  // ===========================================================================

  /**
   * تصدير الشجرة كصورة
   */
  const handleExportImage = useCallback(async () => {
    try {
      const { default: html2canvas } = await import('html2canvas');
      
      const treeContainer = document.getElementById('tree-container');
      if (!treeContainer) {
        showSnackbar('لا يمكن العثور على حاوية الشجرة', 'error');
        return;
      }

      showSnackbar('جاري تصدير الصورة...', 'info');

      const canvas = await html2canvas(treeContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // تنزيل الصورة
      const link = document.createElement('a');
      link.download = `family-tree-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showSnackbar('تم تصدير الصورة بنجاح', 'success');

    } catch (error) {
      console.error('خطأ في تصدير الصورة:', error);
      showSnackbar('فشل في تصدير الصورة', 'error');
    }
  }, []);

  /**
   * تصدير البيانات
   */
  const handleExportData = useCallback((format) => {
    try {
      const data = exportTreeData(format);
      if (!data) {
        showSnackbar('لا توجد بيانات للتصدير', 'warning');
        return;
      }

      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `family-tree-data.${format}`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      showSnackbar(`تم تصدير البيانات بتنسيق ${format.toUpperCase()}`, 'success');
      setExportModalOpen(false);

    } catch (error) {
      console.error('خطأ في تصدير البيانات:', error);
      showSnackbar('فشل في تصدير البيانات', 'error');
    }
  }, [exportTreeData]);

  // ===========================================================================
  // دوال مساعدة
  // ===========================================================================

  /**
   * عرض إشعار
   */
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  /**
   * إعادة تعيين الزووم
   */
  const resetZoom = useCallback(() => {
    setZoomLevel(0.8);
  }, []);

  /**
   * تكبير/تصغير
   */
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.1));
  }, []);

  // ===========================================================================
  // عرض العقدة المخصص المحسن
  // ===========================================================================

  const renderAdvancedNodeElement = useCallback(({ nodeDatum, toggleNode }) => {
    const person = nodeDatum.attributes;
    const isSelected = selectedPersons.some(p => p.globalId === nodeDatum.id);
    
    return (
      <g>
        {/* خلفية العقدة */}
        <rect
          width="220"
          height="240"
          x="-110"
          y="-120"
          rx="20"
          fill={isSelected ? '#e3f2fd' : 'white'}
          stroke={isSelected ? '#2196f3' : '#e0e0e0'}
          strokeWidth={isSelected ? 3 : 1}
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
            cursor: 'pointer'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {/* صورة الشخص */}
        <circle
          cx="0"
          cy="-70"
          r="40"
          fill="white"
          stroke="#2196f3"
          strokeWidth="3"
        />
        <image
          href={nodeDatum.avatar || '/boy.png'}
          x="-35"
          y="-105"
          width="70"
          height="70"
          clipPath="circle(35px at 35px 35px)"
          style={{ cursor: 'pointer' }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {/* رمز الجنس */}
        <circle
          cx="30"
          cy="-95"
          r="10"
          fill={person?.gender === 'female' ? '#e91e63' : '#2196f3'}
        />
        <text
          x="30"
          y="-90"
          textAnchor="middle"
          style={{ fontSize: '12px', fill: 'white', fontWeight: 'bold' }}
        >
          {person?.gender === 'female' ? '♀' : '♂'}
        </text>
        
        {/* اسم الشخص */}
        <text
          x="0"
          y="-15"
          textAnchor="middle"
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            fill: '#1565c0',
            cursor: 'pointer'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        >
          {nodeDatum.name.length > 20 
            ? nodeDatum.name.substring(0, 20) + '...' 
            : nodeDatum.name}
        </text>
        
        {/* القرابة */}
        <rect
          x="-40"
          y="5"
          width="80"
          height="22"
          rx="11"
          fill={person?.relation === 'رب العائلة' ? '#4caf50' : '#ff9800'}
          opacity="0.9"
        />
        <text
          x="0"
          y="19"
          textAnchor="middle"
          style={{
            fontSize: '11px',
            fill: 'white',
            fontWeight: 'bold'
          }}
        >
          {person?.relation || 'عضو'}
        </text>
        
        {/* الجيل */}
        {showGenerations && (
          <text
            x="0"
            y="40"
            textAnchor="middle"
            style={{
              fontSize: '10px',
              fill: '#666',
              fontWeight: '500'
            }}
          >
            جيل {person?.generation || 0}
          </text>
        )}
        
        {/* عدد الأطفال */}
        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <>
            <circle
              cx="0"
              cy="65"
              r="15"
              fill="#4caf50"
              opacity="0.9"
            />
            <text
              x="0"
              y="70"
              textAnchor="middle"
              style={{
                fontSize: '12px',
                fill: 'white',
                fontWeight: 'bold'
              }}
            >
              {nodeDatum.children.length}
            </text>
          </>
        )}
        
        {/* مؤشر العائلة الموسعة */}
        {person?.hasExtendedFamily && (
          <circle
            cx="85"
            cy="-85"
            r="10"
            fill="#9c27b0"
          />
        )}
        
        {/* تاريخ الميلاد */}
        {person?.birthDate && (
          <text
            x="0"
            y="90"
            textAnchor="middle"
            style={{
              fontSize: '9px',
              fill: '#999',
              fontStyle: 'italic'
            }}
          >
            {new Date(person.birthDate).getFullYear()}
          </text>
        )}
        
        {/* مؤشر التحديد */}
        {isSelected && (
          <circle
            cx="-85"
            cy="-85"
            r="8"
            fill="#2196f3"
          />
        )}
      </g>
    );
  }, [selectedPersons, showGenerations, handleNodeClick]);

  // ===========================================================================
  // شريط الأدوات المتقدم
  // ===========================================================================

  const renderAdvancedToolbar = () => (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e0e0e0',
        padding: 2
      }}
    >
      {/* العنوان الرئيسي */}
      <Typography 
        variant="h5" 
        textAlign="center" 
        sx={{ mb: 2, color: '#2e7d32', fontWeight: 'bold' }}
      >
        🌳 شجرة العائلة المتقدمة
      </Typography>
      
      {/* شريط التقدم عند التحميل */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ mb: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" textAlign="center" color="text.secondary">
            {loadingStage} ({Math.round(loadingProgress)}%)
          </Typography>
        </Box>
      )}
      
      {/* أزرار التبديل بين الواجهات */}
      <Box
        display="flex"
        gap={1}
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
        sx={{ mb: 2 }}
      >
        <Button
          variant={currentView === 'tree' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setCurrentView('tree')}
          startIcon={<AccountTree />}
          disabled={loading}
        >
          الشجرة
        </Button>
        
        <Button
          variant={currentView === 'analytics' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setCurrentView('analytics')}
          startIcon={<Analytics />}
          disabled={!hasData}
        >
          التحليلات
        </Button>
        
        <Button
          variant={currentView === 'search' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setCurrentView('search')}
          startIcon={<Search />}
          disabled={!hasData}
        >
          البحث
        </Button>
      </Box>

      {/* أدوات التحكم الخاصة بالشجرة */}
      {currentView === 'tree' && (
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={1}
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
        >
          {/* أزرار التنقل */}
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/family')}
              disabled={loading}
            >
              ⬅️ إدارة الأفراد
            </Button>
            
            <Button
              variant="contained"
              size="small"
              color="success"
              onClick={() => navigate('/family')}
              disabled={loading}
            >
              ➕ إضافة
            </Button>
          </Box>

          {/* أدوات التصدير */}
          <Box display="flex" gap={1}>
            <Tooltip title="تصدير كصورة">
              <IconButton
                size="small"
                onClick={handleExportImage}
                disabled={!hasData || loading}
                sx={{ bgcolor: 'primary.light', color: 'white' }}
              >
                <Download />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="تصدير البيانات">
              <IconButton
                size="small"
                onClick={() => setExportModalOpen(true)}
                disabled={!hasData || loading}
                sx={{ bgcolor: 'secondary.light', color: 'white' }}
              >
                <SaveAlt />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="مشاركة">
              <IconButton
                size="small"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'شجرة العائلة',
                      text: 'شاهد شجرة عائلتي'
                    });
                  }
                }}
                sx={{ bgcolor: 'success.light', color: 'white' }}
              >
                <Share />
              </IconButton>
            </Tooltip>
          </Box>

          {/* أدوات التكبير */}
          <Box display="flex" gap={1} alignItems="center">
            <Tooltip title="تصغير">
              <IconButton size="small" onClick={zoomOut} disabled={loading}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            
            <Chip 
              label={`${Math.round(zoomLevel * 100)}%`} 
              size="small" 
              onClick={resetZoom}
              style={{ cursor: 'pointer', minWidth: 60 }}
            />
            
            <Tooltip title="تكبير">
              <IconButton size="small" onClick={zoomIn} disabled={loading}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="إعادة تحميل">
              <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>

          {/* مفاتيح التبديل */}
          <Box display="flex" gap={2} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={showExtendedTree}
                  onChange={(e) => setShowExtendedTree(e.target.checked)}
                  color="primary"
                  size="small"
                  disabled={loading}
                />
              }
              label="الشجرة الموسعة"
              sx={{ fontSize: 14 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showGenerations}
                  onChange={(e) => setShowGenerations(e.target.checked)}
                  color="secondary"
                  size="small"
                />
              }
              label="عرض الأجيال"
              sx={{ fontSize: 14 }}
            />
          </Box>

          {/* أزرار الإعدادات */}
          <Box display="flex" gap={1}>
            <Tooltip title="الإحصائيات">
              <IconButton
                size="small"
                onClick={() => setStatsModalOpen(true)}
                disabled={!hasData}
                sx={{ bgcolor: 'info.light', color: 'white' }}
              >
                <Analytics />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="الإعدادات">
              <IconButton
                size="small"
                onClick={() => setSettingsModalOpen(true)}
                sx={{ bgcolor: 'warning.light', color: 'white' }}
              >
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* معلومات الحالة */}
      {hasData && (
        <Box
          display="flex"
          justifyContent="center"
          gap={3}
          sx={{ mt: 1, opacity: 0.7 }}
        >
          <Typography variant="caption">
            👥 الأشخاص: {statistics?.overview?.totalPersons || 0}
          </Typography>
          <Typography variant="caption">
            🏠 العائلات: {statistics?.overview?.totalFamilies || 0}
          </Typography>
          <Typography variant="caption">
            🔗 العلاقات: {statistics?.overview?.totalRelations || 0}
          </Typography>
          <Typography variant="caption">
            📍 الوضع: {showExtendedTree ? 'موسع' : 'عادي'}
          </Typography>
        </Box>
      )}
    </Paper>
  );

  // ===========================================================================
  // عرض الشجرة الرئيسي
  // ===========================================================================

  const renderTreeView = () => (
    <Box
      id="tree-container"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
      }}
    >
      {treeData ? (
        <Tree
          data={treeData}
          orientation={treeOrientation}
          translate={{ 
            x: window.innerWidth / 2, 
            y: treeOrientation === 'vertical' ? 120 : window.innerHeight / 2 
          }}
          zoomable
          zoom={zoomLevel}
          collapsible={false}
          pathFunc="elbow"
          separation={{ siblings: 1.8, nonSiblings: 2.2 }}
          nodeSize={{ x: 280, y: 320 }}
          renderCustomNodeElement={renderAdvancedNodeElement}
          styles={{
            links: {
              stroke: '#2196f3',
              strokeWidth: 2,
            }
          }}
          onNodeClick={handleNodeClick}
          allowForeignObjects={true}
          depthFactor={320}
        />
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          {loading ? (
            <Box textAlign="center">
              <CircularProgress size={80} sx={{ color: '#2e7d32', mb: 3 }} />
              <Typography variant="h5" sx={{ mb: 2, color: '#2e7d32' }}>
                {loadingStage || 'جاري التحميل...'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {loadingProgress > 0 && `${Math.round(loadingProgress)}% مكتمل`}
              </Typography>
            </Box>
          ) : error ? (
            <Box textAlign="center">
              <Warning sx={{ fontSize: 80, color: '#f44336', mb: 2 }} />
              <Typography variant="h4" color="error" gutterBottom>
                حدث خطأ
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {error}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleRefresh}
                startIcon={<Refresh />}
              >
                إعادة المحاولة
              </Button>
            </Box>
          ) : (
            <Box textAlign="center">
              <AccountTree sx={{ fontSize: 80, color: '#2e7d32', mb: 2 }} />
              <Typography variant="h4" color="text.secondary" gutterBottom>
                🌱 شجرة العائلة فارغة
              </Typography>
              <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3, maxWidth: 400 }}>
                لم يتم العثور على بيانات لعرض الشجرة. ابدأ بإضافة أفراد العائلة لبناء شجرتك.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => navigate('/family')}
                startIcon={<Person />}
              >
                إضافة أول فرد في العائلة
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  // ===========================================================================
  // عرض التحليلات
  // ===========================================================================

  const renderAnalyticsView = () => {
    if (!statistics) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <Typography variant="h6" color="text.secondary">
            لا توجد إحصائيات متاحة
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom textAlign="center" sx={{ mb: 4 }}>
          📊 تحليلات شجرة العائلة
        </Typography>
        
        <Grid container spacing={3}>
          {/* إحصائيات عامة */}
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h3" color="primary" fontWeight="bold">
                {statistics.overview.totalPersons}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                إجمالي الأشخاص
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {statistics.overview.totalFamilies}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                العائلات
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h3" color="info.main" fontWeight="bold">
                {statistics.overview.totalRelations}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                العلاقات
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h3" color="warning.main" fontWeight="bold">
                {Object.keys(statistics.generations || {}).length}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                عدد الأجيال
              </Typography>
            </Card>
          </Grid>

          {/* توزيع الجنس */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                📈 توزيع الجنس
              </Typography>
              <Box display="flex" justifyContent="space-around">
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {statistics.genders?.male || 0}
                  </Typography>
                  <Typography variant="body2">ذكور</Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="secondary">
                    {statistics.genders?.female || 0}
                  </Typography>
                  <Typography variant="body2">إناث</Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="text.secondary">
                    {statistics.genders?.unknown || 0}
                  </Typography>
                  <Typography variant="body2">غير محدد</Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* توزيع الأجيال */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                📊 توزيع الأجيال
              </Typography>
              <Box>
                {Object.entries(statistics.generations || {})
                  .sort(([a], [b]) => parseInt(b) - parseInt(a))
                  .map(([generation, count]) => (
                    <Box key={generation} display="flex" justifyContent="space-between" mb={1}>
                      <Typography>جيل {generation}</Typography>
                      <Chip label={count} size="small" color="primary" />
                    </Box>
                  ))
                }
              </Box>
            </Card>
          </Grid>

          {/* أداء النظام */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                ⚡ أداء النظام
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="success.main">
                      {statistics.performance?.totalLoadTime || 0}ms
                    </Typography>
                    <Typography variant="body2">وقت التحميل</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="info.main">
                      {statistics.performance?.cacheSize || 0}
                    </Typography>
                    <Typography variant="body2">حجم الذاكرة المؤقتة</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="warning.main">
                      {statistics.performance?.indexSizes?.names || 0}
                    </Typography>
                    <Typography variant="body2">فهرس الأسماء</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="primary.main">
                      {statistics.overview?.loadedFamilies || 0}
                    </Typography>
                    <Typography variant="body2">العائلات المحملة</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ===========================================================================
  // عرض البحث
  // ===========================================================================

  const renderSearchView = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom textAlign="center">
        🔍 البحث المتقدم
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="البحث في شجرة العائلة"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchQuery);
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            placeholder="ابحث بالاسم، القرابة، أو أي معلومة..."
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => handleSearch(searchQuery)}
            startIcon={<Search />}
            disabled={!searchQuery.trim() || loading}
          >
            بحث
          </Button>
        </Grid>
      </Grid>

      {/* نتائج البحث */}
      {showSearchResults && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            النتائج ({searchResults.length})
          </Typography>
          
          <Grid container spacing={2}>
            {searchResults.map(person => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={person.globalId}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                  }}
                  onClick={() => {
                    selectPerson(person);
                    setSelectedNode({
                      id: person.globalId,
                      name: person.name,
                      avatar: person.avatar,
                      attributes: person
                    });
                    setPersonModalOpen(true);
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box
                      component="img"
                      src={person.avatar || '/boy.png'}
                      alt={person.name}
                      sx={{ 
                        width: 60, 
                        height: 60, 
                        borderRadius: '50%', 
                        mx: 'auto', 
                        mb: 1,
                        objectFit: 'cover'
                      }}
                    />
                    <Typography variant="h6" fontSize="0.9rem">
                      {person.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {person.relation}
                    </Typography>
                    <Chip 
                      label={`جيل ${person.generation}`} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );

  // ===========================================================================
  // النوافذ المنبثقة
  // ===========================================================================

  // نافذة تفاصيل الشخص
  const renderPersonModal = () => (
    <Modal open={personModalOpen} onClose={() => setPersonModalOpen(false)}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: 350, sm: 450 },
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {selectedNode && (
          <>
            <Box
              component="img"
              src={selectedNode.avatar || '/boy.png'}
              alt={selectedNode.name}
              sx={{ 
                width: 120, 
                height: 120, 
                borderRadius: '50%', 
                mx: 'auto', 
                mb: 2,
                objectFit: 'cover'
              }}
            />
            
            <Typography variant="h5" gutterBottom sx={{ color: '#1565c0' }}>
              {selectedNode.name}
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  القرابة
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedNode.attributes?.relation || 'غير محدد'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  الجيل
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedNode.attributes?.generation || 0}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  تاريخ الميلاد
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedNode.attributes?.birthDate || 'غير محدد'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  الجنس
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedNode.attributes?.gender === 'female' ? 'أنثى' : 'ذكر'}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  عدد الأطفال
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedNode.attributes?.childrenCount || 0}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  العائلات
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedNode.attributes?.familyCount || 1}
                </Typography>
              </Grid>
            </Grid>
            
            <Box display="flex" gap={2} justifyContent="center" sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  if (selectedNode.attributes) {
                    handleSearch(selectedNode.name);
                    setCurrentView('search');
                    setPersonModalOpen(false);
                  }
                }}
                startIcon={<Search />}
              >
                البحث عن الأقارب
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setCurrentView('analytics');
                  setPersonModalOpen(false);
                }}
                startIcon={<Analytics />}
              >
                التحليلات
              </Button>
            </Box>
            
            <Button
              variant="contained"
              fullWidth
              onClick={() => setPersonModalOpen(false)}
            >
              إغلاق
            </Button>
          </>
        )}
      </Box>
    </Modal>
  );

  // نافذة الإحصائيات
  const renderStatsModal = () => (
    <Modal open={statsModalOpen} onClose={() => setStatsModalOpen(false)}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 600 },
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: 3,
          overflow: 'auto',
        }}
      >
        <Box p={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="bold">
              📊 إحصائيات مفصلة
            </Typography>
            <IconButton onClick={() => setStatsModalOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          
          {renderAnalyticsView()}
        </Box>
      </Box>
    </Modal>
  );

  // نافذة التصدير
  const renderExportModal = () => (
    <Dialog open={exportModalOpen} onClose={() => setExportModalOpen(false)}>
      <DialogTitle>
        📤 تصدير بيانات الشجرة
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 3 }}>
          اختر تنسيق التصدير المناسب لاحتياجاتك
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => handleExportData('json')}
              startIcon={<SaveAlt />}
            >
              JSON
            </Button>
          </Grid>
          
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => handleExportData('csv')}
              startIcon={<SaveAlt />}
            >
              CSV
            </Button>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleExportImage}
              startIcon={<Download />}
              sx={{ mt: 2 }}
            >
              تصدير كصورة PNG
            </Button>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExportModalOpen(false)}>
          إلغاء
        </Button>
      </DialogActions>
    </Dialog>
  );

  // نافذة الإعدادات
  const renderSettingsModal = () => (
    <Dialog open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)}>
      <DialogTitle>
        ⚙️ إعدادات الشجرة
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography gutterBottom>
            اتجاه الشجرة
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Button
              variant={treeOrientation === 'vertical' ? 'contained' : 'outlined'}
              onClick={() => setTreeOrientation('vertical')}
              sx={{ mr: 1 }}
            >
              عمودي
            </Button>
            <Button
              variant={treeOrientation === 'horizontal' ? 'contained' : 'outlined'}
              onClick={() => setTreeOrientation('horizontal')}
            >
              أفقي
            </Button>
          </Box>

          <Typography gutterBottom>
            مستوى التكبير
          </Typography>
          <Slider
            value={zoomLevel}
            onChange={(e, newValue) => setZoomLevel(newValue)}
            min={0.1}
            max={3}
            step={0.1}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            sx={{ mb: 3 }}
          />

          <Typography gutterBottom>
            نمط العقد
          </Typography>
          <Box>
            <Button
              variant={nodeStyle === 'detailed' ? 'contained' : 'outlined'}
              onClick={() => setNodeStyle('detailed')}
              sx={{ mr: 1, mb: 1 }}
            >
              مفصل
            </Button>
            <Button
              variant={nodeStyle === 'simple' ? 'contained' : 'outlined'}
              onClick={() => setNodeStyle('simple')}
              sx={{ mr: 1, mb: 1 }}
            >
              بسيط
            </Button>
            <Button
              variant={nodeStyle === 'compact' ? 'contained' : 'outlined'}
              onClick={() => setNodeStyle('compact')}
              sx={{ mb: 1 }}
            >
              مضغوط
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSettingsModalOpen(false)}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ===========================================================================
  // العرض الرئيسي للواجهة
  // ===========================================================================

  const renderCurrentView = () => {
    switch (currentView) {
      case 'analytics':
        return renderAnalyticsView();
      case 'search':
        return renderSearchView();
      default:
        return renderTreeView();
    }
  };

  // ===========================================================================
  // الزر العائم للإجراءات السريعة
  // ===========================================================================

  const renderSpeedDial = () => (
    <SpeedDial
      ariaLabel="إجراءات سريعة"
      sx={{ 
        position: 'fixed', 
        bottom: 24, 
        left: 24,
        zIndex: 1000
      }}
      icon={<Speed />}
      FabProps={{
        size: 'large',
        color: 'primary'
      }}
    >
      <SpeedDialAction
        icon={<Refresh />}
        tooltipTitle="إعادة تحميل"
        onClick={handleRefresh}
        disabled={loading}
      />
      
      <SpeedDialAction
        icon={<Download />}
        tooltipTitle="تصدير صورة"
        onClick={handleExportImage}
        disabled={!hasData || loading}
      />
      
      <SpeedDialAction
        icon={<Analytics />}
        tooltipTitle="الإحصائيات"
        onClick={() => setStatsModalOpen(true)}
        disabled={!hasData}
      />
      
      <SpeedDialAction
        icon={<Settings />}
        tooltipTitle="الإعدادات"
        onClick={() => setSettingsModalOpen(true)}
      />

      <SpeedDialAction
        icon={<Search />}
        tooltipTitle="البحث"
        onClick={() => setCurrentView('search')}
        disabled={!hasData}
      />
    </SpeedDial>
  );

  // ===========================================================================
  // معلومات الحالة في الزاوية
  // ===========================================================================

  const renderStatusInfo = () => (
    <Box
      sx={{
        position: 'fixed',
        top: { xs: 200, sm: 180 },
        right: 16,
        zIndex: 999,
        minWidth: 200
      }}
    >
      {/* حالة التحميل */}
      {loading && (
        <Alert 
          severity="info" 
          icon={<CircularProgress size={20} />}
          sx={{ mb: 1 }}
        >
          {loadingStage}
        </Alert>
      )}

      {/* حالة الخطأ */}
      {error && !loading && (
        <Alert 
          severity="error"
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={handleRefresh}
            >
              <Refresh />
            </IconButton>
          }
          sx={{ mb: 1 }}
        >
          حدث خطأ
        </Alert>
      )}

      {/* حالة النجاح */}
      {isReady && hasData && !loading && !error && (
        <Alert 
          severity="success"
          sx={{ mb: 1 }}
        >
          تم تحميل البيانات بنجاح
        </Alert>
      )}

      {/* معلومات الأشخاص المحددين */}
      {selectedPersons.length > 0 && (
        <Alert
          severity="info"
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={clearSelection}
            >
              <Close />
            </IconButton>
          }
          sx={{ mb: 1 }}
        >
          تم تحديد {selectedPersons.length} شخص
        </Alert>
      )}
    </Box>
  );

  // ===========================================================================
  // الإرجاع النهائي للمكون
  // ===========================================================================

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f8f9fa',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* شريط الأدوات المتقدم */}
      {renderAdvancedToolbar()}

      {/* المحتوى الرئيسي */}
      <Box
        sx={{
          position: 'absolute',
          top: currentView === 'tree' ? 200 : 180,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'auto',
          backgroundColor: currentView !== 'tree' ? '#fff' : 'transparent',
        }}
      >
        {renderCurrentView()}
      </Box>

      {/* معلومات الحالة */}
      {renderStatusInfo()}

      {/* الزر العائم للإجراءات السريعة */}
      {renderSpeedDial()}

      {/* النوافذ المنبثقة */}
      {renderPersonModal()}
      {renderStatsModal()}
      {renderExportModal()}
      {renderSettingsModal()}

      {/* الإشعارات */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ 
            width: '100%',
            borderRadius: 2,
            boxShadow: 3
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* مؤشر الأداء (في وضع التطوير) */}
      {process.env.NODE_ENV === 'development' && statistics && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            zIndex: 9999,
            minWidth: 150
          }}
        >
          <Typography variant="caption" display="block">
            العقد: {statistics.overview?.totalPersons || 0}
          </Typography>
          <Typography variant="caption" display="block">
            العائلات: {statistics.overview?.totalFamilies || 0}
          </Typography>
          <Typography variant="caption" display="block">
            الذاكرة: {statistics.performance?.cacheSize || 0}
          </Typography>
          <Typography variant="caption" display="block">
            الوقت: {statistics.performance?.totalLoadTime || 0}ms
          </Typography>
        </Box>
      )}
    </Box>
  );
}