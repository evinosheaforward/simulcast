import "regenerator-runtime/runtime";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import PlayerBoard from "./PlayerBoard";
import Root from "./routes/root";
import ErrorPage from "./error-page";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/game",
    element: <PlayerBoard />,
    errorElement: <ErrorPage />,
  },
]);

const container = document.getElementById("root");

if (!container) {
  throw new Error("Failed to find the root element");
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
