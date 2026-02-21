import { SupabaseClient, createClient } from '@supabase/supabase-js';

interface DummyReservation {
  booking_source: string;
  guest_name: string;
  guest_name_kana: string;
  phone: string;
  email: string;
  party_size: number;
  room_number: string;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
  plan_name: string;
  meal_plan: string;
  status: string;
}

async function createDummyReservations() {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const restaurantId = process.env.RESTAURANT_ID;

  if (!supabaseUrl || !supabaseServiceKey || !restaurantId) {
    throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESTAURANT_ID');
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper function to format date as ISO string (YYYY-MM-DD)
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Helper function to add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Create 10 dummy reservations
  const reservations: DummyReservation[] = [
    // 1 night reservations (6 guests)
    {
      booking_source: 'rakuten',
      guest_name: '田中 太郎',
      guest_name_kana: 'タナカ タロウ',
      phone: '090-1234-5678',
      email: 'tanaka@example.com',
      party_size: 2,
      room_number: '101',
      room_name: '桜',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 1)),
      plan_name: '和牛懐石プラン',
      meal_plan: '2meals',
      status: 'confirmed',
    },
    {
      booking_source: 'jalan',
      guest_name: '佐藤 花子',
      guest_name_kana: 'サトウ ハナコ',
      phone: '080-9876-5432',
      email: 'sato@example.com',
      party_size: 4,
      room_number: '102',
      room_name: '紅葉',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 1)),
      plan_name: '記念日スペシャル',
      meal_plan: '2meals',
      status: 'confirmed',
    },
    {
      booking_source: 'booking_com',
      guest_name: '鈴木 一郎',
      guest_name_kana: 'スズキ イチロウ',
      phone: '070-5555-1111',
      email: 'suzuki@example.com',
      party_size: 3,
      room_number: '201',
      room_name: '松',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 1)),
      plan_name: 'ファミリープラン',
      meal_plan: '2meals',
      status: 'confirmed',
    },
    {
      booking_source: 'direct',
      guest_name: '高橋 美咲',
      guest_name_kana: 'タカハシ ミサキ',
      phone: '090-7777-8888',
      email: 'takahashi@example.com',
      party_size: 2,
      room_number: '202',
      room_name: '竹',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 1)),
      plan_name: 'カップルプラン',
      meal_plan: '2meals',
      status: 'confirmed',
    },
    {
      booking_source: 'expedia',
      guest_name: '伊藤 健太',
      guest_name_kana: 'イトウ ケンタ',
      phone: '080-3333-4444',
      email: 'ito@example.com',
      party_size: 1,
      room_number: '301',
      room_name: '梅',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 1)),
      plan_name: 'ビジネスプラン',
      meal_plan: 'breakfast_only',
      status: 'confirmed',
    },
    {
      booking_source: 'agoda',
      guest_name: '渡辺 由美',
      guest_name_kana: 'ワタナベ ユミ',
      phone: '070-6666-7777',
      email: 'watanabe@example.com',
      party_size: 2,
      room_number: '302',
      room_name: '椿',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 1)),
      plan_name: 'リラックスプラン',
      meal_plan: '2meals',
      status: 'confirmed',
    },

    // 2 night reservations (3 guests)
    {
      booking_source: 'rakuten',
      guest_name: '山本 健一',
      guest_name_kana: 'ヤマモト ケンイチ',
      phone: '090-2222-3333',
      email: 'yamamoto@example.com',
      party_size: 3,
      room_number: '103',
      room_name: '桔梗',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 2)),
      plan_name: '温泉満喫プラン',
      meal_plan: '2meals',
      status: 'confirmed',
    },
    {
      booking_source: 'jalan',
      guest_name: '中村 愛',
      guest_name_kana: 'ナカムラ アイ',
      phone: '080-4444-5555',
      email: 'nakamura@example.com',
      party_size: 2,
      room_number: '203',
      room_name: '藤',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 2)),
      plan_name: 'アニバーサリープラン',
      meal_plan: '2meals',
      status: 'confirmed',
    },
    {
      booking_source: 'direct',
      guest_name: '小林 拓也',
      guest_name_kana: 'コバヤシ タクヤ',
      phone: '090-8888-9999',
      email: 'kobayashi@example.com',
      party_size: 4,
      room_number: '303',
      room_name: '蓮',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 2)),
      plan_name: 'グループプラン',
      meal_plan: '2meals',
      status: 'confirmed',
    },

    // 3 night reservation (1 guest)
    {
      booking_source: 'booking_com',
      guest_name: '加藤 雅人',
      guest_name_kana: 'カトウ マサト',
      phone: '070-1111-2222',
      email: 'kato@example.com',
      party_size: 2,
      room_number: '104',
      room_name: '菊',
      check_in_date: formatDate(today),
      check_out_date: formatDate(addDays(today, 3)),
      plan_name: 'ロングステイプラン',
      meal_plan: '2meals',
      status: 'confirmed',
    },
  ];

  console.log('Creating 10 dummy reservations...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const reservation of reservations) {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert({
          restaurant_id: restaurantId,
          ...reservation,
          allergen_ids: [], // Empty array as per requirements
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating reservation for ${reservation.guest_name}:`, error.message);
        errorCount++;
      } else {
        const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
        console.log(`✅ Created: ${reservation.guest_name} (${reservation.room_number}) - ${nights}泊`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception creating reservation for ${reservation.guest_name}:`, err);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} failed`);
  console.log('\nBreakdown:');
  console.log('- 1 night: 6 reservations');
  console.log('- 2 nights: 3 reservations');
  console.log('- 3 nights: 1 reservation');
}

function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// Run the script
createDummyReservations()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
