// src/components/FamilyTreeAdvanced.jsx - إصلاح مشكلة onClick في Chip
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Modal, FormControlLabel, Switch, Alert,
  Snackbar, CircularProgress, Chip, Card, CardContent, Grid,
  IconButton, Tooltip, TextField, InputAdornment, Paper,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Divider, List, ListItem, ListItemText, 
  ListItemAvatar, Badge
} from '@mui/material';
import {
  AccountTree, Search, Analytics, Groups, Edit, Person,
  Visibility, Close, ZoomIn, ZoomOut, CenterFocusStrong, Download,
  Share, Print, Settings, Refresh, Warning, CheckCircle,
  Link as LinkIcon, PersonAdd, ExpandMore, ExpandLess,
  Timeline as TimelineIcon
} from '@mui/icons-material';

// استيرادات Firebase
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

// استيراد Hook والمكونات
import useAdvancedFamilyGraph from '../hooks/useAdvancedFamilyGraph';
import ExtendedFamilyLinking from './ExtendedFamilyLinking';

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentView, setCurrentView] = useState('tree');
  const [zoomLevel, setZoomLevel] = useState(0.6);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);
  const [crossFamilyConnections, setCrossFamilyConnections] = useState([]);
  
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [extendedStatsOpen, setExtendedStatsOpen] = useState(false);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();

  // استخدام Hook
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
    maxDepth: 6,
    includeExtended: true,
    autoOptimize: true,
    enableCrossFamily: true
  });

  // ===========================================================================
  // تأثيرات ودورة الحياة
  // ===========================================================================

  useEffect(() => {
    if (!uid) {
      navigate('/login');
      return;
    }

    loadInitialData();
    loadLinkedFamilies();
  }, [uid, navigate]);

  useEffect(() => {
    if (hasData && showExtendedTree) {
      loadExtendedTree(uid, true, { 
        maxDepth: 6,
        includeCrossFamilyLinks: true,
        loadLinkedFamilies: true
      });
    }
  }, [showExtendedTree, hasData, uid, loadExtendedTree]);

  // ===========================================================================
  // دوال التحميل والإدارة
  // ===========================================================================

  const loadInitialData = useCallback(async () => {
    try {
      console.log('🚀 [FamilyTree] بدء تحميل البيانات الموسعة');
      
      await loadExtendedTree(uid, showExtendedTree, {
        includeCrossFamilyLinks: true,
        loadLinkedFamilies: true,
        maxDepth: showExtendedTree ? 6 : 3
      });
      
      console.log('✅ [FamilyTree] اكتمل التحميل الموسع');
      
    } catch (error) {
      console.error('❌ [FamilyTree] خطأ في التحميل الموسع:', error);
      showSnackbar('فشل في تحميل البيانات الموسعة', 'error');
    }
  }, [uid, showExtendedTree, loadExtendedTree]);

  const loadLinkedFamilies = useCallback(async () => {
    try {
      console.log('🔗 تحميل العائلات المرتبطة...');
      
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const linked = userData.linkedFamilies || [];
        setLinkedFamilies(linked);
        
        console.log(`✅ تم تحميل ${linked.length} عائلة مرتبطة`);
      }
      
    } catch (error) {
      console.error('❌ خطأ في تحميل العائلات المرتبطة:', error);
    }
  }, [uid]);

  const handleRefresh = useCallback(async () => {
    showSnackbar('جاري إعادة تحميل البيانات الموسعة...', 'info');
    
    try {
      await loadExtendedTree(uid, showExtendedTree, { 
        forceRefresh: true,
        clearCache: true,
        includeCrossFamilyLinks: true,
        loadLinkedFamilies: true
      });
      
      await loadLinkedFamilies();
      
      showSnackbar('تم تحديث البيانات الموسعة بنجاح', 'success');
      
    } catch (error) {
      showSnackbar('فشل في تحديث البيانات', 'error');
    }
  }, [uid, showExtendedTree, loadExtendedTree, loadLinkedFamilies]);

  // ===========================================================================
  // دوال التفاعل - مُصححة
  // ===========================================================================

  const handleNodeClick = useCallback((nodeData) => {
    console.log('👆 [FamilyTree] تم النقر على العقدة:', nodeData.name);
    
    setSelectedNode(nodeData);
    selectPerson(nodeData.attributes);
    setPersonModalOpen(true);
  }, [selectPerson]);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleLinkingComplete = useCallback((linkedFamily, linkType) => {
    showSnackbar(`تم ربط ${linkedFamily.name} بنجاح كـ ${linkType}`, 'success');
    loadLinkedFamilies();
    loadInitialData();
  }, [loadLinkedFamilies, loadInitialData]);

  // ✅ إصلاح دوال التحكم في التكبير
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.2));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(0.6);
  }, []);

  // ===========================================================================
  // عرض العقدة المخصص
  // ===========================================================================

  const renderAdvancedNodeElement = useCallback(({ nodeDatum, toggleNode }) => {
    const person = nodeDatum.attributes;
    const isSelected = selectedPersons.some(p => p.globalId === nodeDatum.id);
    const isFromDifferentFamily = person?.familyUid !== uid;
    const hasMultipleFamilies = person?.familyUids?.size > 1;
    
    return (
      <g>
        <defs>
          <linearGradient id={`grad-${nodeDatum.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={
              isFromDifferentFamily ? '#fff3e0' : 
              isSelected ? '#e3f2fd' : '#ffffff'
            } />
            <stop offset="100%" stopColor={
              isFromDifferentFamily ? '#ffe0b2' : 
              isSelected ? '#bbdefb' : '#f5f5f5'
            } />
          </linearGradient>
          
          {isFromDifferentFamily && (
            <pattern id={`pattern-${nodeDatum.id}`} patternUnits="userSpaceOnUse" width="4" height="4">
              <rect width="4" height="4" fill={`url(#grad-${nodeDatum.id})`}/>
              <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#ff9800" strokeWidth="0.5"/>
            </pattern>
          )}
        </defs>
        
        <rect
          width="260"
          height="160"
          x="-130"
          y="-80"
          rx="20"
          fill={isFromDifferentFamily ? `url(#pattern-${nodeDatum.id})` : `url(#grad-${nodeDatum.id})`}
          stroke={
            isFromDifferentFamily ? '#ff9800' :
            isSelected ? '#2196f3' : '#e0e0e0'
          }
          strokeWidth={isSelected ? 3 : isFromDifferentFamily ? 2 : 1}
          style={{ 
            cursor: 'pointer', 
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {isFromDifferentFamily && (
          <circle
            cx="-110"
            cy="-60"
            r="12"
            fill="#ff9800"
            stroke="white"
            strokeWidth="2"
          />
        )}
        
        {hasMultipleFamilies && (
          <circle
            cx="110"
            cy="-60"
            r="10"
            fill="#9c27b0"
            stroke="white"
            strokeWidth="2"
          />
        )}
        
        <circle
          cx="0"
          cy="-30"
          r="30"
          fill="white"
          stroke={isFromDifferentFamily ? '#ff9800' : '#2196f3'}
          strokeWidth="4"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))' }}
        />
        
        <image
          href={nodeDatum.avatar || '/boy.png'}
          x="-26"
          y="-56"
          width="52"
          height="52"
          clipPath="circle(26px at 26px 26px)"
          style={{ cursor: 'pointer' }}
          onClick={() => handleNodeClick(nodeDatum)}
          onError={(e) => {
            const target = e.target;
            if (target && target.setAttribute) {
              target.setAttribute('href', '/boy.png');
            }
          }}
        />
        
        <text
          x="0"
          y="20"
          textAnchor="middle"
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            fill: isFromDifferentFamily ? '#e65100' : '#1565c0',
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        >
          {nodeDatum.name && nodeDatum.name.length > 20 
            ? nodeDatum.name.substring(0, 20) + '...' 
            : nodeDatum.name || 'غير محدد'}
        </text>
        
        <text
          x="0"
          y="40"
          textAnchor="middle"
          style={{
            fontSize: '14px',
            fill: '#666',
            fontFamily: 'Cairo, sans-serif'
          }}
        >
          {getRelationIcon(person?.relation)} {person?.relation || 'عضو'}
        </text>
        
        {isFromDifferentFamily && (
          <text
            x="0"
            y="58"
            textAnchor="middle"
            style={{
              fontSize: '11px',
              fill: '#e65100',
              fontWeight: 'bold'
            }}
          >
            🏠 عائلة مرتبطة
          </text>
        )}
        
        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <>
            <circle
              cx="90"
              cy="-50"
              r="15"
              fill="#4caf50"
              stroke="white"
              strokeWidth="3"
            />
            <text
              x="90"
              y="-44"
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
      </g>
    );
  }, [selectedPersons, handleNodeClick, uid]);

  const getRelationIcon = (relation) => {
    const icons = {
      'رب العائلة': '👨‍💼',
      'ابن': '👦',
      'بنت': '👧',
      'أخ': '👨',
      'أخت': '👩',
      'جد': '👴',
      'جدة': '👵',
      'عم': '👨‍🦳',
      'عمة': '👩‍🦳',
      'خال': '👨‍🦲',
      'خالة': '👩‍🦲'
    };
    return icons[relation] || '👤';
  };

  // ===========================================================================
  // عرض الشجرة
  // ===========================================================================

  const renderExtendedTreeView = () => (
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
      className="tree-container"
    >
      {treeData ? (
        <Tree
          data={treeData}
          orientation="vertical"
          translate={{ x: window.innerWidth / 2, y: 120 }}
          zoomable
          zoom={zoomLevel}
          collapsible={false}
          pathFunc="step"
          separation={{ siblings: 2, nonSiblings: 2.5 }}
          nodeSize={{ x: 280, y: 200 }}
          renderCustomNodeElement={renderAdvancedNodeElement}
          styles={{
            links: {
              stroke: '#2196f3',
              strokeWidth: 2,
            }
          }}
          onNodeClick={handleNodeClick}
          enableLegacyTransitions={false}
          transitionDuration={500}
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
              <CircularProgress size={100} sx={{ color: '#2e7d32', mb: 3 }} />
              <Typography variant="h5" sx={{ mb: 2, color: '#2e7d32' }}>
                {loadingStage || 'جاري تحميل الشجرة الموسعة...'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {loadingProgress > 0 && `${Math.round(loadingProgress)}% مكتمل`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                يتم تحميل العائلات المرتبطة والروابط الموسعة
              </Typography>
            </Box>
          ) : error ? (
            <Box textAlign="center">
              <Warning sx={{ fontSize: 100, color: '#f44336', mb: 2 }} />
              <Typography variant="h4" color="error" gutterBottom>
                حدث خطأ في الشجرة الموسعة
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {error}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleRefresh}
                startIcon={<Refresh />}
                size="large"
              >
                إعادة تحميل الشجرة الموسعة
              </Button>
            </Box>
          ) : (
            <Box textAlign="center">
              <AccountTree sx={{ fontSize: 120, color: '#2e7d32', mb: 2 }} />
              <Typography variant="h4" color="text.secondary" gutterBottom>
                🌳 ابنِ شجرتك الموسعة
              </Typography>
              <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3, maxWidth: 500 }}>
                اربط عائلتك مع العائلات الأخرى لبناء شجرة موسعة تضم جميع الأقارب والعلاقات الأسرية
              </Typography>
              <Box display="flex" gap={2} justifyContent="center">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => navigate('/family')}
                  startIcon={<Person />}
                >
                  إضافة أفراد العائلة
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={() => setShowLinkingPanel(true)}
                  startIcon={<LinkIcon />}
                >
                  ربط عائلات
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  // ===========================================================================
  // شريط الأدوات المُصحح
  // ===========================================================================

  const renderEnhancedToolbar = () => (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography 
          variant="h5" 
          textAlign="center" 
          sx={{ mb: 2, color: '#2e7d32', fontWeight: 'bold' }}
        >
          🌳 الشجرة الموسعة للعائلة
        </Typography>
        
        {loading && (
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ mb: 2, height: 8, borderRadius: 4 }}
          />
        )}
        
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          centered
          sx={{ mb: 2 }}
        >
          <Tab label="🌳 الشجرة" />
          <Tab label="🔗 الروابط" />
          <Tab label="📊 الإحصائيات" />
        </Tabs>
        
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
            startIcon={<Edit />}
          >
            إدارة الأفراد
          </Button>
          
          <Button
            variant="contained"
            size="small"
            color="success"
            onClick={() => navigate('/family')}
            disabled={loading}
            startIcon={<PersonAdd />}
          >
            إضافة فرد
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={() => setShowLinkingPanel(true)}
            disabled={loading}
            startIcon={<LinkIcon />}
          >
            ربط عائلات
          </Button>

          <Divider orientation="vertical" flexItem />

          <Tooltip title="تكبير الشجرة">
            <IconButton size="small" onClick={handleZoomIn} disabled={loading}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          
          {/* ✅ إصلاح Chip مع onClick صحيح */}
          <Chip 
            label={`${Math.round(zoomLevel * 100)}%`} 
            size="small" 
            onClick={handleResetZoom}
            style={{ cursor: 'pointer', minWidth: 70 }}
            disabled={loading}
          />
          
          <Tooltip title="تصغير الشجرة">
            <IconButton size="small" onClick={handleZoomOut} disabled={loading}>
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
            gap={4}
            sx={{ mt: 1, opacity: 0.8 }}
          >
            <Chip
              size="small"
              icon={<Groups />}
              label={`${statistics?.overview?.totalPersons || 0} شخص`}
              color="primary"
              variant="outlined"
            />
            <Chip
              size="small"
              icon={<AccountTree />}
              label={`${statistics?.overview?.totalFamilies || 0} عائلة`}
              color="secondary"
              variant="outlined"
            />
            <Chip
              size="small"
              icon={<LinkIcon />}
              label={`${linkedFamilies.length} رابط`}
              color="success"
              variant="outlined"
            />
          </Box>
        )}
      </Box>
    </Paper>
  );

  // ===========================================================================
  // لوحة الربط
  // ===========================================================================

  const renderLinkingPanel = () => (
    <Dialog
      open={showLinkingPanel}
      onClose={() => setShowLinkingPanel(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <LinkIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold">
              الربط الموسع بين العائلات
            </Typography>
          </Box>
          <IconButton onClick={() => setShowLinkingPanel(false)}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <ExtendedFamilyLinking
          currentUserUid={uid}
          onLinkingComplete={handleLinkingComplete}
          existingLinks={linkedFamilies.map(link => link.targetFamilyUid)}
        />
      </DialogContent>
    </Dialog>
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
      {renderEnhancedToolbar()}

      <Box
        sx={{
          position: 'absolute',
          top: 200,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'auto'
        }}
      >
        {activeTab === 0 && renderExtendedTreeView()}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <ExtendedFamilyLinking
              currentUserUid={uid}
              onLinkingComplete={handleLinkingComplete}
              existingLinks={linkedFamilies.map(link => link.targetFamilyUid)}
            />
          </Box>
        )}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              📊 إحصائيات الشجرة الموسعة
            </Typography>
            {statistics && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>نظرة عامة</Typography>
                      <Typography>إجمالي الأشخاص: {statistics.overview.totalPersons}</Typography>
                      <Typography>إجمالي العائلات: {statistics.overview.totalFamilies}</Typography>
                      <Typography>إجمالي العلاقات: {statistics.overview.totalRelations}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>الأداء</Typography>
                      <Typography>وقت التحميل: {statistics.performance.totalLoadTime}ms</Typography>
                      <Typography>حجم الذاكرة المؤقتة: {statistics.performance.cacheSize}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}
      </Box>

      {renderLinkingPanel()}
      
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