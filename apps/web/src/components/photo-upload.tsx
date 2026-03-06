'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Camera, 
  X, 
  Star, 
  GripVertical, 
  Loader2, 
  Upload,
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  publicId: string;
  order: number;
  isPrimary: boolean;
  width?: number;
  height?: number;
}

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function PhotoUpload() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Fetch photos
  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['photos'],
    queryFn: () => api.getMyPhotos(),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadPhoto(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Photo uploaded successfully');
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload photo');
      setUploadProgress(0);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => api.deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Photo deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete photo');
    },
  });

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (photoId: string) => api.setPrimaryPhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Primary photo updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to set primary photo');
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (photoIds: string[]) => api.reorderPhotos(photoIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reorder photos');
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Check photo limit
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    uploadMutation.mutate(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [photos.length, uploadMutation]);

  const handleDragStart = (photoId: string) => {
    setDraggedPhoto(photoId);
  };

  const handleDragOver = (e: React.DragEvent, targetPhotoId: string) => {
    e.preventDefault();
    if (!draggedPhoto || draggedPhoto === targetPhotoId) return;
  };

  const handleDrop = (e: React.DragEvent, targetPhotoId: string) => {
    e.preventDefault();
    if (!draggedPhoto || draggedPhoto === targetPhotoId) return;

    const draggedIndex = photos.findIndex(p => p.id === draggedPhoto);
    const targetIndex = photos.findIndex(p => p.id === targetPhotoId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder locally first for immediate feedback
    const newPhotos = [...photos];
    const [removed] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(targetIndex, 0, removed);

    // Update order
    const newOrder = newPhotos.map(p => p.id);
    reorderMutation.mutate(newOrder);

    setDraggedPhoto(null);
  };

  const handleDragEnd = () => {
    setDraggedPhoto(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Photos</h3>
          <p className="text-sm text-muted-foreground">
            Add up to {MAX_PHOTOS} photos. Drag to reorder.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Existing photos */}
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            draggable
            onDragStart={() => handleDragStart(photo.id)}
            onDragOver={(e) => handleDragOver(e, photo.id)}
            onDrop={(e) => handleDrop(e, photo.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative aspect-[3/4] rounded-lg overflow-hidden border-2 group cursor-move',
              photo.isPrimary ? 'border-primary' : 'border-transparent',
              draggedPhoto === photo.id && 'opacity-50',
              'hover:border-primary/50 transition-all'
            )}
          >
            <Image
              src={photo.url}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 200px"
            />
            
            {/* Primary badge */}
            {photo.isPrimary && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Primary
              </div>
            )}

            {/* Drag handle */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/50 rounded p-1">
                <GripVertical className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Actions overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-center">
                {!photo.isPrimary && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-white hover:bg-white/20"
                    onClick={() => setPrimaryMutation.mutate(photo.id)}
                    disabled={setPrimaryMutation.isPending}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Set Primary
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-white hover:bg-red-500/50 ml-auto"
                  onClick={() => {
                    if (confirm('Delete this photo?')) {
                      deleteMutation.mutate(photo.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Upload button */}
        {photos.length < MAX_PHOTOS && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className={cn(
              'aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2',
              'hover:border-primary hover:bg-primary/5 transition-colors',
              'text-muted-foreground hover:text-primary',
              uploadMutation.isPending && 'opacity-50 cursor-not-allowed'
            )}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <Camera className="h-8 w-8" />
                <span className="text-sm font-medium">Add Photo</span>
              </>
            )}
          </button>
        )}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, MAX_PHOTOS - photos.length - 1) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-[3/4] rounded-lg border-2 border-dashed border-muted flex items-center justify-center"
          >
            <span className="text-xs text-muted-foreground">
              {photos.length + i + 2}
            </span>
          </div>
        ))}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Tips */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Tips for great photos:</strong></p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Use clear, well-lit photos of yourself</li>
            <li>Your first photo should clearly show your face</li>
            <li>Include a mix of close-ups and full-body shots</li>
            <li>Avoid group photos or photos with sunglasses</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PhotoUpload;
