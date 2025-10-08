-- Drop existing tables and policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read couriers" ON shipping_couriers;
DROP POLICY IF EXISTS "Users can view own courier preferences" ON user_courier_preferences;
DROP POLICY IF EXISTS "Users can insert own courier preferences" ON user_courier_preferences;
DROP POLICY IF EXISTS "Users can update own courier preferences" ON user_courier_preferences;
DROP POLICY IF EXISTS "Users can delete own courier preferences" ON user_courier_preferences;

DROP TABLE IF EXISTS user_courier_preferences CASCADE;
DROP TABLE IF EXISTS courier_services CASCADE;
DROP TABLE IF EXISTS shipping_couriers CASCADE;

-- Create shipping_couriers table to store courier information
CREATE TABLE shipping_couriers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'Express' or 'Instant'
    has_cod BOOLEAN DEFAULT false, -- Cash on Delivery support
    has_insurance BOOLEAN DEFAULT true, -- Insurance support
    min_weight DECIMAL(5,2) DEFAULT 0.3, -- Minimum weight in kg
    min_cost INTEGER DEFAULT 6000, -- Minimum cost in IDR
    has_pickup BOOLEAN DEFAULT true, -- Pickup service available
    cutoff_time VARCHAR(10), -- Cutoff time for same day service (e.g., '14:00:00')
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courier_services table to store individual services for each courier
CREATE TABLE courier_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID REFERENCES shipping_couriers(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    service_code VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(courier_id, service_name)
);

-- Create user_courier_preferences table to store user's enabled/disabled couriers
CREATE TABLE user_courier_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    courier_id UUID REFERENCES shipping_couriers(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, courier_id)
);

-- Create user_service_preferences table to store user's enabled/disabled services
CREATE TABLE user_service_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES courier_services(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, service_id)
);

-- Insert courier data
INSERT INTO shipping_couriers (code, name, type, has_cod, has_insurance, min_weight, min_cost, has_pickup, cutoff_time) VALUES
    ('jne', 'JNE', 'Express', true, true, 0.3, 6000, true, null),
    ('jnt', 'J&T Express', 'Express', false, true, 0.3, 6000, true, '10:00:00'),
    ('anteraja', 'AnterAja', 'Express', false, true, 0.3, 6000, true, null),
    ('lion', 'Lion Parcel', 'Express', false, true, 0.3, 6000, true, null),
    ('paxel', 'Paxel', 'Instant', false, true, 0.3, 6000, true, '14:00:00'),
    ('rpx', 'RPX Logistics', 'Express', false, true, 0.3, 6000, true, null),
    ('posindonesia', 'Pos Indonesia', 'Express', false, true, 0.3, 6000, true, null),
    ('sicepat', 'SiCepat', 'Express', true, true, 0.3, 6000, true, null),
    ('ninja', 'Ninja Express', 'Express', false, true, 0.3, 6000, true, null),
    ('ncs', 'NCS Courier', 'Express', false, true, 0.3, 6000, true, null),
    ('jnt_cargo', 'J&T Cargo', 'Express', false, true, 0.3, 5000, true, null),
    ('sap', 'SAP Express', 'Express', false, true, 0.3, 6000, true, null),
    ('tiki', 'Tiki', 'Express', false, true, 0.3, 6000, true, null),
    ('sentral_cargo', 'Sentral Cargo', 'Express', false, true, 0.1, 4000, false, null),
    ('id_express', 'ID Express', 'Express', true, true, 0.3, 6000, true, null);

