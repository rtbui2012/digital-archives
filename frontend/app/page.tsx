'use client';

import { useMemo, useState } from 'react';

type Hit = { score: number; id: string; payload: Record<string, any> };

function resolveDocumentUrl(payload: Record<string, any>): string | null {
  // Prefer explicit web URL if backend ever provides one.
  const directUrl = payload?.url || payload?.href;
  if (typeof directUrl === 'string' && directUrl.trim()) return directUrl;

  // File path in current payloads.
  const p = payload?.path || payload?.source;
  if (typeof p !== 'string' || !p.trim()) return null;

  // Already an absolute URL? Use it.
  if (/^https?:\/\//i.test(p)) return p;

  // Browsers often block file:// navigations from http(s) pages.
  // Serve local documents via the Next.js app instead using rewrites.
  //
  // We strip leading slashes (if any) but keep the drive letter if present.
  const rel = p.replace(/^[\\/]+/, '');
  const normalized = rel.replace(/\\/g, '/');

  // Return a relative path so it hits the Next.js rewrite rule in next.config.mjs
  return `/documents/${normalized.split('/').map(encodeURIComponent).join('/')}`;
}

export default function Page() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api', []);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHits(data.hits || []);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b1020', color: '#e7e9ee' }}>
      <header style={{ padding: '28px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: 0.2 }}>Digital Archives</h1>
          <span style={{ opacity: 0.7 }}>Qdrant vector search</span>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <section style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
            <form onSubmit={runSearch} style={{ display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 13, opacity: 0.8 }}>Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. property tax 2022"
                style={{
                  padding: '12px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#e7e9ee',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ fontSize: 13, opacity: 0.8 }}>Limit</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  style={{ width: 90, padding: '10px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#e7e9ee' }}
                />
                <button
                  type="submit"
                  disabled={!query || loading}
                  style={{
                    marginLeft: 'auto',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: loading ? 'rgba(255,255,255,0.08)' : '#2b7fff',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              {error && <div style={{ color: '#ff8f8f', fontSize: 13, whiteSpace: 'pre-wrap' }}>{error}</div>}
            </form>
          </section>

          <section style={{ display: 'grid', gap: 12 }}>
            {hits.length === 0 ? (
              <div style={{ opacity: 0.7, padding: '8px 2px' }}>No results yet.</div>
            ) : (
              hits.map((h) => (
                <article key={h.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 600 }}>{h.payload?.filename || h.payload?.path || 'Untitled'}</div>
                    <div style={{ opacity: 0.8 }}>score {(h.score ?? 0).toFixed(3)}</div>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13 }}>
                    {(() => {
                      const href = resolveDocumentUrl(h.payload || {});
                      const label = (h.payload?.path || h.payload?.source) as string | undefined;
                      if (!href || !label) return null;
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          style={{ opacity: 0.95, color: '#9cc2ff', textDecoration: 'underline' }}
                          title="Open document"
                        >
                          {label}
                        </a>
                      );
                    })()}
                    {(h.payload?.path || h.payload?.source) ? ' · ' : ''}
                    page {h.payload?.page ?? '—'} · chunk {h.payload?.chunk ?? '—'}
                  </div>
                  <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: 13, lineHeight: 1.4, background: 'rgba(0,0,0,0.35)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                    {String(h.payload?.text || '').slice(0, 1200)}
                  </pre>
                </article>
              ))
            )}
          </section>
        </div>
      </main>

      <footer style={{ maxWidth: 980, margin: '0 auto', padding: 20, opacity: 0.6, fontSize: 12 }}>
        Tip: index PDFs via POST {apiBase}/index/pdf
      </footer>
    </div>
  );
}

