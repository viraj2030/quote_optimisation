import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Select,
  Spinner,
  useToast,
  useColorModeValue,
  SimpleGrid,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { fetchQuotesComparisonData } from '../api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';
import apiClient from '../services/apiClient';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  annotationPlugin
);

// Aon theme colors
const AON_BLUE = '#0051A8';
const AON_GREEN = '#4CB748';
const AON_RED = '#F8695A';

const QuotesSubmissionComparison = () => {
  // Format a large number with commas
  const formatNumber = (num) => {
    return num.toLocaleString();
  };
  
  // Calculate percentage difference
  const calculateDifference = (quoteValue, submissionValue) => {
    if (!submissionValue) return 0;
    return ((quoteValue - submissionValue) / submissionValue) * 100;
  };
  
  // State variables for Quotes vs Submission tab
  const [sublimits, setSublimits] = useState([]);
  const [selectedSublimit, setSelectedSublimit] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [loadingSublimits, setLoadingSublimits] = useState(true);
  const [error, setError] = useState(null);
  
  // UI colors
  const textColor = useColorModeValue('#333333', 'white');
  const subtleTextColor = useColorModeValue('#666666', 'gray.400');
  const toast = useToast();
  
  // Debug logging for component state
  useEffect(() => {
    console.log('Component State:', {
      sublimitsCount: sublimits.length,
      selectedSublimit,
      loadingSublimits,
      loadingComparison,
      error
    });
  }, [sublimits, selectedSublimit, loadingSublimits, loadingComparison, error]);
  
  // Fetch available sublimits when component mounts
  useEffect(() => {
    console.log('Component mounted, fetching sublimits...');
    fetchSublimits();
  }, []);
  
  // Fetch comparison data when selected sublimit changes
  useEffect(() => {
    console.log('Selected sublimit changed:', selectedSublimit);
    if (selectedSublimit) {
      fetchComparisonData(selectedSublimit);
    }
  }, [selectedSublimit]);
  
  // Fetch available sublimits from API
  const fetchSublimits = async () => {
    try {
      console.log("Starting sublimits fetch...");
      setLoadingSublimits(true);
      setError(null);
      
      const response = await apiClient.get('/coverage-sublimits');
      console.log("Raw sublimits response:", response.data);
      
      if (!response.data || !Array.isArray(response.data.sublimits)) {
        throw new Error('Invalid response format: missing sublimits data');
      }
      
      const sublimitsList = response.data.sublimits.map(s => ({
        id: s.id,
        name: s.name
      }));
      
      console.log("Parsed sublimits list:", sublimitsList);
      
      if (sublimitsList.length === 0) {
        throw new Error('No sublimits available');
      }
      
      console.log(`Found ${sublimitsList.length} sublimits`);
      setSublimits(sublimitsList);
      
      // Set the first sublimit as default after a short delay
      setTimeout(() => {
        if (sublimitsList[0] && sublimitsList[0].id) {
          console.log("Setting default sublimit to:", sublimitsList[0].id);
          setSelectedSublimit(sublimitsList[0].id);
        }
      }, 500);
      
    } catch (error) {
      console.error('Error fetching sublimits:', error);
      setError(error.customMessage || error.message);
      
      toast({
        title: 'Error',
        description: error.customMessage || 'Failed to fetch sublimits',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingSublimits(false);
    }
  };
  
  // Fetch comparison data from API
  const fetchComparisonData = async (sublimit) => {
    if (!sublimit) {
      console.warn('No sublimit provided to fetchComparisonData');
      return;
    }
    
    try {
      setLoadingComparison(true);
      setError(null);
      console.log('Fetching comparison data for sublimit:', sublimit);
      
      const response = await apiClient.get('/coverage-analysis/quotes-comparison', {
        params: { sublimit }
      });
      
      console.log('Raw comparison data response:', response.data);
      
      if (!response.data) {
        throw new Error('No comparison data received from server');
      }
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      // Transform the data to match the expected format
      const transformedData = {
        submission: response.data.submission_value,
        quotes: response.data.quotes.map(quote => ({
          carrier: quote.carrier,
          quoteValue: quote.amount,
          difference: quote.difference,
          percentageDifference: quote.percentage_difference
        })).sort((a, b) => b.percentageDifference - a.percentageDifference)
      };
      
      console.log('Transformed comparison data:', transformedData);
      setComparisonData(transformedData);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      setError(error.customMessage || error.message);
      setComparisonData(null);
      
      toast({
        title: 'Error',
        description: error.customMessage || 'Failed to fetch comparison data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingComparison(false);
    }
  };
  
  // Handle sublimit selection change
  const handleSublimitChange = (event) => {
    const sublimitId = event.target.value;
    console.log('Sublimit selection changed to:', sublimitId);
    setSelectedSublimit(sublimitId);
  };
  
  // Prepare chart data for comparison visualization
  const prepareChartData = () => {
    if (!comparisonData || !comparisonData.quotes || comparisonData.quotes.length === 0) {
      return null;
    }
    
    const labels = comparisonData.quotes.map(q => q.carrier || `Quote ${q.quote}`);
    const quoteValues = comparisonData.quotes.map(q => q.quoteValue || 0);
    const submissionValue = comparisonData.submission || 0;
    
    return {
      labels,
      datasets: [
        {
          label: 'Coverage Achieved',
          data: quoteValues.map(value => value >= submissionValue ? value : null),
          backgroundColor: 'rgba(76, 183, 72, 0.7)', // Aon Green
          borderColor: AON_GREEN,
          borderWidth: 1,
          stack: 'Stack 0',
        },
        {
          label: 'Coverage Unachieved',
          data: quoteValues.map(value => value < submissionValue ? value : null),
          backgroundColor: 'rgba(248, 105, 90, 0.7)', // Aon Red
          borderColor: AON_RED,
          borderWidth: 1,
          stack: 'Stack 0',
        }
      ],
    };
  };
  
  // Chart options for comparison visualization
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333333',
        bodyColor: '#333333',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += `$${context.raw ? context.raw.toLocaleString() : '0'}`;
            return label;
          }
        }
      },
      annotation: {
        annotations: {
          line1: {
            type: 'line',
            yMin: comparisonData?.submission || 0,
            yMax: comparisonData?.submission || 0,
            borderColor: '#666666',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              display: true,
              content: `SUBMISSION: $${formatNumber(comparisonData?.submission || 0)}`,
              position: 'end',
              backgroundColor: '#666666',
              color: '#fff',
              font: {
                size: 12,
                weight: 'bold',
              }
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Value ($)',
          color: '#666666'
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          },
          color: '#666666'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.06)'
        }
      },
      x: {
        ticks: {
          color: '#666666',
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          display: false
        }
      }
    }
  };
  
  return (
    <Box p={6}>
      <Box mb={6}>
        <Heading size="lg" fontWeight="500" color="#333333" mb={2}>
          Quotes vs Submission Comparison
        </Heading>
        <Text color="gray.600" fontSize="14px">
          Compare coverage values across quotes and the submission to identify market differences
        </Text>
      </Box>
      
      {/* Sublimit Selector */}
      <Box 
        mb={5} 
        bg="white" 
        borderRadius="md" 
        borderWidth="1px" 
        borderColor="#CDDBDE"
        overflow="hidden"
        width="100%"
        maxWidth="100%"
      >
        <Box px={6} py={3} borderBottomWidth="1px" borderBottomColor="#CDDBDE">
          <Heading size="md" color="#333333" fontWeight="600" mb={0}>
            Select Sublimit
          </Heading>
        </Box>
        
        <Box p={5}>
          <Text fontSize="sm" color={subtleTextColor} mb={2}>Choose a sublimit to analyze:</Text>
          {loadingSublimits ? (
            <Flex justify="center" align="center" py={4}>
              <Spinner size="md" color="#0051A8" thickness="3px" />
            </Flex>
          ) : error ? (
            <Text color="red.500" fontSize="sm">{error}</Text>
          ) : (
            <Select
              value={selectedSublimit || ''}
              onChange={handleSublimitChange}
              placeholder="Select sublimit"
              isDisabled={sublimits.length === 0}
              borderColor="gray.300"
              _hover={{ borderColor: "gray.400" }}
              _focus={{ borderColor: "#0051A8", boxShadow: "0 0 0 1px #0051A8" }}
            >
              {sublimits.map((sublimit) => (
                <option key={sublimit.id} value={sublimit.id}>
                  {sublimit.name}
                </option>
              ))}
            </Select>
          )}
        </Box>
      </Box>
      
      {loadingComparison ? (
        <Flex justify="center" align="center" height="300px">
          <Spinner size="xl" color="#0051A8" thickness="4px" />
        </Flex>
      ) : comparisonData ? (
        <>
          {/* Comparison Statistics */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
            <Box 
              p={4} 
              bg="white" 
              borderRadius="md" 
              borderWidth="1px" 
              borderColor="#CDDBDE"
              boxShadow="sm"
            >
              <Text fontSize="sm" color={subtleTextColor} mb={2}>Submission Value</Text>
              <Flex alignItems="baseline">
                <Text fontSize="2xl" fontWeight="500" color={textColor}>
                  ${formatNumber(comparisonData.submission || 0)}
                </Text>
                <Text fontSize="sm" color={subtleTextColor} ml={2}>requested amount</Text>
              </Flex>
            </Box>
            
            <Box 
              p={4} 
              bg="white" 
              borderRadius="md" 
              borderWidth="1px" 
              borderColor="#CDDBDE"
              boxShadow="sm"
            >
              <Text fontSize="sm" color={subtleTextColor} mb={2}>Average Quote Value</Text>
              <Flex alignItems="baseline">
                <Text fontSize="2xl" fontWeight="500" color={textColor}>
                  ${formatNumber(
                    comparisonData.quotes && comparisonData.quotes.length > 0
                      ? comparisonData.quotes.reduce((acc, q) => acc + (q.quoteValue || 0), 0) / comparisonData.quotes.length
                      : 0
                  )}
                </Text>
                <Text fontSize="sm" color={subtleTextColor} ml={2}>across all carriers</Text>
              </Flex>
            </Box>
          </SimpleGrid>
          
          {/* Bar Chart Comparison */}
          <Box 
            bg="white" 
            borderRadius="md" 
            borderWidth="1px" 
            borderColor="#CDDBDE"
            boxShadow="sm"
            overflow="hidden"
            mb={6}
            width="100%"
            maxWidth="100%"
          >
            <Box px={6} py={3} borderBottomWidth="1px" borderBottomColor="#CDDBDE">
              <Heading size="md" color="#333333" fontWeight="600" mb={0}>
                Coverage Comparison Chart
              </Heading>
            </Box>
            
            <Box p={5} h="400px">
              {prepareChartData() && (
                <Bar data={prepareChartData()} options={chartOptions} />
              )}
            </Box>
          </Box>
          
          {/* Detailed Comparison Table */}
          <Box 
            bg="white" 
            borderRadius="md" 
            borderWidth="1px" 
            borderColor="#CDDBDE"
            boxShadow="sm"
            overflow="hidden"
            width="100%"
            maxWidth="100%"
          >
            <Accordion allowToggle>
              <AccordionItem border="none">
                <h2>
                  <AccordionButton 
                    px={6} 
                    py={3} 
                    borderBottomWidth="1px" 
                    borderBottomColor="#CDDBDE"
                    _hover={{ bg: "#F9FCFC" }}
                    _expanded={{ bg: "#EEF6F7" }}
                  >
                    <Box flex="1" textAlign="left">
                      <Heading size="md" color="#333333" fontWeight="600" mb={0}>
                        Detailed Comparison
                      </Heading>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel p={0}>
                  <Box 
                  overflowX="auto" 
                  width="100%" 
                  margin="0" 
                  padding="0" 
                  border="none" 
                  borderRadius="0"
                  minWidth="100%"
                  height="460px"
                  overflow="auto">
                    <Table 
                      variant="simple" 
                      size="md"
                      width="100%" 
                      borderCollapse="collapse"
                      style={{ tableLayout: "fixed", width: "100%" }}
                      margin="0"
                      borderWidth="1px 0 0 0" 
                      borderStyle="solid"
                      borderColor="gray.200"
                    >
                      <Thead position="sticky" top="0" zIndex="1">
                        <Tr borderBottom="1px" borderColor="gray.200" bg="#EEF6F7">
                          <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Carrier</Th>
                          <Th isNumeric color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Quote Value</Th>
                          <Th isNumeric color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Submission Value</Th>
                          <Th isNumeric color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Difference</Th>
                          <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">% Difference</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {comparisonData.quotes && comparisonData.quotes.map((quote, index) => {
                          const difference = quote.difference;
                          const percentageDifference = quote.percentageDifference;
                          
                          return (
                            <Tr 
                              key={index} 
                              _hover={{ bg: "gray.50" }}
                              borderBottom="1px" 
                              borderColor="gray.200"
                              bg={index % 2 === 0 ? "white" : "#F9FCFC"}
                            >
                              <Td fontWeight="500" padding="12px 16px" fontSize="15px">{quote.carrier || `Quote ${quote.quote}`}</Td>
                              <Td isNumeric padding="12px 16px" fontSize="15px">${formatNumber(quote.quoteValue || 0)}</Td>
                              <Td isNumeric padding="12px 16px" fontSize="15px">${formatNumber(comparisonData.submission || 0)}</Td>
                              <Td isNumeric padding="12px 16px" fontSize="15px">${formatNumber(Math.abs(difference))}</Td>
                              <Td padding="12px 16px" fontSize="15px">
                                <Box 
                                  px={2} py={0.5}
                                  borderRadius="full" 
                                  display="inline-block"
                                  bg={(quote.quoteValue || 0) >= (comparisonData.submission || 0) ? "green.100" : "red.100"}
                                  color={(quote.quoteValue || 0) >= (comparisonData.submission || 0) ? "green.700" : "red.700"}
                                  fontWeight="medium"
                                >
                                  {(quote.quoteValue || 0) >= (comparisonData.submission || 0) ? "+" : "-"}
                                  {Math.abs(percentageDifference).toFixed(2)}%
                                </Box>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
        </>
      ) : (
        <Box 
          textAlign="center" 
          p={10} 
          bg="white" 
          borderRadius="md" 
          borderWidth="1px" 
          borderColor="#CDDBDE"
          boxShadow="sm"
        >
          <Text color="gray.500">Select a sublimit to view comparison data</Text>
        </Box>
      )}
    </Box>
  );
};

export default QuotesSubmissionComparison; 