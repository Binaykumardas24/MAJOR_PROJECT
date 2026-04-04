import os
import base64
import re
from io import BytesIO
from datetime import datetime, timezone
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
from database import users_collection
from auth_utils import (
    hash_password,
    verify_password,
    create_token,
    SECRET_KEY,
    ALGORITHM
)
from coding_ai import (
    evaluate_coding_submission,
    generate_coding_challenge,
    get_coding_runtime_status,
    run_code_against_tests,
)
from interview_ai import (
    ProviderError,
    complete_interview_session,
    create_interview_session,
    evaluate_interview_answer,
    get_ai_provider_status,
    get_session_payload,
    get_session_status,
    mark_session_report_saved,
)

app = FastAPI()


def _extract_pdf_text_from_bytes(pdf_bytes: bytes) -> str:
    readers = []
    try:
        from pypdf import PdfReader as PypdfReader  # type: ignore
        readers.append(PypdfReader)
    except Exception:
        pass
    try:
        from PyPDF2 import PdfReader as PyPdf2Reader  # type: ignore
        readers.append(PyPdf2Reader)
    except Exception:
        pass

    for reader_cls in readers:
        try:
            reader = reader_cls(BytesIO(pdf_bytes))
            text_parts = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            text = "\n".join(text_parts).strip()
            if text:
                return text
        except Exception:
            continue
    return ""


def _decode_pdf_data_url(data_url: str) -> bytes:
    if not data_url or "," not in data_url:
        return b""
    try:
        _, encoded = data_url.split(",", 1)
        return base64.b64decode(encoded)
    except Exception:
        return b""


