import { notFound } from 'next/navigation';
import { renderSocialPreview } from '@/lib/socialPreview';
import { SUPPORTED_LOCALES } from '@/lib/i18n/routing';

// Image de partage par langue : /social-preview/fr.png, /social-preview/en.png…
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ image: `${locale}.png` }));
}

export async function GET(_request, { params }) {
  const { image } = await params;
  const locale = String(image || '').replace(/\.png$/, '');
  if (!SUPPORTED_LOCALES.includes(locale)) notFound();
  return renderSocialPreview(locale);
}
