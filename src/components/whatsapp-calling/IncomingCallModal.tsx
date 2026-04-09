/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/src/elements/ui/button";
import { useHumanCallAudio } from "@/src/hooks/useHumanCallAudio";
import { IncomingCallPayload } from "@/src/hooks/useIncomingCall";
import { useAnswerHumanCallMutation, useRejectHumanCallMutation } from "@/src/redux/api/whatsappCallingApi";
import { Mic, MicOff, Phone, PhoneOff, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  call: IncomingCallPayload;
  activeCallId: string | null;
  onAccepted: (waCallId: string) => void;
  onEnded: () => void;
  onDismiss: () => void;
}

function useElapsedSeconds() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ── Active call panel (shown after accepting) ──────────────────────────────────
function ActiveCallPanel({ call, onEnded }: { call: IncomingCallPayload; onEnded: () => void }) {
  const [rejectCall, { isLoading }] = useRejectHumanCallMutation();
  const [muted, setMuted] = useState(false);
  const timer = useElapsedSeconds();

  // Start the audio bridge (mic → server → Meta, Meta → server → speaker)
  useHumanCallAudio(muted ? null : call.waCallId);

  const handleHangUp = async () => {
    // Optimistically close the UI immediately — the server will also emit call:ended
    // via socket which triggers onEnded in useIncomingCall, but calling it here too
    // ensures the panel disappears even if the socket event is delayed.
    onEnded();
    try {
      await rejectCall({ waCallId: call.waCallId, callLogId: call.callLogId }).unwrap();
    } catch {
      // ignore — call may already be terminated on server
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-(--card-color) rounded-2xl shadow-2xl border border-slate-200 dark:border-(--card-border-color) overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-green-600 px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-green-100 font-medium uppercase tracking-wide">Active Call</p>
          <p className="text-white font-semibold text-sm">{call.agentName}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
          <span className="text-green-100 text-xs font-mono">{timer}</span>
        </div>
      </div>

      {/* Contact */}
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-(--dark-body) flex items-center justify-center shrink-0">
          <User size={20} className="text-slate-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">{call.contact?.name || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{call.contact?.phone_number || "—"}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => setMuted((m) => !m)}
          className={`h-11 rounded-xl gap-2 text-sm ${muted ? "border-amber-300 text-amber-600 bg-amber-50" : ""}`}
        >
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
          {muted ? "Unmute" : "Mute"}
        </Button>
        <Button
          onClick={handleHangUp}
          disabled={isLoading}
          className="h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2 text-sm"
        >
          <PhoneOff size={16} />
          Hang Up
        </Button>
      </div>
    </div>
  );
}

// ── Incoming ringing modal ─────────────────────────────────────────────────────
export default function IncomingCallModal({ call, activeCallId, onAccepted, onEnded, onDismiss }: Props) {
  const [answerCall, { isLoading: isAnswering }] = useAnswerHumanCallMutation();
  const [rejectCall, { isLoading: isRejecting }] = useRejectHumanCallMutation();

  // If this call is already active (answered), show the active panel
  if (activeCallId === call.waCallId) {
    return <ActiveCallPanel call={call} onEnded={onEnded} />;
  }

  const handleAccept = async () => {
    try {
      await answerCall({ waCallId: call.waCallId, callLogId: call.callLogId }).unwrap();
      onAccepted(call.waCallId);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to connect call");
    }
  };

  const handleReject = async () => {
    try {
      await rejectCall({ waCallId: call.waCallId, callLogId: call.callLogId }).unwrap();
      onDismiss();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to reject call");
      onDismiss();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-(--card-color) rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-primary px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Incoming WhatsApp Call</p>
          <p className="text-lg font-bold mt-1">{call.agentName}</p>
        </div>

        {/* Contact info */}
        <div className="px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-(--dark-body) flex items-center justify-center shrink-0">
            <User size={28} className="text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-base">{call.contact?.name || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{call.contact?.phone_number || "—"}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isAnswering || isRejecting}
            className="h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-2"
          >
            <PhoneOff size={18} />
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isAnswering || isRejecting}
            className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Phone size={18} />
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
