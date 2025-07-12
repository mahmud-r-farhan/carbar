import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    toast.error('Something went wrong. Please try again later.');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-100 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-red-100 rounded-full opacity-20 animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-yellow-100 rounded-full opacity-20 animate-pulse delay-500"></div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center z-10 px-8"
          >
            <div className="relative -mb-4 -z-20">
              <div className="absolute inset-0 w-40 h-40 mx-auto rounded-full bg-gradient-to-r from-orange-400 to-red-500 opacity-10 animate-ping"></div>
              <div className="relative bg-white rounded-2xl shadow-xl p-4 mx-auto w-fit">
                <img src="/assets/images/carbar.png" alt="CarBar logo" className="w-24 h-auto mx-auto" />
              </div>
            </div>

            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 relative">
                  <div className="absolute inset-0 bg-white rounded-full flex items-center justify-center">
                    <span className="text-red-500 font-bold text-lg">!</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h1 className="text-3xl font-bold text-red-600 tracking-wide">Something went wrong</h1>
              <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">
                An unexpected error occurred. Don't worry, we're on it!
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              Refresh Page
            </motion.button>

            <div className="flex justify-center space-x-2 mt-6">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </motion.div>

          <div className="absolute top-20 left-10 w-3 h-3 bg-orange-300 rounded-full animate-bounce opacity-60"></div>
          <div className="absolute bottom-20 right-10 w-2 h-2 bg-red-300 rounded-full animate-bounce delay-300 opacity-60"></div>
          <div className="absolute top-1/3 right-20 w-4 h-4 bg-yellow-300 rounded-full animate-bounce delay-700 opacity-40"></div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;