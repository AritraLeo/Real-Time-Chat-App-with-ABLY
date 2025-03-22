/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    setOnlineStatus: (isOnline: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user || null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Update online status
    useEffect(() => {
        const updateOnlineStatus = async () => {
            if (user) {
                // Set online when logged in
                await setOnlineStatus(true);

                // Set offline when tab/window is closed
                const handleBeforeUnload = async () => {
                    await setOnlineStatus(false);
                };

                window.addEventListener('beforeunload', handleBeforeUnload);

                return () => {
                    window.removeEventListener('beforeunload', handleBeforeUnload);
                };
            }
        };
        updateOnlineStatus();

        return () => { }; // Return empty cleanup function when user is not logged in
    }, [user]);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signUp = async (email: string, password: string, username: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }
            }
        });

        if (!error) {
            // Create user profile in 'users' table
            await supabase.from('users').insert({
                id: (await supabase.auth.getUser()).data.user?.id,
                email,
                username,
                isOnline: true,
                created_at: new Date().toISOString()
            });
        }

        return { error };
    };

    const signOut = async () => {
        // Set user as offline before signing out
        await setOnlineStatus(false);
        await supabase.auth.signOut();
    };

    const setOnlineStatus = async (isOnline: boolean) => {
        if (!user) return;

        try {
            // Update in Supabase database
            await supabase
                .from('users')
                .update({
                    isOnline,
                    lastSeen: isOnline ? null : new Date().toISOString()
                })
                .eq('id', user.id);

            // Update on API server (which will notify clients via Ably)
            await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user.id}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isOnline })
            });
        } catch (error) {
            console.error('Error updating online status:', error);
        }
    };

    const value = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        setOnlineStatus
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 