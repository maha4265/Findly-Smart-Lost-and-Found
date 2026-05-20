import "dotenv/config";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import app from "./app.js";
import { connectDb } from "./utils/db.js";

const basePort = parseInt(process.env.PORT, 10) || 5000;
const SECRET = process.env.JWT_SECRET || "secretkey";
await connectDb();

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
  if (!token) {
    return next();
  }

  const cleanedToken = token.startsWith("Bearer ") ? token.slice(7) : token;
  try {
    socket.user = jwt.verify(cleanedToken, SECRET);
  } catch (error) {
    console.warn("Socket auth failed", error.message);
  }
  next();
});

io.on("connection", (socket) => {
  console.log("Socket connected", socket.id, socket.user?.email || "anonymous");
});

async function listenWithFallback(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;

    const attemptListen = () => {
      const handleListening = () => resolve(currentPort);
      const handleError = (error) => {
        if (error.code === "EADDRINUSE" && currentPort < startPort + maxAttempts) {
          const nextPort = currentPort + 1;
          console.warn(`Port ${currentPort} is in use. Trying ${nextPort} instead.`);
          cleanup();
          currentPort = nextPort;
          server.listen(currentPort);
          server.once("listening", handleListening);
          server.once("error", handleError);
          return;
        }
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        server.removeListener("listening", handleListening);
        server.removeListener("error", handleError);
      };

      server.once("listening", handleListening);
      server.once("error", handleError);
      server.listen(currentPort);
    };

    attemptListen();
  });
}

const port = await listenWithFallback(basePort, 20);

console.log(`Findly API running on http://localhost:${port}`);
