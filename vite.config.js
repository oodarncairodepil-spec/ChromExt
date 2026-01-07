import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env file manually for PLASMO_PUBLIC_* vars
function loadEnvVars() {
  try {
    const envContent = readFileSync(path.resolve(__dirname, '.env'), 'utf8')
    const vars = {}
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (key.startsWith('PLASMO_PUBLIC_')) {
          vars[key] = value
        }
      }
    })
    return vars
  } catch (e) {
    console.warn('Failed to load .env file:', e.message)
    return {}
  }
}

const envVars = loadEnvVars()

export default defineConfig({
  plugins: [react()],
  root: '.', // Use project root
  publicDir: 'public', // Serve static files from public
  server: {
    port: 3000,
    open: false, // Don't auto-open browser
    host: true, // Allow access from network
    cors: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'public/index.html')
    },
    outDir: 'build/web',
    emptyOutDir: true,
    sourcemap: true
  },
  define: {
    // Mock Chrome extension APIs for browser testing
    'typeof chrome': JSON.stringify('undefined'),
    'global': 'globalThis',
    // Replace process.env with actual values from .env file
    'process.env.PLASMO_PUBLIC_SUPABASE_URL': JSON.stringify(envVars.PLASMO_PUBLIC_SUPABASE_URL || ''),
    'process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(envVars.PLASMO_PUBLIC_SUPABASE_ANON_KEY || ''),
    'process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(envVars.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.PLASMO_TARGET': JSON.stringify('web')
  }
})

