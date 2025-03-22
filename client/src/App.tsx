import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AblyProvider } from './context/AblyContext'
import { Login } from './components/Login'
import { Register } from './components/Register'
import { Chat } from './components/Chat'
import './index.css'

function AuthenticatedApp() {
  const { user, loading } = useAuth()
  const [showLogin, setShowLogin] = useState(true)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
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
