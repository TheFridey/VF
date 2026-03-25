'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

const DISMISS_KEY = 'vf-push-prompt-dismissed';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function PushNotificationSetup() {
  const { user } = useAuthStore();
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      window.isSecureContext;

    setIsSupported(supported);
    setPermission(supported ? Notification.permission : 'denied');
    setIsDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  useEffect(() => {
    if (!user || !isSupported) return;

    let active = true;

    const registerAndSync = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        registrationRef.current = registration;

        const existingSubscription = await registration.pushManager.getSubscription();
        if (!active) return;

        setIsSubscribed(!!existingSubscription);

        if (existingSubscription && Notification.permission === 'granted') {
          await api.subscribeToPushNotifications(existingSubscription.toJSON() as PushSubscriptionJSON);
          if (!active) return;
          setIsSubscribed(true);
        }
      } catch {
        if (!active) return;
        setIsSupported(false);
      }
    };

    void registerAndSync();

    return () => {
      active = false;
    };
  }, [isSupported, user]);

  const enableNotifications = async () => {
    if (!isSupported || !user) return;

    setIsLoading(true);

    try {
      const registration =
        registrationRef.current || await navigator.serviceWorker.register('/sw.js');
      registrationRef.current = registration;

      const vapid = await api.getPushVapidKey();
      const publicKey = vapid?.publicKey?.trim();
      if (!publicKey) {
        throw new Error('Push notifications are not configured yet.');
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== 'granted') {
        toast.error('Notifications stay off until you allow them in your browser.');
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await api.subscribeToPushNotifications(subscription.toJSON() as PushSubscriptionJSON);
      setIsSubscribed(true);
      setIsDismissed(true);
      window.localStorage.setItem(DISMISS_KEY, '1');
      toast.success('Notifications are on. You will hear about new requests and messages.');
    } catch (error: any) {
      toast.error(error?.message || 'Could not enable notifications right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const dismissPrompt = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1');
    }
  };

  if (!user || !isSupported || permission === 'denied' || permission === 'granted' || isSubscribed || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-3xl border border-border/70 bg-background/95 p-4 shadow-2xl shadow-primary/10 backdrop-blur">
      <button
        type="button"
        onClick={dismissPrompt}
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Dismiss notification prompt"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Turn on notifications</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Get a prompt when someone sends a connection request or a new message lands.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={enableNotifications} isLoading={isLoading}>
              Enable notifications
            </Button>
            <Button size="sm" variant="outline" onClick={dismissPrompt}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
