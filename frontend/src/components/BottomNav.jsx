import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, MessageCircle, Bell, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';

const navItems = [
  { to: '/user/map', icon: <Home className="w-7 h-7" />, label: 'Home', roles: ['user'] },
  { to: '/captain/map', icon: <Home className="w-7 h-7" />, label: 'Home', roles: ['captain'] },
  { to: '/user/dashboard', icon: <User className="w-7 h-7" />, label: 'Dashboard', roles: ['user'] },
  { to: '/captain/dashboard', icon: <User className="w-7 h-7" />, label: 'Dashboard', roles: ['captain'] },
  { to: '/user/chat', icon: <MessageCircle className="w-7 h-7" />, label: 'Chat', roles: ['user'] },
  { to: '/captain/chat', icon: <MessageCircle className="w-7 h-7" />, label: 'Chat', roles: ['captain'] },
 // { to: '/user/notification', icon: <Bell className="w-7 h-7" />, label: 'Notification', roles: ['user'] },
 // { to: '/captain/notification', icon: <Bell className="w-7 h-7" />, label: 'Notification', roles: ['captain'] },
  { to: '/settings', icon: <Settings className="w-7 h-7" />, label: 'Settings', roles: ['user'] },
  { to: '/captain/settings', icon: <Settings className="w-7 h-7" />, label: 'Settings', roles: ['captain'] },
];

const BottomNav = () => {
  const [user] = useContext(UserDataContext);
  const location = useLocation();
  const role = user?.role;

  const shouldShow = role === 'user' || role === 'captain';

  // Filter nav items to show only those matching the user's role, avoiding duplicates
  const filteredNavItems = navItems.filter(
    (item, idx, arr) =>
      item.roles.includes(role) &&
      arr.findIndex((i) => i.label === item.label && i.roles.includes(role)) === idx
  );

  return (
    <div
      className={`transition-all duration-300 fixed bottom-0 left-0 right-0 z-50 ${
        shouldShow ? 'h-14' : 'h-0 overflow-hidden'
      }`}
    >
      {shouldShow && (
        <nav className="bg-white border-t flex justify-around items-center h-full shadow-lg">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                }`
              }
              aria-label={item.label}
            >
              <motion.div
                animate={{
                  scale: location.pathname === item.to ? 1.2 : 1,
                  color: location.pathname === item.to ? '#2563eb' : '#6b7280',
                }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {item.icon}
              </motion.div>
              {/* Uncomment to show labels for better UX */}
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};

export default BottomNav;