import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleAuthProvider } from './firebase.ts';

interface DBUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
  branchId: number | null;
  status: string;
  createdAt: string;
}

interface AuthContextType {
  firebaseUser: User | null;
  dbUser: DBUser | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: (isRegistering?: boolean) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (idToken: string) => {
    try {
      const res = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
      } else {
        console.error('Failed to fetch DB user profile:', await res.text());
        setDbUser(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setDbUser(null);
    }
  };

  const refreshProfile = async () => {
    if (firebaseUser && token) {
      const refreshedToken = await firebaseUser.getIdToken(true);
      setToken(refreshedToken);
      await fetchProfile(refreshedToken);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setToken(idToken);
          await fetchProfile(idToken);
        } catch (err) {
          console.error('Error getting Firebase token:', err);
          setToken(null);
          setDbUser(null);
        }
      } else {
        setToken(null);
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (isRegistering?: boolean) => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      
      if (isRegistering) {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          await signOut(auth);
          throw new Error(errData.error || 'Registration failed.');
        }
      } else {
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          await signOut(auth);
          throw new Error(errData.error || 'User not registered. Please register first.');
        }
      }

      await refreshProfile();
    } catch (error) {
      console.error('Auth error:', error);
      setLoading(false);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const idToken = await cred.user.getIdToken();
      
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        await signOut(auth);
        throw new Error(errData.error || 'User not registered. Please register first.');
      }
      await refreshProfile();
    } catch (error) {
      console.error('Auth error:', error);
      setLoading(false);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // Wait, there's no way to pass name to Firebase natively in createUserWithEmailAndPassword directly?
      // Actually we can just pass it via the /api/register request because we get the token
      // but decodedToken.name might be empty. Let's send it in the body.
      // Ah wait, /api/register only reads decodedToken.uid and email right now.
      // I need to update /api/register to accept a name from the body as fallback.
      const idToken = await cred.user.getIdToken();
      
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        await signOut(auth);
        throw new Error(errData.error || 'Registration failed.');
      }
      await refreshProfile();
    } catch (error) {
      console.error('Auth error:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setDbUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        token,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
