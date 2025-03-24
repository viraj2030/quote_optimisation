import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Spinner,
  useToast,
} from '@chakra-ui/react';

function GenerateOptions({ 
  onSelectOption, 
  options = [], 
  optionsParams, 
  isLoading, 
  onFilterOptions,
}) {
  const toast = useToast();
  const [selectedOptionId, setSelectedOptionId] = useState(null);

  const handleFilterChange = () => {
    onFilterOptions(optionsParams.premiumRange, optionsParams.coverageRange);
  };

  const handleViewOption = (option) => {
    setSelectedOptionId(option.id);
    onSelectOption(option);
  };

  const handlePremiumRangeChange = (value) => {
    onFilterOptions(value, optionsParams.coverageRange);
  };

  const handleCoverageRangeChange = (value) => {
    onFilterOptions(optionsParams.premiumRange, value);
  };

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <VStack spacing={6} align="stretch">
        <Heading size="md">Generated Options</Heading>
        
        {optionsParams.minPremium === 0 ? (
          <Box textAlign="center" py={4}>
            <Text fontSize="sm" color="gray.500">
              Click the "Optimize & Generate Options" button in the sidebar to generate options.
            </Text>
          </Box>
        ) : (
          <>
            <Box>
              <Text fontWeight="medium">Minimum Premium: ${optionsParams.minPremium.toLocaleString()}</Text>
              <Text fontWeight="medium">Premium at Maximum Coverage: ${optionsParams.maxPremium.toLocaleString()}</Text>
            </Box>
            
            <Box>
              <Heading size="sm" mb={2}>Filtering Options</Heading>
              <VStack spacing={4} align="stretch">
                {options.length > 0 && (
                  <>
                    <Box>
                      <Text mb={2}>Select Achieved Premium Range</Text>
                      <RangeSlider 
                        min={optionsParams.minPremium} 
                        max={optionsParams.maxPremium} 
                        step={(optionsParams.maxPremium - optionsParams.minPremium) / 100}
                        value={optionsParams.premiumRange}
                        onChange={handlePremiumRangeChange}
                        onChangeEnd={handleFilterChange}
                      >
                        <RangeSliderTrack>
                          <RangeSliderFilledTrack />
                        </RangeSliderTrack>
                        <RangeSliderThumb index={0} />
                        <RangeSliderThumb index={1} />
                      </RangeSlider>
                      <HStack justify="space-between">
                        <Text fontSize="sm">${optionsParams.premiumRange[0].toLocaleString()}</Text>
                        <Text fontSize="sm">${optionsParams.premiumRange[1].toLocaleString()}</Text>
                      </HStack>
                    </Box>
                    
                    <Box>
                      <Text mb={2}>Select Coverage Score Range</Text>
                      <RangeSlider 
                        min={optionsParams.coverageRange?.[0] || 0} 
                        max={optionsParams.coverageRange?.[1] || 100} 
                        step={1}
                        value={optionsParams.coverageRange}
                        onChange={handleCoverageRangeChange}
                        onChangeEnd={handleFilterChange}
                      >
                        <RangeSliderTrack>
                          <RangeSliderFilledTrack />
                        </RangeSliderTrack>
                        <RangeSliderThumb index={0} />
                        <RangeSliderThumb index={1} />
                      </RangeSlider>
                      <HStack justify="space-between">
                        <Text fontSize="sm">{optionsParams.coverageRange[0].toFixed(1)}%</Text>
                        <Text fontSize="sm">{optionsParams.coverageRange[1].toFixed(1)}%</Text>
                      </HStack>
                    </Box>
                  </>
                )}
              </VStack>
            </Box>
            
            {optionsParams.filteredOptions && optionsParams.filteredOptions.length > 0 ? (
              <Box>
                <Heading size="sm" mb={2}>Generated Options</Heading>
                <Text mb={4} fontSize="sm">
                  Showing {optionsParams.filteredOptions.length} options from a total of {options.length}
                </Text>
                <Box maxHeight="400px" overflowY="auto" borderWidth="1px" borderRadius="md" borderColor="gray.200">
                  <Table variant="simple" size="sm">
                    <Thead position="sticky" top={0} bg="white" zIndex={1} borderBottomWidth="1px">
                      <Tr>
                        <Th>Option</Th>
                        <Th>Total Signed Premium</Th>
                        <Th>Total Program Coverage</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {optionsParams.filteredOptions.map((option, idx) => (
                        <Tr key={option.id} bg={selectedOptionId === option.id ? "green.50" : undefined}>
                          <Td>{idx + 1}</Td>
                          <Td>${option.total_premium.toLocaleString()}</Td>
                          <Td>{option.avg_coverage.toFixed(2)}%</Td>
                          <Td>
                            <Button 
                              size="xs" 
                              colorScheme={selectedOptionId === option.id ? "green" : "blue"}
                              onClick={() => handleViewOption(option)}
                            >
                              {selectedOptionId === option.id ? "Selected" : "Select"}
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            ) : (
              <Box textAlign="center" py={4}>
                {isLoading ? (
                  <Spinner />
                ) : (
                  <Text>No options match the selected filters</Text>
                )}
              </Box>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}

export default GenerateOptions;