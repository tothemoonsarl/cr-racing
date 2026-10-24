// Déclenchée par Netlify à chaque envoi de formulaire validé.
// Ajoute les inscrits du formulaire « lancement » à la liste newsletter Brevo.
// Réglages dans Netlify → Environment variables :
//   BREVO_API_KEY  : clé API Brevo (Brevo → SMTP & API → Clés API)
//   BREVO_LIST_ID  : numéro de la liste Brevo (Contacts → Listes)
// Sans ces variables, rien n'est envoyé : les inscriptions restent dans Netlify Forms (export CSV possible).

export default async (req) => {
  const { payload } = await req.json();
  if (!payload || payload.form_name !== 'lancement') return new Response('ignoré');

  const key = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  const email = String(payload.data?.email || '').trim().toLowerCase();
  if (!key || !listId || !email) return new Response('non configuré');

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      email,
      listIds: [listId],
      updateEnabled: true,
      attributes: { LANGUE: String(payload.data?.langue || 'fr').slice(0, 2) }
    })
  });
  if (!res.ok && res.status !== 204) console.error('Brevo', res.status, await res.text());
  return new Response('ok');
};