def _normalize_resume_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def _resume_signal_details(text: str, file_name: str = "") -> dict:
    normalized = _normalize_resume_text(text)
    lowered = normalized.lower()
    filename = (file_name or "").lower()
    skill_hits = _extract_resume_skills(text)
    section_hits = [keyword for keyword in RESUME_SECTION_KEYWORDS if keyword in lowered]

    has_email = bool(re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I))
    has_phone = bool(re.search(r"(\+?\d[\d\s().-]{8,}\d)", text))
    has_profile_link = bool(re.search(r"(linkedin|github|portfolio)", lowered))
    has_education = bool(re.search(r"\b(bachelor|master|b\.tech|m\.tech|degree|university|college|school)\b", lowered))
    has_experience = bool(re.search(r"\b(intern|experience|engineer|developer|manager|analyst|specialist|coordinator|student|worked|company)\b", lowered))
    has_project = bool(re.search(r"\b(project|developed|built|created|implemented|designed)\b", lowered))
    filename_says_resume = any(token in filename for token in ["resume", "cv", "curriculum vitae"])

    score = 0
    if filename_says_resume:
        score += 2
    if has_email:
        score += 2
    if has_phone:
        score += 2
    if has_profile_link:
        score += 1
    if has_education:
        score += 1
    if has_experience:
        score += 2
    if has_project:
        score += 1
    if skill_hits:
        score += min(3, max(1, len(skill_hits) // 2 or 1))
    if section_hits:
        score += min(4, len(section_hits))

    return {
        "normalized": normalized,
        "score": score,
        "text_length": len(normalized),
        "filename_says_resume": filename_says_resume,
        "has_email": has_email,
        "has_phone": has_phone,
        "has_profile_link": has_profile_link,
        "has_education": has_education,
        "has_experience": has_experience,
        "has_project": has_project,
        "skill_hits": skill_hits,
        "section_hits": section_hits,
    }


def _looks_like_resume(text: str, file_name: str = "") -> tuple[bool, str]:
    details = _resume_signal_details(text, file_name)

    if details["text_length"] < 25 and not details["filename_says_resume"]:
        return False, "This file does not contain enough readable content to verify it as a resume or CV."

    if details["score"] >= 5:
        return True, ""

    short_resume_like = (
        details["text_length"] >= 35 and
        (
            details["filename_says_resume"] or
            (details["has_email"] and details["has_experience"]) or
            (details["has_phone"] and details["has_education"]) or
            (details["has_experience"] and bool(details["skill_hits"])) or
            len(details["section_hits"]) >= 2
        )
    )
    if short_resume_like:
        return True, ""

    return False, "This document does not look like a resume or CV. Please upload a proper resume/CV file."


def _extract_resume_skills(text: str) -> list[str]:
    normalized = _normalize_resume_text(text).lower()
    found = []
    for skill in KNOWN_RESUME_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, normalized):
            found.append(skill.title() if skill.islower() else skill)
    return found[:24]


def _extract_resume_lines(text: str, limit: int = 8) -> list[str]:
    lines = [line.strip(" -•\t") for line in (text or "").splitlines()]
    cleaned = [line for line in lines if len(line.split()) >= 2]
    return cleaned[:limit]


def _build_resume_analysis_payload(text: str, file_name: str = "") -> dict:
    normalized = _normalize_resume_text(text)
    lines = _extract_resume_lines(text, limit=20)
    skills = _extract_resume_skills(text)

    education = [
        line for line in lines
        if re.search(r"\b(university|college|bachelor|master|degree|b\.tech|m\.tech|school)\b", line, re.I)
    ][:5]
    experience = [
        line for line in lines
        if re.search(r"\b(experience|intern|engineer|developer|manager|analyst|specialist|worked|company)\b", line, re.I)
    ][:6]
    projects = [
        line for line in lines
        if re.search(r"\b(project|developed|built|created|implemented|designed)\b", line, re.I)
    ][:6]

    likely_name = lines[0] if lines else ""
    if re.search(r"(resume|cv|education|skills|experience)", likely_name, re.I):
        likely_name = ""

    analysis_parts = [
        f"Candidate name: {likely_name or 'Not clearly detected'}",
        f"Skills: {', '.join(skills) if skills else 'Not clearly extracted'}",
        f"Education: {' | '.join(education) if education else 'Not clearly extracted'}",
        f"Experience: {' | '.join(experience) if experience else 'Not clearly extracted'}",
        f"Projects: {' | '.join(projects) if projects else 'Not clearly extracted'}",
        f"Resume text: {normalized[:2400]}",
    ]

    return {
        "candidate_name": likely_name,
        "skills": skills,
        "education": education,
        "experience_highlights": experience,
        "project_highlights": projects,
        "contact_found": bool(re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I)),
        "analysis_text": "\n".join(analysis_parts)[:4000],
        "suggested_roles": [
            role for role in [
                "Software Engineer" if any(item.lower() in normalized for item in ["python", "java", "react", "node", "api", "sql"]) else "",
                "Data Scientist" if any(item.lower() in normalized for item in ["machine learning", "pandas", "numpy", "tensorflow", "pytorch"]) else "",
                "Business Analyst" if any(item.lower() in normalized for item in ["excel", "power bi", "tableau", "analysis"]) else "",
                "Product Manager" if any(item.lower() in normalized for item in ["roadmap", "stakeholder", "product"]) else "",
            ] if role
        ][:4],
        "source_file_name": file_name,
    }

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
        from deepface import DeepFace

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
            "timestamp": datetime.now(timezone.utc).isoformat()
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


# ================= AI INTERVIEW =================
@app.post("/ai-interview/start")
async def start_ai_interview(
    payload: dict = Body(...),
    authorization: str = Header(None)
):
    try:
        session = await create_interview_session(payload)
        return session
    except ProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {exc}")


@app.get("/ai-interview/providers/status")
async def ai_provider_status():
    try:
        return get_ai_provider_status()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to inspect AI providers: {exc}")


@app.get("/coding/runtime-status")
async def coding_runtime_status():
    try:
        return get_coding_runtime_status()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to inspect coding runtimes: {exc}")


@app.post("/coding/challenge")
async def create_coding_challenge(payload: dict = Body(...)):
    try:
        difficulty = payload.get("difficulty") or "easy"
        excluded_questions = payload.get("excluded_questions") or []
        challenge = await generate_coding_challenge(difficulty, excluded_questions=excluded_questions)
        return {"challenge": challenge}
    except ProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate coding challenge: {exc}")


@app.post("/coding/run")
async def run_coding_submission(payload: dict = Body(...)):
    try:
        language = (payload.get("language") or "").strip().lower()
        source_code = payload.get("source_code") or ""
        test_cases = payload.get("test_cases") or []
        return run_code_against_tests(language, source_code, test_cases)
    except ProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to run coding submission: {exc}")


