import { readFile, writeFile, mkdir } from 'node:fs/promises';
const areas = JSON.parse(
  await readFile(new URL('../src/service-areas.json', import.meta.url), 'utf8'),
);
const html = await readFile('dist/index.html', 'utf8');
const origin = process.env.SITE_URL?.replace(/\/$/, '') || '';
if (origin && !/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin))
  throw new Error('SITE_URL must be an http(s) origin without path.');
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const paths = ['/'];
for (const a of areas) {
  const path = `/services/${a.citySlug}/${a.slug}`;
  paths.push(path);
  await mkdir(`dist${path}`, { recursive: true });
  const page = html
    .replace(/<title>.*?<\/title>/, `<title>${escape(a.title)} | Spacecraft Studio</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\/>/,
      `<meta name="description" content="${escape(a.description)}"/>`,
    )
    .replace(
      '</head>',
      `${origin ? `<link rel="canonical" href="${origin}${path}"/>` : ''}</head>`,
    );
  await writeFile(`dist${path}/index.html`, page);
}
await writeFile(
  'dist/robots.txt',
  `User-agent: *\nAllow: /\nDisallow: /new\nDisallow: /projects\nDisallow: /design/\nDisallow: /contact\nDisallow: /account\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`,
);
if (origin)
  await writeFile(
    'dist/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${origin}${p}</loc></url>`).join('')}</urlset>`,
  );
// Cloudflare Pages serves matching static HTML first, then uses its built-in
// SPA fallback when there is no top-level 404.html. Avoid a catch-all rewrite
// that would bypass the service-specific metadata pages.
await writeFile(
  'dist/_headers',
  '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/design/*\n  X-Robots-Tag: noindex, nofollow\n/projects\n  X-Robots-Tag: noindex, nofollow\n/new\n  X-Robots-Tag: noindex, nofollow\n/contact\n  X-Robots-Tag: noindex, nofollow\n/account\n  X-Robots-Tag: noindex, nofollow\n',
);
console.log(
  `Generated ${areas.length} service metadata pages. ${origin ? 'Sitemap written.' : 'Set SITE_URL to generate sitemap and canonical URLs.'}`,
);
