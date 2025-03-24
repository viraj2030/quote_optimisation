import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://quote-optimization-api-2024-dc4246ae92b0.herokuapp.com/api';

console.log('API Base URL:', API_BASE_URL);

// Configure axios defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false // Set to false since we don't need credentials
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  config => {
    // Log the full request details
    console.log('Making API request:', {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      params: config.params,
      headers: config.headers,
      data: config.data
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
    // Log successful responses
    console.log('API response received:', {
      status: response.status,
      url: `${response.config.baseURL}${response.config.url}`,
      data: response.data
    });
    return response;
  },
  error => {
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
      method: error.config?.method,
      params: error.config?.params,
      headers: error.config?.headers
    };
    
    console.error('API request failed:', errorDetails);
    
    // Customize error message based on the type of error
    if (error.response) {
      // Server responded with a status code outside of 2xx
      error.customMessage = error.response.data?.error || 
                          `Server error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      // Request was made but no response received
      error.customMessage = 'No response received from server. Please check your connection.';
    } else {
      // Error in request configuration
      error.customMessage = 'Failed to make request. Please try again.';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 