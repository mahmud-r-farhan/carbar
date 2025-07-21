import React from 'react';

const Loading = ({ loading = true }) => {
  if (!loading) return null;

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-100 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-yellow-100 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-amber-100 rounded-full opacity-20 animate-pulse delay-500"></div>
      </div>

      <div className="text-center z-10 px-8">
        {/* Main logo/icon area */}
        <div className="relative mb-8">
          {/* Pulsing outer ring */}
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-orange-400 to-yellow-500 opacity-20 animate-ping"></div>

          {/* Car icon with rotation */}
          <div className="relative w-24 h-24 mx-auto bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-12 h-8 relative">
              {/* Car body */}
              <div className="absolute inset-0 bg-white rounded-lg transform rotate-0 animate-bounce">
                <div className="w-full h-full bg-white rounded-lg relative overflow-hidden">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-4 bg-orange-600 rounded-t-lg"></div>
                  <div className="absolute bottom-0 left-1 w-2 h-2 bg-gray-700 rounded-full"></div>
                  <div className="absolute bottom-0 right-1 w-2 h-2 bg-gray-700 rounded-full"></div>
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-orange-300 rounded-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-200"></div>
        </div>

        {/* App name and tagline */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-800 tracking-wide">
            CarBar
          </h2>
          <p className="text-gray-600 text-sm font-medium">
            Finding your perfect ride...
          </p>
        </div>

        {/* Loading bar */}
        <div className="mt-8 w-64 mx-auto">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Status messages */}
        <div className="mt-6 h-6">
          <p className="text-xs text-gray-500 animate-pulse">
            Connecting to nearby drivers...
          </p>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-3 h-3 bg-orange-300 rounded-full animate-bounce opacity-60"></div>
      <div className="absolute bottom-20 right-10 w-2 h-2 bg-yellow-300 rounded-full animate-bounce delay-300 opacity-60"></div>
      <div className="absolute top-1/3 right-20 w-4 h-4 bg-amber-300 rounded-full animate-bounce delay-700 opacity-40"></div>
    </div>
  );
};

export default Loading;