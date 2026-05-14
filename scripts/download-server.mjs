import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 3456;
const FILES = {
  '/distribution.p12': { file: 'artifacts/mobile/distribution.p12', type: 'application/x-pkcs12' },
  '/distribution.mobileprovision': { file: 'artifacts/mobile/distribution.mobileprovision', type: 'application/octet-stream' }
};

const server = http.createServer((req, res) => {
  const entry = FILES[req.url];
  if (entry) {
    const data = fs.readFileSync(entry.file);
    const filename = path.basename(entry.file);
    res.writeHead(200, {
      'Content-Type': entry.type,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': data.length,
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(data);
  }

  // Index page with download links
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;max-width:500px">
    <h2>Download Apple Credentials</h2>
    <p>Click each file to download:</p>
    <p><a href="/distribution.p12" style="display:block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:8px;margin-bottom:12px;text-align:center">
      Download distribution.p12
    </a></p>
    <p><a href="/distribution.mobileprovision" style="display:block;padding:12px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:8px;text-align:center">
      Download distribution.mobileprovision
    </a></p>
    <p style="color:#666;font-size:14px">p12 password: <code>VortrexynBP2026!</code></p>
  </body></html>`);
});

server.listen(PORT, () => console.log('Download server running on port ' + PORT));
