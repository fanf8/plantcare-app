# Extension des données avec profondeurs de plantation et haricots

# Profondeurs de plantation par catégorie :
# - Graines fines (radis, carottes) : 0.5-1 cm
# - Graines moyennes (haricots) : 3-5 cm  
# - Plants de légumes (tomates, salades) : 10-15 cm (profondeur du godet)
# - Bulbes/tubercules : 2-3x la hauteur du bulbe
# - Arbustes : 30-40 cm
# - Arbres : 40-60 cm

HARICOTS_VARIETIES = [
    {
        "name_fr": "Haricot Vert Nain",
        "name_latin": "Phaseolus vulgaris 'Nain'",
        "variety": "Nain Mangetout",
        "category": "potager", 
        "subcategory": "legumes",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Haricots_verts.jpg/1280px-Haricots_verts.jpg",
        "description": "Haricot nain à gousses vertes tendres, semis en graines",
        "difficulty": "Facile",
        "growing_season": ["printemps", "été"],
        "sunlight": "Plein soleil",
        "watering": "Arrosage régulier sans excès",
        "soil_type": "Sol bien drainé et réchauffé",
        "monthly_watering": "Juin: 2-3 fois par semaine",
        "spacing_between_plants": "10 cm",
        "spacing_between_rows": "40 cm",
        "planting_depth": "3-4 cm (graines)",
        "planting_type": "Semis direct en graines"
    },
    {
        "name_fr": "Haricot Vert à Rame", 
        "name_latin": "Phaseolus vulgaris 'À rames'",
        "variety": "Grimpant",
        "category": "potager",
        "subcategory": "legumes", 
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Runner_beans_flowering.jpg/1280px-Runner_beans_flowering.jpg",
        "description": "Haricot grimpant nécessitant un tuteur, très productif",
        "difficulty": "Moyen",
        "growing_season": ["printemps", "été"],
        "sunlight": "Plein soleil",
        "watering": "Arrosage au pied régulier",
        "soil_type": "Sol riche et bien drainé",
        "monthly_watering": "Juin: 3 fois par semaine", 
        "spacing_between_plants": "15 cm",
        "spacing_between_rows": "60 cm",
        "planting_depth": "4-5 cm (graines)",
        "planting_type": "Semis direct en graines"
    },
    {
        "name_fr": "Haricot Beurre",
        "name_latin": "Phaseolus vulgaris 'Beurre'",
        "variety": "Mangetout Jaune",
        "category": "potager",
        "subcategory": "legumes",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Yellow_wax_beans.jpg/1280px-Yellow_wax_beans.jpg",
        "description": "Haricot aux gousses jaunes très tendres",
        "difficulty": "Facile", 
        "growing_season": ["printemps", "été"],
        "sunlight": "Plein soleil",
        "watering": "Arrosage modéré régulier",
        "soil_type": "Sol léger et fertile",
        "monthly_watering": "Juin: 2-3 fois par semaine",
        "spacing_between_plants": "12 cm", 
        "spacing_between_rows": "40 cm",
        "planting_depth": "3-4 cm (graines)",
        "planting_type": "Semis direct en graines"
    }
]

