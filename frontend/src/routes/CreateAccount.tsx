// CreateAccount.tsx
import React, { useState } from "react";
import { register } from "../Firebase";
import { useNavigate } from "react-router-dom"; // or useHistory for react-router v5

const CreateAccount: React.FC = () => {
  //const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await register(email, password, setError, () => navigate("/"));
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div className="items-center justify-center p-4 grid auto-rows-auto gap-4 place-items-center">
        <h2 className="text-white text-2xl font-bold">Create Account</h2>
        <form
          onSubmit={handleRegister}
          className="grid auto-rows-auto gap-4 place-items-center font-bold"
        >
          <div className="flex flex-col w-50">
            {/* 
            <label htmlFor="username" className="text-white mb-1">
              Username:
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-gray-700 text-center text-white border border-gray-600 rounded py-2 px-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            */}
          </div>

          <div className="flex flex-col w-50">
            <label htmlFor="email" className="text-white mb-1">
              Email:
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-700 text-center text-white border border-gray-600 rounded py-2 px-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex flex-col w-50">
            <label htmlFor="password" className="text-white mb-1">
              Password:
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-700 text-center text-white border border-gray-600 rounded py-2 px-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex-none w-50 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-105"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <body className="justify-center max-w-sm">
          You do not need to make an account to play! Making an account allows
          you to build your own decks. If you are not logged in, your deck will
          be selected randomly.
        </body>
      </div>
    </div>
  );
};

export default CreateAccount;
