import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading';

interface Courier {
  id: string;
  code: string;
  name: string;
  type: 'Express' | 'Instant';
  has_cod: boolean;
  has_insurance: boolean;
  min_weight: number;
  min_cost: number;
  has_pickup: boolean;
  cutoff_time: string | null;
  is_active: boolean;
  logo_data?: string | null;
}

interface CourierService {
  id: string;
  courier_id: string;
  service_name: string;
  service_code: string;
  description: string | null;
  is_active: boolean;
}

interface CourierPreference {
  id: string;
  user_id: string;
  courier_id: string;
  is_enabled: boolean;
}

interface ServicePreference {
  id: string;
  user_id: string;
  service_id: string;
  is_enabled: boolean;
}

const ShippingCourier: React.FC = () => {
  const { user } = useAuth();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierServices, setCourierServices] = useState<CourierService[]>([]);
  const [courierPreferences, setCourierPreferences] = useState<CourierPreference[]>([]);
  const [servicePreferences, setServicePreferences] = useState<ServicePreference[]>([]);
  const [expandedCouriers, setExpandedCouriers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    console.log('ShippingCourier: Component mounted, user:', user?.id);
    if (user?.id) {
      fetchCouriersAndPreferences();
    }
  }, [user?.id]);

  const fetchCouriersAndPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('ShippingCourier: Fetching couriers and preferences...');
      // Fetch couriers with logo data
      const { data: couriersData, error: couriersError } = await supabase
        .from('shipping_couriers')
        .select('*, logo_data')
        .eq('is_active', true)
        .order('name');

      if (couriersError) {
        console.error('ShippingCourier: Error fetching couriers:', couriersError);
        throw couriersError;
      }
      console.log('ShippingCourier: Fetched couriers data:', couriersData);
      console.log('ShippingCourier: Number of couriers:', couriersData?.length || 0);
      
      // Check for null/undefined couriers
      const invalidCouriers = couriersData?.filter(courier => !courier || !courier.id) || [];
      if (invalidCouriers.length > 0) {
        console.warn('ShippingCourier: Found invalid couriers:', invalidCouriers);
      }

      // Fetch courier services
      const { data: servicesData, error: servicesError } = await supabase
        .from('courier_services')
        .select('*')
        .eq('is_active', true)
        .order('service_name');

      if (servicesError) throw servicesError;

      // Fetch user courier preferences
      const { data: courierPrefsData, error: courierPrefsError } = await supabase
        .from('user_courier_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (courierPrefsError) throw courierPrefsError;

      // Fetch user service preferences
      const { data: servicePrefsData, error: servicePrefsError } = await supabase
        .from('user_service_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (servicePrefsError) throw servicePrefsError;

      console.log('ShippingCourier: Setting state with data...');
      
      // Validate and clean courier services data
      const validServicesData = (servicesData || []).filter(service => {
        if (!service || !service.id || !service.courier_id) {
          console.warn('ShippingCourier: Invalid service found:', service);
          return false;
        }
        return true;
      });
      
      // Validate and clean courier preferences data
      const validCourierPrefsData = (courierPrefsData || []).filter(pref => {
        if (!pref || !pref.id || !pref.courier_id || !pref.user_id) {
          console.warn('ShippingCourier: Invalid courier preference found:', pref);
          return false;
        }
        if (typeof pref.is_enabled !== 'boolean') {
          console.warn('ShippingCourier: Courier preference with invalid is_enabled:', pref);
          return false;
        }
        return true;
      });
      
      // Validate and clean service preferences data
      const validServicePrefsData = (servicePrefsData || []).filter(pref => {
        if (!pref || !pref.id || !pref.service_id || !pref.user_id) {
          console.warn('ShippingCourier: Invalid service preference found:', pref);
          return false;
        }
        if (typeof pref.is_enabled !== 'boolean') {
          console.warn('ShippingCourier: Service preference with invalid is_enabled:', pref);
          return false;
        }
        return true;
      });
      
      setCouriers(couriersData || []);
      setCourierServices(validServicesData);
      setCourierPreferences(validCourierPrefsData);
      setServicePreferences(validServicePrefsData);
      console.log('ShippingCourier: State updated successfully. Valid services:', validServicesData.length);
    } catch (err) {
      console.error('Error fetching couriers:', err);
      setError('Failed to load courier information');
    } finally {
      setLoading(false);
    }
  };

  const getCourierPreference = (courierId: string): boolean => {
    const pref = courierPreferences.find(p => {
      if (!p) {
        console.warn('getCourierPreference: Found null/undefined preference in array');
        return false;
      }
      if (!p.courier_id) {
        console.warn('getCourierPreference: Found preference with null/undefined courier_id:', p);
        return false;
      }
      return p.courier_id === courierId;
    });
    
    return pref?.is_enabled ?? true;
  };

  const getServicePreference = (serviceId: string): boolean => {
    const pref = servicePreferences.find(p => p && p.service_id === serviceId);
    return pref?.is_enabled ?? true;
  };

  const toggleExpandCourier = (courierId: string) => {
    setExpandedCouriers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courierId)) {
        newSet.delete(courierId);
      } else {
        newSet.add(courierId);
      }
      return newSet;
    });
  };



  // Initialize all couriers as expanded by default
  useEffect(() => {
    if (couriers.length > 0) {
      setExpandedCouriers(new Set(couriers.map(c => c.id)));
    }
  }, [couriers]);



  const toggleCourier = async (courierId: string) => {
    if (!user) return;

    try {
      const currentPreference = getCourierPreference(courierId);
      const newPreference = !currentPreference;

      const existingPref = courierPreferences.find(p => p && p.courier_id === courierId);

      if (existingPref) {
        // Update existing preference
        const { error } = await supabase
          .from('user_courier_preferences')
          .update({ is_enabled: newPreference })
          .eq('id', existingPref.id);

        if (error) throw error;

        setCourierPreferences(prev => 
          prev.map(p => p.id === existingPref.id ? { ...p, is_enabled: newPreference } : p).filter(p => p && p.id)
        );
      } else {
        // Create new preference using upsert to handle duplicates
        const { data, error } = await supabase
          .from('user_courier_preferences')
          .upsert({
            user_id: user.id,
            courier_id: courierId,
            is_enabled: newPreference
          }, {
            onConflict: 'user_id,courier_id'
          })
          .select()
          .single();

        if (error) throw error;

        setCourierPreferences(prev => [...prev.filter(p => p && p.id), data].filter(p => p && p.id));
      }

      // Business Logic: When enabling courier, enable all its services
      // When disabling courier, disable all its services
      const courierServicesForCourier = courierServices.filter(s => s.courier_id === courierId);
      
      for (const service of courierServicesForCourier) {
        if (!service || !service.id) {
          console.error('Invalid service found:', service);
          continue;
        }
        const existingServicePref = servicePreferences.find(p => p.service_id === service.id);
        
        if (existingServicePref) {
          // Update existing service preference
          const { error } = await supabase
            .from('user_service_preferences')
            .update({ is_enabled: newPreference })
            .eq('id', existingServicePref.id);

          if (error) throw error;

          setServicePreferences(prev => 
            prev.map(p => p.id === existingServicePref.id ? { ...p, is_enabled: newPreference } : p).filter(p => p && p.id)
          );
        } else {
          // Create new service preference using upsert to handle duplicates
          const { data, error } = await supabase
            .from('user_service_preferences')
            .upsert({
              user_id: user.id,
              service_id: service.id,
              is_enabled: newPreference
            }, {
              onConflict: 'user_id,service_id'
            })
            .select()
            .single();

          if (error) throw error;

          setServicePreferences(prev => [...prev.filter(p => p && p.id), data].filter(p => p && p.id));
        }
      }
    } catch (err) {
      console.error('Error toggling courier:', err);
    }
  };

  const toggleService = async (serviceId: string) => {
    if (!user) return;

    try {
      const currentPreference = getServicePreference(serviceId);
      const newPreference = !currentPreference;
      const service = courierServices.find(s => s.id === serviceId);
      if (!service) {
        console.error('Service not found for serviceId:', serviceId);
        return;
      }

      const existingPref = servicePreferences.find(p => p && p.service_id === serviceId);

      if (existingPref) {
        // Update existing preference
        const { error } = await supabase
          .from('user_service_preferences')
          .update({ is_enabled: newPreference })
          .eq('id', existingPref.id);

        if (error) throw error;

        setServicePreferences(prev => 
          prev.map(p => p.id === existingPref.id ? { ...p, is_enabled: newPreference } : p).filter(p => p && p.id)
        );
      } else {
        // Create new preference using upsert to handle duplicates
        const { data, error } = await supabase
          .from('user_service_preferences')
          .upsert({
            user_id: user.id,
            service_id: serviceId,
            is_enabled: newPreference
          }, {
            onConflict: 'user_id,service_id'
          })
          .select()
          .single();

        if (error) throw error;

        setServicePreferences(prev => [...prev.filter(p => p && p.id), data].filter(p => p && p.id));
      }

      // Business Logic: If all services for a courier are disabled, disable the courier
      if (!newPreference) {
        const courierServicesForCourier = courierServices.filter(s => s.courier_id === service.courier_id);
        const updatedServicePrefs = servicePreferences.map(p => 
          p.service_id === serviceId ? { ...p, is_enabled: newPreference } : p
        );
        
        // Check if all services for this courier will be disabled
        const allServicesDisabled = courierServicesForCourier.every(s => {
          const pref = updatedServicePrefs.find(p => p && p.service_id === s.id);
          return pref ? !pref.is_enabled : false; // Default is enabled, so if no pref exists, it's enabled
        });

        if (allServicesDisabled) {
          // Disable the courier
          const existingCourierPref = courierPreferences.find(p => p && p.courier_id === service.courier_id);
          
          if (existingCourierPref) {
            const { error } = await supabase
              .from('user_courier_preferences')
              .update({ is_enabled: false })
              .eq('id', existingCourierPref.id);

            if (error) throw error;

            setCourierPreferences(prev => 
              prev.map(p => p.id === existingCourierPref.id ? { ...p, is_enabled: false } : p).filter(p => p && p.id)
            );
          } else {
            const { data, error } = await supabase
              .from('user_courier_preferences')
              .upsert({
                user_id: user.id,
                courier_id: service.courier_id,
                is_enabled: false
              }, {
                onConflict: 'user_id,courier_id'
              })
              .select()
              .single();

            if (error) throw error;

            setCourierPreferences(prev => [...prev.filter(p => p && p.id), data].filter(p => p && p.id));
          }
        }
      }
    } catch (err) {
      console.error('Error toggling service:', err);
    }
  };



  if (loading) {
    return <Loading />;
  }

  // Helper function to convert binary data to base64 image
  const getLogoSrc = (logoData: string | null): string | undefined => {
    if (!logoData || logoData.trim() === '') {
      return undefined;
    }

    // Handle direct URLs (prioritize new format)
    if (logoData.startsWith('http://') || logoData.startsWith('https://') || logoData.startsWith('data:')) {
      return logoData;
    }

    // Only try to decode legacy hex data if it's not a plain URL
    try {
      // Handle hex-encoded data starting with \x (single backslash)
      if (logoData.startsWith('\\x')) {
        // Remove the \x prefix and convert pairs of hex characters
        const hexString = logoData.substring(2);
        let decodedString = '';
        for (let i = 0; i < hexString.length; i += 2) {
          const hex = hexString.substr(i, 2);
          decodedString += String.fromCharCode(parseInt(hex, 16));
        }
        
        // If decoded string is a URL, return it directly
        if (decodedString.startsWith('http://') || decodedString.startsWith('https://')) {
          return decodedString;
        }
        
        // Otherwise try to parse as JSON buffer
        const bufferData = JSON.parse(decodedString);
        if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
          const uint8Array = new Uint8Array(bufferData.data);
          const base64String = btoa(String.fromCharCode(...uint8Array));
          return `data:image/png;base64,${base64String}`;
        }
      }
      
      // Handle hex-encoded data with \\x prefix (double backslash)
      if (logoData.includes('\\x')) {
        // Convert hex string to regular string by replacing \\x sequences
        const decodedString = logoData.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        
        // If decoded string is a URL, return it directly
        if (decodedString.startsWith('http://') || decodedString.startsWith('https://')) {
          return decodedString;
        }
        
        // Otherwise try to parse as JSON buffer
        const bufferData = JSON.parse(decodedString);
        if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
          const uint8Array = new Uint8Array(bufferData.data);
          const base64String = btoa(String.fromCharCode(...uint8Array));
          return `data:image/png;base64,${base64String}`;
        }
      }
    } catch (error) {
      // Silently fail for legacy data parsing errors
      console.warn('Could not parse legacy logo data, skipping:', logoData?.substring(0, 50));
    }
    
    return undefined; // Don't show broken images
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Subtitle */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Courier Settings</h2>
        <p className="text-xs text-gray-500 mt-1">
          Please select at least one delivery method that you will use for deliver the item.
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Courier List */}
      <div className="p-4 space-y-4">
        {couriers.length > 0 ? (
          couriers.filter(courier => {
            const isValid = courier && courier.id;
            if (!isValid) {
              console.warn('ShippingCourier: Filtering out invalid courier:', courier);
            }
            return isValid;
          }).map((courier) => {
            const courierServicesForCourier = courierServices.filter(s => s.courier_id === courier.id);
            const isExpanded = expandedCouriers.has(courier.id);
            const courierEnabled = getCourierPreference(courier.id);
            
            return (
              <div key={courier.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        {courier.logo_data ? (
                          <img 
                            src={getLogoSrc(courier.logo_data)} 
                            alt={courier.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-500">
                            {courier.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 
                          className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 flex-1"
                          onClick={() => toggleExpandCourier(courier.id)}
                        >
                          {courier.name}
                        </h3>
                        <button 
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors" 
                          title="Expand variants"
                          onClick={() => toggleExpandCourier(courier.id)}
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </button>
                      </div>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {courierServicesForCourier.length} services
                        </span>
                      </div>

                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-3">
                    <button
                      onClick={() => toggleCourier(courier.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        courierEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                          courierEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    

                  </div>
                </div>

                {/* Expanded Services Section */}
                {isExpanded && courierServicesForCourier.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="space-y-3">
                      {courierServicesForCourier.filter(service => service && service.id).map((service) => {
                        const serviceEnabled = getServicePreference(service.id);
                        const serviceName = service.service_name;
                        
                        return (
                          <div key={service.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">{serviceName}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleService(service.id)}
                              disabled={!courierEnabled}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                !courierEnabled ? 'bg-gray-200 cursor-not-allowed' :
                                serviceEnabled ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                                  serviceEnabled && courierEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-4 4-4-4m0 0l-4 4-4-4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No couriers available</h3>
            <p className="mt-1 text-sm text-gray-500">There are currently no active courier services configured.</p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <button className="w-full bg-green-500 text-white py-3 rounded-lg font-medium text-base hover:bg-green-600 transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default ShippingCourier;