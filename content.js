// Upwork Job Ignorer - content.js

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
  delete jobs[uid];
  await setIgnoredJobs(jobs);
}

// --- UI helpers ---

function getJobUID(article) {
  return article.getAttribute('data-ev-job-uid') || article.getAttribute('data-test-key');
}

function getTitleText(article) {
  // Upwork job titles are typically in an h2 or h3 inside the card
  const heading = article.querySelector('h2, h3, [data-test="job-tile-title"]');
  return heading ? heading.textContent.trim() : 'Untitled Job';
}

function createIgnoreButton(uid, isIgnored, article) {
  const btn = document.createElement('button');
  btn.className = 'upwork-ignorer-btn' + (isIgnored ? ' unignore' : '');
  btn.textContent = isIgnored ? 'Unignore' : 'Ignore';
  btn.title = isIgnored ? 'Click to restore this job listing' : 'Click to collapse this job listing';

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (isIgnored) {
      await unignoreJob(uid);
      restoreCard(article, uid);
    } else {
      await ignoreJob(uid);
      collapseCard(article, uid);
    }
  });

  return btn;
}

function collapseCard(article, uid) {
  const title = getTitleText(article);

  // Store original content
  article.dataset.originalContent = article.innerHTML;
  article.dataset.collapsed = 'true';

  // Replace with single-line summary
  article.innerHTML = `
    <div class="upwork-ignorer-collapsed">
      <span class="upwork-ignorer-collapsed-title" title="${title}">${title}</span>
    </div>
  `;

  // Re-add the unignore button into the collapsed view
  const btn = createIgnoreButton(uid, true, article);
  article.querySelector('.upwork-ignorer-collapsed').appendChild(btn);
}

function restoreCard(article, uid) {
  if (article.dataset.originalContent) {
    article.innerHTML = article.dataset.originalContent;
    delete article.dataset.originalContent;
    delete article.dataset.collapsed;
  }

  // Re-inject the ignore button after restoring
  injectIgnoreButton(article, uid, false);
}

function injectIgnoreButton(article, uid, isIgnored) {
  // Don't double-inject
  if (article.querySelector('.upwork-ignorer-btn')) return;

  const btn = createIgnoreButton(uid, isIgnored, article);

  // Target the action button area (where thumbs-down and heart icons live)
  // Upwork puts these in the top-right of the card
  // const actionArea = article.querySelector('[data-test="job-tile-bookmark-icon"]')?.parentElement
    // || article.querySelector('button[aria-label*="save"], button[aria-label*="Save"]')?.parentElement
    // || article.querySelector('.job-tile-header, [class*="header"]');

  const actionArea = article.querySelector('.job-tile-actions>div.d-flex');

  if (actionArea) {
    actionArea.insertBefore(btn, actionArea.firstChild);
  } else {
    // Fallback: prepend to article itself with absolute positioning handled by CSS
    article.style.position = 'relative';
    btn.classList.add('upwork-ignorer-btn--fallback');
    article.appendChild(btn);
  }
}

// --- Main processor ---

async function processJobTiles() {
  const ignoredJobs = await getIgnoredJobs();
  const articles = document.querySelectorAll('article[data-test="JobTile"], article[data-ev-job-uid]');

  articles.forEach((article) => {
    const uid = getJobUID(article);
    if (!uid) return;

    // Skip if already processed in this pass
    if (article.dataset.ignorerProcessed === uid) return;
    article.dataset.ignorerProcessed = uid;

    const isIgnored = !!ignoredJobs[uid];

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
