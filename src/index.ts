import { API } from "./API";
import bluebird from "bluebird";
import { CustomPlugin, DisTubeError, Playlist, Song, checkInvalidKey } from "distube";
import type { VoiceBasedChannel } from "discord.js";
import type { PlayOptions, PlaylistInfo, Queue } from "distube";

type Falsy = undefined | null | false | 0 | "";
const isTruthy = <T>(x: T | Falsy): x is T => Boolean(x);

export type SpotifyPluginOptions = {
  api?: {
    clientId?: string;
    clientSecret?: string;
    topTracksCountry?: string;
  };
  parallel?: boolean;
  emitEventsAfterFetching?: boolean;
  maxPlaylistTrack?: number;
  songsPerRequest?: number;
  requestDelay?: number;
};

export class SpotifyPlugin extends CustomPlugin {
  api: API;
  parallel: boolean;
  emitEventsAfterFetching: boolean;
  maxPlaylistTrack: number;
  songsPerRequest: number;
  requestDelay: number;
  constructor(options: SpotifyPluginOptions = {}) {
    super();
    if (typeof options !== "object" || Array.isArray(options)) {
      throw new DisTubeError("INVALID_TYPE", ["object", "undefined"], options, "SpotifyPluginOptions");
    }
    checkInvalidKey(
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
      throw new DisTubeError("INVALID_TYPE", "boolean", this.parallel, "SpotifyPluginOptions.parallel");
    }
    this.emitEventsAfterFetching = options.emitEventsAfterFetching ?? false;
    if (typeof this.emitEventsAfterFetching !== "boolean") {
      throw new DisTubeError(
        "INVALID_TYPE",
        "boolean",
        this.emitEventsAfterFetching,
        "SpotifyPluginOptions.emitEventsAfterFetching",
      );
    }
    this.maxPlaylistTrack = options.maxPlaylistTrack ?? 200;
    if (typeof this.maxPlaylistTrack !== "number") {
      throw new DisTubeError(
        "INVALID_TYPE",
        "number",
        this.maxPlaylistTrack,
        "SpotifyPluginOptions.maxPlaylistTrack"
      );
    } else if (this.maxPlaylistTrack <= 0) {
      throw new DisTubeError(
        "INVALID_TYPE",
        "more than 0",
        this.maxPlaylistTrack,
        "SpotifyPluginOptions.maxPlaylistTrack"
      );
    } else if (this.maxPlaylistTrack >= 10000) {
      throw new DisTubeError(
        "INVALID_TYPE",
        "less than 10000",
        this.maxPlaylistTrack,
        "SpotifyPluginOptions.maxPlaylistTrack"
      );
    }
    this.songsPerRequest = options.songsPerRequest ?? 10;
    if (typeof this.songsPerRequest !== "number") {
      throw new DisTubeError(
        "INVALID_TYPE",
        "number",
        this.songsPerRequest,
        "SpotifyPluginOptions.songsPerRequest"
      );
    } else if (this.songsPerRequest <= 0) {
      throw new DisTubeError(
        "INVALID_TYPE",
        "more than 0",
        this.songsPerRequest,
        "SpotifyPluginOptions.songsPerRequest"
      );
    }
    this.requestDelay = options.requestDelay ?? 1000;
    if (typeof this.requestDelay !== "number") {
      throw new DisTubeError(
        "INVALID_TYPE",
        "number",
        this.requestDelay,
        "SpotifyPluginOptions.requestDelay"
      );
    } else if (this.requestDelay <= 100) {
      throw new DisTubeError(
        "INVALID_TYPE",
        "more than 100ms",
        this.requestDelay,
        "SpotifyPluginOptions.requestDelay"
      );
    }
    if (options.api !== undefined && (typeof options.api !== "object" || Array.isArray(options.api))) {
      throw new DisTubeError("INVALID_TYPE", ["object", "undefined"], options.api, "api");
    } else if (options.api) {
      if (options.api.clientId && typeof options.api.clientId !== "string") {
        throw new DisTubeError("INVALID_TYPE", "string", options.api.clientId, "SpotifyPluginOptions.api.clientId");
      }
      if (options.api.clientSecret && typeof options.api.clientSecret !== "string") {
        throw new DisTubeError(
          "INVALID_TYPE",
          "string",
          options.api.clientSecret,
          "SpotifyPluginOptions.api.clientSecret",
        );
      }
      if (options.api.topTracksCountry && typeof options.api.topTracksCountry !== "string") {
        throw new DisTubeError(
          "INVALID_TYPE",
          "string",
          options.api.topTracksCountry,
          "SpotifyPluginOptions.api.topTracksCountry",
        );
      }
    }
    this.api = new API(options.api?.clientId, options.api?.clientSecret, options.api?.topTracksCountry);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  override async validate(url: string) {
    if (typeof url !== "string" || !url.includes("spotify")) return false;
    try {
      const parsedURL = this.api.parseUrl(url);
      if (!parsedURL.type || !this.api.isSupportedTypes(parsedURL.type)) return false;
      return true;
    } catch (error) {
      return false;
    }
  }

  async play(voiceChannel: VoiceBasedChannel, url: string, options: PlayOptions) {
    const DT = this.distube;
    const data = await this.api.getData(url);
    const { member, textChannel, skip, position, metadata } = Object.assign({ position: 0 }, options);
    if (data.type === "track") {
      const query = `${data.name} ${data.artists.map((a: any) => a.name).join(" ")}`;
      const result = await this.search(query);
      if (!result) throw new DisTubeError("SPOTIFY_PLUGIN_NO_RESULT", `Cannot find "${query}" on YouTube.`);
      result.member = member;
      result.metadata = metadata;
      await DT.play(voiceChannel, result, options);
    } else {
      const { name, thumbnail, tracks } = data;
      const queries = tracks
       .slice(0, this.maxPlaylistTrack)
       .map(track => `${track.name} ${track.artists.map((a: any) => a.name).join(" ")}`);
      let firstSong: Song | undefined;
      const getFirstSong = async () => {
        const firstQuery = queries.shift();
        if (!firstQuery) return;
        const result = await this.search(firstQuery);
        if (!result) return;
        result.member = member;
        result.metadata = metadata;
        firstSong = result;
      };
      while (!firstSong) await getFirstSong();

      if (!firstSong) {
        throw new DisTubeError("SPOTIFY_PLUGIN_NO_RESULT", `Cannot find any tracks of "${name}" on YouTube.`);
      }
      const queue = DT.getQueue(voiceChannel);

      const playlistInfo: PlaylistInfo = {
        source: "spotify",
        songs: [firstSong],
        name,
        thumbnail,
        member,
        url,
      };
      const playlist = new Playlist(playlistInfo, { member, metadata });
      let newQueueCreated;
      const fetchTheRest = async (q: Queue, fs: Song) => {
        if (queries.length) {
          const results: (Song | null)[] = [];
          const query_success = new Set();
          if (this.parallel) {
            //results = await Promise.all(queries.map(query => this.search(query)));
            interface CacheItem {
              url_result?: any;
              initial_index?: any;
            }

            const cache: CacheItem[] = [];
            const batchResults: any[] = [];
            const tmp_songs = new Set();
            const unique_urls = new Set();
            let batchCounter = 0;
            let totalProcessed = 0;
            //let initialTime = new Date();

            // NEW METHOD
            await bluebird.map(queries, async (query: any, index: any) => {
              const search_result = await this.search(query);
              totalProcessed++;
              if (!search_result) return bluebird.delay(this.requestDelay);
              results.push(search_result);
              batchResults.push(search_result);
              tmp_songs.add(search_result.url);
              query_success.add(search_result.url);
              batchCounter++;

              if (batchCounter === this.songsPerRequest || totalProcessed === queries.length) {
                batchCounter = 0;

                const songsToAdd = batchResults
                 .filter(x => isTruthy(x) && tmp_songs.has(x.url))
                 .filter(song => {
                  if (unique_urls.has(song.url)) {
                    return false;
                  } else {
                    unique_urls.add(song.url);
                    return true;
                  }
                })
                 .map(r => {
                  const s = new Song(r, { member, metadata });
                  s.playlist = playlist;
                  return s;
                });

                const queue_check = DT.getQueue(voiceChannel);
                if (queue_check) await q.addToQueue(songsToAdd, !skip && position > 0 ? position + 1 : position);
                else q = await DT.queues.create(voiceChannel, songsToAdd, textChannel) as Queue, newQueueCreated = q;

                batchResults.splice(0, batchResults.length);
                tmp_songs.clear();
              }

              cache.push({ url_result: search_result.url, initial_index: index });
              return bluebird.delay(this.requestDelay);
            }, { concurrency: this.songsPerRequest });

            results.sort((a: any, b: any) => {
              const indexA = cache.findIndex(item => item.url_result === a.url);
              const indexB = cache.findIndex(item => item.url_result === b.url);
              return cache[indexA].initial_index - cache[indexB].initial_index;
            });
          } else {
            for (let i = 0; i < queries.length; i++) {
              results[i] = await this.search(queries[i]);
            }
          }

          playlist.songs = results.filter(isTruthy).map(s => {
            s.playlist = playlist;
            s.member = member;
            s.metadata = metadata;
            return s;
          });

          const queue_check = DT.getQueue(voiceChannel);
          if (queue_check) {
            q.songs.sort((a: any, b: any) => 
             playlist.songs.findIndex((ps: any) => ps.url === a.url) - 
             playlist.songs.findIndex((ps: any) => ps.url === b.url)
            );

            if (playlist.songs.filter((s: any) => !query_success.has(s.url)).length) {
              q.addToQueue(
                playlist.songs.filter((s: any) => 
                 !query_success.has(s.url)), !skip && position > 0 ? position + 1 : position
                );
            }
          } else {
            q = await DT.queues.create(voiceChannel, playlist.songs, textChannel) as Queue, 
            newQueueCreated = q;
          }
        }
        playlist.songs.unshift(fs);
      };
      if (queue) {
        queue.addToQueue(firstSong, position);
        if (skip) queue.skip();
        else if (!this.emitEventsAfterFetching) DT.emit("addList", queue, playlist);
        await fetchTheRest(queue, firstSong);
        if (!skip && this.emitEventsAfterFetching) DT.emit("addList", queue, playlist);
        if (newQueueCreated) DT.emit("playSong", newQueueCreated, playlist.songs[1]);
      } else {
        let newQueue = await DT.queues.create(voiceChannel, firstSong, textChannel);
        while (newQueue === true) {
          await getFirstSong();
          newQueue = await DT.queues.create(voiceChannel, firstSong, textChannel);
        }
        DT.emit("playSong", newQueue, firstSong);
        if (!this.emitEventsAfterFetching) {
          if (DT.options.emitAddListWhenCreatingQueue) DT.emit("addList", newQueue, playlist);
          //DT.emit("playSong", newQueue, firstSong);
          if (newQueueCreated) DT.emit("playSong", newQueueCreated, playlist.songs[1]);
        }
        await fetchTheRest(newQueue, firstSong);
        if (this.emitEventsAfterFetching) {
          if (DT.options.emitAddListWhenCreatingQueue) DT.emit("addList", newQueue, playlist);
          //DT.emit("playSong", newQueue, firstSong);
          if (newQueueCreated) DT.emit("playSong", newQueueCreated, playlist.songs[1]);
        }
      }
    }
  }

  async search(query: string) {
    try {
      return new Song((await this.distube.search(query, { limit: 1 }))[0]);
    } catch {
      return null;
    }
  }
}

export default SpotifyPlugin;
