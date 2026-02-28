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
    const decodedRel = decodeURIComponent(rel);

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
