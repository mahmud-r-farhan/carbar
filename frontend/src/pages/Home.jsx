import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Home = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-cover bg-bottom bg-[url('/assets/images/home-screen.jpg')] h-screen pt-8 flex w-full justify-between flex-col"
    >
      <motion.img
        className="w-20 ml-10"
        src="https://res.cloudinary.com/dqovjmmlx/image/upload/v1751688574/carbar_x3vkwy.png"
        alt="CarBar Logo"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      />
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white pb-7 py-4 px-4 rounded-t-3xl shadow-lg"
        transition={{ type: 'spring', stiffness: 120 }}
      >
        <h2 className="text-3xl font-bold mb-2">Get Started with CarBar</h2>
        <p className="mb-4 text-gray-600">
          Your smart ride-sharing companion. Book rides, chat, and manage your
          profile easily!
        </p>
        <Link
          to="/login"
          className="flex items-center justify-center w-full bg-black text-white py-3 rounded mt-5"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Continue
          </motion.span>
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default Home;