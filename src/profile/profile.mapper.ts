import { Profile } from '@prisma/client';

export interface PublicProfile {
  name: string;
  headline: string;
  location: string | null;
  bio: string;
  avatarUrl: string | null;
  email: string | null;
  website: string | null;
  socialLinks: Record<string, string>;
  availability: string;
  systemStatus: string;
  accentColor: string;
  profileVersion: string;
  terminalMessages: string[];
}

/** Strips private fields (phone number, internal id/timestamps) before returning to public clients. */
export function toPublicProfile(profile: Profile): PublicProfile {
  return {
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    email: profile.email,
    website: profile.website,
    socialLinks: (profile.socialLinks as Record<string, string>) ?? {},
    availability: profile.availability,
    systemStatus: profile.systemStatus,
    accentColor: profile.accentColor,
    profileVersion: profile.profileVersion,
    terminalMessages: profile.terminalMessages,
  };
}
