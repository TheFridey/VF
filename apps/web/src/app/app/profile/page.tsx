'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Shield, Loader2, Save, Plus, Trash2, Edit2, MapPin, Calendar, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { PhotoUpload } from '@/components/photo-upload';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatBranch, isVeteran, isVerifiedVeteran } from '@/lib/utils';
import type { Gender, MilitaryBranch, ServicePeriod } from '@/types';

const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  dateOfBirth: z.string().optional(),
  location: z.string().max(100).optional(),
  interests: z.array(z.string()).max(10).optional(),
});

const veteranSchema = z.object({
  branch: z.string().min(1, 'Please select a branch'),
  rank: z.string().optional(),
  serviceNumber: z.string().optional(),
  regiment: z.string().optional(),
  trade: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  deployments: z.array(z.string()).optional(),
  dutyStations: z.array(z.string()).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type VeteranFormData = z.infer<typeof veteranSchema>;

type ProfileRecord = {
  id: string;
  userId: string;
  displayName?: string | null;
  bio?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  location?: string | null;
  interests?: string[] | null;
  updatedAt?: string;
  profileImageUrl?: string | null;
};

type VeteranDetailsRecord = {
  id: string;
  userId: string;
  branch?: MilitaryBranch | null;
  rank?: string | null;
  regiment?: string | null;
  mos?: string | null;
  deployments?: string[] | null;
  dutyStations?: string[] | null;
  servicePeriods?: ServicePeriod[];
};

const PROFILE_FORM_DEFAULTS: ProfileFormData = {
  displayName: '',
  bio: '',
  gender: undefined,
  dateOfBirth: '',
  location: '',
  interests: [],
};

const VETERAN_FORM_DEFAULTS: VeteranFormData = {
  branch: '',
  rank: '',
  serviceNumber: '',
  regiment: '',
  trade: '',
  startDate: '',
  endDate: '',
  deployments: [],
  dutyStations: [],
};

function toProfileForm(profile?: ProfileRecord | null): ProfileFormData {
  return {
    displayName: profile?.displayName ?? '',
    bio: profile?.bio ?? '',
    gender: profile?.gender ?? undefined,
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
    location: profile?.location ?? '',
    interests: Array.isArray(profile?.interests) ? profile.interests : [],
  };
}

function toVeteranForm(veteranDetails?: VeteranDetailsRecord | null): VeteranFormData {
  const primaryServicePeriod = veteranDetails?.servicePeriods?.[0];

  return {
    branch: veteranDetails?.branch ?? '',
    rank: veteranDetails?.rank ?? '',
    serviceNumber: '',
    regiment: veteranDetails?.regiment ?? primaryServicePeriod?.unit ?? '',
    trade: veteranDetails?.mos ?? '',
    startDate: primaryServicePeriod?.startDate ? primaryServicePeriod.startDate.split('T')[0] : '',
    endDate: primaryServicePeriod?.endDate ? primaryServicePeriod.endDate.split('T')[0] : '',
    deployments: Array.isArray(veteranDetails?.deployments) ? veteranDetails.deployments : [],
    dutyStations: Array.isArray(veteranDetails?.dutyStations) ? veteranDetails.dutyStations : [],
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function toAuthProfile(profile: ProfileRecord) {
  return {
    displayName: profile.displayName ?? '',
    profileImageUrl: profile.profileImageUrl ?? undefined,
    bio: profile.bio ?? undefined,
    gender: profile.gender ?? undefined,
    dateOfBirth: profile.dateOfBirth ?? undefined,
    location: profile.location ?? undefined,
  };
}

const genderOptions = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

// UK Military Branches
const branchOptions = [
  { value: 'BRITISH_ARMY', label: 'British Army' },
  { value: 'ROYAL_NAVY', label: 'Royal Navy' },
  { value: 'ROYAL_AIR_FORCE', label: 'Royal Air Force' },
  { value: 'ROYAL_MARINES', label: 'Royal Marines' },
  { value: 'RESERVE_FORCES', label: 'Reserve Forces' },
  { value: 'TERRITORIAL_ARMY', label: 'Territorial Army (Historical)' },
  { value: 'OTHER', label: 'Other' },
];

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [newInterest, setNewInterest] = useState('');
  const [showMilitaryModal, setShowMilitaryModal] = useState(false);
  const [newDeployment, setNewDeployment] = useState('');
  const [newStation, setNewStation] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile() as Promise<ProfileRecord>,
  });

  const { data: veteranDetails } = useQuery({
    queryKey: ['veteranDetails'],
    queryFn: () => api.getVeteranDetails() as Promise<VeteranDetailsRecord>,
    enabled: isVeteran(user?.role || ''),
  });

  const profileDefaults = useMemo(() => PROFILE_FORM_DEFAULTS, []);
  const veteranDefaults = useMemo(() => VETERAN_FORM_DEFAULTS, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults,
  });

  const {
    register: registerVeteran,
    handleSubmit: handleSubmitVeteran,
    watch: watchVeteran,
    setValue: setVeteranValue,
    reset: resetVeteranForm,
    setError: setVeteranError,
    clearErrors: clearVeteranErrors,
    formState: { errors: veteranErrors },
  } = useForm<VeteranFormData>({
    resolver: zodResolver(veteranSchema),
    defaultValues: veteranDefaults,
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    reset(toProfileForm(profile));
    setLastSavedAt(profile.updatedAt ?? null);
  }, [profile, reset]);

  useEffect(() => {
    if (!showMilitaryModal || !veteranDetails) {
      return;
    }

    resetVeteranForm(toVeteranForm(veteranDetails));
  }, [showMilitaryModal, veteranDetails, resetVeteranForm]);

  const deployments = watchVeteran('deployments') || [];
  const dutyStations = watchVeteran('dutyStations') || [];
  const interests = watch('interests') || [];
  const watchedDisplayName = watch('displayName');
  const watchedBio = watch('bio');
  const watchedLocation = watch('location');
  const watchedGender = watch('gender');
  const watchedDateOfBirth = watch('dateOfBirth');
  const veteranDutyStations = veteranDetails?.dutyStations ?? [];
  const veteranDeployments = veteranDetails?.deployments ?? [];

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => api.updateProfile(data),
    onSuccess: (updatedProfile) => {
      const confirmedProfile = updatedProfile as ProfileRecord;
      queryClient.setQueryData(['profile'], confirmedProfile);
      reset(toProfileForm(confirmedProfile));
      setLastSavedAt(confirmedProfile.updatedAt ?? new Date().toISOString());
      if (user) {
        setUser({
          ...user,
          profile: {
            ...user.profile,
            ...toAuthProfile(confirmedProfile),
          },
        });
      }
      clearErrors('root');
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update profile');
      setError('root', {
        type: 'server',
        message,
      });
      toast.error(message);
    },
  });

  const updateVeteranMutation = useMutation({
    mutationFn: async (data: VeteranFormData) => {
      const updatedDetails = await api.updateVeteranDetails({
        branch: data.branch,
        rank: data.rank || undefined,
        regiment: data.regiment || undefined,
        trade: data.trade || undefined,
        deployments: data.deployments,
        dutyStations: data.dutyStations,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      });

      return updatedDetails as VeteranDetailsRecord;
    },
    onSuccess: (updatedVeteranDetails) => {
      queryClient.setQueryData(['veteranDetails'], updatedVeteranDetails);
      resetVeteranForm(toVeteranForm(updatedVeteranDetails));
      clearVeteranErrors('root');
      setShowMilitaryModal(false);
      toast.success('Military service updated successfully!');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update military service');
      setVeteranError('root', {
        type: 'server',
        message,
      });
      toast.error(message);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    clearErrors('root');
    updateProfileMutation.mutate(data);
  };

  const onSubmitVeteran = (data: VeteranFormData) => {
    clearVeteranErrors('root');
    updateVeteranMutation.mutate(data);
  };

  const addInterest = () => {
    if (newInterest.trim() && interests.length < 10) {
      setValue('interests', [...interests, newInterest.trim()], { shouldDirty: true });
      setNewInterest('');
    }
  };

  const removeInterest = (index: number) => {
    setValue(
      'interests',
      interests.filter((_, i) => i !== index),
      { shouldDirty: true }
    );
  };

  const addDeployment = () => {
    if (newDeployment.trim()) {
      setVeteranValue('deployments', [...deployments, newDeployment.trim()]);
      setNewDeployment('');
    }
  };

  const removeDeployment = (index: number) => {
    setVeteranValue('deployments', deployments.filter((_, i) => i !== index));
  };

  const addStation = () => {
    if (newStation.trim()) {
      setVeteranValue('dutyStations', [...dutyStations, newStation.trim()]);
      setNewStation('');
    }
  };

  const removeStation = (index: number) => {
    setVeteranValue('dutyStations', dutyStations.filter((_, i) => i !== index));
  };

  const openMilitaryModal = () => {
    resetVeteranForm(toVeteranForm(veteranDetails));
    setShowMilitaryModal(true);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <div className="flex items-center gap-2">
          {lastSavedAt && (
            <span className="text-sm text-muted-foreground">
              Saved {new Date(lastSavedAt).toLocaleString()}
            </span>
          )}
          {isVerifiedVeteran(user?.role || '') && (
            <Badge variant="success">
              <Shield className="h-3 w-3 mr-1" />
              Verified Veteran
            </Badge>
          )}
        </div>
      </div>

      {/* Profile Photos */}
      <Card>
        <CardContent className="pt-6">
          <PhotoUpload />
        </CardContent>
      </Card>

      {/* Basic Info */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.root?.message && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            <Input
              {...register('displayName')}
              label="Display Name"
              placeholder="How others will see you"
              error={errors.displayName?.message}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                {...register('gender')}
                label="Gender"
                options={genderOptions}
                placeholder="Select gender"
              />
              <Input
                {...register('dateOfBirth')}
                type="date"
                label="Date of Birth"
                error={errors.dateOfBirth?.message}
              />
            </div>

            <Input
              {...register('location')}
              label="Location"
              placeholder="City, County"
              error={errors.location?.message}
            />

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1.5">Bio</label>
              <textarea
                id="bio"
                {...register('bio')}
                rows={4}
                placeholder="Tell others about yourself..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.bio && <p className="mt-1.5 text-sm text-destructive">{errors.bio.message}</p>}
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Interests ({interests.length}/10)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add an interest"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                />
                <Button type="button" onClick={addInterest} disabled={interests.length >= 10}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, index) => (
                  <Badge key={index} variant="outline" className="pr-1">
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isDirty || updateProfileMutation.isPending}
              isLoading={updateProfileMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Your Profile Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-lg font-semibold">{watchedDisplayName || 'Your display name will appear here'}</p>
            <p className="text-sm text-muted-foreground">
              {[watchedLocation, watchedGender].filter(Boolean).join(' • ') || 'Add location and gender to complete your preview.'}
            </p>
          </div>
          {watchedBio ? (
            <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{watchedBio}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Your bio will show here once you add one.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {interests.length > 0 ? (
              interests.map((interest, index) => (
                <Badge key={`${interest}-${index}`} variant="outline">
                  {interest}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Add interests so other veterans can recognise what matters to you.</span>
            )}
          </div>
          {watchedDateOfBirth && (
            <p className="text-sm text-muted-foreground">Date of birth: {watchedDateOfBirth}</p>
          )}
        </CardContent>
      </Card>

      {/* Veteran Details (if applicable) */}
      {isVeteran(user?.role || '') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Military Service
              </CardTitle>
              <Button variant="outline" size="sm" onClick={openMilitaryModal}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {veteranDetails ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Award className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <label className="text-sm text-muted-foreground">Branch</label>
                      <p className="font-medium">{veteranDetails.branch ? formatBranch(veteranDetails.branch) : 'Not set'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Rank</label>
                    <p className="font-medium">{veteranDetails.rank || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Trade/Role</label>
                    <p className="font-medium">{veteranDetails.mos || 'Not set'}</p>
                  </div>
                </div>

                {veteranDutyStations.length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Postings/Bases
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {veteranDutyStations.map((station: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {station}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {veteranDeployments.length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Deployments/Operations
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {veteranDeployments.map((deployment: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {deployment}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {!isVerifiedVeteran(user?.role || '') && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Your veteran status is pending verification. Submit your service records 
                      (e.g., Certificate of Service, Discharge Papers) to unlock full features.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => (window.location.href = '/app/settings')}
                    >
                      Submit Verification
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No military service details added yet.</p>
                <Button onClick={openMilitaryModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Details
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Military Service Modal */}
      <Modal
        isOpen={showMilitaryModal}
        onClose={() => setShowMilitaryModal(false)}
        title="Edit Military Service"
      >
        <form onSubmit={handleSubmitVeteran(onSubmitVeteran)} className="space-y-4">
          {veteranErrors.root?.message && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {veteranErrors.root.message}
            </div>
          )}

          <Select
            {...registerVeteran('branch')}
            label="Branch of Service *"
            options={branchOptions}
            placeholder="Select branch"
            error={veteranErrors.branch?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              {...registerVeteran('rank')}
              label="Rank (at discharge)"
              placeholder="e.g., Corporal, Sergeant"
            />
            <Input
              {...registerVeteran('trade')}
              label="Trade/Role"
              placeholder="e.g., Infantry, Engineer"
            />
          </div>

          <Input
            {...registerVeteran('regiment')}
            label="Regiment/Unit"
            placeholder="e.g., 2nd Battalion, The Rifles"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              {...registerVeteran('startDate')}
              type="date"
              label="Primary Service Start Date"
            />
            <Input
              {...registerVeteran('endDate')}
              type="date"
              label="Primary Service End Date"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            These dates update your primary service period so they survive refresh and future edits.
          </p>

          {/* Postings/Bases */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Postings/Bases
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newStation}
                onChange={(e) => setNewStation(e.target.value)}
                placeholder="e.g., Catterick, Cyprus, Germany"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStation())}
              />
              <Button type="button" onClick={addStation} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dutyStations.map((station, index) => (
                <Badge key={index} variant="outline" className="pr-1">
                  {station}
                  <button
                    type="button"
                    onClick={() => removeStation(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Deployments */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Deployments/Operations
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newDeployment}
                onChange={(e) => setNewDeployment(e.target.value)}
                placeholder="e.g., Op HERRICK, Op TELIC, Op BANNER"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDeployment())}
              />
              <Button type="button" onClick={addDeployment} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {deployments.map((deployment, index) => (
                <Badge key={index} variant="secondary" className="pr-1">
                  {deployment}
                  <button
                    type="button"
                    onClick={() => removeDeployment(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowMilitaryModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={updateVeteranMutation.isPending}
              isLoading={updateVeteranMutation.isPending}
            >
              Save Service Details
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
