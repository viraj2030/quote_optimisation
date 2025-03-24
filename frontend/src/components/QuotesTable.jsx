import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Heading,
  InputGroup,
  InputLeftElement,
  Input,
  Badge,
  Flex,
  IconButton,
  Stack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatGroup,
  Select,
  SimpleGrid,
  useColorModeValue,
  Icon,
  Button,
  Checkbox,
  Link,
} from '@chakra-ui/react';
import { SearchIcon, CheckIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FiDollarSign, FiUsers, FiLayers, FiShield } from 'react-icons/fi';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { px } from 'framer-motion';

// Consistent credit rating colors to be used across the application
export const CREDIT_RATING_COLORS = {
  // AAA range (green/mint colors)
  "AAA": { bg: "#e6ffe6", text: "#006600" },
  "AA+": { bg: "#e6ffe6", text: "#006600" },
  "AA": { bg: "#ebffeb", text: "#007700" },
  "AA-": { bg: "#f0fff0", text: "#008800" },
  
  // A range (blue/aqua colors)
  "A+": { bg: "#e6f9ff", text: "#006699" },
  "A": { bg: "#ebf7ff", text: "#0077aa" },
  "A-": { bg: "#f0f4ff", text: "#0088bb" },
  
  // BBB range (purple/lavender colors)
  "BBB+": { bg: "#f2e6ff", text: "#5500aa" },
  "BBB": { bg: "#f5ebff", text: "#6600bb" },
  "BBB-": { bg: "#f7f0ff", text: "#7700cc" },
  
  // BB range (yellow/golden colors)
  "BB+": { bg: "#fffde6", text: "#886600" },
  "BB": { bg: "#fffae8", text: "#997700" },
  "BB-": { bg: "#fff8eb", text: "#aa8800" },
  
  // B range (orange/amber colors)
  "B+": { bg: "#fff5e6", text: "#aa5500" },
  "B": { bg: "#fff0e8", text: "#bb6600" },
  "B-": { bg: "#ffe8e6", text: "#cc0000" },
  
  // Default for unknown ratings
  "default": { bg: "#f5f5f5", text: "#666666" },
  "N/A": { bg: "#f5f5f5", text: "#666666" }
};

