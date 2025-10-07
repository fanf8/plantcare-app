#!/usr/bin/env python3
"""
Test script to verify plant deletion functionality
"""

import requests
import json

# Configuration
BACKEND_URL = "http://localhost:8001/api"

def test_plant_deletion():
    print("🧪 Testing Plant Deletion Functionality")
    
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
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Step 2: Add a test plant first
    print("\n2️⃣ Adding a test plant...")
    plants_response = requests.get(f"{BACKEND_URL}/plants")
    if plants_response.status_code == 200:
        plants = plants_response.json()
        if plants:
            test_plant = plants[0]  # Use first plant
            print(f"Using plant: {test_plant.get('name_fr', 'Unknown')}")
        else:
            print("❌ No plants found")
            return
    else:
        print(f"❌ Failed to get plants: {plants_response.status_code}")
        return
    
    plant_data = {
        'plant_id': test_plant['id'],
        'custom_name': f"Test Plant {test_plant.get('name_fr', 'Unknown')}",
        'location': 'test location',
        'notes': 'Test plant for deletion'
    }
    
    add_response = requests.post(
        f"{BACKEND_URL}/my-garden",
        headers=headers,
        json=plant_data
    )
    
    if add_response.status_code == 200:
        added_plant = add_response.json()
        plant_id = added_plant['id']
        print(f"✅ Test plant added successfully! ID: {plant_id}")
    else:
        print(f"❌ Failed to add test plant: {add_response.status_code}")
        return
    
    # Step 3: Verify plant exists in garden
    print("\n3️⃣ Verifying plant exists...")
    garden_response = requests.get(f"{BACKEND_URL}/my-garden", headers=headers)
    if garden_response.status_code == 200:
        garden_plants = garden_response.json()
        plant_found = any(plant['id'] == plant_id for plant in garden_plants)
        if plant_found:
            print(f"✅ Plant found in garden (Total: {len(garden_plants)} plants)")
        else:
            print("❌ Plant not found in garden")
            return
    else:
        print(f"❌ Failed to get garden: {garden_response.status_code}")
        return
    
    # Step 4: Delete the plant
    print(f"\n4️⃣ Deleting plant ID: {plant_id}...")
    delete_response = requests.delete(
        f"{BACKEND_URL}/my-garden/{plant_id}",
        headers=headers
    )
    
    print(f"📊 Delete response status: {delete_response.status_code}")
    
    if delete_response.status_code == 200:
        result = delete_response.json()
        print(f"✅ Plant deleted successfully! Response: {result}")
    else:
        print(f"❌ Failed to delete plant: {delete_response.status_code}")
        print(f"Error: {delete_response.text}")
        return
    
    # Step 5: Verify plant is removed
    print("\n5️⃣ Verifying plant is removed...")
    final_garden_response = requests.get(f"{BACKEND_URL}/my-garden", headers=headers)
    if final_garden_response.status_code == 200:
        final_plants = final_garden_response.json()
        plant_still_exists = any(plant['id'] == plant_id for plant in final_plants)
        if not plant_still_exists:
            print(f"✅ Plant successfully removed! Garden now has {len(final_plants)} plants")
            for plant in final_plants:
                print(f"  - {plant.get('custom_name', 'Unknown')} (ID: {plant.get('id', 'No ID')})")
        else:
            print("❌ Plant still exists in garden after deletion")
    else:
        print(f"❌ Failed to verify deletion: {final_garden_response.status_code}")

if __name__ == "__main__":
    test_plant_deletion()