'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Phone, PhoneOff, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { buildVideoRoute, createVideoSocket, getIncomingCallStorageKey, IncomingCallPayload } from '@/lib/video-client';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoCallStore } from '@/stores/video-call-store';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export function IncomingCallProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const incomingCall = useVideoCallStore((state) => state.incomingCall);
  const acceptIncomingCall = useVideoCallStore((state) => state.acceptIncomingCall);
  const rejectIncomingCall = useVideoCallStore((state) => state.rejectIncomingCall);
  const setIncomingCallUi = useVideoCallStore((state) => state.setIncomingCallUi);
  const clearIncomingCallUi = useVideoCallStore((state) => state.clearIncomingCallUi);
  const socketRef = useRef<Socket | null>(null);
  const showDockCallUi = !pathname.startsWith('/app/messages') && !pathname.startsWith('/app/video');

  useEffect(() => {
    if (!user?.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      clearIncomingCallUi();
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

        socket.on('call:incoming', (payload: IncomingCallPayload) => {
          if (pathname.startsWith('/app/video')) {
            return;
          }

          setIncomingCallUi(payload, {
            accept: () => {
              sessionStorage.setItem(
                getIncomingCallStorageKey(payload.callId),
                JSON.stringify(payload),
              );

              const route = buildVideoRoute({
                callId: payload.callId,
                connectionId: payload.connectionId,
                peerId: payload.callerId,
                peerName: payload.callerName,
                peerPhotoUrl: payload.callerImage || undefined,
                incoming: true,
              });

              clearIncomingCallUi();
              router.push(route);
            },
            reject: () => {
              socket.emit('call:reject', { callId: payload.callId });
              clearIncomingCallUi();
            },
          });
        });

        socket.on('call:ended', ({ callId }: { callId: string }) => {
          if (useVideoCallStore.getState().incomingCall?.callId === callId) {
            clearIncomingCallUi();
          }
        });

        socket.on('call:error', ({ message }: { message?: string }) => {
          if (message) {
            toast.error(message);
          }
        });
      } catch {
        // Non-critical: the app still works if the background call listener is unavailable.
      }
    };

    void connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      clearIncomingCallUi();
    };
  }, [clearIncomingCallUi, pathname, router, setIncomingCallUi, user?.id]);

  return (
    <Modal
      isOpen={!showDockCallUi && !!incomingCall}
      onClose={() => rejectIncomingCall?.()}
      title="Incoming Video Call"
      description="Answer to join the live video conversation."
      size="sm"
    >
      {incomingCall ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center">
            <Avatar
              src={incomingCall.callerImage || undefined}
              name={incomingCall.callerName}
              size="xl"
              className="ring-4 ring-primary/10"
            />
            <p className="mt-4 text-lg font-semibold">{incomingCall.callerName}</p>
            <p className="mt-1 text-sm text-muted-foreground">Calling you now</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => rejectIncomingCall?.()} className="w-full">
              <PhoneOff className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button onClick={() => acceptIncomingCall?.()} className="w-full">
              <Phone className="mr-2 h-4 w-4" />
              Answer
            </Button>
          </div>

          <div className="rounded-2xl border bg-primary/5 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Video className="h-4 w-4 text-primary" />
              Live video is available for active BIA connections.
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
