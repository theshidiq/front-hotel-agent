-- Add stay_period_nights field to menu_groups table
-- This field stores the number of nights this menu group is designed for
-- Examples: 1 = one night stay (新規), 2+ = multiple nights (滞在)

ALTER TABLE menu_groups
ADD COLUMN IF NOT EXISTS stay_period_nights integer[] DEFAULT NULL;

COMMENT ON COLUMN menu_groups.stay_period_nights IS 'Array of night counts this menu group applies to. Examples: [1] for 新規 (one night), [2,3,4] for 滞在 (2-4 nights). NULL means no specific stay period restriction (like おまかせ).';

-- Example updates (optional, comment out if you want to set manually):
-- UPDATE menu_groups SET stay_period_nights = ARRAY[1] WHERE name = '新規';
-- UPDATE menu_groups SET stay_period_nights = ARRAY[2,3,4,5,6,7] WHERE name = '滞在';
-- おまかせ stays NULL (applies to any duration)
