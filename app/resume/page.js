import Link from 'next/link';
import ParticipantResume from '@/components/ParticipantResume';

export const metadata = {
  title: 'Reprise participant | Participant recovery',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ResumePage() {
  return (
    <main className="shell auth-page">
      <div className="feature-card">
        <ParticipantResume fromLink />
        <Link href="/login">Connexion / Sign in</Link>
      </div>
    </main>
  );
}
