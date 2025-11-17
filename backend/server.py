from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field as PydanticField, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from fastkml import kml
from lxml import etree
import io
from imagery_service import imagery_service


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()


# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def parse_kml_coordinates(kml_content: bytes) -> List[Dict[str, float]]:
    """Parse KML file and extract coordinates"""
    try:
        # Parse using lxml directly for better compatibility
        root = etree.fromstring(kml_content)
        
        # Try multiple namespace approaches for better compatibility
        namespaces = [
            {'kml': 'http://www.opengis.net/kml/2.2'},
            {'kml': 'http://earth.google.com/kml/2.2'},
            {'kml': 'http://earth.google.com/kml/2.1'},
            {'kml': 'http://earth.google.com/kml/2.0'}
        ]
        
        coordinates = []
        
        # Try with namespaces first
        for ns in namespaces:
            coord_elements = root.xpath('//kml:coordinates', namespaces=ns)
            if coord_elements:
                for coord_elem in coord_elements:
                    if coord_elem.text:
                        coord_text = coord_elem.text.strip()
                        if coord_text:
                            # Split by whitespace and newlines
                            coord_pairs = coord_text.split()
                            for coord_pair in coord_pairs:
                                if coord_pair.strip():
                                    parts = coord_pair.strip().split(',')
                                    if len(parts) >= 2:
                                        try:
                                            lng = float(parts[0])
                                            lat = float(parts[1])
                                            coordinates.append({'lat': lat, 'lng': lng})
                                        except ValueError:
                                            continue
                if coordinates:
                    break
        
        # Fallback: try without namespace
        if not coordinates:
            coord_elements = root.xpath('//coordinates')
            for coord_elem in coord_elements:
                if coord_elem.text:
                    coord_text = coord_elem.text.strip()
                    if coord_text:
                        # Split by whitespace and newlines
                        coord_pairs = coord_text.split()
                        for coord_pair in coord_pairs:
                            if coord_pair.strip():
                                parts = coord_pair.strip().split(',')
                                if len(parts) >= 2:
                                    try:
                                        lng = float(parts[0])
                                        lat = float(parts[1])
                                        coordinates.append({'lat': lat, 'lng': lng})
                                    except ValueError:
                                        continue
        
        if len(coordinates) < 3:
            raise HTTPException(status_code=400, detail="KML file must contain at least 3 coordinates")
        
        return coordinates
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid KML file: {str(e)}")


# Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = PydanticField(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    created_at: datetime = PydanticField(default_factory=lambda: datetime.now(timezone.utc))

class AuthResponse(BaseModel):
    token: str
    user: User

class FieldCoordinates(BaseModel):
    lat: float
    lng: float

