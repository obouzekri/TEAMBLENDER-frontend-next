import Link from 'next/link';

export default function TopNav() {
  return (
    <header className="top-nav">
      <div className="shell nav-inner">
        <Link href="/" className="brand">TEAMSPARK</Link>
        <nav className="nav-links" aria-label="Navigation principale">
          <Link href="/">Accueil</Link>
          <Link href="/pricing">Tarification</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Connexion</Link>
          <Link href="/signup" className="btn-mini">Creer un compte</Link>
        </nav>
      </div>
    </header>
  );
}
