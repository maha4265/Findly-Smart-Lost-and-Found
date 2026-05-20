import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "secretkey";

export const auth = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : authorization;

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
