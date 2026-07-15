import axios from 'axios';

export async function getNowPlaying() {
  try {
    const response = await axios.get('http://localhost:3000/nowplaying');
    return response.data;
  } catch (error) {
    console.error('Error fetching nowplaying data:', error);
    throw error;
  }
}

export async function handleTransport(action: string) {
  try {
    await axios.post('http://localhost:3000/transport', { action });
  } catch (error) {
    console.error('Error handling transport action:', error);
    throw error;
  }
}

export async function getLyrics() {
  try {
    const response = await axios.get('http://localhost:3000/lyrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    throw error;
  }
}