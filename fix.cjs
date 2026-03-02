const fs = require('fs');

const files = [
    'app/(dashboard)/webhooks/page.tsx',
    'app/(dashboard)/page.tsx',
    'app/(dashboard)/keys/page.tsx',
    'app/(dashboard)/deals/[dealId]/page.tsx',
    'app/(dashboard)/deals/page.tsx'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/const cookieStore = cookies\(\)/g, 'const cookieStore = await cookies()');
    fs.writeFileSync(file, content);
}

let layout = fs.readFileSync('app/layout.tsx', 'utf8');
layout = layout.replace(/Berkeley_Mono/g, 'JetBrains_Mono');
fs.writeFileSync('app/layout.tsx', layout);

let tailwind = fs.readFileSync('tailwind.config.ts', 'utf8');
tailwind = tailwind.replace(/darkMode: \["class"\]/, 'darkMode: "class"');
fs.writeFileSync('tailwind.config.ts', tailwind);

let tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
tsconfig.compilerOptions.downlevelIteration = true;
fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));

console.log('Fixes applied successfully.');
