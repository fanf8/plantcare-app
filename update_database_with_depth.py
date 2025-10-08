#!/usr/bin/env python3
"""
Script pour mettre à jour la base de données avec les profondeurs de plantation
"""

import sys
sys.path.append('/app/backend')
from plants_database import PLANTS_DATABASE
from plants_with_depth import HARICOTS_VARIETIES, PLANTING_DEPTHS

def update_plants_with_depth():
    """Ajoute les profondeurs de plantation à toutes les plantes"""
    
    # Copier la base existante
    updated_plants = []
    
    # Mettre à jour les plantes existantes
    for plant in PLANTS_DATABASE:
        updated_plant = plant.copy()
        plant_name = plant['name_fr']
        
        if plant_name in PLANTING_DEPTHS:
            updated_plant['planting_depth'] = PLANTING_DEPTHS[plant_name]
            
            # Ajouter le type de plantation selon la profondeur
            if 'graines' in PLANTING_DEPTHS[plant_name]:
                updated_plant['planting_type'] = 'Semis direct en graines'
            elif 'plant' in PLANTING_DEPTHS[plant_name]:
                updated_plant['planting_type'] = 'Repiquage de plants'
            elif 'arbuste' in PLANTING_DEPTHS[plant_name]:
                updated_plant['planting_type'] = 'Plantation d\'arbuste'
            elif 'arbre' in PLANTING_DEPTHS[plant_name]:
                updated_plant['planting_type'] = 'Plantation d\'arbre'
            else:
                updated_plant['planting_type'] = 'Plantation standard'
        else:
            # Valeur par défaut
            updated_plant['planting_depth'] = "10-12 cm (standard)"
            updated_plant['planting_type'] = "Plantation standard"
            
        updated_plants.append(updated_plant)
    
    # Ajouter les haricots
    updated_plants.extend(HARICOTS_VARIETIES)
    
    print(f"✅ Mise à jour terminée :")
    print(f"   - {len(PLANTS_DATABASE)} plantes existantes mises à jour avec profondeurs")
    print(f"   - {len(HARICOTS_VARIETIES)} variétés de haricots ajoutées")
    print(f"   - Total : {len(updated_plants)} variétés avec profondeurs complètes")
    
    return updated_plants

def generate_updated_database_file():
    """Génère le fichier de base de données mise à jour"""
    
    updated_plants = update_plants_with_depth()
    
    # Créer le contenu du fichier
    file_content = '''# Base de données complète des plantes avec variétés, écartements et profondeurs de plantation
# 67 variétés avec spécifications complètes pour jardiniers premium

PLANTS_DATABASE = [
'''
    
    for i, plant in enumerate(updated_plants):
        file_content += "    {\n"
        for key, value in plant.items():
            if isinstance(value, str):
                file_content += f'        "{key}": "{value}",\n'
            elif isinstance(value, list):
                file_content += f'        "{key}": {value},\n'
            else:
                file_content += f'        "{key}": "{value}",\n'
        file_content = file_content.rstrip(',\n') + '\n'  # Remove last comma
        file_content += "    }"
        
        if i < len(updated_plants) - 1:
            file_content += ","
        file_content += "\n"
    
    file_content += "]\n"
    
    return file_content

if __name__ == "__main__":
    print("🌱 Mise à jour de la base de données avec profondeurs de plantation...")
    
    # Générer le fichier mis à jour
    updated_content = generate_updated_database_file()
    
    # Écrire le fichier
    with open('/app/backend/plants_database_updated.py', 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print("📁 Fichier généré : /app/backend/plants_database_updated.py")
    print("🔄 Prêt à remplacer plants_database.py")
    
    # Afficher quelques exemples
    plants = update_plants_with_depth()
    print(f"\n🔍 Exemples de profondeurs ajoutées :")
    
    # Haricots
    haricots = [p for p in plants if 'Haricot' in p['name_fr']]
    print(f"\n🌱 Haricots ({len(haricots)} variétés) :")
    for h in haricots:
        print(f"   - {h['name_fr']}: {h['planting_depth']} - {h['planting_type']}")
    
    # Autres exemples
    examples = [p for p in plants if p['name_fr'] in ['Tomate Cœur de Bœuf', 'Carotte de Nantes', 'Radis 18 Jours']]
    print(f"\n📏 Autres exemples :")
    for ex in examples:
        print(f"   - {ex['name_fr']}: {ex['planting_depth']} - {ex['planting_type']}")