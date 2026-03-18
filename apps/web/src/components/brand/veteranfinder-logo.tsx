import Image from 'next/image';
import { cn } from '@/lib/utils';

interface VeteranFinderLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
  priority?: boolean;
}

export function VeteranFinderLogo({
  className,
  markClassName,
  textClassName,
  showText = true,
  priority = false,
}: VeteranFinderLogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/veteranfinder-mark.svg"
        alt="VeteranFinder"
        width={1080}
        height={660}
        priority={priority}
        className={cn('h-8 w-auto shrink-0 object-contain', markClassName)}
      />
      {showText ? (
        <span className={cn('text-lg font-semibold tracking-tight', textClassName)}>
          VeteranFinder
        </span>
      ) : null}
    </span>
  );
}
