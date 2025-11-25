
'use client';

import * as React from 'react';
import { getSystemSetting, setSystemSetting } from '../actions';
import { useAuth } from './AuthContext';
import { useSystemLog } from './SystemLogContext';

interface AdminPanelContextType {
  showRowCount: boolean;
  setShowRowCount: (isVisible: boolean) => Promise<void>;
  isLoading: boolean;
}

const AdminPanelContext = React.createContext<AdminPanelContextType | undefined>(undefined);

export function AdminPanelProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { logAction } = useSystemLog();
  const [showRowCount, _setShowRowCount] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const rowCountStr = await getSystemSetting('show_row_count_in_analysis');
      // Default to true if the setting doesn't exist or is not 'false'
      _setShowRowCount(rowCountStr !== 'false');
      setIsLoading(false);
    }
    fetchSettings();
  }, []);

  const setShowRowCount = async (isVisible: boolean) => {
    _setShowRowCount(isVisible);
    await setSystemSetting('show_row_count_in_analysis', String(isVisible));
    if(currentUser) {
      await logAction(`User '${currentUser.name}' set 'Show row count in Parameter Analysis' to ${isVisible}.`);
    }
  };

  return (
    <AdminPanelContext.Provider value={{ showRowCount, setShowRowCount, isLoading }}>
      {children}
    </AdminPanelContext.Provider>
  );
}

export const useAdminPanel = () => {
  const context = React.useContext(AdminPanelContext);
  if (context === undefined) {
    throw new Error('useAdminPanel must be used within an AdminPanelProvider');
  }
  return context;
};

    