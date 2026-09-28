/**
 * Serve one file over loopback so a public dashboard page can read it.
 *
 * supabase.com's Content-Security-Policy lists `http://localhost:8000` in
 * connect-src (127.0.0.1 is not listed), so this is the only loopback origin the
 * SQL editor is allowed to fetch from. Used to hand a 23 KB migration to the
 * Monaco editor without pasting it through the agent's context.
 *
 *   node supabase/live_schema_export/serve_file.js <absolute-path>
 *   → GET http://localhost:8000/file
 *
 * Read-only, single path, exits after 10 minutes or /QUIT.
 */
const http = require('http');
const fs = require('fs');

const TARGET = process.argv[2];
if (!TARGET || !fs.existsSync(TARGET)) {
  console.error('usage: node serve_file.js <existing-file-path>');
  process.exit(1);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true',
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
    res.writeHead(204);
    return res.end();
  }
  if (req.url === '/QUIT') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('bye');
    return server.close();
  }
  if (req.url === '/file') {
    const text = fs.readFileSync(TARGET, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', ...CORS });
    console.log(`served ${text.length} bytes`);
    return res.end(text);
  }
  res.writeHead(404, CORS);
  res.end('not found');
});

// Bind the dual-stack wildcard with IPv6 explicitly enabled: `localhost` resolves
// to ::1 on this laptop and 127.0.0.1 in the browser, and binding the hostname
// picks one family only — which is how a serve that passed curl came to refuse
// the page. The CSP allow-list is by hostname (`http://localhost:8000`), so the
// socket family does not matter to it, only to the client.
server.listen({ port: 8000, host: '::', ipv6Only: false }, () => {
  console.log(`serving ${TARGET} at http://localhost:8000/file`);
});

setTimeout(() => server.close(() => process.exit(0)), 600_000).unref();
