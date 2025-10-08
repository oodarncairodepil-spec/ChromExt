require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function createOrderTrigger() {
  try {
    console.log('Creating order number sequence...');
    
    // Create sequence for order numbers
    const { data: seqData, error: seqError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;'
    });
    
    if (seqError) {
      console.log('Sequence creation result:', seqData, seqError);
    } else {
      console.log('Sequence created successfully');
    }
    
    console.log('Creating order number generation function...');
    
    // Create function to generate order numbers
    const functionSQL = `
      CREATE OR REPLACE FUNCTION generate_order_number()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.order_number IS NULL THEN
          NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { data: funcData, error: funcError } = await supabase.rpc('exec_sql', {
      sql: functionSQL
    });
    
    if (funcError) {
      console.log('Function creation result:', funcData, funcError);
    } else {
      console.log('Function created successfully');
    }
    
    console.log('Creating trigger...');
    
    // Create trigger
    const triggerSQL = `
      DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
      CREATE TRIGGER generate_order_number_trigger
        BEFORE INSERT ON orders
        FOR EACH ROW
        EXECUTE FUNCTION generate_order_number();
    `;
    
    const { data: triggerData, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: triggerSQL
    });
    
    if (triggerError) {
      console.log('Trigger creation result:', triggerData, triggerError);
    } else {
      console.log('Trigger created successfully');
    }
    
    console.log('Testing order number generation...');
    
    // Test the trigger
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .insert({
        seller_id: 'e8c181bd-2365-4271-8182-55e6f14ea1b9',
        items: [{ test: 'test' }],
        status: 'test'
      })
      .select('id, order_number');
    
    console.log('Test insert result:', testData, testError);
    
    if (testData && testData[0]) {
      console.log('Generated order number:', testData[0].order_number);
      
      // Clean up test order
      await supabase.from('orders').delete().eq('id', testData[0].id);
      console.log('Test order deleted');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createOrderTrigger();