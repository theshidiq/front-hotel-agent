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

  // Configuration
  const DAYS_TO_GENERATE = 7;
  // Decreasing reservation count per day: [20, 15, 12, 10, 8, 6, 4]
  const RESERVATIONS_BY_DAY = [20, 15, 12, 10, 8, 6, 4];

  // Get today's date - force to current local date
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Helper function to format date as ISO string (YYYY-MM-DD)
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Data pools
  const guestNames = [
    { name: '田中 太郎', kana: 'タナカ タロウ' },
    { name: '佐藤 花子', kana: 'サトウ ハナコ' },
    { name: '鈴木 一郎', kana: 'スズキ イチロウ' },
    { name: '高橋 美咲', kana: 'タカハシ ミサキ' },
    { name: '伊藤 健太', kana: 'イトウ ケンタ' },
    { name: '渡辺 由美', kana: 'ワタナベ ユミ' },
    { name: '山本 健一', kana: 'ヤマモト ケンイチ' },
    { name: '中村 愛', kana: 'ナカムラ アイ' },
    { name: '小林 拓也', kana: 'コバヤシ タクヤ' },
    { name: '加藤 雅人', kana: 'カトウ マサト' },
    { name: '吉田 真理', kana: 'ヨシダ マリ' },
    { name: '山田 大輔', kana: 'ヤマダ ダイスケ' },
    { name: '佐々木 恵', kana: 'ササキ メグミ' },
    { name: '松本 拓海', kana: 'マツモト タクミ' },
    { name: '井上 直樹', kana: 'イノウエ ナオキ' },
  ];

  const rooms = [
    { number: '101', name: '桜' },
    { number: '102', name: '紅葉' },
    { number: '103', name: '桔梗' },
    { number: '104', name: '菊' },
    { number: '201', name: '松' },
    { number: '202', name: '竹' },
    { number: '203', name: '藤' },
    { number: '301', name: '梅' },
    { number: '302', name: '椿' },
    { number: '303', name: '蓮' },
  ];

  const bookingSources = ['rakuten', 'jalan', 'booking_com', 'direct', 'expedia', 'agoda', 'phone'];

  const plans = [
    '和牛懐石プラン',
    '記念日スペシャル',
    'ファミリープラン',
    'カップルプラン',
    'ビジネスプラン',
    'リラックスプラン',
    '温泉満喫プラン',
    'アニバーサリープラン',
    'グループプラン',
    'ロングステイプラン',
    'シニアプラン',
    'レディースプラン',
  ];

  const mealPlans = ['2meals', 'dinner_only', 'breakfast_only', 'room_only'];

  // Random helper
  const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

  // Generate random phone number
  const randomPhone = (): string => {
    const prefixes = ['090', '080', '070'];
    const prefix = random(prefixes);
    const part1 = String(randomInt(1000, 9999));
    const part2 = String(randomInt(1000, 9999));
    return `${prefix}-${part1}-${part2}`;
  };

  // Generate random stay duration distribution for a day
  // More realistic: weighted towards 1-2 nights
  const generateStayDistribution = (reservationCount: number): number[] => {
    const distribution: number[] = [];

    // Randomly decide distribution with realistic weights
    // 1 night: 40-70%
    // 2 nights: 20-40%
    // 3+ nights: 10-30%

    const oneNightPercent = randomInt(40, 70) / 100;
    const twoNightPercent = randomInt(20, 40) / 100;

    const oneNightCount = Math.floor(reservationCount * oneNightPercent);
    const twoNightCount = Math.floor(reservationCount * twoNightPercent);
    const threeNightCount = reservationCount - oneNightCount - twoNightCount;

    for (let i = 0; i < oneNightCount; i++) distribution.push(1);
    for (let i = 0; i < twoNightCount; i++) distribution.push(2);
    for (let i = 0; i < threeNightCount; i++) distribution.push(randomInt(3, 5)); // 3-5 nights

    // Shuffle array
    return distribution.sort(() => Math.random() - 0.5);
  };

  const totalReservations = RESERVATIONS_BY_DAY.reduce((sum, count) => sum + count, 0);
  console.log(`Creating ${totalReservations} dummy reservations across ${DAYS_TO_GENERATE} days...\n`);

  const allReservations: DummyReservation[] = [];
  let guestIndex = 0;

  // Generate reservations for each day
  for (let dayOffset = 0; dayOffset < DAYS_TO_GENERATE; dayOffset++) {
    const checkInDate = addDays(today, dayOffset);
    const reservationCount = RESERVATIONS_BY_DAY[dayOffset];
    const stayDistribution = generateStayDistribution(reservationCount);

    console.log(`📅 Day ${dayOffset + 1} (${formatDate(checkInDate)}): ${reservationCount} reservations - ${stayDistribution.filter(n => n === 1).length}×1泊, ${stayDistribution.filter(n => n === 2).length}×2泊, ${stayDistribution.filter(n => n >= 3).length}×3+泊`);

    for (let i = 0; i < reservationCount; i++) {
      const guest = guestNames[guestIndex % guestNames.length];
      const room = rooms[i % rooms.length];
      const stayNights = stayDistribution[i];

      // Suffix to ensure unique guest names
      const dayNum = dayOffset + 1;
      const guestNum = (guestIndex % guestNames.length) + 1;
      const uniqueSuffix = dayOffset > 0 || guestIndex >= guestNames.length ? `${guestNum}` : '';

      allReservations.push({
        booking_source: random(bookingSources),
        guest_name: `${guest.name}${uniqueSuffix}`,
        guest_name_kana: `${guest.kana}${uniqueSuffix}`,
        phone: randomPhone(),
        email: `guest${guestIndex + 1}@example.com`,
        party_size: randomInt(1, 4),
        room_number: room.number,
        room_name: room.name,
        check_in_date: formatDate(checkInDate),
        check_out_date: formatDate(addDays(checkInDate, stayNights)),
        plan_name: random(plans),
        meal_plan: random(mealPlans),
        status: 'confirmed',
      });

      guestIndex++;
    }
  }

  console.log('\n💾 Inserting reservations into database...\n');

  let successCount = 0;
  let errorCount = 0;
  const nightsCount: Record<number, number> = {};

  for (const reservation of allReservations) {
    try {
      const { error } = await supabase
        .from('reservations')
        .insert({
          restaurant_id: restaurantId,
          ...reservation,
          allergen_ids: [],
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error: ${reservation.guest_name}:`, error.message);
        errorCount++;
      } else {
        const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
        nightsCount[nights] = (nightsCount[nights] || 0) + 1;
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception: ${reservation.guest_name}:`, err);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} failed\n`);
  console.log('Breakdown by stay duration:');
  Object.keys(nightsCount)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(nights => {
      console.log(`  ${nights} night${parseInt(nights) > 1 ? 's' : ''}: ${nightsCount[parseInt(nights)]} reservations`);
    });
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
