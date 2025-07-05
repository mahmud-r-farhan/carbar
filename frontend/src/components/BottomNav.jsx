import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, MessageCircle, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';

const navItems = [
  { to: '/user/map', icon: <Home className="w-6 h-6" />, label: 'Home', roles: ['user'] },
  { to: '/captain/map', icon: <Home className="w-6 h-6" />, label: 'Home', roles: ['captain'] },
  { to: '/user/dashboard', icon: <User className="w-6 h-6" />, label: 'Dashboard', roles: ['user'] },
  { to: '/captain/dashboard', icon: <User className="w-6 h-6" />, label: 'Dashboard', roles: ['captain'] },
  { to: '/user/chat', icon: <MessageCircle className="w-6 h-6" />, label: 'Chat', roles: ['user'] },
  { to: '/captain/chat', icon: <MessageCircle className="w-6 h-6" />, label: 'Chat', roles: ['captain'] },
  { to: '/settings', icon: <Settings className="w-6 h-6" />, label: 'Settings', roles: ['user'] },
  { to: '/captain/settings', icon: <Settings className="w-6 h-6" />, label: 'Settings', roles: ['captain'] },
];

const BottomNav = () => {
  const [user] = useContext(UserDataContext);
  const location = useLocation();
  const role = user?.role;

  // Hide navbar if no logged-in user or no valid role
  if (!role || (role !== 'user' && role !== 'captain')) {
    return null;
  }

  const filteredNavItems = navItems.filter(
    (item, idx, arr) =>
      item.roles.includes(role) &&
      arr.findIndex(
        (i) => i.label === item.label && i.roles.includes(role)
      ) === idx
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex justify-around items-center h-16 shadow-lg">
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
          <span className="text-xs mt-1">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;