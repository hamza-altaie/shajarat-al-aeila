import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Container, Typography, Box, Card, CardContent, Paper, Tabs, Tab, 
  CircularProgress, Alert, Button, Chip, Grid2 as Grid
} from '@mui/material';

// باقي الاستيرادات تبقى كما هي
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InsightsIcon from '@mui/icons-material/Insights';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import ElderlyIcon from '@mui/icons-material/Elderly';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CakeIcon from '@mui/icons-material/Cake';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';

// استيرادات الخدمات
import { loadFamily } from '../services/familyService.js';
import { familyAnalytics } from '../utils/FamilyAnalytics';

// استيراد AuthContext للحصول على uid
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
