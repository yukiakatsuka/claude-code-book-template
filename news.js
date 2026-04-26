const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

const FEEDS = [
  { name: 'NHK経済', url: 'https://www.nhk.or.jp/rss/news/cat6.xml', color: '#0066cc', noFilter: true },
  { name: 'NHKビジネス', url: 'https://www.nhk.or.jp/rss/news/cat5.xml', color: '#2ecc71', noFilter: true },
  { name: 'NHK政治', url: 'https://www.nhk.or.jp/rss/news/cat4.xml', color: '#cc0033' },
  { name: 'NHK主要', url: 'https://www.nhk.or.jp/rss/news/cat0.xml', color: '#555' },
];

const INVESTMENT_KEYWORDS = [
  '株', '為替', '金利', 'GDP', 'インフレ', '日銀', 'FRB', '円', 'ドル',
  '経済', '財政', '貿易', '輸出', '輸入', '物価', '景気', '上場', '決算',
  '業績', '配当', '投資', '市場', '相場', '債券', '原油', '利上げ', '利下げ',
  '雇用', '失業', 'CPI', '日経', '東証', '関税', '経常収支', 'M&A',
  '半導体', '資源', '財務省', '経産省', '補正予算', '政策金利', '為替介入',
  '買収', '出資', '提携', '上昇', '下落', '急騰', '急落', '円高', '円安',
  '株式市場', '最高値', 'ナスダック', 'AI', 'エネルギー', '電力', '原発',
];

async function fetchFeed(feed) {
  const res = await fetch(RSS2JSON + encodeURIComponent(feed.url), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.message || 'RSS error');

  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;

  return json.items
    .map(item => {
      const title = item.title?.trim() || '';
      const link = item.link?.trim() || '';
      const desc = (item.description || '').replace(/<[^>]+>/g, '').trim();
      // rss2json returns "YYYY-MM-DD HH:MM:SS" in the feed's original timezone (JST for NHK)
      const date = new Date(item.pubDate?.replace(' ', 'T'));
      const pubName = item.author?.trim() || '';

      const text = title + ' ' + desc;
      const matched = feed.noFilter
        ? INVESTMENT_KEYWORDS.filter(kw => text.includes(kw))
        : INVESTMENT_KEYWORDS.filter(kw => text.includes(kw));

      return { title, link, desc, date, pubName, source: feed.name, color: feed.color, matched, noFilter: feed.noFilter };
    })
    .filter(item => item.date >= cutoff && (item.noFilter || item.matched.length > 0) && item.title);
}

function timeAgo(date) {
  const mins = Math.round((Date.now() - date) / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

function renderCard(item) {
  const tags = [...new Set(item.matched)].slice(0, 5);
  return `
    <div class="news-card">
      <div class="card-meta">
        <span class="source-badge" style="background:${item.color}">${item.source}</span>
        ${item.pubName ? `<span class="pub-name">${item.pubName}</span>` : ''}
        <span class="time-ago">${timeAgo(item.date)}</span>
      </div>
      <div class="news-title">
        <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
      </div>
      ${item.desc ? `<div class="news-desc">${item.desc}</div>` : ''}
      <div class="keyword-tags">
        ${tags.map(k => `<span class="tag">${k}</span>`).join('')}
      </div>
    </div>
  `;
}

async function loadNews() {
  const btn = document.getElementById('refresh-btn');
  const list = document.getElementById('news-list');
  const statusBar = document.getElementById('status-bar');
  const errorBar = document.getElementById('error-bar');

  btn.disabled = true;
  list.innerHTML = '<div class="loading"><div class="spinner"></div>ニュースを取得中...</div>';
  errorBar.style.display = 'none';
  statusBar.textContent = '';

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const allItems = [];
  const failed = [];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      allItems.push(...r.value);
    } else {
      failed.push(FEEDS[i].name);
      console.warn(FEEDS[i].name, r.reason);
    }
  });

  // 重複排除（同じタイトル冒頭30文字）
  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.title.slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => b.date - a.date);

  if (failed.length > 0) {
    errorBar.textContent = `一部フィードの取得に失敗: ${failed.join(', ')}`;
    errorBar.style.display = 'block';
  }

  const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  statusBar.textContent = `${unique.length}件の投資関連ニュース（24時間以内）· 更新: ${now}`;

  if (unique.length === 0) {
    list.innerHTML = '<div class="empty">投資関連ニュースが見つかりませんでした</div>';
  } else {
    list.innerHTML = unique.map(renderCard).join('');
  }

  btn.disabled = false;
}

loadNews();
