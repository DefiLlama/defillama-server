

import fetch from 'node-fetch'
import { successResponse, wrap } from './utils/shared'

interface ICredit {
	by: string
}

interface IContentElement {
	subheadlines: { basic: string }
	type: string
	promo_items: { basic: { url: string } }
	canonical_url: string
	display_date: string
	credits: ICredit[]
	headlines: { basic: string }
	taxonomy?: {
		tags?: {
			description: string
			text: string
			slug: string
		}[]
	}
}

interface IArticlesResponse {
	type: string
	version: string
	content_elements: IContentElement[]
}

function getDSLQuery() {
	const conditions = [
		{
			term: {
				'revision.published': 1
			}
		},
		{
			term: {
				type: 'story'
			}
		},
		{
			match_phrase: {
				subtype: `"article"`
			}
		},
		{
			range: {
				display_date: {
					gte: 'now-6M/d', // last 6 months
					lte: 'now'
				}
			}
		}
	]

	return {
		query: {
			bool: {
				must: conditions
			}
		}
	}
}

const fetchArticles = async () => {
	const params = {
		body: JSON.stringify(getDSLQuery()),
		from: '0',
		size: '100',
		sort: 'display_date:desc',
		website: 'dlnews',
		_sourceInclude: 'credits,display_date,headlines,promo_items,publish_date,subheadlines,taxonomy,canonical_url'
	}

	const urlSearch = new URLSearchParams(params)

	const articlesRes: IArticlesResponse = await fetch(
		`${process.env.DL_NEWS_API}/content/v4/search/published?${urlSearch.toString()}`,
		{
			headers: {
				'content-type': 'application/json',
				Authorization: `Bearer ${process.env.DL_NEWS_ACCESS_TOKEN}`
			},
			method: 'GET'
		}
	)
		.then((res) => res.json())
    
	return successResponse(articlesRes, 10*60)
}

export default wrap(fetchArticles);