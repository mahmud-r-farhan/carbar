import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, MessageCircle, Bell, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserDataContext } from '../../context/UserContext';

const getNavItems = (role) => {
  const prefix = role === 'captain' ? '/captain' : '/user';
  return [
    { to: `${prefix}/map`, icon: <Home className="w-6 h-6" />, label: 'Home', roles: ['user', 'captain'] },
    { to: `${prefix}/dashboard`, icon: <User className="w-6 h-6" />, label: 'Dashboard', roles: ['user', 'captain'] },
    { to: `${prefix}/chat`, icon: <MessageCircle className="w-6 h-6" />, label: 'Chat', roles: ['user', 'captain'] },
    { to: '/notifications', icon: <Bell className="w-6 h-6" />, label: 'Notifications', roles: ['user', 'captain'] },
    { to: '/settings', icon: <Settings className="w-6 h-6" />, label: 'Settings', roles: ['user', 'captain'] },
  ].filter((item) => item.roles.includes(role));
};

const BottomNav = () => {
  const { user } = useContext(UserDataContext); // Use object destructuring
  const location = useLocation();
  const role = user?.role;

  const shouldShow = role === 'user' || role === 'captain';
  const navItems = role ? getNavItems(role) : [];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
        shouldShow ? 'h-16 md:h-20' : 'h-0 overflow-hidden'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {shouldShow && (
        <nav
          role="navigation"
          aria-label="Main navigation"
          className="bg-white border-t flex justify-around items-center h-full shadow-lg"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center p-2 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600 focus:text-blue-600'
                }`
              }
              aria-label={item.label}
            >
              <motion.div
                animate={{
                  scale: location.pathname === item.to ? 1.2 : 1,
                  color: location.pathname === item.to ? '#2563eb' : '#6b7280',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.1 }}
                whileFocus={{ scale: 1.1 }}
                className="flex flex-col items-center"
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </motion.div>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};

export default BottomNav;