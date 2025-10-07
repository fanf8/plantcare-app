#!/usr/bin/env python3
"""
Backend Testing Suite for Plant Wellness App
Focus: Plant Database ID Consistency and Garden Management
"""

import requests
import json
import uuid
import os
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
BACKEND_URL = "https://potagermalin.preview.emergentagent.com/api"

class PlantWellnessAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def test_user_authentication(self) -> bool:
        """Test user authentication and get token"""
        print("\n=== TESTING USER AUTHENTICATION ===")
        
        # Test user registration/login
        user_data = {
            "email": "marie.dupont@example.com",
            "name": "Marie Dupont",
            "password": "PlantLover2025!"
        }
        
        try:
            # Try login first
            login_response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"email": user_data["email"], "password": user_data["password"]}
            )
            
            if login_response.status_code == 200:
                self.user_token = login_response.json()["access_token"]
                self.log_test("User Login", True, f"Token obtained for {user_data['email']}")
                return True
            else:
                # Try registration if login fails
                register_response = self.session.post(
                    f"{self.base_url}/auth/register",
                    json=user_data
                )
                
                if register_response.status_code == 200:
                    self.user_token = register_response.json()["access_token"]
                    self.log_test("User Registration", True, f"New user created: {user_data['email']}")
                    return True
                else:
                    self.log_test("User Authentication", False, f"Registration failed: {register_response.text}")
                    return False
                    
        except Exception as e:
            self.log_test("User Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_authentication(self) -> bool:
        """Test admin authentication"""
        print("\n=== TESTING ADMIN AUTHENTICATION ===")
        
        try:
            admin_response = self.session.post(f"{self.base_url}/auth/admin-login")
            
            if admin_response.status_code == 200:
                self.admin_token = admin_response.json()["access_token"]
                admin_user = admin_response.json()["user"]
                is_premium = admin_user.get("is_premium", False)
                self.log_test("Admin Login", True, f"Admin token obtained, Premium: {is_premium}")
                return True
            else:
                self.log_test("Admin Login", False, f"Failed: {admin_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_plant_database_consistency(self) -> Dict:
        """Test plant database ID consistency - MAIN FOCUS"""
        print("\n=== TESTING PLANT DATABASE CONSISTENCY ===")
        
        results = {
            "total_plants": 0,
            "valid_ids": 0,
            "invalid_ids": 0,
            "sample_plants": [],
            "errors": []
        }
        
        try:
            # 1. Get all plants
            plants_response = self.session.get(f"{self.base_url}/plants")
            
            if plants_response.status_code != 200:
                self.log_test("Get All Plants", False, f"Failed to get plants: {plants_response.text}")
                return results
            
            plants = plants_response.json()
            results["total_plants"] = len(plants)
            
            self.log_test("Get All Plants", True, f"Retrieved {len(plants)} plants")
            
            # 2. Test individual plant retrieval for first 10 plants
            test_count = min(10, len(plants))
            
            for i, plant in enumerate(plants[:test_count]):
                plant_id = plant.get("id")
                plant_name = plant.get("name_fr", "Unknown")
                
                if not plant_id:
                    results["errors"].append(f"Plant {plant_name} has no ID")
                    continue
                
                # Test individual plant retrieval
                try:
                    individual_response = self.session.get(f"{self.base_url}/plants/{plant_id}")
                    
                    if individual_response.status_code == 200:
                        results["valid_ids"] += 1
                        individual_plant = individual_response.json()
                        
                        # Verify ID consistency
                        if individual_plant.get("id") == plant_id:
                            results["sample_plants"].append({
                                "id": plant_id,
                                "name": plant_name,
                                "category": plant.get("category"),
                                "status": "✅ Valid"
                            })
                        else:
                            results["errors"].append(f"ID mismatch for {plant_name}: list={plant_id}, individual={individual_plant.get('id')}")
                    else:
                        results["invalid_ids"] += 1
                        results["errors"].append(f"Plant {plant_name} (ID: {plant_id}) returns 404 on individual lookup")
                        results["sample_plants"].append({
                            "id": plant_id,
                            "name": plant_name,
                            "category": plant.get("category"),
                            "status": f"❌ 404 Error"
                        })
                        
                except Exception as e:
                    results["errors"].append(f"Exception testing plant {plant_name}: {str(e)}")
            
            # Log results
            success_rate = (results["valid_ids"] / test_count) * 100 if test_count > 0 else 0
            
            if results["valid_ids"] == test_count:
                self.log_test("Plant ID Consistency", True, f"All {test_count} tested plants have valid IDs")
            else:
                self.log_test("Plant ID Consistency", False, 
                            f"Only {results['valid_ids']}/{test_count} plants have valid IDs ({success_rate:.1f}%)")
            
            # Test category filtering
            for category in ["potager", "ornement"]:
                cat_response = self.session.get(f"{self.base_url}/plants?category={category}")
                if cat_response.status_code == 200:
                    cat_plants = cat_response.json()
                    self.log_test(f"Category Filter ({category})", True, f"Found {len(cat_plants)} {category} plants")
                else:
                    self.log_test(f"Category Filter ({category})", False, f"Failed: {cat_response.text}")
            
        except Exception as e:
            self.log_test("Plant Database Consistency", False, f"Exception: {str(e)}")
            results["errors"].append(f"General exception: {str(e)}")
        
        return results
    
    def test_garden_management(self, plant_results: Dict) -> bool:
        """Test garden management with valid plant IDs"""
        print("\n=== TESTING GARDEN MANAGEMENT ===")
        
        if not self.user_token:
            self.log_test("Garden Management", False, "No user token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        try:
            # 1. Get initial garden (should be empty)
            garden_response = self.session.get(f"{self.base_url}/my-garden", headers=headers)
            
            if garden_response.status_code == 200:
                initial_garden = garden_response.json()
                self.log_test("Get Initial Garden", True, f"Garden has {len(initial_garden)} plants")
            else:
                self.log_test("Get Initial Garden", False, f"Failed: {garden_response.text}")
                return False
            
            # 2. Try to add plants to garden using valid IDs
            valid_plants = [p for p in plant_results.get("sample_plants", []) if p["status"] == "✅ Valid"]
            
            if not valid_plants:
                self.log_test("Add Plant to Garden", False, "No valid plant IDs available for testing")
                return False
            
            # Test adding first valid plant
            test_plant = valid_plants[0]
            plant_data = {
                "plant_id": test_plant["id"],
                "custom_name": f"Mon {test_plant['name']}",
                "planted_date": datetime.now().isoformat(),
                "location": "extérieur",
                "notes": "Plante de test ajoutée automatiquement"
            }
            
            add_response = self.session.post(
                f"{self.base_url}/my-garden",
                json=plant_data,
                headers=headers
            )
            
            if add_response.status_code == 200:
                added_plant = add_response.json()
                user_plant_id = added_plant.get("id")
                self.log_test("Add Plant to Garden", True, 
                            f"Successfully added {test_plant['name']} (ID: {test_plant['id']})")
                
                # 3. Verify plant was added
                updated_garden_response = self.session.get(f"{self.base_url}/my-garden", headers=headers)
                if updated_garden_response.status_code == 200:
                    updated_garden = updated_garden_response.json()
                    if len(updated_garden) > len(initial_garden):
                        self.log_test("Verify Plant Added", True, f"Garden now has {len(updated_garden)} plants")
                        
                        # 4. Test updating the plant
                        update_data = {
                            "notes": "Notes mises à jour par le test automatique",
                            "health_status": "excellente"
                        }
                        
                        update_response = self.session.put(
                            f"{self.base_url}/my-garden/{user_plant_id}",
                            json=update_data,
                            headers=headers
                        )
                        
                        if update_response.status_code == 200:
                            self.log_test("Update Garden Plant", True, "Plant details updated successfully")
                        else:
                            self.log_test("Update Garden Plant", False, f"Update failed: {update_response.text}")
                        
                        # 5. Test deleting the plant
                        delete_response = self.session.delete(
                            f"{self.base_url}/my-garden/{user_plant_id}",
                            headers=headers
                        )
                        
                        if delete_response.status_code == 200:
                            self.log_test("Delete Garden Plant", True, "Plant removed successfully")
                        else:
                            self.log_test("Delete Garden Plant", False, f"Delete failed: {delete_response.text}")
                        
                    else:
                        self.log_test("Verify Plant Added", False, "Plant count didn't increase")
                else:
                    self.log_test("Verify Plant Added", False, f"Failed to get updated garden: {updated_garden_response.text}")
                
            else:
                self.log_test("Add Plant to Garden", False, f"Failed to add plant: {add_response.text}")
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Garden Management", False, f"Exception: {str(e)}")
            return False
    
    def test_id_generation_format(self, plant_results: Dict) -> bool:
        """Test that all plant IDs are valid UUIDs"""
        print("\n=== TESTING ID GENERATION FORMAT ===")
        
        valid_uuid_count = 0
        invalid_uuid_count = 0
        
        for plant in plant_results.get("sample_plants", []):
            plant_id = plant["id"]
            try:
                # Try to parse as UUID
                uuid.UUID(plant_id)
                valid_uuid_count += 1
            except ValueError:
                invalid_uuid_count += 1
                self.log_test(f"UUID Format Check", False, f"Invalid UUID for {plant['name']}: {plant_id}")
        
        if invalid_uuid_count == 0:
            self.log_test("UUID Format Validation", True, f"All {valid_uuid_count} tested plant IDs are valid UUIDs")
            return True
        else:
            self.log_test("UUID Format Validation", False, 
                        f"{invalid_uuid_count} invalid UUIDs out of {valid_uuid_count + invalid_uuid_count} tested")
            return False
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🌱 STARTING COMPREHENSIVE PLANT DATABASE TESTING 🌱")
        print("=" * 60)
        
        # 1. Authentication tests
        auth_success = self.test_user_authentication()
        admin_success = self.test_admin_authentication()
        
        # 2. Main focus: Plant database consistency
        plant_results = self.test_plant_database_consistency()
        
        # 3. Garden management tests (depends on valid plant IDs)
        garden_success = self.test_garden_management(plant_results)
        
        # 4. ID format validation
        uuid_success = self.test_id_generation_format(plant_results)
        
        # Summary
        print("\n" + "=" * 60)
        print("🔍 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Detailed plant database results
        if plant_results:
            print(f"\n📊 PLANT DATABASE DETAILS:")
            print(f"Total Plants in Database: {plant_results['total_plants']}")
            print(f"Valid IDs Tested: {plant_results['valid_ids']}")
            print(f"Invalid IDs Found: {plant_results['invalid_ids']}")
            
            if plant_results["sample_plants"]:
                print(f"\n🌿 SAMPLE PLANTS TESTED:")
                for plant in plant_results["sample_plants"]:
                    print(f"  {plant['status']} {plant['name']} ({plant['category']}) - ID: {plant['id'][:8]}...")
            
            if plant_results["errors"]:
                print(f"\n⚠️  ERRORS FOUND:")
                for error in plant_results["errors"][:5]:  # Show first 5 errors
                    print(f"  • {error}")
                if len(plant_results["errors"]) > 5:
                    print(f"  ... and {len(plant_results['errors']) - 5} more errors")
        
        # Critical issues
        critical_issues = [r for r in self.test_results if not r["success"] and "ID Consistency" in r["test"]]
        if critical_issues:
            print(f"\n🚨 CRITICAL ISSUES:")
            for issue in critical_issues:
                print(f"  • {issue['test']}: {issue['details']}")
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "plant_database_working": plant_results["valid_ids"] > plant_results["invalid_ids"],
            "garden_management_working": garden_success,
            "authentication_working": auth_success,
            "critical_issues": len(critical_issues) == 0
        }

if __name__ == "__main__":
    tester = PlantWellnessAPITester()
    results = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    if results["critical_issues"] and results["plant_database_working"]:
        print("\n✅ PLANT DATABASE FIX VERIFICATION: SUCCESS")
        exit(0)
    else:
        print("\n❌ PLANT DATABASE FIX VERIFICATION: ISSUES FOUND")
        exit(1)