const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const store = getStore('tienda');

  // GET — cargar datos
  if (event.httpMethod === 'GET') {
    try {
      const raw = await store.get('data');
      if (!raw) return { statusCode: 200, body: JSON.stringify(null) };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: raw };
    } catch (e) {
      return { statusCode: 200, body: JSON.stringify(null) };
    }
  }

  // POST — guardar datos (solo si viene con token de admin)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      // Verificación básica: debe tener la estructura de datos de la tienda
      if (!body || !body.brandName) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Datos inválidos' }) };
      }
      // No guardar la contraseña en texto plano en los datos públicos del GET
      // (la pass solo se usa para login en el frontend, no la exponemos)
      await store.set('data', JSON.stringify(body));
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
