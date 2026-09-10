export interface TeacherApprovedSandboxMedia {
  kind: 'video';
  videoUrl: string;
  posterUrl?: string;
  title: string;
  competency: string;
  approved: boolean;
  childSafe: boolean;
  containsLearnerData: boolean;
}

export interface ResolvedSandboxMedia {
  kind: 'video';
  videoUrl: string;
  posterUrl?: string;
  title: string;
}

function isSafeMediaUrl(url: string): boolean {
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveTeacherApprovedMedia(input: {
  media?: TeacherApprovedSandboxMedia;
  competency: string;
}): ResolvedSandboxMedia | null {
  const media = input.media;
  if (!media) return null;
  if (media.kind !== 'video') return null;
  if (!media.approved || !media.childSafe || media.containsLearnerData) return null;
  if (media.competency !== input.competency) return null;
  if (!isSafeMediaUrl(media.videoUrl)) return null;
  if (media.posterUrl && !isSafeMediaUrl(media.posterUrl)) return null;

  return {
    kind: 'video',
    videoUrl: media.videoUrl,
    posterUrl: media.posterUrl,
    title: media.title,
  };
}
