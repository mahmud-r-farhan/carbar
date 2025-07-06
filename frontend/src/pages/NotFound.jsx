import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
 const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-100 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-red-100 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-yellow-100 rounded-full opacity-20 animate-pulse delay-500"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center px-6 max-w-md z-10"
      >
        {/* Logo with enhanced styling */}
        <div className="relative mb-8">
          <div className="absolute inset-0 w-40 h-40 mx-auto rounded-full bg-gradient-to-r from-orange-400 to-red-500 opacity-10 animate-ping"></div>
          <div className="relative bg-white rounded-2xl shadow-xl p-4 mx-auto w-fit">
            <img
              src="/assets/images/carbar.png"
              alt="CarBar Logo"
              className="w-24 h-auto mx-auto"
            />
          </div>
        </div>

        {/* 404 with enhanced styling */}
        <div className="mb-6">
          <motion.h1 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-2"
          >
            404
          </motion.h1>
          <div className="w-20 h-1 bg-gradient-to-r from-orange-500 to-red-500 mx-auto rounded-full"></div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 mb-8"
        >
          <p className="text-2xl text-gray-700 font-semibold">Oops! Page not found.</p>
          <p className="text-gray-500 leading-relaxed">
            The page you are looking for might have been removed or is temporarily unavailable.
          </p>
        </motion.div>

        {/* Action button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          Back to Home
        </motion.button>

        {/* Loading dots */}
        <div className="flex justify-center space-x-2 mt-6">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-200"></div>
        </div>
      </motion.div>

      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-3 h-3 bg-orange-300 rounded-full animate-bounce opacity-60"></div>
      <div className="absolute bottom-20 right-10 w-2 h-2 bg-red-300 rounded-full animate-bounce delay-300 opacity-60"></div>
      <div className="absolute top-1/3 right-20 w-4 h-4 bg-yellow-300 rounded-full animate-bounce delay-700 opacity-40"></div>
    </div>
  );
};

export default NotFound;