import os
import numpy as np
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Header,
    Body
)
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
from bson import ObjectId
from deepface import DeepFace

from database import users_collection
from auth_utils import (
    hash_password,
    verify_password,
    create_token,
    SECRET_KEY,
    ALGORITHM
)

app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DIRECTORIES ----------------
UPLOAD_DIR = "uploads"
FACE_DB = "face_db"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FACE_DB, exist_ok=True)

# ---------------- FACE EMBEDDING ----------------
def get_embedding(image_path):
    try:
        emb = DeepFace.represent(
            img_path=image_path,
            model_name="Facenet",
            enforce_detection=True
        )
        return np.array(emb[0]["embedding"])
    except Exception:
        return None

# ---------------- AUTH HELPER ----------------
async def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = await users_collection.find_one(
            {"_id": ObjectId(user_id)}
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ================= REGISTER =================
@app.post("/register")
async def register(
    first_name: str = Body(...),
    last_name: str = Body(...),
    email: str = Body(...),
    password: str = Body(...)
):
    if not first_name.strip() or not last_name.strip():
        raise HTTPException(
            status_code=400,
            detail="First name and last name required"
        )

    existing = await users_collection.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    user = {
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "email": email,
        "hashed_password": hash_password(password),
        "profile_image": None
    }

    result = await users_collection.insert_one(user)

    return {
        "status": "USER REGISTERED",
        "id": str(result.inserted_id)
    }

# ================= LOGIN =================
@app.post("/login")
async def login(
    email: str = Body(...),
    password: str = Body(...)
):
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=400,
            detail="User not found"
        )

    if not verify_password(password, user["hashed_password"]):
        raise HTTPException(
            status_code=400,
            detail="Invalid password"
        )

    token = create_token({
        "user_id": str(user["_id"]),
        "email": user["email"]
    })

    return {
        "access_token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name"),
            "profile_image": user.get("profile_image")
        }
    }

# ================= REGISTER FACE =================
# functionality removed per requirements - endpoint disabled
# @app.post("/register-face")
# async def register_face(
#     file: UploadFile = File(...),
#     authorization: str = Header(...)
# ):
#     token = authorization.replace("Bearer ", "")
#     user = await get_current_user(token)
#
#     img_path = os.path.join(
#         UPLOAD_DIR,
#         f"user_{user['_id']}.jpg"
#     )
#     with open(img_path, "wb") as f:
#         f.write(await file.read())
#
#     embedding = get_embedding(img_path)
#     if embedding is None:
#         return {"status": "FACE NOT DETECTED"}
#
#     np.save(
#         os.path.join(
#             FACE_DB,
#             f"user_{user['_id']}.npy"
#         ),
#         embedding
#     )
#
#     return {"status": "FACE REGISTERED"}

# ================= FACE LOGIN =================
# functionality removed per requirements - endpoint disabled
# @app.post("/login-face")
# async def login_face(
#     file: UploadFile = File(...)
# ):
#     img_path = os.path.join(UPLOAD_DIR, "login.jpg")
#     with open(img_path, "wb") as f:
#         f.write(await file.read())
#
#     new_embedding = get_embedding(img_path)
#     if new_embedding is None:
#         return {"status": "FACE NOT DETECTED"}
#
#     best_user = None
#     best_distance = float("inf")
#
#     for fname in os.listdir(FACE_DB):
#         if fname.endswith(".npy"):
#             uid = fname.replace("user_", "").replace(".npy", "")
#             saved_embedding = np.load(
#                 os.path.join(FACE_DB, fname)
#             )


# ================= PROFILE =================
@app.get("/profile")
async def get_profile(
    authorization: str = Header(...)
):
    token = authorization.replace("Bearer ", "")
    user = await get_current_user(token)

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "profile_image": user.get("profile_image")
    }

@app.put("/profile")
async def update_profile(
    first_name: str = Body(None),
    last_name: str = Body(None),
    profile_image: str = Body(None),
    authorization: str = Header(...)
):
    token = authorization.replace("Bearer ", "")
    user = await get_current_user(token)

    update_data = {}

    if first_name is not None:
        first_name = first_name.strip()
        if first_name != "":
            update_data["first_name"] = first_name

    if last_name is not None:
        last_name = last_name.strip()
        if last_name != "":
            update_data["last_name"] = last_name


    if profile_image is not None:
            if profile_image == "":
                update_data["profile_image"] =None
            else:
                update_data["profile_image"] = profile_image

    if update_data:
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": update_data}
        )

    updated_user = await users_collection.find_one(
        {"_id": user["_id"]}
    )

    return {
        "status": "PROFILE UPDATED",
        "user": {
            "id": str(updated_user["_id"]),
            "email": updated_user["email"],
            "first_name": updated_user.get("first_name"),
            "last_name": updated_user.get("last_name"),
            "profile_image": updated_user.get("profile_image")
        }
    }

# ================= INTERVIEW RESULTS =================
@app.post("/interview-result")
async def save_interview_result(
    user_id: str = Body(...),
    category: str = Body(...),
    score: int = Body(...),
    transcript: str = Body(...),
    questions_answered: int = Body(...),
    authorization: str = Header(...)
):
    """Save interview result to database"""
    try:
        token = authorization.replace("Bearer ", "")
        current_user = await get_current_user(token)

        interview_result = {
            "user_id": user_id,
            "category": category,
            "score": score,
            "transcript": transcript,
            "questions_answered": questions_answered,
            "timestamp": None  # Will be auto-generated by MongoDB
        }

        result = await users_collection.update_one(
            {"_id": current_user["_id"]},
            {
                "$push": {
                    "interview_results": interview_result
                }
            }
        )

        return {
            "status": "INTERVIEW RESULT SAVED",
            "score": score,
            "category": category
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save interview result: {str(e)}"
        )