class Field(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = PydanticField(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    crop_type: str
    start_date: str
    health_index: float = PydanticField(default=0, ge=0, le=100)
    farmer_name: str
    contact_number: str
    imagery_url: Optional[str] = None
    coordinates: List[FieldCoordinates]
    created_at: datetime = PydanticField(default_factory=lambda: datetime.now(timezone.utc))

class FieldCreate(BaseModel):
    name: str
    crop_type: str
    start_date: str
    farmer_name: str
    contact_number: str
    imagery_url: Optional[str] = None
    coordinates: List[FieldCoordinates]

class FieldUpdate(BaseModel):
    name: Optional[str] = None
    crop_type: Optional[str] = None
    start_date: Optional[str] = None
    farmer_name: Optional[str] = None
    contact_number: Optional[str] = None
    imagery_url: Optional[str] = None
    coordinates: Optional[List[FieldCoordinates]] = None

class KMLParseResponse(BaseModel):
    coordinates: List[FieldCoordinates]


# Auth Routes
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user = User(
        name=user_data.name,
        email=user_data.email
    )
    
    # Hash password and store
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create sample field for new user
    sample_field = Field(
        user_id=user.id,
        name="Sample Field - Demo",
        crop_type="Wheat",
        start_date="2024-11-01",
        health_index=0,  # Calculated from imagery
        farmer_name="Demo Farmer",
        contact_number="+91-9876543210",
        coordinates=[
            FieldCoordinates(lat=28.7041, lng=77.1025),
            FieldCoordinates(lat=28.7051, lng=77.1025),
            FieldCoordinates(lat=28.7051, lng=77.1045),
            FieldCoordinates(lat=28.7041, lng=77.1045),
            FieldCoordinates(lat=28.7041, lng=77.1025)
        ]
    )
    
    sample_dict = sample_field.model_dump()
    sample_dict['created_at'] = sample_dict['created_at'].isoformat()
    sample_dict['coordinates'] = [coord.model_dump() for coord in sample_field.coordinates]
    await db.fields.insert_one(sample_dict)
    
    # Create token
    token = create_access_token({"sub": user.id, "email": user.email})
    
    return AuthResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(login_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(login_data.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Convert datetime
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    
    # Create token
    token = create_access_token({"sub": user.id, "email": user.email})
    
    return AuthResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    if isinstance(current_user['created_at'], str):
        current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    return User(**current_user)


# KML Parse Route
@api_router.post("/kml/parse", response_model=KMLParseResponse)
async def parse_kml(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Parse uploaded KML file and return coordinates"""
    try:
        logger.info(f"Received KML file: {file.filename}")
        
        if not file.filename.endswith('.kml'):
            logger.error(f"Invalid file extension: {file.filename}")
            raise HTTPException(status_code=400, detail="File must be a KML file")
        
        content = await file.read()
        logger.info(f"KML file size: {len(content)} bytes")
        
        coordinates = parse_kml_coordinates(content)
        logger.info(f"Parsed {len(coordinates)} coordinates from KML")
        
        if len(coordinates) < 3:
            raise HTTPException(status_code=400, detail="KML file must contain at least 3 coordinates")
        
        return KMLParseResponse(coordinates=[FieldCoordinates(**coord) for coord in coordinates])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing KML: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to parse KML file: {str(e)}")


# Field Routes
@api_router.post("/fields", response_model=Field)
async def create_field(field_data: FieldCreate, current_user: dict = Depends(get_current_user)):
    field = Field(
        user_id=current_user['id'],
        name=field_data.name,
        crop_type=field_data.crop_type,
        start_date=field_data.start_date,
        health_index=0,  # Will be calculated from satellite imagery
        farmer_name=field_data.farmer_name,
        contact_number=field_data.contact_number,
        imagery_url=field_data.imagery_url,
        coordinates=field_data.coordinates
    )
    
    # Convert to dict and serialize
    field_dict = field.model_dump()
    field_dict['created_at'] = field_dict['created_at'].isoformat()
    field_dict['coordinates'] = [coord.model_dump() for coord in field.coordinates]
    
    await db.fields.insert_one(field_dict)
    
    return field

@api_router.get("/fields", response_model=List[Field])
async def get_fields(current_user: dict = Depends(get_current_user)):
    fields = await db.fields.find({"user_id": current_user['id']}, {"_id": 0}).to_list(1000)
    
    # Convert datetime strings back
    for field in fields:
        if isinstance(field['created_at'], str):
            field['created_at'] = datetime.fromisoformat(field['created_at'])
    
    return fields

@api_router.get("/fields/{field_id}", response_model=Field)
async def get_field(field_id: str, current_user: dict = Depends(get_current_user)):
    field = await db.fields.find_one({"id": field_id, "user_id": current_user['id']}, {"_id": 0})
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    if isinstance(field['created_at'], str):
        field['created_at'] = datetime.fromisoformat(field['created_at'])
    
    return Field(**field)

@api_router.put("/fields/{field_id}", response_model=Field)
async def update_field(field_id: str, field_data: FieldUpdate, current_user: dict = Depends(get_current_user)):
    # Check if field exists and belongs to user
    existing_field = await db.fields.find_one({"id": field_id, "user_id": current_user['id']})
    if not existing_field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # Update only provided fields
    update_data = field_data.model_dump(exclude_unset=True)
    if 'coordinates' in update_data:
        update_data['coordinates'] = [coord.model_dump() for coord in field_data.coordinates]
    
    await db.fields.update_one(
        {"id": field_id},
        {"$set": update_data}
    )
    
    # Get updated field
    updated_field = await db.fields.find_one({"id": field_id}, {"_id": 0})
    if isinstance(updated_field['created_at'], str):
        updated_field['created_at'] = datetime.fromisoformat(updated_field['created_at'])
    
    return Field(**updated_field)

@api_router.delete("/fields/{field_id}")
async def delete_field(field_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.fields.delete_one({"id": field_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Field not found")
    
    return {"message": "Field deleted successfully"}


# Imagery Analysis Routes
@api_router.get("/fields/{field_id}/analysis")
async def get_field_analysis(field_id: str, current_user: dict = Depends(get_current_user)):
    """Get satellite imagery analysis for a field"""
    # Get field
    field = await db.fields.find_one({"id": field_id, "user_id": current_user['id']}, {"_id": 0})
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # Check if imagery URL is provided
    if not field.get('imagery_url'):
        return {
            'status': 'error',
            'message': f'No imagery found for field "{field["name"]}". Please add a Google Drive URL for the Planet SkySat GeoTIFF image.'
        }
    
    # Process imagery
    analysis_result = imagery_service.process_field_imagery(field_id, field['imagery_url'])
    
    return analysis_result



# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
