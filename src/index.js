import axios from "axios";
import database from "./lib/database.js";
import * as cheerio from "cheerio";
import { createHash, randomUUID } from "crypto";

const URL = "https://en.wikipedia.org/wiki/List_of_most-subscribed_YouTube_channels";
const ITEM_COUNT = 50;
const ROW_COUNT = 7;

axios.get(URL, {}).then(res => {
	const VISIT_ID = randomUUID();

	const $ = cheerio.load(res.data);

	let rows = [];

	$("tr").each((_i, element) => {
		$(element).find("td").each((_i, element) => {
			rows.push($(element).text().trim());
		});
	});

	let youtubers = [];

	for (let i = 0; i < (ITEM_COUNT * ROW_COUNT); i += ROW_COUNT) {
		const YOUTUBER = rows.slice(i, i + ROW_COUNT);
		const YOUTUBER_HASH = createHash("sha256", {}).update(YOUTUBER[0]).digest("hex");
		const YOUTUBER_RANK = (i / ROW_COUNT) + 1;
		const YOUTUBER_SUBS = parseFloat(YOUTUBER[3]);
		const YOUTUBER_LANG = YOUTUBER[4].replace(/\[(.*)\]/, "");

		const YOUTUBER_VISITS = database.exists("youtubers", YOUTUBER_HASH) ? database.get("youtubers", YOUTUBER_HASH).visits : [];

		database.set("youtubers", YOUTUBER_HASH, {
			username: YOUTUBER[0],
			visits: [...YOUTUBER_VISITS, {
				id: VISIT_ID,
				rank: YOUTUBER_RANK,
				subscribers: YOUTUBER_SUBS,
			}],
			language: YOUTUBER_LANG,
			category: YOUTUBER[5],
			country: YOUTUBER[6]
		});

		youtubers.push(YOUTUBER_HASH);

		console.log(`#${YOUTUBER_RANK} - ${YOUTUBER[0]} (${YOUTUBER_SUBS}M)`);
	}
	
	database.set("visits", VISIT_ID, { collectedOn: new Date(), url: URL, youtubers });
});