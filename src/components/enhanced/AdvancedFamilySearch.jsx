// src/components/enhanced/AdvancedFamilySearch.jsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Typography,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Search,
  FilterList,
  ExpandMore,
  ExpandLess,
  Person
} from '@mui/icons-material';

const AdvancedFamilySearch = ({ 
  familyData = [], 
  treeStatistics = {},
  onPersonSelect,
  onHighlightPath 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [selectedGeneration, setSelectedGeneration] = useState('all');
  const [selectedRelation, setSelectedRelation] = useState('all');
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { relations = [], generations = [] } = treeStatistics;

  // نتائج البحث المفلترة
  const searchResults = useMemo(() => {
    let results = [...familyData];

    // فلترة النص
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(person => {
        const fullName = [
          person.firstName,
          person.fatherName, 
          person.grandfatherName,
          person.surname
        ].filter(Boolean).join(' ').toLowerCase();

        switch (searchType) {
          case 'name':
            return fullName.includes(query);
          case 'relation':
            return person.relation?.toLowerCase().includes(query);
          case 'phone':
            return person.phone?.includes(searchQuery);
          case 'all':
          default:
            return fullName.includes(query) || 
                   person.relation?.toLowerCase().includes(query) ||
                   person.phone?.includes(searchQuery);
        }
      });
    }

    // فلترة الجيل
    if (selectedGeneration !== 'all') {
      results = results.filter(person => 
        (person.generation || 0) === parseInt(selectedGeneration)
      );
    }

    // فلترة العلاقة
    if (selectedRelation !== 'all') {
      results = results.filter(person => person.relation === selectedRelation);
    }

    // فلترة العائلة (إذا كان هناك عائلات متعددة)
    if (selectedFamily !== 'all') {
      results = results.filter(person => person.familyId === selectedFamily);
    }

    return results;
  }, [familyData, searchQuery, searchType, selectedGeneration, selectedRelation, selectedFamily]);

  // بناء الاسم الكامل
  const buildFullName = (person) => {
    const parts = [
      person.firstName,
      person.fatherName,
      person.grandfatherName,
      person.surname
    ].filter(part => part && part.trim() !== '');
    
    return parts.length > 0 ? parts.join(' ') : 'غير محدد';
  };

  // معالج اختيار الشخص
  const handlePersonClick = (person) => {
    onPersonSelect?.(person);
    
    // تسليط الضوء على المسار إذا كان متاحاً
    if (onHighlightPath) {
      // هنا يمكن إضافة منطق بناء المسار
      onHighlightPath([person.id]);
    }
  };

  return (
    <Box>
      {/* شريط البحث الرئيسي */}
      <Box display="flex" gap={1} mb={2}>
        <TextField
          fullWidth
          placeholder="ابحث في العائلة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />
          }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>نوع البحث</InputLabel>
          <Select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            label="نوع البحث"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="name">الاسم</MenuItem>
            <MenuItem value="relation">العلاقة</MenuItem>
            <MenuItem value="phone">الهاتف</MenuItem>
          </Select>
        </FormControl>

        <IconButton 
          onClick={() => setShowAdvanced(!showAdvanced)}
          sx={{ ml: 1 }}
        >
          <FilterList />
          {showAdvanced ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* البحث المتقدم */}
      <Collapse in={showAdvanced}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            فلترة متقدمة
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap">
            {/* فلترة الجيل */}
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>الجيل</InputLabel>
              <Select
                value={selectedGeneration}
                onChange={(e) => setSelectedGeneration(e.target.value)}
                label="الجيل"
              >
                <MenuItem value="all">جميع الأجيال</MenuItem>
                {generations.map(gen => (
                  <MenuItem key={gen} value={gen}>
                    الجيل {gen + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* فلترة العلاقة */}
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>العلاقة</InputLabel>
              <Select
                value={selectedRelation}
                onChange={(e) => setSelectedRelation(e.target.value)}
                label="العلاقة"
              >
                <MenuItem value="all">جميع العلاقات</MenuItem>
                {relations.map(relation => (
                  <MenuItem key={relation} value={relation}>
                    {relation}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>
      </Collapse>

      {/* عرض النتائج */}
      <Box>
        {/* إحصائيات النتائج */}
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography variant="body2" color="text.secondary">
            {searchResults.length} نتيجة من أصل {familyData.length}
          </Typography>
          
          {searchQuery && (
            <Chip
              label={`"${searchQuery}"`}
              size="small"
              onDelete={() => setSearchQuery('')}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {/* قائمة النتائج */}
        <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
          <List>
            {searchResults.map((person) => (
              <ListItem
                key={person.id}
                button
                onClick={() => handlePersonClick(person)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar src={person.avatar}>
                    <Person />
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={buildFullName(person)}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {person.relation}
                      </Typography>
                      {person.phone && (
                        <Typography variant="caption" color="text.secondary">
                          📱 {person.phone}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                
                <Chip
                  label={`الجيل ${(person.generation || 0) + 1}`}
                  size="small"
                  variant="outlined"
                />
              </ListItem>
            ))}
            
            {searchResults.length === 0 && searchQuery && (
              <ListItem>
                <ListItemText
                  primary="لم يتم العثور على نتائج"
                  secondary="جرب تغيير مصطلح البحث أو الفلاتر"
                />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdvancedFamilySearch;