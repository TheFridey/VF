'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const initials = name ? getInitials(name) : '?';

  if (src && !imageError) {
    return (
      <div className={cn('relative rounded-full overflow-hidden bg-muted', sizeClasses[size], className)}>
        <Image
          src={src}
          alt={alt || name || 'Avatar'}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
