import { SupabaseClient, createClient } from '@supabase/supabase-js';

async function cleanupTestData() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const organizationId = process.env.ORGANIZATION_ID;

  if (!supabaseUrl || !supabaseServiceKey || !organizationId) {
    throw new Error('Missing required environment variables');
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🗑️  Deleting all test reservations for restaurant...\n');

  // First, clear any current_reservation_id references in rooms table
  const { error: roomsError } = await supabase
    .from('rooms')
    .update({ current_reservation_id: null })
    .eq('organization_id', organizationId)
    .not('current_reservation_id', 'is', null);

  if (roomsError) {
    console.error('❌ Error clearing room references:', roomsError.message);
    process.exit(1);
  }

  // Now delete all reservations
  const { data, error } = await supabase
    .from('reservations')
    .delete()
    .eq('organization_id', organizationId)
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Deleted ${data?.length || 0} reservations`);
  console.log('✨ Database cleaned!\n');
}

cleanupTestData().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
