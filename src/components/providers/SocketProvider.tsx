"use client";
import { SOCKET } from "@/src/constants/socket";
import { socket } from "@/src/services/socket-setup";
import { SocketProviderProps } from "@/src/types/components";
import { useSocketHandler } from "@/src/utils/hooks/useSocketHandler";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const SocketProvider = ({ children }: SocketProviderProps) => {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const userId = session?.user?.id;
  const [socketError, setSocketError] = useState(false);

  useSocketHandler();

  useEffect(() => {
    if (isAuthenticated && userId) {
      if (!socket.connected) {
        socket.connect();
      }

      const handleConnect = () => {
        setSocketError(false);
        socket.emit(SOCKET.Emitters.Join_Room, userId);
        socket.emit(SOCKET.Emitters.Set_Online);
        socket.emit(SOCKET.Emitters.Request_Status_Update);
      };

      const handleConnectError = (error: Error) => {
        console.error("Socket connection failed:", error);
        setSocketError(true);
      };

      const handleDisconnect = (_reason: string) => {
        // intentionally silent
      };

      socket.on("connect", handleConnect);
      socket.on("connect_error", handleConnectError);
      socket.on("disconnect", handleDisconnect);

      if (socket.connected) {
        socket.emit(SOCKET.Emitters.Join_Room, userId);
      }

      return () => {
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleConnectError);
        socket.off("disconnect", handleDisconnect);
      };
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  }, [isAuthenticated, userId]);

  return (
    <>
      {socketError && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-xs text-center py-1 px-4">
          Real-time connection lost — some updates may be delayed.{" "}
          <button onClick={() => { setSocketError(false); socket.connect(); }} className="underline font-semibold">
            Reconnect
          </button>
        </div>
      )}
      {children}
    </>
  );
};

export default SocketProvider;
