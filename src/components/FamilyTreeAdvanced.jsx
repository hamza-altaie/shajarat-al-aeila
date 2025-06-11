import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Modal, FormControlLabel, Switch, Alert,
  Snackbar, CircularProgress, Chip, Card, CardContent, Grid,
  IconButton, Tooltip, TextField, InputAdornment, Paper,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  AccountTree, Search, Analytics, Groups, Edit, Person,
  Visibility, Close, ZoomIn, ZoomOut, CenterFocusStrong, Download,
  Share, Print, Settings, Refresh, Warning, CheckCircle
} from '@mui/icons-material';

// استيراد Hook المُصحح
import useAdvancedFamilyGraph from '../hooks/useAdvancedFamilyGraph';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالات النوافذ المنبثقة
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  
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

  // ===========================================================================
  // دوال التحميل والإدارة
  // ===========================================================================

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

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      return;
    }

    try {
      const results = await searchInTree(query);
      showSnackbar(`تم العثور على ${results.length} نتيجة`, 'info');
      
    } catch (error) {
      showSnackbar('خطأ في البحث', 'error');
    }
  }, [searchInTree]);

  // ===========================================================================
  // دوال التفاعل مع الشجرة
  // ===========================================================================

  const handleNodeClick = useCallback((nodeData) => {
    console.log('👆 [FamilyTree] تم النقر على العقدة:', nodeData.name);
    
    setSelectedNode(nodeData);
    selectPerson(nodeData.attributes);
    setPersonModalOpen(true);
  }, [selectPerson]);

  // ===========================================================================
  // دوال مساعدة
  // ===========================================================================

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.1));
  }, []);

  // ===========================================================================
  // عرض العقدة المخصص
  // ===========================================================================

  const renderAdvancedNodeElement = useCallback(({ nodeDatum, toggleNode }) => {
    const person = nodeDatum.attributes;
    const isSelected = selectedPersons.some(p => p.globalId === nodeDatum.id);
    
    return (
      <g>
        {/* خلفية العقدة */}
        <rect
          width="200"
          height="120"
          x="-100"
          y="-60"
          rx="10"
          fill={isSelected ? '#e3f2fd' : 'white'}
          stroke={isSelected ? '#2196f3' : '#e0e0e0'}
          strokeWidth={isSelected ? 2 : 1}
          style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {/* صورة الشخص */}
        <circle
          cx="0"
          cy="-20"
          r="20"
          fill="white"
          stroke="#2196f3"
          strokeWidth="2"
        />
        <image
          href={nodeDatum.avatar || '/boy.png'}
          x="-18"
          y="-38"
          width="36"
          height="36"
          clipPath="circle(18px at 18px 18px)"
          style={{ cursor: 'pointer' }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {/* اسم الشخص */}
        <text
          x="0"
          y="10"
          textAnchor="middle"
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            fill: '#1565c0',
            cursor: 'pointer'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        >
          {nodeDatum.name.length > 15 
            ? nodeDatum.name.substring(0, 15) + '...' 
            : nodeDatum.name}
        </text>
        
        {/* القرابة */}
        <text
          x="0"
          y="30"
          textAnchor="middle"
          style={{
            fontSize: '10px',
            fill: '#666'
          }}
        >
          {person?.relation || 'عضو'}
        </text>
        
        {/* عدد الأطفال */}
        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <>
            <circle
              cx="70"
              cy="-40"
              r="10"
              fill="#4caf50"
            />
            <text
              x="70"
              y="-35"
              textAnchor="middle"
              style={{
                fontSize: '10px',
                fill: 'white',
                fontWeight: 'bold'
              }}
            >
              {nodeDatum.children.length}
            </text>
          </>
        )}
      </g>
    );
  }, [selectedPersons, handleNodeClick]);

  // ===========================================================================
  // عرض الشجرة الرئيسي
  // ===========================================================================

  const renderTreeView = () => (
    <Box
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
          orientation="vertical"
          translate={{ x: window.innerWidth / 2, y: 100 }}
          zoomable
          zoom={zoomLevel}
          collapsible={false}
          pathFunc="elbow"
          separation={{ siblings: 1.5, nonSiblings: 2 }}
          nodeSize={{ x: 220, y: 150 }}
          renderCustomNodeElement={renderAdvancedNodeElement}
          styles={{
            links: {
              stroke: '#2196f3',
              strokeWidth: 2,
            }
          }}
          onNodeClick={handleNodeClick}
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
  // شريط الأدوات
  // ===========================================================================

  const renderToolbar = () => (
    <Paper
      elevation={4}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        p: 2
      }}
    >
      <Typography 
        variant="h5" 
        textAlign="center" 
        sx={{ mb: 2, color: '#2e7d32', fontWeight: 'bold' }}
      >
        🌳 شجرة العائلة المتقدمة
      </Typography>
      
      {loading && (
        <LinearProgress 
          variant="determinate" 
          value={loadingProgress} 
          sx={{ mb: 2, height: 6, borderRadius: 3 }}
        />
      )}
      
      <Box
        display="flex"
        gap={1}
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
      >
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

        <Tooltip title="تكبير">
          <IconButton size="small" onClick={zoomIn} disabled={loading}>
            <ZoomIn />
          </IconButton>
        </Tooltip>
        
        <Chip 
          label={`${Math.round(zoomLevel * 100)}%`} 
          size="small" 
          onClick={() => setZoomLevel(0.8)}
          style={{ cursor: 'pointer', minWidth: 60 }}
        />
        
        <Tooltip title="تصغير">
          <IconButton size="small" onClick={zoomOut} disabled={loading}>
            <ZoomOut />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="إعادة تحميل">
          <IconButton size="small" onClick={handleRefresh} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>

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
      </Box>

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
        </Box>
      )}
    </Paper>
  );

  // ===========================================================================
  // النوافذ المنبثقة
  // ===========================================================================

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
          textAlign: 'center'
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
            </Grid>
            
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

  // ===========================================================================
  // العرض الرئيسي
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
      {renderToolbar()}

      <Box
        sx={{
          position: 'absolute',
          top: 140,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'auto'
        }}
      >
        {renderTreeView()}
      </Box>

      {renderPersonModal()}

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}