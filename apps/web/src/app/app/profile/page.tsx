'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  });

  const { data: veteranDetails, refetch: refetchVeteranDetails } = useQuery({
    queryKey: ['veteranDetails'],
    queryFn: () => api.getVeteranDetails(),
    enabled: isVeteran(user?.role || ''),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          displayName: profile.displayName || '',
          bio: profile.bio || '',
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth?.split('T')[0] || '',
          location: profile.location || '',
          interests: profile.interests || [],
        }
      : undefined,
  });

  const {
    register: registerVeteran,
    handleSubmit: handleSubmitVeteran,
    watch: watchVeteran,
    setValue: setVeteranValue,
    reset: resetVeteranForm,
    formState: { errors: veteranErrors },
  } = useForm<VeteranFormData>({
    resolver: zodResolver(veteranSchema),
    defaultValues: {
      branch: veteranDetails?.branch || '',
      rank: veteranDetails?.rank || '',
      serviceNumber: '',
      regiment: '',
      trade: veteranDetails?.mos || '',
      startDate: '',
      endDate: '',
      deployments: veteranDetails?.deployments || [],
      dutyStations: veteranDetails?.dutyStations || [],
    },
  });

  const deployments = watchVeteran('deployments') || [];
  const dutyStations = watchVeteran('dutyStations') || [];
  const interests = watch('interests') || [];

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => api.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (user) {
        setUser({ ...user, profile: updatedProfile });
      }
      toast.success('Profile updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const updateVeteranMutation = useMutation({
    mutationFn: (data: VeteranFormData) => api.updateVeteranDetails(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veteranDetails'] });
      refetchVeteranDetails();
      setShowMilitaryModal(false);
      toast.success('Military service updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update military service');
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitVeteran = (data: VeteranFormData) => {
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
    // Reset form with current values
    resetVeteranForm({
      branch: veteranDetails?.branch || '',
      rank: veteranDetails?.rank || '',
      serviceNumber: '',
      regiment: '',
      trade: veteranDetails?.mos || '',
      startDate: '',
      endDate: '',
      deployments: veteranDetails?.deployments || [],
      dutyStations: veteranDetails?.dutyStations || [],
    });
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
        {isVerifiedVeteran(user?.role || '') && (
          <Badge variant="success">
            <Shield className="h-3 w-3 mr-1" />
            Verified Veteran
          </Badge>
        )}
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
              <label className="block text-sm font-medium mb-1.5">Bio</label>
              <textarea
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
                      <p className="font-medium">{formatBranch(veteranDetails.branch) || 'Not set'}</p>
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

                {veteranDetails.dutyStations?.length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Postings/Bases
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {veteranDetails.dutyStations.map((station: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {station}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {veteranDetails.deployments?.length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Deployments/Operations
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {veteranDetails.deployments.map((deployment: string, i: number) => (
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
              label="Service Start Date"
            />
            <Input
              {...registerVeteran('endDate')}
              type="date"
              label="Service End Date"
            />
          </div>

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
