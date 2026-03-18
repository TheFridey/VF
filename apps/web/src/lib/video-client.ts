'use client';

import { io, Socket } from 'socket.io-client';

export type VideoIceServer = {
  urls: string[];
  username: string;
  credential: string;
};

export type IncomingCallPayload = {
  callId: string;
  callerId: string;
  callerName: string;
  callerImage?: string | null;
  connectionId: string;
  iceServers: VideoIceServer[];
};

function getSocketBaseUrl() {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  return window.location.origin;
}

export function createVideoSocket(token: string): Socket {
  return io(`${getSocketBaseUrl()}/video`, {
    path: '/socket.io',
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
}

export function buildVideoRoute(params: {
  connectionId: string;
  peerId: string;
  peerName?: string;
  peerPhotoUrl?: string | null;
  callId?: string;
  incoming?: boolean;
}) {
  const search = new URLSearchParams({
    connectionId: params.connectionId,
    peerId: params.peerId,
  });

  if (params.peerName) {
    search.set('peerName', params.peerName);
  }

  if (params.peerPhotoUrl) {
    search.set('peerPhotoUrl', params.peerPhotoUrl);
  }

  if (params.callId) {
    search.set('callId', params.callId);
  }

  if (params.incoming) {
    search.set('incoming', '1');
  }

  return `/app/video?${search.toString()}`;
}

export function getIncomingCallStorageKey(callId: string) {
  return `incoming-video-call:${callId}`;
}
