-- ======================================
-- نظام شجرة القبيلة الموحدة الذكية
-- Smart Unified Tribe Tree Schema
-- ======================================

-- 1. تحديث جدول الأشخاص مع إضافة حقول الربط الذكي
ALTER TABLE persons ADD COLUMN IF NOT EXISTS ancestor_chain TEXT[]; -- سلسلة النسب [جد, أب, الشخص]
ALTER TABLE persons ADD COLUMN IF NOT EXISTS full_lineage TEXT; -- النسب الكامل كنص للبحث السريع
ALTER TABLE persons ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE; -- هل تم التحقق من الشخص
ALTER TABLE persons ADD COLUMN IF NOT EXISTS verified_by TEXT; -- من قام بالتحقق
ALTER TABLE persons ADD COLUMN IF NOT EXISTS merge_candidate_id BIGINT; -- مرشح للدمج
ALTER TABLE persons ADD COLUMN IF NOT EXISTS confidence_score DECIMAL DEFAULT 0; -- درجة الثقة في الربط
ALTER TABLE persons ADD COLUMN IF NOT EXISTS auto_linked BOOLEAN DEFAULT FALSE; -- هل تم الربط تلقائياً
ALTER TABLE persons ADD COLUMN IF NOT EXISTS link_source TEXT; -- مصدر الربط (manual, auto_name, auto_parent)

-- 2. جدول طلبات الربط المعلقة
CREATE TABLE IF NOT EXISTS pending_links (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  requester_person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  target_person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('parent', 'child', 'sibling', 'spouse')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  requested_by TEXT NOT NULL,
  reviewed_by TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  confidence_score DECIMAL DEFAULT 0,
  UNIQUE(requester_person_id, target_person_id, link_type)
);

-- 3. جدول المطابقات المحتملة للدمج
CREATE TABLE IF NOT EXISTS potential_matches (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  person1_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  person2_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  match_score DECIMAL NOT NULL, -- 0-100
  match_reasons JSONB, -- أسباب المطابقة
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'merged')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  UNIQUE(person1_id, person2_id)
);

-- 4. جدول سلاسل النسب (للبحث السريع)
CREATE TABLE IF NOT EXISTS lineage_chains (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  ancestor_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  distance INTEGER NOT NULL, -- المسافة من الشخص للسلف (1 = أب، 2 = جد، إلخ)
  path_ids BIGINT[], -- مسار الوصول [ancestor_id, ..., person_id]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(person_id, ancestor_id)
);

-- 5. جدول جذور الشجرة
CREATE TABLE IF NOT EXISTS tree_roots (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  is_verified_root BOOLEAN DEFAULT FALSE,
  generation_count INTEGER DEFAULT 1,
  descendant_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tribe_id, person_id)
);

-- 6. فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_persons_ancestor_chain ON persons USING GIN(ancestor_chain);
CREATE INDEX IF NOT EXISTS idx_persons_full_lineage ON persons(full_lineage);
CREATE INDEX IF NOT EXISTS idx_persons_verified ON persons(verified);
CREATE INDEX IF NOT EXISTS idx_pending_links_status ON pending_links(status);
CREATE INDEX IF NOT EXISTS idx_potential_matches_score ON potential_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_lineage_chains_ancestor ON lineage_chains(ancestor_id);
CREATE INDEX IF NOT EXISTS idx_lineage_chains_person ON lineage_chains(person_id);

-- 7. دالة حساب سلسلة النسب
CREATE OR REPLACE FUNCTION calculate_ancestor_chain(p_person_id BIGINT)
RETURNS TEXT[] AS $$
DECLARE
  chain TEXT[];
  current_id BIGINT := p_person_id;
  parent_id BIGINT;
  person_name TEXT;
  max_depth INTEGER := 20;
  depth INTEGER := 0;
