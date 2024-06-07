import axios from "axios";
import database from "./lib/database.js";
import * as cheerio from "cheerio";
import { createHash } from "crypto";

const URL = "https://en.wikipedia.org/wiki/List_of_most-subscribed_YouTube_channels";
const ITEM_COUNT = 50;
const ROW_COUNT = 7;

axios.get(URL, {}).then(res => {
	const $ = cheerio.load(res.data);

	let rows = [];

	$("tr").each((_i, e) => {
		$(e).find("td").each((_i, e) => {
			rows.push($(e).text().trim());
		});
	});

	for (let i = 0; i < (ITEM_COUNT * ROW_COUNT); i += ROW_COUNT) {
		const YOUTUBER = rows.slice(i, i + ROW_COUNT);
		const YOUTUBER_HASH = createHash("sha256", {}).update(YOUTUBER[0]).digest("hex");
		const YOUTUBER_RANK = (i / ROW_COUNT) + 1;

		database.set("youtubers", YOUTUBER_HASH, {
			rank: YOUTUBER_RANK,
			username: YOUTUBER[0],
			subscribers: parseFloat(YOUTUBER[3]),
			language: YOUTUBER[4],
			category: YOUTUBER[5],
			country: YOUTUBER[6]
		});

		console.log(`#${YOUTUBER_RANK} - ${YOUTUBER[0]}`);
	}
});