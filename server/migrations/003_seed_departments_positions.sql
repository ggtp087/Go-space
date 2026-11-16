-- Seed the departments and positions lookups. Idempotent (name_en is
-- UNIQUE); schema app only.
BEGIN;

INSERT INTO app.departments (name_th, name_en) VALUES
  ('สำนักงานเลขานุการ', 'Office of the Secretary'),
  ('กองนโยบายและแผนงาน', 'Policy and Planning Division'),
  ('สำนักงานภูมิสารสนเทศ', 'Geo-Informatics Office'),
  ('สำนักงานวางผังเมือง', 'City Planning Office'),
  ('สำนักงานพัฒนาและฟื้นฟูเมือง', 'Urban Development and Renewal Office'),
  ('กองควบคุมผังเมือง', 'City Plan Control Division')
ON CONFLICT (name_en) DO NOTHING;

INSERT INTO app.positions (name_th, name_en) VALUES
  ('นักผังเมือง', 'Urban Planner'),
  ('สถาปนิก', 'Architect'),
  ('วิศวกรโยธา', 'Civil Engineer'),
  ('นักวิเคราะห์นโยบายและแผน', 'Policy and Plan Analyst'),
  ('นักวิชาการคอมพิวเตอร์', 'Computer Technical Officer'),
  ('นักวิชาการแผนที่ภาพถ่าย', 'Photogrammetry Officer'),
  ('นายช่างสำรวจ', 'Survey Technician'),
  ('เจ้าพนักงานธุรการ', 'Administrative Officer'),
  ('อื่น ๆ', 'Other')
ON CONFLICT (name_en) DO NOTHING;

COMMIT;
