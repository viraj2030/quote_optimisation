import { apiClient } from '../services/apiClient';

export const fetchSublimitsForQuote = async (quoteId) => {
  try {
    const response = await apiClient.get(`/quotes/${quoteId}/sublimits`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchQuotesComparisonData = async (sublimit) => {
  try {
    const response = await apiClient.get('/coverage-analysis/quotes-comparison', {
      params: { sublimit }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}; 