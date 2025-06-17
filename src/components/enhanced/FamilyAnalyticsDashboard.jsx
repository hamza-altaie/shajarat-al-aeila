// src/components/enhanced/FamilyAnalyticsDashboard.jsx
import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper
} from '@mui/material';
import {
  People,
  Group,
  Timeline,
  Cake
} from '@mui/icons-material';

const FamilyAnalyticsDashboard = ({ 
  familyData = [], 
  treeStatistics = {} 
}) => {
  const {
    totalMembers = 0,
    relations = [],
    generations = [],
    maleCount = 0,
    femaleCount = 0
  } = treeStatistics;

  // حساب متوسط العمر
  const averageAge = React.useMemo(() => {
    const agesWithBirthdate = familyData
      .filter(person => person.birthdate)
      .map(person => {
        const birthYear = new Date(person.birthdate).getFullYear();
        return new Date().getFullYear() - birthYear;
      });
    
    if (agesWithBirthdate.length === 0) return 0;
    
    const sum = agesWithBirthdate.reduce((acc, age) => acc + age, 0);
    return Math.round(sum / agesWithBirthdate.length);
  }, [familyData]);

  // بطاقة إحصائية
  const StatCard = ({ icon, title, value, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box 
            sx={{ 
              p: 1, 
              borderRadius: 2, 
              bgcolor: `${color}.light`,
              color: `${color}.contrastText`,
              display: 'flex'
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        إحصائيات شجرة العائلة
      </Typography>

      <Grid container spacing={3}>
        {/* الإحصائيات الأساسية */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<People />}
            title="إجمالي الأعضاء"
            value={totalMembers}
            color="primary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Group />}
            title="الذكور"
            value={maleCount}
            color="info"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Group />}
            title="الإناث"
            value={femaleCount}
            color="secondary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Cake />}
            title="متوسط العمر"
            value={`${averageAge} سنة`}
            color="warning"
          />
        </Grid>

        {/* توزيع العلاقات */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                توزيع العلاقات
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {relations.map(relation => {
                  const count = familyData.filter(p => p.relation === relation).length;
                  return (
                    <Chip
                      key={relation}
                      label={`${relation} (${count})`}
                      variant="outlined"
                      color="primary"
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع الأجيال */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                توزيع الأجيال
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {generations.map(generation => {
                  const count = familyData.filter(p => (p.generation || 0) === generation).length;
                  return (
                    <Chip
                      key={generation}
                      label={`الجيل ${generation + 1} (${count})`}
                      variant="outlined"
                      color="secondary"
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FamilyAnalyticsDashboard;