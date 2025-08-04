// Test file to check database connections and fix authentication issues
import { supabase } from './supabase/config.js';

// Test function to check basic connectivity
const testSupabaseConnection = async () => {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
};

// Test RLS function
const testRLSFunction = async (uid) => {
  try {
    console.log('🧪 Testing RLS function...');
    
    const { data, error } = await supabase.rpc('set_current_user_uid', { 
      user_uid: uid 
    });
    
    if (error) {
      console.error('❌ RLS function error:', error);
      return false;
    }
    
    console.log('✅ RLS function working');
    return true;
  } catch (err) {
    console.error('❌ RLS function unexpected error:', err);
    return false;
  }
};

// Test user operations
const testUserOperations = async (uid) => {
  try {
    console.log('🧪 Testing user operations...');
    
    // Set current user for RLS
    await testRLSFunction(uid);
    
    // Try to fetch user
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ User fetch error:', fetchError);
      return false;
    }
    
    // If user doesn't exist, create one
    if (!userData) {
      const newUser = {
        uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_family_root: true
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ User insert error:', insertError);
        return false;
      }
      
      console.log('✅ User created successfully:', insertData);
    } else {
      console.log('✅ User found:', userData);
    }
    
    return true;
  } catch (err) {
    console.error('❌ User operations unexpected error:', err);
    return false;
  }
};

// Main test function
export const runDatabaseTests = async (uid = 'test-user-123') => {
  console.log('🚀 Starting database tests...');
  
  const tests = [
    await testSupabaseConnection(),
    await testRLSFunction(uid),
    await testUserOperations(uid)
  ];
  
  const passedTests = tests.filter(test => test).length;
  const totalTests = tests.length;
  
  console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Database is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the errors above.');
  }
  
  return passedTests === totalTests;
};

// Export for use in browser console
window.runDatabaseTests = runDatabaseTests;
