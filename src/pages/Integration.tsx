import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading';
import { supabase } from '../lib/supabase';

interface IntegrationResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST';
  url: string;
  sampleData?: any;
}

const Integration: React.FC = () => {
  const { user } = useAuth();
  const [partnerId, setPartnerId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [partnerPass, setPartnerPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<IntegrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('cities');
  const [importedProducts, setImportedProducts] = useState<any[]>([]);
  const [showProductReview, setShowProductReview] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);

  // API Endpoints configuration
  const apiEndpoints: ApiEndpoint[] = [
    {
      id: 'cities',
      name: 'Get Cities by Postal Code',
      description: 'Retrieve city information for seller location setup',
      method: 'GET',
      url: 'https://faas.plugo.world/partner/v1/cities?postalCode=80351'
    },
    {
      id: 'products',
      name: 'Get Product List',
      description: 'Retrieve available products with prices, images, and stock',
      method: 'GET',
      url: 'https://faas.plugo.world/partner/v1/products'
    },
    {
      id: 'create-order',
      name: 'Create Order',
      description: 'Sync order from chrome app to API',
      method: 'POST',
      url: 'https://faas.plugo.world/partner/v1/orders',
      sampleData: {
        "customer_name": "John Doe",
        "customer_phone": "+628123456789",
        "customer_address": "Jl. Raya Ubud No. 123",
        "city_id": 1471,
        "products": [
          {
            "product_id": "PROD001",
            "quantity": 2,
            "price": 50000
          }
        ],
        "total_amount": 100000
      }
    },
    {
      id: 'provinces',
      name: 'Get Provinces',
      description: 'Retrieve list of provinces for location setup',
      method: 'GET',
      url: 'https://faas.plugo.world/partner/v1/provinces'
    }
  ];

  const getCurrentEndpoint = (): ApiEndpoint => {
    return apiEndpoints.find(ep => ep.id === selectedEndpoint) || apiEndpoints[0];
  };

  const handleConnect = async () => {
    if (!vendorId.trim() || !apiKey.trim() || !partnerPass.trim() || !partnerId.trim()) {
      setError('Please fill in all required fields: Vendor ID, API Key, Partner Pass, and Partner ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Generate timestamp in UTC format: YYYY-MM-DD HH:mm:ss
      const now = new Date();
      const timeStamp = now.toISOString().replace('T', ' ').substring(0, 19);
      
      // Using user-provided credentials
      const partnerPASS = partnerPass;
      const partnerID = partnerId; // Using user input
      
      // Generate signedKey: SHA256(timeStamp + vendorID + partnerPASS + Plugo API Key)
      const signatureString = `${timeStamp}${vendorId}${partnerPASS}${apiKey}`;
      
      // Create SHA256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Get current endpoint configuration
      const endpoint = getCurrentEndpoint();
      
      // Prepare request options
      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers: {
          'partnerID': partnerID,
          'partnerPASS': partnerPASS,
          'signedKey': signedKey,
          'timeStamp': timeStamp,
          'vendorID': vendorId,
          'Content-Type': 'application/json'
        }
      };

      // Add body for POST requests
      if (endpoint.method === 'POST' && endpoint.sampleData) {
        requestOptions.body = JSON.stringify(endpoint.sampleData);
      }
      
      const response = await fetch(endpoint.url, requestOptions);

      const responseData = await response.json();
      
      if (response.ok) {
        setResponse({
          success: true,
          data: responseData
        });
      } else {
        // Display the exact API response for debugging
        setResponse({
          success: false,
          error: JSON.stringify(responseData, null, 2)
        });
      }
    } catch (err) {
      console.error('Integration error:', err);
      setResponse({
        success: false,
        error: err instanceof Error ? err.message : 'Connection failed'
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to import products from API
  const handleImportProducts = async () => {
    if (!vendorId.trim() || !apiKey.trim() || !partnerPass.trim() || !partnerId.trim()) {
      setError('Please fill in all required fields before importing products');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      // Generate timestamp and signature for products API
      const now = new Date();
      const timeStamp = now.toISOString().replace('T', ' ').substring(0, 19);
      const signatureString = `${timeStamp}${vendorId}${partnerPass}${apiKey}`;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const response = await fetch('https://faas.plugo.world/partner/v1/products', {
        method: 'GET',
        headers: {
          'partnerID': partnerId,
          'partnerPASS': partnerPass,
          'signedKey': signedKey,
          'timeStamp': timeStamp,
          'vendorID': vendorId,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      
      console.log('=== API RESPONSE DEBUG ===');
      console.log('Full API Response:', responseData);
      console.log('Response Status:', response.status);
      console.log('Response OK:', response.ok);
      
      if (response.ok && responseData.data) {
        console.log('Products from API:', responseData.data);
        
        const mappedProducts = responseData.data.map((product: any) => {
          console.log('=== PROCESSING PRODUCT ===');
          console.log('Original Product:', product);
          console.log('Product Variations:', product.productVariations);
          
          const mappedProduct = {
            // Original API data
            original: product,
            // Mapped data for our database
            mapped: {
              name: product.name,
              description: product.description,
              image: product.images?.[0]?.url || null,
              weight: product.weight || (product.productVariations?.[0]?.weight || 0),
              status: product.available,
              stock: 0, // As requested
              price: product.productVariations?.[0]?.price || 0,
              variants: product.productVariations?.map((variant: any) => ({
                price: variant.price,
                weight: variant.weight,
                sku: variant.sku,
                stock: 0
              })) || []
            }
          };
          
          console.log('Mapped Product:', mappedProduct);
          console.log('Mapped Variants:', mappedProduct.mapped.variants);
          console.log('Has Variants:', mappedProduct.mapped.variants && mappedProduct.mapped.variants.length > 0);
          
          return mappedProduct;
        });
        
        setImportedProducts(mappedProducts);
        setShowProductReview(true);
      } else {
        setError('Failed to fetch products: ' + (responseData.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Product import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import products');
    } finally {
      setIsImporting(false);
    }
  };

  // Function to toggle product selection
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  // Function to create selected products in Supabase
  const handleCreateProducts = async () => {
    if (selectedProducts.size === 0) {
      setError('Please select at least one product to create');
      return;
    }

    if (!user) {
      setError('You must be logged in to create products');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const selectedProductsData = importedProducts.filter(product => 
        selectedProducts.has(product.original.id)
      );

      let createdCount = 0;
      const errors = [];

      for (const productData of selectedProductsData) {
        try {
          const { mapped } = productData;
          
          console.log('=== CREATING MAIN PRODUCT ===');
          console.log('Product name:', mapped.name);
          console.log('Has variants check:', mapped.variants && mapped.variants.length > 0);
          console.log('Variants count:', mapped.variants ? mapped.variants.length : 0);
          
          // Create the main product
          const productInsertData = {
            user_id: user.id,
            name: mapped.name,
            description: mapped.description,
            image: mapped.image,
            weight: mapped.weight,
            status: mapped.status ? 'active' : 'inactive',
            stock: mapped.stock,
            price: mapped.price,
            has_variants: mapped.variants && mapped.variants.length > 0
          };
          
          console.log('Product data to insert:', productInsertData);
           
           const { data: product, error: productError } = await supabase
             .from('products')
             .insert(productInsertData)
            .select()
            .single();

          if (productError) {
            throw new Error(`Failed to create product "${mapped.name}": ${productError.message}`);
          }

          // Create product variants if they exist
           if (mapped.variants && mapped.variants.length > 0) {
             console.log('=== CREATING VARIANTS ===');
             console.log('Product ID:', product.id);
             console.log('Variants to create:', mapped.variants);
             
             const variantInserts = mapped.variants.map((variant: any, index: number) => {
               // Extract variant information from SKU
               const sku = variant.sku || `VAR${index + 1}`;
               let variantName = `Variant ${index + 1}`;
               
               // Try to extract meaningful variant info from SKU
               if (sku) {
                 // Remove product code prefix to get variant part
                 const productCode = productData.original.productCode || '';
                 let variantPart = sku;
                 
                 if (productCode && sku.startsWith(productCode)) {
                   variantPart = sku.substring(productCode.length);
                 }
                 
                 // Extract color/size information
                 const colorMatch = variantPart.match(/(Red|Green|Blue|Pink|Purple|Yellow|Black|White|Orange|Brown|Gray|Grey|Cobalt|Cloud|Joy)/i);
                 const sizeMatch = variantPart.match(/(\d+ML|\d+L|XS|S|M|L|XL|XXL|\d+)/i);
                 
                 const parts = [];
                 if (colorMatch) parts.push(colorMatch[1]);
                 if (sizeMatch) parts.push(sizeMatch[1]);
                 
                 if (parts.length > 0) {
                   variantName = parts.join(' - ');
                 } else if (variantPart && variantPart.length > 0) {
                   // Use the variant part as-is if no specific patterns found
                   variantName = variantPart;
                 }
               }
               
               const variantData = {
                 product_id: product.id,
                 variant_tier_1_value: variantName,
                 full_product_name: `${mapped.name} - ${variantName}`,
                 price: variant.price,
                 weight: variant.weight,
                 stock: variant.stock
               };
               
               console.log(`Variant ${index + 1} data:`, variantData);
               return variantData;
             });

            console.log('Inserting variants:', variantInserts);
            
            const { data: variantResult, error: variantError } = await supabase
              .from('product_variants')
              .insert(variantInserts)
              .select();

            if (variantError) {
              console.error(`Failed to create variants for "${mapped.name}": ${variantError.message}`);
              console.error('Variant error details:', variantError);
              // Don't fail the entire operation for variant errors
            } else {
              console.log('Successfully created variants:', variantResult);
            }
          }

          createdCount++;
        } catch (productErr) {
           console.error('Product creation error:', productErr);
           errors.push(productErr instanceof Error ? productErr.message : 'Unknown error');
         }
      }

      // Show results
      if (createdCount > 0) {
        let message = `Successfully created ${createdCount} product(s)`;
        if (errors.length > 0) {
          message += `. ${errors.length} product(s) failed to create.`;
        }
        
        setResponse({
          success: true,
          data: { 
            message,
            created: createdCount,
            failed: errors.length,
            errors: errors.length > 0 ? errors : undefined
          }
        });
      } else {
        setError(`Failed to create any products. Errors: ${errors.join(', ')}`);
      }
      
      // Reset states
      setShowProductReview(false);
      setImportedProducts([]);
      setSelectedProducts(new Set());
    } catch (err) {
      console.error('Product creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create products');
    } finally {
      setIsImporting(false);
    }
  };

  // Function to save integration credentials to Supabase
  const saveCredentials = async () => {
    if (!user) {
      setError('You must be logged in to save credentials');
      return;
    }

    if (!vendorId.trim() || !apiKey.trim() || !partnerPass.trim() || !partnerId.trim()) {
      setError('Please fill in all credential fields before saving');
      return;
    }

    setSavingCredentials(true);
    setError(null);

    try {
      // Check if credentials already exist for this user
      const { data: existingCredentials, error: checkError } = await supabase
        .from('integration_credentials')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking existing credentials: ${checkError.message}`);
      }

      const credentialData = {
        user_id: user.id,
        vendor_id: vendorId,
        api_key: apiKey,
        partner_id: partnerId,
        partner_pass: partnerPass
      };

      let result;
      if (existingCredentials) {
        // Update existing credentials
        result = await supabase
          .from('integration_credentials')
          .update(credentialData)
          .eq('user_id', user.id);
      } else {
        // Insert new credentials
        result = await supabase
          .from('integration_credentials')
          .insert(credentialData);
      }

      if (result.error) {
        throw new Error(`Failed to save credentials: ${result.error.message}`);
      }

      setResponse({
        success: true,
        data: { message: 'Integration credentials saved successfully!' }
      });
    } catch (err) {
      console.error('Credential save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setSavingCredentials(false);
    }
  };

  // Function to load integration credentials from Supabase
  const loadCredentials = async () => {
    if (!user) {
      return;
    }

    try {
      const { data: credentials, error } = await supabase
        .from('integration_credentials')
        .select('vendor_id, api_key, partner_id, partner_pass')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 406 errors gracefully

      // Handle 406 error (table might not exist or RLS blocking)
      if (error) {
        if (error.status === 406 || error.code === 'PGRST301' || error.message?.includes('406')) {
          console.warn('Integration credentials table may not exist or RLS is blocking access. Please run the database migration if needed.');
          return;
        }
        
        if (error.code === 'PGRST116') {
          // No credentials found (this is expected when no credentials are saved)
          return;
        }
        
        console.warn('Error loading credentials:', error.message);
        return;
      }

      if (credentials) {
        setVendorId(credentials.vendor_id || '');
        setApiKey(credentials.api_key || '');
        setPartnerId(credentials.partner_id || '');
        setPartnerPass(credentials.partner_pass || '');
      }
    } catch (err) {
      console.warn('Failed to load credentials:', err);
    }
  };

  // Load credentials when component mounts and user is available
  React.useEffect(() => {
    if (user) {
      loadCredentials();
    }
  }, [user]);

  if (loading || isImporting || savingCredentials) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Integration Settings</h2>
        <p className="text-xs text-gray-500 mt-1">
          Connect to Plugo Partner API for enhanced shipping and location services.
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Integration Form */}
      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Plugo Partner API</h3>
          
          {/* Information Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Production Credentials Required</h4>
                <p className="text-sm text-blue-700 mt-1">
                  To use this integration in production, you need valid partnerID and partnerPASS credentials from Plugo. 
                  The current implementation uses test credentials for demonstration purposes only.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* API Endpoint Selection */}
            <div>
              <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-2">
                API Endpoint to Test
              </label>
              <select
                id="endpoint"
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {apiEndpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {getCurrentEndpoint().description}
              </p>
            </div>

            {/* Vendor ID Field */}
            <div>
              <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-2">
                Vendor ID
              </label>
              <input
                type="text"
                id="vendorId"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                placeholder="Enter your Vendor ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* API Key Field */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API Key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Partner ID Field */}
            <div>
              <label htmlFor="partnerId" className="block text-sm font-medium text-gray-700 mb-2">
                Partner ID
              </label>
              <input
                type="text"
                id="partnerId"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="Enter your Partner ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Partner Pass Field */}
            <div>
              <label htmlFor="partnerPass" className="block text-sm font-medium text-gray-700 mb-2">
                Partner Pass
              </label>
              <input
                type="password"
                id="partnerPass"
                value={partnerPass}
                onChange={(e) => setPartnerPass(e.target.value)}
                placeholder="Enter your Partner Pass"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Save Credentials Button */}
            <div className="flex justify-end">
              <button
                onClick={saveCredentials}
                disabled={savingCredentials || !vendorId.trim() || !apiKey.trim() || !partnerPass.trim() || !partnerId.trim()}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  savingCredentials || !vendorId.trim() || !apiKey.trim() || !partnerPass.trim() || !partnerId.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {savingCredentials ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>

            {/* Request Details */}
            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Request Details</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium text-gray-600">Method:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-white ${
                    getCurrentEndpoint().method === 'GET' ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {getCurrentEndpoint().method}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">URL:</span>
                  <span className="ml-2 text-gray-800 break-all">{getCurrentEndpoint().url}</span>
                </div>
                {getCurrentEndpoint().sampleData && (
                  <div>
                    <span className="font-medium text-gray-600">Sample Request Body:</span>
                    <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(getCurrentEndpoint().sampleData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Connect Button */}
            <div className="pt-4 space-y-3">
              <button
                onClick={handleConnect}
                disabled={loading || !vendorId.trim() || !apiKey.trim() || !partnerPass.trim() || !partnerId.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Connecting...' : `Test ${getCurrentEndpoint().name}`}
              </button>
              
              {/* Product Import Button */}
              <button
                onClick={handleImportProducts}
                disabled={isImporting || !vendorId.trim() || !apiKey.trim() || !partnerPass.trim() || !partnerId.trim()}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? 'Importing Products...' : 'Import Products for Review'}
              </button>
            </div>
          </div>
        </div>

        {/* Response Display */}
        {response && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">API Response</h3>
            
            {response.success ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-700 font-medium">Connection Successful!</span>
                </div>
                
                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Response Data:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-red-700 font-medium">Connection Failed</span>
                </div>
                
                <div className="bg-red-50 rounded-md p-4">
                  <p className="text-sm text-red-700">{response.error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Review Interface */}
        {showProductReview && importedProducts.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Review Imported Products</h3>
              <button
                onClick={() => setShowProductReview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Found {importedProducts.length} products. Select the ones you want to create in your database:
            </p>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {importedProducts.map((product, index) => (
                <div key={product.original.id || index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={`product-${index}`}
                      checked={selectedProducts.has(product.original.id || index.toString())}
                      onChange={() => toggleProductSelection(product.original.id || index.toString())}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.mapped.image ? (
                        <img 
                          src={product.mapped.image} 
                          alt={product.mapped.name}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `data:image/svg+xml;base64,${btoa(`<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="#f3f4f6"/><text x="50%" y="50%" font-size="12" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text></svg>`)}`;
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-400">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 truncate">{product.mapped.name}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.mapped.description}</p>
                      
                      {/* Price and Stock */}
                      <div className="mt-3 space-y-1">
                        {product.mapped.variants && product.mapped.variants.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              From Rp {Math.floor(Math.min(...product.mapped.variants.map((v: any) => v.price))).toLocaleString('id-ID')} - Rp {Math.floor(Math.max(...product.mapped.variants.map((v: any) => v.price))).toLocaleString('id-ID')}
                            </p>
                            <p className="text-xs text-gray-500">
                              Stock: {product.mapped.variants.reduce((sum: number, v: any) => sum + v.stock, 0).toLocaleString()} total
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-lg font-semibold text-green-600">
                              Rp {Math.floor(parseFloat(product.mapped.price.toString())).toLocaleString('id-ID')}
                            </p>
                            <p className="text-xs text-gray-500">
                              Stock: {product.mapped.stock.toLocaleString()}
                            </p>
                          </div>
                        )}
                        
                        {/* Additional Info */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                          <span>Weight: {product.mapped.weight}g</span>
                          <span className={`px-2 py-1 rounded ${
                            product.mapped.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.mapped.status ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Variants Section */}
                  {product.mapped.variants && product.mapped.variants.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Variants:</h5>
                      <div className="space-y-1">
                        {product.mapped.variants.map((variant: any, variantIndex: number) => (
                          <div key={variantIndex} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            Price: Rp {Math.floor(variant.price).toLocaleString('id-ID')} | Weight: {variant.weight}g | SKU: {variant.sku}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedProducts.size} of {importedProducts.length} products selected
              </p>
              <div className="space-x-3">
                <button
                  onClick={() => setShowProductReview(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProducts}
                  disabled={selectedProducts.size === 0 || isImporting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isImporting ? 'Creating...' : `Create ${selectedProducts.size} Products`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Documentation Link */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900">API Documentation</h4>
              <p className="text-sm text-blue-700 mt-1">
                For more information about the Plugo Partner API, visit the{' '}
                <a 
                  href="https://documenter.getpostman.com/view/33282196/2sA3Qs8X7D#intro" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-800"
                >
                  official documentation
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integration;