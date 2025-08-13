// src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  IconButton,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  AccountTree as RelationIcon
} from '@mui/icons-material';

export const SearchBar = ({ 
  onSearch, 
  onSelectResult, 
  searchResults = [],
  placeholder = "البحث في شجرة العائلة...",
  sx = {} 
}) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
    setShowResults(value.length > 0 && searchResults.length > 0);
  };

  const handleSelectResult = (result) => {
    setQuery(result.node.data?.name || result.node.name || '');
    setShowResults(false);
    onSelectResult(result.node);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setShowResults(false);
    searchRef.current?.focus();
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'name': return <PersonIcon fontSize="small" />;
      case 'relation': return <RelationIcon fontSize="small" />;
      case 'location': return <LocationIcon fontSize="small" />;
      default: return <PersonIcon fontSize="small" />;
    }
  };

  const getResultColor = (type) => {
    switch (type) {
      case 'name': return 'primary';
      case 'relation': return 'secondary';
      case 'location': return 'warning';
      default: return 'default';
    }
  };

  // إخفاء النتائج عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        resultsRef.current && 
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <TextField
        ref={searchRef}
        fullWidth
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        variant="outlined"
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: query && (
            <InputAdornment position="end">
              <IconButton onClick={handleClear} size="small">
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
          sx: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            fontFamily: 'Cairo, sans-serif',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.1)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          }
        }}
        onFocus={() => setShowResults(query.length > 0 && searchResults.length > 0)}
      />

      {showResults && (
        <Paper
          ref={resultsRef}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 300,
            overflow: 'auto',
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          <List dense>
            {searchResults.slice(0, 10).map((result, index) => (
              <ListItem
                key={index}
                onClick={() => handleSelectResult(result)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      {getResultIcon(result.type)}
                      <Typography variant="body1" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                        {result.node.data?.name || result.node.name}
                      </Typography>
                      <Chip
                        label={result.type === 'name' ? 'اسم' : result.type === 'relation' ? 'قرابة' : 'موقع'}
                        size="small"
                        color={getResultColor(result.type)}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                      {result.node.data?.relation || result.node.relation || 'غير محدد'}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};
