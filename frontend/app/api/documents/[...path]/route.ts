import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';

function docsRoot(): string {
  const root = process.env.DOCS_ROOT;
  if (!root) {
    throw new Error('DOCS_ROOT is not set');
  }
  return root;
}

function safeJoin(root: string, rel: string): string {
  const rootResolved = path.resolve(root);
  const candidate = path.resolve(rootResolved, rel);
  if (candidate !== rootResolved && !candidate.startsWith(rootResolved + path.sep)) {
    throw new Error('Invalid path');
  }
  return candidate;
}

export async function GET(_req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path: parts } = await ctx.params;
    const rel = (parts || []).join('/');

    // Decode URL encoding. Next already decodes segments, but keep this safe.
    let decodedRel = decodeURIComponent(rel);

    // If the indexed path is a full Windows absolute path (e.g. C:/Users/.../Documents/foo.pdf)
    // strip the host-side prefix so we're left with just the relative part (e.g. foo.pdf).
    const hostPrefix = process.env.DOCS_HOST_PREFIX;
    if (hostPrefix) {
      // Normalize both to forward slashes for comparison.
      const normalizedPrefix = hostPrefix.replace(/\\/g, '/').replace(/\/$/, '');
      const normalizedRel = decodedRel.replace(/\\/g, '/');
      if (normalizedRel.startsWith(normalizedPrefix + '/')) {
        decodedRel = normalizedRel.slice(normalizedPrefix.length + 1);
      } else if (normalizedRel === normalizedPrefix) {
        decodedRel = '';
      }
    }

    const root = docsRoot();
    const filePath = safeJoin(root, decodedRel);

    console.log(`[API Documents] Serving file: ${filePath} (Root: ${root}, Rel: ${decodedRel})`);

    const data = await fs.readFile(filePath);

    // Very small mapping; browser will handle PDFs natively.
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.txt'
          ? 'text/plain; charset=utf-8'
          : 'application/octet-stream';

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline'
      }
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status = msg.includes('DOCS_ROOT') ? 500 : msg.includes('Invalid path') ? 400 : 404;
    return NextResponse.json({ error: msg }, { status });
  }
}
