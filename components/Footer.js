import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <p className="footer-brand">TEAMSPARK</p>
          <p className="footer-copy">Une expérience guidée, simple, claire et utile pour managers et RH.</p>
        </div>
        <nav className="footer-links" aria-label="Liens footer">
          <Link href="/">Accueil</Link>
          <Link href="/pricing">Tarification</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/politique-confidentialite">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
