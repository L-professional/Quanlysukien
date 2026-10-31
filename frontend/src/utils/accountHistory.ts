export interface DeviceSavedAccount {
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'microsoft' | 'local';
  lastUsed?: number;
}

const STORAGE_KEY = 'eventhub_device_saved_accounts';

const DEFAULT_ACCOUNTS: DeviceSavedAccount[] = [
  {
    email: 'alex.participant@gmail.com',
    name: 'Alex Participant',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alex_participant',
    provider: 'google',
    lastUsed: Date.now() - 1000 * 60 * 30, // 30 mins ago
  },
  {
    email: 'attendee@eventhub.ai',
    name: 'Phạm Quốc Khách Hàng',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PhamQuocKhachHang',
    provider: 'google',
    lastUsed: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
  },
  {
    email: 'alex.attendee@outlook.com',
    name: 'Alex Microsoft',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AlexMicrosoft',
    provider: 'microsoft',
    lastUsed: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
  },
];

export const getSavedAccounts = (): DeviceSavedAccount[] => {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_ACCOUNTS;
  } catch (e) {
    console.warn('Failed to parse saved accounts from localStorage:', e);
    return DEFAULT_ACCOUNTS;
  }
};

export const saveAccountToHistory = (account: DeviceSavedAccount): void => {
  if (typeof window === 'undefined') return;
  try {
    const saved = getSavedAccounts();
    const list = (Array.isArray(saved) ? saved : []).filter(
      (a) => (a.email || '').toLowerCase() !== (account.email || '').toLowerCase()
    );
    const updated: DeviceSavedAccount[] = [
      {
        ...account,
        lastUsed: Date.now(),
      },
      ...list,
    ];
    // Keep at most 6 accounts
    const trimmed = updated.slice(0, 6);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save account to history:', e);
  }
};

export const removeAccountFromHistory = (email: string): DeviceSavedAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = getSavedAccounts();
    const list = (Array.isArray(saved) ? saved : []).filter(
      (a) => (a.email || '').toLowerCase() !== email.toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.warn('Failed to remove account from history:', e);
    return [];
  }
};
