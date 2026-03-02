const fs = require('fs');

let layout = fs.readFileSync('app/layout.tsx', 'utf8');
layout = layout.replace(/JetBrains_Mono,\s*JetBrains_Mono/g, 'JetBrains_Mono');
fs.writeFileSync('app/layout.tsx', layout);

let expireOffers = fs.readFileSync('lib/jobs/expire-offers.ts', 'utf8');
expireOffers = expireOffers.replace(/\.\.\.expiredDeals/g, '...Array.from(expiredDeals)');
fs.writeFileSync('lib/jobs/expire-offers.ts', expireOffers);

console.log('Fixed duplicates');
