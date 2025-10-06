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
            "name": "Administrateur Plant Wellness",
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
    logger.info("Plant Wellness API started successfully")

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
        except:
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
    """Initialize the database with 53 plant varieties"""
    
    # Check if plants already exist
    existing_plants = await db.plants.count_documents({})
    if existing_plants > 0:
        # Clear old database to update with new varieties
        await db.plants.delete_many({})
    
    # Insert all 53 varieties from plants_database.py
    if PLANTS_DATABASE:
        await db.plants.insert_many(PLANTS_DATABASE)
        logger.info(f"Initialized database with {len(PLANTS_DATABASE)} plant varieties")