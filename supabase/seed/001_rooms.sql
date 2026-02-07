-- Seed: Rooms for 湖南荘 ryokan
-- Restaurant ID: 4a4e4447-3ddc-4790-b2f9-b892722503b3

INSERT INTO public.rooms (restaurant_id, room_number, room_name, room_type, capacity, floor, status, amenities) VALUES
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '101', '桜の間', 'standard', 2, 1, 'available', ARRAY['和室10畳', '檜風呂']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '102', '梅の間', 'standard', 3, 1, 'available', ARRAY['和室12畳', '檜風呂']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '201', '竹の間', 'standard', 2, 2, 'available', ARRAY['和室10畳', '檜風呂']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '202', '菊の間', 'deluxe', 4, 2, 'available', ARRAY['和室15畳', '露天風呂', 'マッサージチェア']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '301', '松の間', 'deluxe', 2, 3, 'available', ARRAY['和室12畳', '露天風呂']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '302', '藤の間', 'suite', 4, 3, 'available', ARRAY['和室20畳', '露天風呂', 'リビング', 'マッサージチェア']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '303', '蘭の間', 'suite', 6, 3, 'available', ARRAY['和室25畳', '露天風呂', 'リビング', 'ダイニング']),
  ('4a4e4447-3ddc-4790-b2f9-b892722503b3', '401', '椿の間', 'accessible', 2, 4, 'available', ARRAY['バリアフリー', '和洋室', '檜風呂'])
ON CONFLICT (restaurant_id, room_number) DO UPDATE SET
  room_name = EXCLUDED.room_name,
  room_type = EXCLUDED.room_type,
  capacity = EXCLUDED.capacity,
  floor = EXCLUDED.floor,
  amenities = EXCLUDED.amenities;
