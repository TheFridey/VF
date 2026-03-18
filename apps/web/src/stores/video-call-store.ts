'use client';

import { create } from 'zustand';
import type { IncomingCallPayload } from '@/lib/video-client';

interface VideoCallState {
  incomingCall: IncomingCallPayload | null;
  acceptIncomingCall: (() => void) | null;
  rejectIncomingCall: (() => void) | null;
  setIncomingCallUi: (
    incomingCall: IncomingCallPayload,
    handlers: { accept: () => void; reject: () => void },
  ) => void;
  clearIncomingCallUi: () => void;
}

export const useVideoCallStore = create<VideoCallState>((set) => ({
  incomingCall: null,
  acceptIncomingCall: null,
  rejectIncomingCall: null,
  setIncomingCallUi: (incomingCall, handlers) =>
    set({
      incomingCall,
      acceptIncomingCall: handlers.accept,
      rejectIncomingCall: handlers.reject,
    }),
  clearIncomingCallUi: () =>
    set({
      incomingCall: null,
      acceptIncomingCall: null,
      rejectIncomingCall: null,
    }),
}));