# Profondeurs pour les plantes existantes selon le type de plantation
PLANTING_DEPTHS = {
    # TOMATES (plants repiqués)
    "Tomate Cœur de Bœuf": "12-15 cm (plant)",
    "Tomate Marmande": "12-15 cm (plant)", 
    "Tomate Cerise": "10-12 cm (plant)",
    "Tomate Roma": "12-15 cm (plant)",
    "Tomate Noire de Crimée": "15 cm (plant)",
    "Tomate Cornu des Andes": "12-15 cm (plant)",
    "Tomate Buffalo": "15 cm (plant)",
    "Tomate Ananas": "12-15 cm (plant)",
    "Tomate Saint-Pierre": "12-15 cm (plant)",
    "Tomate Green Zebra": "12-15 cm (plant)",
    
    # CAROTTES (graines fines)
    "Carotte de Nantes": "0.5-1 cm (graines)",
    "Carotte de Colmar": "0.5-1 cm (graines)",
    
    # SALADES (plants ou graines)
    "Batavia Blonde": "8-10 cm (plant) / 0.5 cm (graines)",
    "Batavia Rouge": "8-10 cm (plant) / 0.5 cm (graines)", 
    "Romaine": "10-12 cm (plant)",
    "Feuille de Chêne Blonde": "8-10 cm (plant)",
    "Feuille de Chêne Rouge": "8-10 cm (plant)",
    "Lollo Rossa": "8-10 cm (plant)",
    "Iceberg": "10-12 cm (plant)",
    "Sucrine": "8-10 cm (plant)",
    "Roquette": "0.5-1 cm (graines)",
    
    # COURGETTES (plants ou graines) 
    "Courgette Verte": "12-15 cm (plant) / 2-3 cm (graines)",
    "Courgette Ronde de Nice": "12-15 cm (plant) / 2-3 cm (graines)",
    
    # RADIS (graines)
    "Radis 18 Jours": "1-1.5 cm (graines)",
    "Radis Noir": "2-3 cm (graines)",
    
    # FRAISES (plants)
    "Fraise Mara des Bois": "10-12 cm (plant)", 
    "Fraise Gariguette": "10-12 cm (plant)",
    "Fraise Charlotte": "10-12 cm (plant)",
    
    # FRAMBOISES (plants)
    "Framboise Meeker": "30-35 cm (plant)",
    "Framboise Autumn Bliss": "30-35 cm (plant)",
    
    # HERBES AROMATIQUES
    "Basilic Genovese": "8-10 cm (plant) / 0.5 cm (graines)",
    "Basilic Pourpre": "8-10 cm (plant) / 0.5 cm (graines)",
    "Persil Plat": "8-10 cm (plant) / 1 cm (graines)",
    "Persil Frisé": "8-10 cm (plant) / 1 cm (graines)",
    "Ciboulette": "8-10 cm (plant) / 1 cm (graines)",
    "Thym Commun": "8-10 cm (plant)",
    "Romarin": "15-20 cm (plant)",
    "Lavande": "15-20 cm (plant)",
    "Menthe Verte": "10-12 cm (plant)",
    "Menthe Poivrée": "10-12 cm (plant)",
    "Origan": "8-10 cm (plant)",
    "Sauge Officinale": "10-12 cm (plant)",
    "Coriandre": "1-1.5 cm (graines)",
    "Aneth": "1-2 cm (graines)",
    
    # PETITS FRUITS (plants/arbustes)
    "Cassis": "35-40 cm (arbuste)",
    "Groseillier Rouge": "35-40 cm (arbuste)", 
    "Groseillier à Maquereaux": "35-40 cm (arbuste)",
    "Myrtille": "30-35 cm (arbuste)",
    
    # ARBRES FRUITIERS
    "Cerise": "50-60 cm (arbre)",
    "Pomme": "50-60 cm (arbre)",
    "Poire": "45-55 cm (arbre)", 
    "Pêche": "50-60 cm (arbre)",
    "Prune": "45-55 cm (arbre)",
    "Abricot": "50-60 cm (arbre)",
    "Figue": "40-50 cm (arbre)",
    "Raisin": "30-40 cm (plant)", 
    "Kiwi": "40-50 cm (plant)",
    "Citronnier": "40-50 cm (arbre en pot)",
    "Oranger": "40-50 cm (arbre en pot)",
    
    # LÉGUMES DIVERS
    "Betterave Rouge": "2-3 cm (graines)",
    "Céleri Branche": "10-12 cm (plant)",
    "Fenouil Bulbeux": "10-12 cm (plant) / 1 cm (graines)",
    "Épinard": "1-2 cm (graines)", 
    "Mâche": "0.5-1 cm (graines)"
}

if __name__ == "__main__":
    print(f"🌱 {len(HARICOTS_VARIETIES)} variétés de haricots à ajouter")
    print(f"📏 {len(PLANTING_DEPTHS)} profondeurs de plantation définies")
    
    print("\nHaricots à ajouter:")
    for haricot in HARICOTS_VARIETIES:
        print(f"- {haricot['name_fr']}: {haricot['planting_depth']}")
        
    print("\nExemples de profondeurs:")
    for i, (name, depth) in enumerate(list(PLANTING_DEPTHS.items())[:5]):
        print(f"- {name}: {depth}")
    print("...")