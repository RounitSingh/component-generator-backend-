import { performanceMonitor } from '../src/utils/performance.js';
import * as AuthService from '../src/features/services/auth-Service.js';

const testData = {
  email: `test${Date.now()}@example.com`,
  password: 'testpassword123',
  name: 'Test User'
};

async function runPerformanceTests() {
  // console.log('🚀 Starting Performance Tests...\n');
  
  try {
    // Test 1: Signup Performance
    // console.log('📝 Test 1: Signup Performance');
    await performanceMonitor.measure('signup_test', async () => {
      return await AuthService.signup(testData);
    });
    // console.log('✅ Signup completed successfully\n');
    
    // Test 2: Login Performance
    // console.log('🔐 Test 2: Login Performance');
    const loginResult = await performanceMonitor.measure('login_test', async () => {
      return await AuthService.login({
        email: testData.email,
        password: testData.password
      });
    });
    // console.log('✅ Login completed successfully\n');
    
    // Test 3: Token Verification Performance
    // console.log('🔍 Test 3: Token Verification Performance');
    const verifyResult = await performanceMonitor.measure('verify_token_test', async () => {
      return await AuthService.verifyToken(loginResult.data.accessToken);
    });
    // console.log('✅ Token verification completed successfully\n');
    
    // Test 4: Profile Retrieval Performance
    // console.log('👤 Test 4: Profile Retrieval Performance');
    await performanceMonitor.measure('get_profile_test', async () => {
      return await AuthService.getUserProfile(verifyResult.user.id);
    });
    // console.log('✅ Profile retrieval completed successfully\n');
    
    // Test 5: Refresh Token Performance
    // console.log('🔄 Test 5: Refresh Token Performance');
    await performanceMonitor.measure('refresh_token_test', async () => {
      return await AuthService.refreshToken(loginResult.data.refreshToken);
    });
    // console.log('✅ Token refresh completed successfully\n');
    
    // Test 6: Multiple Concurrent Logins
    // console.log('⚡ Test 6: Concurrent Login Performance (5 users)');
    const concurrentLogins = Array.from({ length: 5 }, (_, i) => ({
      email: `concurrent${i}@example.com`,
      password: 'testpassword123',
      name: `Concurrent User ${i}`
    }));
    
    // Create users first
    for (const userData of concurrentLogins) {
      await AuthService.signup(userData);
    }
    
    // Test concurrent logins
    await performanceMonitor.measure('concurrent_logins', async () => {
      const loginPromises = concurrentLogins.map(userData => 
        AuthService.login({
          email: userData.email,
          password: userData.password
        })
      );
      return await Promise.all(loginPromises);
    });
    // console.log('✅ Concurrent logins completed successfully\n');
    
    // console.log('🎉 All Performance Tests Completed Successfully!');
    // console.log('\n📊 Performance Summary:');
    // console.log('- Signup: Optimized with parallel operations and caching');
    // console.log('- Login: Optimized with cache-first approach and parallel token generation');
    // console.log('- Token Verification: Optimized with caching');
    // console.log('- Profile Retrieval: Optimized with caching');
    // console.log('- Token Refresh: Optimized with parallel database queries');
    // console.log('- Concurrent Operations: Optimized with Promise.all');
    
  } catch (error) {
    // console.error('❌ Performance test failed:', error);
  }
}

runPerformanceTests();
