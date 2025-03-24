import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Flex,
  Spinner,
  HStack,
  VStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  useToast,
  Icon,
  Progress,
  SimpleGrid,
  Link,
  Tooltip,
  Tag,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { CheckCircleIcon, InfoIcon, StarIcon, DownloadIcon, EmailIcon } from '@chakra-ui/icons';
import { getSelectedOptionDetails } from '../api';

const ReviewSelectedOption = () => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  // Fetch selected option details
  useEffect(() => {
    const fetchOptionDetails = async () => {
      setLoading(true);
      try {
        // In a real implementation, we would get the optionId from a global state or URL param
        const optionId = 1; // Default to option 1 for this demo
        const data = await getSelectedOptionDetails(optionId);
        setSelectedOption(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching option details:', err);
        setError('Failed to load selected option details');
        toast({
          title: 'Error',
          description: 'Failed to load selected option details',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOptionDetails();
  }, [toast]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle export PDF
  const handleExportPDF = () => {
    toast({
      title: 'Exporting PDF',
      description: 'Your summary is being exported as a PDF',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    // In a real implementation, this would trigger a PDF generation
  };

  // Handle email to client
  const handleEmailClient = () => {
    toast({
      title: 'Email Sent',
      description: 'Summary has been emailed to the client',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    // In a real implementation, this would send an email
  };

  // Handle finalize option
  const handleFinalizeOption = () => {
    toast({
      title: 'Option Finalized',
      description: 'The selected option has been finalized for client presentation',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    // In a real implementation, this would mark the option as finalized
  };

  // If loading, show spinner
  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text mt={4} color="gray.600">Loading selected option details...</Text>
      </Box>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <Box p={6} textAlign="center">
        <Icon as={InfoIcon} boxSize={10} color="red.500" />
        <Heading size="md" mt={4} color="red.500">Error Loading Data</Heading>
        <Text mt={2} color="gray.600">{error}</Text>
        <Button colorScheme="blue" mt={6} onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  // If no selected option, show message
  if (!selectedOption) {
    return (
      <Box p={6} textAlign="center">
        <Icon as={InfoIcon} boxSize={10} color="blue.500" />
        <Heading size="md" mt={4}>No Option Selected</Heading>
        <Text mt={2} color="gray.600">Please select an option from the Generate Options tab</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Box mb={6}>
        <Heading size="lg" fontWeight="500" color="#333333" mb={2}>
          Review Selected Option
        </Heading>
        <Text color="gray.600" fontSize="14px">
          Review and finalize your selected insurance program option
        </Text>
      </Box>

      {/* Action Buttons */}
      <Flex justify="flex-end" mb={6} gap={4}>
        <Button 
          leftIcon={<DownloadIcon />} 
          colorScheme="blue" 
          variant="outline"
          onClick={handleExportPDF}
        >
          Export PDF
        </Button>
        <Button 
          leftIcon={<EmailIcon />}
          colorScheme="blue" 
          variant="outline"
          onClick={handleEmailClient}
        >
          Email to Client
        </Button>
        <Button 
          colorScheme="blue" 
          onClick={handleFinalizeOption}
        >
          Finalize Option
        </Button>
      </Flex>

      {/* Option Overview */}
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
        <Box px={6} py={3} borderBottomWidth="1px" borderBottomColor="#CDDBDE">
          <Heading size="md" color="#333333" fontWeight="600" mb={0}>
            Option Overview
          </Heading>
        </Box>
        
        <Box p={5}>
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" mb={6}>
            <Box>
              <Heading size="md" color="#333333" fontWeight="600">
                {selectedOption.name}
              </Heading>
              <Text color="gray.600" mt={2}>{selectedOption.description}</Text>
            </Box>
            <HStack spacing={6} mt={{ base: 4, md: 0 }}>
              <Stat>
                <StatLabel color="gray.600">Total Premium</StatLabel>
                <StatNumber fontSize="2xl" color="blue.700">
                  {formatCurrency(selectedOption.total_premium)}
                </StatNumber>
                <StatHelpText>
                  {selectedOption.costAnalysis.savingsPercentage > 0 ? (
                    <Text color="green.600">
                      {selectedOption.costAnalysis.savingsPercentage}% below market
                    </Text>
                  ) : (
                    <Text color="red.600">
                      {Math.abs(selectedOption.costAnalysis.savingsPercentage)}% above market
                    </Text>
                  )}
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel color="gray.600">Coverage Score</StatLabel>
                <StatNumber fontSize="2xl" color={
                  selectedOption.avg_coverage >= 90 ? "green.700" : 
                  selectedOption.avg_coverage >= 80 ? "blue.700" : 
                  selectedOption.avg_coverage >= 70 ? "orange.700" : "red.700"
                }>
                  {selectedOption.avg_coverage}%
                </StatNumber>
                <StatHelpText>Overall coverage quality</StatHelpText>
              </Stat>
            </HStack>
          </Flex>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
            <Box>
              <Heading size="sm" mb={3} color="gray.700">Key Features</Heading>
              <VStack align="start" spacing={2}>
                {selectedOption.features.map((feature, idx) => (
                  <HStack key={idx} align="start" spacing={3}>
                    <Icon as={CheckCircleIcon} color="green.500" mt={1} />
                    <Text color="gray.700">{feature}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
            
            <Box>
              <Heading size="sm" mb={3} color="gray.700">Potential Challenges</Heading>
              <VStack align="start" spacing={2}>
                {selectedOption.challenges.map((challenge, idx) => (
                  <HStack key={idx} align="start" spacing={3}>
                    <Icon as={InfoIcon} color="orange.500" mt={1} />
                    <Text color="gray.700">{challenge}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </SimpleGrid>
        </Box>
      </Box>
      
      {/* Program Structure */}
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
        <Box px={6} py={3} borderBottomWidth="1px" borderBottomColor="#CDDBDE">
          <Heading size="md" color="#333333" fontWeight="600" mb={0}>
            Program Structure
          </Heading>
        </Box>
        
        <Box p={5}>
          <Box 
            overflowX="auto" 
            width="100%" 
            margin="0" 
            padding="0" 
            minWidth="100%" 
            height="auto" 
            maxHeight="320px" 
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
                  <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Carrier</Th>
                  <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Layer</Th>
                  <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Limit</Th>
                  <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Attachment</Th>
                  <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Rating</Th>
                  <Th isNumeric color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Premium</Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedOption.carriers.map((carrier, idx) => (
                  <Tr 
                    key={idx}
                    _hover={{ bg: "gray.50" }}
                    borderBottom="1px" 
                    borderColor="gray.200"
                    bg={idx % 2 === 0 ? "white" : "#F9FCFC"}
                  >
                    <Td padding="12px 16px" fontWeight="500" fontSize="15px">{carrier.name}</Td>
                    <Td padding="12px 16px" fontSize="15px">{carrier.layer}</Td>
                    <Td padding="12px 16px" fontSize="15px">{carrier.limit}</Td>
                    <Td padding="12px 16px" fontSize="15px">{carrier.attachment}</Td>
                    <Td padding="12px 16px" fontSize="15px">
                      <Badge colorScheme={
                        carrier.rating.includes('A++') ? 'green' : 
                        carrier.rating.includes('A+') ? 'teal' : 
                        carrier.rating.includes('A') ? 'blue' : 'yellow'
                      }>
                        {carrier.rating}
                      </Badge>
                    </Td>
                    <Td isNumeric padding="12px 16px" fontSize="15px">{formatCurrency(carrier.premium)}</Td>
                  </Tr>
                ))}
                <Tr bg="gray.50" fontWeight="bold">
                  <Td padding="12px 16px" fontSize="15px" colSpan={5}>Total Program Premium</Td>
                  <Td isNumeric padding="12px 16px" fontSize="15px">{formatCurrency(selectedOption.total_premium)}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Box>
      
      {/* Coverage Analysis */}
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
        <Box px={6} py={3} borderBottomWidth="1px" borderBottomColor="#CDDBDE">
          <Heading size="md" color="#333333" fontWeight="600" mb={0}>
            Coverage Analysis
          </Heading>
        </Box>
        
        <Box p={5}>
          <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(6, 1fr)" }} gap={4} mb={6}>
            <GridItem>
              <Stat>
                <StatLabel color="gray.600">Overall</StatLabel>
                <StatNumber fontSize="xl" color={
                  selectedOption.coverageAnalysis.overall >= 90 ? "green.600" : 
                  selectedOption.coverageAnalysis.overall >= 80 ? "blue.600" : 
                  selectedOption.coverageAnalysis.overall >= 70 ? "orange.600" : "red.600"
                }>
                  {selectedOption.coverageAnalysis.overall}%
                </StatNumber>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel color="gray.600">Critical</StatLabel>
                <StatNumber fontSize="xl" color={
                  selectedOption.coverageAnalysis.critical >= 90 ? "green.600" : 
                  selectedOption.coverageAnalysis.critical >= 80 ? "blue.600" : 
                  selectedOption.coverageAnalysis.critical >= 70 ? "orange.600" : "red.600"
                }>
                  {selectedOption.coverageAnalysis.critical}%
                </StatNumber>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel color="gray.600">High</StatLabel>
                <StatNumber fontSize="xl" color={
                  selectedOption.coverageAnalysis.high >= 90 ? "green.600" : 
                  selectedOption.coverageAnalysis.high >= 80 ? "blue.600" : 
                  selectedOption.coverageAnalysis.high >= 70 ? "orange.600" : "red.600"
                }>
                  {selectedOption.coverageAnalysis.high}%
                </StatNumber>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel color="gray.600">Medium</StatLabel>
                <StatNumber fontSize="xl" color={
                  selectedOption.coverageAnalysis.medium >= 90 ? "green.600" : 
                  selectedOption.coverageAnalysis.medium >= 80 ? "blue.600" : 
                  selectedOption.coverageAnalysis.medium >= 70 ? "orange.600" : "red.600"
                }>
                  {selectedOption.coverageAnalysis.medium}%
                </StatNumber>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel color="gray.600">Low</StatLabel>
                <StatNumber fontSize="xl" color={
                  selectedOption.coverageAnalysis.low >= 90 ? "green.600" : 
                  selectedOption.coverageAnalysis.low >= 80 ? "blue.600" : 
                  selectedOption.coverageAnalysis.low >= 70 ? "orange.600" : "red.600"
                }>
                  {selectedOption.coverageAnalysis.low}%
                </StatNumber>
              </Stat>
            </GridItem>
          </Grid>
          
          <Heading size="sm" mb={3} color="gray.700">Sublimits by Importance</Heading>
          <Box 
            overflowX="auto" 
            width="100%" 
            margin="0" 
            padding="0" 
            minWidth="100%" 
            height="auto" 
            maxHeight="320px" 
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
                  <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Sublimit</Th>
                  <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Amount</Th>
                  <Th color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Importance</Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedOption.sublimits.map((sublimit, idx) => (
                  <Tr 
                    key={idx}
                    _hover={{ bg: "gray.50" }}
                    borderBottom="1px" 
                    borderColor="gray.200"
                    bg={idx % 2 === 0 ? "white" : "#F9FCFC"}
                  >
                    <Td padding="12px 16px" fontWeight="500" fontSize="15px">{sublimit.name}</Td>
                    <Td padding="12px 16px" fontSize="15px">{sublimit.amount}</Td>
                    <Td padding="12px 16px" fontSize="15px">
                      <Badge colorScheme={
                        sublimit.importance === 'Critical' ? 'red' : 
                        sublimit.importance === 'High' ? 'orange' : 
                        sublimit.importance === 'Medium' ? 'blue' : 'gray'
                      }>
                        {sublimit.importance}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Box>
      
      {/* Cost Analysis */}
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
        <Box px={6} py={3} borderBottomWidth="1px" borderBottomColor="#CDDBDE">
          <Heading size="md" color="#333333" fontWeight="600" mb={0}>
            Cost Analysis
          </Heading>
        </Box>
        
        <Box p={5}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
            <Box>
              <VStack align="start" spacing={4}>
                <Stat>
                  <StatLabel color="gray.600">Selected Option Premium</StatLabel>
                  <StatNumber fontSize="2xl" color="blue.700">
                    {formatCurrency(selectedOption.costAnalysis.premium)}
                  </StatNumber>
                </Stat>
                
                <Stat>
                  <StatLabel color="gray.600">Average Market Premium</StatLabel>
                  <StatNumber fontSize="2xl" color="gray.600">
                    {formatCurrency(selectedOption.costAnalysis.averageMarketPremium)}
                  </StatNumber>
                </Stat>
                
                <Stat>
                  <StatLabel color="gray.600">
                    {selectedOption.costAnalysis.savings > 0 ? 'Savings' : 'Additional Cost'}
                  </StatLabel>
                  <StatNumber fontSize="2xl" color={selectedOption.costAnalysis.savings > 0 ? "green.600" : "red.600"}>
                    {formatCurrency(Math.abs(selectedOption.costAnalysis.savings))}
                  </StatNumber>
                  <StatHelpText>
                    {selectedOption.costAnalysis.savingsPercentage > 0 ? 
                      `${selectedOption.costAnalysis.savingsPercentage}% below market average` : 
                      `${Math.abs(selectedOption.costAnalysis.savingsPercentage)}% above market average`
                    }
                  </StatHelpText>
                </Stat>
              </VStack>
            </Box>
            
            <Box>
              <Heading size="sm" mb={4} color="gray.700">Cost/Coverage Balance</Heading>
              <Text color="gray.600" mb={4}>
                This option provides a {selectedOption.costAnalysis.savingsPercentage > 0 ? 'cost-effective' : 'premium'} 
                solution with {selectedOption.avg_coverage >= 80 ? 'strong' : 'adequate'} coverage across 
                key sublimits.
              </Text>
              
              <Text color="gray.600">
                {selectedOption.costAnalysis.savingsPercentage > 0 && selectedOption.avg_coverage >= 80 ? (
                  <HStack spacing={2} mt={2}>
                    <Icon as={StarIcon} color="green.500" />
                    <Text fontWeight="medium" color="green.600">Excellent value for money</Text>
                  </HStack>
                ) : selectedOption.costAnalysis.savingsPercentage > 0 ? (
                  <HStack spacing={2} mt={2}>
                    <Icon as={CheckCircleIcon} color="blue.500" />
                    <Text fontWeight="medium" color="blue.600">Good cost optimization</Text>
                  </HStack>
                ) : selectedOption.avg_coverage >= 90 ? (
                  <HStack spacing={2} mt={2}>
                    <Icon as={CheckCircleIcon} color="blue.500" />
                    <Text fontWeight="medium" color="blue.600">Premium coverage quality</Text>
                  </HStack>
                ) : (
                  <HStack spacing={2} mt={2}>
                    <Icon as={InfoIcon} color="orange.500" />
                    <Text fontWeight="medium" color="orange.600">Balanced cost/coverage option</Text>
                  </HStack>
                )}
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      </Box>
      
      {/* Finalization Controls */}
      <Flex justify="flex-end" mt={8} gap={4}>
        <Button 
          colorScheme="blue" 
          size="lg" 
          onClick={handleFinalizeOption}
          px={8}
          rightIcon={<CheckCircleIcon />}
        >
          Finalize and Present to Client
        </Button>
      </Flex>
    </Box>
  );
};

export default ReviewSelectedOption; 