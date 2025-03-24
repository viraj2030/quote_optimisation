import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Grid,
  GridItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Button,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend,
  ArcElement,
  DoughnutController 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  DoughnutController
);

function QuoteStructureVisual({ option }) {
  const containerRef = useRef(null);
  
  // Generate a color palette for carriers
  const generateColorPalette = (count) => {
    const baseColors = [
      'rgba(54, 162, 235, %a)',    // Blue
      'rgba(75, 192, 192, %a)',    // Teal
      'rgba(255, 99, 132, %a)',    // Red
      'rgba(255, 159, 64, %a)',    // Orange
      'rgba(153, 102, 255, %a)',   // Purple
      'rgba(255, 205, 86, %a)',    // Yellow
      'rgba(201, 203, 207, %a)',   // Grey
      'rgba(0, 204, 150, %a)',     // Green
      'rgba(255, 99, 71, %a)',     // Tomato
      'rgba(106, 90, 205, %a)',    // Slate Blue
    ];
    
    const colors = {};
    let colorIndex = 0;
    
    // Group quotes by carrier to ensure consistent colors
    const carriers = Array.from(new Set(
      option.solution
        .filter(quote => quote.SignedCapacity > 0)
        .map(quote => quote.Carrier)
    ));
    
    carriers.forEach(carrier => {
      const colorTemplate = baseColors[colorIndex % baseColors.length];
      colors[carrier] = {
        bg: colorTemplate.replace('%a', '0.8'),
        border: colorTemplate.replace('%a', '1'),
      };
      colorIndex++;
    });
    
    return colors;
  };
  
  // Prepare data for mudmap visualization
  const prepareVisualizationData = () => {
    const layers = ['Primary $10M', '$10M xs $10M', '$10M xs $20M'].reverse(); // Reverse to match insurance tower structure
    const layerData = {};
    const carrierColors = generateColorPalette();
    
    layers.forEach(layer => {
      const quotes = option.solution.filter(q => q.Layer === layer && q.SignedCapacity > 0);
      
      // Normalize allocation percentages to ensure they sum to exactly 100%
      const totalAllocation = quotes.reduce((sum, q) => sum + q.AllocationPercentage, 0);
      const normalizedQuotes = quotes.map(q => ({
        ...q,
        // Adjust allocation percentage to ensure total is exactly 100%
        NormalizedAllocationPercentage: (q.AllocationPercentage / totalAllocation) * 100
      }));
      
      layerData[layer] = {
        quotes: normalizedQuotes.sort((a, b) => b.NormalizedAllocationPercentage - a.NormalizedAllocationPercentage),
        totalCapacity: quotes.reduce((sum, q) => sum + q.SignedCapacity, 0),
        totalPremium: quotes.reduce((sum, q) => sum + q.SignedPremium, 0)
      };
    });
    
    return { layers, layerData, carrierColors };
  };
  
  return (
    <Box 
      ref={containerRef} 
      borderWidth="1px" 
      borderRadius="lg" 
      p={4} 
      bg="white"
      position="relative"
    >
      <Heading size="sm" mb={4}>Placement Structure Visualization</Heading>
      <Text mb={4}>Insurance tower structure with carrier allocation visualization</Text>
      
      {(() => {
        const { layers, layerData, carrierColors } = prepareVisualizationData();
        const layerHeight = 100; // Height of each layer in pixels
        const maxWidth = 1200;   // Max width for the visualization
        
        return (
          <VStack spacing={0} align="stretch" mb={6}>
            {/* Y-axis labels */}
            <Flex height="30px" mb={2}>
              <Box width="150px"></Box>
              <Flex flex={1} position="relative">
                <Text 
                  position="absolute" 
                  top="0" 
                  left="50%" 
                  transform="translateX(-50%)"
                  fontWeight="bold"
                >
                  Attachment Point
                </Text>
              </Flex>
            </Flex>
            
            {/* Layers */}
            {layers.map((layer, idx) => {
              const data = layerData[layer];
              const yPos = idx * layerHeight;
              let xOffset = 0;
              
              return (
                <Flex key={layer} height={`${layerHeight}px`} mb={idx === layers.length - 1 ? 4 : 0}>
                  {/* Layer label */}
                  <Box width="150px" pr={4} display="flex" alignItems="center" justifyContent="flex-end">
                    <Text fontWeight="bold">{layer}</Text>
                  </Box>
                  
                  {/* Carrier blocks */}
                  <Box position="relative" flex={1} borderWidth="1px" borderRadius="md">
                    {data.quotes.map((quote, i) => {
                      // Use normalized percentage to avoid exceeding 100%
                      const width = (quote.NormalizedAllocationPercentage) + '%';
                      const color = carrierColors[quote.Carrier];
                      const blockStyle = {
                        position: 'absolute',
                        top: '0',
                        left: xOffset + '%',
                        width: width,
                        height: '100%',
                        backgroundColor: color.bg,
                        borderRight: '1px solid white',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '0 8px',
                      };
                      
                      // Use normalized percentage for xOffset calculation
                      xOffset += quote.NormalizedAllocationPercentage;
                      
                      return (
                        <Tooltip 
                          key={i}
                          label={
                            <VStack align="start" spacing={1} p={1}>
                              <Text fontWeight="bold">{quote.Carrier}</Text>
                              <Text>Rating: {quote.CreditRating}</Text>
                              <Text>Allocation: {quote.NormalizedAllocationPercentage.toFixed(2)}%</Text>
                              <Text>Capacity: ${(quote.SignedCapacity * 1000000).toLocaleString()}</Text>
                              <Text>Premium: ${quote.SignedPremium.toLocaleString()}</Text>
                              <Text>Coverage: {(quote.Coverage_Score * 100).toFixed(0)}%</Text>
                            </VStack>
                          }
                          placement="top"
                          hasArrow
                        >
                          <Box style={blockStyle}>
                            {quote.NormalizedAllocationPercentage > 10 && (
                              <>
                                <Text fontSize="sm" fontWeight="bold" noOfLines={1}>{quote.Carrier}</Text>
                                <Text fontSize="xs" noOfLines={1}>{quote.NormalizedAllocationPercentage.toFixed(1)}%</Text>
                              </>
                            )}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Flex>
              );
            })}
            
            {/* X-axis labels */}
            <Flex>
              <Box width="150px"></Box>
              <Flex flex={1} justifyContent="space-between" px={4}>
                <Text>0%</Text>
                <Text>25%</Text>
                <Text>50%</Text>
                <Text>75%</Text>
                <Text>100%</Text>
              </Flex>
            </Flex>
            
            {/* Legend */}
            <Box mt={6} borderTopWidth="1px" pt={4}>
              <Text fontWeight="bold" mb={2}>Carriers</Text>
              <Flex flexWrap="wrap" gap={2}>
                {Object.entries(carrierColors).map(([carrier, color], idx) => (
                  <HStack key={idx} borderWidth="1px" borderRadius="md" px={2} py={1} bg={color.bg}>
                    <Text fontSize="sm">{carrier}</Text>
                  </HStack>
                ))}
              </Flex>
            </Box>
          </VStack>
        );
      })()}
    </Box>
  );
}

function OptionDetailView({ option, initialTab }) {
  // React hooks must be called at the top level, before any conditionals
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');
  
  // Map the initialTab prop to the index of the tab to be selected
  function getInitialTabIndex() {
    switch(initialTab) {
      case 'layer': return 0;
      case 'carrier': return 1;
      case 'rating': return 2;
      case 'visual': return 3;
      default: return 0;
    }
  };

  // Debug: Check option data
  console.log("OptionDetailView received option:", option);
  
  // If no option is selected, show a message
  if (!option) {
    return (
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" textAlign="center">
        <Text>Please generate options and select one to view its details.</Text>
      </Box>
    );
  }

  // Check if required carriers are included in the option
  if (option['Required Carriers Included']) {
    console.log("Required carriers that should be included:", option['Required Carriers Included']);
  }
  
  // Check all carriers with allocation in the solution
  const includedCarriers = [...new Set(option.solution
    .filter(quote => quote.SignedCapacity > 0)
    .map(quote => quote.Carrier)
  )];
  console.log("Carriers with allocation in solution:", includedCarriers);
  
  if (!option || !option.solution) {
    return (
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" textAlign="center">
        <Text>Select an option to view details</Text>
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
  
  // Calculate total capacity and carriers by layer
  const layerStats = layers.map(layer => {
    const quotes = quotesByLayer[layer];
    const totalCapacity = quotes.reduce((sum, q) => sum + q.SignedCapacity, 0);
    const totalLayerPremium = quotes.reduce((sum, q) => sum + q.SignedPremium, 0);
    const avgLayerCoverage = quotes.reduce((sum, q) => sum + (q.Coverage_Score * q.SignedCapacity), 0) / 
                            (totalCapacity || 1);
    const carriers = quotes.length;
    
    return {
      layer,
      totalCapacity,
      totalLayerPremium,
      avgLayerCoverage,
      carriers
    };
  });
  
  // Get distribution by credit rating
  const ratingDistribution = Object.entries(
    option.solution
      .filter(quote => quote.SignedCapacity > 0)
      .reduce((acc, quote) => {
        if (!acc[quote.CreditRating]) {
          acc[quote.CreditRating] = {
            capacity: 0,
            premium: 0,
            count: 0
          };
        }
        acc[quote.CreditRating].capacity += quote.SignedCapacity;
        acc[quote.CreditRating].premium += quote.SignedPremium;
        acc[quote.CreditRating].count += 1;
        return acc;
      }, {})
  ).sort((a, b) => {
    // Sort ratings AAA, AA+, AA, AA-, A+, A, A-, etc.
    const ratingOrder = {
      'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4, 
      'A+': 5, 'A': 6, 'A-': 7, 'BBB+': 8, 'BBB': 9, 'BBB-': 10,
      'BB+': 11, 'BB': 12, 'BB-': 13, 'B+': 14, 'B': 15, 'B-': 16
    };
    return (ratingOrder[a[0]] || 100) - (ratingOrder[b[0]] || 100);
  });
  
  // Get distribution by carrier across all layers
  const carrierDistribution = Object.entries(
    option.solution
      .filter(quote => quote.SignedCapacity > 0)
      .reduce((acc, quote) => {
        if (!acc[quote.Carrier]) {
          acc[quote.Carrier] = {
            capacity: 0,
            premium: 0,
            layers: new Set(),
            coverage: 0,
            weightedCoverage: 0
          };
        }
        acc[quote.Carrier].capacity += quote.SignedCapacity;
        acc[quote.Carrier].premium += quote.SignedPremium;
        acc[quote.Carrier].layers.add(quote.Layer);
        acc[quote.Carrier].weightedCoverage += quote.Coverage_Score * quote.SignedCapacity;
        return acc;
      }, {})
  ).map(([carrier, data]) => {
    return {
      carrier,
      ...data,
      avgCoverage: data.weightedCoverage / data.capacity,
      layers: Array.from(data.layers)
    };
  }).sort((a, b) => b.capacity - a.capacity);
  
  // Generate a color palette for carriers
  const generateColorPalette = (count) => {
    const baseColors = [
      'rgba(54, 162, 235, %a)',    // Blue
      'rgba(75, 192, 192, %a)',    // Teal
      'rgba(255, 99, 132, %a)',    // Red
      'rgba(255, 159, 64, %a)',    // Orange
      'rgba(153, 102, 255, %a)',   // Purple
      'rgba(255, 205, 86, %a)',    // Yellow
      'rgba(201, 203, 207, %a)',   // Grey
      'rgba(0, 204, 150, %a)',     // Green
      'rgba(255, 99, 71, %a)',     // Tomato
      'rgba(106, 90, 205, %a)',    // Slate Blue
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
      const colorTemplate = baseColors[i % baseColors.length];
      colors.push(colorTemplate.replace('%a', '0.7'));
    }
    return colors;
  };
  
  // Prepare data for the layer capacity chart
  const prepareLayerCapacityData = () => {
    const datasets = layers.map((layer, layerIndex) => {
      const quotes = quotesByLayer[layer];
      const labels = quotes.map(q => q.Carrier);
      const data = quotes.map(q => q.SignedCapacity);
      
      const colors = generateColorPalette(quotes.length);
      
      return {
        layer,
        data: {
          labels,
          datasets: [
            {
              label: 'Capacity (in $M)',
              data,
              backgroundColor: colors,
              borderColor: colors.map(c => c.replace('0.7', '1')),
              borderWidth: 1,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 15,
                font: {
                  size: 10
                }
              }
            },
            title: {
              display: true,
              text: `${layer} - Capacity Distribution ($10M)`
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const carrier = context.label;
                  const capacity = context.raw;
                  const quote = quotes.find(q => q.Carrier === carrier);
                  const percentage = quote ? quote.AllocationPercentage.toFixed(1) : '0.0';
                  return [
                    `Capacity: $${(capacity * 1000000).toLocaleString()}`,
                    `Allocation: ${percentage}%`,
                    `Rating: ${quote ? quote.CreditRating : ''}`
                  ];
                }
              }
            }
          }
        }
      };
    });
    
    return datasets;
  };
  
  const layerCapacityData = prepareLayerCapacityData();
  
  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <VStack spacing={6} align="stretch">
        <Box borderWidth="1px" borderRadius="lg" p={4} bg="blue.50">
          <Heading size="md" mb={4}>Optimal Placement Structure</Heading>
          
          <Grid templateColumns="repeat(3, 1fr)" gap={6}>
            <GridItem>
              <Stat>
                <StatLabel>Total Premium</StatLabel>
                <StatNumber>${totalPremium.toLocaleString()}</StatNumber>
                <StatHelpText>All layers combined</StatHelpText>
              </Stat>
            </GridItem>
            <GridItem>
              <Stat>
                <StatLabel>Average Coverage Score</StatLabel>
                <StatNumber>{avgCoverage.toFixed(2)}%</StatNumber>
                <StatHelpText>Weighted by capacity</StatHelpText>
              </Stat>
            </GridItem>
            <GridItem>
              <Stat>
                <StatLabel>Total Capacity</StatLabel>
                <StatNumber>$30M</StatNumber>
                <StatHelpText>Across all layers</StatHelpText>
              </Stat>
            </GridItem>
          </Grid>
        </Box>
        
        <Tabs variant="soft-rounded" colorScheme="blue" size="md" defaultIndex={getInitialTabIndex()}>
          <TabList mb={4}>
            <Tab>Layer Summary</Tab>
            <Tab>Carrier Distribution</Tab>
            <Tab>Credit Rating</Tab>
            <Tab>Visualization</Tab>
          </TabList>
          
          <TabPanels>
            {/* LAYER SUMMARY TAB */}
            <TabPanel p={0}>
              <VStack spacing={6} align="stretch">
                {layerStats.map((stats, idx) => (
                  <Box key={stats.layer} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    p={4} 
                    bg={idx % 2 === 0 ? "gray.50" : "white"}
                  >
                    <Heading size="md" mb={4}>{stats.layer}</Heading>
                    
                    <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={4}>
                      <Stat>
                        <StatLabel>Premium</StatLabel>
                        <StatNumber>${stats.totalLayerPremium.toLocaleString()}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Coverage</StatLabel>
                        <StatNumber>{(stats.avgLayerCoverage * 100).toFixed(2)}%</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Carriers</StatLabel>
                        <StatNumber>{stats.carriers}</StatNumber>
                      </Stat>
                    </Grid>
                    
                    <Table variant="simple" size="sm">
                      <Thead bg={tableHeaderBg}>
                        <Tr>
                          <Th>Carrier</Th>
                          <Th>Credit Rating</Th>
                          <Th>Allocation</Th>
                          <Th>Signed Capacity</Th>
                          <Th>Signed Premium</Th>
                          <Th>Coverage Score</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {quotesByLayer[stats.layer].map((quote, idx) => (
                          <Tr key={idx}>
                            <Td fontWeight="medium">{quote.Carrier}</Td>
                            <Td>
                              <Badge 
                                colorScheme={
                                  quote.CreditRating.includes('AAA') ? 'green' :
                                  quote.CreditRating.includes('AA') ? 'teal' :
                                  quote.CreditRating.includes('A+') ? 'blue' :
                                  quote.CreditRating.includes('A') ? 'cyan' :
                                  'yellow'
                                }
                              >
                                {quote.CreditRating}
                              </Badge>
                            </Td>
                            <Td>{quote.AllocationPercentage.toFixed(2)}%</Td>
                            <Td>${(quote.SignedCapacity * 1000000).toLocaleString()}</Td>
                            <Td>${quote.SignedPremium.toLocaleString()}</Td>
                            <Td>{(quote.Coverage_Score * 100).toFixed(0)}%</Td>
                          </Tr>
                        ))}
                      </Tbody>
                      <Tfoot bg="gray.100">
                        <Tr>
                          <Th>Total</Th>
                          <Th></Th>
                          <Th>100%</Th>
                          <Th>${(stats.totalCapacity * 1000000).toLocaleString()}</Th>
                          <Th>${stats.totalLayerPremium.toLocaleString()}</Th>
                          <Th>{(stats.avgLayerCoverage * 100).toFixed(0)}%</Th>
                        </Tr>
                      </Tfoot>
                    </Table>
                  </Box>
                ))}
              </VStack>
            </TabPanel>
            
            {/* CARRIER DISTRIBUTION TAB */}
            <TabPanel p={0}>
              <Box borderWidth="1px" borderRadius="lg" p={4}>
                <Heading size="sm" mb={4}>Distribution by Carrier</Heading>
                <Table variant="simple" size="sm">
                  <Thead bg={tableHeaderBg}>
                    <Tr>
                      <Th>Carrier</Th>
                      <Th>Total Capacity</Th>
                      <Th>% of Program</Th>
                      <Th>Total Premium</Th>
                      <Th>Avg Coverage</Th>
                      <Th>Layers</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {carrierDistribution.map((data, idx) => (
                      <Tr key={idx}>
                        <Td fontWeight="medium">{data.carrier}</Td>
                        <Td>${(data.capacity * 1000000).toLocaleString()}</Td>
                        <Td>{((data.capacity / 30) * 100).toFixed(2)}%</Td>
                        <Td>${data.premium.toLocaleString()}</Td>
                        <Td>{(data.avgCoverage * 100).toFixed(1)}%</Td>
                        <Td>{data.layers.join(', ')}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                  <Tfoot bg="gray.100">
                    <Tr>
                      <Th>Total</Th>
                      <Th>$30,000,000</Th>
                      <Th>100%</Th>
                      <Th>${totalPremium.toLocaleString()}</Th>
                      <Th>{avgCoverage.toFixed(1)}%</Th>
                      <Th></Th>
                    </Tr>
                  </Tfoot>
                </Table>
              </Box>
            </TabPanel>
            
            {/* CREDIT RATING TAB */}
            <TabPanel p={0}>
              <Box borderWidth="1px" borderRadius="lg" p={4}>
                <Heading size="sm" mb={4}>Distribution by Credit Rating</Heading>
                <Table variant="simple" size="sm">
                  <Thead bg={tableHeaderBg}>
                    <Tr>
                      <Th>Credit Rating</Th>
                      <Th>Total Capacity</Th>
                      <Th>% of Program</Th>
                      <Th>Total Premium</Th>
                      <Th>Number of Lines</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {ratingDistribution.map(([rating, data], idx) => (
                      <Tr key={idx}>
                        <Td>
                          <Badge 
                            colorScheme={
                              rating.includes('AAA') ? 'green' :
                              rating.includes('AA') ? 'teal' :
                              rating.includes('A+') ? 'blue' :
                              rating.includes('A') ? 'cyan' :
                              'yellow'
                            }
                            fontSize="0.9em"
                            px={2}
                            py={1}
                          >
                            {rating}
                          </Badge>
                        </Td>
                        <Td>${(data.capacity * 1000000).toLocaleString()}</Td>
                        <Td>{((data.capacity / 30) * 100).toFixed(2)}%</Td>
                        <Td>${data.premium.toLocaleString()}</Td>
                        <Td>{data.count}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                  <Tfoot bg="gray.100">
                    <Tr>
                      <Th>Total</Th>
                      <Th>$30,000,000</Th>
                      <Th>100%</Th>
                      <Th>${totalPremium.toLocaleString()}</Th>
                      <Th>{option.solution.filter(q => q.SignedCapacity > 0).length}</Th>
                    </Tr>
                  </Tfoot>
                </Table>
              </Box>
            </TabPanel>
            
            {/* VISUALIZATION TAB */}
            <TabPanel p={0}>
              <VStack spacing={6} align="stretch">
                {/* Insurance Mudmap Visualization */}
                <QuoteStructureVisual option={option} />
                
                {/* Pie/Doughnut charts for capacity distribution by layer */}
                <Box borderWidth="1px" borderRadius="lg" p={4}>
                  <Heading size="sm" mb={4}>Layer Capacity Distribution</Heading>
                  <Text mb={3}>These charts show the capacity distribution within each layer.</Text>
                  
                  <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
                    {layerCapacityData.map((layerData, idx) => (
                      <Box key={layerData.layer} height="300px" p={2}>
                        <Doughnut data={layerData.data} options={layerData.options} />
                      </Box>
                    ))}
                  </Grid>
                </Box>
                
                {/* Layer summary cards */}
                <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                  {layers.map((layer, idx) => (
                    <Box key={layer} p={3} borderWidth="1px" borderRadius="md" bg={idx % 2 === 0 ? "gray.50" : "white"}>
                      <Heading size="xs" mb={2}>{layer}</Heading>
                      <Text>Carriers: {quotesByLayer[layer].length}</Text>
                      <Text>Total Premium: ${layerStats[idx].totalLayerPremium.toLocaleString()}</Text>
                      <Text>Avg Coverage: {(layerStats[idx].avgLayerCoverage * 100).toFixed(1)}%</Text>
                    </Box>
                  ))}
                </Grid>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
}

export default OptionDetailView; 