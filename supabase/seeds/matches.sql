-- ============================================================
-- FIFA World Cup 2026 — 104 Matches
-- June 11 – July 19 · USA, Canada & Mexico
-- ============================================================

INSERT INTO matches (match_number, group_name, home_team, away_team, home_team_code, away_team_code, match_date, venue, city) VALUES

-- GROUP A — Mexico · South Africa · South Korea · Czechia
(1,  'A', 'Mexico',              'South Africa',          'MEX', 'RSA', '2026-06-11 20:00:00+00', 'Estadio Azteca',             'Mexico City'),
(2,  'A', 'South Korea',         'Czechia',               'KOR', 'CZE', '2026-06-11 23:00:00+00', 'Estadio Akron',              'Guadalajara'),
(3,  'A', 'Czechia',             'South Africa',          'CZE', 'RSA', '2026-06-18 20:00:00+00', 'Mercedes-Benz Stadium',      'Atlanta'),
(4,  'A', 'Mexico',              'South Korea',           'MEX', 'KOR', '2026-06-18 23:00:00+00', 'Estadio Akron',              'Guadalajara'),
(5,  'A', 'Czechia',             'Mexico',                'CZE', 'MEX', '2026-06-24 18:00:00+00', 'Estadio Azteca',             'Mexico City'),
(6,  'A', 'South Africa',        'South Korea',           'RSA', 'KOR', '2026-06-24 18:00:00+00', 'Estadio BBVA',               'Monterrey'),

-- GROUP B — Canada · Bosnia & Herzegovina · Qatar · Switzerland
(7,  'B', 'Canada',              'Bosnia & Herzegovina',  'CAN', 'BIH', '2026-06-12 20:00:00+00', 'BMO Field',                  'Toronto'),
(8,  'B', 'Qatar',               'Switzerland',           'QAT', 'SUI', '2026-06-13 17:00:00+00', 'Levi''s Stadium',             'Santa Clara'),
(9,  'B', 'Switzerland',         'Bosnia & Herzegovina',  'SUI', 'BIH', '2026-06-18 17:00:00+00', 'SoFi Stadium',               'Inglewood'),
(10, 'B', 'Canada',              'Qatar',                 'CAN', 'QAT', '2026-06-18 02:00:00+00', 'BC Place',                   'Vancouver'),
(11, 'B', 'Switzerland',         'Canada',                'SUI', 'CAN', '2026-06-24 21:00:00+00', 'BC Place',                   'Vancouver'),
(12, 'B', 'Bosnia & Herzegovina','Qatar',                 'BIH', 'QAT', '2026-06-24 21:00:00+00', 'Lumen Field',                'Seattle'),

-- GROUP C — Brazil · Morocco · Haiti · Scotland
(13, 'C', 'Brazil',              'Morocco',               'BRA', 'MAR', '2026-06-13 20:00:00+00', 'MetLife Stadium',            'East Rutherford'),
(14, 'C', 'Haiti',               'Scotland',              'HAI', 'SCO', '2026-06-13 23:00:00+00', 'Gillette Stadium',           'Foxborough'),
(15, 'C', 'Scotland',            'Morocco',               'SCO', 'MAR', '2026-06-19 17:00:00+00', 'Gillette Stadium',           'Foxborough'),
(16, 'C', 'Brazil',              'Haiti',                 'BRA', 'HAI', '2026-06-19 20:00:00+00', 'Lincoln Financial Field',    'Philadelphia'),
(17, 'C', 'Scotland',            'Brazil',                'SCO', 'BRA', '2026-06-24 00:00:00+00', 'Hard Rock Stadium',          'Miami'),
(18, 'C', 'Morocco',             'Haiti',                 'MAR', 'HAI', '2026-06-24 00:00:00+00', 'Mercedes-Benz Stadium',      'Atlanta'),

-- GROUP D — USA · Paraguay · Australia · Türkiye
(19, 'D', 'USA',                 'Paraguay',              'USA', 'PAR', '2026-06-12 23:00:00+00', 'SoFi Stadium',               'Inglewood'),
(20, 'D', 'Australia',           'Türkiye',               'AUS', 'TUR', '2026-06-13 02:00:00+00', 'BC Place',                   'Vancouver'),
(21, 'D', 'USA',                 'Australia',             'USA', 'AUS', '2026-06-19 23:00:00+00', 'Lumen Field',                'Seattle'),
(22, 'D', 'Türkiye',             'Paraguay',              'TUR', 'PAR', '2026-06-19 02:00:00+00', 'Levi''s Stadium',             'Santa Clara'),
(23, 'D', 'Türkiye',             'USA',                   'TUR', 'USA', '2026-06-25 18:00:00+00', 'SoFi Stadium',               'Inglewood'),
(24, 'D', 'Paraguay',            'Australia',             'PAR', 'AUS', '2026-06-25 18:00:00+00', 'Levi''s Stadium',             'Santa Clara'),

