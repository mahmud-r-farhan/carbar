import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TermModal = ({ role = 'user' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="pt-6 font-sans text-sm text-gray-700">
      <p className="text-center">
        By using CarBar, you agree to our{' '}
        <button
          className="text-blue-500 underline hover:text-blue-700 focus:outline-none"
          onClick={() => setIsModalOpen(true)}
        >
          Terms and Conditions
        </button>.
      </p>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Terms and Conditions</h2>
              </div>

              {/* Body */}
              <div className="px-6 py-4 overflow-y-auto text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                {terms[role]}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TermModal;