const QuotesTable = ({ quotes = [], isLoading = false, error = null, hideKpis = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedQuotes, setGroupedQuotes] = useState({});
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const navigate = useNavigate();
  
  // Group quotes by layer for visual grouping
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      const grouped = quotes.reduce((acc, quote) => {
        if (!acc[quote.Layer]) {
          acc[quote.Layer] = [];
        }
        acc[quote.Layer].push(quote);
        return acc;
      }, {});
      setGroupedQuotes(grouped);
    }
  }, [quotes]);
  
  const filteredQuotes = quotes.filter(quote => {
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
        <Text mt={4} color="gray.600">Loading quotes...</Text>
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
  const totalRawPremium = quotes.reduce((sum, quote) => sum + quote.Premium, 0);
  const totalRawCapacity = quotes.reduce((sum, quote) => sum + quote.Capacity, 0);
  const avgCoverageScore = quotes.length ? quotes.reduce((sum, quote) => sum + quote.Coverage_Score, 0) / quotes.length : 0;
  
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
    
    // Look up the color in our mapping
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

  const toggleSelection = (quoteId) => {
    setSelectedQuotes(prev => {
      if (prev.includes(quoteId)) {
        return prev.filter(id => id !== quoteId);
      } else {
        return [...prev, quoteId];
      }
    });
  };

  // Get unique count of carriers (some might appear in multiple layers)
  const uniqueCarrierCount = new Set(quotes.map(q => q.Carrier)).size;

  // Flatten quotes for simple display, similar to the image
  const flattenedQuotes = quotes.map((quote, index) => {
    const creditRatingText = getCreditRatingText(quote);
    const ratingStyle = getCreditRatingStyle(quote);
    // Use the QuoteID if available, otherwise create a fallback ID
    // Make sure to use the correct format with spaces not hyphens
    const quoteId = quote.QuoteID || `Quote ${index + 1}`;
    
    return {
      id: quoteId,
      carrier: quote.Carrier,
      layer: quote.Layer,
      premium: quote.Premium,
      capacity: quote.Capacity,
      coverageScore: quote.Coverage_Score,
      creditRating: creditRatingText,
      ratingStyle: ratingStyle
    };
  });

  // Function to handle view sublimits clicks
  const handleViewSublimits = (quoteId) => {
    // Navigate to the View Coverage Offered tab (index 2)
    navigate(`/?tab=2&quoteId=${quoteId}`);
  };

  // Map to different status types for display
  const getQuoteStatus = (index) => {
    // Simulate different statuses based on index for visual variety
    const statuses = ["Quoted", "Quoted 2", "Submission Sent", "Declined 1"];
    return statuses[index % statuses.length];
  };

  // Get status badge style based on status
  const getStatusStyle = (status) => {
    switch(status) {
      case "Quoted":
        return { bg: "#e6f9ff", color: "#006699" };
      case "Quoted 2":
        return { bg: "#e6f9ff", color: "#006699" };
      case "Submission Sent":
        return { bg: "#ebf7ff", color: "#0077aa" };
      case "Declined 1":
        return { bg: "#ffe8e6", color: "#cc0000" };
      default:
        return { bg: "#f5f5f5", color: "#666666" };
    }
  };

  // Function to handle Optimise Placement button click
  const handleOptimisePlacement = () => {
    // Navigate to the dedicated optimization workflow view (tab index 6)
    navigate('/?tab=6');
  };

  return (
    <Box width="100%" margin="0" padding="0">
      {/* Stats Cards section removed since it's already in App.jsx */}
      
      <Flex direction="column" mb={0} py={0}>
        <Heading as="h2" size="md" mb={6} fontWeight="600" px={6} pt={6}>
          All Quotes Received
        </Heading>

        <Flex justify="space-between" alignItems="center" mb={6} px={6}>
          <Box>
            <Text color="gray.600" mb={2}>
              Search Organizations
            </Text>
            <InputGroup maxW="400px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input 
                placeholder="Search carriers and quotes" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Box>
          
          <Button 
            colorScheme="blue" 
            size="md" 
            leftIcon={<Icon as={FiLayers} />}
            onClick={handleOptimisePlacement}
          >
            Optimise Placement
          </Button>
        </Flex>

        <Text color="gray.600" mb={4} px={6}>
          Select one or more rows to get started.
        </Text>

        <Box 
          overflowX="auto" 
          width="100%" 
          margin="0" 
          padding="0" 
          border="none" 
          borderRadius="0"
          minWidth="100%"
          height="460px"
          overflow="auto"
        >
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
                <Th w="40px" pl={4} padding="12px 16px" borderLeft="0">
                  <Checkbox colorScheme="blue" isDisabled />
                </Th>
                <Th color="gray.600" fontWeight="500" width="25%" padding="12px 16px" fontSize="15px">Organization Name</Th>
                <Th color="gray.600" fontWeight="500" width="12%" padding="12px 16px" fontSize="15px">Layer</Th>
                <Th isNumeric color="gray.600" fontWeight="500" width="12%" padding="12px 16px" fontSize="15px">Premium</Th>
                <Th isNumeric color="gray.600" fontWeight="500" width="12%" padding="12px 16px" fontSize="15px">Capacity</Th>
                <Th color="gray.600" fontWeight="500" width="10%" padding="12px 16px" fontSize="15px">Credit Rating</Th>
                <Th color="gray.600" fontWeight="500" width="14%" padding="12px 16px" fontSize="15px">Sublimits</Th>
                <Th color="gray.600" fontWeight="500" width="10%" padding="12px 16px" fontSize="15px" borderRight="0">Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredQuotes.length > 0 ? (
                flattenedQuotes
                  .filter(quote => 
                    quote.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    quote.layer.toString().toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((quote, idx) => {
                    return (
                      <Tr 
                        key={quote.id} 
                        _hover={{ bg: "gray.50" }}
                        borderBottom="1px" 
                        borderColor="gray.200"
                        bg={idx % 2 === 0 ? "white" : "#F9FCFC"}
                      >
                        <Td padding="12px 16px" pl={4} width="40px" borderLeft="0">
                          <Checkbox colorScheme="blue" />
                        </Td>
                        <Td padding="12px 16px" fontWeight="500" color="gray.700" width="25%" fontSize="15px">
                          {quote.carrier}
                        </Td>
                        <Td padding="12px 16px" width="12%" fontSize="15px">
                          <Badge 
                            px={2} 
                            py={1}
                            borderRadius="md"
                            bg="gray.100"
                            color="gray.600"
                            fontWeight="normal"
                          >
                            {quote.layer}
                          </Badge>
                        </Td>
                        <Td padding="12px 16px" isNumeric width="12%" fontSize="15px">${quote.premium.toLocaleString()}</Td>
                        <Td padding="12px 16px" isNumeric width="12%" fontSize="15px">${quote.capacity.toLocaleString()}</Td>
                        <Td padding="12px 16px" width="10%" fontSize="15px">
                          <Badge 
                            borderRadius="full" 
                            px={2} 
                            py={1}
                            bg={quote.ratingStyle.bg}
                            color={quote.ratingStyle.text}
                            fontWeight="medium"
                          >
                            {quote.creditRating}
                          </Badge>
                        </Td>
                        <Td padding="12px 16px" width="14%" fontSize="15px">
                          <Button
                            size="sm"
                            colorScheme="blue"
                            variant="link"
                            onClick={() => handleViewSublimits(quote.id)}
                            leftIcon={<ExternalLinkIcon />}
                          >
                            View Details
                          </Button>
                        </Td>
                        <Td padding="12px 16px" width="10%" fontSize="15px" borderRight="0">
                          <Badge 
                            px={2} 
                            py={1}
                            borderRadius="md"
                            bg="#e6f9ff"
                            color="#006699"
                          >
                            Quoted
                          </Badge>
                        </Td>
                      </Tr>
                    );
                  })
              ) : (
                <Tr borderBottom="1px" borderColor="gray.200">
                  <Td colSpan={8} textAlign="center" py={4} borderLeft="0" borderRight="0">No quotes found</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Flex>
    </Box>
  );
};

export default QuotesTable;