-- GROUP E — Germany · Curaçao · Ivory Coast · Ecuador
(25, 'E', 'Germany',             'Curaçao',               'GER', 'CUW', '2026-06-14 17:00:00+00', 'NRG Stadium',                'Houston'),
(26, 'E', 'Ivory Coast',         'Ecuador',               'CIV', 'ECU', '2026-06-14 20:00:00+00', 'Lincoln Financial Field',    'Philadelphia'),
(27, 'E', 'Germany',             'Ivory Coast',           'GER', 'CIV', '2026-06-20 17:00:00+00', 'BMO Field',                  'Toronto'),
(28, 'E', 'Ecuador',             'Curaçao',               'ECU', 'CUW', '2026-06-20 20:00:00+00', 'Arrowhead Stadium',          'Kansas City'),
(29, 'E', 'Curaçao',             'Ivory Coast',           'CUW', 'CIV', '2026-06-25 21:00:00+00', 'Lincoln Financial Field',    'Philadelphia'),
(30, 'E', 'Ecuador',             'Germany',               'ECU', 'GER', '2026-06-25 21:00:00+00', 'MetLife Stadium',            'East Rutherford'),

-- GROUP F — Netherlands · Japan · Sweden · Tunisia
(31, 'F', 'Netherlands',         'Japan',                 'NED', 'JPN', '2026-06-14 23:00:00+00', 'AT&T Stadium',               'Arlington'),
(32, 'F', 'Sweden',              'Tunisia',               'SWE', 'TUN', '2026-06-14 02:00:00+00', 'Estadio BBVA',               'Monterrey'),
(33, 'F', 'Netherlands',         'Sweden',                'NED', 'SWE', '2026-06-20 23:00:00+00', 'NRG Stadium',                'Houston'),
(34, 'F', 'Tunisia',             'Japan',                 'TUN', 'JPN', '2026-06-20 02:00:00+00', 'Estadio BBVA',               'Monterrey'),
(35, 'F', 'Japan',               'Sweden',                'JPN', 'SWE', '2026-06-25 00:00:00+00', 'AT&T Stadium',               'Arlington'),
(36, 'F', 'Tunisia',             'Netherlands',           'TUN', 'NED', '2026-06-25 00:00:00+00', 'Arrowhead Stadium',          'Kansas City'),

-- GROUP G — Belgium · Egypt · Iran · New Zealand
(37, 'G', 'Belgium',             'Egypt',                 'BEL', 'EGY', '2026-06-15 17:00:00+00', 'Lumen Field',                'Seattle'),
(38, 'G', 'Iran',                'New Zealand',           'IRN', 'NZL', '2026-06-15 20:00:00+00', 'SoFi Stadium',               'Inglewood'),
(39, 'G', 'Belgium',             'Iran',                  'BEL', 'IRN', '2026-06-21 17:00:00+00', 'SoFi Stadium',               'Inglewood'),
(40, 'G', 'New Zealand',         'Egypt',                 'NZL', 'EGY', '2026-06-21 20:00:00+00', 'BC Place',                   'Vancouver'),
(41, 'G', 'Egypt',               'Iran',                  'EGY', 'IRN', '2026-06-26 18:00:00+00', 'Lumen Field',                'Seattle'),
(42, 'G', 'New Zealand',         'Belgium',               'NZL', 'BEL', '2026-06-26 18:00:00+00', 'BC Place',                   'Vancouver'),

-- GROUP H — Spain · Cabo Verde · Saudi Arabia · Uruguay
(43, 'H', 'Spain',               'Cabo Verde',            'ESP', 'CPV', '2026-06-15 23:00:00+00', 'Mercedes-Benz Stadium',      'Atlanta'),
(44, 'H', 'Saudi Arabia',        'Uruguay',               'KSA', 'URU', '2026-06-15 02:00:00+00', 'Hard Rock Stadium',          'Miami'),
(45, 'H', 'Spain',               'Saudi Arabia',          'ESP', 'KSA', '2026-06-21 23:00:00+00', 'Mercedes-Benz Stadium',      'Atlanta'),
(46, 'H', 'Uruguay',             'Cabo Verde',            'URU', 'CPV', '2026-06-21 02:00:00+00', 'Hard Rock Stadium',          'Miami'),
(47, 'H', 'Cabo Verde',          'Saudi Arabia',          'CPV', 'KSA', '2026-06-26 21:00:00+00', 'NRG Stadium',                'Houston'),
(48, 'H', 'Uruguay',             'Spain',                 'URU', 'ESP', '2026-06-26 21:00:00+00', 'Estadio Akron',              'Guadalajara'),

