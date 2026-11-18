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
      <div className="flex items-center justify-between h-12 px-4 md:px-6">
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
          
          <div className="flex items-center">
            <h1 className="text-xl font-display font-black text-gradient hidden sm:block tracking-widest">
              KAM<span className="text-accent-primary">CORP</span>
            </h1>
          </div>
        </div>

        {/* Right side - Theme toggle, Notifications, and User menu */}
        <div className="flex items-center gap-3">
          {/* Theme toggle — pill switch */}
          <div className="flex items-center gap-1.5" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {/* Sun icon */}
            <svg className={`w-3.5 h-3.5 transition-colors ${theme === 'light' ? 'text-warning' : 'text-text-tertiary'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm7-5a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM3 12a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm15.364-6.364a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM6.343 17.657a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM21 20a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM12 20a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.636 5.636a1 1 0 011.414 0l.707.707A1 1 0 016.343 7.757l-.707-.707a1 1 0 010-1.414z"/>
            </svg>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background ${
                theme === 'dark'
                  ? 'bg-accent-primary/20 border-accent-primary/40'
                  : 'bg-surface-hover border-border'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-accent-primary shadow transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            {/* Moon icon */}
            <svg className={`w-3.5 h-3.5 transition-colors ${theme === 'dark' ? 'text-accent-primary' : 'text-text-tertiary'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/>
            </svg>
          </div>

          {/* Notifications */}
          <NotificationDropdown />
          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <div className="w-8 h-8 bg-accent-primary/15 border border-accent-primary/30 rounded-full flex items-center justify-center">
                <span className="text-accent-primary font-bold text-sm font-display">
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
