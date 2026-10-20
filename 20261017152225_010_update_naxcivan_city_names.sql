/*
# Naxçıvan MR şəhər adlarının qısaldılması

## Purpose
Update city display names to short forms (Naxçıvan, Babək, Culfa, etc.)
as specified in the requirements. The old "Naxçıvan" entry (slug: naxcivan)
is repurposed as the Naxçıvan city entry by moving it to the Naxçıvan MR group
(sort_order 101). The duplicate "Naxçıvan şəhəri" entry is removed since
the old "Naxçıvan" now serves that role.

## Changes
1. Update old "Naxçıvan" (slug: naxcivan) sort_order to 101 — it becomes the
   primary Naxçıvan city entry.
2. Delete the duplicate "Naxçıvan şəhəri" (slug: naxcivan-seheri) — it was
   just created in migration 009 and has no vacancies referencing it.
3. Update remaining 7 region names to short forms (remove "rayonu" suffix).
4. Adjust sort_order to be sequential (101-108).

## Safety
- The deleted row (naxcivan-seheri) was created in migration 009 and has
  zero vacancy references — verified before deletion.
- The old "Naxçıvan" (slug: naxcivan) keeps its UUID, so any existing
  vacancies referencing it remain valid.
- No existing vacancy data is lost.
*/

-- Step 1: Delete the duplicate "Naxçıvan şəhəri" (created in migration 009, no references)
DELETE FROM cities WHERE slug = 'naxcivan-seheri' AND NOT EXISTS (
  SELECT 1 FROM vacancies WHERE vacancies.city_id = cities.id
);

-- Step 2: Update old "Naxçıvan" to sort_order 101
UPDATE cities SET sort_order = 101 WHERE slug = 'naxcivan';

-- Step 3: Update remaining 7 region names to short forms
UPDATE cities SET name_az = 'Babək', sort_order = 102 WHERE slug = 'babek-rayonu';
UPDATE cities SET name_az = 'Culfa', sort_order = 103 WHERE slug = 'culfa-rayonu';
UPDATE cities SET name_az = 'Ordubad', sort_order = 104 WHERE slug = 'ordubad-rayonu';
UPDATE cities SET name_az = 'Sədərək', sort_order = 105 WHERE slug = 'sederek-rayonu';
UPDATE cities SET name_az = 'Şahbuz', sort_order = 106 WHERE slug = 'sahbuz-rayonu';
UPDATE cities SET name_az = 'Şərur', sort_order = 107 WHERE slug = 'serur-rayonu';
UPDATE cities SET name_az = 'Kəngərli', sort_order = 108 WHERE slug = 'kengerli-rayonu';
