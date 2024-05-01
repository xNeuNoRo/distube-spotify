"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  SpotifyPlugin: () => SpotifyPlugin,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/API.ts
var import_spotify_url_info = __toESM(require("spotify-url-info"));
var import_spotify_web_api_node = __toESM(require("spotify-web-api-node"));
var import_undici = require("undici");
var import_distube = require("distube");
var import_spotify_uri = require("spotify-uri");
var SUPPORTED_TYPES = ["album", "playlist", "track", "artist"];
var api = new import_spotify_web_api_node.default();
var info = (0, import_spotify_url_info.default)(import_undici.fetch);
var firstWarning1 = true;
var firstWarning2 = true;
var apiError = /* @__PURE__ */ __name((e) => new import_distube.DisTubeError(
  "SPOTIFY_API_ERROR",
  `The URL is private or unavailable.${e?.body?.error?.message ? `
Details: ${e.body.error.message}` : ""}${e?.statusCode ? `
Status code: ${e.statusCode}.` : ""}`
), "apiError");
var _getTracks, getTracks_fn, _getPaginatedItems, getPaginatedItems_fn;
var _API = class _API {
  constructor(clientId, clientSecret, topTracksCountry) {
    __privateAdd(this, _getTracks);
    __privateAdd(this, _getPaginatedItems);
    __publicField(this, "_hasCredentials", false);
    __publicField(this, "_expirationTime", 0);
    __publicField(this, "_tokenAvailable", false);
    __publicField(this, "topTracksCountry", "US");
    if (clientId && clientSecret) {
      this._hasCredentials = true;
      api.setClientId(clientId);
      api.setClientSecret(clientSecret);
    }
    if (topTracksCountry) {
      if (!/^[A-Z]{2}$/.test(topTracksCountry))
        throw new Error("Invalid region code");
      this.topTracksCountry = topTracksCountry;
    }
  }
  isSupportedTypes(type) {
    return SUPPORTED_TYPES.includes(type);
  }
  async refreshToken() {
    if (Date.now() < this._expirationTime)
      return;
    if (this._hasCredentials) {
      try {
        const { body } = await api.clientCredentialsGrant();
        api.setAccessToken(body.access_token);
        this._expirationTime = Date.now() + body.expires_in * 1e3 - 5e3;
      } catch (e) {
        if (firstWarning1) {
          firstWarning1 = false;
          this._hasCredentials = false;
          console.warn(e);
          console.warn("[SPOTIFY_PLUGIN_API] Cannot get token from your credentials. Try scraping token instead.");
        }
      }
    }
    if (!this._hasCredentials) {
      const response = await (0, import_undici.fetch)("https://open.spotify.com/");
      const body = await response.text();
      const token = body.match(/"accessToken":"(.+?)"/)?.[1];
      if (!token) {
        this._tokenAvailable = false;
        if (firstWarning2) {
          firstWarning2 = false;
          console.warn(
            "[SPOTIFY_PLUGIN_API] Cannot get token from scraping. Cannot fetch more than 100 tracks from a playlist or album."
          );
        }
        return;
      }
      api.setAccessToken(token);
      const expiration = body.match(/"accessTokenExpirationTimestampMs":(\d+)/)?.[1];
      if (expiration)
        this._expirationTime = Number(expiration) - 5e3;
    }
    this._tokenAvailable = true;
  }
  parseUrl(url) {
    return (0, import_spotify_uri.parse)(url);
  }
  async getData(url) {
    const { type, id } = this.parseUrl(url);
    if (!id)
      throw new import_distube.DisTubeError("SPOTIFY_API_INVALID_URL", "Invalid URL");
    if (!this.isSupportedTypes(type))
      throw new import_distube.DisTubeError("SPOTIFY_API_UNSUPPORTED_TYPE", "Unsupported URL type");
    await this.refreshToken();
    if (type === "track") {
      if (!this._tokenAvailable) {
        return info.getData(url);
      }
      try {
        const { body } = await api.getTrack(id);
        return body;
      } catch (e) {
        throw apiError(e);
      }
    }
    if (!this._tokenAvailable) {
      const data = await info.getData(url);
      return {
        type,
        name: data.title,
        thumbnail: data.coverArt?.sources?.[0]?.url,
        url,
        tracks: data.trackList.map((i) => ({
          type: "track",
          name: i.title,
          artists: [{ name: i.subtitle }]
        }))
      };
    }
    try {
      const { body } = await api[type === "album" ? "getAlbum" : type === "playlist" ? "getPlaylist" : "getArtist"](id);
      return {
        type,
        name: body.name,
        thumbnail: body.images?.[0]?.url,
        url: body.external_urls?.spotify,
        tracks: (await __privateMethod(this, _getTracks, getTracks_fn).call(this, body)).filter((t) => t?.type === "track")
      };
    } catch (e) {
      throw apiError(e);
    }
  }
};
_getTracks = new WeakSet();
getTracks_fn = /* @__PURE__ */ __name(async function(data) {
  switch (data.type) {
    case "artist": {
      return (await api.getArtistTopTracks(data.id, this.topTracksCountry)).body.tracks;
    }
    case "album": {
      return await __privateMethod(this, _getPaginatedItems, getPaginatedItems_fn).call(this, data);
    }
    case "playlist": {
      return (await __privateMethod(this, _getPaginatedItems, getPaginatedItems_fn).call(this, data)).map((i) => i.track).filter(import_distube.isTruthy);
    }
  }
}, "#getTracks");
_getPaginatedItems = new WeakSet();
getPaginatedItems_fn = /* @__PURE__ */ __name(async function(data) {
  const items = data.tracks.items;
  const isPlaylist = data.type === "playlist";
  const limit = isPlaylist ? 100 : 50;
  const method = isPlaylist ? "getPlaylistTracks" : "getAlbumTracks";
  while (data.tracks.next) {
    await this.refreshToken();
    data.tracks = (await api[method](data.id, { offset: data.tracks.offset + data.tracks.limit, limit })).body;
    items.push(...data.tracks.items);
  }
  return items;
}, "#getPaginatedItems");
__name(_API, "API");
var API = _API;

