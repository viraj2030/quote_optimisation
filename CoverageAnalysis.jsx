import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  // ... other imports from existing file
} from '@chakra-ui/react';
import axios from 'axios';
// ... other imports from existing file

// Import our new component
import FeatureImpactVisualization from './FeatureImpactVisualization';

const CoverageAnalysis = () => {
  // ... existing state variables and useEffects
  
  // ... existing render functions for Global Impact and Quotes vs Submission tabs
  
  return (
    <Tabs variant="soft-rounded" colorScheme="blue" size="md">
      <TabList mb={4}>
        <Tab>Global Impact</Tab>
        <Tab>Quotes vs Submission</Tab>
        <Tab>Feature Impact</Tab>
      </TabList>
      
      <TabPanels>
        {/* Global Impact Tab */}
        <TabPanel>
          {renderGlobalImpact()}
        </TabPanel>
        
        {/* Quotes vs Submission Tab */}
        <TabPanel>
          {renderQuotesComparison()}
        </TabPanel>
        
        {/* Feature Impact Tab */}
        <TabPanel>
          <FeatureImpactVisualization />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default CoverageAnalysis; 