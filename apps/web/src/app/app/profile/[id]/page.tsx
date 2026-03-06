'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, 
  MapPin, 
  Shield, 
  Briefcase, 
  Calendar, 
  Flag, 
  Ban, 
  Loader2,
  Heart,
  MessageCircle,
  Video,
  ChevronLeft,
  ChevronRight,
  Award,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { formatBranch, formatDate, calculateAge, cn } from '@/lib/utils';

export default function ViewProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFullscreenPhoto, setShowFullscreenPhoto] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => api.getPublicProfile(userId),
    enabled: !!userId,
  });

  // Check if user is matched with this person
  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.getMatches(),
  });

  const isMatched = matches?.matches?.some(
    (match: any) => match.user.id === userId
  );

  const matchData = matches?.matches?.find(
    (match: any) => match.user.id === userId
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground mb-6">
          This profile may be private or no longer exists.
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;
  const photos = profile.photos || [];
  const hasPhotos = photos.length > 0;

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      {/* Photo Gallery */}
      <Card className="overflow-hidden">
        <div className="relative aspect-[4/5] bg-muted">
          {hasPhotos ? (
            <>
              <Image
                src={photos[currentPhotoIndex]?.url || profile.profileImageUrl}
                alt={profile.displayName}
                fill
                className="object-cover cursor-pointer"
                onClick={() => setShowFullscreenPhoto(true)}
                sizes="(max-width: 768px) 100vw, 672px"
              />
              
              {/* Photo navigation */}
              {photos.length > 1 && (
                <>
                  {/* Photo indicators */}
                  <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 px-4">
                    {photos.map((_: any, index: number) => (
                      <div
                        key={index}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          index === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                        )}
                      />
                    ))}
                  </div>

                  {/* Navigation arrows */}
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Verified badge */}
              {profile.isVerified && (
                <div className="absolute top-4 right-4 bg-green-500 rounded-full p-2">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar name={profile.displayName} size="xl" className="w-32 h-32 text-4xl" />
            </div>
          )}
        </div>

        <CardContent className="pt-6">
          {/* Name and basic info */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {profile.displayName}
                {age && <span className="font-normal text-muted-foreground">, {age}</span>}
              </h1>
              {profile.location && (
                <p className="flex items-center text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile.location}
                </p>
              )}
            </div>
            {profile.isVerified && (
              <Badge variant="success">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {/* Action buttons for matched users */}
          {isMatched && matchData && (
            <div className="flex gap-3 mb-6">
              <Button
                className="flex-1"
                onClick={() => router.push(`/app/messages?match=${matchData.id}`)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
              <Button variant="outline" className="flex-1">
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </Button>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">About</h2>
              <p className="whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Military Service */}
      {profile.veteranInfo && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Military Service
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-medium">{formatBranch(profile.veteranInfo.branch)}</p>
              </div>
              {profile.veteranInfo.rank && (
                <div>
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <p className="font-medium">{profile.veteranInfo.rank}</p>
                </div>
              )}
              {profile.veteranInfo.mos && (
                <div>
                  <p className="text-sm text-muted-foreground">Trade/Role</p>
                  <p className="font-medium">{profile.veteranInfo.mos}</p>
                </div>
              )}
            </div>

            {profile.veteranInfo.dutyStations && profile.veteranInfo.dutyStations.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Postings</p>
                <div className="flex flex-wrap gap-2">
                  {profile.veteranInfo.dutyStations.map((station: string, index: number) => (
                    <Badge key={index} variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      {station}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.veteranInfo.deployments && profile.veteranInfo.deployments.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Deployments</p>
                <div className="flex flex-wrap gap-2">
                  {profile.veteranInfo.deployments.map((deployment: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {deployment}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.servicePeriods && profile.servicePeriods.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Service Periods</p>
                <div className="space-y-2">
                  {profile.servicePeriods.map((period: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
                    >
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatBranch(period.branch)} •{' '}
                        {formatDate(period.startDate)} - {period.endDate ? formatDate(period.endDate) : 'Present'}
                        {period.unit && ` • ${period.unit}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowReportModal(true)}
            >
              <Flag className="h-4 w-4 mr-2" />
              Report
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => {
                // Would open block confirmation
              }}
            >
              <Ban className="h-4 w-4 mr-2" />
              Block
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Photo Modal */}
      <AnimatePresence>
        {showFullscreenPhoto && hasPhotos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setShowFullscreenPhoto(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
              onClick={() => setShowFullscreenPhoto(false)}
            >
              <X className="h-6 w-6" />
            </button>
            
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
            
            <Image
              src={photos[currentPhotoIndex]?.url}
              alt={`Photo ${currentPhotoIndex + 1}`}
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {photos.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(index); }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report User"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Why are you reporting {profile.displayName}?
          </p>
          <div className="space-y-2">
            {[
              'Fake profile',
              'Inappropriate content',
              'Harassment',
              'Spam or scam',
              'Not a real veteran',
              'Other',
            ].map((reason) => (
              <button
                key={reason}
                className="w-full text-left px-4 py-3 rounded-lg border hover:bg-muted transition-colors"
                onClick={() => {
                  setShowReportModal(false);
                  // Submit report
                }}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
