// Login.tsx
import React, { useState } from "react";
import { login } from "../Firebase";
import { Link } from "react-router-dom";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await login(email, password, setError);
    setLoading(false);
  };

  return (
    <div className="flex-shrink-0 items-center justify-center p-4 grid auto-rows-auto gap-4 place-items-center">
      <h2 className="text-white text-2xl font-bold">Login</h2>
      <form
        onSubmit={handleLogin}
        className="grid auto-rows-auto gap-4 place-items-center"
      >
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="text-white">
        Don't have an account?{" "}
        <Link to="/signup" className="text-red-500 hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
};

export default Login;