-- GROUP I — France · Senegal · Iraq · Norway
(49, 'I', 'France',              'Senegal',               'FRA', 'SEN', '2026-06-16 17:00:00+00', 'MetLife Stadium',            'East Rutherford'),
(50, 'I', 'Iraq',                'Norway',                'IRQ', 'NOR', '2026-06-16 20:00:00+00', 'Gillette Stadium',           'Foxborough'),
(51, 'I', 'France',              'Iraq',                  'FRA', 'IRQ', '2026-06-22 17:00:00+00', 'Lincoln Financial Field',    'Philadelphia'),
(52, 'I', 'Norway',              'Senegal',               'NOR', 'SEN', '2026-06-22 20:00:00+00', 'MetLife Stadium',            'East Rutherford'),
(53, 'I', 'Norway',              'France',                'NOR', 'FRA', '2026-06-26 00:00:00+00', 'Gillette Stadium',           'Foxborough'),
(54, 'I', 'Senegal',             'Iraq',                  'SEN', 'IRQ', '2026-06-26 00:00:00+00', 'BMO Field',                  'Toronto'),

-- GROUP J — Argentina · Algeria · Austria · Jordan
(55, 'J', 'Argentina',           'Algeria',               'ARG', 'ALG', '2026-06-16 23:00:00+00', 'Arrowhead Stadium',          'Kansas City'),
(56, 'J', 'Austria',             'Jordan',                'AUT', 'JOR', '2026-06-17 17:00:00+00', 'Levi''s Stadium',             'Santa Clara'),
(57, 'J', 'Argentina',           'Austria',               'ARG', 'AUT', '2026-06-22 23:00:00+00', 'AT&T Stadium',               'Arlington'),
(58, 'J', 'Jordan',              'Algeria',               'JOR', 'ALG', '2026-06-22 02:00:00+00', 'Levi''s Stadium',             'Santa Clara'),
(59, 'J', 'Jordan',              'Argentina',             'JOR', 'ARG', '2026-06-27 18:00:00+00', 'AT&T Stadium',               'Arlington'),
(60, 'J', 'Algeria',             'Austria',               'ALG', 'AUT', '2026-06-27 18:00:00+00', 'Arrowhead Stadium',          'Kansas City'),

-- GROUP K — Portugal · DR Congo · Uzbekistan · Colombia
(61, 'K', 'Portugal',            'DR Congo',              'POR', 'COD', '2026-06-17 20:00:00+00', 'NRG Stadium',                'Houston'),
(62, 'K', 'Uzbekistan',          'Colombia',              'UZB', 'COL', '2026-06-17 23:00:00+00', 'Estadio Azteca',             'Mexico City'),
(63, 'K', 'Portugal',            'Uzbekistan',            'POR', 'UZB', '2026-06-23 17:00:00+00', 'NRG Stadium',                'Houston'),
(64, 'K', 'Colombia',            'DR Congo',              'COL', 'COD', '2026-06-23 20:00:00+00', 'Estadio Akron',              'Guadalajara'),
(65, 'K', 'Colombia',            'Portugal',              'COL', 'POR', '2026-06-27 21:00:00+00', 'Hard Rock Stadium',          'Miami'),
(66, 'K', 'DR Congo',            'Uzbekistan',            'COD', 'UZB', '2026-06-27 21:00:00+00', 'Mercedes-Benz Stadium',      'Atlanta'),

-- GROUP L — England · Croatia · Ghana · Panama
(67, 'L', 'England',             'Croatia',               'ENG', 'CRO', '2026-06-17 02:00:00+00', 'AT&T Stadium',               'Arlington'),
(68, 'L', 'Ghana',               'Panama',                'GHA', 'PAN', '2026-06-17 02:00:00+00', 'BMO Field',                  'Toronto'),
(69, 'L', 'England',             'Ghana',                 'ENG', 'GHA', '2026-06-23 23:00:00+00', 'Gillette Stadium',           'Foxborough'),
(70, 'L', 'Panama',              'Croatia',               'PAN', 'CRO', '2026-06-23 02:00:00+00', 'BMO Field',                  'Toronto'),
(71, 'L', 'Panama',              'England',               'PAN', 'ENG', '2026-06-27 00:00:00+00', 'MetLife Stadium',            'East Rutherford'),
(72, 'L', 'Croatia',             'Ghana',                 'CRO', 'GHA', '2026-06-27 00:00:00+00', 'Lincoln Financial Field',    'Philadelphia'),

