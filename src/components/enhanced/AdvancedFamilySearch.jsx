// src/components/enhanced/AdvancedFamilySearch.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';

const AdvancedFamilySearch = ({ 
  treeData, 
  onPersonSelect, 
  onHighlightPath,
  familyData = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState('all');
  const [selectedRelation, setSelectedRelation] = useState('all');
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);

  // جمع جميع الأشخاص من الشجرة
  const allPersons = useMemo(() => {
    if (!treeData) return [];

    const persons = [];
    
    const collectPersons = (node, depth = 0, path = []) => {
      if (!node) return;

      persons.push({
        ...node,
        depth,
        path: [...path, node.name],
        searchKey: `${node.name} ${node.fullName || ''} ${node.relation || ''} ${node.phone || ''}`.toLowerCase()
      });

      if (node.children) {
        node.children.forEach(child => 
          collectPersons(child, depth + 1, [...path, node.name])
        );
      }
    };

    collectPersons(treeData);
    return persons;
  }, [treeData]);

  // احصائيات الشجرة
  const treeStats = useMemo(() => {
    const relations = new Set();
    const generations = new Set();
    const families = new Set();

    allPersons.forEach(person => {
      if (person.relation) relations.add(person.relation);
      generations.add(person.depth);
      if (person.familyUid) families.add(person.familyUid);
    });

    return {
      relations: Array.from(relations),
      generations: Array.from(generations).sort((a, b) => a - b),
      families: Array.from(families)
    };
  }, [allPersons]);

  // فلترة النتائج
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim() && selectedGeneration === 'all' && 
        selectedRelation === 'all' && selectedFamily === 'all') {
      return [];
    }

    return allPersons.filter(person => {
      // فلترة النص
      const matchesText = !searchTerm.trim() || (() => {
        switch (searchType) {
          case 'name':
            return person.name?.toLowerCase().includes(searchTerm.toLowerCase());
          case 'relation':
            return person.relation?.toLowerCase().includes(searchTerm.toLowerCase());
          case 'phone':
            return person.phone?.includes(searchTerm);
          case 'all':
          default:
            return person.searchKey.includes(searchTerm.toLowerCase());
        }
      })();

      // فلترة الجيل
      const matchesGeneration = selectedGeneration === 'all' || 
        person.depth === parseInt(selectedGeneration);

      // فلترة العلاقة
      const matchesRelation = selectedRelation === 'all' || 
        person.relation === selectedRelation;

      // فلترة العائلة
      const matchesFamily = selectedFamily === 'all' || 
        person.familyUid === selectedFamily;

      return matchesText && matchesGeneration && matchesRelation && matchesFamily;
    });
  }, [allPersons, searchTerm, searchType, selectedGeneration, selectedRelation, selectedFamily]);

  // اقتراحات سريعة
  const quickSuggestions = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];
    
    return allPersons
      .filter(person => person.searchKey.includes(searchTerm.toLowerCase()))
      .slice(0, 8)
      .map(person => ({
        text: person.name,
        type: 'person',
        data: person
      }));
  }, [allPersons, searchTerm]);

  // معالجة الضغط على المفاتيح
  const handleKeyDown = (e) => {
    if (!showSuggestions || quickSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < quickSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : quickSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && quickSuggestions[highlightedIndex]) {
          selectPerson(quickSuggestions[highlightedIndex].data);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // اختيار شخص
  const selectPerson = (person) => {
    setSearchTerm(person.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    
    if (onPersonSelect) {
      onPersonSelect(person);
    }
    
    if (onHighlightPath) {
      onHighlightPath(person.path);
    }
  };

  // مسح البحث
  const clearSearch = () => {
    setSearchTerm('');
    setSelectedGeneration('all');
    setSelectedRelation('all');
    setSelectedFamily('all');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  // فقدان التركيز
  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '12px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      padding: '20px',
      maxWidth: '500px',
      position: 'relative'
    }}>
      {/* عنوان البحث */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '16px',
        gap: '8px'
      }}>
        <span style={{ fontSize: '20px' }}>🔍</span>
        <h3 style={{ margin: 0, color: '#333' }}>البحث في شجرة العائلة</h3>
      </div>

      {/* حقل البحث الرئيسي */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleBlur}
          placeholder="ابحث عن شخص..."
          style={{
            width: '100%',
            padding: '12px 40px 12px 12px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.3s',
            fontFamily: 'Cairo, Arial, sans-serif'
          }}
        />
        
        {searchTerm && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#999'
            }}
          >
            ✕
          </button>
        )}

        {/* اقتراحات سريعة */}
        {showSuggestions && quickSuggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {quickSuggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => selectPerson(suggestion.data)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#f0f0f0' : 'transparent',
                  borderBottom: index < quickSuggestions.length - 1 ? '1px solid #eee' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>👤</span>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{suggestion.data.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {suggestion.data.relation} - الجيل {suggestion.data.depth + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* نوع البحث */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: 'الكل', icon: '🔍' },
          { value: 'name', label: 'الاسم', icon: '👤' },
          { value: 'relation', label: 'العلاقة', icon: '👨‍👩‍👧‍👦' },
          { value: 'phone', label: 'الهاتف', icon: '📞' }
        ].map(type => (
          <button
            key={type.value}
            onClick={() => setSearchType(type.value)}
            style={{
              padding: '6px 12px',
              border: searchType === type.value ? '2px solid #2196F3' : '1px solid #ddd',
              borderRadius: '20px',
              background: searchType === type.value ? '#e3f2fd' : 'white',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {/* البحث المتقدم */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'none',
            border: 'none',
            color: '#2196F3',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{showAdvanced ? '🔼' : '🔽'}</span>
          بحث متقدم
        </button>

        {showAdvanced && (
          <div style={{ 
            marginTop: '12px', 
            padding: '16px', 
            background: '#f8f9fa', 
            borderRadius: '8px',
            display: 'grid',
            gap: '12px'
          }}>
            {/* فلترة الجيل */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                الجيل:
              </label>
              <select
                value={selectedGeneration}
                onChange={(e) => setSelectedGeneration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="all">جميع الأجيال</option>
                {treeStats.generations.map(gen => (
                  <option key={gen} value={gen}>الجيل {gen + 1}</option>
                ))}
              </select>
            </div>

            {/* فلترة العلاقة */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                العلاقة:
              </label>
              <select
                value={selectedRelation}
                onChange={(e) => setSelectedRelation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="all">جميع العلاقات</option>
                {treeStats.relations.map(relation => (
                  <option key={relation} value={relation}>{relation}</option>
                ))}
              </select>
            </div>

            {/* فلترة العائلة */}
            {familyData.length > 1 && (
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                  العائلة:
                </label>
                <select
                  value={selectedFamily}
                  onChange={(e) => setSelectedFamily(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="all">جميع العائلات</option>
                  {familyData.map(family => (
                    <option key={family.uid} value={family.uid}>
                      {family.familyName || `عائلة ${family.head?.firstName || 'غير محدد'}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* نتائج البحث */}
      {filteredResults.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h4 style={{ margin: 0, color: '#333' }}>
              النتائج ({filteredResults.length})
            </h4>
            {filteredResults.length > 10 && (
              <span style={{ fontSize: '12px', color: '#666' }}>
                عرض أول 10 نتائج
              </span>
            )}
          </div>

          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            border: '1px solid #eee',
            borderRadius: '8px'
          }}>
            {filteredResults.slice(0, 10).map((person, index) => (
              <div
                key={person.id || index}
                onClick={() => selectPerson(person)}
                style={{
                  padding: '12px',
                  borderBottom: index < Math.min(filteredResults.length, 10) - 1 ? '1px solid #eee' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%',
                  background: person.isHead ? 'linear-gradient(45deg, #FF6B6B, #4ECDC4)' : 
                             person.relation === 'بنت' ? '#F8BBD9' : '#4FC3F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {person.isHead ? '👑' : person.relation === 'بنت' ? '👩' : '👨'}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                    {person.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {person.relation} • الجيل {person.depth + 1}
                    {person.phone && ` • ${person.phone}`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    المسار: {person.path.join(' ← ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* رسالة عدم وجود نتائج */}
      {searchTerm && filteredResults.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: '#666',
          background: '#f8f9fa',
          borderRadius: '8px',
          marginTop: '16px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔍</div>
          <div>لم يتم العثور على نتائج</div>
          <div style={{ fontSize: '14px', marginTop: '4px' }}>
            جرب تغيير كلمات البحث أو المرشحات
          </div>
        </div>
      )}

      {/* احصائيات سريعة */}
      {!searchTerm && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '8px',
          marginTop: '16px'
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: '8px',
            background: '#e3f2fd',
            borderRadius: '6px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#1976d2' }}>
              {allPersons.length}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>أشخاص</div>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '8px',
            background: '#f3e5f5',
            borderRadius: '6px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#7b1fa2' }}>
              {treeStats.generations.length}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>أجيال</div>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '8px',
            background: '#e8f5e8',
            borderRadius: '6px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#388e3c' }}>
              {treeStats.families.length}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>عائلات</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFamilySearch;