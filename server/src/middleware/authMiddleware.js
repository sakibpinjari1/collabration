import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  console.log("🔐 AUTH CHECK - Headers:", req.headers.authorization ? "Present" : "Missing");

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    console.log("✅ Token extracted:", token.substring(0, 20) + "...");
  }

  if (!token) {
    console.log("❌ No token found");
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    console.log("🔍 JWT_SECRET:", process.env.JWT_SECRET ? "Loaded" : "MISSING!");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token verified, decoded:", decoded);

    // 🔑 SINGLE SOURCE OF TRUTH
    const user = await User.findById(decoded.userId).select("-passwordHash");
    console.log("✅ User found:", user?._id);

    if (!user) {
      console.log("❌ User not found for userId:", decoded.userId);
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;        // ✅ canonical
    req.userId = user._id;  // ✅ keep as ObjectId

    next();
  } catch (error) {
    console.log("❌ Auth error:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};
