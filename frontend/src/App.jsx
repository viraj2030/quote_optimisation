import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  Heading,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Spacer,
  extendTheme,
  Avatar,
  Badge,
  Switch,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Divider,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  useColorModeValue,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SimpleGrid,
  Icon,
} from '@chakra-ui/react';
import { SearchIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import QuotesTable from './components/QuotesTable';
import GenerateOptions from './components/GenerateOptions';
import OptionDetailView from './components/OptionDetailView';
import SublimitsView from './components/SublimitsView';
import { fetchQuotes, optimizeQuotes, generateOptions, checkApiHealth } from './api';
import QuotesSubmissionComparison from './components/QuotesSubmissionComparison';
import MarketInsightsExecutiveSummary from './components/MarketInsightsExecutiveSummary';
import CoverageScoreConfig from './components/CoverageScoreConfig';
import BindOptionView from './components/BindOptionView';
import ServiceView from './components/ServiceView';
import { FaBalanceScale } from 'react-icons/fa';
import { FiUsers, FiDollarSign, FiShield, FiLayers } from 'react-icons/fi';

// Custom theme to match Aon Broker Copilot platform
const theme = extendTheme({
  fonts: {
    heading: "'Helvetica Neue', Arial, sans-serif",
    body: "'Helvetica Neue', Arial, sans-serif",
  },
  colors: {
    aon: {
      blue: {
        50: '#e6f0ff',
        100: '#b3d1ff',
        500: '#0051a8',
        600: '#004793',
        700: '#002255',  // Darker blue from screenshots
        800: '#001c45',
        900: '#001a40',
      },
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
      },
      teal: {
        100: '#E6F6F5',
        400: '#4ED8CF',
        500: '#00B2A9',  // Teal color for status badges
      },
      yellow: {
        100: '#fffaeb',
        500: '#f8d47e',
      },
      background: '#F9FCFC', // Light background from screenshots
    }
  },
  styles: {
    global: {
      body: {
        bg: '#F9FCFC',  // Light background from screenshots
        color: '#333333', // Dark text color for better readability
      },
    },
  },
  components: {
    Heading: {
      baseStyle: {
        fontWeight: '500',
        color: '#333333',
      }
    },
    Badge: {
      variants: {
        solid: {
          bg: 'aon.teal.500',
          color: 'white',
        },
        outline: {
          color: 'aon.teal.500',
          borderColor: 'aon.teal.500',
        },
        subtle: {
          bg: 'aon.teal.100',
          color: 'aon.teal.500',
        }
      }
    },
    Button: {
      variants: {
        solid: {
          bg: 'aon.blue.700',
          color: 'white',
          fontWeight: '400',
          borderRadius: 'md',
          _hover: {
            bg: 'aon.blue.800',
          }
        },
        outline: {
          borderColor: 'aon.blue.700',
          color: 'aon.blue.700',
          _hover: {
            bg: 'aon.blue.50',
          }
        }
      }
    },
    Table: {
      variants: {
        simple: {
          th: {
            fontWeight: '500',
            textTransform: 'none',
            letterSpacing: 'normal',
            color: '#555555',
            borderColor: 'gray.200',
            padding: '14px 16px', // Increased vertical padding
          },
          td: {
            borderColor: 'gray.200',
            padding: '12px 16px', // Increased vertical padding
            color: '#333333',
          }
        }
      }
    },
    Tabs: {
      variants: {
        enclosed: {
          tab: {
            fontWeight: '500',
            _selected: { 
              color: 'aon.blue.700',
              borderColor: 'aon.blue.500',
              borderBottomColor: 'white',
            }
          }
        },
        'soft-rounded': {
          tab: {
            fontWeight: '400',
            _selected: {
              color: 'white',
              bg: 'aon.blue.700',
            }
          }
        }
      }
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            _focus: {
              borderColor: 'aon.blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-aon-blue-500)',
            }
          }
        }
      }
    },
    Box: {
      baseStyle: {
        borderRadius: 'md',
      }
    },
    Text: {
      baseStyle: {
        color: '#333333',
      }
    }
  },
});

