import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { CREDIT_RATING_COLORS } from './QuotesTable';

const OptimizedQuotesTable = ({ optimizedQuotes, isLoading, error }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedQuotes, setGroupedQuotes] = useState({});
  
  // Define theme colors at component level to avoid hook rule violations
  const primaryLayerBg = useColorModeValue('blue.50', 'blue.900');
  const secondLayerBg = useColorModeValue('purple.50', 'purple.900');
  const thirdLayerBg = useColorModeValue('teal.50', 'teal.900');
  const defaultLayerBg = useColorModeValue('gray.50', 'gray.700');
  
  // Group quotes by layer for visual grouping
  useEffect(() => {
    if (optimizedQuotes && optimizedQuotes.length > 0) {
      const grouped = optimizedQuotes.reduce((acc, quote) => {
        if (!acc[quote.Layer]) {
          acc[quote.Layer] = [];
        }
        acc[quote.Layer].push(quote);
        return acc;
      }, {});
      setGroupedQuotes(grouped);
    }
  }, [optimizedQuotes]);
  
  const filteredQuotes = optimizedQuotes.filter(quote => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      quote.Carrier.toLowerCase().includes(lowerSearchTerm) ||
      quote.Layer.toString().toLowerCase().includes(lowerSearchTerm)
    );
  });
  
  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="aon.blue.500" thickness="4px" />
        <Text mt={4} color="gray.600">Loading optimized quotes...</Text>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error}
      </Alert>
    );
  }
  
  // Calculate totals for stats
  const totalOptimizedPremium = optimizedQuotes.reduce((sum, quote) => sum + (quote.Premium * quote.AllocationPercentage / 100), 0);
  const avgCoverageScore = optimizedQuotes.length 
    ? optimizedQuotes.reduce((sum, quote) => sum + quote.Coverage_Score, 0) / optimizedQuotes.length 
    : 0;
  
  // Helper to determine allocation badge color
  const getAllocationColor = (allocation) => {
    if (allocation === 0) return "gray";
    if (allocation < 10) return "orange";
    if (allocation < 20) return "yellow";
    if (allocation < 50) return "green";
    if (allocation < 80) return "blue";
    return "purple";
  };
  
  // Parse layer string to extract attachment point information
  const parseLayer = (layerString) => {
    if (layerString.toLowerCase().includes('primary')) {
      return { name: 'Primary', attachment: 0 };
    }
    
    // Try to match patterns like "$10M xs $10M"
    const match = layerString.match(/\$(\d+)M\s+xs\s+\$(\d+)M/);
    if (match) {
      const [_, limit, attachment] = match;
      return {
        name: `$${limit}M xs $${attachment}M`,
        attachment: parseInt(attachment)
      };
    }
    
    return { name: layerString, attachment: 0 };
  };
  
  // Get background color based on attachment point (lighter version for background)
  const getAttachmentPointBgColor = (attachmentPoint) => {
    if (attachmentPoint <= 5) return "#e6f2ff"; // Light blue
    if (attachmentPoint <= 15) return "#f2e6ff"; // Light purple
    if (attachmentPoint <= 25) return "#e6fff2"; // Light teal
    if (attachmentPoint <= 50) return "#fff2e6"; // Light orange
    return "#ffe6e6"; // Light red
  };
  
  // Get text color based on attachment point (darker version for text)
  const getAttachmentPointTextColor = (attachmentPoint) => {
    if (attachmentPoint <= 5) return "#0066cc"; // Dark blue
    if (attachmentPoint <= 15) return "#6600cc"; // Dark purple
    if (attachmentPoint <= 25) return "#00cc66"; // Dark teal
    if (attachmentPoint <= 50) return "#cc6600"; // Dark orange
    return "#cc0000"; // Dark red
  };
  
  // Helper to get layer background color - using pre-defined values to avoid hook rule violations
  const getLayerBgColor = (layer) => {
    const parsedLayer = parseLayer(layer);
    if (parsedLayer.attachment <= 5) return primaryLayerBg;
    if (parsedLayer.attachment <= 15) return secondLayerBg;
    if (parsedLayer.attachment <= 25) return thirdLayerBg;
    return defaultLayerBg;
  };
  
  // Map credit rating numbers to readable text
  const getCreditRatingText = (quote) => {
    // Check all possible credit rating field names
    const rating = quote.CreditRating || quote.CreditRatingValue || quote.Credit_Rating;
    
    // If it's already a string representation, return it directly
    if (typeof rating === 'string') {
      return rating;
    }
    
    // Map numeric ratings to text
    const ratingMap = {
      1: "AAA",
      2: "AA",
      3: "A",
      4: "BBB",
      5: "BB",
      6: "B+",
      7: "B",
      8: "B-"
    };
    return ratingMap[rating] || "N/A";
  };
  
  // Get styling for credit rating based on the rating value
  const getCreditRatingStyle = (quote) => {
    const ratingText = getCreditRatingText(quote);
    
    // Look up the color in our shared mapping
    if (CREDIT_RATING_COLORS[ratingText]) {
      return CREDIT_RATING_COLORS[ratingText];
    }
    
    // Try to match partial ratings (e.g., if "A" exists but "A+" doesn't)
    for (const [key, value] of Object.entries(CREDIT_RATING_COLORS)) {
      if (ratingText.startsWith(key) || key.startsWith(ratingText)) {
        return value;
      }
    }
    
    // Return default if no match
    return CREDIT_RATING_COLORS.default;
  };
  
  // Get allocation background and text colors in the translucent style
  const getAllocationBgColor = (allocation) => {
    if (allocation === 0) return "#f5f5f5"; // Very light gray
    if (allocation < 10) return "#fff0e6"; // Very light orange
    if (allocation < 20) return "#fffbe6"; // Very light yellow
    if (allocation < 50) return "#e6f8e6"; // Very light green
    if (allocation < 80) return "#e6f2ff"; // Very light blue
    return "#f5e6ff"; // Very light purple
  };
  
  const getAllocationTextColor = (allocation) => {
    if (allocation === 0) return "#666666"; // Medium gray
    if (allocation < 10) return "#994400"; // Dark orange
    if (allocation < 20) return "#806600"; // Dark yellow-brown
    if (allocation < 50) return "#1a661a"; // Dark green
    if (allocation < 80) return "#0047b3"; // Dark blue
    return "#5900b3"; // Dark purple
  };

  const renderGroupedQuotes = () => {
    const layers = Object.keys(groupedQuotes).sort();
    
    return layers.map((layer) => {
      const layerQuotes = groupedQuotes[layer].filter(quote => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          quote.Carrier?.toLowerCase().includes(lowerSearchTerm) ||
          quote.Layer?.toString().toLowerCase().includes(lowerSearchTerm)
        );
      });
      
      if (layerQuotes.length === 0) return null;
      
      const parsedLayer = parseLayer(layer);
      const bgColor = getAttachmentPointBgColor(parsedLayer.attachment);
      const textColor = getAttachmentPointTextColor(parsedLayer.attachment);
      
      return (
        <React.Fragment key={layer}>
          <Tr bg={getLayerBgColor(layer)}>
            <Td colSpan={6} py={2}>
              <Text 
                display="inline"
                px={3}
                py={1.5}
                borderRadius="md"
                bg={bgColor}
                color={textColor}
                fontWeight="bold"
              >
                {parsedLayer.name}
              </Text>
            </Td>
          </Tr>
          {layerQuotes.map((quote, index) => {
            const ratingStyle = getCreditRatingStyle(quote);
            const creditRatingText = getCreditRatingText(quote);
            const allocationBg = getAllocationBgColor(quote.AllocationPercentage);
            const allocationColor = getAllocationTextColor(quote.AllocationPercentage);
            
            return (
              <Tr 
                key={`${layer}-${index}`} 
                _hover={{ bg: "gray.50" }}
                bg={quote.AllocationPercentage > 0 ? "white" : "gray.50"}
              >
                <Td fontWeight="500" color="gray.700">{quote.Carrier}</Td>
                <Td isNumeric color="gray.700">
                  ${(quote.Premium * quote.AllocationPercentage / 100).toLocaleString()}
                </Td>
                <Td isNumeric color="gray.700">
                  {(quote.Capacity * quote.AllocationPercentage / 100).toFixed(2)}
                </Td>
                <Td isNumeric>
                  <Text 
                    display="inline-block"
                    px={2}
                    py={1}
                    borderRadius="sm"
                    bg={ratingStyle.bg}
                    color={ratingStyle.text}
                    fontWeight="medium"
                    minWidth="36px"
                    textAlign="center"
                    boxShadow="0 0 0 1px rgba(0,0,0,0.05)"
                  >
                    {creditRatingText}
                  </Text>
                </Td>
                <Td isNumeric color="gray.700">
                  {(quote.Coverage_Score * 100).toFixed(2)}%
                </Td>
                <Td isNumeric>
                  <Text 
                    display="inline-block"
                    px={2}
                    py={1}
                    borderRadius="sm"
                    bg={allocationBg}
                    color={allocationColor}
                    fontWeight="medium"
                    minWidth="50px"
                    textAlign="center"
                    boxShadow="0 0 0 1px rgba(0,0,0,0.05)"
                  >
                    {quote.AllocationPercentage.toFixed(2)}%
                  </Text>
                </Td>
              </Tr>
            );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={6}>
        <Stat borderRadius="md" bg="white" p={4} boxShadow="sm" border="1px solid" borderColor="gray.100">
          <StatLabel fontSize="sm" color="gray.500">Total Premium</StatLabel>
          <StatNumber fontSize="2xl" fontWeight="600" color="aon.blue.700">
            ${totalOptimizedPremium.toLocaleString()}
          </StatNumber>
        </Stat>
        <Stat borderRadius="md" bg="white" p={4} boxShadow="sm" border="1px solid" borderColor="gray.100">
          <StatLabel fontSize="sm" color="gray.500">Average Coverage</StatLabel>
          <StatNumber fontSize="2xl" fontWeight="600" color="aon.blue.700">
            {(avgCoverageScore * 100).toFixed(2)}%
          </StatNumber>
        </Stat>
        <Stat borderRadius="md" bg="white" p={4} boxShadow="sm" border="1px solid" borderColor="gray.100">
          <StatLabel fontSize="sm" color="gray.500">Selected Carriers</StatLabel>
          <StatNumber fontSize="2xl" fontWeight="600" color="aon.blue.700">
            {optimizedQuotes.filter(q => q.AllocationPercentage > 0).length}
          </StatNumber>
        </Stat>
      </SimpleGrid>
      
      <Box mb={4}>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search by carrier or layer"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            borderColor="gray.200"
            _hover={{ borderColor: "gray.300" }}
            _focus={{ borderColor: "aon.blue.500", boxShadow: "0 0 0 1px #0051a8" }}
          />
        </InputGroup>
      </Box>
      
      <Box 
        overflowX="auto" 
        overflowY="auto" 
        maxHeight="600px" 
        borderRadius="md" 
        border="1px solid" 
        borderColor="gray.200"
      >
        <Table variant="simple" size="sm">
          <Thead bg="gray.50" position="sticky" top={0} zIndex={10}>
            <Tr>
              <Th color="gray.600" fontWeight="600" py={3}>Carrier</Th>
              <Th color="gray.600" fontWeight="600" py={3} isNumeric>Premium</Th>
              <Th color="gray.600" fontWeight="600" py={3} isNumeric>Capacity</Th>
              <Th color="gray.600" fontWeight="600" py={3} isNumeric>Credit Rating</Th>
              <Th color="gray.600" fontWeight="600" py={3} isNumeric>Coverage Score</Th>
              <Th color="gray.600" fontWeight="600" py={3} isNumeric>Allocation</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredQuotes.length > 0 ? renderGroupedQuotes() : (
              <Tr>
                <Td colSpan={6} textAlign="center" py={4}>
                  <Text color="gray.500">No optimized quotes found matching your search.</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default OptimizedQuotesTable; 