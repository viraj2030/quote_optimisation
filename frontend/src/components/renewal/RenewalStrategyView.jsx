import React from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Flex,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { FiTrendingUp, FiTrendingDown, FiInfo, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { FaChartLine, FaBuilding, FaChartBar, FaExchangeAlt, FaNewspaper } from 'react-icons/fa';

// Mock data for the renewal strategy
const renewalStrategyData = {
  marketConditions: {
    propertyMarketSummary: "The commercial property insurance market continues to experience moderate hardening in 2024, with rate increases averaging 7-10% across most risk categories. The most significant rate increases are observed in CAT-exposed properties and those with adverse loss history.",
    capacityChanges: [
      { 
        segment: "Property (Non-CAT)", 
        change: 5, 
        note: "Modest capacity growth for well-protected risks" 
      },
      { 
        segment: "Property (CAT-Exposed)", 
        change: -12, 
        note: "Capacity contraction continues for earthquake, flood and wildfire exposed properties" 
      },
      { 
        segment: "Business Interruption", 
        change: -3, 
        note: "Slight reduction as markets react to supply chain challenges" 
      },
      { 
        segment: "Cyber Coverage", 
        change: -25, 
        note: "Significant contraction due to increased claims frequency and severity" 
      }
    ],
    carrierTrends: [
      "Increased scrutiny of property valuations with enforcement of coinsurance provisions",
      "Higher deductibles for CAT perils becoming standard",
      "Tighter policy language around business interruption following the pandemic",
      "Greater emphasis on risk quality and detailed underwriting submissions"
    ],
    rateChanges: [
      { category: "Non-CAT Property", change: 8 },
      { category: "CAT-Exposed Property", change: 15 },
      { category: "Business Interruption", change: 10 },
      { category: "Cyber Coverage", change: 35 }
    ]
  },

  economicIndicators: {
    inflation: { 
      current: 3.2, 
      previousYear: 6.5, 
      impact: "While inflation has moderated from 2023 peaks, construction costs remain elevated, potentially creating property valuation gaps." 
    },
    constructionCosts: { 
      current: 4.8, 
      previousYear: 7.2, 
      impact: "Material and labor costs continue to outpace general inflation, directly affecting property replacement values and claim costs." 
    },
    interestRates: { 
      current: 5.25, 
      previousYear: 4.75, 
      impact: "Higher interest rates are influencing carrier investment returns, but have not yet translated to softer pricing." 
    },
    gdpGrowth: { 
      current: 2.1, 
      previousYear: 2.5, 
      impact: "Moderate economic growth supports stable business operations but hasn't significantly altered the insurance pricing cycle." 
    },
    supplyChainDisruptions: { 
      rating: "Moderate", 
      previousRating: "Severe", 
      impact: "Improving but still vulnerable supply chains affect business resilience and contingent business interruption exposures." 
    }
  },

  carrierAnalysis: {
    alternativeMarkets: [
      {
        name: "Chubb",
        strengths: "Strong financial ratings, comprehensive coverage forms, superior claims handling",
        appetiteMatch: "High",
        expectedPricing: "Premium -5% (vs. incumbent)",
        notes: "Expressed strong interest in your risk profile"
      },
      {
        name: "Liberty Mutual",
        strengths: "Competitive on larger schedules, strong risk engineering services",
        appetiteMatch: "Medium",
        expectedPricing: "Premium -2% (vs. incumbent)",
        notes: "Recently expanded capacity in your industry sector"
      },
      {
        name: "Allianz",
        strengths: "Global capabilities, technical expertise, comprehensive coverage",
        appetiteMatch: "High",
        expectedPricing: "Premium +3% (vs. incumbent)",
        notes: "Superior coverage terms may justify slight premium increase"
      }
    ]
  },

  recommendations: {
    strategy: "Early renewal engagement with a parallel marketing process",
    timeline: [
      { milestone: "Gather updated property values and risk information", timeframe: "120 days pre-renewal" },
      { milestone: "Develop submission and marketing strategy", timeframe: "90 days pre-renewal" },
      { milestone: "Begin incumbent discussions", timeframe: "75 days pre-renewal" },
      { milestone: "Market to alternative carriers", timeframe: "60 days pre-renewal" },
      { milestone: "Evaluate quotes and develop options", timeframe: "30 days pre-renewal" },
      { milestone: "Finalize renewal decision", timeframe: "15 days pre-renewal" }
    ],
    focusAreas: [
      "Validate all property valuations to avoid coinsurance issues",
      "Review business interruption values in light of current revenue and supply chain dependencies",
      "Evaluate deductible options to potentially mitigate premium increases",
      "Consider alternative program structures including higher buffer layers",
      "Prepare detailed risk control information highlighting recent improvements"
    ]
  }
};

// Function to map credit rating numbers to readable text
const getCreditRatingText = (rating) => {
  if (typeof rating === 'string') {
    return rating;
  }
  
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

const RenewalStrategyView = ({ quotes = [] }) => {
  // Process quotes data to create previous placement information
  // Assign capacities that sum to exactly 30 million
  const totalDesiredCapacity = 30000000; // 30 million
  
  // If quotes exist, distribute capacity proportionally or assign fixed values
  let assignedCapacities = [];
  if (quotes && quotes.length > 0) {
    // Assign capacities based on a distribution that sums to 30M
    if (quotes.length === 1) {
      assignedCapacities = [30000000]; // If only one quote, it gets all 30M
    } else if (quotes.length === 2) {
      assignedCapacities = [20000000, 10000000]; // 20M and 10M for two quotes
    } else if (quotes.length === 3) {
      assignedCapacities = [15000000, 10000000, 5000000]; // 15M, 10M, 5M for three quotes
    } else {
      // For more quotes, distribute first half with larger amounts
      const primaryCarriers = Math.ceil(quotes.length / 2);
      const secondaryCarriers = quotes.length - primaryCarriers;
      
      // Primary carriers get 75% of capacity, secondary get 25%
      const primaryTotal = totalDesiredCapacity * 0.75;
      const secondaryTotal = totalDesiredCapacity * 0.25;
      
      // Base values for each carrier type
      const primaryBase = primaryTotal / primaryCarriers;
      const secondaryBase = secondaryTotal / secondaryCarriers;
      
      for (let i = 0; i < quotes.length; i++) {
        if (i < primaryCarriers) {
          assignedCapacities.push(Math.round(primaryBase));
        } else {
          assignedCapacities.push(Math.round(secondaryBase));
        }
      }
      
      // Adjust the last value to ensure exact sum of 30M
      const currentSum = assignedCapacities.reduce((sum, val) => sum + val, 0);
      const difference = totalDesiredCapacity - currentSum;
      assignedCapacities[assignedCapacities.length - 1] += difference;
    }
  }
  
  const processedQuotes = {
    effectiveDate: "2023-04-01",
    expirationDate: "2024-04-01",
    totalLimit: `$30M`,
    totalPremium: quotes.reduce((sum, q) => sum + (q.Premium || 0), 0),
    layers: quotes.map((quote, index) => ({
      name: `${quote.Layer}`,
      carrier: quote.Carrier,
      premium: quote.Premium,
      allocatedCapacity: `$${(assignedCapacities[index]/1000000).toFixed(0)}M`,
      capacityValue: assignedCapacities[index], // Store numeric value for calculations
      creditRating: getCreditRatingText(quote.Credit_Rating)
    })),
    keyTermsAndConditions: [
      "All Risks Coverage Subject to Policy Exclusions",
      "Earthquake Sublimit $5M",
      "Flood Sublimit $5M",
      "Business Interruption $2M",
      "Electronic Data and Media $500K",
      "Deductible $50K"
    ]
  };

  // Create incumbent carrier updates based on actual quotes
  const incumbentCarriers = {};
  if (quotes && quotes.length > 0) {
    quotes.forEach(quote => {
      const carrierKey = quote.Carrier.toLowerCase().replace(/\s+/g, '');
      if (!incumbentCarriers[carrierKey]) {
        incumbentCarriers[carrierKey] = {
          name: quote.Carrier,
          strategyChange: "Focusing on technical pricing and risk quality, with moderate rate increases for 2024 renewals",
          financialStrength: getCreditRatingText(quote.Credit_Rating) + (getCreditRatingText(quote.Credit_Rating).includes('A') ? " (Excellent)" : " (Good)"),
          capacityOutlook: "Stable for preferred risks, contracting for CAT-exposed",
          keyPersonnel: "No significant leadership changes"
        };
      }
    });
  }

  return (
    <Box p={6}>
      {/* Executive Summary Section */}
      <Box mb={8}>
        <Heading size="lg" fontWeight="500" color="aon.blue.700" mb={2}>
          Renewal Strategy Report
        </Heading>
        <Text color="gray.600" fontSize="md" lineHeight="tall">
          This renewal strategy outlines market conditions, economic factors, and carrier insights to help 
          guide your upcoming property insurance renewal. Based on our analysis of your current placement and 
          changing market dynamics, we've developed strategic recommendations to optimize your renewal outcome.
        </Text>
      </Box>

      {/* Prior Placement Analysis */}
      <Box 
        mb={8} 
        bg="white" 
        borderRadius="md" 
        borderWidth="1px" 
        borderColor="gray.200"
        boxShadow="sm"
        overflow="hidden"
      >
        <Flex 
          bg="gray.50" 
          p={4} 
          borderBottomWidth="1px" 
          borderBottomColor="gray.200"
          alignItems="center"
        >
          <Icon as={FaBuilding} mr={3} color="aon.blue.700" />
          <Heading size="md" fontWeight="600" color="#333">
            Prior Placement Analysis
          </Heading>
        </Flex>
        
        <Box p={5}>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
            <Stat>
              <StatLabel color="gray.600">Policy Period</StatLabel>
              <StatNumber fontSize="lg">{processedQuotes.effectiveDate} to {processedQuotes.expirationDate}</StatNumber>
              <StatHelpText>Annual Term</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel color="gray.600">Total Limit</StatLabel>
              <StatNumber fontSize="lg">{processedQuotes.totalLimit}</StatNumber>
              <StatHelpText>Combined Program Limit</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel color="gray.600">Total Premium</StatLabel>
              <StatNumber fontSize="lg">${processedQuotes.totalPremium.toLocaleString()}</StatNumber>
              <StatHelpText>Annual Premium</StatHelpText>
            </Stat>
          </SimpleGrid>
          
          <Heading size="sm" fontWeight="600" mb={3} color="gray.700">Program Structure</Heading>
          
          <Table variant="simple" mb={5} size="sm">
            <Thead>
              <Tr>
                <Th>Layer</Th>
                <Th>Carrier</Th>
                <Th isNumeric>Premium</Th>
                <Th>Allocated Capacity</Th>
                <Th>Rating</Th>
              </Tr>
            </Thead>
            <Tbody>
              {processedQuotes.layers.map((layer, idx) => (
                <Tr key={idx}>
                  <Td>{layer.name}</Td>
                  <Td>{layer.carrier}</Td>
                  <Td isNumeric>${layer.premium.toLocaleString()}</Td>
                  <Td>{layer.allocatedCapacity}</Td>
                  <Td>
                    <Badge 
                      colorScheme={
                        layer.creditRating.startsWith('A') ? "green" : 
                        layer.creditRating.startsWith('B') ? "yellow" : "gray"
                      }
                    >
                      {layer.creditRating}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          
          <Heading size="sm" fontWeight="600" mb={3} color="gray.700">Key Terms & Conditions</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {processedQuotes.keyTermsAndConditions.map((term, idx) => (
              <Flex key={idx} alignItems="center">
                <Icon as={FiCheckCircle} color="green.500" mr={2} />
                <Text fontSize="sm">{term}</Text>
              </Flex>
            ))}
          </SimpleGrid>
        </Box>
      </Box>

      {/* Market Conditions */}
      <Box 
        mb={8} 
        bg="white" 
        borderRadius="md" 
        borderWidth="1px" 
        borderColor="gray.200"
        boxShadow="sm"
        overflow="hidden"
      >
        <Flex 
          bg="gray.50" 
          p={4} 
          borderBottomWidth="1px" 
          borderBottomColor="gray.200"
          alignItems="center"
        >
          <Icon as={FaChartLine} mr={3} color="aon.blue.700" />
          <Heading size="md" fontWeight="600" color="#333">
            Current Market Conditions
          </Heading>
        </Flex>
        
        <Box p={5}>
          <Text mb={5}>{renewalStrategyData.marketConditions.propertyMarketSummary}</Text>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
            <Box>
              <Heading size="sm" mb={4} color="#333">
                Market Capacity Changes
              </Heading>
              {renewalStrategyData.marketConditions.capacityChanges.map((item, idx) => (
                <Box key={idx} mb={3}>
                  <Flex align="center" mb={1}>
                    <Text fontWeight="medium" color="gray.700">{item.segment}</Text>
                    <Badge ml={2} colorScheme={item.change > 0 ? "green" : "red"}>
                      {item.change > 0 ? "+" : ""}{item.change}%
                    </Badge>
                  </Flex>
                  <Text fontSize="sm" color="gray.600">{item.note}</Text>
                </Box>
              ))}
            </Box>
            
            <Box>
              <Heading size="sm" mb={4} color="#333">
                Rate Changes by Category
              </Heading>
              {renewalStrategyData.marketConditions.rateChanges.map((item, idx) => (
                <Flex key={idx} mb={3} align="center" justify="space-between">
                  <Text>{item.category}</Text>
                  <Badge 
                    colorScheme={item.change > 10 ? "red" : item.change > 5 ? "orange" : "green"}
                    ml={2}
                  >
                    +{item.change}%
                  </Badge>
                </Flex>
              ))}
            </Box>
          </SimpleGrid>
          
          <Box mt={6}>
            <Heading size="sm" mb={3} color="#333">
              Current Carrier Trends
            </Heading>
            <List spacing={2}>
              {renewalStrategyData.marketConditions.carrierTrends.map((trend, idx) => (
                <ListItem key={idx}>
                  <ListIcon as={FiInfo} color="aon.blue.700" />
                  {trend}
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>
      </Box>

      {/* Economic Indicators */}
      <Box 
        mb={8} 
        bg="white" 
        borderRadius="md" 
        borderWidth="1px" 
        borderColor="gray.200"
        boxShadow="sm"
        overflow="hidden"
      >
        <Flex 
          bg="gray.50" 
          p={4} 
          borderBottomWidth="1px" 
          borderBottomColor="gray.200"
          alignItems="center"
        >
          <Icon as={FaChartBar} mr={3} color="aon.blue.700" />
          <Heading size="md" fontWeight="600" color="#333">
            Economic Indicators
          </Heading>
        </Flex>
        
        <Box p={5}>
          <Text mb={5} color="gray.700">
            Economic factors directly impact property insurance through replacement costs, business interruption values, and overall market conditions.
          </Text>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {Object.entries(renewalStrategyData.economicIndicators)
              .filter(([key]) => key !== 'supplyChainDisruptions')
              .map(([key, data]) => (
                <Box key={key} borderWidth="1px" borderRadius="md" p={4} borderColor="gray.200">
                  <Heading size="sm" mb={2} textTransform="capitalize" color="#333">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Heading>
                  
                  <Flex align="center" mb={2}>
                    <Text fontWeight="bold" fontSize="xl">{data.current}%</Text>
                    <Flex align="center" ml={3}>
                      <Stat display="inline" size="sm">
                        <StatArrow 
                          type={data.current < data.previousYear ? 'decrease' : 'increase'} 
                          color={data.current < data.previousYear ? 'green.500' : 'red.500'}
                        />
                      </Stat>
                      <Text fontSize="sm" color="gray.600">
                        vs {data.previousYear}% last year
                      </Text>
                    </Flex>
                  </Flex>
                  
                  <Text fontSize="sm" color="gray.600">{data.impact}</Text>
                </Box>
            ))}
            
            <Box borderWidth="1px" borderRadius="md" p={4} borderColor="gray.200">
              <Heading size="sm" mb={2} textTransform="capitalize" color="#333">
                Supply Chain Disruptions
              </Heading>
              
              <Flex align="center" mb={2}>
                <Badge colorScheme={renewalStrategyData.economicIndicators.supplyChainDisruptions.rating === "Severe" ? "red" : renewalStrategyData.economicIndicators.supplyChainDisruptions.rating === "Moderate" ? "yellow" : "green"} px={2} py={1}>
                  {renewalStrategyData.economicIndicators.supplyChainDisruptions.rating}
                </Badge>
                <Text fontSize="sm" ml={2} color="gray.600">
                  vs {renewalStrategyData.economicIndicators.supplyChainDisruptions.previousRating} last year
                </Text>
              </Flex>
              
              <Text fontSize="sm" color="gray.600">
                {renewalStrategyData.economicIndicators.supplyChainDisruptions.impact}
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      </Box>

      {/* Carrier Analysis */}
      <Box 
        mb={8} 
        bg="white" 
        borderRadius="md" 
        borderWidth="1px" 
        borderColor="gray.200"
        boxShadow="sm"
        overflow="hidden"
      >
        <Flex 
          bg="gray.50" 
          p={4} 
          borderBottomWidth="1px" 
          borderBottomColor="gray.200"
          alignItems="center"
        >
          <Icon as={FaExchangeAlt} mr={3} color="aon.blue.700" />
          <Heading size="md" fontWeight="600" color="#333">
            Carrier Analysis
          </Heading>
        </Flex>
        
        <Box p={5}>
          <Accordion allowToggle defaultIndex={[0]}>
            <AccordionItem 
              mb={4} 
              border="1px" 
              borderColor="gray.200" 
              borderRadius="md" 
              overflow="hidden"
            >
              <h2>
                <AccordionButton bg="gray.50" p={3} _hover={{ bg: "gray.100" }}>
                  <Box flex="1" textAlign="left" fontWeight="semibold">
                    Incumbent Carrier Update
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                {Object.values(incumbentCarriers).map((carrier, idx) => (
                  <Box 
                    key={idx} 
                    mb={idx < Object.values(incumbentCarriers).length - 1 ? 5 : 0}
                    pl={2}
                  >
                    <Heading size="sm" fontWeight="600" mb={2} color="aon.blue.700">
                      {carrier.name}
                    </Heading>
                    
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600">Strategy Change:</Text>
                        <Text fontSize="sm" mb={2}>{carrier.strategyChange}</Text>
                        
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600">Financial Strength:</Text>
                        <Text fontSize="sm" mb={2}>{carrier.financialStrength}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600">Capacity Outlook:</Text>
                        <Text fontSize="sm" mb={2}>{carrier.capacityOutlook}</Text>
                        
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600">Key Personnel Changes:</Text>
                        <Text fontSize="sm">{carrier.keyPersonnel}</Text>
                      </Box>
                    </SimpleGrid>
                    
                    {idx < Object.values(incumbentCarriers).length - 1 && (
                      <Divider my={2} />
                    )}
                  </Box>
                ))}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
          
          <Heading size="sm" mb={4} color="#333">
            Alternative Market Analysis
          </Heading>
          <Table size="sm" variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Carrier</Th>
                <Th>Key Strengths</Th>
                <Th>Appetite</Th>
                <Th>Expected Pricing</Th>
                <Th>Notes</Th>
              </Tr>
            </Thead>
            <Tbody>
              {renewalStrategyData.carrierAnalysis.alternativeMarkets.map((carrier, idx) => (
                <Tr key={idx}>
                  <Td fontWeight="medium">{carrier.name}</Td>
                  <Td fontSize="sm">{carrier.strengths}</Td>
                  <Td>
                    <Badge colorScheme={
                      carrier.appetiteMatch === "High" ? "green" :
                      carrier.appetiteMatch === "Medium" ? "yellow" : "red"
                    }>
                      {carrier.appetiteMatch}
                    </Badge>
                  </Td>
                  <Td color={carrier.expectedPricing.includes('-') ? "green.600" : "red.600"} fontWeight="medium">
                    {carrier.expectedPricing}
                  </Td>
                  <Td fontSize="sm">{carrier.notes}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Strategic Recommendations */}
      <Box 
        mb={8} 
        bg="white" 
        borderRadius="md" 
        borderWidth="1px" 
        borderColor="gray.200"
        boxShadow="sm"
        overflow="hidden"
      >
        <Flex 
          bg="gray.50" 
          p={4} 
          borderBottomWidth="1px" 
          borderBottomColor="gray.200"
          alignItems="center"
        >
          <Icon as={FaNewspaper} mr={3} color="aon.blue.700" />
          <Heading size="md" fontWeight="600" color="#333">
            Strategic Recommendations
          </Heading>
        </Flex>
        
        <Box p={5}>
          <Text mb={5} fontWeight="medium" fontSize="lg" color="aon.blue.700">
            {renewalStrategyData.recommendations.strategy}
          </Text>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
            <Box>
              <Heading size="sm" mb={3} color="#333">
                Renewal Timeline
              </Heading>
              <Table size="sm" variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Milestone</Th>
                    <Th>Timeframe</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {renewalStrategyData.recommendations.timeline.map((item, idx) => (
                    <Tr key={idx}>
                      <Td>{item.milestone}</Td>
                      <Td>{item.timeframe}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            
            <Box>
              <Heading size="sm" mb={3} color="#333">
                Focus Areas
              </Heading>
              <List spacing={2}>
                {renewalStrategyData.recommendations.focusAreas.map((item, idx) => (
                  <ListItem key={idx}>
                    <ListIcon as={FiCheckCircle} color="green.500" />
                    {item}
                  </ListItem>
                ))}
              </List>
            </Box>
          </SimpleGrid>
        </Box>
      </Box>
    </Box>
  );
};

export default RenewalStrategyView; 