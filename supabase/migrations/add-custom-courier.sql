-- Add Custom Courier entry to shipping_couriers table
-- This allows users to select a custom courier option for manual shipping

INSERT INTO shipping_couriers (code, name, type, has_cod, has_insurance, min_weight, min_cost, has_pickup, cutoff_time) VALUES
    ('custom', 'Custom Courier', 'Custom', false, false, 0.0, 0, false, null)
ON CONFLICT (code) DO NOTHING;

-- Add a basic service for the custom courier
INSERT INTO courier_services (courier_id, service_name, service_code, description) VALUES
    ((SELECT id FROM shipping_couriers WHERE code = 'custom'), 'Manual Delivery', 'MANUAL', 'Custom delivery method set by seller')
ON CONFLICT (courier_id, service_name) DO NOTHING;

-- Verify the custom courier was added
SELECT id, code, name, type FROM shipping_couriers WHERE code = 'custom';