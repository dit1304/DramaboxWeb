const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  
  if (req.url === '/worker.js') {
    const filePath = path.join(__dirname, 'cloudflare-worker', 'worker.js');
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(content);
    return;
  }

  const workerPath = path.join(__dirname, 'cloudflare-worker', 'worker.js');
  const workerSize = fs.statSync(workerPath).size;
  const workerLines = fs.readFileSync(workerPath, 'utf8').split('\n').length;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StreamBox - Worker Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0a0a0f; color: #e5e7eb; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 600px; padding: 40px; text-align: center; }
    h1 { font-size: 28px; margin-bottom: 8px; background: linear-gradient(135deg, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #9ca3af; margin-bottom: 32px; }
    .info { background: #1a1a26; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; text-align: left; }
    .info h3 { color: #8b5cf6; margin-bottom: 12px; }
    .stat { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .stat:last-child { border-bottom: none; }
    .stat .label { color: #9ca3af; }
    .stat .value { color: #e5e7eb; font-weight: 600; }
    .note { margin-top: 24px; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>StreamBox Panel</h1>
    <p class="subtitle">Cloudflare Worker Preview</p>
    <div class="info">
      <h3>Worker Info</h3>
      <div class="stat"><span class="label">File</span><span class="value">worker.js</span></div>
      <div class="stat"><span class="label">Size</span><span class="value">${(workerSize / 1024).toFixed(1)} KB</span></div>
      <div class="stat"><span class="label">Lines</span><span class="value">${workerLines.toLocaleString()}</span></div>
      <div class="stat"><span class="label">Sources</span><span class="value">Melolo, DramaBox, DramaMovie, Samehadaku</span></div>
      <div class="stat"><span class="label">API</span><span class="value">api.sonzaix.indevs.in</span></div>
      <div class="stat"><span class="label">Status</span><span class="value" style="color: #22c55e;">Ready to Deploy</span></div>
    </div>
    <p class="note">Deploy this worker to Cloudflare Workers for full functionality.</p>
  </div>
</body>
</html>`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Preview server running on http://0.0.0.0:' + PORT);
});
