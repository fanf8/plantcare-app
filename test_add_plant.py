#!/usr/bin/env python3
"""
Test script to verify plant addition functionality
"""

import requests
import json

# Configuration
BACKEND_URL = "http://localhost:8001/api"

def test_plant_addition():
    print("🧪 Testing Plant Addition Functionality")
    
    # Step 1: Admin login
    print("\n1️⃣ Testing admin login...")
    login_response = requests.post(f"{BACKEND_URL}/auth/admin-login")
    if login_response.status_code == 200:
        auth_data = login_response.json()
        token = auth_data['access_token']
        print("✅ Admin login successful")
    else:
        print(f"❌ Admin login failed: {login_response.status_code}")
        return
    
    # Step 2: Get plants list
    print("\n2️⃣ Getting plants list...")
    plants_response = requests.get(f"{BACKEND_URL}/plants")
    if plants_response.status_code == 200:
        plants = plants_response.json()
        if plants:
            test_plant = plants[0]  # Use first plant
            print(f"✅ Got {len(plants)} plants, using: {test_plant.get('name_fr', 'Unknown')}")
        else:
            print("❌ No plants found")
            return
    else:
        print(f"❌ Failed to get plants: {plants_response.status_code}")
        return
    
    # Step 3: Add plant to garden
    print("\n3️⃣ Adding plant to garden...")
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    plant_data = {
        'plant_id': test_plant['id'],
        'custom_name': test_plant.get('name_fr', 'Test Plant'),
        'location': 'extérieur',
        'notes': 'Ajouté via script de test'
    }
    
    add_response = requests.post(
        f"{BACKEND_URL}/my-garden",
        headers=headers,
        json=plant_data
    )
    
    print(f"📊 Response status: {add_response.status_code}")
    print(f"📊 Response headers: {dict(add_response.headers)}")
    
    if add_response.status_code == 200:
        print("✅ Plant added successfully!")
        print(f"📄 Response: {add_response.json()}")
    else:
        print(f"❌ Failed to add plant: {add_response.status_code}")
        print(f"📄 Error: {add_response.text}")
    
    # Step 4: Check garden contents
    print("\n4️⃣ Checking garden contents...")
    garden_response = requests.get(
        f"{BACKEND_URL}/my-garden",
        headers=headers
    )
    
    if garden_response.status_code == 200:
        garden_plants = garden_response.json()
        print(f"✅ Garden has {len(garden_plants)} plants")
        for plant in garden_plants:
            print(f"  - {plant.get('custom_name', 'Unknown')} (ID: {plant.get('id', 'No ID')})")
    else:
        print(f"❌ Failed to get garden: {garden_response.status_code}")

if __name__ == "__main__":
    test_plant_addition()