import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function listFiles() {
  console.log('Listing files in "assets" bucket...')
  const { data, error } = await supabase.storage.from('assets').list('', { limit: 100 })
  
  if (error) {
    console.error('Error listing files:', error.message)
    return
  }
  
  console.log(`Found ${data.length} items in root:`)
  data.forEach(item => {
    console.log(`- ${item.name} (${item.id ? 'File' : 'Folder'})`)
  })
}

listFiles()
