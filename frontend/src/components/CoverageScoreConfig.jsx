import React, { useState, useEffect, useMemo } from 'react';
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
  Button,
  useToast,
  Badge,
  Alert,
  AlertIcon,
  Input,
  Flex,
  ButtonGroup,
  CloseButton,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Tooltip,
  useColorModeValue,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import { getAvailableSublimits, calculateCoverageScores } from '../api';
import { Search2Icon } from '@chakra-ui/icons';

// Importance categories and their corresponding weight values
const IMPORTANCE_LEVELS = [
  { value: 0, label: 'Not Important', color: 'gray.500' },
  { value: 1, label: 'Low', color: 'blue.500' },
  { value: 2, label: 'Neutral', color: 'gray.500' },
  { value: 3, label: 'High', color: 'orange.500' },
  { value: 4, label: 'Critical', color: 'red.500' }
];

// Convert importance level to weight
const getImportanceInfo = (importanceLevel) => {
  const level = IMPORTANCE_LEVELS[importanceLevel];
  return {
    label: level.label,
    color: level.color,
    weight: importanceLevel === 0 ? 0.01 : (importanceLevel * 0.06) + 0.02 // weights from 0.01 to 0.26
  };
};

// Default importance mapping for important sublimits
const DEFAULT_IMPORTANCE = {
  "earthquake in high hazard earthquake zones_amount": 4,
  "earthquake outside of high hazard, new madrid, pacific northwest and international high hazard earthquake zones_amount": 4,
  "expediting expenses_amount": 3,
  "electronic data and media_amount": 3,
  "business interruption_amount": 3,
  "flood coverage_amount": 3,
  "brands and labels_amount": 2,
};

