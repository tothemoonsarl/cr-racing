// Barrière d'accès avant le lancement de cr-racing.ch.
// Sans le bon cookie, toute page renvoie la page d'attente /bientot/ (inscription e-mail + accès équipe).
// Le mot de passe se règle dans Netlify : variable d'environnement SITE_PASSWORD.
// Pour ouvrir le site au public au lancement : supprimer ce fichier et la section [[edge_functions]] de netlify.toml.

const PUBLIC = ['/assets/logo-cr.svg', '/assets/topo.svg', '/robots.txt', '/favicon.ico'];
const FORMS = ['lancement', 'pilote', 'partenaire'];
const COOKIE = 'cr_access';

async function token(password) {
  const data = new TextEncoder().encode('cr-racing:' + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function redirect(location, headers = {}) {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store', ...headers } });
}

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const password = Netlify.env.get('SITE_PASSWORD') || '';

  // La page d'attente et ses ressources restent publiques
  if (path.startsWith('/bientot/') || PUBLIC.includes(path)) return context.next();

  // Saisie du mot de passe équipe
  if (path === '/__unlock') {
    if (request.method !== 'POST') return redirect('/bientot/');
    const form = await request.formData();
    const lang = String(form.get('lang') || 'fr').replace(/[^a-z]/g, '').slice(0, 2) || 'fr';
    if (password && String(form.get('password') || '') === password) {
      return redirect('/', { 'Set-Cookie': `${COOKIE}=${await token(password)}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax` });
    }
    return redirect(`/bientot/?erreur=1&lang=${lang}`);
  }

  // Envois de formulaires Netlify (inscription au lancement, contact) : on laisse passer
  if (request.method === 'POST' && path === '/') {
    try {
      const form = await request.clone().formData();
      if (FORMS.includes(String(form.get('form-name')))) return context.next();
    } catch { /* corps illisible : on bloque */ }
  }

  // Accès équipe valide : site complet
  if (password && context.cookies.get(COOKIE) === await token(password)) return context.next();

  // Sinon : page d'attente, sans mise en cache
  const res = await context.rewrite('/bientot/');
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  return out;
};
