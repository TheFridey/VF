'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CookiePreferences = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_CONSENT_KEY = 'vf_cookie_consent';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be disabled
    functional: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to prevent flash
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      try {
        const savedPreferences = JSON.parse(consent);
        setPreferences(savedPreferences);
      } catch {
        setIsVisible(true);
      }
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setIsVisible(false);
    
    // Here you would typically initialize/disable analytics based on consent
    if (prefs.analytics) {
      // Initialize analytics (e.g., Google Analytics)
      console.log('Analytics enabled');
    }
    if (prefs.marketing) {
      // Initialize marketing cookies
      console.log('Marketing cookies enabled');
    }
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(necessaryOnly);
    saveConsent(necessaryOnly);
  };

  const savePreferences = () => {
    saveConsent(preferences);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-[998] transition-opacity duration-300",
          showSettings ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setShowSettings(false)}
      />

      {/* Cookie Banner */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[999] p-4 transition-transform duration-500 ease-out",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="container mx-auto max-w-4xl">
          <div className="bg-card rounded-2xl shadow-2xl border p-6 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary" />
            
            {!showSettings ? (
              /* Main Banner */
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Cookie className="h-6 w-6 text-primary" />
                  </div>
                </div>
                
                <div className="flex-grow">
                  <h3 className="font-semibold text-lg mb-1">We value your privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                    By clicking &quot;Accept All&quot;, you consent to our use of cookies. Read our{' '}
                    <Link href="/cookies" className="text-primary hover:underline">
                      Cookie Policy
                    </Link>{' '}
                    to learn more.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(true)}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Customize
                  </Button>
                  <Button
                    variant="outline"
                    onClick={acceptNecessary}
                  >
                    Necessary Only
                  </Button>
                  <Button onClick={acceptAll} className="gap-2">
                    <Check className="h-4 w-4" />
                    Accept All
                  </Button>
                </div>
              </div>
            ) : (
              /* Settings Panel */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Cookie Preferences</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Necessary Cookies */}
                  <CookieToggle
                    title="Necessary Cookies"
                    description="Required for the website to function. These cannot be disabled."
                    checked={true}
                    disabled={true}
                    onChange={() => {}}
                  />

                  {/* Functional Cookies */}
                  <CookieToggle
                    title="Functional Cookies"
                    description="Enable enhanced functionality like remembering your preferences and settings."
                    checked={preferences.functional}
                    onChange={(checked) => setPreferences({ ...preferences, functional: checked })}
                  />

                  {/* Analytics Cookies */}
                  <CookieToggle
                    title="Analytics Cookies"
                    description="Help us understand how visitors interact with our website to improve the experience."
                    checked={preferences.analytics}
                    onChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
                  />

                  {/* Marketing Cookies */}
                  <CookieToggle
                    title="Marketing Cookies"
                    description="Used to track visitors across websites to display relevant advertisements."
                    checked={preferences.marketing}
                    onChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={acceptNecessary}>
                    Reject All
                  </Button>
                  <Button onClick={savePreferences}>
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Cookie toggle component
function CookieToggle({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
      <div className="flex-grow">
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          checked ? "bg-primary" : "bg-muted-foreground/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export default CookieConsent;
