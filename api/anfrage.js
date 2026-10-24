// Kontaktformular: verschickt Anfragen per SMTP (Webador-Postfach) an info@schnellegutachten.de
const nodemailer = require('nodemailer');

const clean = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\n+/g, ' ');
const isMail = (v) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);

function parseBody(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch (_) { return Object.fromEntries(new URLSearchParams(b)); }
  }
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Methode nicht erlaubt' });
  }

  const b = parseBody(req);

  // Spam-Falle: unsichtbares Feld ist ausgefüllt -> still "OK" antworten, nichts senden
  if (clean(b.company_alt, 200) !== '') return res.status(200).json({ ok: true });

  const name = oneLine(b.name, 120);
  const telefon = oneLine(b.telefon, 60);
  const email = oneLine(b.email, 160);
  const stadt = oneLine(b.stadt, 120);
  const message = clean(b.message, 5000);
  const consent = b.datenschutz === true || b.datenschutz === 'true' || b.datenschutz === 'on' || b.datenschutz === '1';

  if (!name || !telefon) return res.status(400).json({ ok: false, error: 'Bitte Name und Telefon angeben.' });
  if (!consent) return res.status(400).json({ ok: false, error: 'Bitte akzeptieren Sie die Datenschutzerklärung.' });
  if (email && !isMail(email)) return res.status(400).json({ ok: false, error: 'Bitte eine gültige E-Mail-Adresse angeben.' });

  const { SMTP_HOST = 'mail.webador.com', SMTP_PORT = '587', SMTP_USER, SMTP_PASS, MAIL_TO } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.error('SMTP_USER/SMTP_PASS fehlen');
    return res.status(500).json({ ok: false, error: 'Formular ist noch nicht eingerichtet.' });
  }

  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const text = [
    'Neue Anfrage über www.schnellegutachten.de',
    '',
    `Name:     ${name}`,
    `Telefon:  ${telefon}`,
    `E-Mail:   ${email || '–'}`,
    `Ort:      ${stadt || '–'}`,
    '',
    'Was ist passiert?',
    message || '–',
    '',
    '---',
    `Datenschutz akzeptiert: ja · ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
  ].join('\n');

  try {
    await transporter.sendMail({
      from: { name: 'Website Schnelle-Gutachten', address: SMTP_USER },
      to: MAIL_TO || SMTP_USER,
      replyTo: email ? { name, address: email } : undefined,
      subject: `Neue Anfrage: ${name}${stadt ? ' (' + stadt + ')' : ''}`,
      text,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Mailversand fehlgeschlagen:', err && err.message);
    return res.status(502).json({ ok: false, error: 'Versand fehlgeschlagen.' });
  }
};
