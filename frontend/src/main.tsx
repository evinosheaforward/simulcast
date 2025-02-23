import "regenerator-runtime/runtime";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import PlayerBoard from "./PlayerBoard";
import ErrorPage from "./error-page";
import PageFrame from "./PageFrame";
import CreateAccount from "./routes/CreateAccount";
import Login from "./routes/Login";
import Root from "./routes/Root";

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
  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorPage />,
  },

  {
    path: "/signup",
    element: <CreateAccount />,
    errorElement: <ErrorPage />,
  },
]);

const container = document.getElementById("root");

if (!container) {
  throw new Error("Failed to find the root element");
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <head>
      <link rel="icon" type="image/png" href="/images/Diamond.png" />
      <title>SimulCast</title>
    </head>
    <PageFrame>
      <RouterProvider router={router} />
    </PageFrame>
  </React.StrictMode>,
);
