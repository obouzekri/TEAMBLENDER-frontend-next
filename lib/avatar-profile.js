const AVATAR_STYLE_VERSION = 'v1';

const AVATAR_TEMPLATES = [
  { id: 'avatar-01', skin: '#F5D1B0', hair: '#2F3D55', shirt: '#6C5CE7', accent: '#5A4BDA', bg: '#F4F1FF' },
  { id: 'avatar-02', skin: '#E8BF9C', hair: '#24324F', shirt: '#5A4BDA', accent: '#6C5CE7', bg: '#F1F5FF' },
  { id: 'avatar-03', skin: '#DFAE86', hair: '#2C2A43', shirt: '#6C5CE7', accent: '#4C3FC8', bg: '#EEF2FF' },
  { id: 'avatar-04', skin: '#F2C8A9', hair: '#3B2F2F', shirt: '#5A4BDA', accent: '#6C5CE7', bg: '#F6F3FF' },
  { id: 'avatar-05', skin: '#EAC4A2', hair: '#253447', shirt: '#6C5CE7', accent: '#5A4BDA', bg: '#F3F6FF' },
  { id: 'avatar-06', skin: '#D7A887', hair: '#343146', shirt: '#5A4BDA', accent: '#6C5CE7', bg: '#EEF1FF' },
  { id: 'avatar-07', skin: '#F0CAA8', hair: '#2E3650', shirt: '#6C5CE7', accent: '#5A4BDA', bg: '#F7F4FF' },
  { id: 'avatar-08', skin: '#E2B897', hair: '#2C3145', shirt: '#5A4BDA', accent: '#6C5CE7', bg: '#F2F5FF' },
];

function svgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function renderAvatarSvg(template) {
  const { skin, hair, shirt, accent, bg } = template;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="illustrated avatar">\
  <defs>\
    <linearGradient id="shirt-grad" x1="0" x2="1" y1="0" y2="1">\
      <stop offset="0%" stop-color="${shirt}"/>\
      <stop offset="100%" stop-color="${accent}"/>\
    </linearGradient>\
  </defs>\
  <rect x="0" y="0" width="96" height="96" rx="24" fill="${bg}"/>\
  <ellipse cx="48" cy="77" rx="27" ry="16" fill="url(#shirt-grad)"/>\
  <path d="M23 80c3-11 12-18 25-18s22 7 25 18" fill="url(#shirt-grad)"/>\
  <circle cx="48" cy="40" r="20" fill="${skin}"/>\
  <path d="M28 38c1-14 10-23 20-23 13 0 20 11 20 22-6-5-12-8-20-8-8 0-14 3-20 9z" fill="${hair}"/>\
  <circle cx="40" cy="41" r="1.8" fill="#23324f"/>\
  <circle cx="56" cy="41" r="1.8" fill="#23324f"/>\
  <path d="M40 50c2 2 4 3 8 3s6-1 8-3" stroke="#8a4f4f" stroke-width="2" stroke-linecap="round" fill="none"/>\
</svg>`;
}

const AVATAR_LIBRARY = AVATAR_TEMPLATES.map((template, index) => ({
  id: template.id,
  label: `Avatar ${index + 1}`,
  src: svgToDataUri(renderAvatarSvg(template)),
}));

const AVATAR_BY_ID = AVATAR_LIBRARY.reduce((acc, avatar) => {
  acc[avatar.id] = avatar;
  return acc;
}, {});

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickAvatarIdFromUser(user) {
  const seed = [
    String(user?.id || ''),
    String(user?.email || ''),
    String(user?.name || ''),
    String(user?.first_name || ''),
    String(user?.last_name || ''),
  ].join('|');

  const index = AVATAR_LIBRARY.length > 0 ? hashString(seed) % AVATAR_LIBRARY.length : 0;
  return AVATAR_LIBRARY[index]?.id || 'avatar-01';
}

function normalizeMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return mode === 'photo' ? 'photo' : 'illustrated';
}

function normalizeAvatarId(value) {
  const id = String(value || '').trim();
  if (id && AVATAR_BY_ID[id]) return id;
  return '';
}

function buildDefaultProfile(user) {
  return {
    mode: 'illustrated',
    avatarId: pickAvatarIdFromUser(user),
    version: AVATAR_STYLE_VERSION,
  };
}

export function getAvatarLibrary() {
  return AVATAR_LIBRARY;
}

export function getInitials(label) {
  const source = String(label || '').trim() || 'U';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
}

export function ensureUserAvatarProfile(user) {
  if (!user || typeof user !== 'object') return user;

  const profile = user.avatar_profile || user.avatarProfile || null;
  const legacyMode = user.avatar_mode;
  const legacyId = user.avatar_id;

  const mode = normalizeMode(profile?.mode || legacyMode);
  const avatarId = normalizeAvatarId(profile?.avatarId || profile?.avatar_id || legacyId);

  if (profile && avatarId) {
    const nextProfile = {
      mode,
      avatarId,
      version: profile?.version || AVATAR_STYLE_VERSION,
    };

    if (
      profile.mode === nextProfile.mode &&
      (profile.avatarId || profile.avatar_id) === nextProfile.avatarId &&
      profile.version === nextProfile.version
    ) {
      return user;
    }

    return {
      ...user,
      avatar_profile: nextProfile,
    };
  }

  return {
    ...user,
    avatar_profile: buildDefaultProfile(user),
  };
}

export function updateUserAvatarProfile(user, nextSelection) {
  const safeUser = ensureUserAvatarProfile(user || {});
  const mode = normalizeMode(nextSelection?.mode || safeUser?.avatar_profile?.mode);
  const selectedAvatarId = normalizeAvatarId(nextSelection?.avatarId || safeUser?.avatar_profile?.avatarId);

  return {
    ...safeUser,
    avatar_profile: {
      mode,
      avatarId: selectedAvatarId || buildDefaultProfile(safeUser).avatarId,
      version: AVATAR_STYLE_VERSION,
    },
  };
}

export function resolveUserAvatar(user, labelFallback = '') {
  const normalizedUser = ensureUserAvatarProfile(user || {});
  const profile = normalizedUser?.avatar_profile || buildDefaultProfile(normalizedUser);
  const mode = normalizeMode(profile?.mode);

  if (mode === 'illustrated') {
    const avatarId = normalizeAvatarId(profile?.avatarId) || buildDefaultProfile(normalizedUser).avatarId;
    const avatar = AVATAR_BY_ID[avatarId] || AVATAR_LIBRARY[0];
    return {
      mode,
      avatarId,
      avatarUrl: avatar?.src || '',
      avatarInitials: getInitials(labelFallback),
    };
  }

  const pictureUrl = String(normalizedUser?.picture_url || '').trim();
  return {
    mode: 'photo',
    avatarId: normalizeAvatarId(profile?.avatarId) || buildDefaultProfile(normalizedUser).avatarId,
    avatarUrl: pictureUrl,
    avatarInitials: getInitials(labelFallback),
  };
}
