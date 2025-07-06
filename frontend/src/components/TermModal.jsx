import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TermModal = ({ role = 'user' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const terms = {
    user: ` Welcome to CarBar! By using our platform as a user, you agree to:
- Use the service for personal, non-commercial purposes.
- Provide accurate information during registration.
- Respect drivers and follow safety guidelines.
- Pay for rides promptly and report any issues to support.
    `,
    captain: ` Welcome to CarBar! As a captain, you agree to:
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
          className="text-orange-500 underline hover:text-orange-700 focus:outline-none transition-colors duration-200 font-medium"
          onClick={() => setIsModalOpen(true)}
        >
          Terms and Conditions
        </button>
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
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-orange-100"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <h2 className="text-xl font-semibold">Terms and Conditions</h2>
                <div className="flex justify-center mt-2">
                  <div className="w-12 h-1 bg-white/30 rounded-full"></div>
                </div>
              </div>

              <div className="px-6 py-6 overflow-y-auto text-gray-700 text-sm whitespace-pre-line leading-relaxed bg-gradient-to-b from-orange-50/20 to-white">
                {terms[role]}
              </div>

              <div className="px-6 py-4 border-t border-orange-100 bg-orange-50/30">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-xl transition-all duration-300 font-semibold shadow-lg"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TermModal;