import * as spotify_uri from 'spotify-uri';
import { CustomPlugin, PlayOptions, Song } from 'distube';
import { VoiceBasedChannel } from 'discord.js';

declare const SUPPORTED_TYPES: readonly ["album", "playlist", "track", "artist"];
type Track = {
    type: "track";
    name: string;
    artists: {
        name: string;
    }[];
};
type DataList = {
    type: string;
    name: string;
    thumbnail?: string;
    url: string;
    tracks: Track[];
};
type Album = DataList & {
    type: "album";
};
type Playlist = DataList & {
    type: "playlist";
};
type Artist = DataList & {
    type: "artist";
};
type TrackList = Album | Playlist | Artist;
type Data = Track | TrackList;
declare class API {
    #private;
    private _hasCredentials;
    private _expirationTime;
    private _tokenAvailable;
    topTracksCountry: string;
    constructor(clientId?: string, clientSecret?: string, topTracksCountry?: string);
    isSupportedTypes(type: string): type is (typeof SUPPORTED_TYPES)[number];
    refreshToken(): Promise<void>;
    parseUrl(url: string): spotify_uri.ParsedSpotifyUri;
    getData(url: `${string}/track/${string}`): Promise<Track>;
    getData(url: `${string}/album/${string}`): Promise<Album>;
    getData(url: `${string}/playlist/${string}`): Promise<Playlist>;
    getData(url: `${string}/artist/${string}`): Promise<Artist>;
    getData(url: string): Promise<Data>;
}

type SpotifyPluginOptions = {
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
declare class SpotifyPlugin extends CustomPlugin {
    api: API;
    parallel: boolean;
    emitEventsAfterFetching: boolean;
    maxPlaylistTrack: number;
    songsPerRequest: number;
    requestDelay: number;
    constructor(options?: SpotifyPluginOptions);
    validate(url: string): Promise<boolean>;
    play(voiceChannel: VoiceBasedChannel, url: string, options: PlayOptions): Promise<void>;
    search(query: string): Promise<Song<unknown> | null>;
}

export { SpotifyPlugin, type SpotifyPluginOptions, SpotifyPlugin as default };
