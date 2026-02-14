import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseWebRTCOptions {
  bookingId: string;
  userId: string;
  isInitiator: boolean;
}

interface PeerState {
  connected: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = ({ bookingId, userId, isInitiator }: UseWebRTCOptions) => {
  const [peerState, setPeerState] = useState<PeerState>({
    connected: false,
    remoteStream: null,
    localStream: null,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const roomName = `video-call-${bookingId}`;

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      });
      localStreamRef.current = stream;
      setPeerState((prev) => ({ ...prev, localStream: stream }));
      return stream;
    } catch (err) {
      setError("Camera/microphone access denied. Please allow access and try again.");
      return null;
    }
  }, []);

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setPeerState((prev) => ({ ...prev, remoteStream }));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channelRef.current?.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: event.candidate, from: userId },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        setPeerState((prev) => ({
          ...prev,
          connected: state === "connected",
        }));
        if (state === "failed") {
          setError("Connection failed. Please try again.");
        }
      };

      return pc;
    },
    [userId]
  );

  const startCall = useCallback(async () => {
    const stream = await getLocalStream();
    if (!stream) return;

    const pc = createPeerConnection(stream);

    // Set up Supabase Realtime channel for signaling
    const channel = supabase.channel(roomName, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === userId) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { answer, from: userId },
        });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === userId) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from === userId) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.warn("Failed to add ICE candidate:", e);
        }
      })
      .on("broadcast", { event: "peer-joined" }, async ({ payload }) => {
        if (payload.from === userId) return;
        // When a new peer joins, the initiator creates an offer
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: "broadcast",
            event: "offer",
            payload: { offer, from: userId },
          });
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Announce arrival
          channel.send({
            type: "broadcast",
            event: "peer-joined",
            payload: { from: userId },
          });

          // If initiator and first to join, create offer after short delay
          if (isInitiator) {
            setTimeout(async () => {
              if (pc.connectionState === "new") {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                channel.send({
                  type: "broadcast",
                  event: "offer",
                  payload: { offer, from: userId },
                });
              }
            }, 1000);
          }
        }
      });
  }, [bookingId, userId, isInitiator, getLocalStream, createPeerConnection, roomName]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff((prev) => !prev);
    }
  }, []);

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    channelRef.current?.unsubscribe();
    setPeerState({ connected: false, remoteStream: null, localStream: null });
  }, []);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      channelRef.current?.unsubscribe();
    };
  }, []);

  return {
    ...peerState,
    isMuted,
    isCameraOff,
    error,
    startCall,
    toggleMute,
    toggleCamera,
    endCall,
  };
};
