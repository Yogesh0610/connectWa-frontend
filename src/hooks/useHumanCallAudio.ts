"use client";

import { useEffect, useRef } from "react";
import { socket } from "@/src/services/socket-setup";

/**
 * After a human agent accepts a WhatsApp call, this hook:
 *  - Captures microphone audio and sends raw PCM to the server via socket
 *  - Receives incoming PCM frames from the server and plays them through speakers
 *
 * Audio format expected by @roamhq/wrtc RTCAudioSource: 48 kHz, mono, Int16
 */
export function useHumanCallAudio(waCallId: string | null) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Schedule outgoing audio frames in order so they don't overlap
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!waCallId) return;

    let active = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioCtx = new AudioContext({ sampleRate: 48000 });
        audioCtxRef.current = audioCtx;
        nextPlayTimeRef.current = audioCtx.currentTime;

        // ── Mic capture → socket ──────────────────────────────────────────────
        const source = audioCtx.createMediaStreamSource(stream);
        // 480 samples = 10 ms at 48 kHz (matches wrtc frame size)
        const processor = audioCtx.createScriptProcessor(480, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!active) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32768)));
          }
          // Encode as base64 and ship to server
          const bytes = new Uint8Array(int16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          socket.emit("call:audio:to_contact", { waCallId, pcmBase64: btoa(binary) });
        };

        source.connect(processor);
        // Connect to destination is required for ScriptProcessor to fire even though
        // we're not actually sending this to the speakers
        processor.connect(audioCtx.destination);

        // ── Server → speaker ──────────────────────────────────────────────────
        const handleAudio = ({ waCallId: id, pcm, sampleRate }: { waCallId: string; pcm: string; sampleRate: number }) => {
          if (id !== waCallId || !active) return;

          const ctx = audioCtxRef.current;
          if (!ctx) return;

          // Decode base64 → Int16Array → Float32Array
          const binary = atob(pcm);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const int16 = new Int16Array(bytes.buffer);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

          const rate = sampleRate || 48000;
          const buffer = ctx.createBuffer(1, float32.length, rate);
          buffer.getChannelData(0).set(float32);

          const bufSource = ctx.createBufferSource();
          bufSource.buffer = buffer;
          bufSource.connect(ctx.destination);

          // Schedule playback so frames play back-to-back without gaps/overlaps
          const now = ctx.currentTime;
          if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now;
          bufSource.start(nextPlayTimeRef.current);
          nextPlayTimeRef.current += buffer.duration;
        };

        socket.on("call:audio:from_contact", handleAudio);

        // Store cleanup ref
        (streamRef.current as any)._cleanup = () => {
          socket.off("call:audio:from_contact", handleAudio);
        };
      } catch (err) {
        console.error("[HumanCallAudio] Failed to start audio bridge:", err);
      }
    };

    start();

    return () => {
      active = false;

      if ((streamRef.current as any)?._cleanup) {
        (streamRef.current as any)._cleanup();
      }

      streamRef.current?.getTracks().forEach((t) => t.stop());
      processorRef.current?.disconnect();
      audioCtxRef.current?.close();

      streamRef.current = null;
      processorRef.current = null;
      audioCtxRef.current = null;
    };
  }, [waCallId]);
}
