import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Flex,
  Spinner,
  Divider,
  useToast,
  Icon,
  SimpleGrid,
  Badge,
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import { FaFileAlt, FaFileContract } from 'react-icons/fa';
import RenewalStrategyView from './renewal/RenewalStrategyView';
import { useQuotesData } from '../App';

const ServiceView = () => {
  const [showPdf, setShowPdf] = useState(false);
  const [showRenewalStrategy, setShowRenewalStrategy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  const toast = useToast();
  const { quotes, isLoading: quotesLoading } = useQuotesData();

  // Updated documents array with only two documents
  const documents = [
    { 
      id: 'placement', 
      title: 'Placement Summary',
      description: 'Complete details of your insurance placement and coverage',
      type: 'pdf',
      icon: FaFileContract,
      path: '/docs/The Complete Guide To Claude AI.pdf'
    },
    { 
      id: 'renewal', 
      title: 'Renewal Strategy',
      description: 'Strategic approach and recommendations for your policy renewal',
      type: 'interactive',
      icon: FaFileAlt,
      path: null
    }
  ];

  // View document handler
  const handleViewDocument = (document) => {
    setActiveDocument(document);
    
    if (document.id === 'renewal') {
      setShowRenewalStrategy(true);
      setShowPdf(false);
      
      // Simulate loading time
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Renewal Strategy loaded",
          description: "Renewal Strategy document is ready to view",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }, 1000);
    } else {
      setShowPdf(true);
      setShowRenewalStrategy(false);
      setIsLoading(true);
      
      // Simulate loading time
      setTimeout(() => {
        setIsLoading(false);
        // Use toast to show a notification when document is loaded
        toast({
          title: "Document loaded",
          description: `${document.title} is ready to view`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }, 1000);
    }
  };

  const handleCloseDocument = () => {
    setShowPdf(false);
    setShowRenewalStrategy(false);
    setActiveDocument(null);
  };

  return (
    <Box p={6}>
      <VStack spacing={8} align="stretch">
        {/* Summary Section */}
        <Box 
          borderWidth="1px" 
          borderRadius="md" 
          p={6} 
          borderColor="gray.200" 
          bg="white"
          boxShadow="sm"
        >
          <Flex align="center" mb={4}>
            <Icon as={FaFileAlt} mr={2} color="aon.blue.700" />
            <Heading size="lg" color="aon.blue.700">Service Documents</Heading>
          </Flex>
          
          <Text fontSize="md" color="gray.600" lineHeight="taller" mb={8}>
            Access and download important documentation related to your insurance policy. 
            Review your placement summary and renewal strategy. Click on any document to view 
            it in the browser or download for your records.
          </Text>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {documents.map(doc => (
              <Box 
                key={doc.id}
                borderWidth="1px"
                borderRadius="md"
                p={4}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ 
                  transform: 'translateY(-2px)',
                  shadow: 'md',
                  borderColor: 'aon.blue.500' 
                }}
                onClick={() => handleViewDocument(doc)}
                bg="white"
              >
                <Flex direction="column" height="100%" justify="space-between">
                  <Icon 
                    as={doc.icon} 
                    boxSize="2.5rem" 
                    mb={3} 
                    color="aon.blue.700" 
                  />
                  
                  <Heading size="md" mb={2} fontWeight="500" color="#333">
                    {doc.title}
                  </Heading>
                  
                  <Text color="gray.600" fontSize="sm" mb={4}>
                    {doc.description}
                  </Text>
                  
                  <Badge 
                    alignSelf="flex-start" 
                    colorScheme="blue" 
                    variant="subtle"
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    {doc.type.toUpperCase()}
                  </Badge>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* PDF Viewer Section - Using iframe instead of react-pdf */}
        {showPdf && activeDocument && (
          <Box 
            borderWidth="1px" 
            borderRadius="md" 
            borderColor="gray.200" 
            overflow="hidden"
            boxShadow="sm"
            bg="white"
          >
            <Flex 
              bg="gray.50" 
              p={4} 
              borderBottomWidth="1px" 
              borderBottomColor="gray.200"
              justifyContent="space-between"
              alignItems="center"
            >
              <Flex align="center">
                <Icon as={activeDocument.icon} mr={2} color="aon.blue.700" />
                <Heading size="md" color="#333">{activeDocument.title}</Heading>
              </Flex>
              
              <Button
                leftIcon={<DownloadIcon />}
                as="a"
                href={activeDocument.path}
                download={`${activeDocument.title}.pdf`}
                colorScheme="blue"
                size="sm"
              >
                Download
              </Button>
            </Flex>
            
            <Box p={6} bg="gray.50" height="800px" display="flex" justifyContent="center">
              {isLoading ? (
                <Flex justify="center" align="center" height="100%">
                  <VStack>
                    <Spinner size="xl" color="aon.blue.700" thickness="4px" />
                    <Text mt={4} color="gray.600">Loading document...</Text>
                  </VStack>
                </Flex>
              ) : (
                <Box width="100%" height="100%">
                  <iframe
                    src={activeDocument.path}
                    title={activeDocument.title}
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                  />
                </Box>
              )}
            </Box>
            
            <Divider />
            
            {/* Footer with additional controls */}
            <Flex p={4} justifyContent="space-between" bg="gray.50" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                This document has been prepared for your insurance records.
              </Text>
              
              <Button
                variant="outline"
                colorScheme="blue"
                size="sm"
                onClick={handleCloseDocument}
              >
                Close Document
              </Button>
            </Flex>
          </Box>
        )}

        {/* Renewal Strategy View - Interactive component */}
        {showRenewalStrategy && !isLoading && (
          <Box 
            borderWidth="1px" 
            borderRadius="md" 
            borderColor="gray.200" 
            overflow="hidden"
            boxShadow="sm"
            bg="white"
          >
            <Flex 
              bg="gray.50" 
              p={4} 
              borderBottomWidth="1px" 
              borderBottomColor="gray.200"
              justifyContent="space-between"
              alignItems="center"
            >
              <Flex align="center">
                <Icon as={activeDocument.icon} mr={2} color="aon.blue.700" />
                <Heading size="md" color="#333">{activeDocument.title}</Heading>
              </Flex>
              
              <Button
                variant="outline"
                colorScheme="blue"
                size="sm"
                onClick={handleCloseDocument}
              >
                Close Document
              </Button>
            </Flex>
            
            <Box p={6}>
              <RenewalStrategyView quotes={quotes} />
            </Box>
          </Box>
        )}

        {/* Loading Spinner for Renewal Strategy */}
        {showRenewalStrategy && isLoading && (
          <Box 
            borderWidth="1px" 
            borderRadius="md" 
            borderColor="gray.200" 
            overflow="hidden"
            boxShadow="sm"
            bg="white"
            p={6}
            height="400px"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <VStack>
              <Spinner size="xl" color="aon.blue.700" thickness="4px" />
              <Text mt={4} color="gray.600">Loading Renewal Strategy...</Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default ServiceView; 