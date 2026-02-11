#!/usr/bin/env node
/**
 * Create a GitHub release and upload an asset via API (no gh CLI required).
 * Usage: node scripts/upload-release.js <tag> <zip-path>
 * Requires: GITHUB_TOKEN env var, repo is inferred from origin remote or set REPO_OWNER/REPO.
 */

const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

const tag = process.argv[2];
const zipPath = process.argv[3];
const token = process.env.GITHUB_TOKEN;

if (!tag || !zipPath) {
  console.error('Usage: node scripts/upload-release.js <tag> <zip-path>');
  process.exit(1);
}
if (!token) {
  console.error('Set GITHUB_TOKEN (e.g. export GITHUB_TOKEN=ghp_...)');
  process.exit(1);
}
if (!fs.existsSync(zipPath)) {
  console.error('File not found:', zipPath);
  process.exit(1);
}

let repo = process.env.GITHUB_REPO;
if (!repo) {
  try {
    const url = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/.]+)/);
    repo = m ? m[1] : null;
  } catch (_) {}
}
if (!repo) {
  console.error('Set GITHUB_REPO (e.g. owner/repo) or use a git remote origin pointing to GitHub');
  process.exit(1);
}

const [owner, name] = repo.split('/');

function request(method, path, body, contentType = 'application/json') {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `https://api.github.com${path}`);
    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'obsidanki-release',
      },
    };
    if (body && contentType === 'application/json') {
      opts.headers['Content-Type'] = contentType;
    } else if (body) {
      opts.headers['Content-Type'] = contentType;
    }
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, data, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body && typeof body === 'string') {
      req.write(body);
      req.end();
    } else {
      req.end();
    }
  });
}

async function main() {
  let uploadUrl = null;
  const createRes = await request(
    'POST',
    `https://api.github.com/repos/${owner}/${name}/releases`,
    JSON.stringify({
      tag_name: tag,
      name: tag,
      generate_release_notes: true,
    })
  );
  if (createRes.status === 201 || createRes.status === 200) {
    uploadUrl = createRes.data.upload_url;
  } else if (createRes.status === 422) {
    const getRes = await request('GET', `https://api.github.com/repos/${owner}/${name}/releases/tags/${tag}`);
    if (getRes.status !== 200) {
      console.error('Create release failed:', createRes.status, createRes.data);
      process.exit(1);
    }
    uploadUrl = getRes.data.upload_url;
  } else {
    console.error('Create release failed:', createRes.status, createRes.data);
    process.exit(1);
  }
  uploadUrl = uploadUrl.replace(/\{.*\}/, '') + '?name=obsidanki.zip';

  const zipBuf = fs.readFileSync(zipPath);
  const res = await new Promise((resolve, reject) => {
    const url = new URL(uploadUrl);
    const opts = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/zip',
        'Content-Length': zipBuf.length,
        'User-Agent': 'obsidanki-release',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(zipBuf);
    req.end();
  });
  if (res.status >= 200 && res.status < 300) {
    console.log('Release created and obsidanki.zip uploaded.');
  } else {
    console.error('Upload failed:', res.status, res.data || res.raw);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
