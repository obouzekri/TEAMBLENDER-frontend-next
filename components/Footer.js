import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-brand-block">
          <div className="footer-logo" aria-hidden="true">
            <Logo size="compact" />
          </div>
          <div>
            <p className="footer-brand">TeamBlender</p>
            <p className="footer-copy">Activez des sessions d équipe claires et mesurables.</p>
          </div>
        </div>
        <div className="footer-columns" aria-label="Liens footer">
          <nav className="footer-col" aria-label="Produit">
            <p>Produit</p>
            <Link href="/">Accueil</Link>
            <Link href="/signup">Créer un compte</Link>
            <Link href="/pricing">Tarification</Link>
          </nav>

          <nav className="footer-col" aria-label="Ressources">
            <p>Ressources</p>
            <Link href="/pricing">Offres</Link>
            <Link href="/contact">Demander une démo</Link>
            <Link href="/login">Espace client</Link>
          </nav>

          <nav className="footer-col" aria-label="Légal">
            <p>Légal</p>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/politique-confidentialite">Politique de confidentialité</Link>
          </nav>

          <nav className="footer-col" aria-label="Contact">
            <p>Contact</p>
            <Link href="/contact">Parler a un expert</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

