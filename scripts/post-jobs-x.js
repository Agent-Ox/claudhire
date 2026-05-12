#!/usr/bin/env node
/**
 * ShipStacked — X Job Poster
 * Posts new job listings to @ShipStacked on X.
 * Tracks posted IDs in posted-jobs-state.json to avoid duplicates.
 * Usage:
 *   node post-jobs-x.js           — poll for new jobs and post
 *   node post-jobs-x.js --test    — post a single test tweet (no job data needed)
 *   node post-jobs-x.js --batch   — post all unposted jobs (3-min delay between each)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'posted-jobs-state.json');
const JOBS_ENDPOINT = 'https://shipstacked.com/api/feed/jobs';
const DELAY_BETWEEN_POSTS_MS = 3 * 60 * 1000; // 3 minutes

// --- X Client ---
const client = new TwitterApi({
  appKey: process.env.X_SHIPSTACKED_API_KEY,
  appSecret: process.env.X_SHIPSTACKED_API_SECRET,
  accessToken: process.env.X_SHIPSTACKED_ACCESS_TOKEN,
  accessSecret: process.env.X_SHIPSTACKED_ACCESS_TOKEN_SECRET,
});
const rwClient = client.readWrite;

// --- State ---
function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { posted: [] };
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function markPosted(jobId) {
  const state = loadState();
  if (!state.posted.includes(jobId)) {
    state.posted.push(jobId);
    saveState(state);
  }
}

function isPosted(jobId) {
  return loadState().posted.includes(jobId);
}

// --- Tweet formatter ---
function formatTweet(job) {
  const company = job.company || 'A ShipStacked employer';
  const location = job.location || 'Remote';
  const jobType = job.jobType || job.job_type || job.type || 'Contract';
  const rate = job.dayRate || job.day_rate || job.rate || null;
  const link = job.url || `https://shipstacked.com/jobs/${job.id}`;

  const lines = [
    `🚀 New AI Job on ShipStacked`,
    ``,
    `📌 ${job.title}`,
    `🏢 ${company}`,
    `📍 ${location} · ${jobType}`,
  ];

  if (rate) lines.push(`💰 ${rate}`);

  lines.push(``, `🔗 ${link}`, ``, `#AIjobs #buildinpublic #vibecoding #ClaudeCode #hiring`);

  return lines.join('\n').trim();
}

// --- Fetch jobs ---
async function fetchJobs() {
  const res = await fetch(JOBS_ENDPOINT);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jobs endpoint error ${res.status}: ${text}`);
  }
  const data = await res.json();
  // Handle both array and { jobs: [] } response shapes
  return Array.isArray(data) ? data : (data.jobs || []);
}

// --- Post a single tweet ---
async function postTweet(text) {
  const tweet = await rwClient.v2.tweet(text);
  return tweet.data;
}

// --- Delay helper ---
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Modes ---
async function testMode() {
  console.log('🧪 TEST MODE — posting a single test tweet to @ShipStacked...');
  const testText = `🤖 ShipStacked job distribution is live.\n\nAI jobs, posted automatically. No humans required.\n\nshipstacked.com/jobs\n\n#AIjobs #buildinpublic #vibecoding`;
  console.log('Tweet text:\n---\n' + testText + '\n---');
  const result = await postTweet(testText);
  console.log(`✅ Test tweet posted! ID: ${result.id}`);
  console.log(`🔗 https://x.com/ShipStacked/status/${result.id}`);
}

function isTestJob(job) {
  const testWords = /^test\b/i;
  return testWords.test(job.title) || testWords.test(job.company || '');
}

async function pollMode() {
  console.log('🔄 POLL MODE — checking for new jobs...');
  const jobs = await fetchJobs();
  console.log(`📋 ${jobs.length} job(s) found on endpoint`);
  const newJobs = jobs.filter(j => !isPosted(j.id) && !isTestJob(j));
  console.log(`🆕 ${newJobs.length} unposted job(s)`);

  for (const job of newJobs) {
    const tweet = formatTweet(job);
    console.log(`\nPosting: ${job.title} (${job.id})`);
    console.log('---\n' + tweet + '\n---');
    const result = await postTweet(tweet);
    markPosted(job.id);
    console.log(`✅ Posted! Tweet ID: ${result.id}`);
    if (newJobs.indexOf(job) < newJobs.length - 1) {
      console.log(`⏳ Waiting 3 minutes before next post...`);
      await sleep(DELAY_BETWEEN_POSTS_MS);
    }
  }

  if (newJobs.length === 0) console.log('✅ Nothing new to post.');
}

async function batchMode() {
  console.log('📦 BATCH MODE — posting all unposted jobs with 3-min delay...');
  await pollMode();
}

// --- Main ---
(async () => {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--test')) {
      await testMode();
    } else if (args.includes('--batch')) {
      await batchMode();
    } else {
      await pollMode();
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