-- ROUND OF 32 (Jun 28 – Jul 3)
(73,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-06-28 20:00:00+00', 'SoFi Stadium',               'Inglewood'),
(74,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-06-29 17:00:00+00', 'NRG Stadium',                'Houston'),
(75,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-06-29 20:00:00+00', 'Gillette Stadium',           'Foxborough'),
(76,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-06-29 23:00:00+00', 'Estadio BBVA',               'Monterrey'),
(77,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-06-30 17:00:00+00', 'AT&T Stadium',               'Arlington'),
(78,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-06-30 20:00:00+00', 'MetLife Stadium',            'East Rutherford'),
(79,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-06-30 23:00:00+00', 'Estadio Azteca',             'Mexico City'),
(80,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-01 17:00:00+00', 'Mercedes-Benz Stadium',     'Atlanta'),
(81,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-01 20:00:00+00', 'Lumen Field',               'Seattle'),
(82,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-01 23:00:00+00', 'Levi''s Stadium',            'Santa Clara'),
(83,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-02 17:00:00+00', 'SoFi Stadium',               'Inglewood'),
(84,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-02 20:00:00+00', 'BMO Field',                  'Toronto'),
(85,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-02 23:00:00+00', 'BC Place',                   'Vancouver'),
(86,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-03 17:00:00+00', 'AT&T Stadium',               'Arlington'),
(87,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-03 20:00:00+00', 'Hard Rock Stadium',          'Miami'),
(88,  'R32', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-03 23:00:00+00', 'Arrowhead Stadium',          'Kansas City'),

-- ROUND OF 16 (Jul 4 – 7)
(89,  'R16', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-04 20:00:00+00', 'NRG Stadium',                'Houston'),
(90,  'R16', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-04 23:00:00+00', 'Lincoln Financial Field',    'Philadelphia'),
(91,  'R16', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-05 20:00:00+00', 'MetLife Stadium',            'East Rutherford'),
(92,  'R16', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-05 23:00:00+00', 'Estadio Azteca',             'Mexico City'),
(93,  'R16', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-06 20:00:00+00', 'AT&T Stadium',               'Arlington'),
(94,  'R16', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-06 23:00:00+00', 'Lumen Field',                'Seattle'),
(95,  'R16', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-07 20:00:00+00', 'Mercedes-Benz Stadium',     'Atlanta'),
(96,  'R16', 'TBD', 'TBD', 'TBD', 'TBD', '2026-07-07 23:00:00+00', 'BC Place',                   'Vancouver'),

-- QUARTERFINALS (Jul 9 – 11)
(97,  'QF',  'TBD', 'TBD', 'TBD', 'TBD', '2026-07-09 20:00:00+00', 'Gillette Stadium',           'Foxborough'),
(98,  'QF',  'TBD', 'TBD', 'TBD', 'TBD', '2026-07-10 20:00:00+00', 'SoFi Stadium',               'Inglewood'),
(99,  'QF',  'TBD', 'TBD', 'TBD', 'TBD', '2026-07-11 19:00:00+00', 'Hard Rock Stadium',          'Miami'),
(100, 'QF',  'TBD', 'TBD', 'TBD', 'TBD', '2026-07-11 23:00:00+00', 'Arrowhead Stadium',          'Kansas City'),

-- SEMIFINALS (Jul 14 – 15)
(101, 'SF',  'TBD', 'TBD', 'TBD', 'TBD', '2026-07-14 20:00:00+00', 'AT&T Stadium',               'Arlington'),
(102, 'SF',  'TBD', 'TBD', 'TBD', 'TBD', '2026-07-15 20:00:00+00', 'Mercedes-Benz Stadium',     'Atlanta'),

-- THIRD PLACE & FINAL (Jul 18 – 19)
(103, '3P',  'TBD', 'TBD', 'TBD', 'TBD', '2026-07-18 20:00:00+00', 'Hard Rock Stadium',          'Miami'),
(104, 'F',   'TBD', 'TBD', 'TBD', 'TBD', '2026-07-19 20:00:00+00', 'MetLife Stadium',            'East Rutherford')

ON CONFLICT (match_number) DO UPDATE SET
  group_name      = EXCLUDED.group_name,
  home_team       = EXCLUDED.home_team,
  away_team       = EXCLUDED.away_team,
  home_team_code  = EXCLUDED.home_team_code,
  away_team_code  = EXCLUDED.away_team_code,
  match_date      = EXCLUDED.match_date,
  venue           = EXCLUDED.venue,
  city            = EXCLUDED.city,
  updated_at      = NOW();
