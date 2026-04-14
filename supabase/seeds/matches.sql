-- ============================================================
-- FIFA World Cup 2026 - 72 Group Stage Matches
-- Venues: USA, Canada, Mexico
-- Tournament Start: June 11, 2026
-- ============================================================

INSERT INTO matches (match_number, group_name, home_team, away_team, home_team_code, away_team_code, match_date, venue, city) VALUES

-- ============================================================
-- GROUP A
-- ============================================================
(1,  'A', 'United States',  'Mexico',       'USA', 'MEX', '2026-06-11 20:00:00+00', 'MetLife Stadium',         'New York/New Jersey'),
(2,  'A', 'Canada',         'Uruguay',      'CAN', 'URU', '2026-06-12 00:00:00+00', 'BMO Field',               'Toronto'),
(3,  'A', 'United States',  'Canada',       'USA', 'CAN', '2026-06-16 00:00:00+00', 'SoFi Stadium',            'Los Angeles'),
(4,  'A', 'Uruguay',        'Mexico',       'URU', 'MEX', '2026-06-16 23:00:00+00', 'Arrowhead Stadium',       'Kansas City'),
(5,  'A', 'Mexico',         'Canada',       'MEX', 'CAN', '2026-06-22 00:00:00+00', 'Estadio Azteca',          'Mexico City'),
(6,  'A', 'Uruguay',        'United States','URU', 'USA', '2026-06-22 00:00:00+00', 'Hard Rock Stadium',       'Miami'),

-- ============================================================
-- GROUP B
-- ============================================================
(7,  'B', 'Spain',          'Brazil',       'ESP', 'BRA', '2026-06-12 23:00:00+00', 'AT&T Stadium',            'Dallas'),
(8,  'B', 'Portugal',       'Morocco',      'POR', 'MAR', '2026-06-13 02:00:00+00', 'Levi\'s Stadium',         'San Francisco'),
(9,  'B', 'Spain',          'Morocco',      'ESP', 'MAR', '2026-06-17 20:00:00+00', 'Rose Bowl',               'Los Angeles'),
(10, 'B', 'Brazil',         'Portugal',     'BRA', 'POR', '2026-06-17 23:00:00+00', 'MetLife Stadium',         'New York/New Jersey'),
(11, 'B', 'Morocco',        'Brazil',       'MAR', 'BRA', '2026-06-23 00:00:00+00', 'Lincoln Financial Field', 'Philadelphia'),
(12, 'B', 'Portugal',       'Spain',        'POR', 'ESP', '2026-06-23 00:00:00+00', 'Hard Rock Stadium',       'Miami'),

-- ============================================================
-- GROUP C
-- ============================================================
(13, 'C', 'Argentina',      'Nigeria',      'ARG', 'NGA', '2026-06-13 20:00:00+00', 'MetLife Stadium',         'New York/New Jersey'),
(14, 'C', 'Poland',         'Saudi Arabia', 'POL', 'KSA', '2026-06-13 23:00:00+00', 'SoFi Stadium',            'Los Angeles'),
(15, 'C', 'Argentina',      'Poland',       'ARG', 'POL', '2026-06-18 20:00:00+00', 'AT&T Stadium',            'Dallas'),
(16, 'C', 'Saudi Arabia',   'Nigeria',      'KSA', 'NGA', '2026-06-18 23:00:00+00', 'Levi\'s Stadium',         'San Francisco'),
(17, 'C', 'Nigeria',        'Poland',       'NGA', 'POL', '2026-06-24 00:00:00+00', 'BMO Field',               'Toronto'),
(18, 'C', 'Saudi Arabia',   'Argentina',    'KSA', 'ARG', '2026-06-24 00:00:00+00', 'Rose Bowl',               'Los Angeles'),

-- ============================================================
-- GROUP D
-- ============================================================
(19, 'D', 'France',         'Belgium',      'FRA', 'BEL', '2026-06-14 20:00:00+00', 'AT&T Stadium',            'Dallas'),
(20, 'D', 'Australia',      'South Korea',  'AUS', 'KOR', '2026-06-14 23:00:00+00', 'SoFi Stadium',            'Los Angeles'),
(21, 'D', 'France',         'Australia',    'FRA', 'AUS', '2026-06-19 20:00:00+00', 'Hard Rock Stadium',       'Miami'),
(22, 'D', 'South Korea',    'Belgium',      'KOR', 'BEL', '2026-06-19 23:00:00+00', 'Estadio Azteca',          'Mexico City'),
(23, 'D', 'Belgium',        'Australia',    'BEL', 'AUS', '2026-06-25 00:00:00+00', 'MetLife Stadium',         'New York/New Jersey'),
(24, 'D', 'South Korea',    'France',       'KOR', 'FRA', '2026-06-25 00:00:00+00', 'Levi\'s Stadium',         'San Francisco'),

