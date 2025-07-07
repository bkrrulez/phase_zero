
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
    if (currentUserId) {
      const user = teamMembers.find(u => u.id === currentUserId);
      if (user) {
        setCurrentUser(user);
        setIsLoading(false);
      } else {
        // User not found in the current list. This could be a race condition
        // where teamMembers hasn't hydrated from localStorage yet. We'll
        // keep `isLoading` true and let the effect re-run when teamMembers updates.
        // If the ID is genuinely invalid, the user will see the loading screen
        // until they manually navigate away or the session is cleared.
        // A more advanced implementation might use a timeout to redirect.
      }
    } else {
      // No user ID found, redirect to login.
      router.push('/');
    }
  }, [currentUserId, teamMembers, router, setCurrentUserId]);

  const logout = () => {
    setCurrentUserId(null);
    setCurrentUser(null);
    router.push('/');
  };

  if (isLoading || !currentUser) {
    // Show a loading screen while we verify the user or if the user is not found.
    // The effect will handle redirecting if there's no logged-in user ID.
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
