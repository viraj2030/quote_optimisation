import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Spinner,
  Alert,
  AlertIcon,
  Button,
  Badge,
  HStack,
  Select,
  FormControl,
  FormLabel,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Divider,
  useColorModeValue,
  TableContainer,
} from '@chakra-ui/react';
import { ArrowBackIcon, ArrowUpDownIcon } from '@chakra-ui/icons';
import { fetchSublimitsForQuote } from '../api';

const SublimitsView = ({ embedded = false, initialQuoteId = null }) => {
  // Get quoteId from URL params if not embedded
  const { quoteId: urlQuoteId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sublimitsData, setSublimitsData] = useState(null);
  const [orderBy, setOrderBy] = useState('difference');
  const [order, setOrder] = useState('desc');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [selectedLayer, setSelectedLayer] = useState('');
  const [availableQuotes, setAvailableQuotes] = useState([]);
  // Use initialQuoteId when provided, otherwise fallback to URL param
  const [selectedQuoteId, setSelectedQuoteId] = useState(initialQuoteId || urlQuoteId || '');
  
  // UI theme colors - use exact colors from the image
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const positiveColorBg = useColorModeValue('green.100', 'green.900');
  const positiveColorText = useColorModeValue('green.600', 'green.200');
  const negativeColorBg = useColorModeValue('red.100', 'red.900');
  const negativeColorText = useColorModeValue('red.600', 'red.200');
  
  // Fetch available quotes for filter options
  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/quotes');
        if (!response.ok) {
          throw new Error('Failed to fetch quotes');
        }
        
        const data = await response.json();
        console.log("Raw quotes response:", data);
        
        if (data && data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
          console.log("Available quotes from API:", data.quotes);
          setAvailableQuotes(data.quotes);
          
          // Set initial filter values based on the current quote
          const currentQuote = data.quotes.find(q => q.QuoteID === selectedQuoteId);
          if (currentQuote) {
            setSelectedCarrier(currentQuote.Carrier);
            setSelectedLayer(currentQuote.Layer);
          }
          
          // If embedded and no quote selected yet, default to the first one
          if (embedded && !selectedQuoteId) {
            setSelectedQuoteId(data.quotes[0].QuoteID);
          }
        } else {
          console.warn("No quotes returned from API or invalid format. Using mock data.");
          // Use mock data on error - ensure all 30 quotes are included
          const mockQuotes = Array.from({ length: 30 }, (_, i) => ({
            QuoteID: `Quote ${i + 1}`,
            Carrier: [
              "AIG", "Allianz", "AXA", "Zurich", "Chubb", "Liberty", "Berkshire", "Travelers", 
              "Munich Re", "Swiss Re", "Hannover Re", "SCOR", "Partner Re", "Renaissance Re", 
              "Arch Capital", "Axis Capital", "AIG", "Endurance", "Aspen Re", "Validus", "Chubb", 
              "Catlin", "Allied World", "Hiscox", "Amlin", "Beazley", "AXA", "Brit", "MS Amlin", 
              "XL Catlin"
            ][i],
            Layer: i < 10 ? "Primary $10M" : (i < 20 ? "$10M xs $10M" : "$10M xs $20M"),
            Premium: [
              156690, 127020, 133680, 139980, 135870, 118710, 164370, 142350, 135900, 127620,
              27540, 26310, 25680, 33690, 24330, 27570, 28650, 21690, 20190, 19110,
              19050, 20040, 20940, 21510, 17370, 19920, 18180, 23820, 19920, 23280
            ][i],
            Capacity: [
              2000000, 4000000, 3000000, 5000000, 4000000, 5000000, 6000000, 2000000, 1000000, 2000000,
              2000000, 5000000, 4000000, 5000000, 3000000, 2000000, 3000000, 4000000, 5000000, 3000000,
              3000000, 1000000, 4000000, 2000000, 4000000, 2000000, 1000000, 3000000, 3000000, 5000000
            ][i],
            CreditRating: [
              "A", "A", "A", "B", "AA", "B", "A", "A", "A", "A",
              "B", "A", "B", "A", "A", "AA", "A", "AA", "AA", "B",
              "B", "AA", "AA", "B", "B", "B", "A", "B", "AA", "AA"
            ][i],
          }));
          setAvailableQuotes(mockQuotes);
          
          // Set initial filter values if current quote ID exists in mock data
          const currentQuote = mockQuotes.find(q => q.QuoteID === selectedQuoteId);
          if (currentQuote) {
            setSelectedCarrier(currentQuote.Carrier);
            setSelectedLayer(currentQuote.Layer);
          }
          
          // If embedded and no quote selected yet, default to the first one
          if (embedded && !selectedQuoteId) {
            setSelectedQuoteId(mockQuotes[0].QuoteID);
          }
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
        // Use mock data on error with complete data for all 30 quotes
        const mockQuotes = Array.from({ length: 30 }, (_, i) => ({
          QuoteID: `Quote ${i + 1}`,
          Carrier: [
            "AIG", "Allianz", "AXA", "Zurich", "Chubb", "Liberty", "Berkshire", "Travelers", 
            "Munich Re", "Swiss Re", "Hannover Re", "SCOR", "Partner Re", "Renaissance Re", 
            "Arch Capital", "Axis Capital", "AIG", "Endurance", "Aspen Re", "Validus", "Chubb", 
            "Catlin", "Allied World", "Hiscox", "Amlin", "Beazley", "AXA", "Brit", "MS Amlin", 
            "XL Catlin"
          ][i],
          Layer: i < 10 ? "Primary $10M" : (i < 20 ? "$10M xs $10M" : "$10M xs $20M"),
          Premium: [
            156690, 127020, 133680, 139980, 135870, 118710, 164370, 142350, 135900, 127620,
            27540, 26310, 25680, 33690, 24330, 27570, 28650, 21690, 20190, 19110,
            19050, 20040, 20940, 21510, 17370, 19920, 18180, 23820, 19920, 23280
          ][i],
          Capacity: [
            2000000, 4000000, 3000000, 5000000, 4000000, 5000000, 6000000, 2000000, 1000000, 2000000,
            2000000, 5000000, 4000000, 5000000, 3000000, 2000000, 3000000, 4000000, 5000000, 3000000,
            3000000, 1000000, 4000000, 2000000, 4000000, 2000000, 1000000, 3000000, 3000000, 5000000
          ][i],
          CreditRating: [
            "A", "A", "A", "B", "AA", "B", "A", "A", "A", "A",
            "B", "A", "B", "A", "A", "AA", "A", "AA", "AA", "B",
            "B", "AA", "AA", "B", "B", "B", "A", "B", "AA", "AA"
          ][i],
        }));
        setAvailableQuotes(mockQuotes);
        
        // If embedded and no quote selected yet, default to the first one
        if (embedded && !selectedQuoteId) {
          setSelectedQuoteId(mockQuotes[0].QuoteID);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotes();
  }, [selectedQuoteId, embedded]);
  
  // Reset selectedQuoteId when initialQuoteId prop changes
  useEffect(() => {
    if (initialQuoteId) {
      setSelectedQuoteId(initialQuoteId);
    }
  }, [initialQuoteId]);
  
  // Fetch sublimits data when quoteId changes
  useEffect(() => {
    if (!selectedQuoteId) return;
    
    const fetchSublimits = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSublimitsForQuote(selectedQuoteId);
        console.log('Sublimits data:', data);
        setSublimitsData(data);
      } catch (err) {
        console.error('Error fetching sublimits:', err);
        setError(err.message || 'Failed to fetch sublimits');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSublimits();
  }, [selectedQuoteId]);
  
  // Handle sorting of the sublimits table
  const handleSort = (column) => {
    if (orderBy === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(column);
      setOrder('desc'); // Default to descending when changing columns
    }
  };
  
  const getSortedSublimits = () => {
    if (!sublimitsData || !sublimitsData.sublimits) return [];
    
    const sortedSublimits = [...sublimitsData.sublimits];
    
    // Sort by the selected column
    return sortedSublimits.sort((a, b) => {
      let valueA = a[orderBy];
      let valueB = b[orderBy];
      
      // Handle null/undefined values in sorting
      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;
      
      // If comparing percentage_difference, use absolute values
      if (orderBy === 'percentage_difference') {
        valueA = Math.abs(valueA);
        valueB = Math.abs(valueB);
      }
      
      // If comparing difference, use absolute values
      if (orderBy === 'difference') {
        valueA = Math.abs(valueA);
        valueB = Math.abs(valueB);
      }
      
      // Apply sort order
      return order === 'asc' ? valueA - valueB : valueB - valueA;
    });
  };
  
  // Format numbers for display
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  };
  
  // Format percentages for display
  const formatPercentage = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
  };
  
  // Handle quote selection change in dropdown
  const handleQuoteChange = (event) => {
    const newQuoteId = event.target.value;
    
    // If embedded, just update the state
    if (embedded) {
      setSelectedQuoteId(newQuoteId);
    } else {
      // If standalone, navigate to the new quote URL
      navigate(`/sublimits/${newQuoteId}`);
    }
  };
  
  // Create option text for select dropdown
  const getQuoteOptionText = (quote) => {
    return `${quote.Carrier} - ${quote.Layer}`;
  };
  
  if (loading && !sublimitsData) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text mt={4}>Loading sublimits data...</Text>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert status="error" mb={4}>
        <AlertIcon />
        {error}
      </Alert>
    );
  }
  
  return (
    <Box maxW={embedded ? "100%" : "1200px"} mx="auto">
      {/* Back button - only shown in standalone mode */}
      {!embedded && (
        <Button 
          leftIcon={<ArrowBackIcon />} 
          mb={6} 
          variant="outline" 
          onClick={() => navigate('/')}
          size="sm"
        >
          Back to Quotes
        </Button>
      )}
      
      {/* Quote Selection */}
      <Box mb={6} border="1px" borderColor={borderColor} borderRadius="md" p={4} bg={cardBg}>
        <Heading size="md" mb={4}>Select Quote</Heading>
        <Select 
          value={selectedQuoteId}
          onChange={handleQuoteChange}
          w={{ base: "100%", md: "400px" }}
        >
          {availableQuotes.map(quote => (
            <option key={quote.QuoteID} value={quote.QuoteID}>
              {getQuoteOptionText(quote)}
            </option>
          ))}
        </Select>
      </Box>
      
      {sublimitsData && (
        <>
          {/* Quote Details */}
          <Box 
            mb={6} 
            border="1px" 
            borderColor={borderColor} 
            borderRadius="md" 
            p={4} 
            bg={cardBg}
          >
            <Heading size="md" mb={2}>
              Sublimits Comparison for {sublimitsData.quote.carrier}
            </Heading>
            <Badge colorScheme="blue" mb={4}>{sublimitsData.quote.layer}</Badge>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mt={4}>
              <Stat>
                <StatLabel>Premium</StatLabel>
                <StatNumber>${sublimitsData.quote.premium.toLocaleString()}</StatNumber>
                <StatHelpText>Total quote premium</StatHelpText>
              </Stat>
              
              <Stat>
                <StatLabel>Capacity</StatLabel>
                <StatNumber>
                  ${(sublimitsData.quote.capacity).toLocaleString()}
                </StatNumber>
                <StatHelpText>Offered by carrier</StatHelpText>
              </Stat>
              
              <Stat>
                <StatLabel>Credit Rating</StatLabel>
                <StatNumber>{sublimitsData.quote.credit_rating}</StatNumber>
                <StatHelpText>Carrier rating</StatHelpText>
              </Stat>
            </SimpleGrid>
          </Box>
          
          {/* Sublimits Table */}
          <Box p={4} border="1px" borderColor={borderColor} borderRadius="md" bg={cardBg}>
            <Heading size="md" mb={6}>Sublimits Comparison</Heading>
            
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th width="30%">Sublimit</Th>
                    <Th 
                      isNumeric 
                      cursor="pointer" 
                      onClick={() => handleSort('amount')}
                    >
                      <HStack spacing={2} justifyContent="flex-end">
                        <Text>Quote Value</Text>
                        {orderBy === 'amount' && <ArrowUpDownIcon />}
                      </HStack>
                    </Th>
                    <Th 
                      isNumeric 
                      cursor="pointer" 
                      onClick={() => handleSort('submission_value')}
                    >
                      <HStack spacing={2} justifyContent="flex-end">
                        <Text>Submission Value</Text>
                        {orderBy === 'submission_value' && <ArrowUpDownIcon />}
                      </HStack>
                    </Th>
                    <Th 
                      isNumeric 
                      cursor="pointer" 
                      onClick={() => handleSort('difference')}
                    >
                      <HStack spacing={2} justifyContent="flex-end">
                        <Text>Difference</Text>
                        {orderBy === 'difference' && <ArrowUpDownIcon />}
                      </HStack>
                    </Th>
                    <Th 
                      isNumeric 
                      cursor="pointer" 
                      onClick={() => handleSort('percentage_difference')}
                    >
                      <HStack spacing={2} justifyContent="flex-end">
                        <Text>% Difference</Text>
                        {orderBy === 'percentage_difference' && <ArrowUpDownIcon />}
                      </HStack>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {getSortedSublimits().map((sublimit, idx) => {
                    const isNegative = sublimit.difference < 0;
                    const bgColor = isNegative ? negativeColorBg : positiveColorBg;
                    const textColor = isNegative ? negativeColorText : positiveColorText;
                    
                    return (
                      <Tr key={idx}>
                        <Td fontWeight="medium">{sublimit.name}</Td>
                        <Td isNumeric>{sublimit.amount ? formatNumber(sublimit.amount) : 'N/A'}</Td>
                        <Td isNumeric>{formatNumber(sublimit.submission_value)}</Td>
                        <Td isNumeric>
                          <Badge 
                            bg={bgColor} 
                            color={textColor} 
                            px={2} 
                            py={1} 
                            borderRadius="md"
                          >
                            {formatNumber(sublimit.difference)}
                          </Badge>
                        </Td>
                        <Td isNumeric>
                          <Badge 
                            bg={bgColor} 
                            color={textColor} 
                            px={2} 
                            py={1} 
                            borderRadius="md"
                          >
                            {formatPercentage(sublimit.percentage_difference)}
                          </Badge>
                        </Td>
                      </Tr>
                    );
                  })}
                  
                  {getSortedSublimits().length === 0 && (
                    <Tr>
                      <Td colSpan={5} textAlign="center" py={4}>
                        No sublimits data available for this quote.
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SublimitsView;