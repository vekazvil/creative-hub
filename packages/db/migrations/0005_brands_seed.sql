-- Starting brand list from the wireframe. The real list is imported from the counter
-- Sheet (columns B, C, D) once we have access; that import updates these rows.
INSERT INTO "brands" ("code", "short", "name") VALUES
  ('00', 'MULTI', 'Several brands'),
  ('01', 'LC', 'La Costeña'),
  ('02', NULL, 'Mexico Rico'),
  ('03', 'JX', 'Jumex'),
  ('04', 'TT', 'Totis'),
  ('05', 'AM', 'AMOR'),
  ('06', NULL, 'Odwalla'),
  ('07', 'V5', 'Vitafive'),
  ('08', NULL, 'The Respect Co'),
  ('10', NULL, 'Lucks'),
  ('11', NULL, 'Primo'),
  ('12', NULL, 'Pronto'),
  ('13', NULL, 'Congelli'),
  ('15', 'TL', 'Tía Lupita'),
  ('17', NULL, 'Cal C Tose'),
  ('18', 'CT', 'Chocomilk'),
  ('19', 'METCO', 'Metco'),
  ('20', 'CON', 'CON Alimentos'),
  ('21', 'SOM', 'Fregon')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
-- Spellings people use. Accents and case are ignored anyway ("La Costena" finds La Costeña);
-- sub-brands come with Ana's list.
INSERT INTO "brand_aliases" ("alias", "normalized", "brand_code") VALUES
  ('Costeña', 'costena', '01'),
  ('LaCosteña', 'lacostena', '01'),
  ('La Costeña USA', 'la costena usa', '01'),
  ('MexicoRico', 'mexicorico', '02'),
  ('Vita Five', 'vita five', '07'),
  ('Vita 5', 'vita 5', '07'),
  ('Respect Co', 'respect co', '08'),
  ('The Respect Company', 'the respect company', '08'),
  ('CalCTose', 'calctose', '17'),
  ('Choco Milk', 'choco milk', '18'),
  ('Multiple brands', 'multiple brands', '00'),
  ('All brands', 'all brands', '00')
ON CONFLICT ("normalized") DO NOTHING;
