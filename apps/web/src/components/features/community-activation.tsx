'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { MapPin, Users, Tag, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── UK deployment tags ────────────────────────────────────────────────────────
// Standard Operation names for major British military deployments.
export const UK_DEPLOYMENT_TAGS = [
  { tag: 'Op HERRICK',     label: 'Afghanistan (Herrick)',    years: '2001–2014' },
  { tag: 'Op TELIC',       label: 'Iraq (Telic)',             years: '2003–2009' },
  { tag: 'Op BANNER',      label: 'Northern Ireland (Banner)',years: '1969–2007' },
  { tag: 'Op CORPORATE',   label: 'Falklands (Corporate)',    years: '1982' },
  { tag: 'Op GRAPPLE',     label: 'Bosnia (UNPROFOR)',        years: '1992–1995' },
  { tag: 'Op RESOLUTE',    label: 'Bosnia (IFOR/SFOR)',       years: '1995–2004' },
  { tag: 'Op AGRICOLA',    label: 'Kosovo (KFOR)',            years: '1999–present' },
  { tag: 'Op GRANBY',      label: 'Gulf War (Granby)',        years: '1990–1991' },
  { tag: 'Op PALLISER',    label: 'Sierra Leone (Palliser)',  years: '2000' },
  { tag: 'Op SHADER',      label: 'Iraq/Syria (Shader)',      years: '2014–present' },
  { tag: 'Op ENTIRETY',    label: 'Ukraine (Entirety)',       years: '2022–present' },
  { tag: 'Op CYAN',        label: 'Cyprus (Garrison)',        years: 'Various' },
  { tag: 'Op JACANA',      label: 'Afghanistan (early ops)',  years: '2002' },
  { tag: 'Op TOSCA',       label: 'Cyprus (UNFICYP)',         years: '1964–present' },
  { tag: 'Op INTERFERER',  label: 'Belize',                   years: 'Various' },
  { tag: 'Op TRENTON',     label: 'Lebanon (UNIFIL)',         years: '2016–present' },
] as const;

export type DeploymentTag = typeof UK_DEPLOYMENT_TAGS[number]['tag'];

interface CommunityFeatureProps {
  initialDeployments?: string[];
  initialLocation?: string;
  onSave?: () => void;
}

export default function CommunityActivation({
  initialDeployments = [],
  initialLocation = '',
  onSave,
}: CommunityFeatureProps) {
  const [selectedDeployments, setSelectedDeployments] = useState<string[]>(initialDeployments);
  const [location, setLocation] = useState(initialLocation);
  const [shareLocation, setShareLocation] = useState(!!initialLocation);
  const [isSaving, setIsSaving] = useState(false);

  const toggleDeployment = (tag: string) => {
    setSelectedDeployments((prev) =>
      prev.includes(tag) ? prev.filter((d) => d !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save deployment tags to veteran details
      if (selectedDeployments.length > 0) {
        await api.updateVeteranDetails({ deployments: selectedDeployments });
      }
      // Save location to profile if sharing enabled
      if (shareLocation && location) {
        await api.updateProfile({ location: shareLocation ? location : null });
      }
      toast.success('Community profile updated');
      onSave?.();
    } catch {
      toast.error('Failed to save — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Deployment Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="w-4 h-4 text-amber-500" />
            Your Deployments
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select operations you served on. Veterans with shared deployments will be surfaced in Brothers in Arms search.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {UK_DEPLOYMENT_TAGS.map(({ tag, label, years }) => {
              const selected = selectedDeployments.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleDeployment(tag)}
                  className={`
                    px-3 py-1.5 rounded text-xs font-medium border transition-all
                    ${selected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-500'}
                  `}
                  title={years}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {selectedDeployments.length > 0 && (
            <p className="text-xs text-zinc-500 mt-3">
              {selectedDeployments.length} operation{selectedDeployments.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Location Discovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-amber-500" />
            Local Veterans
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Optionally share your general area to discover veterans near you.
            Your exact address is never shown — only the region/city you enter.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shareLocation}
              onChange={(e) => setShareLocation(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show my general location to other veterans</span>
          </label>
          {shareLocation && (
            <Input
              placeholder="e.g. Manchester, Yorkshire, South East"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
            />
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? 'Saving…' : 'Save Community Profile'}
      </Button>
    </div>
  );
}
