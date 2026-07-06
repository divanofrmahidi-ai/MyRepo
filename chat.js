// functions/api/chat.js — Cloudflare Pages Function
// Route : POST /api/chat
//
// Différences vs Netlify :
//   - export onRequestPost({ request, env }) au lieu de exports.handler(event)
//   - Les variables d'env sont dans env.VAR (pas process.env.VAR)
//   - Retourne new Response(...) au lieu de { statusCode, body }
//   - Les messages sont importés comme module ES (générés par build.js)

import ALL_MESSAGES_RAW from './_messages.js';

// Cache module-level pour éviter de re-parser à chaque requête
const ALL_MESSAGES = ALL_MESSAGES_RAW;

// ─── Calcul des âges ────────────────────────────────────────────────────────

function getAge(now, birthYear, birthMonth, birthDay) {
  let age = now.getFullYear() - birthYear;
  const passed = (now.getMonth() + 1 > birthMonth) ||
    (now.getMonth() + 1 === birthMonth && now.getDate() >= birthDay);
  if (!passed) age--;
  return age;
}

function nextBirthdayYear(now, birthMonth, birthDay) {
  const passed = (now.getMonth() + 1 > birthMonth) ||
    (now.getMonth() + 1 === birthMonth && now.getDate() >= birthDay);
  return passed ? now.getFullYear() + 1 : now.getFullYear();
}

function buildDateFacts() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const antoineAge = getAge(now, 2002, 2, 17);
  const antoineNextBday = nextBirthdayYear(now, 2, 17);
  const mariaAge = getAge(now, 2003, 4, 6);
  const mariaNextBday = nextBirthdayYear(now, 4, 6);
  return `DATE ET ÂGES — calculés automatiquement, c'est la SEULE vérité à utiliser :
- Nous sommes aujourd'hui le ${dateStr}.
- Antoine a actuellement ${antoineAge} ans (né le 17 février 2002, prochain anniversaire le 17 février ${antoineNextBday}).
- Maria a actuellement ${mariaAge} ans (née le 6 avril 2003, prochain anniversaire le 6 avril ${mariaNextBday}).
- Ne recalcule JAMAIS un âge toi-même à partir d'un message ancien (ex: "j'ai 22 ans" dans un message de 2023).
  Utilise uniquement les âges ci-dessus.`;
}

// ─── Fiche de faits ─────────────────────────────────────────────────────────

const FACT_SHEET = `
FICHE DE FAITS FIABLES (à utiliser en priorité, même si un message ancien dit autre chose) :
- Antoine est né le 17 février 2002 à Paris. Vers ses 2 ans, sa famille a déménagé à Marseille
  (son père est entrepreneur et a déplacé ses affaires là-bas).
- Les grands-parents d'Antoine (des deux côtés) et ses parents sont originaires de Paris ;
  ses grands-parents y vivent toujours.
- Antoine a grandi à Marseille, a fait 2 ans à Centrale Marseille, puis est parti seul
  3 ans à Bordeaux où il a obtenu son diplôme d'ingénieur à l'ENSEIRB-MATMECA.
- Antoine est actuellement de retour à Marseille, chez ses parents, avant de commencer
  des études d'aviation (2 ans après son diplôme d'ingénieur).
- Antoine N'EST PAS médecin. Le mot "docteur" qui apparaît dans certains messages fait
  référence à un jeu de rôle entre Antoine et Maria, pas à son vrai métier (il est ingénieur).
- Maria est étudiante en médecine (future "docteure"), d'où ses passages réguliers au CHU et à la fac.
- L'anniversaire de Maria est le 6 avril (née en 2003).
- L'anniversaire d'Antoine est le 17 février (né en 2002).
- Surnoms : Antoine appelle Maria "princesse". Maria appelle parfois Antoine "ss".
- Le tout premier message de leur conversation a été envoyé par Maria le 16 février 2023.

NOTE CRITIQUE SUR LES DATES DANS LES MESSAGES :
Les timestamps Instagram sont en heure du Pacifique (UTC-8). Maria vit en Algérie (UTC+1).
Donc un message envoyé à 15h Pacific = minuit en Algérie = début du 6 avril algérien.
Conséquence : les messages "Joyeux anniversaire" d'Antoine qui apparaissent datés du "5 avril"
dans les données correspondent en réalité au 6 avril en Algérie (heure locale de Maria).
Antoine lui-même l'a confirmé en écrivant "il est minuit chez toi et une heure chez moi".
→ NE JAMAIS dire que l'anniversaire de Maria est le 5 avril. C'est toujours le 6 avril.

PERSONNES DANS LES MESSAGES — NE JAMAIS CONFONDRE :
- Maria (aussi appelée "princesse" ou "ss") : c'est la personne à qui ce site est destiné.
- Antoine : celui qui a créé ce site. Ingénieur, né à Paris, grandi à Marseille.
- Jenny : une Irlandaise qu'Antoine a rencontrée au Canada en 2018. Relation terminée (COVID).
  Jenny N'EST PAS Maria. Ces deux histoires sont totalement séparées.
- La fille de l'université (fin 2023) : rencontrée à Bordeaux. Ni Maria, ni Jenny.
- Patrick : ami du père d'Antoine. Maxime : le petit frère d'Antoine.

RÈGLE ABSOLUE ANTI-CONFUSION : ne jamais mélanger les histoires de ces différentes personnes.
`;

