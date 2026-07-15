import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
});

export async function getNowPlaying() {
  try {
    const response = await apiClient.get('/nowplaying');
    return response.data;
  } catch (error) {
    console.error('Error fetching now playing:', error);
    throw error;
  }
}

export async function getTransport() {
  try {
    const response = await apiClient.get('/transport');
    return response.data;
  } catch (error) {
    console.error('Error fetching transport:', error);
    throw error;
  }
}

export async function getLyrics() {
  try {
    const response = await apiClient.get('/lyrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    throw error;
  }
}