const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// Flow API endpoints
const FLOW_API_URL = 'https://www.flow.cl/api/payment/create';

function sign(params, secretKey) {
  // Sort keys alphabetically and build the string to sign
  const keys = Object.keys(params).sort();
  const toSign = keys.map(k => `${k}${params[k]}`).join('');
  return crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
}

function httpsPost(urlStr, postData) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = querystring.stringify(postData);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Respuesta inválida de Flow: ' + data)); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const { order, amount, email, subject } = JSON.parse(event.body);

    const apiKey    = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;
    const siteUrl   = process.env.SITE_URL; // ej: https://tu-sitio.netlify.app

    if (!apiKey || !secretKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Credenciales de Flow no configuradas.' }),
      };
    }

    // Build params (without signature)
    const params = {
      apiKey,
      commerceOrder: order,
      subject:       subject || 'Compra en Indomita Silver',
      currency:      'CLP',
      amount:        Math.round(amount),
      email,
      paymentMethod: 9,                           // 9 = todos los medios de pago
      urlConfirmation: `${siteUrl}/.netlify/functions/payment-confirm`,
      urlReturn:       `${siteUrl}/gracias.html`,
    };

    // Sign
    params.s = sign(params, secretKey);

    // Call Flow
    const flowResponse = await httpsPost(FLOW_API_URL, params);

    if (flowResponse.url && flowResponse.token) {
      // Redirect URL provided by Flow
      const redirectUrl = `${flowResponse.url}?token=${flowResponse.token}`;
      return {
        statusCode: 200,
        body: JSON.stringify({ redirectUrl }),
      };
    } else {
      console.error('Error Flow:', JSON.stringify(flowResponse));
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: flowResponse.message || 'Error al crear el pago en Flow.',
        }),
      };
    }
  } catch (err) {
    console.error('Exception:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor: ' + err.message }),
    };
  }
};