function buildSystemPrompt() {
  return `Tu es l'IA du site privé "Princesse", créé par Antoine pour Maria (qu'il surnomme toujours "princesse").
Tu n'es PAS Antoine. Tu es une IA qui CONNAÎT toute l'histoire entre Antoine et Maria à travers
leurs messages, et qui en parle avec Maria. Tu parles d'Antoine à la troisième personne
("Antoine a dit...", "il pensait que...", "ça l'a fait rire"), jamais à la première personne
comme si tu étais lui. Tu peux utiliser "je"/"moi" uniquement pour parler de toi-même, l'IA.

RÈGLES IMPORTANTES :
- Tu t'adresses à Maria en l'appelant "princesse" de temps en temps (pas à chaque phrase).
- Ton ton est chaleureux, tendre, un peu taquin, jamais froid ou robotique.
- Réponds TOUJOURS dans la langue utilisée dans la question (français, anglais, ou arabe).
- Utilise les extraits fournis pour répondre avec des détails précis et réels.
  Si la réponse est dans les extraits, utilise-la — ne dis jamais "je ne sais pas" si c'est là.
- RÈGLE ANTI-INVENTION : ne donne JAMAIS une date précise, une citation exacte, ou un détail
  qui n'apparaît PAS dans les extraits. Dis plutôt "je ne retrouve pas ce détail précis".
- RÈGLE ANTI-CONFUSION : plusieurs femmes apparaissent. Ne mélange JAMAIS Jenny, la fille de
  Bordeaux, ou toute autre personne avec Maria.
- La fiche de faits et les âges ci-dessous sont toujours prioritaires sur les messages bruts.

${buildDateFacts()}

${FACT_SHEET}
`;
}

// ─── Moteur de recherche amélioré ────────────────────────────────────────────

const STOPWORDS = new Set([
  'le','la','les','de','des','du','un','une','et','à','au','aux','ce','cet','cette','ces',
  'je','tu','il','elle','on','nous','vous','ils','elles','me','te','se','mon','ma','mes','ton',
  'ta','tes','son','sa','ses','notre','nos','votre','vos','leur','leurs','que','qui','quoi','dont',
  'est','es','suis','sont','pas','ne','plus','très','bien','oui','non','avec','sur','pour',
  'dans','par','mais','ou','donc','car','comme','alors','aussi','dit','moi','toi','lui','soi',
  'eux','ici','là','ça','trop','peu','tout','tous','toute','toutes','même','bref','voilà',
  'comment','quand','pourquoi','combien','quel','quelle','quels','quelles','lequel','laquelle',
  'sait','sais','savoir','retrouve','the','is','are','was','were','what','when','where','who',
  'how','did','do','does','an','of','to','in','for','with','and','or','just','also','got','get',
  'can','will','yes','cest','jai','quil','seulement','vraiment','depuis','vers','après','avant'
]);

