#!/usr/bin/env python3
"""
Script pour nettoyer les doublons dans le jardin utilisateur
"""

import requests
import json

# Configuration
BACKEND_URL = "http://localhost:8001/api"

def clean_garden_duplicates():
    print("🧹 Nettoyage des doublons dans le jardin...")
    
    # Admin login
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
    
    # Obtenir toutes les plantes du jardin
    garden_response = requests.get(f"{BACKEND_URL}/my-garden", headers=headers)
    
    if garden_response.status_code == 200:
        garden_plants = garden_response.json()
        print(f"📊 {len(garden_plants)} plantes trouvées dans le jardin")
        
        # Grouper par nom de plante pour identifier les doublons
        plant_groups = {}
        for plant in garden_plants:
            name = plant.get('custom_name', 'Unknown')
            if name not in plant_groups:
                plant_groups[name] = []
            plant_groups[name].append(plant)
        
        # Supprimer les doublons (garder seulement le premier de chaque groupe)
        deleted_count = 0
        for plant_name, plants in plant_groups.items():
            if len(plants) > 1:
                print(f"🔍 {len(plants)} doublons trouvés pour '{plant_name}'")
                # Garder le premier, supprimer les autres
                for plant_to_delete in plants[1:]:
                    delete_response = requests.delete(
                        f"{BACKEND_URL}/my-garden/{plant_to_delete['id']}",
                        headers=headers
                    )
                    if delete_response.status_code == 200:
                        deleted_count += 1
                        print(f"  ✅ Supprimé doublon ID: {plant_to_delete['id']}")
                    else:
                        print(f"  ❌ Échec suppression ID: {plant_to_delete['id']}")
        
        print(f"\n🎉 Nettoyage terminé ! {deleted_count} doublons supprimés")
        
        # Vérifier le résultat final
        final_response = requests.get(f"{BACKEND_URL}/my-garden", headers=headers)
        if final_response.status_code == 200:
            final_plants = final_response.json()
            print(f"📊 Jardin final: {len(final_plants)} plantes uniques")
            for plant in final_plants:
                print(f"  - {plant.get('custom_name', 'Unknown')} (ID: {plant.get('id', 'No ID')})")
    else:
        print(f"❌ Failed to get garden: {garden_response.status_code}")

if __name__ == "__main__":
    clean_garden_duplicates()