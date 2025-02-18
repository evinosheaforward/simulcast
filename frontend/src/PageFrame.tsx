import React, { ReactNode, useEffect } from "react";

interface PageFrameProps {
  children: ReactNode;
}

const PageFrame: React.FC<PageFrameProps> = ({ children }) => {
  useEffect(() => {
    document.title = "SimulCast";
  }, []);

  return (
    <>
      <head>
        <link rel="icon" type="image/png" href="/images/Goblet.png" />
        <title>SimulCast</title>
      </head>
      <div className="min-h-screen bg-gradient-to-br from-gray-600 rounded-t to-black text-white">
        <div className="grid place-items-center text-center text-white rounded-lg">
          <header className="w-full max-w-4xl bg-gray-900 place-items-center text-white py-4 shadow-xl">
            <h1 className="text-4xl font-extrabold text-white mb-1 text-center">
              <a href="/">SimulCast</a>
            </h1>
          </header>
        </div>

        <div className="grid h-full overflow-y-auto place-items-center">
          <div className="w-full max-w-4xl bg-gray-900 rounded-b shadow-xl gap-1">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default PageFrame;
