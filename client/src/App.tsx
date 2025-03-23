import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AblyProvider } from './context/AblyContext'
import { Login } from './components/Login'
import { Register } from './components/Register'
import { Chat } from './components/Chat'
import './index.css'

// Define fallback styles to ensure layout works
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    fontSize: '1.25rem',
    color: '#4B5563'
  }
};

function AuthenticatedApp() {
  const { user, loading } = useAuth()
  const [showLogin, setShowLogin] = useState(true)

  if (loading) {
    return (
      <div style={styles.container} className="min-h-screen flex items-center justify-center">
        <div style={styles.loadingText} className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return showLogin ? (
      <Login onToggleRegister={() => setShowLogin(false)} />
    ) : (
      <Register onToggleLogin={() => setShowLogin(true)} />
    )
  }

  return (
    <AblyProvider>
      <Chat />
    </AblyProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}

export default App