// ConfigureCriteria component - This was previously in the Sidebar
const ConfigureCriteria = ({ quotes, onOptimize, onGenerateOptions, numCandidates, setNumCandidates, generationLoading }) => {
  const [loading, setLoading] = useState(false);
  const [parameters, setParameters] = useState({
    premium_weight: 5,
    coverage_weight: 5,
    credit_threshold: 2,
    required_carriers: [],
    diversify: false,
    max_capacity_abs: 2,
    min_capacity_abs: 0,
    use_hierarchical: true,
    diversification_factor: 0.5,
  });
  const [showRequiredCarriers, setShowRequiredCarriers] = useState(false);
  const toast = useToast();
  
  // Credit rating threshold text mapping
  const creditRatingText = {
    1: "Any Rating (B and above)",
    2: "Good+ (BB and above)",
    3: "Strong+ (A and above)",
    4: "Very Strong+ (AA and above)",
    5: "Top Tier (AAA only)"
  };
  
  // Get carriers by layer for the table view
  const getCarriersByLayer = () => {
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
          creditRatingText: getCreditRatingText(quote),
          premium: quote.Premium,
          capacity: quote.Capacity
        });
      }
    });
    
    // Sort layers in the specific order requested: "Primary 10", "10 xs 10", "10 xs 20"
    const orderedEntries = Object.entries(layerMap).sort((a, b) => {
      const layerOrder = {
        "Primary 10": 1,
        "10M xs 10M": 2,
        "10M xs 20M": 3
      };
      
      // Get the order for each layer, defaulting to a high number if not in the predefined order
      const orderA = layerOrder[a[0]] || 999;
      const orderB = layerOrder[b[0]] || 999;
      
      return orderA - orderB;
    });
    
    return orderedEntries;
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
  
  const handleRunOptimization = async () => {
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
      
      try {
        console.log('Generating options with same parameters');
        const options = await onGenerateOptions(numCandidates, parameters);
        console.log('Generated options:', options.length);
      } catch (err) {
        console.error('Error generating options:', err);
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
  
  // Group carriers by layer for better visualization
  const carriersByLayer = getCarriersByLayer();
  
  return (
    <Box p={6} maxWidth="100%" overflowX="auto">
      <Heading size="lg" mb={6} color="aon.blue.700">Optimization Parameters</Heading>
      
      <VStack spacing={8} align="stretch">
        {/* Required Carriers Section */}
        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Heading size="md" color="gray.700">Required Carriers</Heading>
            <Badge colorScheme="green" p={1} borderRadius="md">MULTIPLE SELECTION</Badge>
          </Flex>
          <Text color="gray.500" mb={4}>Select specific carriers to include in your optimization</Text>
          
          <Flex justify="space-between" align="center" mb={6}>
            <Text fontWeight="medium">Use Required Carriers</Text>
            <Switch 
              colorScheme="blue" 
              size="lg"
              isChecked={showRequiredCarriers}
              onChange={(e) => {
                setShowRequiredCarriers(e.target.checked);
                if (!e.target.checked) {
                  handleParamChange('required_carriers', []);
                }
              }}
            />
          </Flex>
          
          {showRequiredCarriers && (
            <>
              <Text mb={4}>Select carriers for each layer by clicking on the layer name:</Text>
              
              {carriersByLayer.map(([layer, carriers]) => (
                <Accordion key={layer} allowToggle mb={4}>
                  <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="lg" overflow="hidden">
                    <h2>
                      <AccordionButton bg="gray.50" _hover={{ bg: "gray.100" }}>
                        <Box flex="1" textAlign="left" fontWeight="semibold">
                          {layer}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel p={0}>
                      <Box overflowX="auto">
                        <Table variant="simple" size="sm">
                          <Thead bg="gray.50">
                            <Tr>
                              <Th width="60px">Select</Th>
                              <Th>Carrier</Th>
                              <Th>Rating</Th>
                              <Th isNumeric>Premium</Th>
                              <Th isNumeric>Capacity</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {carriers.map((carrier) => (
                              <Tr key={carrier.name}>
                                <Td>
                                  <Checkbox 
                                    colorScheme="blue"
                                    isChecked={parameters.required_carriers.includes(carrier.name)}
                                    onChange={() => handleRequiredCarrierChange(carrier.name)}
                                  />
                                </Td>
                                <Td>{carrier.name}</Td>
                                <Td>
                                  <Badge 
                                    colorScheme={
                                      carrier.creditRatingText.startsWith('A') ? "green" : 
                                      carrier.creditRatingText.startsWith('B') ? "yellow" : "gray"
                                    }
                                    variant="subtle"
                                    px={2}
                                    py={0.5}
                                  >
                                    {carrier.creditRatingText}
                                  </Badge>
                                </Td>
                                <Td isNumeric>${carrier.premium?.toLocaleString()}</Td>
                                <Td isNumeric>${carrier.capacity?.toLocaleString()}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              ))}
            </>
          )}
        </Box>
        
        <Divider />
        
        {/* Optimization Approach */}
        <Box>
          <Heading size="md" color="gray.700" mb={2}>Optimization Approach</Heading>
          <Text color="gray.500" mb={4}>Select the optimization algorithm to use</Text>
          
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="medium">Use Enhanced Hierarchical Optimization</Text>
            <Switch 
              colorScheme="blue" 
              size="lg"
              isChecked={parameters.use_hierarchical}
              onChange={(e) => handleParamChange('use_hierarchical', e.target.checked)}
            />
          </Flex>
          
          {parameters.use_hierarchical && (
            <Text fontSize="sm" color="gray.600" mb={4}>
              The enhanced optimization algorithm provides improved handling of constraints and more 
              balanced capacity allocation across carriers.
            </Text>
          )}
        </Box>
        
        <Divider />
        
        {/* Diversify Capacity Section */}
        <Box>
          <Heading size="md" color="gray.700" mb={2}>Diversify Capacity</Heading>
          <Text color="gray.500" mb={4}>Control how carrier capacity is allocated across layers</Text>
          
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="medium">Enable Capacity Diversification</Text>
            <Switch 
              colorScheme="blue" 
              size="lg"
              isChecked={parameters.diversify}
              onChange={(e) => handleParamChange('diversify', e.target.checked)}
            />
          </Flex>
          
          {parameters.diversify && (
            <VStack mt={4} spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">Maximum Carrier Capacity</FormLabel>
                <NumberInput 
                  value={parameters.max_capacity_abs}
                  onChange={(_, val) => handleParamChange('max_capacity_abs', val)}
                  min={parameters.min_capacity_abs}
                  max={10}
                  step={0.1}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              
              <FormControl>
                <FormLabel fontSize="sm">Minimum Carrier Capacity</FormLabel>
                <NumberInput 
                  value={parameters.min_capacity_abs}
                  onChange={(_, val) => handleParamChange('min_capacity_abs', val)}
                  min={0}
                  max={parameters.max_capacity_abs}
                  step={0.1}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              
              {parameters.use_hierarchical && (
                <FormControl>
                  <FormLabel fontSize="sm">Diversification Intensity</FormLabel>
                  <Flex>
                    <Text fontSize="xs" width="60px">Low</Text>
                    <Slider
                      flex="1"
                      colorScheme="blue"
                      value={parameters.diversification_factor * 100}
                      min={10}
                      max={90}
                      step={10}
                      onChange={(val) => handleParamChange('diversification_factor', val/100)}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb boxSize={6}>
                        <Box color="blue.500" as={FaBalanceScale} />
                      </SliderThumb>
                    </Slider>
                    <Text fontSize="xs" width="60px" textAlign="right">High</Text>
                  </Flex>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Higher values (→) encourage more even distribution of capacity across carriers
                  </Text>
                </FormControl>
              )}
            </VStack>
          )}
        </Box>
        
        <Divider />
        
        {/* Minimum Security Section (renamed from Credit Rating Threshold) */}
        <Box>
          <Heading size="md" color="gray.700" mb={2}>Minimum Security</Heading>
          <Text color="gray.500" mb={4}>Minimum acceptable credit rating for carriers</Text>
          <Select
            value={parameters.credit_threshold}
            onChange={(e) => handleParamChange('credit_threshold', parseInt(e.target.value))}
            size="md"
            maxW="400px"
          >
            <option value={1}>{creditRatingText[1]}</option>
            <option value={2}>{creditRatingText[2]}</option>
            <option value={3}>{creditRatingText[3]}</option>
            <option value={4}>{creditRatingText[4]}</option>
            <option value={5}>{creditRatingText[5]}</option>
          </Select>
        </Box>
        
        <Divider />
        
        {/* Number of Options Section */}
        <Box>
          <Heading size="md" color="gray.700" mb={2}>Number of Options to Generate</Heading>
          <Text color="gray.500" mb={4}>Controls how many different optimization options to generate (5-200)</Text>
          <NumberInput 
            value={numCandidates}
            onChange={(_, val) => setNumCandidates(val)}
            min={5}
            max={200}
            maxW="400px"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </Box>
        
        <Button
          size="lg"
          colorScheme="blue"
          isLoading={loading || generationLoading}
          loadingText="Processing..."
          onClick={handleRunOptimization}
          w="100%"
          mt={6}
        >
          Generate Optimization Options
        </Button>
      </VStack>
    </Box>
  );
};

// API Status Check component
const ApiStatusCheck = () => {
  const [apiError, setApiError] = useState(false);
  
  useEffect(() => {
    const checkApi = async () => {
      try {
        const isHealthy = await checkApiHealth();
        if (!isHealthy) {
          setApiError(true);
        }
      } catch (error) {
        console.error('API check failed:', error);
        setApiError(true);
      }
    };
    
    checkApi();
    
    // Check API health every 30 seconds
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);
  
  if (!apiError) return null;
  
  return (
    <Alert status="error" mb={4}>
      <AlertIcon />
      <AlertTitle>API Connection Error</AlertTitle>
      <AlertDescription>
        Unable to connect to the server. Some features may not work correctly.
      </AlertDescription>
      <CloseButton position="absolute" right="8px" top="8px" onClick={() => setApiError(false)} />
    </Alert>
  );
};

// Main App component wrapper that handles URL parameters
function AppContent() {
  const [quotes, setQuotes] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [optimizedQuotes, setOptimizedQuotes] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [boundOption, setBoundOption] = useState(null);
  const [optimizationParams, setOptimizationParams] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedOptions, setGeneratedOptions] = useState([]);
  const [optionsParams, setOptionsParams] = useState({
    minPremium: 0,
    maxPremium: 0,
    premiumRange: [0, 0],
    coverageRange: [0, 100],
    numCandidates: 5,
    filteredOptions: []
  });
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle tab change
  const handleTabChange = (index) => {
    setTabIndex(index);
    // Update URL without reloading the page
    navigate(`/?tab=${index}`, { replace: true });
  };

  // Parse URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const quoteIdParam = params.get('quoteId');
    
    // Set tab index if present in URL
    if (tabParam !== null) {
      const index = parseInt(tabParam);
      if (!isNaN(index) && index >= 0 && index <= 8) {
        setTabIndex(index);
      }
    }
    
    // Handle the quoteId parameter for SublimitsView
    if (quoteIdParam) {
      localStorage.setItem('selectedQuoteId', quoteIdParam);
    }
  }, [location]);

  // Clean up localStorage when component unmounts
  useEffect(() => {
    return () => {
      localStorage.removeItem('selectedQuoteId');
    };
  }, []);

  useEffect(() => {
    loadQuotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuotes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchQuotes();
      setQuotes(data);
    } catch (err) {
      setError('Failed to load quotes. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load quotes. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = async (params) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await optimizeQuotes(params);
      
      // Set the optimized quotes from the solution property
      setOptimizedQuotes(result.solution);
      setOptimizationParams(params);
      
      // Display success message
      toast({
        title: 'Optimization Complete',
        description: `Optimized ${result.solution.length} quotes successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Return the result with summary data for other components
      return result;
    } catch (err) {
      setError('Failed to optimize quotes: ' + (err.message || 'Unknown error'));
      toast({
        title: 'Error',
        description: err.message || 'Failed to optimize quotes. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw err; // Re-throw to let Sidebar handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (option) => {
    setSelectedOption(option);
  };

  const handleGenerateOptions = async (numCandidates, optParams = null) => {
    setIsGeneratingOptions(true);
    try {
      // Use the passed parameters if available, otherwise fall back to state
      const paramsToUse = optParams || optimizationParams;
      
      // Make sure to explicitly pass all parameters to ensure they're included
      const result = await generateOptions({
        premium_weight: paramsToUse.premium_weight,
        coverage_weight: paramsToUse.coverage_weight,
        credit_threshold: paramsToUse.credit_threshold,
        required_carriers: paramsToUse.required_carriers,
        diversify: paramsToUse.diversify,
        max_capacity_abs: paramsToUse.max_capacity_abs,
        min_capacity_abs: paramsToUse.min_capacity_abs,
        num_candidates: numCandidates || optionsParams.numCandidates,
      });
      
      const minPrem = result.min_premium;
      const maxPrem = result.max_premium;
      
      const options = result.options.map(option => ({
        ...option,
        id: option.option_id,
        total_premium: option['Achieved Premium'],
        avg_coverage: option['Achieved Average Coverage'] * 100, // Convert to percentage
      }));
      
      // Find min/max coverage
      let minCoverage = 0;
      let maxCoverage = 100;
      if (options.length > 0) {
        minCoverage = Math.min(...options.map(o => o.avg_coverage));
        maxCoverage = Math.max(...options.map(o => o.avg_coverage));
      }
      
      setGeneratedOptions(options);
      setOptionsParams({
        ...optionsParams,
        minPremium: minPrem,
        maxPremium: maxPrem,
        premiumRange: [minPrem, maxPrem],
        coverageRange: [minCoverage, maxCoverage],
        numCandidates: numCandidates || optionsParams.numCandidates,
        filteredOptions: options
      });
      
      toast({
        title: 'Options Generated',
        description: `Generated ${options.length} options`,
        status: 'success',
        duration: 3000,
      });
      
      return options;
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate options',
        status: 'error',
        duration: 5000,
      });
      return [];
    } finally {
      setIsGeneratingOptions(false);
    }
  };

  const handleFilterOptions = (premiumRange, coverageRange, numCandidates) => {
    const filtered = generatedOptions.filter(option => 
      option.total_premium >= premiumRange[0] && 
      option.total_premium <= premiumRange[1] &&
      option.avg_coverage >= coverageRange[0] &&
      option.avg_coverage <= coverageRange[1]
    );
    
    setOptionsParams({
      ...optionsParams,
      premiumRange,
      coverageRange,
      numCandidates: numCandidates || optionsParams.numCandidates,
      filteredOptions: filtered
    });
    
    return filtered;
  };

  // Function to handle number of candidates change
  const handleNumCandidatesChange = (value) => {
    setOptionsParams({
      ...optionsParams,
      numCandidates: value
    });
  };

  // Function to handle binding an option
  const handleBindOption = (option) => {
    setBoundOption(option);
    toast({
      title: "Placement Bound",
      description: "Your placement has been successfully bound.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box minH="100vh" bg="#F9FCFC">
      {/* Aon Header Bar */}
      <Box 
        borderBottom="1px" 
        borderColor="gray.200" 
        py={2} 
        px={6}
        boxShadow="0 1px 3px rgba(0, 0, 0, 0.08)"
        position="sticky"
        top="0"
        bg="white"
        zIndex="1000"
      >
        <Flex alignItems="center" h="48px">
          <Heading size="md" fontSize="18px" fontWeight="500" color="aon.blue.700">Aon Broker Copilot</Heading>
          <Spacer />
          <Flex alignItems="center" gap={6}>
            <InputGroup maxW="280px" size="sm">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input 
                placeholder="Search" 
                borderRadius="md" 
                borderColor="gray.300"
                _focus={{ borderColor: 'aon.blue.500' }}
              />
            </InputGroup>
            <Flex alignItems="center" gap={3}>
              <Text color="gray.600" fontWeight="500" fontSize="sm">Viraj</Text>
              <Avatar size="sm" name="Viraj" bg="aon.blue.700" color="white" />
            </Flex>
          </Flex>
        </Flex>
      </Box>
      
      <Box maxW="1600px" mx="auto" py={6} px={6}>
        <ApiStatusCheck />
        
        {/* Add visual sidebar with dashboard UI */}
        <Flex>
          {/* Visual sidebar - white box with plus icon */}
          <Box 
            w="45px" 
            bg="white" 
            minH="calc(100vh - 56px)"
            h="calc(100vh - 56px)"
            position="fixed"
            left="0"
            top="56px"
            zIndex="10"
            boxShadow="1px 0 3px rgba(0,0,0,0.1)"
            display="flex"
            flexDirection="column"
            alignItems="center"
          >
            <Flex 
              justify="center" 
              align="center" 
              h="45px" 
              w="45px" 
              color="teal.500"
              fontSize="24px"
              fontWeight="light"
            >
              +
            </Flex>
          </Box>
        
          {/* Original content - pushed to the right to make room for sidebar */}
          <Box ml="45px" w="calc(100% - 45px)">
            <Tabs 
              variant="line" 
              colorScheme="blue" 
              size="md"
              index={tabIndex}
              onChange={handleTabChange}
            >
              <Box mb={6}>
                <TabList mb={0} gap={2} display="flex">
                  <Tab _selected={{ color: "#003C55", fontWeight: "600", borderColor: "#003C55", borderBottom: "3px solid" }} fontSize="14px">MARKET SHEET</Tab>
                  <Tab _selected={{ color: "#003C55", fontWeight: "600", borderColor: "#003C55", borderBottom: "3px solid" }} fontSize="14px">SERVICE</Tab>
                  <Tab style={{ display: 'none' }} fontSize="14px">VIEW COVERAGE OFFERED</Tab>
                  <Tab style={{ display: 'none' }} fontSize="14px">MARKET INSIGHTS</Tab>
                  <Tab style={{ display: 'none' }} fontSize="14px">COVERAGE BENCHMARK</Tab>
                  <Tab style={{ display: 'none' }} fontSize="14px">COVERAGE SCORE</Tab>
                  <Tab style={{ display: 'none' }} fontSize="14px">OPTIMIZE PLACEMENT</Tab>
                </TabList>
              </Box>
              
              <Box mb={8}>
                <Heading size="lg" fontWeight="500" fontSize="24px" mb={1} color="#333333">
                  {tabIndex === 0 ? "Market Sheet" : 
                   tabIndex === 1 ? "Service" : 
                   tabIndex === 2 ? "View Coverage Offered" : 
                   tabIndex === 3 ? "Market Insights" : 
                   tabIndex === 4 ? "Coverage Benchmark" : 
                   tabIndex === 5 ? "Coverage Score" : 
                   "Optimize Placement"}
                </Heading>
                <Text color="gray.600" fontSize="14px">
                  {tabIndex === 0 ? "Explore and compare quotes, analyze market perception, and optimize coverage" : 
                   tabIndex === 1 ? "Review bound placement and generate client deliverables" : 
                   tabIndex === 2 ? "View detailed coverage information for the selected quote" : 
                   tabIndex === 3 ? "Review market insights and performance analysis" : 
                   tabIndex === 4 ? "Compare quotes to submission requirements" : 
                   tabIndex === 5 ? "Analyze coverage scores across carriers" : 
                   "Configure, generate, and select optimal program options"}
                </Text>
              </Box>
              
              {/* KPI Cards - moved from QuotesTable */}
              {tabIndex === 0 && !isLoading && quotes.length > 0 && (
                <Box p={5} borderRadius="lg" overflow="hidden" bg="#EEF6F7" boxShadow="none" mb={4}>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Flex align="center" flex="1">
                      <Box color="blue.500" mr={3}>
                        <Icon as={FiUsers} fontSize="2xl" />
                      </Box>
                      <Box>
                        <Text fontSize="2xl" fontWeight="bold">{quotes.length}</Text>
                        <Text color="gray.500">Total Carriers</Text>
                        <Text fontSize="xs" color="gray.400">Available for optimization</Text>
                      </Box>
                    </Flex>
                    
                    <Divider orientation="vertical" height="60px" mx={4} borderColor="gray.300" />
                    
                    <Flex align="center" flex="1">
                      <Box color="green.500" mr={3}>
                        <Icon as={FiDollarSign} fontSize="2xl" />
                      </Box>
                      <Box>
                        <Text fontSize="2xl" fontWeight="bold">
                          ${quotes.reduce((sum, q) => sum + (q.premium || q.Premium || 0), 0).toLocaleString()}
                        </Text>
                        <Text color="gray.500">Total Premium</Text>
                        <Text fontSize="xs" color="gray.400">Across all quotes</Text>
                      </Box>
                    </Flex>
                    
                    <Divider orientation="vertical" height="60px" mx={4} borderColor="gray.300" />
                    
                    <Flex align="center" flex="1">
                      <Box color="blue.400" mr={3}>
                        <Icon as={FiShield} fontSize="2xl" />
                      </Box>
                      <Box>
                        <Text fontSize="2xl" fontWeight="bold">80%</Text>
                        <Text color="gray.500">Average Coverage</Text>
                        <Text fontSize="xs" color="gray.400">Quality score</Text>
                      </Box>
                    </Flex>
                    
                    <Divider orientation="vertical" height="60px" mx={4} borderColor="gray.300" />
                    
                    <Flex align="center" flex="1">
                      <Box color="purple.500" mr={3}>
                        <Icon as={FiLayers} fontSize="2xl" />
                      </Box>
                      <Box>
                        <Text fontSize="2xl" fontWeight="bold">$100.54</Text>
                        <Text color="gray.500">Total Capacity</Text>
                        <Text fontSize="xs" color="gray.400">Available coverage</Text>
                      </Box>
                    </Flex>
                  </Flex>
                </Box>
              )}
              
              <Box bg="white" borderRadius="md" boxShadow="sm" overflow="hidden" border="1px" borderColor="#CDDBDE">
                <TabPanels>
                  <TabPanel p={0}>
                    <Box p={4} mb={6} borderRadius="md" overflow="hidden" bg="white" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                      <QuotesTable quotes={quotes} isLoading={isLoading} error={error} />
                    </Box>
                  </TabPanel>
                  <TabPanel p={0}>
                    <ServiceView />
                  </TabPanel>
                  <TabPanel p={0} pt={4}>
                    <Box borderRadius="md" overflow="hidden" bg="white" p={4}>
                      <Button 
                        leftIcon={<ArrowBackIcon />} 
                        mb={4} 
                        size="sm" 
                        colorScheme="blue" 
                        variant="outline"
                        onClick={() => {
                          setTabIndex(0);
                          navigate('/?tab=0', { replace: true });
                        }}
                      >
                        Back to Market Sheet
                      </Button>
                      <SublimitsView 
                        embedded={true}
                        initialQuoteId={localStorage.getItem('selectedQuoteId')}
                      />
                    </Box>
                  </TabPanel>
                  <TabPanel p={0} pt={4}>
                    <Box borderRadius="md" overflow="hidden" bg="white" p={4}>
                      <MarketInsightsExecutiveSummary />
                    </Box>
                  </TabPanel>
                  <TabPanel p={0} pt={4}>
                    <Box borderRadius="md" overflow="hidden" bg="white" p={4}>
                      <QuotesSubmissionComparison />
                    </Box>
                  </TabPanel>
                  <TabPanel p={0} pt={4}>
                    <Box borderRadius="md" overflow="hidden" bg="white" p={4}>
                      <CoverageScoreConfig />
                    </Box>
                  </TabPanel>
                  <TabPanel p={0} pt={4}>
                    <Box borderRadius="md" overflow="hidden" bg="white" p={4}>
                      <Button 
                        leftIcon={<ArrowBackIcon />} 
                        mb={4} 
                        size="sm" 
                        colorScheme="blue" 
                        variant="outline"
                        onClick={() => {
                          setTabIndex(0);
                          navigate('/?tab=0', { replace: true });
                        }}
                      >
                        Back to Market Sheet
                      </Button>
                      
                      {/* Optimization workflow tabs */}
                      <Tabs variant="line" colorScheme="blue" defaultIndex={0}>
                        <TabList mb={4}>
                          <Tab fontWeight="500" _selected={{ color: "#003C55", fontWeight: "600", borderColor: "#003C55", borderBottom: "3px solid" }} fontSize="14px">CONFIGURE CRITERIA</Tab>
                          <Tab fontWeight="500" _selected={{ color: "#003C55", fontWeight: "600", borderColor: "#003C55", borderBottom: "3px solid" }} fontSize="14px">GENERATE OPTIONS</Tab>
                          <Tab fontWeight="500" _selected={{ color: "#003C55", fontWeight: "600", borderColor: "#003C55", borderBottom: "3px solid" }} fontSize="14px">REVIEW SELECTED OPTION</Tab>
                          <Tab fontWeight="500" _selected={{ color: "#003C55", fontWeight: "600", borderColor: "#003C55", borderBottom: "3px solid" }} fontSize="14px">BIND OPTION</Tab>
                        </TabList>
                        
                        <TabPanels>
                          <TabPanel p={0} pt={2}>
                            <ConfigureCriteria 
                              quotes={quotes}
                              onOptimize={handleOptimize}
                              onGenerateOptions={handleGenerateOptions}
                              numCandidates={optionsParams.numCandidates}
                              setNumCandidates={handleNumCandidatesChange}
                              generationLoading={isGeneratingOptions}
                            />
                          </TabPanel>
                          <TabPanel p={0} pt={2}>
                            <GenerateOptions 
                              options={generatedOptions}
                              optionsParams={optionsParams}
                              onFilterOptions={handleFilterOptions}
                              onSelectOption={handleSelectOption}
                              onGenerateOptions={handleGenerateOptions}
                              isLoading={isGeneratingOptions}
                            />
                          </TabPanel>
                          <TabPanel p={0} pt={2}>
                            {selectedOption ? (
                              <OptionDetailView option={selectedOption} />
                            ) : (
                              <Box textAlign="center" py={10}>
                                <Heading size="md" color="gray.500">No option selected</Heading>
                                <Text mt={2} color="gray.400">
                                  Select an option from the "Generate Options" tab to view details
                                </Text>
                              </Box>
                            )}
                          </TabPanel>
                          <TabPanel p={0} pt={2}>
                            {selectedOption ? (
                              <BindOptionView option={selectedOption} onBind={() => handleBindOption(selectedOption)} />
                            ) : (
                              <Box textAlign="center" py={10}>
                                <Heading size="md" color="gray.500">No option selected</Heading>
                                <Text mt={2} color="gray.400">
                                  Select an option from the "Generate Options" tab to bind
                                </Text>
                              </Box>
                            )}
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </Box>
                  </TabPanel>
                  <TabPanel p={0} pt={4}>
                    <Box borderRadius="md" overflow="hidden" bg="white" p={4}>
                      <ConfigureCriteria 
                        quotes={quotes}
                        onOptimize={handleOptimize}
                        onGenerateOptions={handleGenerateOptions}
                        numCandidates={optionsParams.numCandidates}
                        setNumCandidates={handleNumCandidatesChange}
                        generationLoading={isGeneratingOptions}
                      />
                    </Box>
                  </TabPanel>
                  <TabPanel p={0} pt={4}>
                    <Box borderRadius="md" overflow="hidden" bg="white" p={4}>
                      <GenerateOptions 
                        options={generatedOptions}
                        optionsParams={optionsParams}
                        onFilterOptions={handleFilterOptions}
                        onSelectOption={handleSelectOption}
                        onGenerateOptions={handleGenerateOptions}
                        isLoading={isGeneratingOptions}
                      />
                    </Box>
                  </TabPanel>
                  <TabPanel p={0} pt={4}>
                    <Box borderRadius="md" overflow="hidden" bg="white" p={4}>
                      {selectedOption ? (
                        <OptionDetailView option={selectedOption} />
                      ) : (
                        <Box textAlign="center" py={10}>
                          <Heading size="md" color="gray.500">No option selected</Heading>
                          <Text mt={2} color="gray.400">
                            Select an option from the "Generate Options" tab to view details
                          </Text>
                        </Box>
                      )}
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Box>

              {/* Add Coverage Analysis section below quotes table */}
              {tabIndex === 0 && (
                <Box mt={8}>
                  <Box mb={3}>
                    <Heading size="lg" fontWeight="500" fontSize="24px" mb={1} color="#333333">Coverage Analysis</Heading>
                    <Text color="gray.600" fontSize="14px">Detailed analysis of coverage options and market comparison</Text>
                  </Box>
                  
                  {/* Coverage analysis tabs */}
                  <Tabs variant="line" colorScheme="blue">
                    <TabList borderBottom="2px solid" borderColor="gray.200" mb={8}>
                      <Tab fontWeight="500" _selected={{ color: "#003C55", fontWeight: "600", borderBottom: "3px solid #003C55" }} fontSize="14px">COVER SCORE</Tab>
                      <Tab fontWeight="500" _selected={{ color: "#003C55", fontWeight: "600", borderBottom: "3px solid #003C55" }} fontSize="14px">SUMMARY</Tab>
                      <Tab fontWeight="500" _selected={{ color: "#003C55", fontWeight: "600", borderBottom: "3px solid #003C55" }} fontSize="14px">BENCHMARK</Tab>
                      {/* Hidden tabs - keeping TabPanels but hiding the tabs */}
                      <Tab style={{ display: 'none' }}>CONFIGURE CRITERIA</Tab>
                      <Tab style={{ display: 'none' }}>GENERATE OPTIONS</Tab>
                      <Tab style={{ display: 'none' }}>REVIEW SELECTED OPTION</Tab>
                      <Tab style={{ display: 'none' }}>BIND OPTION</Tab>
                    </TabList>
                    <TabPanels bg="white" borderWidth="1px" borderTopRadius="md" borderColor="#CDDBDE" borderBottomRadius="md" boxShadow="sm" overflow="hidden">
                      <TabPanel p={4}>
                        <CoverageScoreConfig />
                      </TabPanel>
                      <TabPanel p={0}>
                        <MarketInsightsExecutiveSummary />
                      </TabPanel>
                      <TabPanel p={4}>
                        <QuotesSubmissionComparison />
                      </TabPanel>
                      <TabPanel p={4}>
                        <ConfigureCriteria 
                          quotes={quotes}
                          onOptimize={handleOptimize}
                          onGenerateOptions={handleGenerateOptions}
                          numCandidates={optionsParams.numCandidates}
                          setNumCandidates={handleNumCandidatesChange}
                          generationLoading={isGeneratingOptions}
                        />
                      </TabPanel>
                      <TabPanel p={4}>
                        <GenerateOptions 
                          options={generatedOptions}
                          optionsParams={optionsParams}
                          onFilterOptions={handleFilterOptions}
                          onSelectOption={handleSelectOption}
                          onGenerateOptions={handleGenerateOptions}
                          isLoading={isGeneratingOptions}
                        />
                      </TabPanel>
                      <TabPanel p={4}>
                        {selectedOption ? (
                          <OptionDetailView option={selectedOption} />
                        ) : (
                          <Box textAlign="center" py={10}>
                            <Heading size="md" color="gray.500">No option selected</Heading>
                            <Text mt={2} color="gray.400">
                              Select an option from the "Generate Options" tab to view details
                            </Text>
                          </Box>
                        )}
                      </TabPanel>
                      <TabPanel p={4}>
                        {selectedOption ? (
                          <BindOptionView option={selectedOption} onBind={() => handleBindOption(selectedOption)} />
                        ) : (
                          <Box textAlign="center" py={10}>
                            <Heading size="md" color="gray.500">No option selected</Heading>
                            <Text mt={2} color="gray.400">
                              Select an option from the "Generate Options" tab to bind
                            </Text>
                          </Box>
                        )}
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </Box>
              )}
            </Tabs>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="*" element={<AppContent />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

// Export quotes data function for use in other components
export const useQuotesData = () => {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        setIsLoading(true);
        const data = await fetchQuotes();
        setQuotes(data);
        setError(null);
      } catch (err) {
        setError('Failed to load quotes data');
        console.error('Error loading quotes:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuotes();
  }, []);
  
  return { quotes, isLoading, error };
};

export default App; 