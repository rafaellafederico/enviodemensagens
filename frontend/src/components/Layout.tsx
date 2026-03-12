import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Megaphone,
  LogOut,
  User,
  ChevronDown,
  Wifi,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useState } from 'react';
import clsx from 'clsx';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">DevZapp</span>
            <span className="text-gray-500 text-sm ml-1">DevGrupos</span>
          </div>

          {/* Nav items */}
          <nav className="flex items-center gap-1">
            <NavLink
              to="/campaigns"
              className={({ isActive }) =>
                clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                )
              }
            >
              Campanhas
            </NavLink>
            <NavLink
              to="/sessions"
              className={({ isActive }) =>
                clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                  isActive
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                )
              }
            >
              <Wifi className="w-3.5 h-3.5" />
              Sessões
            </NavLink>
          </nav>

          {/* User */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-100 leading-none">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 leading-none mt-0.5">
                  {user?.plan}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
