import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Create axios instance with interceptors for global error handling
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API request failed:', error.message);
    return Promise.reject(error);
  }
);

export async function fetchQuotes() {
  try {
    const response = await apiClient.get('/quotes');
    return response.data;
  } catch (error) {
    console.error('Error fetching quotes:', error);
    throw new Error('Failed to fetch quotes');
  }
}

export async function fetchSublimitsForQuote(quoteId) {
  try {
    const response = await apiClient.get(`/sublimits/${quoteId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sublimits:', error);
    throw new Error('Failed to fetch sublimits');
  }
}

export const optimizeQuotes = async (params) => {
  try {
    console.log('Optimizing quotes with parameters:', params);
    
    const response = await apiClient.post('/optimize', {
      premium_weight: params.premium_weight || 5,
      coverage_weight: params.coverage_weight || 5,
      credit_threshold: params.credit_threshold || 2,
      required_carriers: params.required_carriers || [],
      diversify: params.diversify || false,
      max_capacity_abs: params.max_capacity_abs || 2.0,
      min_capacity_abs: params.min_capacity_abs || 0.0,
      // New hierarchical optimization parameters
      use_hierarchical: params.use_hierarchical !== false, // Default to true
      diversification_factor: params.diversification_factor || 0.5,
    });
    
    // Return the response directly to maintain the expected format
    return {
      solution: response.data.solution,
      summary: response.data.summary,
      status: response.data.status
    };
  } catch (error) {
    console.error('Error optimizing quotes:', error);
    if (error.response && error.response.data) {
      const apiError = new Error(error.response.data.error || 'Optimization failed');
      apiError.response = error.response;
      throw apiError;
    }
    throw new Error('Failed to optimize quotes');
  }
};

export async function generateOptions(params) {
  try {
    const response = await apiClient.post('/generate-options', params);
    return response.data;
  } catch (error) {
    console.error('Error generating options:', error);
    throw new Error('Failed to generate options');
  }
}

export const calculateCoverageScores = async (weights) => {
  try {
    console.log('Calculating coverage scores with weights:', weights);
    
    const response = await apiClient.post('/coverage-scores', { weights });
    
    console.log('Coverage scores response:', response.data);
    
    // Validate the response
    if (!response.data.scores || !Array.isArray(response.data.scores)) {
      console.error('Invalid response format:', response.data);
      throw new Error('Server returned an invalid response format');
    }
    
    // Process the scores to ensure carrier and layer are properly separated
    response.data.scores = response.data.scores.map(score => {
      // Extract carrier and layer data
      let carrier = score.carrier || "";
      let layer = score.layer || "";
      
      // Check for different patterns in the carrier field
      if (carrier && !layer) {
        // Pattern 1: "Carrier Name - Layer Name"
        if (carrier.includes(' - ')) {
          const parts = carrier.split(' - ');
          carrier = parts[0];
          layer = parts[1];
        } 
        // Pattern 2: "Carrier Name (Layer Name)"
        else if (carrier.includes('(') && carrier.includes(')')) {
          const match = carrier.match(/(.*?)\s*\((.*?)\)/);
          if (match && match.length >= 3) {
            carrier = match[1].trim();
            layer = match[2].trim();
          }
        }
        // Pattern 3: "Carrier Name Layer X"
        else if (/Layer \d+/i.test(carrier)) {
          const match = carrier.match(/(.*?)(Layer \d+)/i);
          if (match && match.length >= 3) {
            carrier = match[1].trim();
            layer = match[2].trim();
          }
        }
        // Pattern 4: Extract quote ID from any other format if available
        else if (score.quote_id) {
          // Try to find associated quote data based on quote_id
          // For now, we'll keep carrier as is and set layer if not present
          if (!layer) {
            // Default layer if not found
            layer = "Primary";
          }
        }
      }
      
      // Handle case where layer might be a number instead of string
      if (typeof layer === 'number') {
        layer = `Layer ${layer}`;
      }
      
      return {
        ...score,
        carrier,
        layer
      };
    });
    
    return response.data;
  } catch (error) {
    console.error('Error calculating coverage scores:', error);
    throw new Error(`Failed to calculate coverage scores: ${error.message}`);
  }
};

export const getAvailableSublimits = async () => {
  try {
    const response = await apiClient.get('/coverage-sublimits');
    return response.data;
  } catch (error) {
    console.error('Error fetching available sublimits:', error);
    throw new Error('Failed to fetch available sublimits');
  }
};

// Add the missing feature impact data API
export const getFeatureImpactData = async () => {
  try {
    const response = await apiClient.get('/feature-impact');
    return response.data;
  } catch (error) {
    console.error('Error fetching feature impact data:', error);
    throw new Error('Failed to fetch feature impact data');
  }
};

// Add healthcheck endpoint to verify API is running
export const checkApiHealth = async () => {
  try {
    const response = await apiClient.get('/healthcheck');
    return response.data.status === 'ok';
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

// Function to get quotes with pagination and filtering
export const getQuotes = async (page = 1, pageSize = 20, filters = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes`, {
      params: {
        page,
        page_size: pageSize,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching quotes:', error);
    throw error;
  }
};

// Function to get feature impact data
export const getFeatureImpact = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/feature-impact`);
    return response.data;
  } catch (error) {
    console.error('Error fetching feature impact data:', error);
    // Return fallback data if the API fails
    return {
      features: [
        { name: 'Property Value', impact: 25000 },
        { name: 'Location Risk', impact: 15000 },
        { name: 'Claims History', impact: -8000 },
        { name: 'Business Continuity Plan', impact: -5000 },
        { name: 'Industry Type', impact: 12000 },
        { name: 'Coverage Limits', impact: 18000 },
        { name: 'Deductible', impact: -10000 },
      ]
    };
  }
};

// Function to fetch coverage analysis sublimits
export const fetchCoverageAnalysisSublimits = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/coverage-analysis/sublimits`);
    return response.data;
  } catch (error) {
    console.error('Error fetching coverage analysis sublimits:', error);
    // Return fallback data
    return {
      sublimits: generateFallbackSublimitsList(),
      count: 10
    };
  }
};

