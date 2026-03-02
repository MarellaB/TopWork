// Feature: Ignore - button UI, card collapse/restore

function getTitleText(article) {
  const heading = article.querySelector('h2, h3, [data-test="job-tile-title"]');
  return heading ? heading.textContent.trim() : 'Untitled Job';
}

function createIgnoreButton(uid, isIgnored, article) {
  const btn = document.createElement('button');
  btn.className = 'upwork-ignorer-btn' + (isIgnored ? ' unignore' : '');
  btn.title = isIgnored ? 'Click to restore this job listing' : 'Click to collapse this job listing';

  if (isIgnored) {
    btn.textContent = 'Unignore';
  } else {
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('features/ignore/ignore.svg');
    img.className = 'upwork-ignorer-icon';
    img.alt = 'Ignore';
    btn.appendChild(img);
  }

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

  article.dataset.originalContent = article.innerHTML;
  article.dataset.collapsed = 'true';

  article.innerHTML = `
    <div class="upwork-ignorer-collapsed">
      <span class="upwork-ignorer-collapsed-title" title="${title}">${title}</span>
    </div>
  `;

  const btn = createIgnoreButton(uid, true, article);
  article.querySelector('.upwork-ignorer-collapsed').appendChild(btn);
}

function restoreCard(article, uid) {
  if (article.dataset.originalContent) {
    article.innerHTML = article.dataset.originalContent;
    delete article.dataset.originalContent;
    delete article.dataset.collapsed;
  }

  injectIgnoreButton(article, uid, false);
}

function injectIgnoreButton(article, uid, isIgnored) {
  if (article.querySelector('.upwork-ignorer-btn')) return;

  const btn = createIgnoreButton(uid, isIgnored, article);

  const actionArea = article.querySelector('.job-tile-actions>div.d-flex');

  if (actionArea) {
    actionArea.insertBefore(btn, actionArea.firstChild);
  } else {
    article.style.position = 'relative';
    btn.classList.add('upwork-ignorer-btn--fallback');
    article.appendChild(btn);
  }
}
