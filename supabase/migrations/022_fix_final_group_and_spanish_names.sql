-- ============================================================
-- Migration 022: Rename Final group 'F' → 'FIN' and
-- translate team names to Spanish.
-- ============================================================

-- Fix naming conflict: group F (stage) vs Final both used 'F'
UPDATE matches SET group_name = 'FIN' WHERE group_name = 'F' AND match_number = 104;

-- Translate team names to Spanish
UPDATE matches SET home_team = 'Turquía',          home_team_code = 'TUR' WHERE home_team IN ('Türkiye', 'Turkey');
UPDATE matches SET away_team = 'Turquía',          away_team_code = 'TUR' WHERE away_team IN ('Türkiye', 'Turkey');

UPDATE matches SET home_team = 'Arabia Saudita',   home_team_code = 'KSA' WHERE home_team = 'Saudi Arabia';
UPDATE matches SET away_team = 'Arabia Saudita',   away_team_code = 'KSA' WHERE away_team = 'Saudi Arabia';

UPDATE matches SET home_team = 'Marruecos',        home_team_code = 'MAR' WHERE home_team = 'Morocco';
UPDATE matches SET away_team = 'Marruecos',        away_team_code = 'MAR' WHERE away_team = 'Morocco';

UPDATE matches SET home_team = 'Escocia',          home_team_code = 'SCO' WHERE home_team = 'Scotland';
UPDATE matches SET away_team = 'Escocia',          away_team_code = 'SCO' WHERE away_team = 'Scotland';

UPDATE matches SET home_team = 'Costa de Marfil',  home_team_code = 'CIV' WHERE home_team = 'Ivory Coast';
UPDATE matches SET away_team = 'Costa de Marfil',  away_team_code = 'CIV' WHERE away_team = 'Ivory Coast';

UPDATE matches SET home_team = 'Alemania',         home_team_code = 'GER' WHERE home_team = 'Germany';
UPDATE matches SET away_team = 'Alemania',         away_team_code = 'GER' WHERE away_team = 'Germany';

UPDATE matches SET home_team = 'Bélgica',          home_team_code = 'BEL' WHERE home_team = 'Belgium';
UPDATE matches SET away_team = 'Bélgica',          away_team_code = 'BEL' WHERE away_team = 'Belgium';

UPDATE matches SET home_team = 'Estados Unidos',   home_team_code = 'USA' WHERE home_team = 'USA';
UPDATE matches SET away_team = 'Estados Unidos',   away_team_code = 'USA' WHERE away_team = 'USA';

UPDATE matches SET home_team = 'Noruega',          home_team_code = 'NOR' WHERE home_team = 'Norway';
UPDATE matches SET away_team = 'Noruega',          away_team_code = 'NOR' WHERE away_team = 'Norway';