// src/index.ts
var import_bluebird = __toESM(require("bluebird"));
var import_distube2 = require("distube");
var isTruthy2 = /* @__PURE__ */ __name((x) => Boolean(x), "isTruthy");
var _SpotifyPlugin = class _SpotifyPlugin extends import_distube2.CustomPlugin {
  constructor(options = {}) {
    super();
    __publicField(this, "api");
    __publicField(this, "parallel");
    __publicField(this, "emitEventsAfterFetching");
    __publicField(this, "maxPlaylistTrack");
    __publicField(this, "songsPerRequest");
    __publicField(this, "requestDelay");
    if (typeof options !== "object" || Array.isArray(options)) {
      throw new import_distube2.DisTubeError("INVALID_TYPE", ["object", "undefined"], options, "SpotifyPluginOptions");
    }
    (0, import_distube2.checkInvalidKey)(
      options,
      [
        "parallel",
        "emitEventsAfterFetching",
        "api",
        "maxPlaylistTrack",
        "songsPerRequest",
        "requestDelay"
      ],
      "SpotifyPluginOptions"
    );
    this.parallel = options.parallel ?? true;
    if (typeof this.parallel !== "boolean") {
      throw new import_distube2.DisTubeError("INVALID_TYPE", "boolean", this.parallel, "SpotifyPluginOptions.parallel");
    }
    this.emitEventsAfterFetching = options.emitEventsAfterFetching ?? false;
    if (typeof this.emitEventsAfterFetching !== "boolean") {
      throw new import_distube2.DisTubeError(
        "INVALID_TYPE",
        "boolean",
        this.emitEventsAfterFetching,
        "SpotifyPluginOptions.emitEventsAfterFetching"
      );
    }
    this.maxPlaylistTrack = options.maxPlaylistTrack ?? 200;
    if (typeof this.maxPlaylistTrack !== "number") {
      throw new import_distube2.DisTubeError(
        "INVALID_TYPE",
        "number",
        this.maxPlaylistTrack,
        "SpotifyPluginOptions.maxPlaylistTrack"
      );
    } else if (this.maxPlaylistTrack <= 0) {
      throw new import_distube2.DisTubeError(
        "INVALID_TYPE",
        "more than 0",
        this.maxPlaylistTrack,
        "SpotifyPluginOptions.maxPlaylistTrack"
      );
    } else if (this.maxPlaylistTrack >= 1e4) {
      throw new import_distube2.DisTubeError(
        "INVALID_TYPE",
        "less than 10000",
        this.maxPlaylistTrack,
        "SpotifyPluginOptions.maxPlaylistTrack"
      );
    }
    this.songsPerRequest = options.songsPerRequest ?? 10;
    if (typeof this.songsPerRequest !== "number") {
      throw new import_distube2.DisTubeError(
        "INVALID_TYPE",
        "number",
        this.songsPerRequest,
        "SpotifyPluginOptions.songsPerRequest"
      );
    } else if (this.songsPerRequest <= 0) {
      throw new import_distube2.DisTubeError(
        "INVALID_TYPE",
        "more than 0",
        this.songsPerRequest,
        "SpotifyPluginOptions.songsPerRequest"
      );
    }
    this.requestDelay = options.requestDelay ?? 1e3;
    if (typeof this.requestDelay !== "number") {
      throw new import_distube2.DisTubeError(
        "INVALID_TYPE",
        "number",
        this.requestDelay,
        "SpotifyPluginOptions.requestDelay"
      );
    } else if (this.requestDelay <= 100) {
      throw new import_distube2.DisTubeError(
        "INVALID_TYPE",
        "more than 100ms",
        this.requestDelay,
        "SpotifyPluginOptions.requestDelay"
      );
    }
    if (options.api !== void 0 && (typeof options.api !== "object" || Array.isArray(options.api))) {
      throw new import_distube2.DisTubeError("INVALID_TYPE", ["object", "undefined"], options.api, "api");
    } else if (options.api) {
      if (options.api.clientId && typeof options.api.clientId !== "string") {
        throw new import_distube2.DisTubeError("INVALID_TYPE", "string", options.api.clientId, "SpotifyPluginOptions.api.clientId");
      }
      if (options.api.clientSecret && typeof options.api.clientSecret !== "string") {
        throw new import_distube2.DisTubeError(
          "INVALID_TYPE",
          "string",
          options.api.clientSecret,
          "SpotifyPluginOptions.api.clientSecret"
        );
      }
      if (options.api.topTracksCountry && typeof options.api.topTracksCountry !== "string") {
        throw new import_distube2.DisTubeError(
          "INVALID_TYPE",
          "string",
          options.api.topTracksCountry,
          "SpotifyPluginOptions.api.topTracksCountry"
        );
      }
    }
    this.api = new API(options.api?.clientId, options.api?.clientSecret, options.api?.topTracksCountry);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(url) {
    if (typeof url !== "string" || !url.includes("spotify"))
      return false;
    try {
      const parsedURL = this.api.parseUrl(url);
      if (!parsedURL.type || !this.api.isSupportedTypes(parsedURL.type))
        return false;
      return true;
    } catch (error) {
      return false;
    }
  }
  async play(voiceChannel, url, options) {
    const DT = this.distube;
    const data = await this.api.getData(url);
    const { member, textChannel, skip, position, metadata } = Object.assign({ position: 0 }, options);
    if (data.type === "track") {
      const query = `${data.name} ${data.artists.map((a) => a.name).join(" ")}`;
      const result = await this.search(query);
      if (!result)
        throw new import_distube2.DisTubeError("SPOTIFY_PLUGIN_NO_RESULT", `Cannot find "${query}" on YouTube.`);
      result.member = member;
      result.metadata = metadata;
      await DT.play(voiceChannel, result, options);
    } else {
      const { name, thumbnail, tracks } = data;
      const queries = tracks.slice(0, this.maxPlaylistTrack).map((track) => `${track.name} ${track.artists.map((a) => a.name).join(" ")}`);
      let firstSong;
      const getFirstSong = /* @__PURE__ */ __name(async () => {
        const firstQuery = queries.shift();
        if (!firstQuery)
          return;
        const result = await this.search(firstQuery);
        if (!result)
          return;
        result.member = member;
        result.metadata = metadata;
        firstSong = result;
      }, "getFirstSong");
      while (!firstSong)
        await getFirstSong();
      if (!firstSong) {
        throw new import_distube2.DisTubeError("SPOTIFY_PLUGIN_NO_RESULT", `Cannot find any tracks of "${name}" on YouTube.`);
      }
      const queue = DT.getQueue(voiceChannel);
      const playlistInfo = {
        source: "spotify",
        songs: [firstSong],
        name,
        thumbnail,
        member,
        url
      };
      const playlist = new import_distube2.Playlist(playlistInfo, { member, metadata });
      let newQueueCreated;
      const fetchTheRest = /* @__PURE__ */ __name(async (q, fs) => {
        if (queries.length) {
          const results = [];
          const query_success = /* @__PURE__ */ new Set();
          if (this.parallel) {
            const cache = [];
            const batchResults = [];
            const tmp_songs = /* @__PURE__ */ new Set();
            const unique_urls = /* @__PURE__ */ new Set();
            let batchCounter = 0;
            let totalProcessed = 0;
            await import_bluebird.default.map(queries, async (query, index) => {
              const search_result = await this.search(query);
              totalProcessed++;
              if (!search_result)
                return import_bluebird.default.delay(this.requestDelay);
              results.push(search_result);
              batchResults.push(search_result);
              tmp_songs.add(search_result.url);
              query_success.add(search_result.url);
              batchCounter++;
              if (batchCounter === this.songsPerRequest || totalProcessed === queries.length) {
                batchCounter = 0;
                const songsToAdd = batchResults.filter((x) => isTruthy2(x) && tmp_songs.has(x.url)).filter((song) => {
                  if (unique_urls.has(song.url)) {
                    return false;
                  } else {
                    unique_urls.add(song.url);
                    return true;
                  }
                }).map((r) => {
                  const s = new import_distube2.Song(r, { member, metadata });
                  s.playlist = playlist;
                  return s;
                });
                const queue_check2 = DT.getQueue(voiceChannel);
                if (queue_check2)
                  await q.addToQueue(songsToAdd, !skip && position > 0 ? position + 1 : position);
                else
                  q = await DT.queues.create(voiceChannel, songsToAdd, textChannel), newQueueCreated = q;
                batchResults.splice(0, batchResults.length);
                tmp_songs.clear();
              }
              cache.push({ url_result: search_result.url, initial_index: index });
              return import_bluebird.default.delay(this.requestDelay);
            }, { concurrency: this.songsPerRequest });
            results.sort((a, b) => {
              const indexA = cache.findIndex((item) => item.url_result === a.url);
              const indexB = cache.findIndex((item) => item.url_result === b.url);
              return cache[indexA].initial_index - cache[indexB].initial_index;
            });
          } else {
            for (let i = 0; i < queries.length; i++) {
              results[i] = await this.search(queries[i]);
            }
          }
          playlist.songs = results.filter(isTruthy2).map((s) => {
            s.playlist = playlist;
            s.member = member;
            s.metadata = metadata;
            return s;
          });
          const queue_check = DT.getQueue(voiceChannel);
          if (queue_check) {
            q.songs.sort(
              (a, b) => playlist.songs.findIndex((ps) => ps.url === a.url) - playlist.songs.findIndex((ps) => ps.url === b.url)
            );
            if (playlist.songs.filter((s) => !query_success.has(s.url)).length) {
              q.addToQueue(
                playlist.songs.filter((s) => !query_success.has(s.url)),
                !skip && position > 0 ? position + 1 : position
              );
            }
          } else {
            q = await DT.queues.create(voiceChannel, playlist.songs, textChannel), newQueueCreated = q;
          }
        }
        playlist.songs.unshift(fs);
      }, "fetchTheRest");
      if (queue) {
        queue.addToQueue(firstSong, position);
        if (skip)
          queue.skip();
        else if (!this.emitEventsAfterFetching)
          DT.emit("addList", queue, playlist);
        await fetchTheRest(queue, firstSong);
        if (!skip && this.emitEventsAfterFetching)
          DT.emit("addList", queue, playlist);
        if (newQueueCreated)
          DT.emit("playSong", newQueueCreated, playlist.songs[1]);
      } else {
        let newQueue = await DT.queues.create(voiceChannel, firstSong, textChannel);
        while (newQueue === true) {
          await getFirstSong();
          newQueue = await DT.queues.create(voiceChannel, firstSong, textChannel);
        }
        DT.emit("playSong", newQueue, firstSong);
        if (!this.emitEventsAfterFetching) {
          if (DT.options.emitAddListWhenCreatingQueue)
            DT.emit("addList", newQueue, playlist);
          if (newQueueCreated)
            DT.emit("playSong", newQueueCreated, playlist.songs[1]);
        }
        await fetchTheRest(newQueue, firstSong);
        if (this.emitEventsAfterFetching) {
          if (DT.options.emitAddListWhenCreatingQueue)
            DT.emit("addList", newQueue, playlist);
          if (newQueueCreated)
            DT.emit("playSong", newQueueCreated, playlist.songs[1]);
        }
      }
    }
  }
  async search(query) {
    try {
      return new import_distube2.Song((await this.distube.search(query, { limit: 1 }))[0]);
    } catch {
      return null;
    }
  }
};
__name(_SpotifyPlugin, "SpotifyPlugin");
var SpotifyPlugin = _SpotifyPlugin;
var src_default = SpotifyPlugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SpotifyPlugin
});
//# sourceMappingURL=index.js.map