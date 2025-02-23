import React, { ReactNode, useEffect } from "react";

interface PageFrameProps {
  children: ReactNode;
}
const isLoggedIn = false;

const PageFrame: React.FC<PageFrameProps> = ({ children }) => {
  useEffect(() => {
    document.title = "SimulCast";
  }, []);
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-600 rounded-t to-black text-white">
        <div className="grid place-items-center text-center">
          <div className="w-full max-w-4xl bg-gray-900 relative text-center text-white rounded-lg">
            <h1 className="justify-center text-4xl font-extrabold text-white text-center">
              <a href="/">SimulCast</a>
            </h1>
            <div className="m-2 flex absolute right-0 top-0 bg-red-600 hover:bg-red-700 text-white text-center font-bold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-101">
              {isLoggedIn ? (
                <button>Log Out</button>
              ) : (
                <a href="/login">Log In</a>
              )}
            </div>
          </div>
        </div>

        <div className="grid h-full overflow-y-auto place-items-center">
          <div className="w-full max-w-4xl bg-gray-900 rounded-b shadow-xl gap-1 mb-24">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default PageFrame;
