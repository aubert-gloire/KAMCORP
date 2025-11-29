import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import NotificationDropdown from './NotificationDropdown';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-surface border-b border-border shadow-card">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side - Menu button and Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden text-text-secondary hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-surface-hover"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 flex items-center justify-center">
              <img src="/logo.svg" alt="KAMCORP Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-display font-semibold text-gradient hidden sm:block">
              KAMCORP
            </h1>
          </div>
        </div>

        {/* Right side - Theme toggle, Notifications, and User menu */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="text-text-secondary hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-surface-hover"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Notifications */}
          <NotificationDropdown />
          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <div className="w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center">
                <span className="text-background font-semibold text-sm">
                  {user?.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-text-primary">{user?.fullName}</p>
                <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
              </div>
              <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <motion.div
                  className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-metallic overflow-hidden z-20"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">{user?.fullName}</p>
                    <p className="text-xs text-text-secondary">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-error hover:bg-surface-hover transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
