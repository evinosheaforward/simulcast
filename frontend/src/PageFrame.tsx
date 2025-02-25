import React, { ReactNode, useEffect, useState } from "react";
import { logout, useIsLoggedIn } from "./Firebase";

interface PageFrameProps {
  children: ReactNode;
}

const PageFrame: React.FC<PageFrameProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const isLoggedIn = useIsLoggedIn();

  useEffect(() => {
    document.title = "SimulCast";
  }, []);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await logout(setError);
    setLoading(false);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-600 rounded-t to-black text-white">
        <div className="grid place-items-center text-center">
          <div className="w-full max-w-4xl bg-gray-900 relative text-center text-white">
            <h1 className="justify-center text-4xl font-extrabold text-white text-center">
              <a href="/">SimulCast</a>
            </h1>
            <div className="inline-block group absolute right-0 top-0 w-24 mr-3">
              {isLoggedIn ? (
                <div className="bg-red-600 rounded cursor-pointer mt-3 text-white w-full text-center font-bold rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform">
                  Account
                </div>
              ) : (
                <div className="bg-gray-700 rounded cursor-pointer mt-3 text-white w-full text-center font-bold rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform">
                  Account
                </div>
              )}
              <div className="absolute bg-gray-700 text-white mt-1/2 text-center w-full rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <ul className="text-center">
                  {isLoggedIn ? (
                    <>
                      <li className="hover:bg-gray-500 cursor-pointer">
                        <a href="/decks">Deck Builder</a>
                      </li>
                      <li className="hover:bg-gray-500 cursor-pointer">
                        <button onClick={handleLogout} disabled={loading}>
                          {loading ? "Logging Out..." : "Log Out"}
                        </button>
                      </li>

                      {error && <li className="text-red-500">{error}</li>}
                    </>
                  ) : (
                    <>
                      <li className="hover:bg-gray-600 cursor-pointer">
                        <a href="/login">Log In</a>
                      </li>
                      <li className="hover:bg-gray-600 cursor-pointer">
                        <a href="/signup">Sign Up</a>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="grid place-items-center">
          <div className="w-full max-w-4xl bg-gray-900 rounded-b shadow-xl gap-1 mb-24 py-2">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default PageFrame;
