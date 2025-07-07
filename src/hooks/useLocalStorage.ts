
'use client';
import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Use initialValue for the initial state to ensure server and client render match.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  const readValue = useCallback((): T => {
    // Prevent build error "window is undefined" but keep keep working
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // Set the stored value from localStorage after the initial render.
  useEffect(() => {
    setStoredValue(readValue());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const setValue = (value: T | ((val: T) => T)) => {
    // Prevent build error "window is undefined" but keep keep working
    if (typeof window === 'undefined') {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`
      );
      return;
    }
    try {
      const newValue = value instanceof Function ? value(storedValue) : value;
      window.localStorage.setItem(key, JSON.stringify(newValue));
      setStoredValue(newValue);
      window.dispatchEvent(new Event("local-storage"));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };
    
    // this is a custom event, triggered in setValue
    window.addEventListener("local-storage", handleStorageChange);
    
    // this is a built-in event, triggered by other tabs
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener("local-storage", handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [readValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;
