#!/usr/bin/env node
// ============================================================================
// Baut aus der kanonischen Quelle (src/) die deploy-fertigen Umgebungs-
// Varianten (environments/test/ bzw. environments/live/).
//
// Usage: node scripts/build.js <test|live>
//        node scripts/build.js all   (baut beide Umgebungen)
// ============================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_PLUGIN_DIR = path.join(ROOT, 'src', 'plugin');
const SRC_SEO_FILE = path.join(ROOT, 'src', 'seo.js');
const CONFIG_DIR = path.join(ROOT, 'config');
const ENVIRONMENTS_DIR = path.join(ROOT, 'environments');

// Reihenfolge ist bewusst: jedes Modul ist eine eigene, gekapselte IIFE ohne
// geteilte Namen (außer dem absichtlichen window.__sgFeedCache), daher spielt
// die Reihenfolge für die Funktion keine Rolle — nur für die Lesbarkeit.
const PLUGIN_MODULES = ['header.js', 'jobinfo.js'];

const TOKEN_PATTERN = /__[A-Z_]+__/g;

function loadConfig(env) {
  const configPath = path.join(CONFIG_DIR, `${env}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Keine Config gefunden für Umgebung "${env}": ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return {
    ...config,
    // Nur für die Build-Ausgabe; die Module setzen die URL zur Laufzeit aus
    // __FEED_BASE_URL__ + (?feedId=… oder __DEFAULT_FEED_ID__) zusammen.
    feedUrl: config.feedBaseUrl + config.defaultFeedId,
  };
}

function applyTokens(content, config, sourceFile) {
  const tokenValues = {
    __FEED_BASE_URL__: config.feedBaseUrl,
    __DEFAULT_FEED_ID__: config.defaultFeedId,
    __HOWRYOU_LOGO_URL__: config.howryouLogoUrl,
  };

  const replaced = content.replace(TOKEN_PATTERN, (token) => {
    if (!(token in tokenValues)) {
      throw new Error(`Unbekanntes Token ${token} in ${sourceFile} — in build.js ergänzen.`);
    }
    return tokenValues[token];
  });

  return replaced;
}

function buildPluginBundle(config) {
  const parts = PLUGIN_MODULES.map((filename) => {
    const filePath = path.join(SRC_PLUGIN_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return applyTokens(content, config, filePath);
  });
  return parts.join('\n');
}

function buildSeoFile(config) {
  const content = fs.readFileSync(SRC_SEO_FILE, 'utf8');
  return applyTokens(content, config, SRC_SEO_FILE);
}

function writeHeaders(envDir) {
  const headersContent = `/plugin.js
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: no-cache

/seo.js
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: no-cache
`;
  fs.writeFileSync(path.join(envDir, '_headers'), headersContent);
}

function buildEnv(env) {
  const config = loadConfig(env);
  const envDir = path.join(ENVIRONMENTS_DIR, env);
  fs.mkdirSync(envDir, { recursive: true });

  const pluginBundle = buildPluginBundle(config);
  const pluginPath = path.join(envDir, 'plugin.js');
  fs.writeFileSync(pluginPath, pluginBundle);

  const seoBundle = buildSeoFile(config);
  const seoPath = path.join(envDir, 'seo.js');
  fs.writeFileSync(seoPath, seoBundle);

  writeHeaders(envDir);

  console.log(`[build] ${env} (${config.label}) -> ${path.relative(ROOT, pluginPath)}, ${path.relative(ROOT, seoPath)}`);
  console.log(`[build]   feedUrl: ${config.feedUrl}`);
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/build.js <test|live|all>');
    process.exit(1);
  }

  const envs = target === 'all' ? ['test', 'live'] : [target];
  envs.forEach(buildEnv);
}

main();
