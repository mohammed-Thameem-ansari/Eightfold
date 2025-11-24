/**
 * User Preferences Manager
 * Persists user layout, theme, and configuration preferences
 */

export interface UserPreferences {
  // Layout preferences
  resizablePanelSizes?: {
    workflow?: [number, number]; // [left, right] percentages
  };
  
  // Tab preferences
  lastActiveTab?: {
    dashboard?: string;
  };
  
  // Theme preferences
  theme?: 'light' | 'dark' | 'system';
  
  // Display preferences
  compactMode?: boolean;
  animationsEnabled?: boolean;
  
  // Agent preferences
  agentConfig?: {
    maxIterations?: number;
    confidenceThreshold?: number;
    timeoutSeconds?: number;
    parallelAgents?: number;
    retryAttempts?: number;
    cacheEnabled?: boolean;
  };
  
  // Export preferences
  defaultExportFormat?: 'pdf' | 'docx' | 'json';
  exportBranding?: {
    companyName?: string;
    accentColor?: string;
    logoDataUrl?: string;
  };
  
  // Last updated timestamp
  updatedAt?: number;
}

const STORAGE_KEY = 'user_preferences';
const STORAGE_VERSION = 1;

/**
 * Get user preferences from localStorage
 */
export function getPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored);
    
    // Version check for future migrations
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('Preferences version mismatch, resetting');
      return {};
    }

    return parsed.data || {};
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return {};
  }
}

/**
 * Save user preferences to localStorage
 */
export function savePreferences(preferences: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const current = getPreferences();
    const updated = {
      ...current,
      ...preferences,
      updatedAt: Date.now(),
    };

    const payload = {
      version: STORAGE_VERSION,
      data: updated,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

/**
 * Update a specific preference path
 */
export function updatePreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void {
  savePreferences({ [key]: value });
}

/**
 * Clear all preferences
 */
export function clearPreferences(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear preferences:', error);
  }
}

/**
 * Export preferences as JSON
 */
export function exportPreferences(): string {
  const prefs = getPreferences();
  return JSON.stringify(prefs, null, 2);
}

/**
 * Import preferences from JSON
 */
export function importPreferences(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    savePreferences(parsed);
    return true;
  } catch (error) {
    console.error('Failed to import preferences:', error);
    return false;
  }
}

/**
 * React hook for preferences
 */
export function usePreferences() {
  if (typeof window === 'undefined') {
    return {
      preferences: {},
      updatePreference: () => {},
      savePreferences: () => {},
      clearPreferences: () => {},
    };
  }

  const [preferences, setPreferences] = React.useState<UserPreferences>(getPreferences());

  const update = React.useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    updatePreference(key, value);
    setPreferences(getPreferences());
  }, []);

  const save = React.useCallback((prefs: Partial<UserPreferences>) => {
    savePreferences(prefs);
    setPreferences(getPreferences());
  }, []);

  const clear = React.useCallback(() => {
    clearPreferences();
    setPreferences({});
  }, []);

  return {
    preferences,
    updatePreference: update,
    savePreferences: save,
    clearPreferences: clear,
  };
}

// Import React for hook
import * as React from 'react';
