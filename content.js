// TopWork - content.js

const STORAGE_KEY = 'upwork_ignored_jobs';

// --- Storage helpers ---

async function getIgnoredJobs() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

async function setIgnoredJobs(jobs) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: jobs }, resolve);
  });
}

async function ignoreJob(uid) {
  const jobs = await getIgnoredJobs();
  jobs[uid] = { ignored: true };
  await setIgnoredJobs(jobs);
}

async function unignoreJob(uid) {
  const jobs = await getIgnoredJobs();
  jobs[uid] = { ignored: false };
  await setIgnoredJobs(jobs);
}

async function registerJobs(uids) {
  const jobs = await getIgnoredJobs();
  let changed = false;
  for (const uid of uids) {
    if (!(uid in jobs)) {
      jobs[uid] = { ignored: false };
      changed = true;
    }
  }
  if (changed) await setIgnoredJobs(jobs);
}

// --- Helpers ---

function getJobUID(article) {
  return article.getAttribute('data-ev-job-uid') || article.getAttribute('data-test-key');
}

// --- Main processor ---

async function processJobTiles() {
  const articles = document.querySelectorAll('article[data-test="JobTile"], article[data-ev-job-uid]');

  const uids = [];
  articles.forEach((article) => {
    const uid = getJobUID(article);
    if (uid) uids.push(uid);
  });
  await registerJobs(uids);

  const ignoredJobs = await getIgnoredJobs();

  articles.forEach((article) => {
    const uid = getJobUID(article);
    if (!uid) return;

    // Skip if already processed in this pass
    if (article.dataset.ignorerProcessed === uid) return;
    article.dataset.ignorerProcessed = uid;

    const isIgnored = ignoredJobs[uid]?.ignored === true;

    if (isIgnored && !article.dataset.collapsed) {
      collapseCard(article, uid);
    } else if (!isIgnored) {
      injectIgnoreButton(article, uid, false);
    }
  });
}

// --- MutationObserver to handle infinite scroll / dynamic loads ---

let debounceTimer = null;

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(processJobTiles, 300);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial run
processJobTiles();
