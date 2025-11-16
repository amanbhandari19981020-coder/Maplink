import requests
import sys
import json
from datetime import datetime

class CropHealthAPITester:
    def __init__(self, base_url="https://field-tracker-31.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True)
                    return True, response_data
                except:
                    if expected_status == 204:  # No content expected
                        self.log_test(name, True)
                        return True, {}
                    else:
                        self.log_test(name, False, f"Invalid JSON response")
                        return False, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Token received: {self.token[:20]}...")
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # First register a user
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "name": f"Login Test User {timestamp}",
            "email": f"logintest{timestamp}@example.com",
            "password": "LoginTest123!"
        }
        
        # Register user
        success, _ = self.run_test(
            "Pre-Login Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not success:
            return False
        
        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            # Update token for subsequent tests
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success and 'id' in response and 'name' in response and 'email' in response:
            return True
        return False

    def test_create_field(self):
        """Test creating a new field"""
        field_data = {
            "name": "Test Field North",
            "crop_type": "Wheat",
            "start_date": "2024-01-15",
            "health_index": 85.5,
            "coordinates": [
                {"lat": 28.6139, "lng": 77.2090},
                {"lat": 28.6140, "lng": 77.2095},
                {"lat": 28.6135, "lng": 77.2095},
                {"lat": 28.6135, "lng": 77.2090}
            ]
        }
        
        success, response = self.run_test(
            "Create Field",
            "POST",
            "fields",
            200,
            data=field_data
        )
        
        if success and 'id' in response:
            self.test_field_id = response['id']
            print(f"   Created field ID: {self.test_field_id}")
            return True
        return False

    def test_get_fields(self):
        """Test getting all user fields"""
        success, response = self.run_test(
            "Get All Fields",
            "GET",
            "fields",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} fields")
            return True
        return False

    def test_get_single_field(self):
        """Test getting a single field by ID"""
        if not hasattr(self, 'test_field_id'):
            print("   Skipping - no field ID available")
            return False
            
        success, response = self.run_test(
            "Get Single Field",
            "GET",
            f"fields/{self.test_field_id}",
            200
        )
        
        if success and 'id' in response and response['id'] == self.test_field_id:
            return True
        return False

    def test_update_field(self):
        """Test updating a field"""
        if not hasattr(self, 'test_field_id'):
            print("   Skipping - no field ID available")
            return False
            
        update_data = {
            "name": "Updated Test Field",
            "health_index": 92.0
        }
        
        success, response = self.run_test(
            "Update Field",
            "PUT",
            f"fields/{self.test_field_id}",
            200,
            data=update_data
        )
        
        if success and response.get('name') == 'Updated Test Field' and response.get('health_index') == 92.0:
            return True
        return False

    def test_delete_field(self):
        """Test deleting a field"""
        if not hasattr(self, 'test_field_id'):
            print("   Skipping - no field ID available")
            return False
            
        success, response = self.run_test(
            "Delete Field",
            "DELETE",
            f"fields/{self.test_field_id}",
            200
        )
        
        if success and 'message' in response:
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data=invalid_data
        )
        
        return success  # Success means we got the expected 401 status

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access",
            "GET",
            "fields",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Crop Health Monitoring API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)

        # Authentication Tests
        print("\n📋 AUTHENTICATION TESTS")
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        self.test_invalid_login()
        self.test_unauthorized_access()

        # Field Management Tests
        print("\n🌾 FIELD MANAGEMENT TESTS")
        self.test_create_field()
        self.test_get_fields()
        self.test_get_single_field()
        self.test_update_field()
        self.test_delete_field()

        # Print Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed!")
            return 1

def main():
    tester = CropHealthAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())