@app.post("/coding/submit")
async def submit_coding_solution(payload: dict = Body(...)):
    try:
        language = (payload.get("language") or "").strip().lower()
        source_code = payload.get("source_code") or ""
        challenge = payload.get("challenge") or {}
        all_cases = list(challenge.get("public_test_cases") or []) + list(challenge.get("hidden_test_cases") or [])
        execution = run_code_against_tests(language, source_code, all_cases)
        review = await evaluate_coding_submission(challenge, language, source_code, execution)
        return {
            "execution": execution,
            "review": review,
        }
    except ProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to submit coding solution: {exc}")


@app.get("/ai-interview/session/{session_id}")
async def ai_interview_session_status(session_id: str):
    try:
        session = await get_session_status(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        return session
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load interview session: {exc}")


@app.post("/ai-interview/evaluate")
async def evaluate_ai_interview_answer(
    session_id: str = Body(...),
    question_index: int = Body(...),
    answer: str = Body(...),
):
    try:
        return await evaluate_interview_answer(session_id, question_index, answer)
    except ProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate answer: {exc}")


@app.post("/ai-interview/complete")
async def complete_ai_interview(
    session_id: str = Body(...),
    ended_early: bool = Body(False),
    authorization: str = Header(None)
):
    try:
        summary = await complete_interview_session(session_id, ended_early=ended_early)
        session = await get_session_payload(session_id)
        current_user = None
        save_warning = None

        if authorization and session:
            token = authorization.replace("Bearer ", "")
            try:
                current_user = await get_current_user(token)
                current_user_id = str(current_user["_id"])
                saved_user_ids = session.setdefault("saved_report_user_ids", [])

                if current_user_id not in saved_user_ids:
                    interview_result = {
                        "session_id": session_id,
                        "category": session.get("context", {}).get("category") or "general",
                        "selected_mode": session.get("context", {}).get("selected_mode"),
                        "job_role": session.get("context", {}).get("job_role"),
                        "primary_language": session.get("context", {}).get("primary_language"),
                        "experience": session.get("context", {}).get("experience"),
                        "context": session.get("context", {}),
                        "score": summary.get("overall_score", 0),
                        "ended_early": summary.get("ended_early", False),
                        "summary": summary.get("summary"),
                        "top_strengths": summary.get("top_strengths", []),
                        "improvement_areas": summary.get("improvement_areas", []),
                        "strongest_questions": summary.get("strongest_questions", []),
                        "needs_work_questions": summary.get("needs_work_questions", []),
                        "providers": summary.get("providers"),
                        "answers": session.get("answers", []),
                        "evaluations": session.get("evaluations", []),
                        "questions_answered": len(session.get("evaluations", [])),
                        "total_questions": len(session.get("questions", [])),
                        "question_outline": session.get("question_outline", summary.get("questions", [])),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }

                    await users_collection.update_one(
                        {"_id": current_user["_id"]},
                        {"$push": {"interview_results": interview_result}},
                    )
                    session = await mark_session_report_saved(session_id, current_user_id) or session
            except Exception as save_exc:
                save_warning = f"Interview completed, but saving the report failed: {save_exc}"

        return {
            **summary,
            "context": session.get("context", {}) if session else {},
            "answers": session.get("answers", []) if session else [],
            "evaluations": session.get("evaluations", []) if session else [],
            "questions_answered": len(session.get("evaluations", [])) if session else 0,
            "question_outline": session.get("question_outline", []) if session else [],
            "user": (
                {
                    "id": str(current_user["_id"]),
                    "email": current_user.get("email"),
                    "first_name": current_user.get("first_name"),
                    "last_name": current_user.get("last_name"),
                }
                if current_user
                else None
            ),
            "save_warning": save_warning,
        }
    except ProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to complete interview: {exc}")


@app.get("/interview-reports")
async def get_interview_reports(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        current_user = await get_current_user(token)
        reports = current_user.get("interview_results", [])
        normalized_reports = list(reversed(reports))
        return {"reports": normalized_reports}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch interview reports: {exc}")


@app.get("/interview-reports/{session_id}")
async def get_interview_report(session_id: str, authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        current_user = await get_current_user(token)
        reports = current_user.get("interview_results", [])
        match = next((item for item in reports if item.get("session_id") == session_id), None)

        if not match:
            raise HTTPException(status_code=404, detail="Interview report not found")

        return {"report": match}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch interview report: {exc}")

