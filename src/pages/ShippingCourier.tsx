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
    fetchCouriersAndPreferences();
  }, [user]);

  const fetchCouriersAndPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch couriers
      const { data: couriersData, error: couriersError } = await supabase
        .from('shipping_couriers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (couriersError) throw couriersError;

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

      setCouriers(couriersData || []);
      setCourierServices(servicesData || []);
      setCourierPreferences(courierPrefsData || []);
      setServicePreferences(servicePrefsData || []);
    } catch (err) {
      console.error('Error fetching couriers:', err);
      setError('Failed to load courier information');
    } finally {
      setLoading(false);
    }
  };

  const getCourierPreference = (courierId: string): boolean => {
    const pref = courierPreferences.find(p => p.courier_id === courierId);
    return pref?.is_enabled ?? true;
  };

  const getServicePreference = (serviceId: string): boolean => {
    const pref = servicePreferences.find(p => p.service_id === serviceId);
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

  const toggleCourier = async (courierId: string) => {
    if (!user) return;

    try {
      const currentPreference = getCourierPreference(courierId);
      const newPreference = !currentPreference;

      const existingPref = courierPreferences.find(p => p.courier_id === courierId);

      if (existingPref) {
        // Update existing preference
        const { error } = await supabase
          .from('user_courier_preferences')
          .update({ is_enabled: newPreference })
          .eq('id', existingPref.id);

        if (error) throw error;

        setCourierPreferences(prev => 
          prev.map(p => p.id === existingPref.id ? { ...p, is_enabled: newPreference } : p)
        );
      } else {
        // Create new preference
        const { data, error } = await supabase
          .from('user_courier_preferences')
          .insert({
            user_id: user.id,
            courier_id: courierId,
            is_enabled: newPreference
          })
          .select()
          .single();

        if (error) throw error;

        setCourierPreferences(prev => [...prev, data]);
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

      const existingPref = servicePreferences.find(p => p.service_id === serviceId);

      if (existingPref) {
        // Update existing preference
        const { error } = await supabase
          .from('user_service_preferences')
          .update({ is_enabled: newPreference })
          .eq('id', existingPref.id);

        if (error) throw error;

        setServicePreferences(prev => 
          prev.map(p => p.id === existingPref.id ? { ...p, is_enabled: newPreference } : p)
        );
      } else {
        // Create new preference
        const { data, error } = await supabase
          .from('user_service_preferences')
          .insert({
            user_id: user.id,
            service_id: serviceId,
            is_enabled: newPreference
          })
          .select()
          .single();

        if (error) throw error;

        setServicePreferences(prev => [...prev, data]);
      }
    } catch (err) {
      console.error('Error toggling service:', err);
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'Express' ? 'EXP' : 'INS';
  };

  const getTypeColor = (type: string) => {
    return type === 'Express' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Available Courier Services</h2>
            
            {couriers.length > 0 ? (
              <div className="space-y-4">
                {couriers.map((courier) => {
                  const isEnabled = getCourierPreference(courier.id);
                  const courierServicesForCourier = courierServices.filter(s => s.courier_id === courier.id);
                  
                  return (
                    <div key={courier.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Courier Header */}
                      <div className="bg-gray-50 px-4 py-3 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getTypeIcon(courier.type)}</span>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{courier.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(courier.type)}`}>
                                  {courier.type}
                                </span>
                                {courier.has_cod && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    COD
                                  </span>
                                )}
                                {courier.has_insurance && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Insurance
                                  </span>
                                )}
                                {courier.has_pickup && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    Pickup
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {/* Expand/Collapse Button */}
                            <button
                              onClick={() => toggleExpandCourier(courier.id)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              {expandedCouriers.has(courier.id) ? (
                                <>
                                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                  Hide Services
                                </>
                              ) : (
                                <>
                                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  Show Services
                                </>
                              )}
                            </button>
                            
                            {/* Courier Toggle */}
                            <button
                              onClick={() => toggleCourier(courier.id)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        
                        {/* Courier Details */}
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Code:</span> {courier.code.toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">Min Weight:</span> {courier.min_weight}kg
                          </div>
                          <div>
                            <span className="font-medium">Min Cost:</span> Rp {courier.min_cost.toLocaleString()}
                          </div>
                          {courier.cutoff_time && (
                            <div>
                              <span className="font-medium">Cutoff:</span> {courier.cutoff_time}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expandable Services Section */}
                      {expandedCouriers.has(courier.id) && (
                        <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Available Services</h4>
                          {courierServicesForCourier.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {courierServicesForCourier.map((service) => {
                                const serviceEnabled = getServicePreference(service.id);
                                return (
                                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex-1 mr-3">
                                      <span className="text-sm font-medium text-gray-900">{service.service_name}</span>
                                      {service.service_code && (
                                        <span className="ml-2 text-xs text-gray-500">({service.service_code})</span>
                                      )}
                                      {service.description && (
                                        <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => toggleService(service.id)}
                                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                        serviceEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                                          serviceEnabled ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No services available for this courier.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
        </div>

        {/* Information Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">About Courier Types</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p><strong>Express:</strong> Standard delivery services with longer transit times but lower costs.</p>
                <p className="mt-1"><strong>Instant:</strong> Same-day or next-day delivery services with higher costs but faster delivery.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingCourier;