import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Flex,
  Button,
  Switch,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Checkbox,
  Stack,
  Divider,
  useToast,
  SliderMark,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Tooltip,
  Collapse,
  HStack,
  Heading,
  Icon,
  CheckboxGroup,
  Input,
  InputGroup,
  InputLeftElement,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  useColorModeValue,
} from '@chakra-ui/react';
import { InfoIcon, SearchIcon } from '@chakra-ui/icons';
import { CREDIT_RATING_COLORS } from './QuotesTable';

function Sidebar({ quotes = [], onOptimize, onGenerateOptions, numCandidates, setNumCandidates, generationLoading }) {
  const [loading, setLoading] = useState(false);
  const [totalLayers, setTotalLayers] = useState(0);
  const [parameters, setParameters] = useState({
    premium_weight: 5,
    coverage_weight: 5,
    credit_threshold: 2,
    required_carriers: [],
    diversify: false,
    max_capacity_abs: 2,
    min_capacity_abs: 0,
  });
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [availableLayers, setAvailableLayers] = useState([]);
  const [selectedLayers, setSelectedLayers] = useState([]);
  const [selectedCarriers, setSelectedCarriers] = useState([]);

  // Get unique carriers per layer
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      const uniqueLayers = [...new Set(quotes.map(q => q.Layer))].length;
      setTotalLayers(uniqueLayers);
    }
  }, [quotes]);
  
  // Get unique carriers grouped by layer
  const getCarriersByLayer = () => {
    if (!quotes || !Array.isArray(quotes)) {
      return []; // Return empty array if quotes is undefined or not an array
    }
    
    const layerMap = {};
    quotes.forEach(quote => {
      if (!layerMap[quote.Layer]) {
        layerMap[quote.Layer] = [];
      }
      
      // Check if this carrier is already added to this layer
      const existingCarrier = layerMap[quote.Layer].find(c => c.name === quote.Carrier);
      
      if (!existingCarrier) {
        layerMap[quote.Layer].push({
          name: quote.Carrier,
          creditRating: quote.Credit_Rating,
          creditRatingText: getCreditRatingText(quote)
        });
      }
    });
    return Object.entries(layerMap).sort((a, b) => a[0] - b[0]);
  };

  const handleParamChange = (field, value) => {
    console.log(`Changing ${field} to:`, value);
    setParameters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRequiredCarrierChange = (carrier) => {
    setParameters(prev => {
      const newRequiredCarriers = prev.required_carriers.includes(carrier)
        ? prev.required_carriers.filter(c => c !== carrier)
        : [...prev.required_carriers, carrier];
      
      console.log("Updated required carriers:", newRequiredCarriers);
      
      return {
        ...prev,
        required_carriers: newRequiredCarriers
      };
    });
  };

  const handleRunOptimization = async (generateOptions = false) => {
    setLoading(true);
    try {
      console.log('Optimizing with parameters:', parameters);
      
      const result = await onOptimize(parameters);
      toast({
        title: "Optimization Complete",
        description: `Optimized ${result.solution.length} quotes successfully.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      if (generateOptions) {
        try {
          console.log('Generating options with same parameters');
          const options = await onGenerateOptions(numCandidates, parameters);
          console.log('Generated options:', options.length);
        } catch (err) {
          console.error('Error generating options:', err);
        }
      }
    } catch (error) {
      console.error('Error in optimization:', error);
      toast({
        title: "Optimization Error",
        description: error.message || "Failed to optimize quotes.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Map credit rating numbers to readable text
  const getCreditRatingText = (quote) => {
    if (!quote) return 'N/A'; // Return N/A if quote is undefined
    
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
  
  // Get background color for credit rating - matching the tables
  const getCreditRatingBgColor = (quote) => {
    const rating = quote.CreditRating || quote.CreditRatingValue || quote.Credit_Rating;
    const ratingText = typeof rating === 'string' ? rating : getCreditRatingText(quote);
    
    // Light translucent backgrounds with subtle colors
    if (ratingText === 'AAA') return "#e3f6e3"; // Very light mint
    if (ratingText === 'AA') return "#e8f8e8"; // Light mint green
    if (ratingText === 'A') return "#edfded"; // Pale mint
    if (ratingText.includes('BBB')) return "#e3f0f7"; // Very light blue
    if (ratingText.includes('BB')) return "#e8f0fa"; // Light blue
    if (ratingText.includes('B+')) return "#ecf2fc"; // Pale blue
    if (ratingText.includes('B') && !ratingText.includes('BB') && !ratingText.includes('B+')) return "#f0f2fc"; // Very pale blue
    if (ratingText.includes('B-')) return "#f7f0f0"; // Very pale pink
    return "#f5f5f5"; // Very light gray for unknown ratings
  };
  
  // Get text color for credit rating - matching the tables
  const getCreditRatingTextColor = (quote) => {
    const rating = quote.CreditRating || quote.CreditRatingValue || quote.Credit_Rating;
    const ratingText = typeof rating === 'string' ? rating : getCreditRatingText(quote);
    
    // Darker text colors that pair well with the backgrounds
    if (ratingText === 'AAA') return "#1a661a"; // Dark green
    if (ratingText === 'AA') return "#1f7a1f"; // Medium dark green
    if (ratingText === 'A') return "#267326"; // Medium green
    if (ratingText.includes('BBB')) return "#1a4766"; // Dark blue
    if (ratingText.includes('BB')) return "#1a5c8c"; // Medium dark blue
    if (ratingText.includes('B+')) return "#195e9c"; // Medium blue
    if (ratingText.includes('B') && !ratingText.includes('BB') && !ratingText.includes('B+')) return "#334499"; // Blue-purple
    if (ratingText.includes('B-')) return "#7a1f1f"; // Dark red
    return "#333333"; // Dark gray for unknown ratings
  };

  // Group carriers by layer for better visualization
  const carriersByLayer = getCarriersByLayer() || [];

  // Credit rating threshold text mapping
  const creditRatingText = {
    1: "Any Rating (B and above)",
    2: "Good+ (BB and above)",
    3: "Strong+ (A and above)",
    4: "Very Strong+ (AA and above)",
    5: "Top Tier (AAA only)"
  };

  // For debugging - log carriers and their credit ratings
  console.log("Carriers by layer with credit ratings:", carriersByLayer);

  useEffect(() => {
    // Extract all unique layers from quotes
    if (quotes && quotes.length > 0) {
      const layers = [...new Set(quotes.map(quote => quote.Layer))];
      setAvailableLayers(layers);
      
      // If no layers are selected yet, select all layers by default
      if (!selectedLayers || selectedLayers.length === 0) {
        setSelectedLayers(layers);
      }
    }
  }, [quotes, selectedLayers]);

  // Filter carriers based on search term
  const filteredCarriers = React.useMemo(() => {
    if (!quotes || !Array.isArray(quotes)) return [];
    
    // Get unique carrier names
    const uniqueCarriers = [...new Set(quotes.map(quote => quote.Carrier))];
    
    // Filter by search term if provided
    return searchTerm
      ? uniqueCarriers.filter(carrier => 
          carrier.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : uniqueCarriers;
  }, [quotes, searchTerm]);
  
  // Toggle selection for a carrier
  const toggleCarrier = (carrier) => {
    if (selectedCarriers.includes(carrier)) {
      setSelectedCarriers(selectedCarriers.filter(c => c !== carrier));
    } else {
      setSelectedCarriers([...selectedCarriers, carrier]);
    }
  };
  
  // Toggle all carriers
  const toggleAllCarriers = () => {
    if (selectedCarriers.length === filteredCarriers.length) {
      setSelectedCarriers([]);
    } else {
      setSelectedCarriers([...filteredCarriers]);
    }
  };
  
  // Toggle layer selection
  const toggleLayer = (layer) => {
    if (selectedLayers.includes(layer)) {
      setSelectedLayers(selectedLayers.filter(l => l !== layer));
    } else {
      setSelectedLayers([...selectedLayers, layer]);
    }
  };
  
  // Get credit rating text for a carrier
  const getCreditRatingForCarrier = (carrier) => {
    if (!quotes || quotes.length === 0) return 'N/A';
    
    // Find a quote for this carrier
    const carrierQuote = quotes.find(q => q.Carrier === carrier);
    if (!carrierQuote) return 'N/A';
    
    // Check all possible credit rating field names
    const rating = carrierQuote.CreditRating || carrierQuote.CreditRatingValue || carrierQuote.Credit_Rating;
    
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
  
  // Get credit rating style for a carrier
  const getCreditRatingStyleForCarrier = (carrier) => {
    const ratingText = getCreditRatingForCarrier(carrier);
    
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

  return (
    <Box 
      borderRadius="lg" 
      boxShadow="sm" 
      bg="white" 
      p={6}
      border="1px solid"
      borderColor="gray.200"
    >
      <VStack spacing={6} align="stretch">
        <Heading size="md" color="aon.blue.700" mb={2}>Optimization Parameters</Heading>
        
        <Accordion allowMultiple defaultIndex={[0, 1]}>
          {/* Constraints Section */}
          <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="md" mb={3}>
            <h2>
              <AccordionButton bg="gray.50" _hover={{ bg: "gray.100" }} borderTopRadius="md">
                <Box flex="1" textAlign="left" fontWeight="600">
                  Constraints
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4} pt={4} bg="white">
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel fontSize="sm" color="gray.700" mb={1}>
                    Credit Rating Threshold
                  </FormLabel>
                  <Select
                    value={parameters.credit_threshold}
                    onChange={(e) => handleParamChange('credit_threshold', parseInt(e.target.value))}
                    borderColor="gray.200"
                    _hover={{ borderColor: "gray.300" }}
                    size="md"
                  >
                    <option value={1}>{creditRatingText[1]}</option>
                    <option value={2}>{creditRatingText[2]}</option>
                    <option value={3}>{creditRatingText[3]}</option>
                    <option value={4}>{creditRatingText[4]}</option>
                    <option value={5}>{creditRatingText[5]}</option>
                  </Select>
                </FormControl>
                
                <FormControl mt={4}>
                  <FormLabel fontSize="sm" color="gray.700">Maximum Carrier Capacity</FormLabel>
                  <Tooltip label="Maximum capacity per carrier (in absolute units)">
                    <NumberInput 
                      value={parameters.max_capacity_abs} 
                      onChange={(_, val) => handleParamChange('max_capacity_abs', val)}
                      min={0}
                      max={10}
                      step={0.1}
                    >
                      <NumberInputField borderColor="gray.200" _hover={{ borderColor: "gray.300" }} />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Tooltip>
                </FormControl>
                
                <FormControl mt={4}>
                  <FormLabel fontSize="sm" color="gray.700">Minimum Carrier Capacity</FormLabel>
                  <Tooltip label="Minimum capacity per carrier (in absolute units)">
                    <NumberInput 
                      value={parameters.min_capacity_abs} 
                      onChange={(_, val) => handleParamChange('min_capacity_abs', val)}
                      min={0}
                      max={parameters.max_capacity_abs}
                      step={0.1}
                    >
                      <NumberInputField borderColor="gray.200" _hover={{ borderColor: "gray.300" }} />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Tooltip>
                </FormControl>
                
                <FormControl mt={4}>
                  <Checkbox 
                    isChecked={parameters.diversify} 
                    onChange={(e) => handleParamChange('diversify', e.target.checked)}
                    colorScheme="blue"
                  >
                    <Text fontSize="sm" color="gray.700">Diversify Carriers</Text>
                  </Checkbox>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Encourages selection of different carriers across layers
                  </Text>
                </FormControl>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
          
          {/* Required Carriers Section */}
          <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="md" mb={3}>
            <h2>
              <AccordionButton bg="gray.50" _hover={{ bg: "gray.100" }} borderTopRadius="md">
                <Box flex="1" textAlign="left" fontWeight="600">
                  Required Carriers
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4} pt={4} bg="white" maxH="300px" overflowY="auto">
              <VStack spacing={4} align="stretch">
                {carriersByLayer.map(([layer, carriers]) => (
                  <Box key={layer} p={2} borderWidth="1px" borderRadius="md" borderColor="gray.200">
                    <Badge 
                      colorScheme={layer.includes("Primary") ? "blue" : layer.includes("$10M xs $10M") ? "purple" : "teal"} 
                      variant="solid" 
                      mb={2} 
                      px={2} 
                      py={1} 
                      borderRadius="md"
                      fontSize="xs"
                    >
                      Layer {layer}
                    </Badge>
                    <Box mt={2}>
                      {carriers.map(carrier => (
                        <Flex key={carrier.name} w="100%" justify="space-between" align="center">
                          <Checkbox
                            isChecked={parameters.required_carriers.includes(carrier.name)}
                            onChange={(e) => handleRequiredCarrierChange(carrier.name)}
                            colorScheme="blue"
                            size="sm"
                          >
                            <Text fontSize="sm">{carrier.name}</Text>
                          </Checkbox>
                          <Text 
                            display="inline-block"
                            px={2}
                            py={0.5}
                            fontSize="xs"
                            borderRadius="sm"
                            bg={getCreditRatingBgColor(carrier)}
                            color={getCreditRatingTextColor(carrier)}
                            fontWeight="medium"
                            minWidth="26px"
                            textAlign="center"
                            boxShadow="0 0 0 1px rgba(0,0,0,0.05)"
                            ml={1}
                          >
                            {carrier.creditRatingText || "N/A"}
                          </Text>
                        </Flex>
                      ))}
                    </Box>
                  </Box>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
          
          {/* Generate Options Section */}
          <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="md">
            <h2>
              <AccordionButton bg="gray.50" _hover={{ bg: "gray.100" }} borderTopRadius="md">
                <Box flex="1" textAlign="left" fontWeight="600">
                  Generate Options
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4} pt={4} bg="white">
              <FormControl>
                <FormLabel fontSize="sm" color="gray.700">Number of Candidates</FormLabel>
                <Tooltip label="Number of placement options to generate">
                  <NumberInput 
                    value={numCandidates} 
                    onChange={(_, val) => setNumCandidates(val)}
                    min={1}
                    max={1000}
                  >
                    <NumberInputField borderColor="gray.200" _hover={{ borderColor: "gray.300" }} />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </Tooltip>
              </FormControl>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        
        <Button
          colorScheme="blue"
          size="lg"
          isLoading={loading || generationLoading}
          loadingText="Processing..."
          onClick={() => handleRunOptimization(true)}
          bg="aon.blue.700"
          _hover={{ bg: "aon.blue.800" }}
          boxShadow="sm"
        >
          Optimize & Generate Options
        </Button>
        
        <Text fontSize="xs" color="gray.500" textAlign="center">
          All parameters will be applied to both optimization and option generation.
        </Text>
      </VStack>
    </Box>
  );
}

export default Sidebar; 