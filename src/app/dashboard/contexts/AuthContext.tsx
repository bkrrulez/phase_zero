
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/useLocalStorage';
import { type User } from '@/lib/mock-data';
import { useMembers } from './MembersContext';

interface AuthContextType {
  currentUser: User; // Non-null because provider ensures it exists for consumers
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { teamMembers } = useMembers();
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>('currentUserId', null);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (teamMembers.length > 0) { // Ensure team members are loaded from localStorage
      setIsLoading(true);
      if (currentUserId) {
        const user = teamMembers.find(u => u.id === currentUserId);
        if (user) {
          setCurrentUser(user);
          setIsLoading(false);
        } else {
          setCurrentUserId(null); // Invalid user ID, clear it
          router.push('/');
        }
      } else {
        router.push('/'); // No user ID, redirect to login
      }
    }
  }, [currentUserId, teamMembers, router, setCurrentUserId]);

  const logout = () => {
    setCurrentUserId(null);
    setCurrentUser(null);
    router.push('/');
  };

  if (isLoading || !currentUser) {
    // You can replace this with a more sophisticated loading skeleton
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="text-xl font-semibold text-foreground">Loading...</div>
        </div>
    );
  }

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
