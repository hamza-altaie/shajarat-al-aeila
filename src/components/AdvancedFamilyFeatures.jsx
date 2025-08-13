import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Button, Typography, TextField, 
  Autocomplete,
  Card, CardContent, Chip, Avatar, Grid,
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton,
  Breadcrumbs, Divider, Alert
} from '@mui/material';
import { 
  Search, Groups, AccountTree, 
  Visibility, Edit,
  FilterList, Timeline
} from '@mui/icons-material';

// === 1. ميزة البحث المتقدم عن الأشخاص ===
export const AdvancedPersonSearch = ({ allPersons = [], onPersonSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    generation: '',
    relation: ''
  });

  const handleSearch = (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    const results = allPersons.filter(person => {
      const nameMatch = person.name?.toLowerCase().includes(query.toLowerCase()) ||
                       person.firstName?.toLowerCase().includes(query.toLowerCase()) ||
                       person.fatherName?.toLowerCase().includes(query.toLowerCase());
      
      const generationMatch = !searchFilters.generation || 
                             person.generation === parseInt(searchFilters.generation);
      
      const relationMatch = !searchFilters.relation || 
                           person.familyRoles?.includes(searchFilters.relation);
      
      return nameMatch && generationMatch && relationMatch;
    });

    setSearchResults(results);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        🔍 البحث المتقدم عن الأشخاص
      </Typography>
      
      <TextField
        fullWidth
        label="اسم الشخص"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          handleSearch(e.target.value);
        }}
        sx={{ mb: 2 }}
        placeholder="ابحث بالاسم الأول أو اسم الأب..."
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item md={6}>
          <TextField
            select
            fullWidth
            label="الجيل"
            value={searchFilters.generation}
            onChange={(e) => {
              const newFilters = {...searchFilters, generation: e.target.value};
              setSearchFilters(newFilters);
              handleSearch(searchQuery);
            }}
            SelectProps={{ native: true }}
          >
            <option value="">جميع الأجيال</option>
            <option value="2">الجيل الثاني</option>
            <option value="1">الجيل الأول</option>
            <option value="0">الجيل الحالي</option>
            <option value="-1">الجيل التالي</option>
          </TextField>
        </Grid>
        <Grid item md={6}>
          <TextField
            select
            fullWidth
            label="القرابة"
            value={searchFilters.relation}
            onChange={(e) => {
              const newFilters = {...searchFilters, relation: e.target.value};
              setSearchFilters(newFilters);
              handleSearch(searchQuery);
            }}
            SelectProps={{ native: true }}
          >
            <option value="">جميع القرابات</option>
            <option value="رب العائلة">رب العائلة</option>
            <option value="ابن">ابن</option>
            <option value="بنت">بنت</option>
            <option value="أخ">أخ</option>
            <option value="أخت">أخت</option>
          </TextField>
        </Grid>
      </Grid>

      {searchResults.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            📊 النتائج ({searchResults.length} شخص):
          </Typography>
          
          {searchResults.map((person, index) => (
            <Card 
              key={person.personKey || index} 
              sx={{ mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
              onClick={() => onPersonSelect && onPersonSelect(person)}
            >
              <CardContent sx={{ py: 1 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar src={person.avatar} />
                  <Box flex={1}>
                    <Typography variant="subtitle2">{person.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {person.familyRoles?.join(', ')} • جيل {person.generation}
                    </Typography>
                  </Box>
                  <Chip 
                    size="small" 
                    label={`${person.children?.length || 0} طفل`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

// === 2. ميزة البحث عن العلاقات بين شخصين ===
export const RelationshipFinder = ({ allPersons = [] }) => {
  const [person1, setPerson1] = useState(null);
  const [person2, setPerson2] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [relationshipPath, setRelationshipPath] = useState([]);

  const findRelationship = (p1, p2) => {
    if (!p1 || !p2) return;

    const path = findPathBetweenPersons(p1, p2, allPersons);
    
    if (path) {
      const relationText = interpretRelationshipPath(path);
      setRelationship(relationText);
      setRelationshipPath(path);
    } else {
      setRelationship('لا توجد قرابة مباشرة');
      setRelationshipPath([]);
    }
  };

  const findPathBetweenPersons = (start, end, persons) => {
    const visited = new Set();
    const queue = [[start]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (current.personKey === end.personKey) {
        return path;
      }
      
      if (visited.has(current.personKey)) continue;
      visited.add(current.personKey);
      
      if (current.children) {
        current.children.forEach(child => {
          if (!visited.has(child.personKey)) {
            queue.push([...path, child]);
          }
        });
      }
      
      const parent = findParent(current, persons);
      if (parent && !visited.has(parent.personKey)) {
        queue.push([...path, parent]);
      }
    }
    
    return null;
  };

  const findParent = (person, persons) => {
    return persons.find(p => 
      p.children && p.children.some(child => child.personKey === person.personKey)
    );
  };

  const interpretRelationshipPath = (path) => {
    if (path.length < 2) return 'نفس الشخص';
    if (path.length === 2) {
      const [p1, p2] = path;
      if (p1.children?.some(child => child.personKey === p2.personKey)) {
        return 'والد/والدة';
      } else {
        return 'ابن/ابنة';
      }
    }
    
    const steps = path.length - 1;
    if (steps === 2) return 'جد/جدة أو حفيد/حفيدة';
    if (steps === 3) return 'جد الجد أو ابن الحفيد';
    
    return `قرابة من الدرجة ${steps}`;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h6" gutterBottom>
        🔗 البحث عن العلاقات العائلية
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item md={6}>
          <Autocomplete
            options={allPersons}
            getOptionLabel={(option) => option.name || ''}
            value={person1}
            onChange={(event, newValue) => setPerson1(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="الشخص الأول" fullWidth />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Avatar src={option.avatar} sx={{ mr: 2, width: 32, height: 32 }} />
                <Box>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.familyRoles?.join(', ')}
                  </Typography>
                </Box>
              </Box>
            )}
          />
        </Grid>
        
        <Grid item md={6}>
          <Autocomplete
            options={allPersons}
            getOptionLabel={(option) => option.name || ''}
            value={person2}
            onChange={(event, newValue) => setPerson2(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="الشخص الثاني" fullWidth />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Avatar src={option.avatar} sx={{ mr: 2, width: 32, height: 32 }} />
                <Box>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.familyRoles?.join(', ')}
                  </Typography>
                </Box>
              </Box>
            )}
          />
        </Grid>
      </Grid>

      <Button
        variant="contained"
        onClick={() => findRelationship(person1, person2)}
        disabled={!person1 || !person2}
        sx={{ mt: 3, mb: 3 }}
        startIcon={<Search />}
      >
        البحث عن العلاقة
      </Button>

      {relationship && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="h6">
            العلاقة: {relationship}
          </Typography>
        </Alert>
      )}

      {relationshipPath.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              مسار القرابة:
            </Typography>
            <Breadcrumbs separator="→" sx={{ mt: 2 }}>
              {relationshipPath.map((person, index) => (
                <Box key={index} display="flex" alignItems="center" gap={1}>
                  <Avatar src={person.avatar} sx={{ width: 24, height: 24 }} />
                  <Typography variant="body2">{person.name}</Typography>
                </Box>
              ))}
            </Breadcrumbs>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// === 3. جدول العائلة الشامل ===
export const FamilyTable = ({ allPersons = [] }) => {
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('');
  const [generationFilter, setGenerationFilter] = useState('');

  const filteredAndSortedPersons = useMemo(() => {
    let filtered = allPersons || [];

    if (filterBy) {
      filtered = filtered.filter(person => 
        person.name?.toLowerCase().includes(filterBy.toLowerCase())
      );
    }

    if (generationFilter) {
      filtered = filtered.filter(person => 
        person.generation === parseInt(generationFilter)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '', 'ar');
        case 'generation':
          return (b.generation || 0) - (a.generation || 0);
        case 'children':
          return (b.children?.length || 0) - (a.children?.length || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allPersons, sortBy, filterBy, generationFilter]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        📊 جدول العائلة الشامل
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item md={4}>
          <TextField
            fullWidth
            label="البحث بالاسم"
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item md={3}>
          <TextField
            select
            fullWidth
            label="الجيل"
            value={generationFilter}
            onChange={(e) => setGenerationFilter(e.target.value)}
            SelectProps={{ native: true }}
            size="small"
          >
            <option value="">جميع الأجيال</option>
            <option value="2">الجيل 2</option>
            <option value="1">الجيل 1</option>
            <option value="0">الجيل 0</option>
            <option value="-1">الجيل -1</option>
            <option value="-2">الجيل -2</option>
          </TextField>
        </Grid>
        <Grid item md={3}>
          <TextField
            select
            fullWidth
            label="ترتيب حسب"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            SelectProps={{ native: true }}
            size="small"
          >
            <option value="name">الاسم</option>
            <option value="generation">الجيل</option>
            <option value="children">عدد الأطفال</option>
          </TextField>
        </Grid>
        <Grid item md={2}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            المجموع: {filteredAndSortedPersons.length}
          </Typography>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الصورة</TableCell>
              <TableCell>الاسم الكامل</TableCell>
              <TableCell>الجيل</TableCell>
              <TableCell>القرابة</TableCell>
              <TableCell>الأطفال</TableCell>
              <TableCell>تاريخ الميلاد</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedPersons.map((person, index) => (
              <TableRow key={person.personKey || index} hover>
                <TableCell>
                  <Avatar src={person.avatar} />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2">{person.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {person.firstName} بن {person.fatherName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`جيل ${person.generation || 0}`}
                    size="small"
                    color={person.generation > 0 ? 'primary' : person.generation < 0 ? 'secondary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {person.familyRoles?.map((role, roleIndex) => (
                    <Chip key={roleIndex} label={role} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={person.children?.length || 0}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {person.birthDate || 'غير محدد'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <Visibility />
                  </IconButton>
                  <IconButton size="small">
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// === 4. دوائر العائلات ===
export const FamilyCircles = ({ allPersons = [] }) => {
  const familyCircles = useMemo(() => {
    const circles = new Map();
    
    allPersons?.forEach(person => {
      const familyId = person.familyUid || 'default';
      if (!circles.has(familyId)) {
        circles.set(familyId, {
          id: familyId,
          members: [],
          head: null,
          generation: person.generation || 0
        });
      }
      
      const circle = circles.get(familyId);
      circle.members.push(person);
      
      if (person.isMainUser) {
        circle.head = person;
      }
    });
    
    return Array.from(circles.values()).sort((a, b) => b.generation - a.generation);
  }, [allPersons]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        🔵 دوائر العائلات
      </Typography>
      
      <Grid container spacing={3}>
        {familyCircles.map((circle, index) => (
          <Grid item xs={12} md={6} lg={4} key={circle.id || index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar 
                    src={circle.head?.avatar}
                    sx={{ width: 56, height: 56 }}
                  />
                  <Box>
                    <Typography variant="h6">
                      عائلة {circle.head?.firstName || 'غير محدد'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      جيل {circle.generation} • {circle.members.length} أفراد
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Box>
                  {circle.members.slice(0, 4).map((member, memberIndex) => (
                    <Box key={member.personKey || memberIndex} display="flex" alignItems="center" gap={1} mb={1}>
                      <Avatar src={member.avatar} sx={{ width: 32, height: 32 }} />
                      <Box>
                        <Typography variant="body2">{member.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.familyRoles?.join(', ')}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  
                  {circle.members.length > 4 && (
                    <Typography variant="caption" color="text.secondary">
                      و {circle.members.length - 4} آخرين...
                    </Typography>
                  )}
                </Box>
                
                <Button 
                  size="small" 
                  fullWidth 
                  sx={{ mt: 2 }}
                  startIcon={<AccountTree />}
                >
                  عرض الشجرة
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// === 5. سيرة العائلات ===
export const FamilyBiography = ({ familyData = { families: new Map() } }) => {
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [biographies, setBiographies] = useState(new Map());

  const saveBiography = (familyId, biography) => {
    setBiographies(prev => new Map(prev).set(familyId, biography));
    // هنا يمكن حفظ البيانات في Firebase
  };

  const families = familyData?.families ? Array.from(familyData.families.values()) : [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        📖 سيرة العائلات
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={4}>
          <Typography variant="subtitle2" gutterBottom>
            اختر العائلة:
          </Typography>
          {families.map((family, index) => (
            <Card 
              key={family.uid || index}
              sx={{ 
                mb: 1, 
                cursor: 'pointer',
                bgcolor: selectedFamily?.uid === family.uid ? 'primary.light' : 'inherit'
              }}
              onClick={() => setSelectedFamily(family)}
            >
              <CardContent sx={{ py: 1 }}>
                <Typography variant="body2">
                  عائلة {family.head?.firstName || 'غير محدد'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {family.members?.length || 0} أفراد
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Grid>
        
        <Grid item xs={8}>
          {selectedFamily && (
            <FamilyBiographyEditor
              family={selectedFamily}
              biography={biographies.get(selectedFamily.uid) || ''}
              onSave={(bio) => saveBiography(selectedFamily.uid, bio)}
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

const FamilyBiographyEditor = ({ family, biography, onSave }) => {
  const [editedBiography, setEditedBiography] = useState(biography);

  useEffect(() => {
    setEditedBiography(biography);
  }, [biography]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        سيرة عائلة {family.head?.firstName || 'غير محدد'}
      </Typography>
      
      <TextField
        fullWidth
        multiline
        rows={15}
        value={editedBiography}
        onChange={(e) => setEditedBiography(e.target.value)}
        placeholder="اكتب سيرة العائلة هنا... يمكنك تضمين تاريخ العائلة، الإنجازات، الأحداث المهمة، والقصص العائلية..."
        sx={{ mb: 2 }}
      />
      
      <Button
        variant="contained"
        onClick={() => onSave(editedBiography)}
        startIcon={<Edit />}
      >
        حفظ السيرة
      </Button>
    </Box>
  );
};