// Fallback sublimits if API fails completely
const FALLBACK_SUBLIMITS = [
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

const CoverageScoreConfig = () => {
  const [sublimits, setSublimits] = useState([]);
  const [importance, setImportance] = useState({});
  const [weights, setWeights] = useState({});
  const [scores, setScores] = useState([]);
  const [showScores, setShowScores] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTopWeights, setShowTopWeights] = useState(false);
  const toast = useToast();
  
  // Aon Broker Copilot theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('#f9fafb', 'gray.700');
  const tableHeaderBg = useColorModeValue('#f9fafb', 'gray.700');
  const accentColor = useColorModeValue('#0051a8', 'blue.300'); // Aon blue

  // Get weight from importance level
  const getWeightFromImportance = (importanceLevel) => {
    return getImportanceInfo(importanceLevel).weight;
  };

  // Get top weighted sublimits
  const getTopWeights = () => {
    const weightedSublimits = sublimits.map(sublimit => ({
      ...sublimit,
      importanceLevel: importance[sublimit.id] || 2,
      weight: getWeightFromImportance(importance[sublimit.id] || 2)
    }));
    
    return weightedSublimits
      .sort((a, b) => b.importanceLevel - a.importanceLevel)
      .slice(0, 5);
  };

  // Fetch all available sublimits on component mount
  useEffect(() => {
    const fetchSublimits = async () => {
      setLoading(true);
      try {
        const response = await getAvailableSublimits();
        
        if (response && Array.isArray(response.sublimits) && response.sublimits.length > 0) {
          console.log(`Total sublimit count: ${response.count || response.sublimits.length}`);
          
          // Store the sublimits list
          setSublimits(response.sublimits);
          
          // Initialize all importances to Neutral (2) 
          const initialImportance = {};
          const initialWeights = {};
          
          response.sublimits.forEach(sublimit => {
            // Always set default importance to Neutral (2)
            initialImportance[sublimit.id] = 2;
            // Set corresponding weight
            initialWeights[sublimit.id] = getWeightFromImportance(2);
          });
          
          setImportance(initialImportance);
          setWeights(initialWeights);
        } else {
          console.warn("Invalid or empty sublimits data received, using fallback data");
          setError("Unable to load sublimits from server, using sample data instead");
          
          // Use fallback sublimits if the API fails
          setSublimits(FALLBACK_SUBLIMITS);
          
          // Set fallback importance and weights
          const fallbackImportance = {};
          const fallbackWeights = {};
          
          FALLBACK_SUBLIMITS.forEach(sublimit => {
            fallbackImportance[sublimit.id] = 2; // Default all to Neutral
            fallbackWeights[sublimit.id] = getWeightFromImportance(2);
          });
          
          setImportance(fallbackImportance);
          setWeights(fallbackWeights);
        }
      } catch (error) {
        console.error('Error fetching sublimits:', error);
        setError(`Failed to load sublimits: ${error.message || 'Unknown error'}`);
        
        // Use fallback sublimits if the API fails
        setSublimits(FALLBACK_SUBLIMITS);
        
        // Set fallback importance and weights
        const fallbackImportance = {};
        const fallbackWeights = {};
        
        FALLBACK_SUBLIMITS.forEach(sublimit => {
          fallbackImportance[sublimit.id] = 2; // Default all to Neutral
          fallbackWeights[sublimit.id] = getWeightFromImportance(2);
        });
        
        setImportance(fallbackImportance);
        setWeights(fallbackWeights);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSublimits();
  }, []);

  // Update weight when importance changes
  const handleImportanceChange = (sublimitId, newImportanceLevel) => {
    setImportance(prev => {
      const updated = { ...prev, [sublimitId]: newImportanceLevel };
      
      // Also update the corresponding weight
      setWeights(prevWeights => ({
        ...prevWeights,
        [sublimitId]: getWeightFromImportance(newImportanceLevel)
      }));
      
      return updated;
    });
  };

  // Calculate coverage scores
  const calculateScores = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if we have any important sublimits
      if (Object.keys(weights).length === 0) {
        setError("Please set at least one sublimit as important before calculating scores");
        setLoading(false);
        return;
      }
      
      const data = await calculateCoverageScores(weights);
      if (data.scores && data.scores.length > 0) {
        // Process the scores to properly separate carrier and layer information
        const processedScores = data.scores.map(score => {
          // Extract the quote ID if available
          const quoteId = score.quote_id || "";
          let carrier = score.carrier || "";
          let layer = score.layer || "";
          
          // Check for different patterns that might combine carrier and layer
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
        
        // Make sure scores are properly sorted
        const sortedScores = [...processedScores].sort((a, b) => b.coverage_score - a.coverage_score);
        setScores(sortedScores);
        setShowScores(true);
        setError(null);
      } else {
        setError("No scores were returned. Please check your importance settings and try again.");
      }
    } catch (err) {
      console.error("Failed to calculate coverage scores:", err);
      setError(`Failed to calculate coverage scores: ${err.message || 'Unknown error'}`);
      setScores([]);
      setShowScores(false);
    } finally {
      setLoading(false);
    }
  };

  // Filter sublimits based on search term
  const filteredSublimits = useMemo(() => {
    if (!searchTerm.trim()) return sublimits;
    
    return sublimits.filter(sublimit => 
      sublimit.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sublimits, searchTerm]);

  // Reset all importance values to default Neutral
  const resetImportance = () => {
    // Initialize all to Neutral
    const initialImportance = {};
    const initialWeights = {};
    
    sublimits.forEach(sublimit => {
      // Always reset to Neutral (2)
      initialImportance[sublimit.id] = 2;
      // Set corresponding weight
      initialWeights[sublimit.id] = getWeightFromImportance(2);
    });
    
    setImportance(initialImportance);
    setWeights(initialWeights);
    setError(null);
    setShowScores(false);
    
    toast({
      title: "Importance levels reset",
      description: "All sublimits have been reset to Neutral",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box p={6}>
      <Box mb={6}>
        <Heading size="lg" fontWeight="500" color="#333333" mb={2}>
          Coverage Score Configuration
        </Heading>
        <Text color="gray.600" fontSize="14px">
          Set importance levels for each sublimit to calculate custom coverage scores
        </Text>
      </Box>
      
      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <Text fontWeight="500">{error}</Text>
          </Box>
          <CloseButton position="absolute" right="8px" top="8px" onClick={() => setError(null)} />
        </Alert>
      )}
      
      {/* Sublimits Configuration */}
      <Box 
        mb={6} 
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
                    Configure Importance Levels
                  </Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel p={0}>
              <Box p={5}>
                <Text mb={4} color="gray.600" fontSize="14px">
                  Set importance levels for each sublimit using the buttons below. Coverage scores will be calculated based on how well each quote's sublimits match your desired values.
                </Text>
                
                {/* Search box */}
                <Flex mb={4}>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Search2Icon color="gray.300" />
                    </InputLeftElement>
                    <Input 
                      placeholder="Search sublimits..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      borderColor="gray.300"
                      _hover={{ borderColor: "gray.400" }}
                      _focus={{ borderColor: "#0051A8", boxShadow: "0 0 0 1px #0051A8" }}
                    />
                    <InputRightElement>
                      {searchTerm && (
                        <CloseButton size="sm" onClick={() => setSearchTerm('')} />
                      )}
                    </InputRightElement>
                  </InputGroup>
                </Flex>

                {/* Configuration table */}
                <Box 
                  overflowX="auto" 
                  width="100%" 
                  margin="0" 
                  padding="0" 
                  minWidth="100%" 
                  height="auto" 
                  maxHeight="460px" 
                  overflow="auto" 
                >
                  <Table 
                    variant="simple" 
                    size="md"
                    width="100%" 
                    borderCollapse="collapse"
                    style={{ tableLayout: "fixed", width: "100%" }}
                    margin="0"
                    borderWidth="0"
                  >
                    <Thead position="sticky" top="0" zIndex="1">
                      <Tr borderBottom="1px" borderColor="gray.200" bg="#EEF6F7">
                        <Th width="60%" color="gray.600" fontWeight="500" padding="14px 16px" fontSize="15px">Sublimit</Th>
                        <Th width="40%" color="gray.600" fontWeight="500" padding="14px 16px 14px 0" fontSize="15px" textAlign="right" pr={20}>Importance Level</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredSublimits.length > 0 ? (
                        filteredSublimits.map((sublimit, idx) => {
                          const importanceLevel = importance[sublimit.id] || 2; // Default to Neutral
                          return (
                            <Tr 
                              key={sublimit.id} 
                              _hover={{ bg: "gray.50" }}
                              borderBottom="1px" 
                              borderColor="gray.200"
                              bg={idx % 2 === 0 ? "white" : "#F9FCFC"}
                            >
                              <Td padding="14px 16px" fontWeight="500" fontSize="15px" verticalAlign="middle">
                                <Text noOfLines={1} title={sublimit.name}>
                                  {sublimit.name}
                                </Text>
                              </Td>
                              <Td padding="14px 0" fontSize="15px" textAlign="right" pr={8} verticalAlign="middle">
                                <Flex justify="flex-end">
                                  <ButtonGroup size="sm" variant="outline" spacing={2} isDisabled={loading}>
                                    {IMPORTANCE_LEVELS.map((level) => {
                                      const isSelected = importanceLevel === level.value;
                                      const colorScheme = level.label === 'Not Important' ? 'gray' : 
                                                        level.label === 'Low' ? 'blue' : 
                                                        level.label === 'Neutral' ? 'gray' : 
                                                        level.label === 'High' ? 'orange' : 'red';
                                      return (
                                        <Tooltip key={level.value} label={level.label} placement="top" hasArrow>
                                          <Button
                                            borderRadius="md"
                                            colorScheme={colorScheme}
                                            bg={isSelected ? `${colorScheme}.100` : 'transparent'}
                                            color={'blackAlpha.800'}
                                            borderColor={isSelected ? `${colorScheme}.500` : 'gray.200'}
                                            variant={isSelected ? 'solid' : 'outline'}
                                            onClick={() => handleImportanceChange(sublimit.id, level.value)}
                                            _hover={{ 
                                              bg: `${colorScheme}.50`,
                                              borderColor: `${colorScheme}.400`
                                            }}
                                            opacity={isSelected ? 1 : 0.9}
                                            px={2}
                                            minWidth="36px"
                                            fontSize="13px"
                                            fontWeight={isSelected ? "medium" : "normal"}
                                            boxShadow={isSelected ? "0px 1px 2px rgba(0, 0, 0, 0.04)" : "none"}
                                          >
                                            {level.value}
                                          </Button>
                                        </Tooltip>
                                      );
                                    })}
                                  </ButtonGroup>
                                </Flex>
                              </Td>
                            </Tr>
                          );
                        })
                      ) : (
                        <Tr>
                          <Td colSpan={2} textAlign="center" py={6} color="gray.500">
                            No sublimits match your search. Try adjusting your search criteria.
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Box>
      
      {/* Calculate and Reset Scores buttons - Moved outside the Accordion */}
      <Flex justify="flex-end" gap={4} mb={6}>
        <Button 
          colorScheme="blue" 
          variant="outline" 
          onClick={resetImportance} 
          isDisabled={loading}
        >
          Reset Importance
        </Button>
        <Button 
          colorScheme="blue" 
          onClick={calculateScores} 
          isLoading={loading}
          loadingText="Calculating..."
        >
          Calculate Scores
        </Button>
      </Flex>
      
      {/* Results section */}
      {showScores && scores.length > 0 && (
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
          <Box px={6} py={4} borderBottomWidth="1px" borderBottomColor="#CDDBDE" bg="#F9FCFC">
            <Heading size="md" color="#333333" fontWeight="600" mb={0}>
              Coverage Scores
            </Heading>
          </Box>
          
          <Box overflowX="auto" width="100%" margin="0" padding="0" minWidth="100%" height="auto" maxHeight="460px" overflow="auto">
            <Table 
              variant="simple" 
              size="md"
              width="100%" 
              borderCollapse="collapse"
              style={{ tableLayout: "fixed", width: "100%" }}
              margin="0"
              borderWidth="0"
            >
              <Thead position="sticky" top="0" zIndex="1">
                <Tr borderBottom="1px" borderColor="gray.200" bg="#EEF6F7">
                  <Th width="30%" color="gray.600" fontWeight="500" padding="14px 16px" fontSize="15px">Carrier</Th>
                  <Th width="35%" isNumeric color="gray.600" fontWeight="500" padding="14px 16px" fontSize="15px">Premium</Th>
                  <Th width="35%" isNumeric color="gray.600" fontWeight="500" padding="14px 16px" fontSize="15px">Coverage Score</Th>
                </Tr>
              </Thead>
              <Tbody>
                {scores.map((score, idx) => (
                  <Tr 
                    key={idx} 
                    _hover={{ bg: "gray.50" }}
                    borderBottom="1px" 
                    borderColor="gray.200"
                    bg={idx % 2 === 0 ? "white" : "#F9FCFC"}
                  >
                    <Td padding="14px 16px" fontWeight="500" fontSize="15px" verticalAlign="middle">{score.carrier}</Td>
                    <Td isNumeric padding="14px 16px" fontSize="15px" verticalAlign="middle">${score.premium?.toLocaleString()}</Td>
                    <Td isNumeric padding="14px 16px" fontSize="15px" verticalAlign="middle">
                      <Flex justify="flex-end">
                        <Badge 
                          colorScheme={
                            score.coverage_score >= 90 ? 'green' : 
                            score.coverage_score >= 70 ? 'blue' : 
                            score.coverage_score >= 50 ? 'yellow' : 'red'
                          }
                          borderRadius="md"
                          px={3}
                          py={1}
                          fontWeight="medium"
                          fontSize="14px"
                          textAlign="center"
                          minWidth="60px"
                          boxShadow="0px 1px 2px rgba(0, 0, 0, 0.04)"
                        >
                          {score.coverage_score?.toFixed(1)}%
                        </Badge>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CoverageScoreConfig; 