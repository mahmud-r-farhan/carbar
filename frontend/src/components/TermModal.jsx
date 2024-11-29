import React, { useState } from "react";

const TermModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Open modal
    const openModal = () => {
      setIsModalOpen(true);
    };
  
    // Close modal
    const closeModal = () => {
      setIsModalOpen(false);
    };
  
    return (
      <div className="pt-6 font-sans">
        <p>
          By using CarBar, you confirm that you agree to these{" "}
          <span
            className="text-blue-500 underline cursor-pointer hover:text-blue-700"
            onClick={openModal}
          >
            Terms and Conditions
          </span>
          .
        </p>
  
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModal}
          >
            <div
              className="bg-gray-50 rounded-lg shadow-lg p-6 w-11/12 max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">Terms and Conditions!</h2>
              <p className="mb-6">

                No need terms ans conditions, use like your own way! because this is already secured application.

              </p>
              
              <button
                onClick={closeModal}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
};

export default TermModal;