import axios from 'axios';
let config: Record<string, any> = {};

export async function setConfig() {
  if (!process.env.CONFIG_REST_SERVER_URL) {
    console.error('CONFIG_REST_SERVER_URL is not set in environment variables');
    return;
  }

  try {
    const response = await axios.get(process.env.CONFIG_REST_SERVER_URL);
    if (response.status === 200) {
      const _config = response.data;
      console.log('Configuration loaded successfully:', Object.keys(_config).length, 'keys');
      
      // You can set the configuration in a global state or export it as needed
      Object.entries(_config).forEach(([key, value]) => {
        (process as any).env[key] = value;
      });
      config = _config;
      console.log('Configuration set in environment variables');
    } else {
      console.error('Failed to load configuration, status code:', response.status);
    }
  } catch (error) {
    console.error('Error fetching configuration:', error);
  }
}