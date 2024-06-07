import { BSON } from "bson";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { existsSync, mkdir, readFileSync, writeFileSync } from "fs";

/**
 * @typedef SdbFileHex
 * @property {string} signature Signature of the file, in hex
 * @property {string} iv Initialization vector, in hex
 * @property {string} data Encrypted data, in hex
 */

/**
 * @typedef SdbFile
 * @property {string} signature Signature of the file
 * @property {Buffer} iv Initialization vector
 * @property {string} data Encrypted data
 */

// Database
export class CDatabase {
	constructor(path, secret, fileName = "data", fileSignature = "SOLITUM_DATABASE") {
		// Path
		/** @private @type {string} */
		this.path = path;

		if (!existsSync(this.path)) {
			mkdir(this.path, { recursive: true }, () => {});
		}

		// File
		/** @private @type {string} */
		this.filePath = `${this.path}/${fileName}.sdb`;
		/** @private @type {Buffer} */
		this.fileSignature = Buffer.from(fileSignature, "utf8");

		/** @private @type {string} */
		this.encryptionKey = createHash("sha256").update(secret).digest("base64").substring(0, 32);

		// Data
		/** @private @type {string} */
		this.data = {};

		if (existsSync(this.filePath)) {
			this.data = this._read();
		} else {
			this._write();
		}
	}

	/**
	 * Convert value to hex string
	 * @private
	 * @param {string | Buffer | Uint8Array} data 
	 * @returns {string}
	 */
	_toHex(data) {
		return Buffer.from(data).toString("hex");
	}

	/**
	 * Encrypt a string
	 * @private
	 * @param {string} str Plain string
	 * @param {string} key 32-characters long encryption key
	 * @returns
	 */
	_encrypt(str, key) {
		const IV = randomBytes(16);

		const CIPHER = createCipheriv("aes-256-cbc", key, IV, {});	
		const CIPHER_FINAL = CIPHER.update(str, "hex", "binary") + CIPHER.final("binary");

		return { data: CIPHER_FINAL, iv: IV };
	}

	/**
	 * Decrypt an encrypted string
	 * @private
	 * @param {string} str Encrypted string
	 * @param {string} key 32-characters long encryption key
	 * @param {Buffer} iv 16-bytes long initialization vector
	 * @returns 
	 */
	_decrypt(str, key, iv) {
		const DECIPHER = createDecipheriv("aes-256-cbc", key, iv, {});
		const DECIPHER_FINAL = DECIPHER.update(str, "binary", "hex") + DECIPHER.final("hex");
	
		return DECIPHER_FINAL;
	}

	/**
	 * Write encrypted data to path
	 * @private
	 */
	_write() {
		const ENCRYPTION = this._encrypt(this._toHex(BSON.serialize(this.data)), this.encryptionKey);

		/** @type {SdbFile} */
		const SDB_FILE = {
			signature: this._toHex(this.fileSignature),
			iv: this._toHex(ENCRYPTION.iv),
			data: this._toHex(ENCRYPTION.data)
		};

		writeFileSync(this.filePath, this._toHex(BSON.serialize(SDB_FILE)), {});
	}

	/**
	 * Parse .sdb file
	 * @private
	 * @param {string} str 
	 * @returns {SdbFile}
	 */
	_parseSdbFile(str) {
		/** @type {SdbFileHex} */
		let sdb = BSON.deserialize(Buffer.from(str, "hex"));

		return {
			signature: Buffer.from(sdb.signature, "hex"),
			iv: Buffer.from(sdb.iv, "hex"),
			data: Buffer.from(sdb.data, "hex").toString("utf8")
		};
	}

	/**
	 * Read & parse .sdb file
	 * @private
	 * @returns {SdbFile}
	 */
	_read() {
		const SDB_FILE_STR = readFileSync(this.filePath, {}).toString();
		const SDB_FILE = this._parseSdbFile(SDB_FILE_STR);

		if (Buffer.compare(SDB_FILE.signature, this.fileSignature) !== 0) throw new Error("signature is does not match");

		return BSON.deserialize(Buffer.from(this._decrypt(SDB_FILE.data, this.encryptionKey, SDB_FILE.iv), "hex"));
	}

	/**
	 * Returns ``true`` if ``data`` is parent of collection
	 * @private
	 * @param {string} collection
	 * @returns 
	 */
	_collectionExists(collection) {
		return Object.keys(this.data).includes(collection);
	}

	/**
	 * Returns ``true`` if collection is parent of document
	 * @param {string} collection 
	 * @param {string} document
	 * @returns 
	 */
	exists(collection, document) {
		if (!this._collectionExists(collection)) return false;

		return Object.keys(this.data[collection]).includes(document);
	}

	/**
	 * Set document in collection
	 * @param {string} collection
	 * @param {string} document
	 * @param {object} data
	 */
	set(collection, document, data) {
		if (!this._collectionExists(collection)) this.data[collection] = {};

		if (this.exists(collection, document)) {
			Object.assign(this.data[collection][document], data);
		} else {
			this.data[collection][document] = data;
		}

		this._write();
	}

	/**
	 * Get document from collection
	 * @param {string} collection
	 * @param {string} document
	 * @returns {object}
	 */
	get(collection, document) {
		if (!this._collectionExists(collection)) throw new Error("collection not found");
		if (!this.exists(collection, document)) throw new Error("document not found");

		return this.data[collection][document];
	}

	/**
	 * Get all documents from collection
	 * @param {string} collection
	 * @returns {object}
	 */
	all(collection) {
		return this.data[collection];
	}

	/**
	 * Delete document from collection
	 * @param {string} collection
	 * @param {string} document
	 */
	delete(collection, document) {
		if (!this._collectionExists(collection)) throw new Error("collection not found");
		if (!this.exists(collection, document)) throw new Error("document not found");

		const DOCUMENTS = Object.keys(this.data[collection]);

		if (DOCUMENTS.length === 1) {
			delete this.data[collection];
		} else {
			delete this.data[collection][document];
		}

		this._write();
	}

	/**
	 * Find document in collection
	 * @param {string} collection
	 * @param {Object} match
	 */
	find(collection, match) {
		const COLLECTION = this.data[collection];

		function recursive(step, match) {
			return Object.keys(match).every(key => {
				if (!(key in match)) return false;

				const STEP = step[key];
				const MATCH = match[key];

				if (typeof STEP !== typeof MATCH) return false;
				if (typeof STEP !== "object") return STEP === MATCH;

				if (Array.isArray(STEP)) return MATCH.every(item => STEP.includes(item));
				if (Object.keys(STEP).length > 0) return recursive(STEP, MATCH);
			});
		}

		return COLLECTION ? Object.keys(COLLECTION).filter(id => recursive(COLLECTION[id], match)) : [];
	}
}

// Export
export default new CDatabase(`${process.cwd()}/db`, "DsBeQWMB7Xqb8wMTN9FjlBLmg2yvJ1DL");