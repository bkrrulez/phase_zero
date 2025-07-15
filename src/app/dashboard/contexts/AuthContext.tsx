
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { type User } from '@/lib/types';
import { useMembers } from './MembersContext';

interface AuthContextType {
  currentUser: User | null; 
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// A simple hook to read from localStorage, meant to be used on the client.
function useLocalStorageValue(key: string, initialValue: string | null): [string | null, (value: string | null) => void] {
    const [storedValue, setStoredValue] = React.useState<string | null>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: string | null) => {
        try {
            const valueToStore = value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                if (value === null) {
                    window.localStorage.removeItem(key);
                } else {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            }
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue];
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { teamMembers, isLoading: membersLoading } = useMembers();
  const [currentUserId, setCurrentUserId] = useLocalStorageValue('currentUserId', null);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isMounted || membersLoading) {
      return;
    }

    if (currentUserId) {
      const user = teamMembers.find(u => u.id === currentUserId);
      if (user) {
        setCurrentUser(user);
      } else if (teamMembers.length > 0) {
        // If team members are loaded but the user ID is invalid, log out.
        setCurrentUserId(null); 
      }
    } else {
      router.push('/');
    }
    setIsLoading(false);
  }, [currentUserId, teamMembers, router, setCurrentUserId, isMounted, membersLoading]);

  const logout = () => {
    setCurrentUserId(null);
    setCurrentUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ currentUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
