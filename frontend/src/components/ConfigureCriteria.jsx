import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Flex,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  Select,
  Checkbox,
  Grid,
  GridItem,
  Spacer,
  Divider,
  Tag,
  TagLabel,
  TagCloseButton,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from '@chakra-ui/react';

const sampleCriteria = [
  { id: 1, name: 'Minimum Carrier Rating', value: 'A- or better' },
  { id: 2, name: 'Premium Range', value: 'Under $500,000' },
  { id: 3, name: 'Required Sublimits', value: '3 high importance sublimits' },
  { id: 4, name: 'Minimum Coverage Score', value: '75%' }
];

const ConfigureCriteria = () => {
  const [criteria, setCriteria] = useState(sampleCriteria);
  const [selectedCriterion, setSelectedCriterion] = useState('');
  const [criterionValue, setCriterionValue] = useState('');
  const toast = useToast();

  // Add a new criterion
  const addCriterion = () => {
    if (!selectedCriterion || !criterionValue) {
      toast({
        title: 'Unable to add criterion',
        description: 'Please select a criterion and provide a value',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newCriterion = {
      id: Date.now(),
      name: selectedCriterion,
      value: criterionValue
    };

    setCriteria([...criteria, newCriterion]);
    setSelectedCriterion('');
    setCriterionValue('');

    toast({
      title: 'Criterion added',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Remove a criterion
  const removeCriterion = (id) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  // Save all criteria
  const saveCriteria = () => {
    // In a real app, you would save the criteria to backend/state management here
    toast({
      title: 'Criteria saved successfully',
      description: 'Your configuration has been saved',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box p={6}>
      <Box mb={6}>
        <Heading size="lg" fontWeight="500" color="#333333" mb={2}>
          Configure Selection Criteria
        </Heading>
        <Text color="gray.600" fontSize="14px">
          Define the criteria for selecting optimal insurance options
        </Text>
      </Box>

      {/* Current Criteria */}
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
            Current Selection Criteria
          </Heading>
        </Box>
        
        <Box p={5}>
          <Text mb={4} color="gray.600" fontSize="14px">
            These criteria will be used to filter and select the best options for your insurance program.
          </Text>
          
          <Box 
            overflowX="auto" 
            width="100%" 
            margin="0" 
            padding="0" 
            minWidth="100%" 
            height="auto" 
            maxHeight="320px"
            overflow="auto"
            mb={4}
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
                  <Th width="40%" color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Criterion</Th>
                  <Th width="40%" color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Value</Th>
                  <Th width="20%" color="gray.600" fontWeight="500" padding="12px 16px" fontSize="15px">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {criteria.length > 0 ? (
                  criteria.map((criterion, idx) => (
                    <Tr 
                      key={criterion.id}
                      _hover={{ bg: "gray.50" }}
                      borderBottom="1px" 
                      borderColor="gray.200"
                      bg={idx % 2 === 0 ? "white" : "#F9FCFC"}
                    >
                      <Td padding="12px 16px" fontWeight="500" fontSize="15px">{criterion.name}</Td>
                      <Td padding="12px 16px" fontSize="15px">{criterion.value}</Td>
                      <Td padding="12px 16px" fontSize="15px">
                        <Button 
                          size="sm" 
                          colorScheme="red" 
                          variant="outline"
                          onClick={() => removeCriterion(criterion.id)}
                        >
                          Remove
                        </Button>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={3} textAlign="center" py={4} color="gray.500">
                      No criteria defined yet. Add some below.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Box>

      {/* Add New Criterion */}
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
            Add New Criterion
          </Heading>
        </Box>
        
        <Box p={5}>
          <Grid templateColumns="repeat(12, 1fr)" gap={4}>
            <GridItem colSpan={{ base: 12, md: 5 }}>
              <FormControl isRequired>
                <FormLabel fontWeight="500" fontSize="15px" color="gray.700">Criterion Type</FormLabel>
                <Select 
                  placeholder="Select criterion type" 
                  value={selectedCriterion}
                  onChange={(e) => setSelectedCriterion(e.target.value)}
                  borderColor="gray.300"
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: "#0051A8", boxShadow: "0 0 0 1px #0051A8" }}
                  fontSize="15px"
                >
                  <option value="Minimum Carrier Rating">Minimum Carrier Rating</option>
                  <option value="Premium Range">Premium Range</option>
                  <option value="Required Sublimits">Required Sublimits</option>
                  <option value="Minimum Coverage Score">Minimum Coverage Score</option>
                  <option value="Maximum Deductible">Maximum Deductible</option>
                  <option value="Program Structure">Program Structure</option>
                </Select>
              </FormControl>
            </GridItem>
            
            <GridItem colSpan={{ base: 12, md: 5 }}>
              <FormControl isRequired>
                <FormLabel fontWeight="500" fontSize="15px" color="gray.700">Value</FormLabel>
                <Input 
                  placeholder="Enter criterion value" 
                  value={criterionValue}
                  onChange={(e) => setCriterionValue(e.target.value)}
                  borderColor="gray.300"
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: "#0051A8", boxShadow: "0 0 0 1px #0051A8" }}
                  fontSize="15px"
                />
              </FormControl>
            </GridItem>
            
            <GridItem colSpan={{ base: 12, md: 2 }} alignSelf="flex-end">
              <Button 
                onClick={addCriterion} 
                colorScheme="blue" 
                width="100%"
                fontSize="15px"
              >
                Add Criterion
              </Button>
            </GridItem>
          </Grid>
        </Box>
      </Box>
      
      {/* Save Button */}
      <Flex justify="flex-end">
        <Button 
          colorScheme="blue" 
          size="lg" 
          onClick={saveCriteria}
          mt={2}
          fontSize="16px"
          px={8}
        >
          Save Criteria
        </Button>
      </Flex>
    </Box>
  );
};

export default ConfigureCriteria; 