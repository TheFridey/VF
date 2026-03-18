'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createVideoSocket, getIncomingCallStorageKey, IncomingCallPayload, VideoIceServer } from '@/lib/video-client';
import { cn } from '@/lib/utils';

type CallStage = 'preparing' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'error';

export default function VideoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectionId = searchParams.get('connectionId') || '';
  const peerId = searchParams.get('peerId') || '';
  const peerName = searchParams.get('peerName') || 'Veteran';
  const peerPhotoUrl = searchParams.get('peerPhotoUrl') || undefined;
  const existingCallId = searchParams.get('callId');
  const isIncoming = searchParams.get('incoming') === '1';

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(existingCallId);
  const iceServersRef = useRef<VideoIceServer[]>([]);
  const [callStage, setCallStage] = useState<CallStage>(isIncoming ? 'preparing' : 'connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const incomingCallPayload = useMemo<IncomingCallPayload | null>(() => {
    if (!isIncoming || !existingCallId || typeof window === 'undefined') {
      return null;
    }

    const raw = sessionStorage.getItem(getIncomingCallStorageKey(existingCallId));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as IncomingCallPayload;
    } catch {
      return null;
    }
  }, [existingCallId, isIncoming]);

  useEffect(() => {
    if (incomingCallPayload?.iceServers) {
      iceServersRef.current = incomingCallPayload.iceServers;
    }
  }, [incomingCallPayload]);

  const cleanupMedia = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionRef.current?.close();
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    peerConnectionRef.current = null;
  };

  const ensureLocalMedia = async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  };

  const ensurePeerConnection = async (iceServers: VideoIceServer[]) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const stream = await ensureLocalMedia();
    const peer = new RTCPeerConnection({ iceServers });
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    peer.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      setCallStage('connected');
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current || !callIdRef.current) {
        return;
      }

      socketRef.current.emit('webrtc:ice-candidate', {
        callId: callIdRef.current,
        candidate: event.candidate.toJSON(),
      });
    };

    peerConnectionRef.current = peer;
    return peer;
  };

  const createOffer = async () => {
    if (!socketRef.current || !callIdRef.current) {
      return;
    }

    const peer = await ensurePeerConnection(iceServersRef.current);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socketRef.current.emit('webrtc:offer', {
      callId: callIdRef.current,
      offer,
    });
  };

  useEffect(() => {
    if (!connectionId || !peerId) {
      setCallStage('error');
      setErrorMessage('Missing call details.');
      return;
    }

    let cancelled = false;

    const connect = async () => {
      try {
        const { token } = await api.createSocketToken();
        if (cancelled || !token) {
          return;
        }

        const socket = createVideoSocket(token);
        socketRef.current = socket;

        socket.on('connect', async () => {
          try {
            await ensureLocalMedia();

            if (isIncoming && existingCallId) {
              callIdRef.current = existingCallId;
              setCallStage('connecting');
              await ensurePeerConnection(iceServersRef.current);
              socket.emit('call:accept', { callId: existingCallId });
              sessionStorage.removeItem(getIncomingCallStorageKey(existingCallId));
              return;
            }

            socket.emit('call:initiate', { connectionId, calleeId: peerId });
          } catch {
            setCallStage('error');
            setErrorMessage('Camera or microphone access was denied.');
          }
        });

        socket.on('call:ringing', async ({ callId, iceServers }: { callId: string; iceServers: VideoIceServer[] }) => {
          callIdRef.current = callId;
          iceServersRef.current = iceServers || [];
          setCallStage('ringing');
          await ensurePeerConnection(iceServersRef.current);
        });

        socket.on('call:accepted', async ({ callId, iceServers }: { callId: string; iceServers: VideoIceServer[] }) => {
          callIdRef.current = callId;
          iceServersRef.current = iceServers || iceServersRef.current;
          setCallStage('connecting');
          await createOffer();
        });

        socket.on('call:connected', async ({ callId, iceServers }: { callId: string; iceServers: VideoIceServer[] }) => {
          callIdRef.current = callId;
          iceServersRef.current = iceServers || iceServersRef.current;
          setCallStage('connecting');
          await ensurePeerConnection(iceServersRef.current);
        });

        socket.on('webrtc:offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
          const peer = await ensurePeerConnection(iceServersRef.current);
          await peer.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          socket.emit('webrtc:answer', {
            callId: callIdRef.current,
            answer,
          });
        });

        socket.on('webrtc:answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          if (!peerConnectionRef.current) {
            return;
          }

          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStage('connected');
        });

        socket.on('webrtc:ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          if (!peerConnectionRef.current || !candidate) {
            return;
          }

          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on('call:ended', ({ reason }: { reason?: string }) => {
          cleanupMedia();
          setCallStage('ended');

          if (reason && reason !== 'ended' && reason !== 'disconnected') {
            toast.error(reason.replace(/_/g, ' '));
          }
        });

        socket.on('call:error', ({ message }: { message?: string }) => {
          setCallStage('error');
          setErrorMessage(message || 'Unable to start the call.');
        });
      } catch {
        setCallStage('error');
        setErrorMessage('Unable to connect to live calling right now.');
      }
    };

    void connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      cleanupMedia();
    };
  }, [connectionId, existingCallId, isIncoming, peerId]);

  const handleEndCall = () => {
    if (socketRef.current && callIdRef.current) {
      socketRef.current.emit('call:end', { callId: callIdRef.current });
    }

    cleanupMedia();
    setCallStage('ended');
    setTimeout(() => {
      router.push(`/app/messages?match=${connectionId}`);
    }, 350);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
  };

  const toggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextVideoOff;
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#07111b,#020617)] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={`/app/messages?match=${connectionId}`} className="rounded-full border border-white/10 p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-200/70">Video Call</p>
            <p className="text-sm text-white/70">
              {callStage === 'ringing' && 'Ringing...'}
              {callStage === 'connecting' && 'Connecting...'}
              {callStage === 'connected' && 'Live'}
              {callStage === 'preparing' && 'Preparing your devices...'}
              {callStage === 'ended' && 'Call ended'}
              {callStage === 'error' && 'Call unavailable'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{peerName}</p>
        </div>
      </div>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/40 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <video ref={remoteVideoRef} className="h-full min-h-[420px] w-full object-cover" autoPlay playsInline />
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/15 via-transparent to-black/45">
            {callStage !== 'connected' && (
              <div className="text-center">
                {(callStage === 'preparing' || callStage === 'connecting') && (
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-300" />
                )}
                {callStage === 'ringing' && <Phone className="mx-auto h-8 w-8 animate-pulse text-sky-300" />}
                {(callStage === 'error' || callStage === 'ended') && (
                  <PhoneOff className="mx-auto h-8 w-8 text-rose-300" />
                )}
                <p className="mt-4 text-lg font-semibold">{peerName}</p>
                <p className="mt-2 text-sm text-white/70">
                  {errorMessage || (callStage === 'ringing' ? 'Waiting for the other person to answer.' : 'Setting up your connection.')}
                </p>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 right-4 h-28 w-40 overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-xl">
            <video ref={localVideoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <Avatar src={peerPhotoUrl} name={peerName} size="lg" />
              <div>
                <p className="font-semibold">{peerName}</p>
                <p className="text-sm text-white/65">BIA live call</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Video calls run through the secure BIA connection between you and the selected conversation.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleMute}
                className={cn(
                  'rounded-full p-4 transition-colors',
                  isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/15',
                )}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                onClick={handleEndCall}
                className="rounded-full bg-rose-500 p-4 text-white transition-colors hover:bg-rose-400"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
              <button
                onClick={toggleVideo}
                className={cn(
                  'rounded-full p-4 transition-colors',
                  isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/15',
                )}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-4 text-center text-xs text-white/55">
              Mute your mic, turn video on or off, or leave the call at any time.
            </div>
          </div>

          {(callStage === 'ended' || callStage === 'error') && (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <Button onClick={() => router.push(`/app/messages?match=${connectionId}`)} className="w-full">
                Back to messages
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
