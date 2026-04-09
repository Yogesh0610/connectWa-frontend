"use client";

import { useEffect, useRef } from "react";
import { socket } from "@/src/services/socket-setup";

/**
 * After a human agent accepts a WhatsApp call, this hook:
 *  - Captures microphone audio and sends raw PCM to the server via socket
 *  - Receives incoming PCM frames from the server and plays them through speakers
 *
 * Audio path:
 *   Mic  → getUserMedia → ScriptProcessor(4096) → Int16 → base64 → socket → server → Meta WebRTC
 *   Meta → server WebRTC → socket → base64 → Int16 → Float32 → AudioBuffer → speaker
 */
export function useHumanCallAudio(waCallId: string | null) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const cleanupSocketRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!waCallId) return;

    let active = true;

    const start = async () => {
      try {
        // ── Request microphone ────────────────────────────────────────────
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        // ── AudioContext ──────────────────────────────────────────────────
        // Must be 48 kHz to match what @roamhq/wrtc RTCAudioSource expects
        const audioCtx = new AudioContext({ sampleRate: 48000 });
        audioCtxRef.current = audioCtx;

        // Browsers suspend AudioContext until a user gesture — resume it explicitly
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        nextPlayTimeRef.current = audioCtx.currentTime;

        // ── Mic capture → socket ──────────────────────────────────────────
        const source = audioCtx.createMediaStreamSource(stream);

        // IMPORTANT: createScriptProcessor only accepts: 256, 512, 1024, 2048, 4096, 8192, 16384
        // 480 (10 ms @ 48 kHz) is NOT valid and throws IndexSizeError in Chrome.
        // We use 4096 (~85 ms) and let the server chunk + resample.
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        // Mic gain: 3× boost so the agent's voice reaches the caller at adequate volume.
        // Clamp prevents clipping. Adjust if too loud.
        const MIC_GAIN = 3.0;

        processor.onaudioprocess = (e) => {
          if (!active) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const boosted = Math.max(-1, Math.min(1, float32[i] * MIC_GAIN));
            int16[i] = Math.round(boosted * 32767);
          }
          const bytes = new Uint8Array(int16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          socket.emit("call:audio:to_contact", { waCallId, pcmBase64: btoa(binary) });
        };

        source.connect(processor);
        // Must connect to destination for ScriptProcessor to fire (even though output goes to socket)
        processor.connect(audioCtx.destination);

        // ── Server PCM → speaker ──────────────────────────────────────────
        const handleAudio = ({
          waCallId: id,
          pcm,
          sampleRate,
        }: {
          waCallId: string;
          pcm: string;
          sampleRate: number;
        }) => {
          if (id !== waCallId || !active) return;

          const ctx = audioCtxRef.current;
          if (!ctx || ctx.state === "closed") return;

          // Decode base64 → bytes → Int16 → Float32
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

          // Schedule frames back-to-back so they play gaplessly
          const now = ctx.currentTime;
          if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now + 0.05; // small buffer
          bufSource.start(nextPlayTimeRef.current);
          nextPlayTimeRef.current += buffer.duration;
        };

        socket.on("call:audio:from_contact", handleAudio);
        cleanupSocketRef.current = () => socket.off("call:audio:from_contact", handleAudio);

        console.log("[HumanCallAudio] Audio bridge started for call", waCallId);
      } catch (err) {
        console.error("[HumanCallAudio] Failed to start audio bridge:", err);
      }
    };

    start();

    return () => {
      active = false;
      cleanupSocketRef.current?.();
      cleanupSocketRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      processorRef.current?.disconnect();
      audioCtxRef.current?.close().catch(() => {});
      streamRef.current = null;
      processorRef.current = null;
      audioCtxRef.current = null;
    };
  }, [waCallId]);
}
