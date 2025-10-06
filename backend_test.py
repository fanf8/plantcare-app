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
BASE_URL = "https://garden-buddy-17.preview.emergentagent.com/api"
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