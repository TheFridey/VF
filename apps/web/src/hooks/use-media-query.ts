import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Predefined breakpoints matching Tailwind
export function useIsMobile() {
  return !useMediaQuery('(min-width: 768px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px)') && !useMediaQuery('(min-width: 1024px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
