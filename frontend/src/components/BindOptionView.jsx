import React, { useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Checkbox,
  Button,
  Flex,
  useToast,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';

const BindOptionView = ({ option, onBind }) => {
  const [isBindConfirmed, setIsBindConfirmed] = useState(false);
  const [bindSuccess, setBindSuccess] = useState(false);
  const toast = useToast();
  
  // Colors
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');
  const aonBlue = "#007585";
  const borderColor = useColorModeValue('#CDDBDE', 'gray.600');
  const bgColor = useColorModeValue('white', 'gray.800');
  const altRowBg = useColorModeValue("#f8fafb", "gray.700");
  
  // Handle bind button click
  const handleBindClick = () => {
    // In a real application, this would send a request to the backend
    // to confirm the placement binding
    
    // Simulate a successful binding
    setTimeout(() => {
      setBindSuccess(true);
      if (onBind && typeof onBind === 'function') {
        onBind(option);
      }
      toast({
        title: "Success",
        description: "You have successfully bound your placement",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }, 1000);
  };
  
  // If no option is selected, show a message
  if (!option) {
    return (
      <Box bg={bgColor} p={6} borderRadius="lg" boxShadow="sm" textAlign="center">
        <Text>Please generate options and select one to bind.</Text>
      </Box>
    );
  }
  
  // Group quotes by layer
  const layers = ['Primary $10M', '$10M xs $10M', '$10M xs $20M'];
  const quotesByLayer = {};
  
  layers.forEach(layer => {
    quotesByLayer[layer] = option.solution.filter(quote => 
      quote.Layer === layer && quote.SignedCapacity > 0
    );
  });
  
  // Calculate totals
  const totalPremium = option.total_premium;
  const avgCoverage = option.avg_coverage;
  
  return (
    <Box p={0}>
      <VStack spacing={6} align="stretch" mb={8}>
        {/* Summary Section */}
        <Box borderWidth="1px" borderRadius="md" p={6} borderColor={borderColor} bg={bgColor}>
          <Heading size="md" mb={4}>Placement Summary</Heading>
          <Text fontSize="md" mb={4}>
            This placement option provides a balance of premium cost and coverage quality. 
            The total premium is ${totalPremium.toLocaleString()} with an average coverage score of {avgCoverage.toFixed(2)}%.
            The program includes {option.solution.filter(q => q.SignedCapacity > 0).length} carriers across {layers.length} layers.
          </Text>
          
          <Divider my={4} />
          
          {/* Key metrics display */}
          <Flex justifyContent="space-between" flexWrap="wrap" gap={4}>
            <Box>
              <Heading size="sm" color="gray.600">Total Premium</Heading>
              <Text fontSize="xl" fontWeight="bold">${totalPremium.toLocaleString()}</Text>
            </Box>
            <Box>
              <Heading size="sm" color="gray.600">Average Coverage</Heading>
              <Text fontSize="xl" fontWeight="bold">{avgCoverage.toFixed(2)}%</Text>
            </Box>
            <Box>
              <Heading size="sm" color="gray.600">Carrier Count</Heading>
              <Text fontSize="xl" fontWeight="bold">
                {option.solution.filter(q => q.SignedCapacity > 0).length}
              </Text>
            </Box>
            <Box>
              <Heading size="sm" color="gray.600">Layers</Heading>
              <Text fontSize="xl" fontWeight="bold">{layers.length}</Text>
            </Box>
          </Flex>
        </Box>
        
        {/* Detailed breakdown table */}
        <Box borderWidth="1px" borderRadius="md" borderColor={borderColor} overflow="hidden" boxShadow="sm">
          <Flex 
            bg={tableHeaderBg} 
            p={4} 
            borderBottomWidth="1px" 
            borderBottomColor={borderColor}
            align="center"
          >
            <Heading size="md">Placement Details</Heading>
          </Flex>
          <Box maxH="500px" overflowY="auto" position="relative">
            {layers.map((layer, layerIndex) => (
              <Box key={layer} mb={layerIndex < layers.length - 1 ? 0 : 0}>
                <Flex 
                  bg={tableHeaderBg} 
                  px={4} 
                  py={3} 
                  borderTopWidth={layerIndex > 0 ? "1px" : "0"} 
                  borderBottomWidth="1px" 
                  borderColor={borderColor}
                  align="center"
                >
                  <Heading size="sm" color="#007585">{layer}</Heading>
                </Flex>
                <Table variant="simple" size="md" position="relative">
                  <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={1}>
                    <Tr>
                      <Th width="25%" borderBottomWidth="2px" borderBottomColor="#E2E8F0" py={3}>Carrier</Th>
                      <Th width="15%" borderBottomWidth="2px" borderBottomColor="#E2E8F0" py={3}>Rating</Th>
                      <Th isNumeric width="20%" borderBottomWidth="2px" borderBottomColor="#E2E8F0" py={3}>Allocation</Th>
                      <Th isNumeric width="20%" borderBottomWidth="2px" borderBottomColor="#E2E8F0" py={3}>Premium</Th>
                      <Th isNumeric width="20%" borderBottomWidth="2px" borderBottomColor="#E2E8F0" py={3}>Coverage Score</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {quotesByLayer[layer].map((quote, index) => (
                      <Tr 
                        key={index} 
                        bg={index % 2 === 1 ? altRowBg : "transparent"}
                        _hover={{ bg: "gray.50" }}
                        transition="background-color 0.2s"
                      >
                        <Td fontWeight="500" py={3}>{quote.Carrier}</Td>
                        <Td py={3}>
                          <Badge 
                            colorScheme={
                              quote.CreditRating.startsWith('A') ? "green" : 
                              quote.CreditRating.startsWith('B') ? "yellow" : "gray"
                            }
                            variant="subtle"
                            px={2}
                            py={0.5}
                            borderRadius="md"
                          >
                            {quote.CreditRating}
                          </Badge>
                        </Td>
                        <Td isNumeric fontWeight="medium" py={3}>{quote.AllocationPercentage.toFixed(2)}%</Td>
                        <Td isNumeric py={3}>${quote.SignedPremium.toLocaleString()}</Td>
                        <Td isNumeric py={3} color={quote.Coverage_Score > 0.75 ? "green.600" : "inherit"}>
                          {(quote.Coverage_Score * 100).toFixed(2)}%
                        </Td>
                      </Tr>
                    ))}
                    {/* Summary row for each layer */}
                    <Tr bg="#F7FAFC" fontWeight="600">
                      <Td colSpan={2} py={3}>Layer Total</Td>
                      <Td isNumeric py={3}>100.00%</Td>
                      <Td isNumeric py={3}>
                        ${quotesByLayer[layer].reduce((sum, q) => sum + q.SignedPremium, 0).toLocaleString()}
                      </Td>
                      <Td isNumeric py={3}>
                        {(quotesByLayer[layer].reduce((sum, q) => sum + q.Coverage_Score * q.SignedCapacity, 0) / 
                         quotesByLayer[layer].reduce((sum, q) => sum + q.SignedCapacity, 0) * 100).toFixed(2)}%
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* Binding controls */}
        <Box borderWidth="1px" borderRadius="md" p={6} borderColor={borderColor} bg={bgColor}>
          {bindSuccess ? (
            <Text color="green.500" fontSize="md">You have successfully bound your placement</Text>
          ) : (
            <>
              <Heading size="md" mb={4}>Bind Placement</Heading>
              <Text mb={6}>
                By binding this placement, you confirm that you want to proceed with this program structure 
                and the selected carrier allocations.
              </Text>
              
              <Flex direction={["column", "row"]} alignItems={["flex-start", "center"]} justifyContent="space-between">
                <Checkbox 
                  size="lg" 
                  mb={[4, 0]}
                  colorScheme="blue"
                  isChecked={isBindConfirmed}
                  onChange={(e) => setIsBindConfirmed(e.target.checked)}
                >
                  <Text fontWeight="500">I am ready to bind this placement</Text>
                </Checkbox>
                
                <Button 
                  colorScheme={isBindConfirmed ? "blue" : "gray"}
                  size="lg"
                  isDisabled={!isBindConfirmed}
                  onClick={handleBindClick}
                  bg={isBindConfirmed ? aonBlue : "gray.200"}
                  _hover={{
                    bg: isBindConfirmed ? "#00647a" : "gray.300"
                  }}
                >
                  Bind
                </Button>
              </Flex>
            </>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default BindOptionView; 