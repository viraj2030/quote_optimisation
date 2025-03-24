// Simple test script to check the API connection and diagnose any issues
const API_BASE_URL = 'http://localhost:5001/api';

async function testQuotesEndpoint() {
  console.log('Testing /api/quotes endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/quotes`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Success! Retrieved ${data.length} quotes.`);
    console.log('First quote:', data[0]);
    return data;
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return null;
  }
}

async function testOptimizeEndpoint(quotes) {
  console.log('\nTesting /api/optimize endpoint...');
  
  if (!quotes || quotes.length === 0) {
    console.log('No quotes available to test optimization.');
    return;
  }
  
  const params = {
    premium_weight: 5,
    coverage_weight: 5,
    credit_threshold: 2,
    required_carriers: [],
    diversify: false,
    max_capacity_abs: 2.0,
    min_capacity_abs: 0.0,
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Success! Optimization completed.');
    console.log('Status:', data.status);
    console.log('Total Premium:', data.summary.total_premium);
    console.log('Average Coverage Score:', data.summary.avg_coverage_score);
    console.log('Optimized Carriers:', data.solution.filter(q => q.SignedCapacity > 0).length);
  } catch (error) {
    console.error('Error optimizing quotes:', error);
  }
}

async function runTests() {
  const quotes = await testQuotesEndpoint();
  await testOptimizeEndpoint(quotes);
}

// Run the tests
runTests(); 