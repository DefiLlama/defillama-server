const sdk = require('@defillama/sdk')
const axios = require('axios');
const cheerio = require('cheerio');

const api = 'https://nitter.in.projectsegfau.lt';
const getUrl = (handle, cursor = '') => `${api}/${handle}/search?f=tweets&q=&e-nativeretweets=on&e-replies=on&cursor=${cursor}`;
const getUrlWithHref = (handle, href = '') => `${api}/${handle}/search${href}`;

async function getHandleDetails(handle, tweetSet = new Set()) {
  const updatedAt = +Date.now()
  // Fetch HTML content from the URL
  const response = await axios.get(getUrl(handle), {
    validateStatus: () => true
  });
  const html = response.data;

  // Load HTML content into Cheerio
  const $ = cheerio.load(html);

  // extract as number
  const extractNumber = (selector) => +$(selector).text().trim().replace(/,/g, '');
  if (response.status !== 200 || $('.error-panel').length) {
    const errorText = $('.error-panel').text().trim();
    /* if (new RegExp(`"${handle}" not found`).test(errorText))
      return { notFound: true, error: errorText, updatedAt, handle, }
    if (new RegExp(`has been suspended`).test(errorText))
      return { suspended: true, error: errorText, updatedAt, handle, } */
    throw new Error(errorText);
  }

  const tweetCount = extractNumber('.profile-statlist .posts .profile-stat-num')
  const following = extractNumber('.profile-statlist .following .profile-stat-num')
  const followers = extractNumber('.profile-statlist .followers .profile-stat-num')
  const likes = extractNumber('.profile-statlist .likes .profile-stat-num')
  const joined = $('.profile-joindate span')?.attr('title');
  const displayName = $('.profile-card-fullname').text().trim();
  const userHandle = $('.profile-card-username').text().trim();
  const site = $('.profile-website a').attr('href');
  const description = $('.profile-bio p').text().trim();
  const localtion = $('.profile-location').text().trim();

  const tweets = await getTweets({ $, handle, cursor: '', tweets: [], tweetSet, })

  return { tweetCount, following, followers, likes, joined, site, description, displayName, handle: userHandle, localtion, tweets, updatedAt, }
}

async function getTweets({ $, handle, tweets = [], tweetSet, }) {
  tweets.push(...parseTweets($))
  let href = $('.show-more:last')
  if (!href || tweets.find(i => tweetSet.has(i.id))) return tweets
  await sleep(200)
  href = $(href).find('a').attr('href')

  if (!/cursor/.test(href)) return tweets
  sdk.log(`Fetching more tweets for ${handle} ${tweets.length}`)
  const response = await axios.get(getUrlWithHref(handle, href))

  const html = response.data;
  $ = cheerio.load(html)
  return getTweets({ $, handle, tweets, tweetSet })
}

function parseTweets($) {
  return $('.timeline-item').map((_, element) => {
    const tweet = {};

    // Extract tweet message
    tweet.message = $(element).find('.tweet-content').text().trim();
    if (!$(element).find('.tweet-link').attr('href'))
      return;
    tweet.id = $(element).find('.tweet-link').attr('href').split('/').pop().split('#')[0];
    if (!!$(element).find('.tweet-body>div>.pinned').length)
      tweet.pinned = true

    // Extract time of tweet
    tweet.time = $(element).find('.tweet-date a').attr('title');
    tweet.date = getDateFromTweet(tweet.time);

    // Extract author information
    const authorElement = $(element).find('.fullname-and-username');
    tweet.author = {
      name: authorElement.find('.fullname').text().trim(),
      username: authorElement.find('.username').text().trim()
    };

    // Extract tweet stats
    const statsElement = $(element).find('.tweet-stats');
    tweet.stats = {
      comments: parseInt(statsElement.find('.icon-comment').parent().text().trim()) || 0,
      retweets: parseInt(statsElement.find('.icon-retweet').parent().text().trim()) || 0,
      quotes: parseInt(statsElement.find('.icon-quote').parent().text().trim()) || 0,
      likes: parseInt(statsElement.find('.icon-heart').parent().text().trim()) || 0
    };

    return tweet;
  }).get().filter(i => i)
}

function getMonthIndex(month) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months.findIndex((m) => m === month);
}

function getDateFromTweet(dateString) {
  const dateParts = dateString.split(" · ");

  const datePart = dateParts[0];
  const timePart = dateParts[1];

  const month = datePart.split(" ")[0];
  const day = datePart.split(" ")[1].replace(",", "");
  const year = datePart.split(" ")[2];

  const time = timePart.split(" ")[0];
  const meridian = timePart.split(" ")[1];

  const timeParts = time.split(":");
  let hour = parseInt(timeParts[0]);
  const minute = parseInt(timeParts[1]);

  if (meridian === "PM" && hour !== 12) {
    hour += 12;
  } else if (meridian === "AM" && hour === 12) {
    hour = 0;
  }

  const dateObject = new Date(year, getMonthIndex(month), day, hour, minute)
  return dateObject;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getHandleDetails,
}
