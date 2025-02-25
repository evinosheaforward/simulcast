import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

dotenv.config();

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

console.log("Using emulator at:", process.env.FIREBASE_AUTH_EMULATOR_HOST);

export const strictAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("strict auth: no token provided");
    res.status(401).json({ error: "No token provided" });
    return;
  }
  try {
    const decodedToken = await admin
      .auth()
      .verifyIdToken(authHeader.split(" ")[1]);
    console.log("strict auth: token validated");
    req.user = decodedToken; // attach user info to request
    next();
  } catch (error: any) {
    console.log("Auth error: ", error.toString());
    res.status(401).json({ error: "Invalid token" });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("optional auth: no token provided");
    req.user = undefined;
  } else {
    try {
      const decodedToken = await admin
        .auth()
        .verifyIdToken(authHeader.split(" ")[1]);
      req.user = decodedToken; // attach user info if valid
    } catch (error) {
      console.log("Optional auth failed:", error);
      req.user = undefined;
    }
  }
  next();
};
