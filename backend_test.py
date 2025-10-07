#!/usr/bin/env python3
"""
Plant Wellness Backend API Test Suite
Tests all backend endpoints according to test_result.md priorities
"""

import requests
import json
import uuid
from datetime import datetime
import base64
import os

# Configuration
BASE_URL = "https://potagermalin.preview.emergentagent.com/api"
TEST_USER_EMAIL = "marie.dupont@example.com"
TEST_USER_NAME = "Marie Dupont"
TEST_USER_PASSWORD = "PlantLover2025!"

# Global variables for test state
auth_token = None
test_user_id = None
test_plant_id = None
test_user_plant_id = None
test_post_id = None

def log_test(test_name, status, details=""):
    """Log test results"""
    status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{status_symbol} {test_name}: {status}")
    if details:
        print(f"   Details: {details}")
    print()

def make_request(method, endpoint, data=None, headers=None, auth_required=True):
    """Make HTTP request with proper headers"""
    url = f"{BASE_URL}{endpoint}"
    
    request_headers = {"Content-Type": "application/json"}
    if headers:
        request_headers.update(headers)
    
    if auth_required and auth_token:
        request_headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=request_headers)
        elif method == "POST":
            response = requests.post(url, json=data, headers=request_headers)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=request_headers)
        elif method == "DELETE":
            response = requests.delete(url, headers=request_headers)
        
        return response
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return None

