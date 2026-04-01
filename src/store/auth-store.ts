'use client';

import { create } from 'zustand';

export interface AuthUser {
  email: string;
  name: string;
}

interface AuthStore {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  checkAuth: () => void;
}

const USERS_KEY = 'imovs_users';
const CURRENT_USER_KEY = 'imovs_current_user';

interface StoredUser {
  email: string;
  name: string;
  password: string;
}

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const testKey = '__imovs_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getUsers(): StoredUser[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  if (!isLocalStorageAvailable()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser(): AuthUser | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user: AuthUser | null) {
  if (!isLocalStorageAvailable()) return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,

  login: (email: string, password: string) => {
    const users = getUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      return { success: false, error: 'No account found with this email' };
    }

    if (user.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    const authUser: AuthUser = { email: user.email, name: user.name };
    setCurrentUser(authUser);
    set({ isAuthenticated: true, user: authUser });
    return { success: true };
  },

  signup: (name: string, email: string, password: string) => {
    const users = getUsers();
    const existing = users.find((u) => u.email === email);

    if (existing) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const newUser: StoredUser = { email, name, password };
    saveUsers([...users, newUser]);

    const authUser: AuthUser = { email, name };
    setCurrentUser(authUser);
    set({ isAuthenticated: true, user: authUser });
    return { success: true };
  },

  logout: () => {
    setCurrentUser(null);
    set({ isAuthenticated: false, user: null });
  },

  checkAuth: () => {
    const user = getCurrentUser();
    if (user) {
      set({ isAuthenticated: true, user });
    } else {
      set({ isAuthenticated: false, user: null });
    }
  },
}));
