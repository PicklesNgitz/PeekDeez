import axios from 'axios';

export async function getNowPlaying() {
  try {
    const response = await axios.get('https://api.deezer.com/nowplaying');
    return response.data;
  } catch (error) {
    console.error('Error fetching nowplaying data:', error);
    throw error;
  }
}

export async function handleTransport(action: string) {
  try {
    await axios.post('https://api.deezer.com/transport', { action });
  } catch (error) {
    console.error('Error handling transport action:', error);
    throw error;
  }
}

export async function getLyrics() {
  try {
    const response = await axios.get('https://api.lrclib.com/lyrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    throw error;
  }
}