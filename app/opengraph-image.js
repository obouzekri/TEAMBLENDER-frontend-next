import { renderSocialPreview, SOCIAL_PREVIEW_SIZE } from '@/lib/socialPreview';
import { DEFAULT_LOCALE } from '@/lib/i18n/routing';

// Image par défaut des pages sans métadonnées propres (pages privées, liens d'invitation).
// Les pages publiques pointent vers /social-preview/<langue>.png (voir getSocialPreviewImage).
export const size = SOCIAL_PREVIEW_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderSocialPreview(DEFAULT_LOCALE);
}
