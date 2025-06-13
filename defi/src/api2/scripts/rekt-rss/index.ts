
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom')
import { sendMessage } from "../../../utils/discord";
import * as sdk from '@defillama/sdk';

async function getPostTitles() {
  const cache = await sdk.cache.readCache('rekt-rss', { skipR2Cache: true }) ?? {}
  const response = await fetch('https://rekt.news');
  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const featuredTitles = Array.from(document.querySelectorAll('.post-title'))
    .map((el: any) => {
      const id = el.querySelector('a').getAttribute('href')
      if (cache[id]) return;
      const title = el.textContent.trim();
      cache[id] = title
      return { id, link: `https://rekt.news${id}`, title };
    }).filter(Boolean);


  if (featuredTitles.length === 0) {
    return console.log('No new posts found.');
  }

  await sdk.cache.writeCache('rekt-rss', cache, { skipR2CacheWrite: true });


  if (featuredTitles.length > 7) {
    console.log('More than 7 posts, probably the first run');
    return;
  }


  const message = 'New rekt news post (Add to hack page if missing): \n\n' + featuredTitles.map((post: any) => `[${post.title}](${post.link})`).join('\n');
  await sendMessage(message, process.env.TEAM_WEBHOOK!, false)
}

getPostTitles().catch(err => {
  console.error('Error:', err);
}).then(() => process.exit(0))