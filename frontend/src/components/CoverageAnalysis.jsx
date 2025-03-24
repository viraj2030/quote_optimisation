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
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Spinner,
  useToast,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fetchCoverageAnalysisSublimits, getFeatureImpact } from '../api';

// Import components
import FeatureImpactVisualization from './FeatureImpactVisualization';
import QuotesSubmissionComparison from './QuotesSubmissionComparison';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

// Constants
const API_BASE_URL = 'http://localhost:5001/api';

const CoverageAnalysis = () => {
  const [sublimits, setSublimits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [featureImpactData, setFeatureImpactData] = useState(null);
  const [isLoadingFeatureImpact, setIsLoadingFeatureImpact] = useState(false);

  const fetchSublimits = async () => {
    try {
      setIsLoading(true);
      const data = await fetchCoverageAnalysisSublimits();
      setSublimits(data.sublimits);
      setError(null);
    } catch (err) {
      console.error('Error fetching sublimits:', err);
      setError('Failed to fetch sublimits');
      setSublimits([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeatureImpact = async () => {
    try {
      setIsLoadingFeatureImpact(true);
      const data = await getFeatureImpact();
      setFeatureImpactData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching feature impact data:', err);
      setError('Failed to fetch feature impact data');
      setFeatureImpactData(null);
    } finally {
      setIsLoadingFeatureImpact(false);
    }
  };

  return (
    <Box p={4} bg="white" borderRadius="lg" boxShadow="sm">
      <Heading size="lg" mb={6}>Coverage Analysis</Heading>
      
      <VStack spacing={6} align="stretch">
        <Text mb={4}>
          The Coverage Analysis page has been reorganized. Please use the following tabs from the main menu:
        </Text>
        
        <Box p={4} bg="blue.50" borderRadius="md">
          <Heading size="md" mb={2} color="blue.600">Feature Impact</Heading>
          <Text>
            The Feature Impact analysis is now available in the "Market Perception" tab on the main navigation.
            View detailed information about how different features impact premium pricing.
          </Text>
        </Box>
        
        <Box p={4} bg="green.50" borderRadius="md">
          <Heading size="md" mb={2} color="green.600">Quotes vs Submission</Heading>
          <Text>
            The Quotes vs Submission comparison is now available in the "Quotes vs Submission" tab on the main navigation.
            Compare quote values against submission values for various sublimits.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default CoverageAnalysis; 