<div align="center">
  <p>
    <a href="https://nodei.co/npm/@distube/spotify"><img src="https://nodei.co/npm/@distube/spotify.png?downloads=true&downloadRank=true&stars=true"></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/distube"><img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/@distube/spotify/peer/distube?style=flat-square"></a>
    <a href="https://nodei.co/npm/distube"><img alt="npm" src="https://img.shields.io/npm/dt/@distube/spotify?logo=npm&style=flat-square"></a>
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/distubejs/spotify?logo=github&logoColor=white&style=flat-square">
    <a href="https://discord.gg/feaDd9h"><img alt="Discord" src="https://img.shields.io/discord/732254550689316914?logo=discord&logoColor=white&style=flat-square"></a>
  </p>
  <p>
    <a href='https://ko-fi.com/skick' target='_blank'><img height='48' src='https://storage.ko-fi.com/cdn/kofi3.png' alt='Buy Me a Coffee at ko-fi.com' /></a>
  </p>
</div>

# @distube/spotify

A DisTube custom plugin for supporting Spotify URL.

-NeuNoRo Fork  
I do not own this project, this is a fork intended to use my changes more easily in my project. All rights are reserved to [Skick](https://github.com/skick1234)

## Feature

This plugin grabs the songs on Spotify then searches on YouTube and plays with DisTube.

## Fork Changes

### Features:

Added new methods:  
- maxPlaylistTracks
- songsPerRequest
- requestDelay

### Changes:

- The playSong event is always emitted [regardless of the emitEventsAfterFetching parameter] before initializing the fetch process for the rest of the songs in the playlist.
- The songs will be automatically added to the queue as each batch is finished and after all the batches are finished they will be sorted.
- A new queue will be created automatically if it is detected that it has ended before completing the process of fetching all the songs.

## Installation

```sh
npm install https://github.com/xNeuNoRo/distube-spotify
```

## Usage

```js
const Discord = require("discord.js");
const client = new Discord.Client();

const { DisTube } = require("distube");
const { SpotifyPlugin } = require("@distube/spotify");
const distube = new DisTube(client, {
  plugins: [new SpotifyPlugin()],
});
```

## Documentation

### SpotifyPlugin([SpotifyPluginOptions])

- `SpotifyPluginOptions.parallel`: Default is `true`. Whether or not searching the playlist in parallel.
- `SpotifyPluginOptions.emitEventsAfterFetching`: Default is `false`. Emits `addList` and `playSong` event before or after fetching all the songs.
  > If `false`, DisTube plays the first song -> emits `addList` and `playSong` events -> fetches all the rest\
  > If `true`, DisTube plays the first song -> fetches all the rest -> emits `addList` and `playSong` events
- `SpotifyPluginOptions.maxPlaylistTrack`: Default is `200`. This is the max songs to fetch per playlist.
- `SpotifyPluginOptions.songsPerRequest`: Default is `10`. This is the amount of songs to fetch for each batch of requests.
- `SpotifyPluginOptions.requestDelay`: Default is `1000`. This is the delay for each batch of requests in milliseconds.
- `SpotifyPluginOptions.api`: (Optional) Spotify API options.
  - `SpotifyPluginOptions.api.clientId`: Client ID of your Spotify application (Optional - Used when the plugin cannot get the credentials automatically)
  - `SpotifyPluginOptions.api.clientSecret`: Client Secret of your Spotify application (Optional - Used when the plugin cannot get the credentials automatically)
  - `SpotifyPluginOptions.api.topTracksCountry`: Country code of the top artist tracks (ISO 3166-1 alpha-2 country code). Default is `US`.

#### Example

```js
new SpotifyPlugin({
  parallel: true,
  emitEventsAfterFetching: false,
  maxPlaylistTrack: 1500,
  songsPerRequest: 20,
  requestDelay: 1000,
  api: {
    clientId: "SpotifyAppClientID",
    clientSecret: "SpotifyAppClientSecret",
    topTracksCountry: "VN",
  },
});
```

##### Use SoundCloudPlugin to search instead of YouTube

```ts
import { DisTube } from "distube";
import { SpotifyPlugin } from "@distube/spotify";
import { SoundCloudPlugin } from "@distube/soundcloud";

const scPlugin = new SoundCloudPlugin();

class NewSpotifyPlugin extends SpotifyPlugin {
  override async search(query: string) {
    try {
      return new Song((await scPlugin.search(query, { limit: 1 }))[0]);
    } catch {
      return null;
    }
  }
}

const distube = new DisTube(client, {
  plugins: [new NewSpotifyPlugin(), scPlugin],
});
```
