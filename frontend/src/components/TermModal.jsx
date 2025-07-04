import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';

const TermModal = ({ role = 'user' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setUser] = useContext(UserDataContext);

  const terms = {
    user: `
      Welcome to CarBar! By using our platform as a user, you agree to:
      - Use the service for personal, non-commercial purposes.
      - Provide accurate information during registration.
      - Respect drivers and follow safety guidelines.
      - Pay for rides promptly and report any issues to support.
    `,
    captain: `
      Welcome to CarBar! As a captain, you agree to:
      - Maintain a valid driver's license and vehicle insurance.
      - Provide safe and reliable transportation services.
      - Update your availability and location accurately.
      - Adhere to CarBar's safety and conduct policies.
    `,
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="pt-6 font-sans">
      <p>
        By using CarBar, you agree to these{' '}
        <span
          className="text-blue-500 underline cursor-pointer hover:text-blue-700"
          onClick={openModal}
        >
          Terms and Conditions
        </span>
        .
      </p>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-50 rounded-lg shadow-lg p-6 w-11/12 max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">Terms and Conditions</h2>
              <p className="mb-6">{terms[role]}</p>
              <button
                onClick={closeModal}
                className="bg-blue-500 text-white px-4 py-2 rounded Hover:bg-blue-700"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TermModal;