def test_user_authentication():
    """Test User Authentication System - HIGH PRIORITY"""
    global auth_token, test_user_id
    
    print("=== TESTING USER AUTHENTICATION SYSTEM ===")
    
    # Test 1: User Registration
    register_data = {
        "email": TEST_USER_EMAIL,
        "name": TEST_USER_NAME,
        "password": TEST_USER_PASSWORD
    }
    
    response = make_request("POST", "/auth/register", register_data, auth_required=False)
    if response and response.status_code == 200:
        data = response.json()
        if "access_token" in data and "user" in data:
            auth_token = data["access_token"]
            test_user_id = data["user"]["id"]
            log_test("User Registration", "PASS", f"User created with ID: {test_user_id}")
        else:
            log_test("User Registration", "FAIL", "Missing token or user data in response")
            return False
    else:
        # User might already exist, try login instead
        response = make_request("POST", "/auth/login", {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            auth_token = data["access_token"]
            test_user_id = data["user"]["id"]
            log_test("User Registration", "PASS", "User already exists, logged in successfully")
        else:
            log_test("User Registration", "FAIL", f"Status: {response.status_code if response else 'No response'}")
            return False
    
    # Test 2: User Login
    login_data = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    
    response = make_request("POST", "/auth/login", login_data, auth_required=False)
    if response and response.status_code == 200:
        data = response.json()
        if "access_token" in data and data["token_type"] == "bearer":
            auth_token = data["access_token"]
            log_test("User Login", "PASS", "JWT token received")
        else:
            log_test("User Login", "FAIL", "Invalid token response")
            return False
    else:
        log_test("User Login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Protected Endpoint (Get Current User)
    response = make_request("GET", "/auth/me")
    if response and response.status_code == 200:
        user_data = response.json()
        if user_data["email"] == TEST_USER_EMAIL:
            log_test("Protected Endpoint Access", "PASS", f"User data retrieved: {user_data['name']}")
        else:
            log_test("Protected Endpoint Access", "FAIL", "Wrong user data returned")
            return False
    else:
        log_test("Protected Endpoint Access", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 4: Invalid Login
    response = make_request("POST", "/auth/login", {
        "email": TEST_USER_EMAIL,
        "password": "wrongpassword"
    }, auth_required=False)
    
    if response and response.status_code == 401:
        log_test("Invalid Login Handling", "PASS", "Correctly rejected invalid credentials")
    else:
        log_test("Invalid Login Handling", "FAIL", f"Expected 401, got {response.status_code if response else 'No response'}")
    
    return True

def test_plant_database():
    """Test Plant Database with Sample Data - HIGH PRIORITY"""
    global test_plant_id
    
    print("=== TESTING PLANT DATABASE WITH SAMPLE DATA ===")
    
    # Test 1: Get All Plants
    response = make_request("GET", "/plants", auth_required=False)
    if response and response.status_code == 200:
        plants = response.json()
        if len(plants) >= 9:  # Should have at least 9 sample plants
            test_plant_id = plants[0]["id"]  # Store first plant ID for later tests
            log_test("Get All Plants", "PASS", f"Retrieved {len(plants)} plants")
        else:
            log_test("Get All Plants", "FAIL", f"Expected at least 9 plants, got {len(plants)}")
            return False
    else:
        log_test("Get All Plants", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Get Plants by Category - Potager
    response = make_request("GET", "/plants?category=potager", auth_required=False)
    if response and response.status_code == 200:
        potager_plants = response.json()
        if len(potager_plants) >= 5:  # Should have potager plants
            log_test("Get Potager Plants", "PASS", f"Retrieved {len(potager_plants)} potager plants")
        else:
            log_test("Get Potager Plants", "FAIL", f"Expected potager plants, got {len(potager_plants)}")
    else:
        log_test("Get Potager Plants", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3: Get Plants by Category - Ornement
    response = make_request("GET", "/plants?category=ornement", auth_required=False)
    if response and response.status_code == 200:
        ornement_plants = response.json()
        if len(ornement_plants) >= 4:  # Should have ornement plants
            log_test("Get Ornement Plants", "PASS", f"Retrieved {len(ornement_plants)} ornement plants")
        else:
            log_test("Get Ornement Plants", "FAIL", f"Expected ornement plants, got {len(ornement_plants)}")
    else:
        log_test("Get Ornement Plants", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Get Specific Plant
    if test_plant_id:
        response = make_request("GET", f"/plants/{test_plant_id}", auth_required=False)
        if response and response.status_code == 200:
            plant = response.json()
            if plant["id"] == test_plant_id:
                log_test("Get Specific Plant", "PASS", f"Retrieved plant: {plant['name_fr']}")
            else:
                log_test("Get Specific Plant", "FAIL", "Wrong plant returned")
        else:
            log_test("Get Specific Plant", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 5: Get Non-existent Plant
    fake_id = str(uuid.uuid4())
    response = make_request("GET", f"/plants/{fake_id}", auth_required=False)
    if response and response.status_code == 404:
        log_test("Get Non-existent Plant", "PASS", "Correctly returned 404 for non-existent plant")
    else:
        log_test("Get Non-existent Plant", "FAIL", f"Expected 404, got {response.status_code if response else 'No response'}")
    
    return True

def test_user_garden_management():
    """Test User Garden Management - HIGH PRIORITY"""
    global test_user_plant_id
    
    print("=== TESTING USER GARDEN MANAGEMENT ===")
    
    if not auth_token or not test_plant_id:
        log_test("Garden Management Setup", "FAIL", "Missing auth token or plant ID")
        return False
    
    # Test 1: Get Empty Garden
    response = make_request("GET", "/my-garden")
    if response and response.status_code == 200:
        garden = response.json()
        log_test("Get Initial Garden", "PASS", f"Garden has {len(garden)} plants")
    else:
        log_test("Get Initial Garden", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Add Plant to Garden
    plant_data = {
        "plant_id": test_plant_id,
        "custom_name": "Ma Tomate Préférée",
        "planted_date": datetime.now().isoformat(),
        "location": "extérieur",
        "notes": "Plantée dans le coin ensoleillé du jardin"
    }
    
    response = make_request("POST", "/my-garden", plant_data)
    if response and response.status_code == 200:
        user_plant = response.json()
        test_user_plant_id = user_plant["id"]
        log_test("Add Plant to Garden", "PASS", f"Added plant with ID: {test_user_plant_id}")
    else:
        log_test("Add Plant to Garden", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Get Garden with Plant
    response = make_request("GET", "/my-garden")
    if response and response.status_code == 200:
        garden = response.json()
        if len(garden) >= 1:
            log_test("Get Garden with Plants", "PASS", f"Garden now has {len(garden)} plants")
        else:
            log_test("Get Garden with Plants", "FAIL", "Plant not found in garden")
    else:
        log_test("Get Garden with Plants", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Update Garden Plant
    if test_user_plant_id:
        update_data = {
            "custom_name": "Ma Tomate Super Productive",
            "notes": "Croissance excellente, première récolte prévue bientôt",
            "health_status": "excellente"
        }
        
        response = make_request("PUT", f"/my-garden/{test_user_plant_id}", update_data)
        if response and response.status_code == 200:
            updated_plant = response.json()
            if updated_plant["custom_name"] == update_data["custom_name"]:
                log_test("Update Garden Plant", "PASS", "Plant updated successfully")
            else:
                log_test("Update Garden Plant", "FAIL", "Plant not updated correctly")
        else:
            log_test("Update Garden Plant", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 5: Delete Garden Plant
    if test_user_plant_id:
        response = make_request("DELETE", f"/my-garden/{test_user_plant_id}")
        if response and response.status_code == 200:
            log_test("Delete Garden Plant", "PASS", "Plant removed from garden")
        else:
            log_test("Delete Garden Plant", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 6: Try to Add Non-existent Plant
    fake_plant_data = {
        "plant_id": str(uuid.uuid4()),
        "custom_name": "Plante Inexistante"
    }
    
    response = make_request("POST", "/my-garden", fake_plant_data)
    if response and response.status_code == 404:
        log_test("Add Non-existent Plant", "PASS", "Correctly rejected non-existent plant")
    else:
        log_test("Add Non-existent Plant", "FAIL", f"Expected 404, got {response.status_code if response else 'No response'}")
    
    return True

def test_ai_analysis_system():
    """Test AI Analysis System (Premium) - MEDIUM PRIORITY"""
    
    print("=== TESTING AI ANALYSIS SYSTEM (PREMIUM) ===")
    
    if not auth_token:
        log_test("AI Analysis Setup", "FAIL", "Missing auth token")
        return False
    
    # Create a fake base64 image for testing
    fake_image = base64.b64encode(b"fake_image_data").decode()
    
    # Test 1: AI Analysis without Premium (should fail)
    analysis_data = {
        "image_base64": fake_image,
        "analysis_type": "identification"
    }
    
    response = make_request("POST", "/ai/analyze", analysis_data)
    if response and response.status_code == 403:
        log_test("AI Analysis Non-Premium", "PASS", "Correctly blocked non-premium user")
    else:
        log_test("AI Analysis Non-Premium", "FAIL", f"Expected 403, got {response.status_code if response else 'No response'}")
    
    # Test 2: AI History without Premium (should fail)
    response = make_request("GET", "/ai/history")
    if response and response.status_code == 403:
        log_test("AI History Non-Premium", "PASS", "Correctly blocked non-premium user")
    else:
        log_test("AI History Non-Premium", "FAIL", f"Expected 403, got {response.status_code if response else 'No response'}")
    
    return True

def test_community_features():
    """Test Community Features - MEDIUM PRIORITY"""
    global test_post_id
    
    print("=== TESTING COMMUNITY FEATURES ===")
    
    if not auth_token:
        log_test("Community Setup", "FAIL", "Missing auth token")
        return False
    
    # Test 1: Get Community Posts (empty initially)
    response = make_request("GET", "/community/posts", auth_required=False)
    if response and response.status_code == 200:
        posts = response.json()
        log_test("Get Community Posts", "PASS", f"Retrieved {len(posts)} posts")
    else:
        log_test("Get Community Posts", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Create Community Post
    post_data = {
        "title": "Mes tomates poussent super bien !",
        "content": "Bonjour à tous ! Je voulais partager mes progrès avec mes plants de tomates. Après 2 mois de soins attentifs, elles commencent à donner de beaux fruits. Quelques conseils : arrosage régulier le matin, tuteurage solide et suppression des gourmands. Bonne jardinage !",
        "plant_category": "potager"
    }
    
    response = make_request("POST", "/community/posts", post_data)
    if response and response.status_code == 200:
        post = response.json()
        test_post_id = post["id"]
        log_test("Create Community Post", "PASS", f"Post created with ID: {test_post_id}")
    else:
        log_test("Create Community Post", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Get Posts with Category Filter
    response = make_request("GET", "/community/posts?category=potager", auth_required=False)
    if response and response.status_code == 200:
        potager_posts = response.json()
        log_test("Get Posts by Category", "PASS", f"Retrieved {len(potager_posts)} potager posts")
    else:
        log_test("Get Posts by Category", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 4: Like Post
    if test_post_id:
        response = make_request("POST", f"/community/posts/{test_post_id}/like")
        if response and response.status_code == 200:
            like_result = response.json()
            if "liked" in like_result:
                log_test("Like Post", "PASS", f"Post liked: {like_result['liked']}")
            else:
                log_test("Like Post", "FAIL", "Invalid like response")
        else:
            log_test("Like Post", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 5: Unlike Post (like again)
    if test_post_id:
        response = make_request("POST", f"/community/posts/{test_post_id}/like")
        if response and response.status_code == 200:
            like_result = response.json()
            log_test("Unlike Post", "PASS", f"Post unliked: {not like_result['liked']}")
        else:
            log_test("Unlike Post", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_subscription_management():
    """Test Subscription Management - MEDIUM PRIORITY"""
    
    print("=== TESTING SUBSCRIPTION MANAGEMENT ===")
    
    # Test 1: Get Subscription Plans
    response = make_request("GET", "/subscription/plans", auth_required=False)
    if response and response.status_code == 200:
        plans = response.json()
        if len(plans) >= 1:
            plan = plans[0]
            if plan["price_euros"] == 9.99 and "Premium Plant Care" in plan["name"]:
                log_test("Get Subscription Plans", "PASS", f"Retrieved {len(plans)} plans, premium at €{plan['price_euros']}")
            else:
                log_test("Get Subscription Plans", "FAIL", "Invalid plan data")
        else:
            log_test("Get Subscription Plans", "FAIL", "No plans returned")
    else:
        log_test("Get Subscription Plans", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Create Checkout Session
    if auth_token:
        response = make_request("POST", "/subscription/create-checkout")
        if response and response.status_code == 200:
            checkout = response.json()
            if "checkout_url" in checkout and "session_id" in checkout:
                log_test("Create Checkout Session", "PASS", f"Checkout URL: {checkout['checkout_url']}")
            else:
                log_test("Create Checkout Session", "FAIL", "Invalid checkout response")
        else:
            log_test("Create Checkout Session", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_lunar_calendar_premium_feature():
    """Test Lunar Calendar Premium Feature - HIGH PRIORITY (NEW)"""
    
    print("=== TESTING LUNAR CALENDAR PREMIUM FEATURE ===")
    
    if not auth_token:
        log_test("Lunar Calendar Setup", "FAIL", "Missing auth token")
        return False
    
    # Test 1: Non-premium user should get 403
    response = make_request("GET", "/premium/lunar-calendar")
    if response and response.status_code == 403:
        log_test("Lunar Calendar Non-Premium Access", "PASS", "Correctly blocked non-premium user")
    else:
        log_test("Lunar Calendar Non-Premium Access", "FAIL", f"Expected 403, got {response.status_code if response else 'No response'}")
    
    # Test 2: Get admin token for premium access
    admin_response = make_request("POST", "/auth/admin-login", auth_required=False)
    if admin_response and admin_response.status_code == 200:
        admin_data = admin_response.json()
        admin_token = admin_data["access_token"]
        is_premium = admin_data["user"].get("is_premium", False)
        
        if is_premium:
            log_test("Admin Login Premium Status", "PASS", "Admin user has premium access")
            
            # Test 3: Premium user should get full lunar calendar data
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            response = make_request("GET", "/premium/lunar-calendar", headers=admin_headers)
            
            if response and response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['period', 'current_phase', 'weekly_calendar', 'monthly_overview', 'tips']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    log_test("Lunar Calendar Data Structure", "PASS", "All required fields present")
                    
                    # Validate weekly calendar
                    if 'weekly_calendar' in data and len(data['weekly_calendar']) >= 7:
                        calendar_entry = data['weekly_calendar'][0]
                        calendar_fields = ['date', 'day', 'phase', 'garden_activities', 'optimal_hours']
                        missing_calendar_fields = [field for field in calendar_fields if field not in calendar_entry]
                        
                        if not missing_calendar_fields:
                            log_test("Weekly Calendar Structure", "PASS", f"7 days with complete data")
                        else:
                            log_test("Weekly Calendar Structure", "FAIL", f"Missing fields: {missing_calendar_fields}")
                    else:
                        log_test("Weekly Calendar Structure", "FAIL", "Insufficient calendar entries")
                    
                    # Validate tips
                    if 'tips' in data and isinstance(data['tips'], list) and len(data['tips']) > 0:
                        log_test("Lunar Calendar Tips", "PASS", f"{len(data['tips'])} tips provided")
                    else:
                        log_test("Lunar Calendar Tips", "FAIL", "Tips missing or empty")
                        
                    # Validate monthly overview
                    if 'monthly_overview' in data and isinstance(data['monthly_overview'], dict):
                        overview = data['monthly_overview']
                        overview_fields = ['best_sowing_days', 'best_planting_days', 'best_harvest_days']
                        if all(field in overview for field in overview_fields):
                            log_test("Monthly Overview Structure", "PASS", "Complete monthly overview")
                        else:
                            log_test("Monthly Overview Structure", "FAIL", "Incomplete monthly overview")
                    else:
                        log_test("Monthly Overview Structure", "FAIL", "Monthly overview missing")
                        
                else:
                    log_test("Lunar Calendar Data Structure", "FAIL", f"Missing fields: {missing_fields}")
            else:
                log_test("Premium Lunar Calendar Access", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        else:
            log_test("Admin Login Premium Status", "FAIL", "Admin user does not have premium access")
    else:
        log_test("Admin Login for Premium Test", "FAIL", f"Status: {admin_response.status_code if admin_response else 'No response'}")
    
    return True

def test_watering_schedule_authentication():
    """Test Watering Schedule Authentication Fixes - HIGH PRIORITY (NEW)"""
    
    print("=== TESTING WATERING SCHEDULE AUTHENTICATION ===")
    
    if not auth_token or not test_user_plant_id:
        # Try to create a user plant first
        if test_plant_id:
            plant_data = {
                "plant_id": test_plant_id,
                "custom_name": "Test Plant for Watering",
                "location": "extérieur"
            }
            response = make_request("POST", "/my-garden", plant_data)
            if response and response.status_code == 200:
                global test_user_plant_id
                test_user_plant_id = response.json()["id"]
            else:
                log_test("Watering Schedule Setup", "FAIL", "Could not create test plant")
                return False
        else:
            log_test("Watering Schedule Setup", "FAIL", "Missing auth token or user plant")
            return False
    
    # Test 1: POST watering schedule
    schedule_data = {
        "user_plant_id": test_user_plant_id,
        "schedule_type": "custom",
        "custom_days": [1, 3, 5]  # Monday, Wednesday, Friday
    }
    
    response = make_request("POST", "/watering-schedule", schedule_data)
    if response and response.status_code == 200:
        schedule = response.json()
        log_test("POST Watering Schedule", "PASS", "Schedule created successfully")
        
        # Test 2: GET watering schedule
        response = make_request("GET", f"/watering-schedule/{test_user_plant_id}")
        if response and response.status_code == 200:
            log_test("GET Watering Schedule", "PASS", "Schedule retrieved successfully")
        else:
            log_test("GET Watering Schedule", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: PUT watering schedule
        update_data = {"schedule_type": "auto"}
        response = make_request("PUT", f"/watering-schedule/{test_user_plant_id}", update_data)
        if response and response.status_code == 200:
            log_test("PUT Watering Schedule", "PASS", "Schedule updated successfully")
        else:
            log_test("PUT Watering Schedule", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: DELETE watering schedule
        response = make_request("DELETE", f"/watering-schedule/{test_user_plant_id}")
        if response and response.status_code == 200:
            log_test("DELETE Watering Schedule", "PASS", "Schedule deleted successfully")
        else:
            log_test("DELETE Watering Schedule", "FAIL", f"Status: {response.status_code if response else 'No response'}")
            
    else:
        log_test("POST Watering Schedule", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    return True

def test_scanner_analyze_authentication():
    """Test Scanner Analyze Authentication Fixes - HIGH PRIORITY (NEW)"""
    
    print("=== TESTING SCANNER ANALYZE AUTHENTICATION ===")
    
    if not auth_token:
        log_test("Scanner Analyze Setup", "FAIL", "Missing auth token")
        return False
    
    # Create a simple test image (1x1 pixel PNG in base64)
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    # Test 1: Scanner analyze with identification (free feature)
    analysis_data = {
        "image_base64": test_image_base64,
        "analysis_type": "identification"
    }
    
    response = make_request("POST", "/scanner/analyze", analysis_data)
    if response and response.status_code == 200:
        data = response.json()
        log_test("Scanner Analyze - Identification", "PASS", "Authentication working for identification")
    else:
        log_test("Scanner Analyze - Identification", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2: Scanner analyze with diagnostic (premium feature) - should fail for regular user
    analysis_data = {
        "image_base64": test_image_base64,
        "analysis_type": "diagnostic"
    }
    
    response = make_request("POST", "/scanner/analyze", analysis_data)
    if response and response.status_code == 402:  # Payment required for premium
        log_test("Scanner Analyze - Diagnostic (Non-Premium)", "PASS", "Correctly blocked non-premium diagnostic")
    else:
        log_test("Scanner Analyze - Diagnostic (Non-Premium)", "FAIL", f"Expected 402, got {response.status_code if response else 'No response'}")
    
    # Test 3: Scanner analyze with admin (premium) user
    admin_response = make_request("POST", "/auth/admin-login", auth_required=False)
    if admin_response and admin_response.status_code == 200:
        admin_data = admin_response.json()
        admin_token = admin_data["access_token"]
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        response = make_request("POST", "/scanner/analyze", analysis_data, headers=admin_headers)
        
        if response and response.status_code == 200:
            data = response.json()
            log_test("Scanner Analyze - Diagnostic (Premium)", "PASS", "Premium diagnostic access working")
        else:
            log_test("Scanner Analyze - Diagnostic (Premium)", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    else:
        log_test("Scanner Analyze - Admin Login", "FAIL", "Could not get admin token")
    
    return True

def test_existing_premium_endpoints():
    """Test Existing Premium Endpoints Still Work - MEDIUM PRIORITY (NEW)"""
    
    print("=== TESTING EXISTING PREMIUM ENDPOINTS ===")
    
    # Get admin token for premium access
    admin_response = make_request("POST", "/auth/admin-login", auth_required=False)
    if admin_response and admin_response.status_code == 200:
        admin_data = admin_response.json()
        admin_token = admin_data["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test 1: Premium weather endpoint
        response = make_request("GET", "/premium/weather?location=Paris", headers=admin_headers)
        if response and response.status_code == 200:
            log_test("Premium Weather Endpoint", "PASS", "Weather data accessible")
        else:
            log_test("Premium Weather Endpoint", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: Premium advanced care tips
        response = make_request("GET", "/premium/advanced-care/Tomate", headers=admin_headers)
        if response and response.status_code == 200:
            log_test("Premium Advanced Care Tips", "PASS", "Advanced care tips accessible")
        else:
            log_test("Premium Advanced Care Tips", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: Premium plant calendar
        response = make_request("GET", "/premium/plant-calendar", headers=admin_headers)
        if response and response.status_code == 200:
            log_test("Premium Plant Calendar", "PASS", "Plant calendar accessible")
        else:
            log_test("Premium Plant Calendar", "FAIL", f"Status: {response.status_code if response else 'No response'}")
            
    else:
        log_test("Existing Premium Endpoints", "FAIL", "Could not get admin token")
        return False
    
    return True

def run_all_tests():
    """Run all backend tests in priority order"""
    print("🌱 PLANT WELLNESS BACKEND API TEST SUITE")
    print("=" * 50)
    print(f"Testing API at: {BASE_URL}")
    print(f"Test User: {TEST_USER_EMAIL}")
    print("=" * 50)
    print()
    
    # Track test results
    test_results = {}
    
    # HIGH PRIORITY TESTS
    test_results["User Authentication System"] = test_user_authentication()
    test_results["Plant Database with Sample Data"] = test_plant_database()
    test_results["User Garden Management"] = test_user_garden_management()
    
    # MEDIUM PRIORITY TESTS
    test_results["AI Analysis System (Premium)"] = test_ai_analysis_system()
    test_results["Community Features"] = test_community_features()
    test_results["Subscription Management"] = test_subscription_management()
    
    # Summary
    print("=" * 50)
    print("🔍 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print()
    print(f"Total Tests: {len(test_results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/len(test_results)*100):.1f}%")
    
    return test_results

if __name__ == "__main__":
    results = run_all_tests()