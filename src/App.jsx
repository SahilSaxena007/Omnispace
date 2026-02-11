import './App.css'
import { supabase } from './supabaseClient'

function App() {
  // Test Supabase connection
  console.log('Supabase client initialized:', supabase)

  return (
    <div className="app">
      <h1>Omnispace</h1>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Supabase client ready ✓
      </p>
    </div>
  )
}

export default App