BEGIN
  WHILE current_id IS NOT NULL AND depth < max_depth LOOP
    -- الحصول على اسم الشخص الحالي
    SELECT first_name INTO person_name FROM persons WHERE id = current_id;
    
    IF person_name IS NOT NULL THEN
      chain := person_name || chain;
    END IF;
    
    -- البحث عن الوالد
    SELECT r.parent_id INTO parent_id
    FROM relations r
    WHERE r.child_id = current_id
    LIMIT 1;
    
    current_id := parent_id;
    depth := depth + 1;
  END LOOP;
  
  RETURN chain;
END;
$$ LANGUAGE plpgsql;

-- 8. دالة بناء النسب الكامل
CREATE OR REPLACE FUNCTION build_full_lineage(p_person_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  lineage TEXT;
  chain TEXT[];
BEGIN
  chain := calculate_ancestor_chain(p_person_id);
  lineage := array_to_string(chain, ' بن ');
  RETURN lineage;
END;
$$ LANGUAGE plpgsql;

-- 9. دالة حساب درجة التطابق بين شخصين
CREATE OR REPLACE FUNCTION calculate_match_score(p1_id BIGINT, p2_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  p1 RECORD;
  p2 RECORD;
  score DECIMAL := 0;
  reasons JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO p1 FROM persons WHERE id = p1_id;
  SELECT * INTO p2 FROM persons WHERE id = p2_id;
  
  -- مطابقة الاسم الأول
  IF LOWER(TRIM(p1.first_name)) = LOWER(TRIM(p2.first_name)) THEN
    score := score + 30;
    reasons := reasons || '["تطابق الاسم الأول"]'::JSONB;
  END IF;
  
  -- مطابقة اسم الأب
  IF LOWER(TRIM(p1.father_name)) = LOWER(TRIM(p2.father_name)) THEN
    score := score + 25;
    reasons := reasons || '["تطابق اسم الأب"]'::JSONB;
  END IF;
  
  -- مطابقة اسم الجد
  IF LOWER(TRIM(p1.grandfather_name)) = LOWER(TRIM(p2.grandfather_name)) THEN
    score := score + 20;
    reasons := reasons || '["تطابق اسم الجد"]'::JSONB;
  END IF;
  
  -- مطابقة اسم العائلة
  IF LOWER(TRIM(p1.family_name)) = LOWER(TRIM(p2.family_name)) THEN
    score := score + 15;
    reasons := reasons || '["تطابق اسم العائلة"]'::JSONB;
  END IF;
  
  -- مطابقة تاريخ الميلاد
  IF p1.birth_date IS NOT NULL AND p2.birth_date IS NOT NULL 
     AND p1.birth_date = p2.birth_date THEN
    score := score + 10;
    reasons := reasons || '["تطابق تاريخ الميلاد"]'::JSONB;
  END IF;
  
  RETURN jsonb_build_object(
    'score', score,
    'reasons', reasons
  );
END;
$$ LANGUAGE plpgsql;

-- 10. دالة البحث عن مطابقات محتملة
CREATE OR REPLACE FUNCTION find_potential_matches(p_tribe_id BIGINT, p_person_id BIGINT)
RETURNS TABLE(
  match_person_id BIGINT,
  match_score DECIMAL,
  match_reasons JSONB
) AS $$
DECLARE
  person_rec RECORD;
  match_result JSONB;
BEGIN
  SELECT * INTO person_rec FROM persons WHERE id = p_person_id;
  
  RETURN QUERY
  SELECT 
    p.id AS match_person_id,
    (calculate_match_score(p_person_id, p.id)->>'score')::DECIMAL AS match_score,
    calculate_match_score(p_person_id, p.id)->'reasons' AS match_reasons
  FROM persons p
  WHERE p.tribe_id = p_tribe_id
    AND p.id != p_person_id
    AND (
      -- مطابقة جزئية على الأقل
      LOWER(TRIM(p.first_name)) = LOWER(TRIM(person_rec.first_name))
      OR LOWER(TRIM(p.father_name)) = LOWER(TRIM(person_rec.father_name))
    )
  ORDER BY match_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 11. دالة الربط التلقائي للأشخاص الجدد
CREATE OR REPLACE FUNCTION auto_link_person()
RETURNS TRIGGER AS $$
DECLARE
  potential_parent_id BIGINT;
  match_count INTEGER;
BEGIN
  -- البحث عن والد محتمل بناءً على اسم الأب
  SELECT p.id INTO potential_parent_id
  FROM persons p
  WHERE p.tribe_id = NEW.tribe_id
    AND LOWER(TRIM(p.first_name)) = LOWER(TRIM(NEW.father_name))
    AND p.id != NEW.id
    -- تجنب الدورات: الشخص لا يمكن أن يكون والداً لمن هو أكبر منه
    AND (NEW.birth_date IS NULL OR p.birth_date IS NULL OR p.birth_date < NEW.birth_date)
  ORDER BY 
    -- أولوية للأشخاص الذين لديهم نفس اسم الجد
    CASE WHEN LOWER(TRIM(p.father_name)) = LOWER(TRIM(NEW.grandfather_name)) THEN 0 ELSE 1 END,
    p.generation ASC
  LIMIT 1;
  
  -- إذا وجدنا والداً محتملاً، أضف العلاقة
  IF potential_parent_id IS NOT NULL THEN
    -- تحقق من عدم وجود العلاقة مسبقاً
    SELECT COUNT(*) INTO match_count
    FROM relations
    WHERE parent_id = potential_parent_id AND child_id = NEW.id;
    
    IF match_count = 0 THEN
      INSERT INTO relations (tribe_id, parent_id, child_id, created_by)
      VALUES (NEW.tribe_id, potential_parent_id, NEW.id, NEW.created_by);
      
      -- تحديث حقول الربط الذكي
      UPDATE persons 
      SET auto_linked = TRUE, 
          link_source = 'auto_name',
          generation = (SELECT COALESCE(generation, 0) + 1 FROM persons WHERE id = potential_parent_id)
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  -- تحديث سلسلة النسب
  UPDATE persons 
  SET ancestor_chain = calculate_ancestor_chain(NEW.id),
      full_lineage = build_full_lineage(NEW.id)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الـ Trigger
DROP TRIGGER IF EXISTS trigger_auto_link_person ON persons;
CREATE TRIGGER trigger_auto_link_person
  AFTER INSERT ON persons
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_person();

-- 12. دالة تحديث سلاسل النسب عند تغيير العلاقات
CREATE OR REPLACE FUNCTION update_lineage_on_relation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث النسب للطفل
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE persons 
    SET ancestor_chain = calculate_ancestor_chain(NEW.child_id),
        full_lineage = build_full_lineage(NEW.child_id),
        generation = (SELECT COALESCE(generation, 0) + 1 FROM persons WHERE id = NEW.parent_id)
    WHERE id = NEW.child_id;
  END IF;
  
  -- تحديث جذور الشجرة
  PERFORM rebuild_tree_roots(
    COALESCE(NEW.tribe_id, OLD.tribe_id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lineage ON relations;
CREATE TRIGGER trigger_update_lineage
  AFTER INSERT OR UPDATE OR DELETE ON relations
  FOR EACH ROW
  EXECUTE FUNCTION update_lineage_on_relation_change();

-- 13. دالة إعادة بناء جذور الشجرة
CREATE OR REPLACE FUNCTION rebuild_tree_roots(p_tribe_id BIGINT)
RETURNS VOID AS $$
BEGIN
  -- حذف الجذور القديمة
  DELETE FROM tree_roots WHERE tribe_id = p_tribe_id;
  
  -- إدراج الجذور الجديدة (أشخاص بدون آباء)
  INSERT INTO tree_roots (tribe_id, person_id, generation_count, descendant_count)
  SELECT 
    p.tribe_id,
    p.id,
    COALESCE((
      SELECT MAX(gen.generation) - p.generation + 1
      FROM persons gen
      WHERE gen.tribe_id = p.tribe_id
    ), 1) AS generation_count,
    (
      SELECT COUNT(DISTINCT lc.person_id)
      FROM lineage_chains lc
      WHERE lc.ancestor_id = p.id
    ) AS descendant_count
  FROM persons p
  WHERE p.tribe_id = p_tribe_id
    AND NOT EXISTS (
      SELECT 1 FROM relations r WHERE r.child_id = p.id
    );
END;
$$ LANGUAGE plpgsql;

-- 14. دالة بناء سلاسل النسب للجميع
CREATE OR REPLACE FUNCTION rebuild_all_lineage_chains(p_tribe_id BIGINT)
RETURNS VOID AS $$
DECLARE
  person_rec RECORD;
BEGIN
  -- حذف السلاسل القديمة
  DELETE FROM lineage_chains WHERE tribe_id = p_tribe_id;
  
  -- بناء السلاسل الجديدة لكل شخص
  FOR person_rec IN SELECT id FROM persons WHERE tribe_id = p_tribe_id LOOP
    -- إدراج سلسلة الأجداد
    WITH RECURSIVE ancestors AS (
      SELECT 
        r.parent_id AS ancestor_id,
        r.child_id AS person_id,
        1 AS distance,
        ARRAY[r.parent_id, r.child_id] AS path
      FROM relations r
      WHERE r.child_id = person_rec.id
      
      UNION ALL
      
      SELECT 
        r.parent_id AS ancestor_id,
        a.person_id,
        a.distance + 1,
        r.parent_id || a.path
      FROM relations r
      JOIN ancestors a ON r.child_id = a.ancestor_id
      WHERE a.distance < 20
    )
    INSERT INTO lineage_chains (tribe_id, person_id, ancestor_id, distance, path_ids)
    SELECT p_tribe_id, person_rec.id, ancestor_id, distance, path
    FROM ancestors
    ON CONFLICT (person_id, ancestor_id) DO UPDATE SET
      distance = EXCLUDED.distance,
      path_ids = EXCLUDED.path_ids;
  END LOOP;
  
  -- تحديث جذور الشجرة
  PERFORM rebuild_tree_roots(p_tribe_id);
END;
$$ LANGUAGE plpgsql;

-- 15. View للشجرة الهرمية الموحدة
CREATE OR REPLACE VIEW unified_tribe_tree AS
WITH RECURSIVE tree AS (
  -- الجذور (الأشخاص بدون آباء)
  SELECT 
    p.id,
    p.tribe_id,
    p.first_name,
    p.father_name,
    p.grandfather_name,
    p.family_name,
    p.gender,
    p.birth_date,
    p.death_date,
    p.is_alive,
    p.photo_url,
    p.generation,
    p.created_by,
    NULL::BIGINT AS parent_id,
    ARRAY[p.id] AS path,
    0 AS depth,
    p.first_name AS lineage_text
  FROM persons p
  WHERE NOT EXISTS (
    SELECT 1 FROM relations r WHERE r.child_id = p.id
  )
  
  UNION ALL
  
  -- الأبناء
  SELECT 
    p.id,
    p.tribe_id,
    p.first_name,
    p.father_name,
    p.grandfather_name,
    p.family_name,
    p.gender,
    p.birth_date,
    p.death_date,
    p.is_alive,
    p.photo_url,
    p.generation,
    p.created_by,
    r.parent_id,
    t.path || p.id,
    t.depth + 1,
    p.first_name || ' بن ' || t.lineage_text
  FROM persons p
  JOIN relations r ON r.child_id = p.id
  JOIN tree t ON t.id = r.parent_id
  WHERE NOT p.id = ANY(t.path) -- منع الدورات
    AND t.depth < 25
)
SELECT * FROM tree;

-- 16. دالة للحصول على الشجرة الهرمية كـ JSON
CREATE OR REPLACE FUNCTION get_tribe_tree_json(p_tribe_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH RECURSIVE tree AS (
    SELECT 
      p.id,
      p.first_name,
      p.father_name,
      p.family_name,
      p.gender,
      p.birth_date,
      p.is_alive,
      p.photo_url,
      p.generation,
      NULL::BIGINT AS parent_id,
      0 AS depth
    FROM persons p
    WHERE p.tribe_id = p_tribe_id
      AND NOT EXISTS (SELECT 1 FROM relations r WHERE r.child_id = p.id AND r.tribe_id = p_tribe_id)
    
    UNION ALL
    
    SELECT 
      p.id,
      p.first_name,
      p.father_name,
      p.family_name,
      p.gender,
      p.birth_date,
      p.is_alive,
      p.photo_url,
      p.generation,
      r.parent_id,
      t.depth + 1
    FROM persons p
    JOIN relations r ON r.child_id = p.id
    JOIN tree t ON t.id = r.parent_id
    WHERE p.tribe_id = p_tribe_id
      AND t.depth < 25
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'firstName', first_name,
      'fatherName', father_name,
      'familyName', family_name,
      'gender', gender,
      'birthDate', birth_date,
      'isAlive', is_alive,
      'photoUrl', photo_url,
      'generation', generation,
      'parentId', parent_id,
      'depth', depth
    )
    ORDER BY depth, first_name
  ) INTO result
  FROM tree;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- 17. دالة التحقق من وجود تكرار
CREATE OR REPLACE FUNCTION check_duplicate_person(
  p_tribe_id BIGINT,
  p_first_name TEXT,
  p_father_name TEXT,
  p_grandfather_name TEXT DEFAULT NULL,
  p_family_name TEXT DEFAULT NULL,
  p_exclude_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
  id BIGINT,
  similarity_score DECIMAL,
  is_exact_match BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    (
      CASE WHEN LOWER(TRIM(p.first_name)) = LOWER(TRIM(p_first_name)) THEN 40 ELSE 0 END +
      CASE WHEN LOWER(TRIM(p.father_name)) = LOWER(TRIM(p_father_name)) THEN 30 ELSE 0 END +
      CASE WHEN p_grandfather_name IS NOT NULL AND LOWER(TRIM(p.grandfather_name)) = LOWER(TRIM(p_grandfather_name)) THEN 20 ELSE 0 END +
      CASE WHEN p_family_name IS NOT NULL AND LOWER(TRIM(p.family_name)) = LOWER(TRIM(p_family_name)) THEN 10 ELSE 0 END
    )::DECIMAL AS similarity_score,
    (
      LOWER(TRIM(p.first_name)) = LOWER(TRIM(p_first_name)) AND
      LOWER(TRIM(p.father_name)) = LOWER(TRIM(p_father_name))
    ) AS is_exact_match
  FROM persons p
  WHERE p.tribe_id = p_tribe_id
    AND (p_exclude_id IS NULL OR p.id != p_exclude_id)
    AND (
      LOWER(TRIM(p.first_name)) = LOWER(TRIM(p_first_name))
      OR LOWER(TRIM(p.father_name)) = LOWER(TRIM(p_father_name))
    )
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 18. حذف الصلاحيات المؤقتة (للتطوير)
-- RLS معطل مؤقتاً
ALTER TABLE pending_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE potential_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineage_chains DISABLE ROW LEVEL SECURITY;
ALTER TABLE tree_roots DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE pending_links IS 'طلبات الربط المعلقة - تحتاج موافقة';
COMMENT ON TABLE potential_matches IS 'المطابقات المحتملة للدمج';
COMMENT ON TABLE lineage_chains IS 'سلاسل النسب للبحث السريع';
COMMENT ON TABLE tree_roots IS 'جذور الشجرة (الأجداد الأعلى)';
