"use client";

import { useEffect, useState } from "react";
import { socket } from "@/src/services/socket-setup";

export interface IncomingCallPayload {
  waCallId: string;
  callLogId: string;
  phoneNumberId: string;
  contact: { _id: string; name: string; phone_number: string } | null;
  agentName: string;
}

export function useIncomingCall() {
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  useEffect(() => {
    const handleIncoming = (payload: IncomingCallPayload) => {
      setIncomingCall(payload);
    };

    const handleMissed = ({ waCallId }: { waCallId: string }) => {
      setIncomingCall((prev) => (prev?.waCallId === waCallId ? null : prev));
      setActiveCallId((prev) => (prev === waCallId ? null : prev));
    };

    const handleEnded = ({ waCallId }: { waCallId: string }) => {
      setIncomingCall((prev) => (prev?.waCallId === waCallId ? null : prev));
      setActiveCallId((prev) => (prev === waCallId ? null : prev));
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:missed", handleMissed);
    socket.on("call:ended", handleEnded);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:missed", handleMissed);
      socket.off("call:ended", handleEnded);
    };
  }, []);

  // Accept: keep incomingCall alive so IncomingCallModal can render ActiveCallPanel
  const acceptCall = (waCallId: string) => {
    setActiveCallId(waCallId);
  };

  const endCall = () => {
    setActiveCallId(null);
    setIncomingCall(null);
  };

  const dismiss = () => setIncomingCall(null);

  return { incomingCall, activeCallId, acceptCall, endCall, dismiss };
}
