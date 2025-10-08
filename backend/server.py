from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from plants_database import PLANTS_DATABASE

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = "plant-wellness-secret-key-very-secure-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Le potager malin API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: str
    is_premium: bool = False
    subscription_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class Plant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_fr: str
    name_latin: Optional[str] = None
    variety: Optional[str] = None  # Variety name (e.g., "Batavia" for lettuce)
    category: str  # "potager" or "ornement"
    subcategory: Optional[str] = None  # "legume", "herbe", "fleur", "arbuste", etc.
    image_base64: Optional[str] = None
    image_url: Optional[str] = None  # URL for plant image
    description: Optional[str] = None
    care_instructions: Optional[str] = None
    growing_season: Optional[List[str]] = None
    difficulty: Optional[str] = None  # "facile", "moyen", "difficile"
    sunlight: Optional[str] = None
    watering: Optional[str] = None
    soil_type: Optional[str] = None
    monthly_watering: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserPlant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plant_id: str
    custom_name: Optional[str] = None
    planted_date: Optional[datetime] = None
    location: Optional[str] = None  # "intérieur", "extérieur", "serre"
    notes: Optional[str] = None
    image_base64: Optional[str] = None
    last_watered: Optional[datetime] = None
    next_watering: Optional[datetime] = None
    health_status: str = "bonne"  # "excellente", "bonne", "préoccupante", "malade"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserPlantCreate(BaseModel):
    plant_id: str
    custom_name: Optional[str] = None
    planted_date: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    image_base64: Optional[str] = None

class AIAnalysisRequest(BaseModel):
    image_base64: str
    analysis_type: str  # "identification", "diagnostic", "soins"
    user_plant_id: Optional[str] = None

class AIAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    image_base64: str
    analysis_type: str
    result: Dict[str, Any]
    confidence: Optional[float] = None
    user_plant_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CommunityPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    author_name: str
    title: str
    content: str
    image_base64: Optional[str] = None
    plant_category: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CommunityPostCreate(BaseModel):
    title: str
    content: str
    image_base64: Optional[str] = None
    plant_category: Optional[str] = None

class CommunityComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    author_name: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CommunityCommentCreate(BaseModel):
    content: str

class SubscriptionPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price_euros: float
    features: List[str]
    stripe_price_id: Optional[str] = None

class SubscriptionCreate(BaseModel):
    plan_type: str
    payment_method: str

class WateringSchedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_plant_id: str
    schedule_type: str  # "auto" ou "custom"
    custom_days: Optional[List[int]] = None  # [1,3,5] pour lundi, mercredi, vendredi (1=lundi, 7=dimanche)
    auto_frequency: Optional[int] = None  # nombre d'arrosages par semaine calculé automatiquement
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WateringScheduleCreate(BaseModel):
    user_plant_id: str
    schedule_type: str  # "auto" ou "custom"
    custom_days: Optional[List[int]] = None

class WateringScheduleUpdate(BaseModel):
    schedule_type: Optional[str] = None
    custom_days: Optional[List[int]] = None

# ============= UTILITY FUNCTIONS =============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

async def get_premium_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for this feature"
        )
    return current_user

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_dict = user_data.dict()
    user_dict.pop("password")
    user_dict["password_hash"] = get_password_hash(user_data.password)
    user_obj = User(**user_dict)
    
    await db.users.insert_one(user_obj.dict())
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.email}, expires_delta=access_token_expires
    )
    
    user_response = user_obj.dict()
    user_response.pop("password_hash")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    await db.users.update_one(
        {"email": user_data.email},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    user_response = User(**user).dict()
    user_response.pop("password_hash")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    user_response = current_user.dict()
    user_response.pop("password_hash")
    return user_response

@api_router.post("/auth/admin-login", response_model=Token)
async def admin_login():
    """Admin login without credentials - creates/returns admin user"""
    
    # Check if admin user exists
    admin_email = "admin@lepotagermalin.com"
    admin_user = await db.users.find_one({"email": admin_email})
    
    if not admin_user:
        # Create admin user
        admin_data = {
            "email": admin_email,
            "name": "Administrateur Le potager malin",
            "password_hash": get_password_hash("admin123"),  # Fallback password
            "is_premium": True,  # Admin has premium access
        }
        admin_obj = User(**admin_data)
        await db.users.insert_one(admin_obj.dict())
        admin_user = admin_obj.dict()
    else:
        # Update existing admin to ensure premium status
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"is_premium": True, "last_login": datetime.utcnow()}}
        )
    
    # Create admin token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin_email}, expires_delta=access_token_expires
    )
    
    user_response = User(**admin_user).dict()
    user_response.pop("password_hash")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

# ============= PLANTS ROUTES =============

