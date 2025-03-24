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
  Icon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { FiTrendingUp, FiTrendingDown, FiInfo } from 'react-icons/fi';
import FeatureImpactVisualization from './FeatureImpactVisualization';

// Mock data - in a real implementation, this would come from API or props
const mockInsightsData = {
  totalCarriers: 30,
  strongCoverages: [
    { name: 'Property Damage', percentAboveSubmission: 18 },
    { name: 'Business Interruption', percentAboveSubmission: 15 },
  ],
  challengeCoverages: [
    { name: 'Cyber Liability', percentBelowSubmission: 32 },
    { name: 'Environmental Remediation', percentBelowSubmission: 25 },
  ],
  premiumFactors: {
    increasingFactors: [
      { name: 'Earthquake Outside Of High Hazard, New Madrid, Pacific Northwest And International High Hazard Earthquake Zones', impact: '+$10.79' },
      { name: 'Electronic Data And Media', impact: '+$1.69' },
    ],
    decreasingFactors: [
      { name: 'Expediting Expenses', impact: '-$10.40' },
      { name: 'Brands And Labels', impact: '-$0.52' },
    ],
  },
  clientStrengths: ['geographic positioning', 'strong loss history'],
  recommendations: ['leverage strong primary property position', 'negotiate improved terms on cyber coverage'],
  topCarriers: [
    { 
      name: 'AIG', 
      totalCapacity: 2660000,  // 2.66M
      layer: 'PRIMARY $10M',
      strongCoverages: ['Property Damage', 'Business Interruption'],
      percentAboveAverage: 22
    },
    { 
      name: 'Zurich', 
      totalCapacity: 5560000,  // 5.56M
      layer: 'PRIMARY $10M',
      strongCoverages: ['Flood Coverage', 'Fire Damage'],
      percentAboveAverage: 18
    },
    { 
      name: 'Chubb', 
      totalCapacity: 3980000,  // 3.98M
      layer: 'PRIMARY $10M',
      strongCoverages: ['Business Interruption', 'Equipment Breakdown'],
      percentAboveAverage: 15
    }
  ],
};

const MarketInsightsExecutiveSummary = ({ data = mockInsightsData }) => {
  // Extract values for summary
  const { 
    totalCarriers,
    topCarriers
  } = data;
  
  return (
    <Box p={6}>
      <Box mb={6}>
        <Heading size="lg" fontWeight="500" color="#333333" mb={2}>
          Understanding Coverage
        </Heading>
        <Text color="gray.600" fontSize="14px">
          Based on quotes from {totalCarriers} carriers, here's what you need to know about your coverage options
        </Text>
      </Box>
      
      {/* Coverage Insights Section */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
        <Box 
          p={4} 
          bg="white" 
          borderRadius="md" 
          borderWidth="1px" 
          borderColor="#CDDBDE"
          boxShadow="sm"
        >
          <Flex align="center" mb={3}>
            <Icon as={FiTrendingUp} mr={2} color="green.500" />
            <Heading size="sm" color="#333333" fontWeight="600">
              Coverage Strengths
            </Heading>
          </Flex>
          <Text fontSize="sm" color="gray.600">
            Strong position for <Text as="span" fontWeight="semibold">Property Damage</Text> and <Text as="span" fontWeight="semibold">Business Interruption</Text>. 
            Carriers offering <Text as="span" fontWeight="semibold" color="green.500">15-18% higher</Text> than requested.
          </Text>
        </Box>
        
        <Box 
          p={4} 
          bg="white" 
          borderRadius="md" 
          borderWidth="1px" 
          borderColor="#CDDBDE"
          boxShadow="sm"
        >
          <Flex align="center" mb={3}>
            <Icon as={FiTrendingDown} mr={2} color="red.500" />
            <Heading size="sm" color="#333333" fontWeight="600">
              Coverage Challenges
            </Heading>
          </Flex>
          <Text fontSize="sm" color="gray.600">
            Pushback on <Text as="span" fontWeight="semibold">Cyber Liability</Text> and <Text as="span" fontWeight="semibold">Environmental Remediation</Text>. 
            About <Text as="span" fontWeight="semibold" color="red.500">32% less</Text> cyber coverage than requested.
          </Text>
        </Box>
        
        <Box 
          p={4} 
          bg="white" 
          borderRadius="md" 
          borderWidth="1px" 
          borderColor="#CDDBDE"
          boxShadow="sm"
        >
          <Flex align="center" mb={3}>
            <Icon as={FiInfo} mr={2} color="#0051a8" />
            <Heading size="sm" color="#333333" fontWeight="600">
              Market Implications
            </Heading>
          </Flex>
          <Text fontSize="sm" color="gray.600">
            Your core property risks are well-covered at competitive rates, 
            but you may need to accept lower limits for cyber or consider alternative risk transfer options.
          </Text>
        </Box>
      </SimpleGrid>
      
      {/* Top Carriers Section */}
      <Box 
        mb={8} 
        bg="white" 
        borderRadius="md" 
        borderWidth="1px" 
        borderColor="#CDDBDE"
        boxShadow="sm"
        overflow="hidden"
        width="100%"
        maxWidth="100%"
      >
        <Accordion allowToggle defaultIndex={[0]}>
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
                    Top Performing Carriers
                  </Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel p={0}>
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
                      <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Carrier</Th>
                      <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Layer</Th>
                      <Th isNumeric color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Capacity</Th>
                      <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Strong Coverage Areas</Th>
                      <Th isNumeric color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">% Above Average</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {topCarriers.map((carrier, idx) => (
                      <Tr 
                        key={idx} 
                        _hover={{ bg: "gray.50" }} 
                        borderBottom="1px" 
                        borderColor="gray.200"
                        bg={idx % 2 === 0 ? "white" : "#F9FCFC"}
                      >
                        <Td padding="12px 16px" fontWeight="500" color="gray.700" fontSize="15px">{carrier.name}</Td>
                        <Td padding="12px 16px" fontSize="15px">
                          <Badge 
                            borderRadius="md" 
                            px={2} 
                            py={1}
                            bg="gray.100"
                            color="gray.600"
                            fontWeight="normal"
                          >
                            {carrier.layer}
                          </Badge>
                        </Td>
                        <Td isNumeric padding="12px 16px" fontSize="15px">${(carrier.totalCapacity).toLocaleString()}</Td>
                        <Td padding="12px 16px" fontSize="15px">{carrier.strongCoverages.join(', ')}</Td>
                        <Td isNumeric padding="12px 16px" fontSize="15px">
                          <Text fontWeight="medium" color="green.500">
                            {carrier.percentAboveAverage}%
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Box>
      
      {/* Premium Factors Section */}
      <Box 
        bg="white" 
        borderRadius="md" 
        borderWidth="1px" 
        borderColor="#CDDBDE"
        boxShadow="sm"
        overflow="hidden"
        mb={8}
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
                    Factors Influencing Your Premium
                  </Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel p={0}>
              <Box p={5}>
                <Heading size="md" fontWeight="500" mb={2} color="#333333">Premium Feature Impact Analysis</Heading>
                <Text color="gray.600" fontSize="sm" mb={6}>
                  This analysis shows how different sublimits impact the final premium calculation.
                </Text>
                
                {/* Feature Impact Visualization */}
                <Box>
                  <FeatureImpactVisualization />
                </Box>
              </Box>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Box>
    </Box>
  );
};

export default MarketInsightsExecutiveSummary; 