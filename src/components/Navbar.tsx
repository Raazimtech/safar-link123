import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { Bell, Search, Download, Check, Sparkles } from 'lucide-react';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface NavbarProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch, onRefresh }) => {
  const { dbUser, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const [showInstallModal, setShowInstallModal] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // refresh notifications every 20s
    return () => clearInterval(interval);
  }, [token]);

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // PWA Support
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      setShowInstallModal(true);
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 font-sans select-none">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex items-center bg-slate-100 px-4 py-2 rounded-full w-96 border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-all">
        <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder="Search tracking ID, sender, or phone..."
          className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-slate-400"
        />
      </form>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* PWA Install Button */}
        {!isInstalled && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer text-slate-700"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download App</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              if (!showNotifDropdown) fetchNotifications();
            }}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 relative cursor-pointer hover:bg-slate-200/50 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-3 w-[360px] bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
              <div className="p-3 border-b border-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    <Sparkles className="w-5 h-5 mx-auto mb-2 text-blue-200" />
                    <span>No notifications received yet</span>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-lg hover:bg-slate-50 transition-colors ${
                        !notif.read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-slate-800">{notif.title}</span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Context Branch Indicator */}
        <div className="flex items-center space-x-2 border-l border-slate-100 pl-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-700 leading-tight">
              {dbUser?.name || 'Staff User'}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase mt-0.5">
              {dbUser?.branchName || 'Super Admin'}
            </span>
          </div>
        </div>
      </div>

      {showInstallModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-800">Install SafarLink App</h3>
              <button
                onClick={() => setShowInstallModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                To install the SafarLink app on your device, follow these instructions:
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-white p-1.5 rounded-md shadow-sm border border-slate-200 mt-0.5">
                    <span className="font-bold text-slate-700 text-xs uppercase">iOS</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-tight">
                    Tap the <strong>Share</strong> button in Safari, then select <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start space-x-3 pt-2 border-t border-slate-200">
                  <div className="bg-white p-1.5 rounded-md shadow-sm border border-slate-200 mt-0.5">
                    <span className="font-bold text-slate-700 text-xs uppercase">Android</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-tight">
                    Tap the <strong>Menu</strong> icon (three dots) in Chrome, then select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full mt-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