-- Insert services for each courier
INSERT INTO courier_services (courier_id, service_name, service_code) VALUES
    -- JNE services
    ((SELECT id FROM shipping_couriers WHERE code = 'jne'), 'Regular', 'REG'),
    ((SELECT id FROM shipping_couriers WHERE code = 'jne'), 'OKE', 'OKE'),
    ((SELECT id FROM shipping_couriers WHERE code = 'jne'), 'JTR', 'JTR'),
    ((SELECT id FROM shipping_couriers WHERE code = 'jne'), 'CTC', 'CTC'),
    
    -- J&T Express services
    ((SELECT id FROM shipping_couriers WHERE code = 'jnt'), 'Regular', 'REG'),
    ((SELECT id FROM shipping_couriers WHERE code = 'jnt'), 'SameDay', 'SD'),
    ((SELECT id FROM shipping_couriers WHERE code = 'jnt'), 'Next Day', 'ND'),
    
    -- AnterAja services
    ((SELECT id FROM shipping_couriers WHERE code = 'anteraja'), 'Next Day', 'ND'),
    ((SELECT id FROM shipping_couriers WHERE code = 'anteraja'), 'Same Day', 'SD'),
    ((SELECT id FROM shipping_couriers WHERE code = 'anteraja'), 'Regular', 'REG'),
    
    -- Lion Parcel services
    ((SELECT id FROM shipping_couriers WHERE code = 'lion'), 'Boss Pack', 'BP'),
    ((SELECT id FROM shipping_couriers WHERE code = 'lion'), 'Lion Regpack', 'LR'),
    ((SELECT id FROM shipping_couriers WHERE code = 'lion'), 'BIGPACK', 'BIG'),
    ((SELECT id FROM shipping_couriers WHERE code = 'lion'), 'Jagopack', 'JP'),
    
    -- Paxel services
    ((SELECT id FROM shipping_couriers WHERE code = 'paxel'), 'Same Day', 'SD'),
    
    -- RPX services
    ((SELECT id FROM shipping_couriers WHERE code = 'rpx'), 'Regular', 'REG'),
    
    -- Pos Indonesia services
    ((SELECT id FROM shipping_couriers WHERE code = 'posindonesia'), 'Regular', 'REG'),
    ((SELECT id FROM shipping_couriers WHERE code = 'posindonesia'), 'Pos Kilat Khusus', 'PKK'),
    ((SELECT id FROM shipping_couriers WHERE code = 'posindonesia'), 'Pos Kargo', 'PK'),
    
    -- SiCepat services
    ((SELECT id FROM shipping_couriers WHERE code = 'sicepat'), 'Cargo Kilat', 'CK'),
    ((SELECT id FROM shipping_couriers WHERE code = 'sicepat'), 'Berani Bayar Murah', 'BBM'),
    ((SELECT id FROM shipping_couriers WHERE code = 'sicepat'), 'Regular', 'REG'),
    
    -- Ninja Express services
    ((SELECT id FROM shipping_couriers WHERE code = 'ninja'), 'Standard', 'STD'),
    
    -- NCS services
    ((SELECT id FROM shipping_couriers WHERE code = 'ncs'), 'Regular', 'REG'),
    
    -- J&T Cargo services
    ((SELECT id FROM shipping_couriers WHERE code = 'jnt_cargo'), 'Regular', 'REG'),
    
    -- SAP Express services
    ((SELECT id FROM shipping_couriers WHERE code = 'sap'), 'Satria Reg', 'SR'),
    ((SELECT id FROM shipping_couriers WHERE code = 'sap'), 'Reguler Darat', 'RD'),
    ((SELECT id FROM shipping_couriers WHERE code = 'sap'), 'One Day', 'OD'),
    ((SELECT id FROM shipping_couriers WHERE code = 'sap'), 'Same Day', 'SD'),
    
    -- Tiki services
    ((SELECT id FROM shipping_couriers WHERE code = 'tiki'), 'Economy', 'ECO'),
    ((SELECT id FROM shipping_couriers WHERE code = 'tiki'), 'Regular', 'REG'),
    
    -- Sentral Cargo services
    ((SELECT id FROM shipping_couriers WHERE code = 'sentral_cargo'), 'Darat', 'DR'),
    ((SELECT id FROM shipping_couriers WHERE code = 'sentral_cargo'), 'Udara', 'UD'),
    
    -- ID Express services
    ((SELECT id FROM shipping_couriers WHERE code = 'id_express'), 'Standard', 'STD'),
    ((SELECT id FROM shipping_couriers WHERE code = 'id_express'), 'ID Lite', 'LITE'),
    ((SELECT id FROM shipping_couriers WHERE code = 'id_express'), 'ID Truck', 'TRUCK');

-- Enable RLS (Row Level Security)
ALTER TABLE shipping_couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courier_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_service_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipping_couriers (readable by all authenticated users)
CREATE POLICY "shipping_couriers_read_policy" ON shipping_couriers
    FOR SELECT TO authenticated USING (true);

-- RLS Policies for courier_services (readable by all authenticated users)
CREATE POLICY "courier_services_read_policy" ON courier_services
    FOR SELECT TO authenticated USING (true);

-- RLS Policies for user_courier_preferences
CREATE POLICY "user_courier_preferences_select_policy" ON user_courier_preferences
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_courier_preferences_insert_policy" ON user_courier_preferences
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_courier_preferences_update_policy" ON user_courier_preferences
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_courier_preferences_delete_policy" ON user_courier_preferences
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for user_service_preferences
CREATE POLICY "user_service_preferences_select_policy" ON user_service_preferences
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_service_preferences_insert_policy" ON user_service_preferences
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_service_preferences_update_policy" ON user_service_preferences
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_service_preferences_delete_policy" ON user_service_preferences
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_shipping_couriers_code ON shipping_couriers(code);
CREATE INDEX idx_shipping_couriers_type ON shipping_couriers(type);
CREATE INDEX idx_courier_services_courier_id ON courier_services(courier_id);
CREATE INDEX idx_courier_services_name ON courier_services(service_name);
CREATE INDEX idx_user_courier_preferences_user_id ON user_courier_preferences(user_id);
CREATE INDEX idx_user_courier_preferences_courier_id ON user_courier_preferences(courier_id);
CREATE INDEX idx_user_service_preferences_user_id ON user_service_preferences(user_id);
CREATE INDEX idx_user_service_preferences_service_id ON user_service_preferences(service_id);

-- Create function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_shipping_couriers_updated_at BEFORE UPDATE ON shipping_couriers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courier_services_updated_at BEFORE UPDATE ON courier_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_courier_preferences_updated_at BEFORE UPDATE ON user_courier_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_service_preferences_updated_at BEFORE UPDATE ON user_service_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();