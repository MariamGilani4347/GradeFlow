// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('accessToken') || null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [accessToken])

  const login = async (email, password) => {
    const res = await axios.post('/auth/login', { email, password })
    const { access_token, refresh_token, user } = res.data.data
    setUser(user)
    setAccessToken(access_token)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('accessToken', access_token)
    localStorage.setItem('refreshToken', refresh_token)
    return user
  }

  const logout = () => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  const googleLogin = async (token) => {
    const res = await axios.post('/auth/google', { token })
    const { access_token, refresh_token, user } = res.data.data
    setUser(user)
    setAccessToken(access_token)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('accessToken', access_token)
    localStorage.setItem('refreshToken', refresh_token)
    return user
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, googleLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)