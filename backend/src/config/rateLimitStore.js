const { createClient } = require('redis');

// Los contadores de los límites de intentos se guardan en memoria por defecto:
// se pierden al reiniciar y NO se comparten entre varias instancias del
// backend (cada una contaría por su lado y el límite real sería N veces más
// laxo). Con REDIS_URL configurado se guardan en Redis y valen para todas.

let cliente = null;

function obtenerClienteRedis() {
  if (!process.env.REDIS_URL) return null;
  if (!cliente) {
    cliente = createClient({ url: process.env.REDIS_URL });
    cliente.on('error', (error) => console.error('[redis] ', error.message));
    cliente.connect().catch((error) => console.error('[redis] No se pudo conectar:', error.message));
  }
  return cliente;
}

// Store mínimo para express-rate-limit (INCR + expiración por ventana).
class RedisRateLimitStore {
  constructor(client, prefijo) {
    this.client = client;
    this.prefijo = `rl:${prefijo}:`;
    // express-rate-limit no debe compartir un store entre limiters distintos
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  async increment(key) {
    const clave = this.prefijo + key;
    const [totalHits, ttl] = await this.client.multi().incr(clave).pTTL(clave).exec();
    let restanteMs = Number(ttl);
    if (Number(totalHits) === 1 || restanteMs < 0) {
      await this.client.pExpire(clave, this.windowMs);
      restanteMs = this.windowMs;
    }
    return { totalHits: Number(totalHits), resetTime: new Date(Date.now() + restanteMs) };
  }

  async decrement(key) {
    await this.client.decr(this.prefijo + key);
  }

  async resetKey(key) {
    await this.client.del(this.prefijo + key);
  }
}

// Devuelve las opciones de store para un limiter: {} (memoria, el default de
// express-rate-limit) o el store de Redis con un prefijo propio. Si Redis se
// cae, el limiter deja pasar las peticiones (y lo loguea) en vez de tumbar la API.
function opcionesDeStore(prefijo) {
  const client = obtenerClienteRedis();
  if (!client) return {};
  return { store: new RedisRateLimitStore(client, prefijo), passOnStoreError: true };
}

module.exports = { opcionesDeStore };