-- ============================================================
-- GROUP E
-- ============================================================
(25, 'E', 'Germany',        'Japan',        'GER', 'JPN', '2026-06-14 02:00:00+00', 'Lincoln Financial Field', 'Philadelphia'),
(26, 'E', 'Netherlands',    'Senegal',      'NED', 'SEN', '2026-06-15 20:00:00+00', 'Rose Bowl',               'Los Angeles'),
(27, 'E', 'Germany',        'Netherlands',  'GER', 'NED', '2026-06-20 20:00:00+00', 'Arrowhead Stadium',       'Kansas City'),
(28, 'E', 'Senegal',        'Japan',        'SEN', 'JPN', '2026-06-20 23:00:00+00', 'BMO Field',               'Toronto'),
(29, 'E', 'Japan',          'Netherlands',  'JPN', 'NED', '2026-06-25 20:00:00+00', 'AT&T Stadium',            'Dallas'),
(30, 'E', 'Senegal',        'Germany',      'SEN', 'GER', '2026-06-25 20:00:00+00', 'Hard Rock Stadium',       'Miami'),

-- ============================================================
-- GROUP F
-- ============================================================
(31, 'F', 'England',        'Iran',         'ENG', 'IRN', '2026-06-15 02:00:00+00', 'SoFi Stadium',            'Los Angeles'),
(32, 'F', 'Ecuador',        'Colombia',     'ECU', 'COL', '2026-06-15 23:00:00+00', 'MetLife Stadium',         'New York/New Jersey'),
(33, 'F', 'England',        'Ecuador',      'ENG', 'ECU', '2026-06-20 02:00:00+00', 'Rose Bowl',               'Los Angeles'),
(34, 'F', 'Colombia',       'Iran',         'COL', 'IRN', '2026-06-21 20:00:00+00', 'AT&T Stadium',            'Dallas'),
(35, 'F', 'Iran',           'Ecuador',      'IRN', 'ECU', '2026-06-26 00:00:00+00', 'Estadio AKRON',           'Guadalajara'),
(36, 'F', 'Colombia',       'England',      'COL', 'ENG', '2026-06-26 00:00:00+00', 'Lincoln Financial Field', 'Philadelphia'),

-- ============================================================
-- GROUP G
-- ============================================================
(37, 'G', 'Italy',          'Peru',         'ITA', 'PER', '2026-06-16 20:00:00+00', 'Levi\'s Stadium',         'San Francisco'),
(38, 'G', 'Croatia',        'Ivory Coast',  'CRO', 'CIV', '2026-06-16 02:00:00+00', 'Arrowhead Stadium',       'Kansas City'),
(39, 'G', 'Italy',          'Croatia',      'ITA', 'CRO', '2026-06-21 23:00:00+00', 'BMO Field',               'Toronto'),
(40, 'G', 'Ivory Coast',    'Peru',         'CIV', 'PER', '2026-06-22 02:00:00+00', 'Rose Bowl',               'Los Angeles'),
(41, 'G', 'Peru',           'Croatia',      'PER', 'CRO', '2026-06-27 00:00:00+00', 'SoFi Stadium',            'Los Angeles'),
(42, 'G', 'Ivory Coast',    'Italy',        'CIV', 'ITA', '2026-06-27 00:00:00+00', 'Estadio BBVA',            'Monterrey'),

-- ============================================================
-- GROUP H
-- ============================================================
(43, 'H', 'Netherlands',    'Denmark',      'NED', 'DEN', '2026-06-17 02:00:00+00', 'Hard Rock Stadium',       'Miami'),
(44, 'H', 'Serbia',         'Switzerland',  'SRB', 'SUI', '2026-06-17 20:00:00+00', 'AT&T Stadium',            'Dallas'),
(45, 'H', 'Netherlands',    'Serbia',       'NED', 'SRB', '2026-06-22 20:00:00+00', 'MetLife Stadium',         'New York/New Jersey'),
(46, 'H', 'Switzerland',    'Denmark',      'SUI', 'DEN', '2026-06-22 23:00:00+00', 'Levi\'s Stadium',         'San Francisco'),
(47, 'H', 'Denmark',        'Serbia',       'DEN', 'SRB', '2026-06-28 00:00:00+00', 'Lincoln Financial Field', 'Philadelphia'),
(48, 'H', 'Switzerland',    'Netherlands',  'SUI', 'NED', '2026-06-28 00:00:00+00', 'SoFi Stadium',            'Los Angeles'),

