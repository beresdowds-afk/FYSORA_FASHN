import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------- Mocks ----------

// In-memory broadcast bus shared by all "supabase channels" so two peers can talk.
type Listener = (payload: any) => void;
const bus: Record<string, Record<string, Listener[]>> = {};

function makeChannel(_room: string) {
  const room = _room;
  if (!bus[room]) bus[room] = {};
  let subscribed = false;
  const self = {
    on(_kind: string, opts: { event: string }, cb: Listener) {
      if (!bus[room][opts.event]) bus[room][opts.event] = [];
      bus[room][opts.event].push((p) => cb({ payload: p }));
      return self;
    },
    send(msg: { type: string; event: string; payload: any }) {
      // Deliver async to mirror real Realtime
      setTimeout(() => {
        (bus[room][msg.event] || []).forEach((l) => l(msg.payload));
      }, 0);
    },
    subscribe(cb?: (status: string) => void) {
      subscribed = true;
      setTimeout(() => cb?.("SUBSCRIBED"), 0);
      return self;
    },
    unsubscribe() { subscribed = false; },
  };
  return self;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (name: string) => makeChannel(name),
  },
}));

// Minimal fake MediaStream / RTCPeerConnection
class FakeMediaStreamTrack {
  kind: string;
  enabled = true;
  constructor(kind: string) { this.kind = kind; }
  stop() { /* noop */ }
}
class FakeMediaStream {
  private tracks: FakeMediaStreamTrack[];
  constructor(tracks: FakeMediaStreamTrack[]) { this.tracks = tracks; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter((t) => t.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter((t) => t.kind === "video"); }
}

(globalThis as any).MediaStream = FakeMediaStream;
(globalThis as any).navigator = (globalThis as any).navigator || {};
(globalThis as any).navigator.mediaDevices = {
  getUserMedia: vi.fn(async () =>
    new FakeMediaStream([new FakeMediaStreamTrack("video"), new FakeMediaStreamTrack("audio")])
  ),
};

// Track constructed RTCPeerConnections so we can pair them.
const allPCs: any[] = [];

class FakeRTCPeerConnection {
  connectionState: string = "new";
  ontrack: ((ev: any) => void) | null = null;
  onicecandidate: ((ev: any) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  private addedTracks: any[] = [];
  constructor(_cfg: any) { allPCs.push(this); }
  addTrack(track: any, _stream: any) { this.addedTracks.push(track); }
  async createOffer() { return { type: "offer", sdp: "fake-offer" }; }
  async createAnswer() { return { type: "answer", sdp: "fake-answer" }; }
  async setLocalDescription(_d: any) {
    // Emulate ICE gathering
    setTimeout(() => this.onicecandidate?.({ candidate: { candidate: "fake-ice" } }), 0);
  }
  async setRemoteDescription(_d: any) {
    // When remote desc set, simulate inbound track
    setTimeout(() => {
      const remote = new FakeMediaStream([new FakeMediaStreamTrack("video")]);
      this.ontrack?.({ streams: [remote] });
      this.connectionState = "connected";
      this.onconnectionstatechange?.();
    }, 0);
  }
  async addIceCandidate(_c: any) { /* noop */ }
  close() { this.connectionState = "closed"; }
}
(globalThis as any).RTCPeerConnection = FakeRTCPeerConnection;
(globalThis as any).RTCSessionDescription = function (x: any) { return x; };
(globalThis as any).RTCIceCandidate = function (x: any) { return x; };

// ---------- Tests ----------

import { useWebRTC } from "@/hooks/useWebRTC";

describe("useWebRTC end-to-end signaling", () => {
  beforeEach(() => {
    for (const k of Object.keys(bus)) delete bus[k];
    allPCs.length = 0;
  });

  it("two peers complete the offer/answer/ICE handshake", async () => {
    const bookingId = "book-123";

    const initiator = renderHook(() =>
      useWebRTC({ bookingId, userId: "admin-1", isInitiator: true })
    );
    const callee = renderHook(() =>
      useWebRTC({ bookingId, userId: "customer-1", isInitiator: false })
    );

    await act(async () => {
      await initiator.result.current.startCall();
      await callee.result.current.startCall();
      // let async signaling drain
      await new Promise((r) => setTimeout(r, 200));
    });

    // Both peers obtained local stream
    expect(initiator.result.current.localStream).toBeTruthy();
    expect(callee.result.current.localStream).toBeTruthy();

    // Both peers received a remote stream via ontrack
    expect(initiator.result.current.remoteStream).toBeTruthy();
    expect(callee.result.current.remoteStream).toBeTruthy();

    // Both peers report connected
    expect(initiator.result.current.connected).toBe(true);
    expect(callee.result.current.connected).toBe(true);
  });

  it("toggleMute disables audio tracks on local stream", async () => {
    const { result } = renderHook(() =>
      useWebRTC({ bookingId: "b", userId: "u", isInitiator: true })
    );
    await act(async () => {
      await result.current.startCall();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.isMuted).toBe(false);
    act(() => result.current.toggleMute());
    expect(result.current.isMuted).toBe(true);
    expect(result.current.localStream?.getAudioTracks()[0].enabled).toBe(false);
  });

  it("toggleCamera disables video tracks on local stream", async () => {
    const { result } = renderHook(() =>
      useWebRTC({ bookingId: "b2", userId: "u2", isInitiator: true })
    );
    await act(async () => {
      await result.current.startCall();
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => result.current.toggleCamera());
    expect(result.current.isCameraOff).toBe(true);
    expect(result.current.localStream?.getVideoTracks()[0].enabled).toBe(false);
  });

  it("endCall stops tracks and closes peer connection", async () => {
    const { result } = renderHook(() =>
      useWebRTC({ bookingId: "b3", userId: "u3", isInitiator: true })
    );
    await act(async () => {
      await result.current.startCall();
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => result.current.endCall());
    expect(result.current.localStream).toBeNull();
    expect(allPCs[0].connectionState).toBe("closed");
  });

  it("sets error when getUserMedia is denied", async () => {
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(new Error("denied"));
    const { result } = renderHook(() =>
      useWebRTC({ bookingId: "b4", userId: "u4", isInitiator: true })
    );
    await act(async () => {
      await result.current.startCall();
    });
    expect(result.current.error).toMatch(/Camera\/microphone/);
  });
});
