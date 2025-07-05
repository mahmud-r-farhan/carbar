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
      <img
        className="w-20 ml-10"
        src="/assets/images/carbar-logo.png"
        alt="CarBar Logo"
      />
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white pb-7 py-4 px-4"
      >
        <h2 className="text-3xl font-bold">Get Started with CarBar</h2>
        <Link
          to="/login"
          className="flex items-center justify-center w-full bg-black text-white py-3 rounded mt-5"
        >
          <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            Continue
          </motion.span>
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default Home;