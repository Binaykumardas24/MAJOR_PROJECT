import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# ---------------- LOAD ENV ----------------
load_dotenv()

# ---------------- READ MONGO URL ----------------
MONGO_URL = os.getenv("MONGO_URL")

if not MONGO_URL:
    raise Exception("MONGO_URL not found in .env file")

# ---------------- CONNECT DB ----------------
client = AsyncIOMotorClient(MONGO_URL)
db = client["apis_db"]

# ---------------- COLLECTIONS ----------------
users_collection = db["users"]