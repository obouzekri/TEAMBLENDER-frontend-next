import { cookies } from 'next/headers';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import DemoClient from './DemoClient';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const isEn = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en';
  return {
    title: isEn ? 'Interactive demo' : 'Démo interactive',
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function DemoPage() {
  return (
    <>
      <TopNav />
      <DemoClient />
      <Footer />
    </>
  );
}