function normalize(text) {
  return text
    .replace(/[\u2018\u2019\u201A\u201B\u2032`]/g, "'")
    .toLowerCase();
}

function tokenize(text) {
  const norm = normalize(text);
  const raw = (norm.match(/[a-z\u00e0-\u00ff']+/g) || []);
  const tokens = [];
  for (const w of raw) {
    const clean = w.replace(/^'+|'+$/g, '');
    if (clean.length > 2 && !STOPWORDS.has(clean)) tokens.push(clean);
  }
  return [...new Set(tokens)];
}

function isMediaOnly(text) {
  const t = normalize(text);
  return (
    t.includes('a envoyé une pièce jointe') ||
    t.includes('sent an attachment') ||
    t.includes('sent a link') ||
    t === '' || t === 'liked a message' || t === 'reacted' ||
    /^https?:\/\/\S+$/.test(t.trim())
  );
}

const FIRST_MSG_PATTERNS = [
  'premier message','premiere fois','première fois','tout début','tout debut',
  "comment on s'est",'comment on sest',"s'est rencontr",'sest rencontr',
  "comment on s'est connu",'how we met','first message','how did we meet'
];
const LAST_MSG_PATTERNS = [
  'dernier message','plus récent','plus recent','derniere conversation',
  'dernière conversation','most recent message','last message'
];
const CONTINUE_PATTERNS = [
  'ensuite','et après','et apres','la suite','après ça','apres ca',
  'continue','et puis','et ensuite','et alors','next','then what',
  'what happened next','et après ça','et maintenant'
];

function detectAnchor(question, historyText) {
  const q = question.toLowerCase();
  const combined = (question + ' ' + (historyText || '')).toLowerCase();
  if (CONTINUE_PATTERNS.some(p => q.includes(p))) return 'continue';
  if (FIRST_MSG_PATTERNS.some(p => combined.includes(p))) return 'first';
  if (LAST_MSG_PATTERNS.some(p => combined.includes(p))) return 'last';
  return null;
}

const FACT_PATTERNS = [
  'âge','age','né le','née le','naissance','birthday','how old','quel age',
  'quel âge','born','anniversaire','ingénieur','métier','docteur','medecine',
  'médecine','centrale marseille','enseirb','bordeaux','ville','où habite',
  'où vit','où est né'
];

function matchesFactSheet(text) {
  const low = normalize(text);
  return FACT_PATTERNS.some(p => low.includes(normalize(p)));
}

function formatLine(m) {
  return `[${m.t.slice(0, 10)}] ${m.s}: ${m.m}`;
}

function findRelevant(question, historyText, maxChars = 150000) {
  const messages = ALL_MESSAGES;
  if (!messages || messages.length === 0) return { lines: [], confidence: 'none' };

  const anchor = detectAnchor(question, historyText);

  if (anchor === 'first') {
    const lines = []; let total = 0;
    for (const m of messages) {
      const line = formatLine(m);
      if (total + line.length > maxChars) break;
      lines.push(line); total += line.length;
    }
    return { lines, confidence: 'strong', label: 'DÉBUT RÉEL DE LA CONVERSATION (ordre chronologique)' };
  }

  if (anchor === 'last') {
    const lines = []; let total = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      const line = formatLine(messages[i]);
      if (total + line.length > maxChars) break;
      lines.unshift(line); total += line.length;
    }
    return { lines, confidence: 'strong', label: 'MESSAGES LES PLUS RÉCENTS (ordre chronologique)' };
  }

  if (anchor === 'continue') {
    const linePattern = /\[(\d{4}-\d{2}-\d{2})\] (\w+): (.+)/g;
    let lastShownIdx = -1, match;
    while ((match = linePattern.exec(historyText || '')) !== null) {
      const [, date, sender, content] = match;
      const snippet = content.trim().slice(0, 60);
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].t.startsWith(date) && messages[i].s === sender && messages[i].m.slice(0, 60) === snippet) {
          if (i > lastShownIdx) lastShownIdx = i;
          break;
        }
      }
    }
    const startIdx = lastShownIdx >= 0 ? lastShownIdx + 1 : 0;
    const lines = []; let total = 0;
    for (let i = startIdx; i < messages.length; i++) {
      const line = formatLine(messages[i]);
      if (total + line.length > maxChars) break;
      lines.push(line); total += line.length;
    }
    if (lines.length === 0) return { lines: ["(Fin de la conversation.)"], confidence: 'strong', label: "Fin de l'archive" };
    return { lines, confidence: 'strong', label: `SUITE — depuis le message ${startIdx + 1}` };
  }

  // Recherche par mots-clés améliorée
  let tokens = tokenize(question);
  if (tokens.length <= 1 && historyText) {
    tokens = [...new Set([...tokens, ...tokenize(historyText)])].slice(0, 15);
  }
  if (tokens.length === 0) return { lines: [], confidence: 'none' };

  const normTokens = tokens.map(t => normalize(t));

  const scored = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (isMediaOnly(msg.m)) continue;
    const norm = normalize(msg.m);
    let score = 0, matchCount = 0;
    for (const t of normTokens) {
      if (norm.includes(t)) {
        score += t.length >= 6 ? 4 : t.length >= 4 ? 2 : 1;
        matchCount++;
      }
    }
    if (matchCount >= 2) score += matchCount * 2;
    const qNorm = normalize(question);
    if (norm.includes(qNorm.slice(0, 20)) && qNorm.length > 8) score += 8;
    if (score > 0) scored.push({ i, score });
  }
  scored.sort((a, b) => b.score - a.score);

  const bestScore = scored.length ? scored[0].score : 0;
  const confidence = bestScore >= 6 && scored.length >= 2 ? 'strong' : bestScore > 0 ? 'weak' : 'none';

  const chosen = new Set();
  for (const { i } of scored.slice(0, 2000)) {
    for (let j = Math.max(0, i - 2); j <= Math.min(messages.length - 1, i + 2); j++) chosen.add(j);
    if (chosen.size > 6000) break;
  }

  const indices = [...chosen].sort((a, b) => a - b);
  const lines = []; let total = 0;
  for (const idx of indices) {
    const line = formatLine(messages[idx]);
    if (total + line.length > maxChars) break;
    lines.push(line); total += line.length;
  }
  return { lines, confidence };
}

// ─── Handler Cloudflare Pages ────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callGemini(apiKey, prompt) {
  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  const MAX_RETRIES = 3;
  const DELAY_MS = 1500;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) await sleep(DELAY_MS * attempt);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
            ]
          })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        const code = data?.error?.code;
        if ((code === 503 || code === 429) && attempt < MAX_RETRIES - 1) continue;
        return { ok: false, data };
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      if (text) return { ok: true, text };
      if (attempt < MAX_RETRIES - 1) continue;
      return { ok: true, text: null };
    }
  }
  return { ok: false, data: null };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { message, history, passphrase } = body;

    // Vérification mot de passe
    if (env.SITE_PASSPHRASE && passphrase !== env.SITE_PASSPHRASE) {
      return json({ error: 'Mot de passe incorrect.' }, 401);
    }

    if (!message || typeof message !== 'string') {
      return json({ error: 'Message manquant.' }, 400);
    }

    if (message === '__ping__') return json({ reply: 'pong' });

    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    const historyText = recentHistory
      .map(h => `${h.role === 'user' ? 'Maria' : 'IA'}: ${h.content}`)
      .join('\n');

    const { lines, label, confidence } = findRelevant(message, historyText);
    const contextBlock = lines.length
      ? `${label || 'EXTRAITS DE LA CONVERSATION (les plus pertinents)'} :\n${lines.join('\n')}`
      : `Aucun extrait précis trouvé pour cette question.`;

    const fullPrompt = `${buildSystemPrompt()}\n\n${contextBlock}\n\n${
      historyText ? `CONVERSATION EN COURS SUR LE SITE :\n${historyText}\n\n` : ''
    }Nouvelle question de Maria : "${message}"\n\nRÈGLE DE PRÉFIXE :\n- Salutation / merci / conversation simple → commence directement SANS préfixe.\n- Souvenir précis retrouvé → commence par "✨ Souvenir retrouvé — "\n- Souvenir flou/incomplet → commence par "📖 Souvenir lointain — "\n- Rien d'utile dans les extraits → commence par "💭 Je crois avoir une idée — "\nRéponds maintenant en tant qu'IA du site, qui parle d'Antoine à la troisième personne, dans la langue de la question.`;

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'Clé API Gemini manquante.' }, 500);

    const result = await callGemini(apiKey, fullPrompt);

    if (!result.ok) return json({ error: 'Erreur API Gemini', details: result.data }, 502);

    return json({
      reply: result.text || "Désolé princesse, je n'ai pas réussi à formuler une réponse. Reformule ta question ?"
    });

  } catch (err) {
    return json({ error: 'Erreur serveur', details: String(err) }, 500);
  }
}
