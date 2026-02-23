const axios = require('axios');

async function getDomains() {
  const response = await axios.get(
    'https://api.cloudflare.com/client/v4/zones',
    {
      headers: {
        Authorization: 'Bearer ZgvCuaqhUkrm7dNeE_5pyxB3XZeLyEojomt1oS9c',
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.result.map(zone => zone.name);
}

module.exports = getDomains;

