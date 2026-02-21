-- Change kids_group_id from text to text[] to support multiple kids groups
ALTER TABLE menu_groups 
DROP COLUMN kids_group_id;

ALTER TABLE menu_groups 
ADD COLUMN kids_group_ids text[] DEFAULT '{}';

COMMENT ON COLUMN menu_groups.kids_group_ids IS 'Array of linked kids menu group IDs';
