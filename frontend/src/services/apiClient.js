import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://quote-optimization-api-2024-dc4246ae92b0.herokuapp.com/api';

console.log('API Base URL:', API_BASE_URL);

// Configure axios defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  config => {
    console.log('Making API request:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      params: config.params,
      headers: config.headers
    });
    return config;
  },
  error => {
    console.error('API request configuration error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => {
    console.log('API response received:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('API request failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config && {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
        params: error.config.params,
        headers: error.config.headers
      }
    });
    return Promise.reject(error);
  }
);

export default apiClient; 