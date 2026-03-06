'use client';

import Link from 'next/link';
import { MapPin, Shield, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatBranch, cn } from '@/lib/utils';

interface ProfileCardProps {
  id: string;
  displayName: string;
  age?: number;
  location?: string;
  bio?: string;
  profileImageUrl?: string;
  interests?: string[];
  isVerified?: boolean;
  veteranInfo?: {
    branch: string;
    rank?: string;
  };
  overlapScore?: number;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
  showLink?: boolean;
}

export function ProfileCard({
  id,
  displayName,
  age,
  location,
  bio,
  profileImageUrl,
  interests = [],
  isVerified,
  veteranInfo,
  overlapScore,
  onClick,
  className,
  variant = 'default',
  showLink = true,
}: ProfileCardProps) {
  const content = (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-md cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Profile Image */}
        <div className={cn('relative bg-muted', variant === 'compact' ? 'aspect-square' : 'h-64')}>
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar name={displayName} size="xl" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Name overlay */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold truncate">{displayName}</h3>
              {age && <span className="text-base">{age}</span>}
              {isVerified && (
                <Badge variant="success" className="ml-1">
                  <Shield className="h-3 w-3" />
                </Badge>
              )}
            </div>
            {location && (
              <p className="text-sm text-white/80 flex items-center mt-0.5">
                <MapPin className="h-3 w-3 mr-1" />
                {location}
              </p>
            )}
          </div>

          {/* Overlap score badge */}
          {overlapScore !== undefined && (
            <Badge
              variant={overlapScore >= 0.7 ? 'success' : overlapScore >= 0.4 ? 'warning' : 'default'}
              className="absolute top-3 right-3"
            >
              {Math.round(overlapScore * 100)}% Match
            </Badge>
          )}
        </div>

        {/* Details */}
        {variant === 'default' && (
          <div className="p-4">
            {veteranInfo && (
              <p className="text-sm text-muted-foreground flex items-center mb-2">
                <Briefcase className="h-4 w-4 mr-1" />
                {formatBranch(veteranInfo.branch)}
                {veteranInfo.rank && ` • ${veteranInfo.rank}`}
              </p>
            )}

            {bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bio}</p>
            )}

            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {interests.slice(0, 3).map((interest, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
                {interests.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{interests.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (showLink) {
    return <Link href={`/app/profile/${id}`}>{content}</Link>;
  }

  return content;
}
