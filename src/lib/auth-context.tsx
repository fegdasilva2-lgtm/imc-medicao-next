'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario, UserRole } from '@/types/database'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: SupabaseUser | null
  session: Session | null
  usuario: Usuario | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  isAdmin: boolean
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        await fetchUsuario(currentSession.user.id)
      }

      setIsLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await fetchUsuario(newSession.user.id)
        } else {
          setUsuario(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUsuario = async (userId: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setUsuario(data as Usuario)
    }
  }

  const signIn = async (username: string, password: string) => {
    // Supabase Auth usa email, então buscamos o email pelo username
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('email')
      .eq('username', username)
      .single()
    
    if (userError || !userData?.email) {
      return { error: new Error('Usuário não encontrado') as Error | null }
    }
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email: userData.email, 
      password 
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    setUsuario(null)
    return { error: error as Error | null }
  }

  const isAdmin = usuario?.role === 'admin'

  const hasRole = (roles: UserRole[]) => {
    if (isAdmin) return true
    return roles.includes(usuario?.role as UserRole)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        usuario,
        isLoading,
        signIn,
        signOut,
        isAdmin,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
