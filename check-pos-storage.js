require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

async function checkPosStorage() {
  try {
    console.log('🔍 Checking Supabase storage for POS Indonesia files...')
    
    // List all files in courier-logos bucket
    const { data: files, error } = await supabase.storage
      .from('courier-logos')
      .list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })
    
    if (error) {
      console.error('❌ Error listing files:', error)
      return
    }
    
    console.log('\n📁 All files in courier-logos bucket:')
    files.forEach(file => {
      console.log(`  - ${file.name} (${file.metadata?.size || 'unknown size'})`)
    })
    
    // Look for POS Indonesia related files
    const posFiles = files.filter(file => 
      file.name.includes('c18041f2-705c-4d03-8345-25c9675b2e7e') ||
      file.name.toLowerCase().includes('pos')
    )
    
    console.log('\n🎯 POS Indonesia related files:')
    if (posFiles.length === 0) {
      console.log('  ❌ No POS Indonesia files found')
    } else {
      posFiles.forEach(file => {
        const publicUrl = `https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/${file.name}`
        console.log(`  - ${file.name}`)
        console.log(`    URL: ${publicUrl}`)
      })
    }
    
    // Test a few potential URLs
    const testUrls = [
      'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/c18041f2-705c-4d03-8345-25c9675b2e7e.png',
      'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/c18041f2-705c-4d03-8345-25c9675b2e7e-logo.png',
      'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/c18041f2-705c-4d03-8345-25c9675b2e7e-1760063665000.png'
    ]
    
    console.log('\n🧪 Testing potential URLs:')
    for (const url of testUrls) {
      try {
        const response = await fetch(url)
        console.log(`  ${response.ok ? '✅' : '❌'} ${response.status} - ${url}`)
      } catch (err) {
        console.log(`  ❌ Error - ${url}: ${err.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the check
checkPosStorage()
  .then(() => {
    console.log('\n🎉 Storage check completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })