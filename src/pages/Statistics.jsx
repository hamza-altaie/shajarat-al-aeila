// src/pages/Statistics.jsx
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Paper, Chip, Divider,
  Tabs, Tab, Card, CardContent, LinearProgress,
  Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon,
  IconButton, Tooltip, Alert, CircularProgress,
  AppBar, Toolbar, Container, Button, Breadcrumbs,
  Link, Fab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// الأيقونات
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { familyAnalytics } from '../utils/FamilyAnalytics';
import { useTribe } from '../contexts/TribeContext';

const Statistics = () => {
  const navigate = useNavigate();
  const { tribe, loading: tribeLoading } = useTribe();
  
  // مرجع لتتبع التحميل الأولي
  const initialLoadRef = useRef(true);
  
  // الحالات المحلية
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [error, setError] = useState(null);

    // دالة حساب العمر
  const calculateAge = useCallback((birthdate) => {
    if (!birthdate) return null;
    try {
      const birth = new Date(birthdate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age > 0 ? age : null;
    } catch {
      return null;
    }
  }, []);

  // بناء عضو نظيف
  const buildCleanMember = useCallback((memberData) => {
    const fullName = [
      memberData.firstName,
      memberData.fatherName,
      memberData.grandfatherName,
      memberData.surname
    ].filter(part => part && part.trim() !== '').join(' ');
    
    return {
      ...memberData,
      name: fullName || memberData.firstName,
      age: memberData.birthdate ? calculateAge(memberData.birthdate) : null,
      gender: memberData.relation === 'بنت' ? 'أنثى' : 
             memberData.relation === 'ابن' ? 'ذكر' : 
             memberData.gender || 'غير محدد'
    };
  }, [calculateAge]);

  // دالة بناء بيانات الشجرة
  const buildTreeData = useCallback((members) => {
    if (!members || members.length === 0) return null;
    
    // البحث عن رب العائلة (الجذر)
    const head = members.find(m => m.relation === 'رب العائلة' || m.is_root) || members[0];
    if (!head) return null;

    // بناء الشجرة بشكل متكرر - نشمل جميع الأعضاء الآخرين كأطفال
    const buildChildren = (parentId) => {
      return members
        .filter(m => m.parentId === parentId || (m.id !== head.id && !m.parentId && parentId === head.id))
        .map(child => ({
          name: child.name,
          id: child.globalId,
          attributes: child,
          children: buildChildren(child.id)
        }));
    };

    const tree = {
      name: head.name,
      id: head.globalId,
      attributes: head,
      children: buildChildren(head.id)
    };
    
    return tree;
  }, []);

  // تم حذف دالة بناء الشجرة الموسعة

  // تم حذف دالة البحث عن العائلات المرتبطة

  // تحميل بيانات الشجرة العادية
  const loadSimpleTreeData = useCallback(async () => {
    if (!tribe?.id) {
      setFamilyMembers([]);
      setError('لم يتم تحميل بيانات القبيلة');
      return;
    }

    try {
      // استخدام Tribe Service بدلاً من userService
      const { getTribeTree } = await import('../services/tribeService');
      const response = await getTribeTree(tribe.id);
      
      if (!response || !response.persons) {
        setFamilyMembers([]);
        setError('لا توجد بيانات');
        return;
      }

      // تحويل البيانات من Supabase
      const members = response.persons.map(person => ({
        id: String(person.id),
        globalId: String(person.id),
        firstName: person.first_name || '',
        fatherName: person.father_name || '',
        surname: person.family_name || '',
        grandfatherName: person.grandfather_name || '',
        relation: person.relation || (person.is_root ? 'رب العائلة' : (person.gender === 'M' ? 'ابن' : 'بنت')),
        gender: person.gender,
        birthdate: person.birthdate || '',
        createdAt: person.created_at || '',
      }));

      const cleanMembers = members.map(buildCleanMember);
      setFamilyMembers(cleanMembers);
      
      const tree = buildTreeData(cleanMembers);
      setTreeData(tree);
      
    } catch (err) {
      console.error('خطأ في تحميل البيانات:', err);
      setError('فشل في تحميل بيانات العائلة');
    }
  }, [buildCleanMember, buildTreeData]);

  // تم حذف دالة تحميل الشجرة الموسعة

  // تحميل بيانات العائلة من Supabase
  useEffect(() => {
    const loadFamilyData = async () => {
      if (!tribe?.id || tribeLoading) {
        return;
      }

      try {
        setLoading(true);

        // تحميل بيانات القبيلة
        await loadSimpleTreeData();

      } catch (err) {
        console.error('خطأ في تحميل البيانات:', err);
        setError('فشل في تحميل بيانات القبيلة');
      } finally {
        setLoading(false);
        // تعيين أن التحميل الأولي قد انتهى
        initialLoadRef.current = false;
      }
    };

    loadFamilyData();
  }, [tribe?.id, tribeLoading, loadSimpleTreeData]);

  // تحديث البيانات عند تغيير نوع الشجرة فقط
  useEffect(() => {
    // تجنب التشغيل في التحميل الأولي
    if (initialLoadRef.current || familyMembers.length === 0) return;

    const updateTreeData = async () => {
      const uid = localStorage.getItem('verifiedUid');
      if (!uid) return;
      
      try {
        setLoading(true);
        
        // يتم عرض الشجرة العادية دائماً
        await loadSimpleTreeData(uid);
      } catch (err) {
        console.error('خطأ في تحديث البيانات:', err);
      } finally {
        setLoading(false);
      }
    };

    updateTreeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // تم حذف تغيير نوع الشجرة

  // تم حذف دالة التبديل بين أنواع الشجرة

  // تحليل البيانات
  const analyzeData = useMemo(() => {
    if (!familyMembers?.length) {
      return null;
    }
    
    try {
      const result = familyAnalytics.analyzeFamily(treeData, familyMembers);
      return result;
    } catch (error) {
      console.error('❌ خطأ في التحليل:', error);
      return null;
    }
  }, [treeData, familyMembers]);

  useEffect(() => {
    if (analyzeData) {
      setAnalysis(analyzeData);
    }
  }, [analyzeData]);

  // تصدير البيانات - متغير غير مستخدم حالياً
  /*
  const handleExport = (format) => {
    if (!analysis) return;
    
    try {
      const exportedData = familyAnalytics.exportAnalysis(format);
      const blob = new Blob([exportedData], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `family-statistics.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('خطأ في التصدير:', error);
    }
  };
  */

  // مكونات واجهة المستخدم
  const StatCard = ({ title, value, subtitle, color = 'primary', progress }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${
          color === 'primary' ? '#e3f2fd 0%, #ffffff 100%' :
          color === 'secondary' ? '#f3e5f5 0%, #ffffff 100%' :
          color === 'success' ? '#e8f5e8 0%, #ffffff 100%' :
          color === 'error' ? '#ffebee 0%, #ffffff 100%' :
          '#f5f5f5 0%, #ffffff 100%'
        })`,
        border: `1px solid ${
          color === 'primary' ? '#2196f3' :
          color === 'secondary' ? '#9c27b0' :
          color === 'success' ? '#4caf50' :
          color === 'error' ? '#f44336' :
          '#e0e0e0'
        }`,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px rgba(${
            color === 'primary' ? '33, 150, 243' :
            color === 'secondary' ? '156, 39, 176' :
            color === 'success' ? '76, 175, 80' :
            color === 'error' ? '244, 67, 54' :
            '0, 0, 0'
          }, 0.2)`
        }
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, color: `${color}.main` }}>
          {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
        </Typography>
        <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif', color: `${color}.main` }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'Cairo, sans-serif' }}>
            {subtitle}
          </Typography>
        )}
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'rgba(0,0,0,0.1)',
                [`& .MuiLinearProgress-bar`]: {
                  backgroundColor: `${color}.main`
                }
              }} 
            />
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              {progress.toFixed(1)}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const DataList = ({ data, color = 'primary', maxItems = 0, emptyMessage = "لا توجد بيانات" }) => (
    <List dense>
      {Object.keys(data).length === 0 ? (
        <ListItem>
          <ListItemText 
            primary={emptyMessage}
            sx={{ textAlign: 'center', fontStyle: 'italic', color: '#666666' }}
          />
        </ListItem>
      ) : (
        Object.entries(data)
          .sort(([,a], [,b]) => b - a)
          .slice(0, maxItems || Object.keys(data).length)
          .map(([key, value], index) => (
            <ListItem key={key} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 35 }}>
                <Chip 
                  label={index + 1} 
                  size="small" 
                  color={color}
                  sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                />
              </ListItemIcon>
              <ListItemText 
                primary={key}
                secondary={`${value} ${typeof value === 'number' ? 'عضو' : ''}`}
                sx={{ fontFamily: 'Cairo, sans-serif' }}
              />
            </ListItem>
          ))
      )}
    </List>
  );

  const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );

  // العرض الرئيسي
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      direction: 'rtl'
    }}>
      {/* شريط التطبيق العلوي */}
      <AppBar position="static" sx={{ 
        background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
        boxShadow: '0 4px 20px rgba(46, 125, 50, 0.3)'
      }}>
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => navigate('/family')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <AssessmentIcon sx={{ mr: 2 }} />
          
          <Typography variant="h6" component="div" sx={{ 
            flexGrow: 1, 
            fontFamily: 'Cairo, sans-serif',
            fontWeight: 'bold'
          }}>
            📊 إحصائيات العائلة
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* تم إزالة مفتاح تبديل نوع الشجرة */}
            
            <Tooltip title="تحديث البيانات">
              <IconButton 
                color="inherit" 
                onClick={() => window.location.reload()}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* مسار التنقل */}
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Breadcrumbs separator="›" sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/family')}
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              textDecoration: 'none',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
            الرئيسية
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon sx={{ mr: 0.5, fontSize: 16 }} />
            الإحصائيات
          </Typography>
        </Breadcrumbs>
      </Container>

      {/* المحتوى الرئيسي */}
      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '400px' 
          }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              🔍 جاري تحليل بيانات شجرة العائلة...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              يتم معالجة البيانات واستخراج الإحصائيات
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              ⚠️ خطأ في تحميل البيانات
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<RefreshIcon />} 
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              إعادة المحاولة
            </Button>
          </Alert>
        ) : !analysis ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              📊 لا توجد بيانات للتحليل
            </Typography>
            <Typography variant="body2">
              تأكد من وجود أعضاء في شجرة العائلة
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => navigate('/family')}
              sx={{ mt: 2 }}
            >
              إضافة أعضاء العائلة
            </Button>
          </Alert>
        ) : (
          <Box>
            {/* تم إزالة تنبيهات الروابط */}
            
            {/* معلومات سريعة */}
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
              border: '1px solid #2196f3'
            }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="h5" sx={{ 
                    fontFamily: 'Cairo, sans-serif', 
                    color: '#1976d2',
                    fontWeight: 'bold',
                    mb: 1
                  }}>
                    🌳 تم تحليل {analysis?.metadata?.treeMetrics?.totalNodes || analysis?.metadata?.totalMembers || 0} عضو في {analysis?.metadata?.processingTime || 0} ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                    جودة البيانات: {analysis?.metadata?.dataQuality || 'غير محددة'} • آخر تحديث: {analysis?.metadata?.analysisDate ? new Date(analysis.metadata.analysisDate).toLocaleString('ar-SA') : 'غير محدد'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Chip
                      icon={<BarChartIcon />}
                      label="تحليل شامل"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      icon={<TrendingUpIcon />}
                      label="بيانات حية"
                      color="success"
                      variant="outlined"
                    />
                    {/* تم حذف شريحة الشجرة الموسعة */}
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* التبويبات */}
            <Paper sx={{ mb: 3 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={activeTab} 
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      fontFamily: 'Cairo, sans-serif',
                      fontWeight: 'bold'
                    }
                  }}
                >
                  <Tab label="📊 نظرة عامة" />
                  <Tab label="👥 الديموغرافيا" />
                  <Tab label="🏛️ الأجيال" />
                  <Tab label="💼 المهن والتعليم" />
                  <Tab label="💡 الرؤى الذكية" />
                </Tabs>
              </Box>

              {/* محتوى التبويبات */}
              <Box sx={{ p: 3 }}>
                {/* تبويب النظرة العامة */}
                <TabPanel value={activeTab} index={0}>
                  <Grid container spacing={3}>
                    {/* العنوان */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="h5" sx={{ 
                        mb: 3, 
                        color: 'primary.main', 
                        fontWeight: 'bold', 
                        fontFamily: 'Cairo, sans-serif' 
                      }}>
                        📈 الإحصائيات الأساسية
                      </Typography>
                    </Grid>
                    
                    {/* الإحصائيات الأساسية */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <StatCard
                        title="إجمالي الأعضاء"
                        value={analysis?.metadata?.treeMetrics?.totalNodes || analysis?.metadata?.totalMembers || 0}
                        subtitle="في الشجرة"
                        color="primary"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <StatCard
                        title="الذكور"
                        value={analysis?.basicStats?.genderDistribution?.males || 0}
                        subtitle={`${analysis?.basicStats?.genderDistribution?.malePercentage || 0}%`}
                        color="success"
                        progress={analysis?.basicStats?.genderDistribution?.malePercentage || 0}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <StatCard
                        title="الإناث"
                        value={analysis?.basicStats?.genderDistribution?.females || 0}
                        subtitle={`${analysis?.basicStats?.genderDistribution?.femalePercentage || 0}%`}
                        color="secondary"
                        progress={analysis?.basicStats?.genderDistribution?.femalePercentage || 0}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <StatCard
                        title="جودة البيانات"
                        value={`${analysis?.basicStats?.dataCompleteness || 0}%`}
                        subtitle="اكتمال المعلومات"
                        color={(analysis?.basicStats?.dataCompleteness || 0) >= 80 ? 'success' : 
                               (analysis?.basicStats?.dataCompleteness || 0) >= 60 ? 'warning' : 'error'}
                        progress={analysis?.basicStats?.dataCompleteness || 0}
                      />
                    </Grid>

                    {/* توزيع الأعمار */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          🎂 توزيع الأعمار
                        </Typography>
                        <DataList 
                          data={analysis.demographicAnalysis?.ageGroups || {}} 
                          color="primary"
                          maxItems={5}
                        />
                      </Paper>
                    </Grid>

                    {/* أكبر الأجيال */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          🏛️ توزيع الأجيال
                        </Typography>
                        <DataList 
                          data={analysis.generationAnalysis?.generations?.reduce((acc, gen) => {
                            acc[`الجيل ${gen.generation}`] = gen.count;
                            return acc;
                          }, {}) || {}}
                          color="secondary"
                          maxItems={5}
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* باقي التبويبات */}
                <TabPanel value={activeTab} index={1}>
                  <Grid container spacing={3}>
                    {/* العنوان */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="h5" sx={{ 
                        mb: 3, 
                        color: 'secondary.main', 
                        fontWeight: 'bold', 
                        fontFamily: 'Cairo, sans-serif' 
                      }}>
                        👥 التحليل الديموغرافي
                      </Typography>
                    </Grid>

                    {/* توزيع الأعمار المفصل */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          🎂 فئات الأعمار التفصيلية
                        </Typography>
                        <DataList 
                          data={analysis?.demographicAnalysis?.ageGroups || {}} 
                          color="primary"
                          emptyMessage="لا توجد بيانات أعمار"
                        />
                      </Paper>
                    </Grid>

                    {/* الهرم السكاني */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          📊 الهرم السكاني
                        </Typography>
                        {analysis?.demographicAnalysis?.populationPyramid?.length > 0 ? (
                          <Box>
                            {analysis.demographicAnalysis.populationPyramid.map((range, index) => (
                              <Box key={index} sx={{ mb: 2 }}>
                                <Typography variant="body2" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif' }}>
                                  {range.ageRange} سنة
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ flex: 1, display: 'flex' }}>
                                    <Box sx={{ 
                                      width: `${(range.males / Math.max(...analysis.demographicAnalysis.populationPyramid.map(r => r.total))) * 100}%`,
                                      height: 20,
                                      backgroundColor: 'primary.main',
                                      borderRadius: '4px 0 0 4px'
                                    }} />
                                    <Box sx={{ 
                                      width: `${(range.females / Math.max(...analysis.demographicAnalysis.populationPyramid.map(r => r.total))) * 100}%`,
                                      height: 20,
                                      backgroundColor: 'secondary.main',
                                      borderRadius: '0 4px 4px 0'
                                    }} />
                                  </Box>
                                  <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
                                    {range.total}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: '#1976d2' }}>
                                    ذكور: {range.males}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#9c27b0' }}>
                                    إناث: {range.females}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                            لا توجد بيانات أعمار كافية لبناء الهرم السكاني
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    {/* التوزيع الجنسي حسب الأجيال */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          ⚖️ التوزيع الجنسي حسب الأجيال
                        </Typography>
                        {analysis?.demographicAnalysis?.genderByGeneration?.length > 0 ? (
                          <List dense>
                            {analysis.demographicAnalysis.genderByGeneration.map((gen, index) => (
                              <ListItem key={index} sx={{ py: 1 }}>
                                <ListItemText
                                  component="div"
                                  primary={`الجيل ${gen.generation}`}
                                  secondaryTypographyProps={{ component: 'div' }}
                                  secondary={
                                    <Box sx={{ mt: 1 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption">
                                          ذكور: {gen.males}
                                        </Typography>
                                        <Typography variant="caption">
                                          إناث: {gen.females}
                                        </Typography>
                                      </Box>
                                      <LinearProgress
                                        variant="determinate"
                                        value={(gen.males / gen.total) * 100}
                                        sx={{ height: 6, borderRadius: 3 }}
                                      />
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                            لا توجد بيانات أجيال كافية
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    {/* نسبة الإعالة */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          👨‍👩‍👧‍👦 إحصائيات الإعالة
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 6 }}>
                            <StatCard
                              title="الأطفال"
                              value={analysis?.demographicAnalysis?.ageGroups?.['أطفال (0-12)'] || 0}
                              subtitle="0-12 سنة"
                              color="info"
                            />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <StatCard
                              title="كبار السن"
                              value={analysis?.demographicAnalysis?.ageGroups?.['كبار السن (56+)'] || 0}
                              subtitle="56+ سنة"
                              color="warning"
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <StatCard
                              title="الفئة المنتجة"
                              value={(analysis?.demographicAnalysis?.ageGroups?.['شباب (18-35)'] || 0) + 
                                    (analysis?.demographicAnalysis?.ageGroups?.['متوسطو العمر (36-55)'] || 0)}
                              subtitle="18-55 سنة"
                              color="success"
                            />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                  <Grid container spacing={3}>
                    {/* العنوان */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="h5" color="text.secondary" sx={{ 
                        mb: 3, 
                        color: 'info.main', 
                        fontWeight: 'bold', 
                        fontFamily: 'Cairo, sans-serif' 
                      }}>
                        🏛️ تحليل الأجيال
                      </Typography>
                    </Grid>

                    {/* إحصائيات الأجيال */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <StatCard
                        title="عدد الأجيال"
                        value={analysis?.generationAnalysis?.totalGenerations || 0}
                        subtitle="في الشجرة"
                        color="info"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <StatCard
                        title="أكبر جيل"
                        value={analysis?.generationAnalysis?.largestGeneration?.count || 0}
                        subtitle={`الجيل ${analysis?.generationAnalysis?.largestGeneration?.generation || 1}`}
                        color="success"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <StatCard
                        title="متوسط حجم الجيل"
                        value={analysis?.generationAnalysis?.totalGenerations > 0 ? 
                               Math.round((analysis?.metadata?.treeMetrics?.totalNodes || analysis?.metadata?.totalMembers || 0) / analysis.generationAnalysis.totalGenerations) : 0}
                        subtitle="أفراد لكل جيل"
                        color="warning"
                      />
                    </Grid>

                    {/* تفاصيل الأجيال */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Paper sx={{ p: 3, height: '400px', overflow: 'auto' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          📋 تفاصيل كل جيل
                        </Typography>
                        {analysis?.generationAnalysis?.generations?.length > 0 ? (
                          <List>
                            {analysis.generationAnalysis.generations.map((gen, index) => (
                              <ListItem key={index} sx={{ 
                                mb: 1, 
                                backgroundColor: index === 0 ? 'success.50' : 'grey.50',
                                borderRadius: 1,
                                border: `1px solid ${index === 0 ? 'success.200' : 'grey.200'}`
                              }}>
                                <ListItemIcon>
                                  <Chip 
                                    label={gen.generation} 
                                    color={index === 0 ? 'success' : 'default'}
                                    size="small"
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  component="div"
                                  primary={`الجيل ${gen.generation}`}
                                  secondaryTypographyProps={{ component: 'div' }}
                                  secondary={
                                    <Box>
                                      <Typography variant="body2">
                                        {gen.count} أفراد ({gen.percentage}%)
                                      </Typography>
                                      {gen.averageAge > 0 && (
                                        <Typography variant="caption">
                                          متوسط العمر: {gen.averageAge} سنة
                                        </Typography>
                                      )}
                                      <Box sx={{ mt: 1 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={gen.percentage}
                                          color={index === 0 ? 'success' : 'primary'}
                                          sx={{ height: 6, borderRadius: 3 }}
                                        />
                                      </Box>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                            لا توجد بيانات أجيال
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    {/* نمو الأجيال */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper sx={{ p: 3, height: '400px' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          📈 نمو الأجيال
                        </Typography>
                        {analysis?.generationAnalysis?.generationGrowth?.length > 0 ? (
                          <List dense>
                            {analysis.generationAnalysis.generationGrowth.map((growth, index) => (
                              <ListItem key={index} sx={{ py: 1 }}>
                                <ListItemText
                                  component="div"
                                  primary={`${growth.fromGeneration} → ${growth.toGeneration}`}
                                  secondaryTypographyProps={{ component: 'div' }}
                                  secondary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography 
                                        variant="body2" 
                                        color={growth.growthRate > 0 ? 'success.main' : 'error.main'}
                                      >
                                        {growth.growthRate > 0 ? '+' : ''}{growth.growthRate}%
                                      </Typography>
                                      <Typography variant="caption">
                                        ({growth.absolute > 0 ? '+' : ''}{growth.absolute})
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                            يحتاج أكثر من جيل لحساب النمو
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={3}>
                  <Grid container spacing={3}>
                    {/* العنوان */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="h5" sx={{ 
                        mb: 3, 
                        color: 'warning.main', 
                        fontWeight: 'bold', 
                        fontFamily: 'Cairo, sans-serif' 
                      }}>
                        💼 المهن والتعليم
                      </Typography>
                    </Grid>

                    {/* المهن */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '400px' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          💼 توزيع المهن
                        </Typography>
                        <Box sx={{ height: '300px', overflow: 'auto' }}>
                          <DataList 
                            data={analysis?.professionalAnalysis?.professions || {}} 
                            color="warning"
                            emptyMessage="لا توجد بيانات مهن"
                          />
                        </Box>
                      </Paper>
                    </Grid>

                    {/* التعليم */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '400px' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          🎓 المستوى التعليمي
                        </Typography>
                        <Box sx={{ height: '300px', overflow: 'auto' }}>
                          <DataList 
                            data={analysis?.professionalAnalysis?.education || {}} 
                            color="info"
                            emptyMessage="لا توجد بيانات تعليم"
                          />
                        </Box>
                      </Paper>
                    </Grid>

                    {/* المواقع الجغرافية */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '400px' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          🌍 التوزيع الجغرافي
                        </Typography>
                        <Box sx={{ height: '300px', overflow: 'auto' }}>
                          <DataList 
                            data={analysis?.professionalAnalysis?.locations || {}} 
                            color="success"
                            emptyMessage="لا توجد بيانات مواقع"
                          />
                        </Box>
                      </Paper>
                    </Grid>

                    {/* إحصائيات متقدمة */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '400px' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          📊 إحصائيات متقدمة
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12 }}>
                            <StatCard
                              title="معدل التوظيف"
                              value={`${analysis?.professionalAnalysis?.employmentRate || 0}%`}
                              subtitle="من سن العمل"
                              color="success"
                              progress={analysis?.professionalAnalysis?.employmentRate || 0}
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <StatCard
                              title="التغطية الجغرافية"
                              value={`${analysis?.professionalAnalysis?.geographicDistribution?.coverage || 0}%`}
                              subtitle="لديهم مواقع محددة"
                              color="info"
                              progress={analysis?.professionalAnalysis?.geographicDistribution?.coverage || 0}
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <StatCard
                              title="المواقع الفريدة"
                              value={analysis?.professionalAnalysis?.geographicDistribution?.uniqueLocations || 0}
                              subtitle="موقع جغرافي"
                              color="warning"
                            />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={4}>
                  <Grid container spacing={3}>
                    {/* العنوان */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="h5" sx={{ 
                        mb: 3, 
                        color: 'error.main', 
                        fontWeight: 'bold', 
                        fontFamily: 'Cairo, sans-serif' 
                      }}>
                        💡 الرؤى الذكية والتوصيات
                      </Typography>
                    </Grid>

                    {/* الرؤى الذكية */}
                    <Grid size={{ xs: 12 }}>
                      <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          🧠 تحليل ذكي للبيانات
                        </Typography>
                        {analysis?.insights?.length > 0 ? (
                          <Grid container spacing={2}>
                            {analysis.insights.map((insight, index) => (
                              <Grid size={{ xs: 12, md: 6 }} key={index}>
                                <Alert 
                                  severity={
                                    insight.level === 'positive' ? 'success' :
                                    insight.level === 'warning' ? 'warning' :
                                    insight.level === 'negative' ? 'error' : 'info'
                                  }
                                  sx={{ height: '100%' }}
                                >
                                  <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif' }}>
                                    {insight.icon} {insight.title}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                                    {insight.description}
                                  </Typography>
                                </Alert>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Alert severity="info">
                            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                              💭 يتم توليد الرؤى الذكية عند توفر بيانات أكثر تفصيلاً
                            </Typography>
                          </Alert>
                        )}
                      </Paper>
                    </Grid>

                    {/* توصيات لتحسين البيانات */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '400px' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          ✨ توصيات لتحسين البيانات
                        </Typography>
                        <List>
                          {analysis?.basicStats?.dataCompleteness < 80 && (
                            <ListItem>
                              <ListItemIcon>
                                <Chip label="!" color="warning" size="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary="تحسين اكتمال البيانات"
                                secondary={`جودة البيانات الحالية ${analysis.basicStats.dataCompleteness}%. أضف معلومات مثل الأعمار والمهن والمواقع`}
                              />
                            </ListItem>
                          )}
                          
                          {(analysis?.metadata?.treeMetrics?.totalNodes || analysis?.metadata?.totalMembers || 0) < 10 && (
                            <ListItem>
                              <ListItemIcon>
                                <Chip label="+" color="info" size="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary="إضافة المزيد من الأعضاء"
                                secondary="أضف المزيد من أفراد العائلة للحصول على إحصائيات أكثر دقة"
                              />
                            </ListItem>
                          )}

                          <ListItem>
                            <ListItemIcon>
                              <Chip label="📸" color="primary" size="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary="إضافة الصور"
                              secondary="أضف صور الأعضاء لجعل الشجرة أكثر حيوية"
                            />
                          </ListItem>

                          <ListItem>
                            <ListItemIcon>
                              <Chip label="📱" color="secondary" size="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary="معلومات الاتصال"
                              secondary="أضف أرقام الهواتف والعناوين لتسهيل التواصل"
                            />
                          </ListItem>
                        </List>
                      </Paper>
                    </Grid>

                    {/* ملخص الأداء */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '400px' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                          ⚡ ملخص الأداء
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12 }}>
                            <StatCard
                              title="سرعة التحليل"
                              value={`${analysis?.metadata?.processingTime || 0}`}
                              subtitle="ميلي ثانية"
                              color="success"
                            />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <StatCard
                              title="الأعضاء"
                              value={analysis?.metadata?.treeMetrics?.totalNodes || analysis?.metadata?.totalMembers || 0}
                              subtitle="تم تحليلهم"
                              color="primary"
                            />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <StatCard
                              title="الأجيال"
                              value={analysis?.generationAnalysis?.totalGenerations || 0}
                              subtitle="تم تحليلها"
                              color="info"
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <Alert severity="success">
                              <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                                🎯 تم إنجاز التحليل بنجاح! جميع البيانات محدثة ودقيقة.
                              </Typography>
                            </Alert>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>
                </TabPanel>
              </Box>
            </Paper>
          </Box>
        )}
      </Container>

      {/* زر العائم للعودة */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
        }}
        onClick={() => navigate('/family')}
      >
        <ArrowBackIcon />
      </Fab>
    </Box>
  );
};

export default Statistics;

