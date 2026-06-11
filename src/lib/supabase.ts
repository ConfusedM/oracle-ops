import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { realtime: { params: { eventsPerSecond: 20 } } },
)

export const T_STATE = 'oo_state'
export const T_EVENTS = 'oo_events'
export const BUCKET_AUDIO = 'oo-audio'
export const BUCKET_MEDIA = 'oo-media'
