const https = require('https');

const SITE_ID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
const TOKEN   = process.env.NETLIFY_BLOBS_TOKEN || process.env.TOKEN;
const STORE   = 'tienda';
const KEY     = 'data';

function blobRequest(method, data) {
  return new Promise((resolve, reject) => {
    const path = `/api/v1/blobs/${SITE_ID}/${STORE}/${KEY}`;
    const body = data ? JSON.stringify(data) : null;
    const opts = {
      hostname: 'api.netlify.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (event.httpMethod === 'GET') {
    try {
      const r = await blobRequest('GET');
      if (r.status === 200) return { statusCode: 200, headers, body: r.body };
      return { statusCode: 200, headers, body: JSON.stringify(null) };
    } catch (e) {
      return { statusCode: 200, headers, body: JSON.stringify(null) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const parsed = JSON.parse(event.body);
      if (!parsed || !parsed.brandName) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) };
      }
      const r = await blobRequest('PUT', parsed);
      if (r.status >= 200 && r.status < 300) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      return { statusCode: 500, headers, body: JSON.stringify({ error: `Blob error ${r.status}` }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: 'Method not allowed' };
};
