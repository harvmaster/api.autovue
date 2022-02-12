const SpotifyWebApi = require('spotify-web-api-node')

class Spotify {
  constructor () {
    const spotify = new SpotifyWebApi({
      clientId: 'de277943fe3f40be9ed069ff0df86dd2',
      clientSecret: '52afdd3aae9f4fa89790f8b6dae20092'
    })

  }
}