#!/usr/bin/env python3
"""
Script pour ajouter les données d'écartement aux plantes restantes
"""

# Plantes restantes avec données d'écartement
REMAINING_PLANTS = [
    # HERBES AROMATIQUES (14 variétés) - Écartements variables
    {
        "name_fr": "Basilic Genovese",
        "spacing_between_plants": "25 cm",
        "spacing_between_rows": "30 cm"
    },
    {
        "name_fr": "Basilic Pourpre",
        "spacing_between_plants": "25 cm", 
        "spacing_between_rows": "30 cm"
    },
    {
        "name_fr": "Persil Plat",
        "spacing_between_plants": "15 cm",
        "spacing_between_rows": "25 cm"
    },
    {
        "name_fr": "Persil Frisé",
        "spacing_between_plants": "15 cm",
        "spacing_between_rows": "25 cm"
    },
    {
        "name_fr": "Ciboulette",
        "spacing_between_plants": "10 cm",
        "spacing_between_rows": "20 cm"
    },
    {
        "name_fr": "Thym Commun",
        "spacing_between_plants": "30 cm",
        "spacing_between_rows": "40 cm"
    },
    {
        "name_fr": "Romarin",
        "spacing_between_plants": "60 cm",
        "spacing_between_rows": "80 cm"
    },
    {
        "name_fr": "Lavande",
        "spacing_between_plants": "50 cm",
        "spacing_between_rows": "70 cm"
    },
    {
        "name_fr": "Menthe Verte",
        "spacing_between_plants": "30 cm",
        "spacing_between_rows": "40 cm"
    },
    {
        "name_fr": "Menthe Poivrée",
        "spacing_between_plants": "30 cm",
        "spacing_between_rows": "40 cm"
    },
    {
        "name_fr": "Origan",
        "spacing_between_plants": "25 cm",
        "spacing_between_rows": "35 cm"
    },
    {
        "name_fr": "Sauge Officinale",
        "spacing_between_plants": "40 cm",
        "spacing_between_rows": "50 cm"
    },
    {
        "name_fr": "Coriandre",
        "spacing_between_plants": "15 cm",
        "spacing_between_rows": "25 cm"
    },
    {
        "name_fr": "Aneth",
        "spacing_between_plants": "20 cm",
        "spacing_between_rows": "30 cm"
    },

    # AUTRES LÉGUMES (20 variétés)
    {
        "name_fr": "Cassis",
        "spacing_between_plants": "120 cm",
        "spacing_between_rows": "200 cm"
    },
    {
        "name_fr": "Groseillier Rouge",
        "spacing_between_plants": "120 cm",
        "spacing_between_rows": "200 cm"
    },
    {
        "name_fr": "Groseillier à Maquereaux",
        "spacing_between_plants": "120 cm", 
        "spacing_between_rows": "200 cm"
    },
    {
        "name_fr": "Myrtille",
        "spacing_between_plants": "100 cm",
        "spacing_between_rows": "150 cm"
    },
    {
        "name_fr": "Cerise",
        "spacing_between_plants": "400 cm",
        "spacing_between_rows": "500 cm"
    },
    {
        "name_fr": "Pomme",
        "spacing_between_plants": "400 cm",
        "spacing_between_rows": "500 cm"
    },
    {
        "name_fr": "Poire",
        "spacing_between_plants": "350 cm",
        "spacing_between_rows": "450 cm"
    },
    {
        "name_fr": "Pêche",
        "spacing_between_plants": "400 cm",
        "spacing_between_rows": "500 cm"
    },
    {
        "name_fr": "Prune",
        "spacing_between_plants": "350 cm",
        "spacing_between_rows": "450 cm"
    },
    {
        "name_fr": "Abricot",
        "spacing_between_plants": "400 cm",
        "spacing_between_rows": "500 cm"
    },
    {
        "name_fr": "Figue",
        "spacing_between_plants": "300 cm",
        "spacing_between_rows": "400 cm"
    },
    {
        "name_fr": "Raisin",
        "spacing_between_plants": "120 cm",
        "spacing_between_rows": "200 cm"
    },
    {
        "name_fr": "Kiwi",
        "spacing_between_plants": "300 cm",
        "spacing_between_rows": "400 cm"
    },
    {
        "name_fr": "Citronnier",
        "spacing_between_plants": "400 cm",
        "spacing_between_rows": "500 cm"
    },
    {
        "name_fr": "Oranger",
        "spacing_between_plants": "400 cm",
        "spacing_between_rows": "500 cm"
    },
    {
        "name_fr": "Betterave Rouge",
        "spacing_between_plants": "10 cm",
        "spacing_between_rows": "30 cm"
    },
    {
        "name_fr": "Céleri Branche",
        "spacing_between_plants": "25 cm",
        "spacing_between_rows": "40 cm"
    },
    {
        "name_fr": "Fenouil Bulbeux",
        "spacing_between_plants": "30 cm",
        "spacing_between_rows": "40 cm"
    },
    {
        "name_fr": "Épinard",
        "spacing_between_plants": "15 cm",
        "spacing_between_rows": "25 cm"
    },
    {
        "name_fr": "Mâche",
        "spacing_between_plants": "10 cm",
        "spacing_between_rows": "20 cm"
    }
]

if __name__ == "__main__":
    print(f"Données d'écartement pour {len(REMAINING_PLANTS)} plantes supplémentaires préparées")
    print("Plantes ajoutées :")
    for plant in REMAINING_PLANTS:
        print(f"- {plant['name_fr']}: {plant['spacing_between_plants']} entre pieds, {plant['spacing_between_rows']} entre rangées")