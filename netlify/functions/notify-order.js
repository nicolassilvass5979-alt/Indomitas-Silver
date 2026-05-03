const https = require('https');

// Envía el email via Resend (gratis hasta 3.000 emails/mes)
function sendEmail(to, subject, html) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: 'Indomita Silver <notificaciones@indomitasilver.cl>',
      to: [to],
      subject,
      html,
    });

    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    const { customer, shipping, items, total, orderId } = JSON.parse(event.body);

    const ownerEmail = process.env.OWNER_EMAIL; // Tu email personal

    // ── EMAIL AL DUEÑO (tú) ──
    const itemsHtml = items.map(i =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;">${i.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:center;">${i.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;">${i.priceStr}</td>
      </tr>`
    ).join('');

    const ownerHtml = `
    <div style="font-family:Arial,sans-serif;background:#0e0e0e;color:#f5f0e8;max-width:600px;margin:0 auto;padding:2rem;">
      <div style="text-align:center;margin-bottom:2rem;">
        <h1 style="color:#c9a96e;font-size:1.5rem;letter-spacing:.1em;">🛍️ NUEVA VENTA</h1>
        <p style="color:#888;font-size:.85rem;">Orden #${orderId}</p>
      </div>

      <div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:1.5rem;margin-bottom:1rem;">
        <h2 style="color:#c9a96e;font-size:.9rem;letter-spacing:.15em;margin:0 0 1rem;">DATOS DEL CLIENTE</h2>
        <p style="margin:.3rem 0;"><strong>Nombre:</strong> ${customer.nombre} ${customer.apellido}</p>
        <p style="margin:.3rem 0;"><strong>Email:</strong> ${customer.email}</p>
        <p style="margin:.3rem 0;"><strong>Teléfono:</strong> ${customer.telefono}</p>
      </div>

      <div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:1.5rem;margin-bottom:1rem;">
        <h2 style="color:#c9a96e;font-size:.9rem;letter-spacing:.15em;margin:0 0 1rem;">DIRECCIÓN DE ENVÍO</h2>
        <p style="margin:.3rem 0;">${shipping.direccion}</p>
        <p style="margin:.3rem 0;">${shipping.ciudad}${shipping.region ? ', ' + shipping.region : ''}</p>
        <p style="margin:.3rem 0;">CP: ${shipping.cp || 'No indicado'}</p>
      </div>

      <div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:1.5rem;margin-bottom:1rem;">
        <h2 style="color:#c9a96e;font-size:.9rem;letter-spacing:.15em;margin:0 0 1rem;">PRODUCTOS COMPRADOS</h2>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#111;">
              <th style="padding:8px 12px;text-align:left;color:#888;font-size:.75rem;letter-spacing:.1em;">PRODUCTO</th>
              <th style="padding:8px 12px;text-align:center;color:#888;font-size:.75rem;letter-spacing:.1em;">CANT.</th>
              <th style="padding:8px 12px;text-align:right;color:#888;font-size:.75rem;letter-spacing:.1em;">PRECIO</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align:right;padding-top:1rem;font-size:1.1rem;color:#c9a96e;font-weight:bold;">
          Total: ${total}
        </div>
      </div>

      <p style="color:#555;font-size:.75rem;text-align:center;">
        Pago procesado vía Flow · ${new Date().toLocaleString('es-CL')}
      </p>
    </div>`;

    // ── EMAIL AL CLIENTE (confirmación) ──
    const clientHtml = `
    <div style="font-family:Arial,sans-serif;background:#0e0e0e;color:#f5f0e8;max-width:600px;margin:0 auto;padding:2rem;">
      <div style="text-align:center;margin-bottom:2rem;">
        <h1 style="color:#c9a96e;font-size:1.8rem;font-style:italic;">Indomita Silver</h1>
        <p style="color:#888;">Joyería de Plata</p>
      </div>

      <div style="text-align:center;background:#1a1a1a;border:1px solid #2a2a2a;padding:2rem;margin-bottom:1.5rem;">
        <div style="font-size:2.5rem;margin-bottom:.5rem;">✨</div>
        <h2 style="color:#c9a96e;margin:0 0 .5rem;">¡Gracias por tu compra, ${customer.nombre}!</h2>
        <p style="color:#888;margin:0;">Tu pedido #${orderId} fue recibido y está siendo procesado.</p>
      </div>

      <div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:1.5rem;margin-bottom:1rem;">
        <h3 style="color:#c9a96e;font-size:.85rem;letter-spacing:.12em;margin:0 0 1rem;">TU PEDIDO</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align:right;padding-top:1rem;color:#c9a96e;font-weight:bold;">
          Total pagado: ${total}
        </div>
      </div>

      <div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:1.5rem;margin-bottom:1.5rem;">
        <h3 style="color:#c9a96e;font-size:.85rem;letter-spacing:.12em;margin:0 0 .8rem;">DIRECCIÓN DE ENTREGA</h3>
        <p style="margin:.2rem 0;color:#ccc;">${shipping.direccion}</p>
        <p style="margin:.2rem 0;color:#ccc;">${shipping.ciudad}</p>
      </div>

      <p style="color:#666;font-size:.78rem;text-align:center;line-height:1.8;">
        Recibirás un email con el seguimiento de tu envío.<br>
        ¿Tienes dudas? Escríbenos a <a href="mailto:${ownerEmail}" style="color:#c9a96e;">${ownerEmail}</a>
      </p>

      <div style="text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid #2a2a2a;">
        <p style="color:#444;font-size:.7rem;letter-spacing:.1em;">INDOMITA SILVER · PLATA 925 · CHILE</p>
      </div>
    </div>`;

    // Enviar ambos emails en paralelo
    await Promise.all([
      sendEmail(ownerEmail, `🛍️ Nueva venta - Orden #${orderId} - ${total}`, ownerHtml),
      sendEmail(customer.email, `✨ Confirmación de pedido #${orderId} - Indomita Silver`, clientHtml),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };

  } catch (err) {
    console.error('notify-order error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
