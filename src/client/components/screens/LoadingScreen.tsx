export const LoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      {/* Loading Animation */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-white
              animate-pulse bg-red-500 shadow-lg shadow-red-500/50`}
            style={{
              animationDelay: `${index * 200}ms`,
              animationDuration: '1000ms',
            }}
          />
        ))}
      </div>

      {/* Loading Text */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-yellow-400">LOADING...</h2>
        <div className="text-lg md:text-xl text-white">INITIALIZING F1 START CHALLENGE</div>
      </div>

      {/* Loading Progress Indicator */}
      <div className="w-64 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full animate-pulse"
          style={{ width: '100%' }}
        />
      </div>

      {/* Loading Messages */}
      <div className="text-center text-gray-400 text-sm">
        <p>PREPARING TIMING ENGINE...</p>
        <p>CALIBRATING REACTION SENSORS...</p>
        <p>CONNECTING TO REDDIT SERVERS...</p>
      </div>
    </div>
  );
};
