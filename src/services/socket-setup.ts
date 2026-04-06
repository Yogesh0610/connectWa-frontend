import { io, type Socket } from "socket.io-client";
import { getSession } from "next-auth/react";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";

// Create a no-op socket stub if URL is not configured
function createSocket(): Socket {
  if (!SOCKET_URL) {
    console.warn("[Socket] NEXT_PUBLIC_SOCKET_URL is not set — socket disabled");
    // Return a minimal stub that won't throw
    return io("http://localhost:__disabled__", { autoConnect: false }) as Socket;
  }
  return io(SOCKET_URL, {
    autoConnect: false,
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
    upgrade: true,
    rememberUpgrade: true,
    auth: async (cb) => {
      const session = await getSession();
      const token = session?.accessToken;
      cb({ token });
    },
  });
}

export const socket: Socket = createSocket();
