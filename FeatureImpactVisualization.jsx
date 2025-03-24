import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Tooltip,
  Grid,
  GridItem,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Constants
const API_BASE_URL = 'http://localhost:5001/api';

const FeatureImpactVisualization = () => {
  // State variables
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI colors
  const positiveBg = useColorModeValue('red.50', 'red.900');
  const positiveFg = useColorModeValue('red.500', 'red.200');
  const negativeBg = useColorModeValue('blue.50', 'blue.900');
  const negativeFg = useColorModeValue('blue.500', 'blue.200');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch feature impact data
  useEffect(() => {
    const fetchImpactData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/coverage-analysis/features`);
        setImpactData(response.data.detailed_impact);
      } catch (err) {
        setError('Failed to fetch feature impact data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchImpactData();
  }, []);

  // Prepare distribution chart data
  const prepareDistributionData = () => {
    if (!impactData || !impactData.distribution) return null;

    const values = impactData.distribution.map(d => d.value);
    const counts = impactData.distribution.map(d => d.count);
    
    return {
      labels: values,
      datasets: [
        {
          label: 'Distribution',
          data: counts,
          fill: true,
          backgroundColor: 'rgba(53, 162, 235, 0.2)',
          borderColor: 'rgba(53, 162, 235, 1)',
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    };
  };

  // Distribution chart options
  const distributionOptions = {
    responsive: true,
    indexAxis: 'y',
    scales: {
      x: {
        display: false,
      },
      y: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          callback: function(value) {
            return `$${value.toLocaleString()}`;
          }
        }
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    maintainAspectRatio: false,
  };

  // Prepare waterfall chart data
  const prepareWaterfallData = () => {
    if (!impactData || !impactData.features.length === 0) return null;

    // Sort features by absolute contribution
    const sortedFeatures = [...impactData.features]
      .sort((a, b) => b.abs_contribution - a.abs_contribution)
      .slice(0, 10); // Show top 10 features

    const labels = sortedFeatures.map(f => f.display_name);
    
    // Add base and final values
    labels.unshift('Base Value');
    if (sortedFeatures.length > 0) {
      labels.push('Final Prediction');
    }

    // Create data for the waterfall chart
    const positiveData = Array(labels.length).fill(null);
    const negativeData = Array(labels.length).fill(null);
    
    // Set base value
    positiveData[0] = impactData.base_value;
    
    // Set feature contributions
    sortedFeatures.forEach((feature, idx) => {
      if (feature.is_positive) {
        positiveData[idx + 1] = feature.contribution;
      } else {
        negativeData[idx + 1] = Math.abs(feature.contribution);
      }
    });
    
    // Set final prediction
    positiveData[labels.length - 1] = impactData.final_value;
    
    return {
      labels: labels,
      datasets: [
        {
          label: 'Increases Premium',
          data: positiveData,
          backgroundColor: 'rgba(231, 76, 60, 0.7)',
          borderColor: 'rgba(231, 76, 60, 1)',
          borderWidth: 1,
        },
        {
          label: 'Decreases Premium',
          data: negativeData,
          backgroundColor: 'rgba(46, 134, 171, 0.7)',
          borderColor: 'rgba(46, 134, 171, 1)',
          borderWidth: 1,
        }
      ]
    };
  };

  // Waterfall chart options
  const waterfallOptions = {
    responsive: true,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        }
      },
      y: {
        stacked: true,
        ticks: {
          callback: function(value) {
            return `$${value.toLocaleString()}`;
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            if (value === null) return '';
            return `$${value.toLocaleString()}`;
          }
        }
      }
    },
    maintainAspectRatio: false,
  };

  if (loading) {
    return (
      <Flex justify="center" p={8}>
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Alert status="error" variant="solid" borderRadius="md">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  if (!impactData) {
    return (
      <Alert status="warning" variant="solid" borderRadius="md">
        <AlertIcon />
        No feature impact data available
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Title and description */}
      <Box>
        <Heading size="lg" mb={2}>Premium Feature Impact Analysis</Heading>
        <Text color="gray.600">
          This analysis shows how different sublimits impact the final premium calculation.
        </Text>
      </Box>
      
      {/* Prediction display */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        borderColor={borderColor}
        p={4}
        bg="gray.50"
      >
        <Stat textAlign="center">
          <StatLabel fontSize="lg">Predicted Premium</StatLabel>
          <StatNumber fontSize="3xl" fontWeight="bold">
            ${impactData.final_value.toLocaleString()}
          </StatNumber>
        </Stat>
      </Box>
      
      {/* Main visualization */}
      <Grid templateColumns={{base: "1fr", md: "1fr 2fr 1fr"}} gap={4}>
        {/* Distribution chart */}
        <GridItem>
          <Box 
            borderWidth="1px" 
            borderRadius="lg" 
            borderColor={borderColor}
            p={4}
            height="500px"
          >
            <Heading size="sm" mb={4}>Premium Distribution</Heading>
            <Box height="90%">
              {prepareDistributionData() && (
                <Line data={prepareDistributionData()} options={distributionOptions} />
              )}
            </Box>
          </Box>
        </GridItem>
        
        {/* Waterfall chart */}
        <GridItem>
          <Box 
            borderWidth="1px" 
            borderRadius="lg" 
            borderColor={borderColor}
            p={4}
            height="500px"
          >
            <Heading size="sm" mb={4}>Feature Impact on Premium</Heading>
            <Box height="90%">
              {prepareWaterfallData() && (
                <Bar data={prepareWaterfallData()} options={waterfallOptions} />
              )}
            </Box>
          </Box>
        </GridItem>
        
        {/* Feature table */}
        <GridItem>
          <Box 
            borderWidth="1px" 
            borderRadius="lg" 
            borderColor={borderColor}
            p={4}
            height="500px"
            overflowY="auto"
          >
            <Heading size="sm" mb={4}>Feature Details</Heading>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Impact</Th>
                  <Th>Feature</Th>
                  <Th>Value</Th>
                </Tr>
              </Thead>
              <Tbody>
                {impactData.features.slice(0, 10).map((feature, idx) => (
                  <Tr key={idx}>
                    <Td>
                      <HStack>
                        <Badge 
                          colorScheme={feature.is_positive ? 'red' : 'blue'}
                          px={2} py={1}
                        >
                          {feature.is_positive ? '+' : '-'}${Math.abs(feature.contribution).toFixed(2)}
                        </Badge>
                      </HStack>
                    </Td>
                    <Td>
                      <Tooltip label={`This feature ${feature.is_positive ? 'increases' : 'decreases'} the premium because ${feature.is_positive ? 'higher' : 'lower'} values represent ${feature.is_positive ? 'greater' : 'lower'} risk`}>
                        <HStack>
                          <Text fontSize="sm">{feature.display_name}</Text>
                          <Icon as={InfoIcon} color="gray.400" boxSize={3} />
                        </HStack>
                      </Tooltip>
                    </Td>
                    <Td isNumeric>{feature.value}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </GridItem>
      </Grid>
      
      {/* Explanatory notes */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        borderColor={borderColor}
        p={4}
        bg="gray.50"
      >
        <Heading size="sm" mb={2}>How to Interpret This Analysis</Heading>
        <VStack align="start" spacing={2}>
          <HStack>
            <Badge colorScheme="red" px={2} py={1}>Red</Badge>
            <Text fontSize="sm">Features that increase the premium (higher risk)</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="blue" px={2} py={1}>Blue</Badge>
            <Text fontSize="sm">Features that decrease the premium (lower risk)</Text>
          </HStack>
          <Text fontSize="sm">
            The base value represents the average premium across all policies. Each feature contributes
            to the final premium calculation based on its value and importance.
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};

export default FeatureImpactVisualization; 