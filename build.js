// build.js — exécuté par Cloudflare Pages avant le déploiement
// Si _data/messages.json existe → régénère _messages.js
// Sinon → _messages.js est déjà pré-généré dans le repo, on passe
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '_data', 'messages.json');
const dst = path.join(__dirname, 'functions', 'api', '_messages.js');

if (!fs.existsSync(src)) {
  if (fs.existsSync(dst)) {
    console.log('ℹ️  _data/messages.json absent mais _messages.js déjà présent → OK');
    process.exit(0);
  } else {
    console.error('❌ Ni _data/messages.json ni _messages.js trouvés !');
    process.exit(1);
  }
}

const raw = fs.readFileSync(src, 'utf-8');
fs.writeFileSync(dst, `export default ${raw};\n`, 'utf-8');
const kb = Math.round(Buffer.byteLength(raw) / 1024);
console.log(`✅ _messages.js généré (${kb} KB)`);