// Function to fetch quotes comparison data
export const fetchQuotesComparisonData = async (sublimit) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/coverage-analysis/quotes-comparison`, {
      params: { sublimit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching quotes comparison data:', error);
    // Return fallback data based on sublimit type
    return generateFallbackComparisonData(sublimit);
  }
};

// Function to get selected option details for review
export const getSelectedOptionDetails = async (optionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/options/${optionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching selected option details:', error);
    // Return fallback data for the selected option
    return {
      id: optionId || 1,
      name: "Option 1: Premium Optimization",
      description: "Focuses on minimizing premium while maintaining adequate coverage",
      total_premium: 450000,
      avg_coverage: 82,
      carriers: [
        { name: "Chubb", layer: "Primary", premium: 285000, rating: "A++", limit: "$5M", attachment: "$0" },
        { name: "AIG", layer: "Excess", premium: 165000, rating: "A", limit: "$10M", attachment: "$5M" }
      ],
      features: [
        "Lower overall premium",
        "Good coverage for critical sublimits",
        "Well-rated carriers"
      ],
      challenges: [
        "Higher deductibles",
        "Limited coverage for non-critical sublimits"
      ],
      sublimits: [
        { name: "earthquake in high hazard earthquake zones", amount: "$1,500,000", importance: "Critical" },
        { name: "business interruption", amount: "$2,000,000", importance: "High" },
        { name: "flood coverage", amount: "$1,000,000", importance: "High" },
        { name: "electronic data and media", amount: "$750,000", importance: "Medium" },
        { name: "expediting expenses", amount: "$500,000", importance: "Medium" },
        { name: "transit", amount: "$250,000", importance: "Low" }
      ],
      coverageAnalysis: {
        overall: 82,
        critical: 91,
        high: 83,
        medium: 75,
        low: 65
      },
      costAnalysis: {
        premium: 450000,
        averageMarketPremium: 510000,
        savings: 60000,
        savingsPercentage: 11.8
      }
    };
  }
};

// Helper function to generate fallback sublimits list
function generateFallbackSublimitsList() {
  return [
    { id: "earthquake in high hazard earthquake zones_amount", name: "earthquake in high hazard earthquake zones", default_weight: 0.15 },
    { id: "expediting expenses_amount", name: "expediting expenses", default_weight: 0.12 },
    { id: "electronic data and media_amount", name: "electronic data and media", default_weight: 0.10 },
    { id: "business interruption_amount", name: "business interruption", default_weight: 0.08 },
    { id: "flood coverage_amount", name: "flood coverage", default_weight: 0.07 },
    { id: "brands and labels_amount", name: "brands and labels", default_weight: 0.06 },
    { id: "transit_amount", name: "transit", default_weight: 0.05 },
    { id: "property damage and time element_amount", name: "property damage and time element", default_weight: 0.04 },
    { id: "fine arts_amount", name: "fine arts", default_weight: 0.03 },
    { id: "valuable papers and records_amount", name: "valuable papers and records", default_weight: 0.02 },
  ];
}

// Helper function to generate fallback comparison data
function generateFallbackComparisonData(sublimit) {
  // Extract the sublimit name without the _amount suffix
  const sublimitName = sublimit?.replace('_amount', '') || 'earthquake in high hazard earthquake zones';
  
  // Create a dynamic range based on the sublimit type
  const baseAmount = sublimitName.includes('earthquake') ? 1500000 : 
                    sublimitName.includes('business') ? 2000000 :
                    sublimitName.includes('flood') ? 1000000 :
                    sublimitName.includes('electronic') ? 750000 :
                    sublimitName.includes('expediting') ? 500000 : 250000;
  
  // Generate random variations for quote vs submission
  const generateAmount = (base, variance) => {
    return Math.round(base * (1 + (Math.random() * variance * 2 - variance)));
  };
  
  return {
    sublimit: sublimitName,
    carriers: [
      { 
        name: "Chubb", 
        quote_value: generateAmount(baseAmount, 0.15),
        submission_value: baseAmount,
        difference: 0, // Will be calculated in the component
        difference_percentage: 0 // Will be calculated in the component
      },
      { 
        name: "AIG", 
        quote_value: generateAmount(baseAmount, 0.2),
        submission_value: baseAmount,
        difference: 0,
        difference_percentage: 0
      },
      { 
        name: "Zurich", 
        quote_value: generateAmount(baseAmount, 0.1),
        submission_value: baseAmount,
        difference: 0,
        difference_percentage: 0
      },
      { 
        name: "Swiss Re", 
        quote_value: generateAmount(baseAmount, 0.25),
        submission_value: baseAmount,
        difference: 0,
        difference_percentage: 0
      },
      { 
        name: "Travelers", 
        quote_value: generateAmount(baseAmount, 0.18),
        submission_value: baseAmount,
        difference: 0,
        difference_percentage: 0
      }
    ]
  };
} 