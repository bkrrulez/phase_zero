
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This is a placeholder page that redirects to the first settings sub-page.
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings/members');
  }, [router]);

  return null; 
}

    