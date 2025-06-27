// src/components/FamilyStatisticsDashboard.jsx
// لوحة إحصائيات احترافية وشاملة لشجرة العائلة

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Grid, Paper, Chip, Divider,
  Tabs, Tab, Card, CardContent, LinearProgress,
  Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon,
  IconButton, Tooltip, Alert, CircularProgress
} from '@mui/material';

// الأيقونات
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SchoolIcon from '@mui/icons-material/School';
import InsightsIcon from '@mui/icons-material/Insights';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';

import { familyAnalytics } from '../utils/FamilyAnalytics';

const FamilyStatisticsDashboard = ({ open, onClose, treeData, familyMembers = [] }) => {
  // الحالات
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  // تحليل البيانات
  const analyzeData = useMemo(() => {
    if (!open) return null;
    
    setLoading(true);
    try {
      const result = familyAnalytics.analyzeFamily(treeData, familyMembers);
      setLoading(false);
      return result;
    } catch (error) {
      console.error('خطأ في التحليل:', error);
      setLoading(false);
      return null;
    }
  }, [treeData, familyMembers, open]);

  useEffect(() => {
    if (analyzeData) {
      setAnalysis(analyzeData);
    }
  }, [analyzeData]);

  // تصدير البيانات
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
        <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif' }}>
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

  const DataList = ({ data, color = 'primary', maxItems = 5, emptyMessage = "لا توجد بيانات" }) => (
    <List dense>
      {Object.keys(data).length === 0 ? (
        <ListItem>
          <ListItemText 
            primary={emptyMessage} 
            sx={{ textAlign: 'center', color: 'text.secondary', fontFamily: 'Cairo, sans-serif' }} 
          />
        </ListItem>
      ) : (
        Object.entries(data)
          .sort(([,a], [,b]) => b - a)
          .slice(0, maxItems)
          .map(([key, value], index) => (
            <ListItem 
              key={key}
              sx={{
                borderRadius: 1,
                mb: 1,
                backgroundColor: index === 0 ? `${color}.50` : 'grey.50',
                border: `1px solid ${index === 0 ? `${color}.200` : 'grey.200'}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: `${color}.100`,
                  transform: 'translateX(4px)'
                }
              }}
            >
              <ListItemIcon>
                <PeopleIcon sx={{ color: `${color}.main` }} />
              </ListItemIcon>
              <ListItemText 
                primary={key}
                secondary={`${value} شخص`}
                sx={{ fontFamily: 'Cairo, sans-serif' }}
              />
              <Chip 
                label={value} 
                size="small" 
                color={index === 0 ? color : 'default'}
                variant={index === 0 ? 'filled' : 'outlined'}
              />
            </ListItem>
          ))
      )}
    </List>
  );

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          backgroundColor: '#fafafa',
          fontFamily: 'Cairo, sans-serif'
        }
      }}
    >
      {/* رأس النافذة */}
      <DialogTitle 
        sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          fontFamily: 'Cairo, sans-serif'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <BarChartIcon sx={{ fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
            📊 لوحة إحصائيات شجرة العائلة
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ 
            position: 'absolute', 
            right: 8, 
            top: 8, 
            color: 'white',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              🔍 جاري تحليل بيانات شجرة العائلة...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              يتم معالجة البيانات واستخراج الإحصائيات
            </Typography>
          </Box>
        ) : !analysis ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <Typography variant="h6" color="error" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
              ⚠️ لا توجد بيانات للتحليل
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
              تأكد من وجود أعضاء في شجرة العائلة
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<RefreshIcon />} 
              onClick={() => window.location.reload()}
              sx={{ mt: 2, fontFamily: 'Cairo, sans-serif' }}
            >
              إعادة المحاولة
            </Button>
          </Box>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* معلومات سريعة */}
            <Box sx={{ p: 2, backgroundColor: 'primary.50', borderBottom: '1px solid', borderColor: 'primary.200' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                    📈 تم تحليل {analysis.metadata.totalMembers} عضو في {analysis.metadata.processingTime}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                    جودة البيانات: {analysis.metadata.dataQuality} • آخر تحديث: {new Date(analysis.metadata.analysisDate).toLocaleString('ar-SA')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Tooltip title="تصدير تقرير">
                      <IconButton onClick={() => handleExport('summary')} size="small">
                        <InsightsIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* التبويبات */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'white' }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="📊 نظرة عامة" sx={{ fontFamily: 'Cairo, sans-serif' }} />
                <Tab label="👥 الديموغرافيا" sx={{ fontFamily: 'Cairo, sans-serif' }} />
                <Tab label="🏛️ الأجيال" sx={{ fontFamily: 'Cairo, sans-serif' }} />
                <Tab label="💼 المهن والتعليم" sx={{ fontFamily: 'Cairo, sans-serif' }} />
                <Tab label="💡 الرؤى الذكية" sx={{ fontFamily: 'Cairo, sans-serif' }} />
              </Tabs>
            </Box>

            {/* محتوى التبويبات */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* تبويب النظرة العامة */}
              <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                  {/* الإحصائيات الأساسية */}
                  <Grid item xs={12}>
                    <Typography variant="h5" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                      📈 الإحصائيات الأساسية
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="إجمالي الأعضاء"
                      value={analysis.basicStats.totalMembers}
                      subtitle="في الشجرة"
                      color="primary"
                      icon={PeopleIcon}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="عدد الأجيال"
                      value={analysis.generationAnalysis.totalGenerations}
                      subtitle="مستويات الشجرة"
                      color="secondary"
                      icon={FamilyRestroomIcon}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="متوسط العمر"
                      value={`${analysis.basicStats.ageStatistics.average} سنة`}
                      subtitle={`من ${analysis.basicStats.ageStatistics.min} إلى ${analysis.basicStats.ageStatistics.max} سنة`}
                      color="success"
                      icon={TrendingUpIcon}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="نسبة الزواج"
                      value={`${analysis.basicStats.marriageStats.marriageRate}%`}
                      subtitle={`${analysis.basicStats.marriageStats.married} من ${analysis.basicStats.totalMembers}`}
                      color="error"
                      progress={analysis.basicStats.marriageStats.marriageRate}
                    />
                  </Grid>

                  {/* التوزيع الجنسي */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                        👥 التوزيع الجنسي
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                              {analysis.basicStats.genderDistribution.males}
                            </Typography>
                            <Typography sx={{ fontFamily: 'Cairo, sans-serif' }}>
                              ذكور ({analysis.basicStats.genderDistribution.malePercentage}%)
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={analysis.basicStats.genderDistribution.malePercentage}
                              sx={{ mt: 1, height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'secondary.main', fontWeight: 'bold' }}>
                              {analysis.basicStats.genderDistribution.females}
                            </Typography>
                            <Typography sx={{ fontFamily: 'Cairo, sans-serif' }}>
                              إناث ({analysis.basicStats.genderDistribution.femalePercentage}%)
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={analysis.basicStats.genderDistribution.femalePercentage}
                              color="secondary"
                              sx={{ mt: 1, height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* جودة البيانات */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                        📋 تقييم جودة البيانات
                      </Typography>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ 
                          color: analysis.basicStats.dataCompleteness >= 80 ? 'success.main' : 
                                 analysis.basicStats.dataCompleteness >= 60 ? 'warning.main' : 'error.main',
                          fontWeight: 'bold' 
                        }}>
                          {analysis.basicStats.dataCompleteness}%
                        </Typography>
                        <Typography sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                          اكتمال البيانات
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={analysis.basicStats.dataCompleteness}
                          color={analysis.basicStats.dataCompleteness >= 80 ? 'success' : 
                                 analysis.basicStats.dataCompleteness >= 60 ? 'warning' : 'error'}
                          sx={{ height: 12, borderRadius: 6 }}
                        />
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', fontFamily: 'Cairo, sans-serif' }}>
                          {analysis.metadata.dataQuality}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* باقي التبويبات */}
              <TabPanel value={activeTab} index={1}>
                <Typography variant="h5" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                  👥 التحليل الديموغرافي
                </Typography>
                
                <Grid container spacing={3}>
                  {/* الفئات العمرية */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                        📊 توزيع الفئات العمرية
                      </Typography>
                      <DataList 
                        data={analysis.demographicAnalysis.ageGroups} 
                        color="primary"
                      />
                    </Paper>
                  </Grid>

                  {/* الزواج حسب العمر */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                        💑 معدل الزواج حسب الفئة العمرية
                      </Typography>
                      <List dense>
                        {Object.entries(analysis.demographicAnalysis.marriageByAge).map(([ageGroup, data]) => (
                          <ListItem key={ageGroup} sx={{ borderRadius: 1, mb: 1, backgroundColor: 'grey.50' }}>
                            <ListItemText 
                              primary={ageGroup}
                              secondary={`${data.married} من ${data.total} (${data.rate}%)`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                            <LinearProgress 
                              variant="determinate" 
                              value={data.rate}
                              sx={{ width: 100, ml: 2 }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <Typography variant="h5" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                  🏛️ تحليل الأجيال
                </Typography>
                
                <Grid container spacing={3}>
                  {analysis.generationAnalysis.generations.map((gen, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                      <Paper sx={{ 
                        p: 3, 
                        textAlign: 'center',
                        background: `linear-gradient(135deg, ${
                          index === 0 ? '#e3f2fd' : 
                          index === 1 ? '#f3e5f5' : 
                          index === 2 ? '#e8f5e8' : 
                          '#fff3e0'
                        } 0%, #ffffff 100%)`,
                        border: `2px solid ${
                          index === 0 ? '#2196f3' : 
                          index === 1 ? '#9c27b0' : 
                          index === 2 ? '#4caf50' : 
                          '#ff9800'
                        }`,
                        borderRadius: 2,
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* أيقونة الجيل */}
                        <Box sx={{ 
                          position: 'absolute', 
                          top: -10, 
                          right: -10, 
                          width: 40, 
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? '#2196f3' : 
                                         index === 1 ? '#9c27b0' : 
                                         index === 2 ? '#4caf50' : '#ff9800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold'
                        }}>
                          {gen.generation}
                        </Box>
                        
                        <Typography variant="h4" sx={{ 
                          fontWeight: 'bold', 
                          mb: 1,
                          color: index === 0 ? '#2196f3' : 
                                 index === 1 ? '#9c27b0' : 
                                 index === 2 ? '#4caf50' : '#ff9800'
                        }}>
                          {gen.count}
                        </Typography>
                        <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif' }}>
                          الجيل {gen.generation}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                          {gen.percentage}% من الإجمالي
                        </Typography>
                        
                        {gen.averageAge > 0 && (
                          <Chip 
                            label={`متوسط العمر: ${gen.averageAge} سنة`}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'Cairo, sans-serif' }}
                          />
                        )}
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={gen.percentage}
                          sx={{ 
                            mt: 2, 
                            height: 8, 
                            borderRadius: 4,
                            backgroundColor: 'rgba(0,0,0,0.1)'
                          }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {/* نمو الأجيال */}
                {analysis.generationAnalysis.generationGrowth.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                      📈 نمو الأجيال
                    </Typography>
                    <Paper sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {analysis.generationAnalysis.generationGrowth.map((growth, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Box sx={{ 
                              p: 2, 
                              backgroundColor: growth.growthRate > 0 ? 'success.50' : 
                                             growth.growthRate < 0 ? 'error.50' : 'grey.50',
                              borderRadius: 1,
                              textAlign: 'center'
                            }}>
                              <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                                من الجيل {growth.fromGeneration} → {growth.toGeneration}
                              </Typography>
                              <Typography variant="h6" sx={{ 
                                color: growth.growthRate > 0 ? 'success.main' : 
                                       growth.growthRate < 0 ? 'error.main' : 'text.secondary',
                                fontWeight: 'bold'
                              }}>
                                {growth.growthRate > 0 ? '+' : ''}{growth.growthRate}%
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                                ({growth.absolute > 0 ? '+' : ''}{growth.absolute} فرد)
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Box>
                )}
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                <Typography variant="h5" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                  💼 التحليل المهني والتعليمي
                </Typography>
                
                <Grid container spacing={3}>
                  {/* المهن */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                          المهن الشائعة
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                        معدل التوظيف: {analysis.professionalAnalysis.employmentRate}%
                      </Typography>
                      <DataList 
                        data={analysis.professionalAnalysis.professions} 
                        color="primary"
                      />
                    </Paper>
                  </Grid>

                  {/* التعليم */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SchoolIcon sx={{ mr: 1, color: 'secondary.main' }} />
                        <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                          المستويات التعليمية
                        </Typography>
                      </Box>
                      <DataList 
                        data={analysis.professionalAnalysis.educationLevel} 
                        color="secondary"
                      />
                    </Paper>
                  </Grid>

                  {/* التوزيع الجغرافي */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justify: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationOnIcon sx={{ mr: 1, color: 'success.main' }} />
                          <Typography variant="h6" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                            التوزيع الجغرافي
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                          {analysis.professionalAnalysis.geographicDistribution.uniqueLocations} موقع مختلف 
                          • التغطية: {analysis.professionalAnalysis.geographicDistribution.coverage}%
                        </Typography>
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                          <DataList 
                            data={analysis.professionalAnalysis.locations} 
                            color="success"
                            maxItems={8}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'success.50', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif' }}>
                              الموقع الأكثر شيوعاً
                            </Typography>
                            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                              {analysis.professionalAnalysis.geographicDistribution.mostPopular[0]}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                              {analysis.professionalAnalysis.geographicDistribution.mostPopular[1]} شخص
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={activeTab} index={4}>
                <Typography variant="h5" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
                  💡 الرؤى الذكية والتحليلات المتقدمة
                </Typography>
                
                {analysis.insights.length > 0 ? (
                  <Grid container spacing={3}>
                    {analysis.insights.map((insight, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Alert 
                          severity={
                            insight.level === 'positive' ? 'success' :
                            insight.level === 'warning' ? 'warning' :
                            insight.level === 'error' ? 'error' : 'info'
                          }
                          sx={{ 
                            height: '100%',
                            '& .MuiAlert-message': {
                              width: '100%'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Typography variant="h4">
                              {insight.icon}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'Cairo, sans-serif' }}>
                                {insight.title}
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                                {insight.description}
                              </Typography>
                            </Box>
                          </Box>
                        </Alert>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <InsightsIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                      لا توجد رؤى متاحة حالياً
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                      أضف المزيد من البيانات لعضوية العائلة للحصول على رؤى أكثر تفصيلاً
                    </Typography>
                  </Paper>
                )}

                {/* إحصائيات متقدمة إضافية */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                    📈 إحصائيات متقدمة
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {/* هيكل العائلة */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                          🏠 هيكل العائلة
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="الآباء والأمهات"
                              secondary={`${analysis.relationshipAnalysis.familyStructure.parents} شخص`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="الأطفال"
                              secondary={`${analysis.relationshipAnalysis.familyStructure.children} شخص`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="متوسط الأطفال لكل والد"
                              secondary={`${analysis.relationshipAnalysis.familyStructure.avgChildrenPerParent} طفل`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="معدل الترابط العائلي"
                              secondary={`${analysis.relationshipAnalysis.connectivity}%`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                          </ListItem>
                        </List>
                      </Paper>
                    </Grid>

                    {/* إحصائيات العمر المتقدمة */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                          📊 تحليل الأعمار المتقدم
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="أصغر عضو"
                              secondary={`${analysis.basicStats.ageStatistics.min} سنة`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="أكبر عضو"
                              secondary={`${analysis.basicStats.ageStatistics.max} سنة`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="العمر الوسيط"
                              secondary={`${analysis.basicStats.ageStatistics.median} سنة`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="المدى العمري"
                              secondary={`${analysis.basicStats.ageStatistics.max - analysis.basicStats.ageStatistics.min} سنة`}
                              sx={{ fontFamily: 'Cairo, sans-serif' }}
                            />
                          </ListItem>
                        </List>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </TabPanel>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: 'grey.50', borderTop: '1px solid', borderColor: 'grey.300' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            {analysis && (
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                💾 آخر تحليل: {new Date(analysis.metadata.analysisDate).toLocaleString('ar-SA')}
              </Typography>
            )}
          </Box>
          
          <Button 
            onClick={() => handleExport('summary')} 
            variant="outlined"
            startIcon={<InsightsIcon />}
            disabled={!analysis}
            sx={{ fontFamily: 'Cairo, sans-serif' }}
          >
            تقرير مفصل
          </Button>
          
          <Button 
            onClick={() => handleExport('csv')} 
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={!analysis}
            sx={{ fontFamily: 'Cairo, sans-serif' }}
          >
          
            إغلاق
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default FamilyStatisticsDashboard;