import { NextResponse } from 'next/server';

const PRIMARY_BASE = (process.env.NEXT_PUBLIC_LEGACY_BASE || 'http://localhost:3000').replace(/\/$/, '');

function getCandidateBases() {
  const fromEnv = String(process.env.LEGACY_BASE_CANDIDATES || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const all = [PRIMARY_BASE, ...fromEnv];
  return all.filter((base, index) => all.indexOf(base) === index);
}

function normalizePath(pathname) {
  const value = String(pathname || '').trim();
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

async function probeUrl(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1400);

  try {
    const headResponse = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
    });

    if (headResponse.ok) {
      return true;
    }

    // Some static servers don't support HEAD correctly, fallback to GET.
    const getResponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
    });

    return getResponse.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const requestedPaths = Array.isArray(payload?.paths) ? payload.paths : [];
    const paths = requestedPaths.map(normalizePath).filter(Boolean);

    if (!paths.length) {
      return NextResponse.json(
        { error: 'At least one path is required.' },
        { status: 400 }
      );
    }

    const bases = getCandidateBases();

    for (const base of bases) {
      for (const path of paths) {
        const candidate = `${base}${path}`;
        // Probe from the server side to avoid browser CORS limitations.
        // If target responds, we can safely redirect the client there.
        const ok = await probeUrl(candidate);
        if (ok) {
          return NextResponse.json({ resolvedUrl: candidate });
        }
      }
    }

    return NextResponse.json({
      resolvedUrl: `${PRIMARY_BASE}${paths[0]}`,
      warning: 'No legacy URL probe succeeded, returned primary fallback.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to resolve legacy URL.' },
      { status: 500 }
    );
  }
}
