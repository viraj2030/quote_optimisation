import React, { useState, useEffect } from 'react';
import {
  Box, 
  VStack, 
  Heading, 
  Text, 
  Spinner, 
  Flex,
  useToast,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import axios from 'axios';

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Aon colors for impact bar gradient
const AON_DARK_BLUE = "#007585"; // Darkest (highest impact)
const AON_BLUE = "#0051A8";      // Medium-high impact
const AON_LIGHT_BLUE = "#4F95DD"; // Medium-low impact
const AON_GREY_BLUE = "#CDDBDE";  // Lightest (lowest impact)

// Function to get color based on bar position in the list
const getGradientColor = (index, totalBars) => {
  // Calculate relative position (0-1 scale)
  const relativePosition = index / (totalBars - 1);
  
  // Create a sequential gradient from dark blue to grey blue
  if (relativePosition === 0) {
    // First bar (top) - darkest blue
    return AON_DARK_BLUE;
  } else if (relativePosition === 1) {
    // Last bar (bottom) - lightest blue/grey
    return AON_GREY_BLUE;
  } else {
    // For the bars in between, interpolate colors
    // We'll create a smoother gradient through all four colors
    if (relativePosition < 0.33) {
      // First third: interpolate between AON_DARK_BLUE and AON_BLUE
      const ratio = relativePosition / 0.33;
      return interpolateColor(AON_DARK_BLUE, AON_BLUE, ratio);
    } else if (relativePosition < 0.67) {
      // Middle third: interpolate between AON_BLUE and AON_LIGHT_BLUE
      const ratio = (relativePosition - 0.33) / 0.34;
      return interpolateColor(AON_BLUE, AON_LIGHT_BLUE, ratio);
    } else {
      // Last third: interpolate between AON_LIGHT_BLUE and AON_GREY_BLUE
      const ratio = (relativePosition - 0.67) / 0.33;
      return interpolateColor(AON_LIGHT_BLUE, AON_GREY_BLUE, ratio);
    }
  }
};

// Helper function to interpolate between two hex colors
const interpolateColor = (color1, color2, ratio) => {
  // Convert hex to RGB
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);
  
  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);
  
  // Interpolate each RGB component
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Helper function to format currency with appropriate precision
const formatCurrency = (value) => {
  const absValue = Math.abs(parseFloat(value));
  
  if (absValue >= 1000000) {
    return `$${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `$${(absValue / 1000).toFixed(1)}K`;
  } else if (absValue >= 1) {
    return `$${absValue.toFixed(2)}`;
  } else if (absValue >= 0.01) {
    return `$${absValue.toFixed(2)}`;
  } else {
    return `$${absValue.toFixed(4)}`;
  }
};

const FeatureImpactVisualization = () => {
  const [featureData, setFeatureData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const textColor = useColorModeValue('#333333', 'gray.100');
  const subtleTextColor = useColorModeValue('#666666', 'gray.400');
  
  // Fetch feature impact data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/coverage-analysis/features`, {
          params: { step: 1 } // Get impact per $1 of premium
        });
        
        if (response.data.feature_impact && response.data.feature_impact.length > 0) {
          // Sort by absolute impact
          const sortedFeatures = [...response.data.feature_impact]
            .sort((a, b) => Math.abs(b.scaledMeanShap) - Math.abs(a.scaledMeanShap))
            .slice(0, 10); // Get top 10 features
            
          // Calculate total absolute impact for percentage calculation
          const totalAbsImpact = sortedFeatures.reduce(
            (sum, feature) => sum + Math.abs(feature.scaledMeanShap), 0
          );
          
          // Transform each feature
          const transformedData = sortedFeatures.map(feature => {
            const impactValue = feature.scaledMeanShap;
            const impactPercentage = (Math.abs(impactValue) / totalAbsImpact) * 100;
            
            return {
              name: feature.featureName,
              rawName: feature.feature || "",
              value: feature.actualValue || "N/A",
              impactValue: impactValue,
              impactPercentage: impactPercentage.toFixed(1),
              formattedImpact: formatCurrency(impactValue),
              isPositive: feature.sign === 'Positive'
            };
          });
          
          setFeatureData(transformedData);
        }
      } catch (error) {
        console.error('Error fetching feature impact:', error);
        setError('Failed to fetch feature impact data');
        toast({
          title: 'Error',
          description: 'Failed to fetch feature impact data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);
  
  if (loading) {
    return (
      <Flex justify="center" align="center" height="120px">
        <Spinner size="md" color="#0051A8" thickness="3px" />
      </Flex>
    );
  }
  
  if (error) {
    return (
      <Box p={4} borderRadius="md" borderWidth="1px" borderColor="red.200" bg="#FFF5F5">
        <Heading size="xs" color="#E53E3E" mb={2} fontWeight="500">Unable to Load Impact Data</Heading>
        <Text color="#333333" fontSize="sm">{error}</Text>
      </Box>
    );
  }
  
  if (featureData.length === 0) {
    return (
      <Box p={4} borderRadius="md" borderWidth="1px" borderColor="blue.200" bg="#F0F8FF">
        <Heading size="xs" color="#0051A8" mb={2} fontWeight="500">No Impact Data Available</Heading>
        <Text color="#666666" fontSize="sm">No feature impact data could be loaded at this time.</Text>
      </Box>
    );
  }
  
  // Find max impact percentage for scaling
  const maxImpactPercentage = Math.max(...featureData.map(feature => parseFloat(feature.impactPercentage)));
  
  return (
    <>
      {/* Description text - updated for simplicity */}
      <Text fontSize="sm" color={subtleTextColor} mb={4}>
        This analysis shows how different sublimits impact the final premium calculation.
      </Text>
      
      {/* Feature impact bars - cleaner layout with consistent spacing */}
      <VStack spacing={3} align="stretch">
        {featureData.map((feature, idx) => (
          <Tooltip
            key={idx}
            label={`${feature.name}: ${feature.isPositive ? 'Increases' : 'Decreases'} premium by ${feature.formattedImpact} per $1`}
            placement="top"
            hasArrow
          >
            <Box 
              p={2}
              borderRadius="md"
              transition="all 0.2s"
              borderWidth="1px"
              borderColor="transparent"
              _hover={{ borderColor: "#CDDBDE", bg: "#f9fafb" }}
            >
              <Flex justifyContent="space-between" alignItems="center" mb={1}>
                <Text 
                  fontWeight="500" 
                  fontSize="sm" 
                  color="#333333" 
                  noOfLines={1}
                  isTruncated
                >
                  {feature.name}
                </Text>
                <Text fontSize="xs" color="#666666" fontWeight="medium">
                  {feature.impactPercentage}% impact
                </Text>
              </Flex>
              
              <Box position="relative" h="10px" w="100%" bg="#F1F5F9" borderRadius="full" overflow="hidden">
                <Box
                  position="absolute"
                  h="100%"
                  w={`${(parseFloat(feature.impactPercentage) / maxImpactPercentage) * 100}%`}
                  bg={getGradientColor(idx, featureData.length)}
                  borderRadius="full"
                  left="0"
                  boxShadow="sm"
                />
              </Box>
            </Box>
          </Tooltip>
        ))}
      </VStack>
    </>
  );
};

export default FeatureImpactVisualization; 