// Local one-shot sink for the Supabase dashboard schema export.
//
// The dashboard's SQL editor caps every result at 100 rows, and its clipboard and
// download paths both need OS window focus plus a per-page-load download
// allowance, so none of them is usable from an automated browser. Instead the page's
// own Response.json() is wrapped to POST each query response here, which writes it
// to disk untouched. Nothing reaches the model context, so a 300 KB schema dump
// costs the same as a one-line ack.
//
// Must stay on localhost:8000: that is the one loopback origin Supabase's
// content-security-policy lets the page connect to (127.0.0.1 is refused).
//
// Listens on 127.0.0.1 only, quits after QUIT, and is meant to run for minutes.
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT = '/home/skware/Documents/Qoder/2026-09-26/41a272bc/Syncsenta/supabase/live_schema_export/incoming';
const PORT = 8000;
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  // Chrome's Private Network Access probe (public https page -> localhost) needs
  // this echoed on both the preflight and the real response.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }
  const name = decodeURIComponent(req.url.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^_+/, '')) || 'last';
  if (name === 'QUIT') {
    res.writeHead(200).end('bye');
    return server.close(() => process.exit(0));
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    fs.writeFileSync(path.join(OUT, name), body);
    console.log(`${new Date().toISOString()} ${name} ${body.length} bytes`);
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('wrote ' + body.length);
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`sink listening on 127.0.0.1:${PORT}`));
setTimeout(() => process.exit(0), 30 * 60 * 1000);