-- ============================================================
-- GROUP I
-- ============================================================
(49, 'I', 'Mexico',         'Cameroon',     'MEX', 'CMR', '2026-06-18 02:00:00+00', 'Estadio AKRON',           'Guadalajara'),
(50, 'I', 'Chile',          'Ghana',        'CHI', 'GHA', '2026-06-18 20:00:00+00', 'BMO Field',               'Toronto'),
(51, 'I', 'Mexico',         'Chile',        'MEX', 'CHI', '2026-06-23 20:00:00+00', 'Estadio BBVA',            'Monterrey'),
(52, 'I', 'Ghana',          'Cameroon',     'GHA', 'CMR', '2026-06-23 23:00:00+00', 'Arrowhead Stadium',       'Kansas City'),
(53, 'I', 'Cameroon',       'Chile',        'CMR', 'CHI', '2026-06-29 00:00:00+00', 'AT&T Stadium',            'Dallas'),
(54, 'I', 'Ghana',          'Mexico',       'GHA', 'MEX', '2026-06-29 00:00:00+00', 'Rose Bowl',               'Los Angeles'),

-- ============================================================
-- GROUP J
-- ============================================================
(55, 'J', 'Portugal',       'Algeria',      'POR', 'ALG', '2026-06-19 02:00:00+00', 'Estadio Azteca',          'Mexico City'),
(56, 'J', 'Turkey',         'Egypt',        'TUR', 'EGY', '2026-06-19 20:00:00+00', 'MetLife Stadium',         'New York/New Jersey'),
(57, 'J', 'Portugal',       'Turkey',       'POR', 'TUR', '2026-06-24 20:00:00+00', 'Hard Rock Stadium',       'Miami'),
(58, 'J', 'Egypt',          'Algeria',      'EGY', 'ALG', '2026-06-24 23:00:00+00', 'SoFi Stadium',            'Los Angeles'),
(59, 'J', 'Algeria',        'Turkey',       'ALG', 'TUR', '2026-06-30 00:00:00+00', 'Levi\'s Stadium',         'San Francisco'),
(60, 'J', 'Egypt',          'Portugal',     'EGY', 'POR', '2026-06-30 00:00:00+00', 'BMO Field',               'Toronto'),

-- ============================================================
-- GROUP K
-- ============================================================
(61, 'K', 'Brazil',         'Venezuela',    'BRA', 'VEN', '2026-06-21 02:00:00+00', 'Arrowhead Stadium',       'Kansas City'),
(62, 'K', 'Paraguay',       'South Africa', 'PAR', 'RSA', '2026-06-21 20:00:00+00', 'Lincoln Financial Field', 'Philadelphia'),
(63, 'K', 'Brazil',         'Paraguay',     'BRA', 'PAR', '2026-06-26 20:00:00+00', 'Estadio AKRON',           'Guadalajara'),
(64, 'K', 'South Africa',   'Venezuela',    'RSA', 'VEN', '2026-06-26 23:00:00+00', 'AT&T Stadium',            'Dallas'),
(65, 'K', 'Venezuela',      'Paraguay',     'VEN', 'PAR', '2026-07-01 00:00:00+00', 'MetLife Stadium',         'New York/New Jersey'),
(66, 'K', 'South Africa',   'Brazil',       'RSA', 'BRA', '2026-07-01 00:00:00+00', 'Hard Rock Stadium',       'Miami'),

-- ============================================================
-- GROUP L
-- ============================================================
(67, 'L', 'Argentina',      'New Zealand',  'ARG', 'NZL', '2026-06-22 02:00:00+00', 'Estadio BBVA',            'Monterrey'),
(68, 'L', 'Ukraine',        'DR Congo',     'UKR', 'COD', '2026-06-23 02:00:00+00', 'SoFi Stadium',            'Los Angeles'),
(69, 'L', 'Argentina',      'Ukraine',      'ARG', 'UKR', '2026-06-27 20:00:00+00', 'Levi\'s Stadium',         'San Francisco'),
(70, 'L', 'DR Congo',       'New Zealand',  'COD', 'NZL', '2026-06-27 23:00:00+00', 'Estadio Azteca',          'Mexico City'),
(71, 'L', 'New Zealand',    'Ukraine',      'NZL', 'UKR', '2026-07-02 00:00:00+00', 'BMO Field',               'Toronto'),
(72, 'L', 'DR Congo',       'Argentina',    'COD', 'ARG', '2026-07-02 00:00:00+00', 'Arrowhead Stadium',       'Kansas City');
