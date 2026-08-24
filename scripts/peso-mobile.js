#!/usr/bin/env node
/**
 * Alarme de peso do app do celular.
 *
 * O QuesTAH World vive na mesma aplicação que o app mobile. Se um dia alguém
 * importar `three` — ou qualquer coisa do mundo 3D — num lugar que a rota `/`
 * enxergue, o celular passa a baixar megabytes de motor gráfico que ele nunca
 * vai usar. O build NÃO reclamaria: continuaria verde, só mais pesado.
 *
 * Este script existe para isso doer na hora.
 *
 * Uso:  npm run peso        (depois de `npm run build`)
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/** Teto do que a rota `/` pode baixar, comprimido. */
const TETO_BYTES = 205 * 1024;

/**
 * Rastros do three.js no que o celular baixa.
 *
 * ATENÇÃO: não adianta procurar "three" nem "node_modules/three" — o código de
 * produção é minificado e esses nomes SOMEM. Foi assim que a primeira versão
 * deste script passou verde sem nunca ter olhado nada. Os padrões abaixo são
 * strings que o three.js carrega para dentro do bundle e o minificador não
 * pode apagar (mensagens de erro e nomes de classe).
 */
const PROIBIDOS = [
  { rotulo: "three.js (renderizador)", padrao: "WebGLRenderer" },
  { rotulo: "three.js (namespace)", padrao: "THREE." },
  { rotulo: "three.js (shaders)", padrao: "ShaderMaterial" },
];

const raiz = process.cwd();
const manifesto = path.join(raiz, ".next/app-build-manifest.json");

if (!fs.existsSync(manifesto)) {
  console.error("✗ Não achei o build. Rode `npm run build` antes.");
  process.exit(1);
}

const paginas = JSON.parse(fs.readFileSync(manifesto, "utf8")).pages || {};
const arquivos = (paginas["/page"] || []).filter((f) => f.endsWith(".js"));

if (!arquivos.length) {
  console.error("✗ O manifesto não lista arquivos para a rota `/`. Build incompleto?");
  process.exit(1);
}

let total = 0;
const vazamentos = [];

for (const rel of arquivos) {
  const abs = path.join(raiz, ".next", rel);
  const bruto = fs.readFileSync(abs);
  total += zlib.gzipSync(bruto).length;

  const texto = bruto.toString("utf8");
  for (const { rotulo, padrao } of PROIBIDOS) {
    if (texto.includes(padrao)) vazamentos.push(`${rotulo}  [${padrao}]  em ${rel}`);
  }
}

const kb = (total / 1024).toFixed(1);
const tetoKb = (TETO_BYTES / 1024).toFixed(1);

console.log(`app do celular (rota /): ${kb} KB comprimidos  ·  teto ${tetoKb} KB`);

if (vazamentos.length) {
  console.error("\n✗ MOTOR 3D VAZOU PARA O CELULAR:");
  vazamentos.forEach((v) => console.error("   " + v));
  console.error("\n   O 3D só pode ser carregado por import dinâmico com { ssr: false },");
  console.error("   a partir de src/components/world/. Veja Palco.tsx.");
  process.exit(1);
}

if (total > TETO_BYTES) {
  console.error(`\n✗ PASSOU DO TETO: ${kb} KB > ${tetoKb} KB`);
  console.error("   Se o crescimento for legítimo, suba o TETO_BYTES conscientemente —");
  console.error("   mas confira antes se não foi o mundo 3D entrando de carona.");
  process.exit(1);
}

console.log("✓ o celular não está pagando pelo mundo 3D");