@api_router.get("/plants", response_model=List[Plant])
async def get_plants(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    
    plants = await db.plants.find(query).to_list(1000)
    return [Plant(**plant) for plant in plants]

@api_router.get("/plants/{plant_id}", response_model=Plant)
async def get_plant(plant_id: str):
    plant = await db.plants.find_one({"id": plant_id})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return Plant(**plant)

# ============= USER GARDEN ROUTES =============

@api_router.get("/my-garden", response_model=List[UserPlant])
async def get_my_garden(current_user: User = Depends(get_current_user)):
    user_plants = await db.user_plants.find({"user_id": current_user.id}).to_list(1000)
    return [UserPlant(**plant) for plant in user_plants]

@api_router.post("/my-garden", response_model=UserPlant)
async def add_plant_to_garden(
    plant_data: UserPlantCreate,
    current_user: User = Depends(get_current_user)
):
    # Verify plant exists
    plant = await db.plants.find_one({"id": plant_data.plant_id})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    user_plant_dict = plant_data.dict()
    user_plant_dict["user_id"] = current_user.id
    user_plant_obj = UserPlant(**user_plant_dict)
    
    await db.user_plants.insert_one(user_plant_obj.dict())
    return user_plant_obj

@api_router.put("/my-garden/{plant_id}", response_model=UserPlant)
async def update_garden_plant(
    plant_id: str,
    plant_data: dict,
    current_user: User = Depends(get_current_user)
):
    result = await db.user_plants.update_one(
        {"id": plant_id, "user_id": current_user.id},
        {"$set": plant_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    updated_plant = await db.user_plants.find_one({"id": plant_id})
    return UserPlant(**updated_plant)

@api_router.delete("/my-garden/{plant_id}")
async def remove_plant_from_garden(
    plant_id: str,
    current_user: User = Depends(get_current_user)
):
    result = await db.user_plants.delete_one({"id": plant_id, "user_id": current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    return {"message": "Plant removed from garden"}

# ============= AI ANALYSIS ROUTES (PREMIUM) =============

@api_router.post("/ai/analyze", response_model=Dict[str, Any])
async def analyze_plant(
    analysis_request: AIAnalysisRequest,
    current_user: User = Depends(get_premium_user)
):
    # This is where we'll integrate with Emergent LLM API
    # For now, return a mock response
    
    if analysis_request.analysis_type == "identification":
        result = {
            "plant_name": "Tomate (Solanum lycopersicum)",
            "confidence": 0.85,
            "description": "Plante potagère de la famille des solanacées",
            "category": "potager",
            "subcategory": "legume"
        }
    elif analysis_request.analysis_type == "diagnostic":
        result = {
            "health_status": "Légère carence en azote",
            "symptoms": ["Jaunissement des feuilles inférieures"],
            "severity": "faible",
            "confidence": 0.78
        }
    else:  # soins
        result = {
            "care_plan": {
                "watering": "Arrosage tous les 2-3 jours",
                "fertilizing": "Engrais riche en azote une fois par semaine",
                "pruning": "Tailler les gourmands régulièrement",
                "temperature": "Température optimale: 18-25°C"
            },
            "next_actions": [
                "Arroser dans 2 jours",
                "Appliquer engrais azote",
                "Vérifier présence de nuisibles"
            ]
        }
    
    # Save analysis
    analysis = AIAnalysis(
        user_id=current_user.id,
        image_base64=analysis_request.image_base64,
        analysis_type=analysis_request.analysis_type,
        result=result,
        confidence=result.get("confidence"),
        user_plant_id=analysis_request.user_plant_id
    )
    
    await db.ai_analyses.insert_one(analysis.dict())
    
    return result

@api_router.get("/ai/history", response_model=List[AIAnalysis])
async def get_analysis_history(current_user: User = Depends(get_premium_user)):
    analyses = await db.ai_analyses.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(100)
    return [AIAnalysis(**analysis) for analysis in analyses]

@api_router.post("/scanner/analyze")
async def analyze_plant_with_premium_check(
    request: AIAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """Analyser une image de plante avec GPT-4 Vision"""
    try:
        # Vérifier le type d'analyse demandé
        if request.analysis_type == "diagnostic" and not current_user.is_premium:
            raise HTTPException(
                status_code=402, 
                detail="Fonctionnalité premium requise. Le diagnostic des maladies est réservé aux utilisateurs premium."
            )
        
        if request.analysis_type == "identification":
            # GRATUIT : Identification de plante seulement
            mock_analysis = {
                "plant_name": "Basilic",
                "confidence": 0.95,
                "latin_name": "Ocimum basilicum",
                "description": "Cette plante ressemble à du basilic. Les feuilles sont vertes et ovales, caractéristiques de cette herbe aromatique méditerranéenne.",
                "basic_care": [
                    "Exposition : Plein soleil",
                    "Arrosage : Régulier mais modéré",
                    "Sol : Bien drainé et fertile"
                ],
                "analysis_type": "identification"
            }
        
        elif request.analysis_type == "diagnostic" and current_user.is_premium:
            # PREMIUM : Diagnostic complet avec maladies
            mock_analysis = {
                "plant_name": "Basilic",
                "confidence": 0.92,
                "latin_name": "Ocimum basilicum",
                "health_status": "Légèrement préoccupant",
                "diseases_detected": [
                    {
                        "name": "Mildiou du basilic",
                        "confidence": 0.78,
                        "description": "Taches brunes sur les feuilles, possibles signes de mildiou",
                        "severity": "Modéré"
                    }
                ],
                "treatments": [
                    {
                        "type": "Préventif",
                        "action": "Éviter l'arrosage sur les feuilles",
                        "details": "Arroser uniquement au pied pour éviter l'humidité sur le feuillage"
                    },
                    {
                        "type": "Traitement",
                        "action": "Pulvérisation de bouillie bordelaise",
                        "details": "Appliquer en fin de journée, 2-3 fois par semaine"
                    }
                ],
                "advanced_care": [
                    "Améliorer la circulation d'air autour de la plante",
                    "Espacer les plants pour éviter la propagation",
                    "Retirer les feuilles atteintes"
                ],
                "analysis_type": "diagnostic"
            }
        
        else:
            raise HTTPException(status_code=400, detail="Type d'analyse non valide")
        
        # Save analysis to database
        analysis = AIAnalysis(
            user_id=current_user.id,
            image_base64=request.image_base64,
            analysis_type=request.analysis_type,
            result=mock_analysis,
            confidence=mock_analysis.get("confidence"),
            user_plant_id=request.user_plant_id
        )
        
        await db.ai_analyses.insert_one(analysis.dict())
        
        return {
            "success": True,
            "analysis": mock_analysis,
            "analysis_id": analysis.id,
            "is_premium_feature": request.analysis_type == "diagnostic"
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse d'image: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'analyse de l'image")

# ============= COMMUNITY ROUTES =============

@api_router.get("/community/posts", response_model=List[CommunityPost])
async def get_community_posts(category: Optional[str] = None):
    query = {}
    if category:
        query["plant_category"] = category
    
    posts = await db.community_posts.find(query).sort("created_at", -1).to_list(100)
    return [CommunityPost(**post) for post in posts]

@api_router.post("/community/posts", response_model=CommunityPost)
async def create_community_post(
    post_data: CommunityPostCreate,
    current_user: User = Depends(get_current_user)
):
    post_dict = post_data.dict()
    post_dict["user_id"] = current_user.id
    post_dict["author_name"] = current_user.name
    post_obj = CommunityPost(**post_dict)
    
    await db.community_posts.insert_one(post_obj.dict())
    return post_obj

@api_router.post("/community/posts/{post_id}/like")
async def like_post(
    post_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check if already liked
    existing_like = await db.post_likes.find_one({
        "post_id": post_id,
        "user_id": current_user.id
    })
    
    if existing_like:
        # Unlike
        await db.post_likes.delete_one({"post_id": post_id, "user_id": current_user.id})
        await db.community_posts.update_one(
            {"id": post_id},
            {"$inc": {"likes_count": -1}}
        )
        return {"liked": False}
    else:
        # Like
        await db.post_likes.insert_one({
            "id": str(uuid.uuid4()),
            "post_id": post_id,
            "user_id": current_user.id,
            "created_at": datetime.utcnow()
        })
        await db.community_posts.update_one(
            {"id": post_id},
            {"$inc": {"likes_count": 1}}
        )
        return {"liked": True}

# ============= SUBSCRIPTION ROUTES =============

@api_router.get("/subscription/plans", response_model=List[SubscriptionPlan])
async def get_subscription_plans():
    plans = [
        SubscriptionPlan(
            name="Premium Plant Care",
            price_euros=9.99,
            features=[
                "Identification IA illimitée",
                "Diagnostic de santé des plantes",
                "Recommandations personnalisées",
                "Calendrier de soins intelligent",
                "Support prioritaire"
            ]
        )
    ]
    return plans

@api_router.post("/subscription/create-checkout")
async def create_checkout_session(current_user: User = Depends(get_current_user)):
    # This would integrate with Stripe
    # For now, return mock checkout URL
    return {
        "checkout_url": "https://checkout.stripe.com/mock-session",
        "session_id": "cs_mock_123456"
    }

# ============= WATERING SCHEDULE ROUTES =============

@api_router.post("/watering-schedule", response_model=WateringSchedule)
async def create_watering_schedule(
    schedule_data: WateringScheduleCreate,
    current_user: User = Depends(get_current_user)
):
    """Créer un nouveau calendrier d'arrosage pour une plante de l'utilisateur"""
    
    # Vérifier que la plante appartient à l'utilisateur
    user_plant = await db.user_plants.find_one({
        "id": schedule_data.user_plant_id,
        "user_id": current_user.id
    })
    if not user_plant:
        raise HTTPException(status_code=404, detail="Plante non trouvée")
    
    # Calculer la fréquence automatique si mode "auto"
    auto_frequency = None
    if schedule_data.schedule_type == "auto":
        # Extraire la fréquence des données de la plante
        plant_data = next((p for p in PLANTS_DATABASE if p["name_fr"] == user_plant["plant_name"]), None)
        if plant_data and "monthly_watering" in plant_data:
            monthly_watering = plant_data["monthly_watering"]
            # Parser "Juin: 2-3 fois par semaine" -> prendre la moyenne
            if "fois par semaine" in monthly_watering:
                parts = monthly_watering.split(":")
                if len(parts) > 1:
                    freq_part = parts[1].strip()
                    if "2-3" in freq_part:
                        auto_frequency = 3  # prendre le maximum
                    elif "3-4" in freq_part:
                        auto_frequency = 4
                    elif "1-2" in freq_part:
                        auto_frequency = 2
                    elif freq_part.startswith("3"):
                        auto_frequency = 3
                    elif freq_part.startswith("2"):
                        auto_frequency = 2
                    elif freq_part.startswith("1"):
                        auto_frequency = 1
                    elif freq_part.startswith("4"):
                        auto_frequency = 4
        if auto_frequency is None:
            auto_frequency = 2  # défaut: 2 fois par semaine
    
    # Supprimer l'ancien planning s'il existe
    await db.watering_schedules.delete_many({
        "user_id": current_user.id,
        "user_plant_id": schedule_data.user_plant_id
    })
    
    # Créer le nouveau planning
    schedule = WateringSchedule(
        user_id=current_user.id,
        user_plant_id=schedule_data.user_plant_id,
        schedule_type=schedule_data.schedule_type,
        custom_days=schedule_data.custom_days,
        auto_frequency=auto_frequency
    )
    
    await db.watering_schedules.insert_one(schedule.dict())
    return schedule

@api_router.get("/watering-schedule/{user_plant_id}", response_model=Optional[WateringSchedule])
async def get_watering_schedule(
    user_plant_id: str,
    current_user: User = Depends(get_current_user)
):
    """Récupérer le calendrier d'arrosage d'une plante"""
    
    schedule = await db.watering_schedules.find_one({
        "user_id": current_user.id,
        "user_plant_id": user_plant_id
    })
    
    if schedule:
        return WateringSchedule(**schedule)
    return None

@api_router.put("/watering-schedule/{user_plant_id}", response_model=WateringSchedule)
async def update_watering_schedule(
    user_plant_id: str,
    update_data: WateringScheduleUpdate,
    current_user: User = Depends(get_current_user)
):
    """Mettre à jour le calendrier d'arrosage d'une plante"""
    
    existing_schedule = await db.watering_schedules.find_one({
        "user_id": current_user.id,
        "user_plant_id": user_plant_id
    })
    
    if not existing_schedule:
        raise HTTPException(status_code=404, detail="Planning d'arrosage non trouvé")
    
    update_dict = update_data.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow()
    
    # Recalculer auto_frequency si changement vers "auto"
    if update_dict.get("schedule_type") == "auto":
        user_plant = await db.user_plants.find_one({
            "id": user_plant_id,
            "user_id": current_user.id
        })
        if user_plant:
            plant_data = next((p for p in PLANTS_DATABASE if p["name_fr"] == user_plant["plant_name"]), None)
            if plant_data and "monthly_watering" in plant_data:
                monthly_watering = plant_data["monthly_watering"]
                auto_frequency = 2  # défaut
                if "fois par semaine" in monthly_watering:
                    parts = monthly_watering.split(":")
                    if len(parts) > 1:
                        freq_part = parts[1].strip()
                        if "2-3" in freq_part:
                            auto_frequency = 3
                        elif "3-4" in freq_part:
                            auto_frequency = 4
                        elif "1-2" in freq_part:
                            auto_frequency = 2
                        elif freq_part.startswith("3"):
                            auto_frequency = 3
                        elif freq_part.startswith("2"):
                            auto_frequency = 2
                        elif freq_part.startswith("1"):
                            auto_frequency = 1
                        elif freq_part.startswith("4"):
                            auto_frequency = 4
                update_dict["auto_frequency"] = auto_frequency
    
    await db.watering_schedules.update_one(
        {"user_id": current_user.id, "user_plant_id": user_plant_id},
        {"$set": update_dict}
    )
    
    updated_schedule = await db.watering_schedules.find_one({
        "user_id": current_user.id,
        "user_plant_id": user_plant_id
    })
    
    return WateringSchedule(**updated_schedule)

@api_router.delete("/watering-schedule/{user_plant_id}")
async def delete_watering_schedule(
    user_plant_id: str,
    current_user: User = Depends(get_current_user)
):
    """Supprimer le calendrier d'arrosage d'une plante"""
    
    result = await db.watering_schedules.delete_one({
        "user_id": current_user.id,
        "user_plant_id": user_plant_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Planning d'arrosage non trouvé")
    
    return {"message": "Planning d'arrosage supprimé"}

# ============= PREMIUM FEATURES ROUTES =============

@api_router.get("/premium/weather")
async def get_weather_data(
    location: str = "Paris",
    current_user: User = Depends(get_current_user)
):
    """Obtenir les données météo - Fonctionnalité Premium"""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=402, 
            detail="Fonctionnalité premium requise. L'accès aux données météo est réservé aux utilisateurs premium."
        )
    
    # Mock weather data - in production, integrate with OpenWeatherMap API
    mock_weather = {
        "location": location,
        "current": {
            "temperature": 22,
            "humidity": 65,
            "weather": "Nuageux",
            "wind_speed": 12,
            "uv_index": 4
        },
        "forecast": [
            {"day": "Aujourd'hui", "temp_max": 24, "temp_min": 18, "weather": "Nuageux", "rain_chance": 30},
            {"day": "Demain", "temp_max": 26, "temp_min": 20, "weather": "Ensoleillé", "rain_chance": 10},
            {"day": "Après-demain", "temp_max": 23, "temp_min": 17, "weather": "Pluvieux", "rain_chance": 80},
        ],
        "garden_advice": [
            "Humidité élevée : Surveillez les maladies fongiques",
            "UV modéré : Pas besoin d'ombrager les plants sensibles",
            "Pluie prévue après-demain : Reporter l'arrosage"
        ]
    }
    
    return mock_weather

@api_router.get("/premium/advanced-care/{plant_name}")
async def get_advanced_care_tips(
    plant_name: str,
    current_user: User = Depends(get_current_user)
):
    """Obtenir des conseils avancés pour une plante - Fonctionnalité Premium"""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=402, 
            detail="Fonctionnalité premium requise. Les conseils avancés sont réservés aux utilisateurs premium."
        )
    
    # Mock advanced care data
    mock_advanced_care = {
        "plant_name": plant_name,
        "seasonal_care": {
            "printemps": [
                "Commencer les semis sous abri",
                "Préparer le sol avec du compost",
                "Surveiller les dernières gelées"
            ],
            "été": [
                "Arroser tôt le matin ou en soirée",
                "Pailler pour conserver l'humidité",
                "Pincer les fleurs pour prolonger la récolte"
            ],
            "automne": [
                "Récolter avant les premières gelées",
                "Préparer les plants pour l'hivernage",
                "Nettoyer et désinfecter les outils"
            ],
            "hiver": [
                "Protéger avec un voile d'hivernage",
                "Réduire drastiquement l'arrosage",
                "Planifier les cultures de la saison prochaine"
            ]
        },
        "pest_management": [
            {
                "pest": "Pucerons",
                "prevention": "Favoriser les coccinelles avec des plantes mellifères",
                "treatment": "Pulvérisation d'eau savonneuse",
                "organic": True
            },
            {
                "pest": "Limaces",
                "prevention": "Barrières de cendres ou coquilles d'œufs",
                "treatment": "Pièges à bière",
                "organic": True
            }
        ],
        "companion_planting": [
            "Basilic : Éloigne les mouches et moustiques",
            "Œillets d'Inde : Protègent contre les nématodes",
            "Capucines : Attirent les pucerons loin des cultures"
        ],
        "harvest_optimization": [
            "Récolter le matin après la rosée pour plus de fraîcheur",
            "Couper avec des ciseaux propres pour éviter les infections",
            "Ne pas récolter plus d'1/3 de la plante à la fois"
        ],
        "soil_analysis": {
            "ph_optimal": "6.0 - 7.0",
            "nutrients": ["Azote modéré", "Phosphore élevé", "Potassium élevé"],
            "amendments": ["Compost bien décomposé", "Cendre de bois (potassium)"]
        }
    }
    
    return mock_advanced_care

@api_router.get("/premium/plant-calendar")
async def get_planting_calendar(
    region: str = "tempéré",
    current_user: User = Depends(get_current_user)
):
    """Calendrier de plantation personnalisé - Fonctionnalité Premium"""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=402, 
            detail="Fonctionnalité premium requise. Le calendrier de plantation est réservé aux utilisateurs premium."
        )
    
    mock_calendar = {
        "region": region,
        "current_month": "Octobre",
        "this_month": {
            "sow": ["Épinards d'hiver", "Mâche", "Radis d'hiver"],
            "plant": ["Ail", "Échalotes", "Oignons blancs"],
            "harvest": ["Courges", "Potimarrons", "Dernières tomates"],
            "care": ["Nettoyer les parcelles", "Préparer le compost", "Protéger les plants sensibles"]
        },
        "next_month": {
            "sow": ["Fèves", "Petits pois (sous abri)"],
            "plant": ["Arbres fruitiers", "Arbustes à baies"],
            "harvest": ["Choux d'hiver", "Poireaux"],
            "care": ["Pailler les cultures", "Entretenir les outils", "Planifier la saison prochaine"]
        },
        "lunar_calendar": [
            {"date": "15 octobre", "phase": "Lune croissante", "activity": "Favorable aux semis de légumes-feuilles"},
            {"date": "20 octobre", "phase": "Pleine lune", "activity": "Éviter les semis, préférer les récoltes"},
            {"date": "25 octobre", "phase": "Lune décroissante", "activity": "Favorise l'enracinement des plantations"}
        ]
    }
    
    return mock_calendar

@api_router.get("/premium/lunar-calendar")
async def get_lunar_calendar(
    current_user: User = Depends(get_current_user)
):
    """Calendrier lunaire pour le jardinage - Fonctionnalité Premium"""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=402, 
            detail="Fonctionnalité premium requise. Le calendrier lunaire est réservé aux utilisateurs premium."
        )
    
    # Mock lunar calendar data starting from this Tuesday
    from datetime import datetime, timedelta
    
    # Trouver le mardi de cette semaine
    today = datetime.now()
    days_ahead = 1 - today.weekday()  # Mardi = 1
    if days_ahead <= 0:  # Si mardi est passé, prendre le mardi suivant
        days_ahead += 7
    next_tuesday = today + timedelta(days=days_ahead)
    
    mock_lunar_calendar = {
        "period": f"Du {next_tuesday.strftime('%d/%m')} au {(next_tuesday + timedelta(days=13)).strftime('%d/%m')}",
        "current_phase": {
            "name": "Lune croissante",
            "icon": "🌒",
            "description": "Période favorable aux semis et plantations des légumes-feuilles",
            "energy": "Montante"
        },
        "weekly_calendar": [
            {
                "date": next_tuesday.strftime("%d/%m"),
                "day": "Mardi",
                "phase": "🌒",
                "phase_name": "Premier croissant",
                "garden_activities": [
                    "Semer les radis et épinards",
                    "Planter les salades d'automne",
                    "Arroser les semis récents"
                ],
                "avoid": ["Taille des arbres"],
                "optimal_hours": "6h-10h et 16h-19h"
            },
            {
                "date": (next_tuesday + timedelta(days=1)).strftime("%d/%m"),
                "day": "Mercredi", 
                "phase": "🌓",
                "phase_name": "Lune croissante",
                "garden_activities": [
                    "Repiquer les jeunes plants",
                    "Fertiliser les cultures en place",
                    "Semer les haricots verts (sous abri)"
                ],
                "avoid": ["Récolte des fruits de conservation"],
                "optimal_hours": "7h-11h et 15h-18h"
            },
            {
                "date": (next_tuesday + timedelta(days=2)).strftime("%d/%m"),
                "day": "Jeudi",
                "phase": "🌔",
                "phase_name": "Lune gibbeuse croissante", 
                "garden_activities": [
                    "Planter les arbustes à fruits",
                    "Greffer les rosiers",
                    "Traiter préventivement contre les maladies"
                ],
                "avoid": ["Taille sévère"],
                "optimal_hours": "8h-12h et 17h-20h"
            },
            {
                "date": (next_tuesday + timedelta(days=3)).strftime("%d/%m"),
                "day": "Vendredi",
                "phase": "🌕",
                "phase_name": "Pleine lune",
                "garden_activities": [
                    "Récolter les légumes racines",
                    "Cueillir les herbes aromatiques",
                    "Préparer les décoctions de plantes"
                ],
                "avoid": ["Semis délicat", "Greffage"],
                "optimal_hours": "Éviter 12h-14h (trop intense)"
            },
            {
                "date": (next_tuesday + timedelta(days=4)).strftime("%d/%m"),
                "day": "Samedi",
                "phase": "🌖",
                "phase_name": "Lune gibbeuse décroissante",
                "garden_activities": [
                    "Tailler les haies et arbustes",
                    "Diviser les vivaces", 
                    "Composter les déchets verts"
                ],
                "avoid": ["Semis de légumes-feuilles"],
                "optimal_hours": "6h-9h et 16h-19h"
            },
            {
                "date": (next_tuesday + timedelta(days=5)).strftime("%d/%m"),
                "day": "Dimanche",
                "phase": "🌗",
                "phase_name": "Dernier quartier",
                "garden_activities": [
                    "Planter bulbes d'automne",
                    "Préparer le sol pour l'hiver",
                    "Nettoyer les outils de jardinage"
                ],
                "avoid": ["Greffage", "Bouturage"],
                "optimal_hours": "7h-10h et 15h-17h"
            },
            {
                "date": (next_tuesday + timedelta(days=6)).strftime("%d/%m"),
                "day": "Lundi",
                "phase": "🌘",
                "phase_name": "Lune décroissante",
                "garden_activities": [
                    "Semer les légumes racines", 
                    "Planter ail et échalotes",
                    "Effectuer les dernières récoltes"
                ],
                "avoid": ["Taille des rosiers"],
                "optimal_hours": "8h-11h et 16h-18h"
            }
        ],
        "monthly_overview": {
            "best_sowing_days": [
                (next_tuesday + timedelta(days=1)).strftime("%d/%m") + " - Légumes feuilles",
                (next_tuesday + timedelta(days=6)).strftime("%d/%m") + " - Légumes racines"
            ],
            "best_planting_days": [
                next_tuesday.strftime("%d/%m") + " - Salades et aromates",
                (next_tuesday + timedelta(days=2)).strftime("%d/%m") + " - Arbustes fruitiers"
            ],
            "best_harvest_days": [
                (next_tuesday + timedelta(days=3)).strftime("%d/%m") + " - Pleine lune (optimal)",
                (next_tuesday + timedelta(days=5)).strftime("%d/%m") + " - Légumes de conservation"
            ]
        },
        "tips": [
            "🌙 La lune croissante favorise la montée de sève",
            "🌱 Semer 2-3 jours avant la pleine lune pour une meilleure germination", 
            "🍂 La lune décroissante est idéale pour les travaux souterrains",
            "⏰ Éviter de jardiner 2h avant et après le lever/coucher de lune"
        ]
    }
    
    return mock_lunar_calendar

@api_router.get("/premium/advanced-tips")
async def get_advanced_tips(current_user: User = Depends(get_premium_user)):
    """Get advanced gardening tips - Premium only"""
    return {
        "tips": [
            {
                "category": "Arrosage",
                "title": "Technique de l'arrosage au goutte-à-goutte",
                "description": "Installez un système d'arrosage goutte-à-goutte pour économiser l'eau et maintenir une humidité constante",
                "difficulty": "Moyen",
                "benefits": ["Économie d'eau 40%", "Croissance optimale", "Moins de maladies"]
            },
            {
                "category": "Sol",
                "title": "Rotation des cultures avancée",
                "description": "Planifiez vos cultures sur 4 ans pour préserver la fertilité du sol",
                "difficulty": "Avancé", 
                "benefits": ["Sol plus fertile", "Moins de parasites", "Rendement accru"]
            },
            {
                "category": "Plantation",
                "title": "Compagnonnage végétal",
                "description": "Associez basilic et tomates, carottes et poireaux pour une protection naturelle",
                "difficulty": "Facile",
                "benefits": ["Protection naturelle", "Optimisation espace", "Biodiversité"]
            }
        ],
        "seasonal_advice": {
            "current_month": "Octobre",
            "priority_tasks": [
                "Préparer le sol pour l'hiver",
                "Planter les légumes d'hiver", 
                "Récolter les dernières tomates"
            ]
        }
    }

@api_router.get("/premium/plant-spacing/{plant_id}")
async def get_plant_spacing(plant_id: str, current_user: User = Depends(get_premium_user)):
    """Get detailed spacing information for a specific plant - Premium only"""
    
    # Find plant in database
    plant = await db.plants.find_one({"id": plant_id})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Check if spacing data exists
    if not plant.get("spacing_between_plants") or not plant.get("spacing_between_rows"):
        raise HTTPException(status_code=404, detail="Spacing data not available for this plant")
    
    return {
        "plant_info": {
            "id": plant["id"],
            "name": plant["name_fr"],
            "latin_name": plant["name_latin"],
            "variety": plant["variety"],
            "category": plant["subcategory"]
        },
        "spacing_data": {
            "between_plants": plant["spacing_between_plants"],
            "between_rows": plant["spacing_between_rows"],
            "recommended_layout": f"Plantez vos {plant['name_fr']} en respectant {plant['spacing_between_plants']} entre chaque pied et {plant['spacing_between_rows']} entre les rangées"
        },
        "optimization_tips": {
            "small_garden": f"Pour un petit potager, respectez au minimum {plant['spacing_between_plants']} entre les plants",
            "large_garden": f"Dans un grand potager, vous pouvez espacer jusqu'à {plant['spacing_between_rows']} pour faciliter l'entretien",
            "companion_plants": "Consultez notre guide de compagnonnage pour optimiser l'espace"
        },
        "planting_guide": {
            "soil_preparation": f"Préparez un {plant['soil_type'].lower()}",
            "sunlight_needs": plant["sunlight"],
            "watering_schedule": plant["monthly_watering"],
            "difficulty_level": plant["difficulty"]
        }
    }

@api_router.post("/subscription/webhook")
async def stripe_webhook():
    # Handle Stripe webhooks
    return {"status": "ok"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Initialize plant database with sample data
    await initialize_plant_database()
    logger.info("Le potager malin API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ============= SCANNER AI WITH GPT-4 VISION =============

class ScanRequest(BaseModel):
    image_base64: str  # Base64 encoded image

class ScanResponse(BaseModel):
    plant_name: str
    variety: Optional[str] = None
    confidence: float
    description: str
    care_tips: Optional[str] = None

@app.post("/api/scanner/analyze", response_model=ScanResponse)
async def analyze_plant_image(
    scan_data: ScanRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Analyze plant image using GPT-4 Vision"""
    try:
        # Import emergentintegrations
        from emergentintegrations import EmergentChatCompletion
        
        # Get Emergent LLM key
        llm_key = os.getenv("EMERGENT_LLM_KEY")
        if not llm_key:
            raise HTTPException(status_code=500, detail="LLM key not configured")
        
        # Prepare the prompt for GPT-4 Vision
        prompt = """Analysez cette image de plante et identifiez:
1. Le nom de la plante (nom commun en français)
2. La variété spécifique si identifiable (ex: pour une tomate, dire si c'est Cœur de Bœuf, Cerise, Roma, etc.)
3. Votre niveau de confiance (0-1)
4. Une brève description
5. Des conseils d'entretien basiques

Répondez au format JSON avec les clés: plant_name, variety, confidence, description, care_tips

Plantes possibles dans notre base:
- Tomates: Cœur de Bœuf, Marmande, Cerise, Roma, Noire de Crimée, Cornu des Andes, Buffalo, Ananas, Saint-Pierre, Green Zebra
- Salades: Batavia Blonde/Rouge, Romaine, Feuille de Chêne Blonde/Rouge, Lollo Rossa, Iceberg, Sucrine, Roquette
- Carottes: Nantes, Colmar
- Courgettes, Radis, Fraises, Framboises, Poivrons, Concombres, Aubergines, Haricots, Épinards, Courges"""
        
        # Call GPT-4 Vision via emergentintegrations
        chat = EmergentChatCompletion(
            base_url="https://llm.kindo.ai/v1",
            api_key=llm_key
        )
        
        response = chat.create(
            model="openai/gpt-4o",  # GPT-4 Vision model
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{scan_data.image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )
        
        # Parse response
        import json
        result_text = response.choices[0].message.content
        
        # Try to extract JSON from response
        try:
            # Sometimes GPT returns text before JSON, try to find JSON block
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            result = json.loads(result_text.strip())
        except (json.JSONDecodeError, KeyError, IndexError):
            # Fallback: parse manually or return generic response
            result = {
                "plant_name": "Plante non identifiée",
                "variety": None,
                "confidence": 0.5,
                "description": result_text,
                "care_tips": "Consultez l'encyclopédie pour plus d'informations"
            }
        
        return ScanResponse(**result)
        
    except Exception as e:
        logger.error(f"Error analyzing plant image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")

# ============= DATABASE INITIALIZATION =============

async def initialize_plant_database():
    """Initialize the database with 64 plant varieties"""
    
    # Check if plants already exist
    existing_plants = await db.plants.count_documents({})
    if existing_plants > 0:
        # Clear old database to update with new varieties
        await db.plants.delete_many({})
    
    # Add IDs to plants and insert them
    if PLANTS_DATABASE:
        plants_with_ids = []
        for i, plant in enumerate(PLANTS_DATABASE):
            plant_with_id = plant.copy()
            plant_with_id["id"] = str(uuid.uuid4())
            plants_with_ids.append(plant_with_id)
        
        await db.plants.insert_many(plants_with_ids)
        logger.info(f"Initialized database with {len(plants_with_ids)} plant varieties")