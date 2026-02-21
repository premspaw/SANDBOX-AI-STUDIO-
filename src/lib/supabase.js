import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client = null;

try {
    if (supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
        client = createClient(supabaseUrl, supabaseAnonKey)
    } else {
        console.warn('Supabase credentials missing or invalid. Check your .env file.')
    }
} catch (error) {
    console.error('Supabase initialization failed:', error)
}

export const supabase = client
