import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '/Users/juandresbo/_Developer/vita_felix/.env' })

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''
const db = createClient(supabaseUrl, supabaseKey)

async function test() {
  const eventId = 'bfcffba0-7b20-44db-a2a3-f794294d42af'

  const { data: ev, error: eErr } = await db.from('events')
    .select('id, name, status')
    .eq('id', eventId)
    
  console.log('Events:', ev)
}

test()
