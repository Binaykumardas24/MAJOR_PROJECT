import asyncio
import json
import os
import random
import re
import time
import urllib.error
import urllib.request
import uuid
from typing import Any, Dict, List, Optional, Tuple

from config import load_backend_env

load_backend_env()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b").strip()
OLLAMA_TIMEOUT_SECONDS = max(30, int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "300")))
LIVE_AI_TIMEOUT_SECONDS = max(8, int(os.getenv("LIVE_AI_TIMEOUT_SECONDS", "12")))
STARTUP_AI_TIMEOUT_SECONDS = max(LIVE_AI_TIMEOUT_SECONDS, int(os.getenv("STARTUP_AI_TIMEOUT_SECONDS", "20")))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

INTERVIEW_SESSIONS: Dict[str, Dict[str, Any]] = {}
ACTIVE_SESSION_TTL_SECONDS = max(3600, int(os.getenv("ACTIVE_SESSION_TTL_SECONDS", "86400")))

ROLE_PROFILES: List[Dict[str, Any]] = [
    {
        "aliases": ["software developer", "software engineer", "backend", "backend developer", "full stack", "full-stack", "fullstack"],
        "label": "Software Developer / Backend / Full Stack",
        "core_fields": [
            "Data Structures and Algorithms",
            "arrays, linked lists, trees, graphs",
            "sorting and searching",
            "Python, Java, C++, or JavaScript fundamentals",
            "database management and SQL",
            "operating systems concepts",
            "computer networks basics",
            "system design for experienced roles",
        ],
        "question_seeds": [
            "How would you reverse a linked list, and what are the time and space trade-offs?",
            "What is the difference between a process and a thread?",
            "Write or explain an SQL query to fetch the top 3 salaries from an employee table.",
            "How do HTTP requests flow between client, server, and database in a typical web application?",
            "How would you design a scalable API service for a growing product?",
        ],
    },
    {
        "aliases": ["frontend", "frontend developer", "front end", "ui developer", "react developer"],
        "label": "Frontend Developer",
        "core_fields": [
            "HTML, CSS, and JavaScript fundamentals",
            "React, Angular, or Vue",
            "DOM, browser rendering, and events",
            "responsive design and accessibility",
            "API integration and state handling",
        ],
        "question_seeds": [
            "What is the virtual DOM in React, and why is it useful?",
            "What is the difference between == and === in JavaScript?",
            "How does event bubbling work in the browser?",
            "How would you make a complex UI responsive across devices?",
            "How do you fetch and manage API data safely in a frontend application?",
        ],
    },
    {
        "aliases": ["backend developer", "api developer", "server side", "server-side", "fastapi", "django", "node", "spring"],
        "label": "Backend Developer",
        "core_fields": [
            "server-side programming with Python, Java, or Node.js",
            "REST APIs and authentication with JWT",
            "SQL and NoSQL databases",
            "system design basics",
            "scalability and backend architecture",
        ],
        "question_seeds": [
            "How would you design a login system using JWT authentication?",
            "What is a REST API and what makes it RESTful?",
            "When would you choose SQL over NoSQL, or vice versa?",
            "How would you structure a FastAPI or Node.js backend for maintainability?",
            "What steps would you take to secure a backend API?",
        ],
    },
    {
        "aliases": ["data science", "data scientist", "machine learning", "ml engineer", "ai engineer", "artificial intelligence"],
        "label": "Data Science / AI / ML",
        "core_fields": [
            "linear algebra, probability, and statistics",
            "regression, classification, and clustering",
            "NumPy, Pandas, TensorFlow, or PyTorch",
            "Python for data workflows",
            "data cleaning, visualization, and model evaluation",
        ],
        "question_seeds": [
            "What is overfitting and how do you reduce it?",
            "What is the difference between supervised and unsupervised learning?",
            "How would you evaluate a classification model?",
            "Why is data cleaning important before training a model?",
            "How would you explain bias-variance trade-off?",
        ],
    },
    {
        "aliases": ["devops", "cloud engineer", "site reliability", "sre", "platform engineer"],
        "label": "DevOps / Cloud Engineer",
        "core_fields": [
            "AWS, Azure, or GCP basics",
            "CI/CD pipelines",
            "Docker and Kubernetes",
            "Linux fundamentals",
            "networking and deployment workflows",
        ],
        "question_seeds": [
            "What is a Docker container and how is it different from a virtual machine?",
            "Explain a CI/CD pipeline from commit to deployment.",
            "What role does Kubernetes play in modern deployments?",
            "How would you troubleshoot a Linux service that fails after deployment?",
            "How do load balancers and DNS fit into cloud architecture?",
        ],
    },
    {
        "aliases": ["qa", "quality assurance", "testing", "test engineer", "automation tester", "qa engineer"],
        "label": "Testing / QA Engineer",
        "core_fields": [
            "manual testing concepts",
            "test cases and bug lifecycle",
            "automation testing with Selenium or similar tools",
            "API testing",
            "regression and integration testing",
        ],
        "question_seeds": [
            "How would you write test cases for a login page?",
            "What is regression testing and when should it be run?",
            "How do you decide what to automate in a test suite?",
            "How would you validate an API endpoint?",
            "What information makes a bug report actionable for developers?",
        ],
    },
    {
        "aliases": ["cybersecurity", "security engineer", "information security", "cyber security"],
        "label": "Cybersecurity",
        "core_fields": [
            "network security fundamentals",
            "cryptography basics",
            "ethical hacking basics",
            "OWASP vulnerabilities",
            "threat analysis and secure practices",
        ],
        "question_seeds": [
            "What is SQL injection and how do you prevent it?",
            "What is encryption and how is it different from hashing?",
            "How would you explain the OWASP Top 10 to a developer?",
            "What are common ways to secure authentication systems?",
            "How would you approach vulnerability assessment in a web app?",
        ],
    },
]


class ProviderError(Exception):
    pass


def _session_store_dir() -> str:
    path = os.path.join(os.path.dirname(__file__), ".runtime", "interview_sessions")
    os.makedirs(path, exist_ok=True)
    return path


def _session_file_path(session_id: str) -> str:
    safe_session_id = re.sub(r"[^a-zA-Z0-9_-]", "", (session_id or "").strip())
    return os.path.join(_session_store_dir(), f"{safe_session_id}.json")


def _persist_session(session: Dict[str, Any]) -> None:
    session_id = _normalize_text(session.get("session_id") or "")
    if not session_id:
        return
    file_path = _session_file_path(session_id)
    with open(file_path, "w", encoding="utf-8") as handle:
        json.dump(session, handle, ensure_ascii=False)


def _load_persisted_session(session_id: str) -> Optional[Dict[str, Any]]:
    file_path = _session_file_path(session_id)
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as handle:
            session = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None

    created_at = float(session.get("created_at") or 0)
    if created_at and (time.time() - created_at) > ACTIVE_SESSION_TTL_SECONDS:
        try:
            os.remove(file_path)
        except OSError:
            pass
        return None
    return session if isinstance(session, dict) else None


def _get_session(session_id: str) -> Optional[Dict[str, Any]]:
    session = INTERVIEW_SESSIONS.get(session_id)
    if session:
        return session
    session = _load_persisted_session(session_id)
    if session:
        INTERVIEW_SESSIONS[session_id] = session
    return session


def _json_headers(extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if extra:
        headers.update(extra)
    return headers


def _http_post_json(
    url: str,
    payload: Dict[str, Any],
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 60
) -> Dict[str, Any]:
    request = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers=_json_headers(headers),
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise ProviderError(f"HTTP {exc.code} calling {url}: {body or exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise ProviderError(f"Failed to reach {url}: {exc.reason}") from exc
    except TimeoutError as exc:
        raise ProviderError(f"Timed out calling {url}") from exc
    except json.JSONDecodeError as exc:
        raise ProviderError(f"Invalid JSON response from {url}") from exc


def _http_get_json(
    url: str,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 20
) -> Dict[str, Any]:
    request = urllib.request.Request(
        url=url,
        headers=_json_headers(headers),
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise ProviderError(f"HTTP {exc.code} calling {url}: {body or exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise ProviderError(f"Failed to reach {url}: {exc.reason}") from exc
    except TimeoutError as exc:
        raise ProviderError(f"Timed out calling {url}") from exc
    except json.JSONDecodeError as exc:
        raise ProviderError(f"Invalid JSON response from {url}") from exc


def _extract_json_block(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    if not text:
        raise ProviderError("Provider returned an empty response.")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ProviderError("Provider did not return valid JSON.")


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _clamp_question_count(value: Any) -> int:
    try:
        count = int(value)
    except (TypeError, ValueError):
        count = 5
    return max(3, min(count, 10))


def _safe_list(values: Any) -> List[str]:
    if not isinstance(values, list):
        return []
    cleaned = []
    for item in values:
        if isinstance(item, dict):
            preferred = (
                item.get("text")
                or item.get("message")
                or item.get("msg")
                or item.get("question")
                or json.dumps(item, ensure_ascii=False)
            )
            item = preferred
        item = _normalize_text(str(item))
        if item:
            cleaned.append(item)
    return cleaned


def _context_summary(payload: Dict[str, Any]) -> str:
    selected_options = payload.get("selected_options") or []
    primary_focus = ", ".join(selected_options) if selected_options else "general interview preparation"
    config_mode = payload.get("config_mode") or "question"
    time_mode_interval = payload.get("time_mode_interval")
    interview_mode_time = payload.get("interview_mode_time")
    role_profile = _match_role_profile(payload.get("job_role") or "")
    selected_mode = payload.get("selected_mode") or (
        "language" if payload.get("primary_language") else "role" if payload.get("job_role") else "general"
    )
    parts = [
        f"Category: {payload.get('category') or 'general'}",
        f"Selected mode: {selected_mode}",
        f"Job role: {payload.get('job_role') or 'Not specified'}",
        f"Primary language: {payload.get('primary_language') or 'Not specified'}",
        f"Experience level: {payload.get('experience') or 'Not specified'}",
        f"Focus areas: {primary_focus}",
        f"Configuration mode: {config_mode}",
        f"Practice type: {payload.get('practice_type') or 'interview'}",
        f"Question count: {_clamp_question_count(payload.get('question_count'))}",
    ]
    if config_mode == "time" and time_mode_interval:
        parts.append(f"Time mode interval: {time_mode_interval} minutes")
    if payload.get("practice_type") == "interview" and interview_mode_time:
        parts.append(f"Interview duration: {interview_mode_time} minutes")
    if role_profile:
        parts.append(f"Role profile: {role_profile['label']}")
        parts.append(f"Role core fields: {', '.join(role_profile['core_fields'])}")
    resume_text = _normalize_text(payload.get("resume_text") or "")
    if resume_text:
        parts.append(f"Resume snippet: {resume_text[:700]}")
    return "\n".join(parts)


def _difficulty_from_experience(experience: str) -> str:
    value = (experience or "").strip().lower()
    if "fresh" in value or "entry" in value or "beginner" in value:
        return "introductory to moderate"
    if "mid" in value:
        return "moderate to advanced"
    if "experien" in value or "senior" in value:
        return "advanced and scenario-based"
    return "moderate"


def _resolve_question_count(payload: Dict[str, Any]) -> int:
    config_mode = payload.get("config_mode")
    if config_mode == "time":
        interval = payload.get("time_mode_interval") or payload.get("interview_mode_time") or 5
        try:
            minutes = int(interval)
        except (TypeError, ValueError):
            minutes = 5
        derived_count = max(3, min(10, round(minutes / 2)))
        return derived_count
    return _clamp_question_count(payload.get("question_count"))


def _target_subject(payload: Dict[str, Any]) -> str:
    selected_mode = payload.get("selected_mode") or ""
    if selected_mode == "language" and payload.get("primary_language"):
        return payload["primary_language"]
    return (
        payload.get("job_role")
        or payload.get("primary_language")
        or "the selected interview focus"
    )


def _build_interview_variation(payload: Dict[str, Any]) -> Dict[str, str]:
    chooser = random.SystemRandom()
    role = _normalize_text(payload.get("job_role") or payload.get("primary_language") or "the selected role")
    return {
        "seed": uuid.uuid4().hex[:10],
        "opening_style": chooser.choice([
            "warm but crisp technical screening",
            "curious hands-on technical conversation",
            "practical engineer-to-engineer discussion",
            "focused real-world backend assessment",
        ]),
        "technical_lens": chooser.choice([
            "debugging and troubleshooting",
            "practical implementation details",
            "real-world architecture and trade-offs",
            "backend fundamentals with production thinking",
            "API design and maintainability",
            "performance, reliability, and scalability",
        ]),
        "scenario_lens": chooser.choice([
            "a production incident",
            "a feature launch under deadline pressure",
            "a scaling bottleneck",
            "a debugging-heavy support case",
            "a maintainability refactor",
        ]),
        "follow_up_style": chooser.choice([
            "go deeper after strong answers",
            "simplify and clarify after weak answers",
            "alternate between concept and example",
            "mix direct questions with small scenarios",
        ]),
        "freshness_rule": (
            f"Make this {role} interview feel fresh for seed {uuid.uuid4().hex[:6]} "
            "and avoid reusing stock boilerplate wording."
        ),
    }


def _variation_summary(variation: Optional[Dict[str, str]]) -> str:
    data = variation or {}
    return "\n".join(
        [
            f"Variation seed: {_normalize_text(data.get('seed') or 'default')}",
            f"Opening style: {_normalize_text(data.get('opening_style') or 'standard technical interview')}",
            f"Technical lens: {_normalize_text(data.get('technical_lens') or 'general technical depth')}",
            f"Scenario lens: {_normalize_text(data.get('scenario_lens') or 'real-world backend scenario')}",
            f"Follow-up style: {_normalize_text(data.get('follow_up_style') or 'balanced follow-up')}",
            f"Freshness directive: {_normalize_text(data.get('freshness_rule') or 'Keep the interview wording fresh and non-repetitive.')}",
        ]
    )


def _safe_question_type(value: Any) -> str:
    allowed = {
        "discovery",
        "introduction",
        "fundamental",
        "conceptual",
        "practical",
        "scenario",
        "behavioral",
    }
    normalized = _normalize_text(str(value or "")).lower().replace(" ", "_")
    normalized = normalized.replace("_based", "").replace("technical_", "")
    if normalized in allowed:
        return normalized
    return "practical"


def _match_role_profile(job_role: str) -> Optional[Dict[str, Any]]:
    role_text = _normalize_text(job_role).lower()
    if not role_text:
        return None

    for profile in ROLE_PROFILES:
        for alias in profile["aliases"]:
            if alias in role_text:
                return profile
    return None


def _role_keyword_terms(job_role: str) -> List[str]:
    role_text = _normalize_text(job_role).lower()
    ignore = {
        "developer", "engineer", "specialist", "associate", "intern", "trainee", "lead",
        "manager", "architect", "consultant", "analyst", "staff", "principal", "junior",
        "senior", "expert", "head", "full", "stack",
    }
    terms = []
    for token in re.findall(r"[a-zA-Z0-9+#.]+", role_text):
        if len(token) > 2 and token not in ignore and token not in terms:
            terms.append(token)
    return terms[:6]


def _generic_role_focus(job_role: str, primary_language: str, selected_options: List[str]) -> Dict[str, List[str]]:
    role_label = _normalize_text(job_role) or "Technical Role"
    role_terms = _role_keyword_terms(role_label)
    option_terms = _safe_list(selected_options)[:6]
    tech_stack = _merge_unique([primary_language] if primary_language else [], option_terms)
    tech_stack = _merge_unique(tech_stack, [term.title() for term in role_terms[:3]])

    core_areas = []
    if primary_language:
        core_areas.append(f"{primary_language} fundamentals for {role_label}")
    core_areas.extend(option_terms[:4])
    core_areas.extend(
        [
            f"core responsibilities of a {role_label}",
            f"real-world workflows in {role_label}",
            f"debugging and troubleshooting for {role_label}",
            f"design and trade-offs for {role_label}",
            f"testing, reliability, or quality expectations for {role_label}",
        ]
    )
    for term in role_terms[:3]:
        core_areas.append(f"{term.title()} concepts relevant to {role_label}")

    question_focus = [
        f"Ask practical questions that mirror real {role_label} work",
        f"Ask what tools, systems, or workflows a strong {role_label} candidate should know",
        f"Ask debugging, design, trade-off, and implementation questions for {role_label}",
        f"Ask scenario-based questions grounded in day-to-day {role_label} responsibilities",
    ]
    if primary_language:
        question_focus.append(f"Ask how {primary_language} is used effectively in {role_label}")
    for option in option_terms[:3]:
        question_focus.append(f"Ask role-specific questions using {option}")

    return {
        "core_areas": list(dict.fromkeys(core_areas))[:8],
        "question_focus": list(dict.fromkeys(question_focus))[:7],
        "tech_stack": tech_stack[:6],
    }


def _fallback_role_blueprint(payload: Dict[str, Any]) -> Dict[str, Any]:
    job_role = _normalize_text(payload.get("job_role") or "")
    primary_language = _normalize_text(payload.get("primary_language") or "")
    selected_options = _safe_list(payload.get("selected_options") or [])
    role_profile = _match_role_profile(job_role)

    if role_profile:
        return {
            "role_label": role_profile["label"],
            "core_areas": role_profile["core_fields"][:6],
            "tech_stack": [primary_language] if primary_language else [],
            "question_focus": role_profile["question_seeds"][:5],
            "language_focus": primary_language or "",
        }

    inferred_stack = []
    if primary_language:
        inferred_stack.append(primary_language)
    inferred_stack.extend(selected_options[:4])
    generic_focus = _generic_role_focus(job_role, primary_language, selected_options)
    core_areas = generic_focus["core_areas"] or (
        selected_options[:6] if selected_options else [
            "programming fundamentals",
            "core concepts",
            "problem solving",
            "debugging",
            "system understanding",
        ]
    )

    return {
        "role_label": job_role or primary_language or "Technical Role",
        "core_areas": core_areas,
        "tech_stack": generic_focus["tech_stack"] or inferred_stack,
        "question_focus": generic_focus["question_focus"] or [
            f"Ask technical fundamentals for {job_role or primary_language or 'the selected role'}",
            "Ask conceptual questions based on selected topics",
            "Ask practical implementation questions",
            "Ask debugging or architecture questions where relevant",
        ],
        "language_focus": primary_language or "",
    }


async def _call_gemini_json(
    prompt: str,
    temperature: float = 0.35,
    timeout_seconds: Optional[int] = None,
) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        raise ProviderError("GEMINI_API_KEY is not configured.")

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "response_mime_type": "application/json",
        },
    }
    data = await asyncio.to_thread(_http_post_json, url, payload, None, timeout_seconds or 80)
    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    text = "".join(part.get("text", "") for part in parts)
    return _extract_json_block(text)


async def _call_ollama_json(
    prompt: str,
    temperature: float = 0.2,
    timeout_seconds: Optional[int] = None,
) -> Dict[str, Any]:
    url = f"{OLLAMA_BASE_URL}/api/generate"
    effective_prompt = prompt
    if OLLAMA_MODEL.lower().startswith("qwen3") and not prompt.lstrip().startswith("/no_think"):
        # Qwen3 defaults to thinking mode, which is too slow for this app on CPU-only laptops.
        effective_prompt = f"/no_think\n{prompt}"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": effective_prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": temperature},
    }
    data = await asyncio.to_thread(
        _http_post_json,
        url,
        payload,
        None,
        timeout_seconds or OLLAMA_TIMEOUT_SECONDS,
    )
    text = data.get("response", "")
    return _extract_json_block(text)


async def _generate_json_with_fallback(
    prompt: str,
    order: List[str],
    temperature: float = 0.3,
    timeout_seconds: Optional[int] = None,
) -> Tuple[Dict[str, Any], str]:
    errors = []
    for provider in order:
        try:
            if provider == "gemini":
                return await _call_gemini_json(prompt, temperature, timeout_seconds), "gemini"
            if provider == "ollama":
                return await _call_ollama_json(prompt, temperature, timeout_seconds), "ollama"
        except ProviderError as exc:
            errors.append(f"{provider}: {exc}")

    raise ProviderError(" | ".join(errors) if errors else "No provider available.")


def get_ai_provider_status() -> Dict[str, Any]:
    ollama_status = {
        "configured": bool(OLLAMA_BASE_URL and OLLAMA_MODEL),
        "available": False,
        "connection_checked": True,
        "model": OLLAMA_MODEL,
        "base_url": OLLAMA_BASE_URL,
        "detail": "",
    }

    if ollama_status["configured"]:
        try:
            tags = _http_get_json(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            models = tags.get("models") or []
            installed = [
                _normalize_text(model.get("name") or model.get("model") or "")
                for model in models
                if isinstance(model, dict)
            ]
            ollama_status["available"] = True
            if OLLAMA_MODEL and installed:
                has_model = any(
                    item == OLLAMA_MODEL or item.startswith(f"{OLLAMA_MODEL}:")
                    for item in installed
                )
                ollama_status["detail"] = (
                    f"Connected. Model '{OLLAMA_MODEL}' is installed."
                    if has_model
                    else f"Connected, but model '{OLLAMA_MODEL}' is not installed."
                )
            else:
                ollama_status["detail"] = "Connected."
        except ProviderError as exc:
            ollama_status["detail"] = str(exc)
    else:
        ollama_status["detail"] = "OLLAMA_BASE_URL or OLLAMA_MODEL is missing."

    gemini_configured = bool(GEMINI_API_KEY)
    return {
        "providers": {
            "gemini": {
                "configured": gemini_configured,
                "available": gemini_configured,
                "connection_checked": False,
                "model": GEMINI_MODEL,
                "detail": "API key loaded." if gemini_configured else "GEMINI_API_KEY is missing.",
            },
            "ollama": ollama_status,
        },
        "stage_order": {
            "analysis": ["gemini", "ollama"],
            "generation": ["gemini", "ollama"],
            "evaluation": ["gemini", "ollama"],
            "summary": ["gemini", "ollama"],
        },
    }


async def _infer_role_blueprint(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    selected_mode = payload.get("selected_mode") or "general"
    category = payload.get("category") or "general"
    selected_options = _safe_list(payload.get("selected_options") or [])
    fallback_blueprint = _fallback_role_blueprint(payload)

    prompt = f"""
You are analyzing a user's selected interview role and topics.

Input:
- Category: {category}
- Selected mode: {selected_mode}
- Job role: {payload.get("job_role") or "Not specified"}
- Primary language: {payload.get("primary_language") or "Not specified"}
- Experience: {payload.get("experience") or "Not specified"}
- Selected options: {json.dumps(selected_options, ensure_ascii=False)}

Return valid JSON in this exact shape:
{{
  "role_label": "normalized role label",
  "core_areas": ["6 to 8 technical domains that this role should be interviewed on"],
  "tech_stack": ["languages, frameworks, databases, tools, cloud, testing, or infra items relevant to the role"],
  "question_focus": ["5 to 7 specific areas the interview should ask from"],
  "language_focus": "primary language if relevant, otherwise empty string"
}}

Rules:
- Infer the likely tech stack and concepts from the selected role and options.
- Keep this technical only.
- Do not include HR, behavioral, motivation, strengths, or self-introduction topics.
- If the role suggests backend, frontend, full stack, data science, AI/ML, DevOps, QA, or security, infer the most relevant stacks and concepts automatically.
- Support any technical job title, even if it is niche, uncommon, or not in a predefined list.
- If the role is uncommon, infer the interview focus from the actual role title words, selected options, and language.
- If selected options are provided, use them strongly.
- If a language is provided, include it where relevant.
- Avoid markdown.
"""

    try:
        blueprint, provider = await _generate_json_with_fallback(
            prompt,
            ["gemini", "ollama"],
            0.2,
            STARTUP_AI_TIMEOUT_SECONDS,
        )
        normalized = {
            "role_label": _normalize_text(blueprint.get("role_label") or fallback_blueprint["role_label"]),
            "core_areas": _safe_list(blueprint.get("core_areas")) or fallback_blueprint["core_areas"],
            "tech_stack": _safe_list(blueprint.get("tech_stack")) or fallback_blueprint["tech_stack"],
            "question_focus": _safe_list(blueprint.get("question_focus")) or fallback_blueprint["question_focus"],
            "language_focus": _normalize_text(blueprint.get("language_focus") or fallback_blueprint["language_focus"]),
        }
        return normalized, provider
    except ProviderError:
        return fallback_blueprint, "fallback"


def _default_questions(payload: Dict[str, Any], variation: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    variation = variation or _build_interview_variation(payload)
    shuffler = random.Random(_normalize_text(variation.get("seed") or "default"))
    role = payload.get("job_role") or "candidate"
    language = payload.get("primary_language")
    focus = payload.get("selected_options") or []
    category = payload.get("category") or "general"
    selected_mode = payload.get("selected_mode") or ("language" if language else "role")
    experience = payload.get("experience") or "Not specified"
    difficulty = _difficulty_from_experience(experience)
    question_count = _resolve_question_count(payload)
    config_mode = payload.get("config_mode") or "question"
    time_hint = payload.get("time_mode_interval") or payload.get("interview_mode_time")
    target_subject = _target_subject(payload)
    role_profile = _match_role_profile(role)
    base_questions: List[Dict[str, Any]] = []

    if role_profile:
        role_field_points = role_profile["core_fields"][:4]
        base_questions.extend(
            [
                {
                    "question": f"For a {role_profile['label']} role, which core technical areas should a strong {experience} candidate be confident in, and why?",
                    "question_type": "fundamental",
                    "expected_points": role_field_points,
                    "evaluation_focus": ["fundamentals", "technical awareness", "clarity"],
                },
                {
                    "question": role_profile["question_seeds"][0],
                    "question_type": "practical",
                    "expected_points": [
                        "clear step-by-step technical explanation",
                        "correct use of core concepts",
                        "time or space complexity or trade-off reasoning",
                        "practical implementation approach",
                    ],
                    "evaluation_focus": ["problem solving", "technical depth", "clarity"],
                },
                {
                    "question": role_profile["question_seeds"][1],
                    "question_type": "conceptual",
                    "expected_points": [
                        "correct definition of the concept",
                        "difference from related concept",
                        "practical significance",
                    ],
                    "evaluation_focus": ["conceptual depth", "accuracy", "clarity"],
                },
                {
                    "question": role_profile["question_seeds"][2],
                    "question_type": "practical",
                    "expected_points": [
                        "role-relevant technical reasoning",
                        "correct syntax or structured explanation",
                        "clear practical outcome",
                    ],
                    "evaluation_focus": ["applied skills", "accuracy", "clarity"],
                },
                {
                    "question": role_profile["question_seeds"][3],
                    "question_type": "scenario",
                    "expected_points": [
                        "clear architecture or solution flow",
                        "relevant tools or components",
                        "trade-offs and scalability or maintainability considerations",
                    ],
                    "evaluation_focus": ["system thinking", "practical design", "technical reasoning"],
                },
                {
                    "question": role_profile["question_seeds"][4],
                    "question_type": "scenario",
                    "expected_points": [
                        "real-world technical constraints",
                        "structured problem-solving approach",
                        "relevant stack choices and reasoning",
                    ],
                    "evaluation_focus": ["architecture", "decision making", "technical fit"],
                },
            ]
        )

    if language:
        base_questions.insert(
            min(2, len(base_questions)),
            {
                "question": f"How have you used {language} in real projects, and what makes you effective with it?",
                "question_type": "practical",
                "expected_points": [
                    "hands-on use of the language",
                    "specific tools or frameworks",
                    "strengths and best practices",
                ],
                "evaluation_focus": ["technical depth", "practical experience", "clarity"],
            },
        )
        base_questions.insert(
            min(1, len(base_questions)),
            {
                "question": f"What core fundamentals of {language} should a strong {experience} candidate understand before solving advanced problems?",
                "question_type": "fundamental",
                "expected_points": [
                    "language fundamentals and syntax",
                    "runtime or execution understanding",
                    "memory, errors, or debugging basics",
                    "why fundamentals matter in real work",
                ],
                "evaluation_focus": ["fundamentals", "conceptual clarity", "relevance"],
            },
        )

    if category == "technical":
        technical_question = {
            "question": (
                f"For a {experience} candidate, explain a {difficulty} technical challenge you would expect "
                f"in a {role or language or 'technical'} interview and how you would solve it."
            ),
            "question_type": "scenario",
            "expected_points": [
                "clear technical context",
                "step-by-step approach",
                "trade-offs or reasoning",
                "practical outcome",
            ],
            "evaluation_focus": ["technical depth", "problem solving", "clarity"],
        }
        base_questions.insert(min(1, len(base_questions)), technical_question)
        base_questions.insert(
            min(1, len(base_questions)),
            {
                "question": f"What core concepts and fundamentals should every {target_subject} candidate be comfortable explaining confidently?",
                "question_type": "conceptual",
                "expected_points": [
                    "important foundational concepts",
                    "why those concepts matter",
                    "real interview relevance",
                    "clear structured explanation",
                ],
                "evaluation_focus": ["fundamentals", "conceptual depth", "clarity"],
            },
        )

    if selected_mode == "language" and language:
        base_questions.insert(
            min(1, len(base_questions)),
            {
                "question": (
                    f"As a {experience} {language} candidate, what topics should you be strongest in, "
                    "and how would you demonstrate that in an interview?"
                ),
                "question_type": "conceptual",
                "expected_points": [
                    "language fundamentals",
                    "real project usage",
                    "best practices",
                    "confidence with examples",
                ],
                "evaluation_focus": ["language depth", "examples", "confidence"],
            },
        )

    if focus:
        base_questions.insert(
            min(1, len(base_questions)),
            {
                "question": f"You selected {', '.join(focus[:3])}. Which of these best matches your strengths and why?",
                "question_type": "conceptual",
                "expected_points": [
                    "clear choice with justification",
                    "evidence from past work",
                    "fit with target interview",
                ],
                "evaluation_focus": ["role alignment", "specificity", "confidence"],
            },
        )
        if category == "technical" or selected_mode == "language":
            base_questions.insert(
                min(2, len(base_questions)),
                {
                    "question": f"Pick one of these focus areas: {', '.join(focus[:3])}. Explain its core fundamentals and where it is applied in practice.",
                    "question_type": "fundamental",
                    "expected_points": [
                        "clear explanation of the chosen topic",
                        "key fundamentals or building blocks",
                        "real-world usage",
                        "practical trade-offs or examples",
                    ],
                    "evaluation_focus": ["fundamentals", "application", "clarity"],
                },
            )

    if not base_questions:
        base_questions = [
            {
                "question": f"What are the most important technical fundamentals for a {role} candidate?",
                "question_type": "fundamental",
                "expected_points": [
                    "role-relevant technical fundamentals",
                    "clear explanation of why they matter",
                    "practical usage in interviews or projects",
                ],
                "evaluation_focus": ["fundamentals", "clarity", "technical relevance"],
            },
            {
                "question": f"Explain a technical problem you might solve as a {role} and how you would approach it.",
                "question_type": "scenario",
                "expected_points": [
                    "clear technical context",
                    "step-by-step approach",
                    "relevant tools or concepts",
                    "trade-offs or result",
                ],
                "evaluation_focus": ["problem solving", "technical depth", "clarity"],
            },
            {
                "question": f"What concepts should every {role} candidate understand before working on real projects?",
                "question_type": "conceptual",
                "expected_points": [
                    "important concepts listed clearly",
                    "why each concept matters",
                    "connection to real implementation",
                ],
                "evaluation_focus": ["conceptual clarity", "technical awareness", "relevance"],
            },
        ]

    first_block = base_questions[:1]
    remaining = base_questions[1:]
    shuffler.shuffle(remaining)
    trimmed = (first_block + remaining)[:question_count]
    intro_style = _normalize_text(variation.get("opening_style") or "technical interview")
    technical_lens = _normalize_text(variation.get("technical_lens") or "real-world engineering")
    return {
        "assistant_intro": (
            f"Hello, I am your AI interview assistant. "
            f"This will be a {intro_style}. "
            f"I will ask you {len(trimmed)} {difficulty} questions tailored for "
            f"{language if selected_mode == 'language' and language else role}. "
            f"This interview is configured in {config_mode} mode"
            f"{f' for about {time_hint} minutes' if time_hint else ''}. "
            f"Expect a fresh mix focused on {technical_lens}. Answer naturally and clearly."
        ),
        "questions": trimmed,
    }


def _keyword_set(values: List[str]) -> List[str]:
    stop_words = {
        "the", "and", "for", "with", "that", "this", "have", "your", "from",
        "into", "about", "what", "when", "where", "which", "will", "would",
        "been", "were", "they", "them", "their", "then", "than", "just",
        "very", "into", "able", "also", "only", "role", "work", "used",
    }
    tokens: List[str] = []
    for value in values:
        for token in re.findall(r"[a-zA-Z0-9]+", value.lower()):
            if len(token) > 2 and token not in stop_words:
                tokens.append(token)
    return list(dict.fromkeys(tokens))


def _normalize_enum_label(value: Any, allowed: List[str], fallback: str) -> str:
    normalized = _normalize_text(str(value or ""))
    if not normalized:
        return fallback
    lowered = normalized.lower()
    for option in allowed:
        if lowered == option.lower():
            return option
    for option in allowed:
        option_lower = option.lower()
        if lowered in option_lower or option_lower in lowered:
            return option
    return fallback


def _normalize_evaluation_payload(evaluation: Dict[str, Any], fallback_defaults: Dict[str, Any]) -> Dict[str, Any]:
    suggestions = _safe_list(evaluation.get("suggestions"))[:3] or _safe_list(fallback_defaults.get("suggestions"))[:3]
    normalized = {
        "score": int(evaluation.get("score", fallback_defaults["score"])),
        "feedback": _normalize_text(evaluation.get("feedback") or fallback_defaults["feedback"]),
        "strengths": _safe_list(evaluation.get("strengths"))[:3] or fallback_defaults["strengths"],
        "gaps": _safe_list(evaluation.get("gaps"))[:3] or fallback_defaults["gaps"],
        "matched_points": _safe_list(evaluation.get("matched_points"))[:4] or fallback_defaults["matched_points"],
        "missed_points": _safe_list(evaluation.get("missed_points"))[:4] or fallback_defaults["missed_points"],
        "suggested_answer": _normalize_text(evaluation.get("suggested_answer") or fallback_defaults["suggested_answer"]),
        "assistant_reply": _normalize_text(evaluation.get("assistant_reply") or fallback_defaults["assistant_reply"]),
        "relevance": _normalize_enum_label(
            evaluation.get("relevance"),
            ["Relevant", "Partially Relevant", "Not Relevant"],
            fallback_defaults["relevance"],
        ),
        "correctness": _normalize_enum_label(
            evaluation.get("correctness"),
            ["Correct", "Partially Correct", "Incorrect"],
            fallback_defaults["correctness"],
        ),
        "clarity": _normalize_enum_label(
            evaluation.get("clarity"),
            ["Clear", "Needs Improvement"],
            fallback_defaults["clarity"],
        ),
        "technical_depth": _normalize_enum_label(
            evaluation.get("technical_depth"),
            ["Good", "Moderate", "Weak"],
            fallback_defaults["technical_depth"],
        ),
        "logical_validity": _normalize_enum_label(
            evaluation.get("logical_validity"),
            ["Logical", "Partially Logical", "Illogical"],
            fallback_defaults["logical_validity"],
        ),
        "real_world_applicability": _normalize_enum_label(
            evaluation.get("real_world_applicability"),
            ["Applicable", "Partially Applicable", "Not Applicable"],
            fallback_defaults["real_world_applicability"],
        ),
        "suggestions": suggestions,
    }
    normalized["score"] = max(0, min(100, normalized["score"]))
    return normalized


def _heuristic_evaluation(question: Dict[str, Any], answer: str) -> Dict[str, Any]:
    answer_text = _normalize_text(answer)
    expected_points = _safe_list(question.get("expected_points"))
    keywords = _keyword_set(expected_points)
    answer_lower = answer_text.lower()

    matched_keywords = [kw for kw in keywords if kw in answer_lower]
    coverage = len(matched_keywords) / max(len(keywords), 1)
    length_bonus = min(len(answer_text.split()) / 80, 1.0)
    score = int(round(min(100, 35 + coverage * 45 + length_bonus * 20)))

    matched_points = []
    missed_points = []
    for point in expected_points:
        point_keywords = _keyword_set([point])
        if any(keyword in answer_lower for keyword in point_keywords):
            matched_points.append(point)
        else:
            missed_points.append(point)

    strengths = []
    if answer_text:
        strengths.append("You provided a direct spoken response to the question.")
    if matched_points:
        strengths.append("You covered some of the expected interview points.")
    if len(answer_text.split()) > 35:
        strengths.append("Your answer had a reasonable level of detail.")

    gaps = []
    if not answer_text:
        gaps.append("No meaningful answer was captured.")
    if missed_points:
        gaps.append("Some expected points were not clearly addressed.")
    if len(answer_text.split()) < 18:
        gaps.append("Your answer was quite short and could use more specifics.")

    suggested_answer = (
        "A stronger answer would briefly give context, explain your actions clearly, "
        "and end with the result or lesson learned."
    )

    word_count = len(answer_text.split())
    project_markers = ("example", "project", "production", "real", "client", "api", "service", "system", "deployed")
    has_real_world_marker = any(marker in answer_lower for marker in project_markers)
    off_topic = bool(answer_text) and coverage < 0.12 and not matched_points

    relevance = "Not Relevant" if off_topic else ("Partially Relevant" if coverage < 0.45 else "Relevant")
    correctness = "Incorrect" if coverage < 0.18 else ("Partially Correct" if coverage < 0.65 else "Correct")
    clarity = "Needs Improvement" if word_count < 16 else "Clear"
    technical_depth = "Weak" if word_count < 18 or coverage < 0.25 else ("Moderate" if coverage < 0.7 else "Good")
    logical_validity = "Illogical" if off_topic else ("Partially Logical" if coverage < 0.55 else "Logical")
    real_world_applicability = (
        "Applicable" if has_real_world_marker and coverage >= 0.45
        else "Partially Applicable" if has_real_world_marker or coverage >= 0.28
        else "Not Applicable"
    )

    topic_label = _normalize_text(question.get("topic_tag") or question.get("question_type") or "the topic")
    suggestions = []
    if off_topic:
        suggestions.append(f"Focus directly on {topic_label} before adding extra context.")
    if word_count < 16:
        suggestions.append("Expand your answer with one concrete example or implementation detail.")
    if missed_points:
        suggestions.append("Cover the main expected points in a clearer order.")
    if not has_real_world_marker:
        suggestions.append("Tie your answer to a real project, trade-off, or production scenario.")
    suggestions = suggestions[:3]

    if off_topic:
        assistant_reply = f"That is slightly off-topic. Let us focus on {topic_label}."
    elif word_count < 10:
        assistant_reply = "Can you expand on that?"
    elif word_count < 18 or coverage < 0.28:
        assistant_reply = "Can you be more specific?"
    elif score >= 80:
        assistant_reply = "Interesting. Let us explore that a little further."
    else:
        assistant_reply = "Alright, let us continue."

    if not answer_text:
        feedback = "I could not capture a clear answer. Please answer directly, stay on the topic, and add one real example."
    elif off_topic:
        feedback = (
            f"Your response drifted away from {topic_label}. Start by answering the exact question, "
            "then support it with one relevant technical example."
        )
    elif score >= 75:
        feedback = (
            "Your answer was relevant and mostly correct. To make it stronger, add one real-world trade-off "
            "or production consideration."
        )
    else:
        feedback = (
            "Your answer has some relevant points, but it needs clearer structure, better technical precision, "
            "and a more practical example."
        )

    return {
        "score": score,
        "feedback": feedback,
        "strengths": strengths[:3],
        "gaps": gaps[:3],
        "matched_points": matched_points[:4],
        "missed_points": missed_points[:4],
        "suggested_answer": suggested_answer,
        "assistant_reply": assistant_reply,
        "relevance": relevance,
        "correctness": correctness,
        "clarity": clarity,
        "technical_depth": technical_depth,
        "logical_validity": logical_validity,
        "real_world_applicability": real_world_applicability,
        "suggestions": suggestions,
    }


KNOWN_LANGUAGES = {
    "python": "Python",
    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "go": "Go",
    "golang": "Go",
    "c#": "C#",
    "dotnet": ".NET",
    ".net": ".NET",
    "php": "PHP",
    "ruby": "Ruby",
    "rust": "Rust",
    "kotlin": "Kotlin",
}

KNOWN_FRAMEWORKS = {
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "spring boot": "Spring Boot",
    "spring": "Spring",
    "express": "Express.js",
    "nestjs": "NestJS",
    "nest": "NestJS",
    "laravel": "Laravel",
    "asp.net": "ASP.NET",
    "gin": "Gin",
}

KNOWN_DATABASES = {
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "sqlite": "SQLite",
    "oracle": "Oracle",
    "sql server": "SQL Server",
}

KNOWN_TOOLS = {
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "aws": "AWS",
    "azure": "Azure",
    "gcp": "GCP",
    "rabbitmq": "RabbitMQ",
    "kafka": "Kafka",
    "graphql": "GraphQL",
    "rest": "REST APIs",
    "rest api": "REST APIs",
    "rest apis": "REST APIs",
}


def _merge_unique(existing: List[str], new_items: List[str]) -> List[str]:
    merged = list(existing or [])
    for item in new_items or []:
        value = _normalize_text(item)
        if value and value not in merged:
            merged.append(value)
    return merged


def _extract_known_terms(text: str, vocabulary: Dict[str, str]) -> List[str]:
    lowered = text.lower()
    matches: List[str] = []
    for needle, label in vocabulary.items():
        if needle in lowered and label not in matches:
            matches.append(label)
    return matches


def _extract_preferred_language(text: str, languages: List[str]) -> str:
    lowered = text.lower()
    preference_markers = (
        "prefer",
        "preferred",
        "most comfortable with",
        "comfortable with",
        "mainly",
        "mostly",
        "focus on",
        "worked mostly with",
        "use mostly",
    )
    for language in languages:
        value = language.lower()
        if any(f"{marker} {value}" in lowered for marker in preference_markers):
            return language
    return languages[0] if len(languages) == 1 else ""


def _adaptive_role_interview_enabled(payload: Dict[str, Any]) -> bool:
    category = _normalize_text(payload.get("category") or "").lower()
    if category not in {"technical", "mock"}:
        return False
    selected_mode = payload.get("selected_mode") or (
        "language" if payload.get("primary_language") else "role" if payload.get("job_role") else "general"
    )
    return _normalize_text(selected_mode).lower() == "role" and bool(_normalize_text(payload.get("job_role") or ""))


def _adaptive_intro(payload: Dict[str, Any], question_count: int) -> str:
    role = _normalize_text(payload.get("job_role") or "the selected role")
    category = _normalize_text(payload.get("category") or "").lower()
    if category == "mock":
        return (
            f"Hello, I’m your AI interviewer for this {role} mock interview. "
            "I’ll start by understanding the technologies you feel most comfortable with, and then I’ll ask one question at a time like a real interviewer. "
            "Because this is a mock interview, I may include a small HR or behavioral section near the end as well."
        )
    return (
        f"Hello, I’m your AI interviewer for this {role} technical round. "
        "I’ll first confirm the stack you’d like to focus on, and then I’ll ask one question at a time and adapt based on your answers. "
        f"I’ll keep the interview technical and tailor the next {question_count} scored questions to your strengths."
    )


def _adaptive_discovery_question(payload: Dict[str, Any], variation: Optional[Dict[str, str]] = None) -> str:
    role = _normalize_text(payload.get("job_role") or "this role")
    role_lower = role.lower()
    shuffler = random.Random(_normalize_text((variation or {}).get("seed") or role or "adaptive"))
    if any(keyword in role_lower for keyword in ("backend", "full stack", "full-stack", "fullstack", "software engineer", "software developer")):
        options = [
            f"To start, which backend languages, frameworks, databases, or tools are you most comfortable with for this {role} role?",
            f"Before we go deeper, which backend stack do you actually feel strongest with for this {role} role?",
            f"To get the interview aligned properly, which backend technologies have you used most confidently in real work for this {role} role?",
        ]
    else:
        options = [
            f"To start, which languages, frameworks, tools, or technical areas are you most comfortable with for this {role} role?",
            f"Before we dive in, which technical stack or problem areas would you like me to focus on first for this {role} role?",
            f"To tailor this interview properly, which technologies or technical areas do you feel strongest with for this {role} role?",
        ]
    return shuffler.choice(options)


def _build_adaptive_state(payload: Dict[str, Any], role_blueprint: Dict[str, Any], question_count: int) -> Dict[str, Any]:
    category = _normalize_text(payload.get("category") or "").lower()
    primary_language = _normalize_text(payload.get("primary_language") or role_blueprint.get("language_focus") or "")
    include_hr = category == "mock"
    hr_target = 0 if not include_hr else (1 if question_count <= 5 else 2)
    return {
        "enabled": True,
        "include_hr": include_hr,
        "scored_question_target": question_count,
        "discovery_questions_asked": 1,
        "clarification_turns": 0,
        "discovery_complete": False,
        "preferred_language": primary_language,
        "languages": [primary_language] if primary_language else [],
        "frameworks": [],
        "databases": [],
        "tools": [],
        "focus_areas": _safe_list(role_blueprint.get("core_areas"))[:6],
        "covered_topics": [],
        "scored_questions_answered": 0,
        "technical_questions_answered": 0,
        "hr_questions_answered": 0,
        "hr_question_target": hr_target,
        "role_label": _normalize_text(role_blueprint.get("role_label") or payload.get("job_role") or "Technical Role"),
        "confidence_summary": "",
    }


def _append_session_question(session: Dict[str, Any], question_payload: Dict[str, Any]) -> Dict[str, Any]:
    question_text = _normalize_text(question_payload.get("question") or "")
    if not question_text:
        raise ProviderError("Generated question text was empty.")

    question = {
        "id": len(session.get("questions", [])) + 1,
        "question": question_text,
        "question_type": _safe_question_type(question_payload.get("question_type")),
        "expected_points": _safe_list(question_payload.get("expected_points"))[:5],
        "evaluation_focus": _safe_list(question_payload.get("evaluation_focus"))[:4],
        "count_towards_score": bool(question_payload.get("count_towards_score", True)),
        "topic_tag": _normalize_text(question_payload.get("topic_tag") or ""),
    }

    session.setdefault("questions", []).append(question)
    session.setdefault("question_outline", []).append(
        {
            "id": question["id"],
            "question": question["question"],
            "question_type": question["question_type"],
        }
    )
    return question


def _adaptive_total_questions(session: Dict[str, Any]) -> int:
    state = session.get("meta", {}).get("adaptive_state") or {}
    if not state.get("enabled"):
        return len(session.get("questions", []))
    return max(
        len(session.get("questions", [])),
        int(state.get("scored_question_target", 0)) + max(1, int(state.get("discovery_questions_asked", 1))),
    )


def _adaptive_state_summary(state: Dict[str, Any]) -> str:
    return "\n".join(
        [
            f"Role label: {state.get('role_label') or 'Not specified'}",
            f"Preferred language: {state.get('preferred_language') or 'Not confirmed'}",
            f"Languages mentioned: {', '.join(state.get('languages') or []) or 'None yet'}",
            f"Frameworks mentioned: {', '.join(state.get('frameworks') or []) or 'None yet'}",
            f"Databases mentioned: {', '.join(state.get('databases') or []) or 'None yet'}",
            f"Tools mentioned: {', '.join(state.get('tools') or []) or 'None yet'}",
            f"Focus areas: {', '.join(state.get('focus_areas') or []) or 'None yet'}",
            f"Confidence summary: {state.get('confidence_summary') or 'Not confirmed yet'}",
            f"Covered topics: {', '.join(state.get('covered_topics') or []) or 'None yet'}",
            f"Technical questions answered: {state.get('technical_questions_answered', 0)}",
            f"HR questions answered: {state.get('hr_questions_answered', 0)}",
        ]
    )


def _fallback_stack_analysis(answer_text: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    languages = _extract_known_terms(answer_text, KNOWN_LANGUAGES)
    frameworks = _extract_known_terms(answer_text, KNOWN_FRAMEWORKS)
    databases = _extract_known_terms(answer_text, KNOWN_DATABASES)
    tools = _extract_known_terms(answer_text, KNOWN_TOOLS)
    preferred_language = _extract_preferred_language(answer_text, languages)

    if not preferred_language and frameworks:
        framework_to_language = {
            "FastAPI": "Python",
            "Django": "Python",
            "Flask": "Python",
            "Spring Boot": "Java",
            "Spring": "Java",
            "Express.js": "JavaScript",
            "NestJS": "TypeScript",
            "Laravel": "PHP",
            "ASP.NET": "C#",
            "Gin": "Go",
        }
        for framework in frameworks:
            implied = framework_to_language.get(framework)
            if implied:
                preferred_language = implied
                if implied not in languages:
                    languages.append(implied)
                break

    if not preferred_language and payload.get("primary_language"):
        preferred_language = _normalize_text(payload.get("primary_language"))
        if preferred_language and preferred_language not in languages:
            languages.append(preferred_language)

    needs_clarification = False
    clarification_question = ""
    if len(languages) > 1 and not _extract_preferred_language(answer_text, languages):
        needs_clarification = True
        clarification_question = (
            f"You mentioned {', '.join(languages[:3])}. Which one would you like me to focus on first for this interview?"
        )
    elif not languages and not frameworks:
        needs_clarification = True
        clarification_question = (
            "Which backend language or framework would you like me to focus on first, and what stack have you actually used?"
        )

    focus_areas = _merge_unique(frameworks, databases)
    focus_areas = _merge_unique(focus_areas, tools)
    if preferred_language:
        focus_areas = _merge_unique([preferred_language], focus_areas)

    stack_summary = ", ".join(focus_areas[:4]) or "your preferred stack"
    acknowledgement = (
        f"Thanks. I will tailor the interview around {stack_summary}."
        if stack_summary
        else "Thanks. I will tailor the interview around what you are most comfortable with."
    )

    return {
        "preferred_language": preferred_language,
        "languages": languages,
        "frameworks": frameworks,
        "databases": databases,
        "tools": tools,
        "focus_areas": focus_areas,
        "confidence_summary": f"Candidate appears most comfortable with {stack_summary}." if stack_summary else "",
        "needs_clarification": needs_clarification,
        "clarification_question": clarification_question,
        "acknowledgement": acknowledgement,
    }


async def _analyze_discovery_answer(session: Dict[str, Any], answer_text: str) -> Tuple[Dict[str, Any], str]:
    payload = session.get("context", {})
    fallback = _fallback_stack_analysis(answer_text, payload)
    prompt = f"""
You are an experienced technical interviewer tailoring a live interview after the candidate's stack-discovery answer.

Interview context:
{_context_summary(payload)}

Candidate discovery answer:
{answer_text}

Return valid JSON:
{{
  "preferred_language": "single preferred language if clearly stated, else empty string",
  "languages": ["languages explicitly mentioned or strongly implied"],
  "frameworks": ["frameworks explicitly mentioned or strongly implied"],
  "databases": ["databases explicitly mentioned or strongly implied"],
  "tools": ["tools, cloud, APIs, or infrastructure items explicitly mentioned or strongly implied"],
  "focus_areas": ["the best interview focus areas to use next"],
  "confidence_summary": "one short summary of the candidate's stack comfort",
  "needs_clarification": false,
  "clarification_question": "one short clarification question if needed, otherwise empty string",
  "acknowledgement": "one short human-like acknowledgement before the next step"
}}

Rules:
- Do not assume a language or framework unless the candidate clearly mentioned it or strongly implied it.
- If the candidate mentions multiple backend languages without a preference, set needs_clarification to true.
- If the answer is too vague, ask one short clarification question.
- Keep acknowledgement natural and concise, like a real interviewer.
- Avoid markdown.
"""
    try:
        analysis, provider = await _generate_json_with_fallback(
            prompt,
            ["gemini", "ollama"],
            0.2,
            LIVE_AI_TIMEOUT_SECONDS,
        )
        normalized = {
            "preferred_language": _normalize_text(analysis.get("preferred_language") or fallback["preferred_language"]),
            "languages": _safe_list(analysis.get("languages")) or fallback["languages"],
            "frameworks": _safe_list(analysis.get("frameworks")) or fallback["frameworks"],
            "databases": _safe_list(analysis.get("databases")) or fallback["databases"],
            "tools": _safe_list(analysis.get("tools")) or fallback["tools"],
            "focus_areas": _safe_list(analysis.get("focus_areas")) or fallback["focus_areas"],
            "confidence_summary": _normalize_text(analysis.get("confidence_summary") or fallback["confidence_summary"]),
            "needs_clarification": bool(analysis.get("needs_clarification")) if "needs_clarification" in analysis else fallback["needs_clarification"],
            "clarification_question": _normalize_text(analysis.get("clarification_question") or fallback["clarification_question"]),
            "acknowledgement": _normalize_text(analysis.get("acknowledgement") or fallback["acknowledgement"]),
        }
        return normalized, provider
    except ProviderError:
        return fallback, "fallback"


def _apply_discovery_analysis(state: Dict[str, Any], analysis: Dict[str, Any]) -> None:
    state["preferred_language"] = _normalize_text(
        analysis.get("preferred_language") or state.get("preferred_language") or ""
    )
    state["languages"] = _merge_unique(state.get("languages") or [], _safe_list(analysis.get("languages")))
    state["frameworks"] = _merge_unique(state.get("frameworks") or [], _safe_list(analysis.get("frameworks")))
    state["databases"] = _merge_unique(state.get("databases") or [], _safe_list(analysis.get("databases")))
    state["tools"] = _merge_unique(state.get("tools") or [], _safe_list(analysis.get("tools")))
    state["focus_areas"] = _merge_unique(state.get("focus_areas") or [], _safe_list(analysis.get("focus_areas")))
    state["confidence_summary"] = _normalize_text(
        analysis.get("confidence_summary") or state.get("confidence_summary") or ""
    )


def _adaptive_focus_candidates(session: Dict[str, Any], last_question: Optional[Dict[str, Any]] = None) -> List[str]:
    state = session.get("meta", {}).get("adaptive_state") or {}
    role_blueprint = session.get("meta", {}).get("role_blueprint") or {}
    selected_options = _safe_list(session.get("context", {}).get("selected_options") or [])
    candidates: List[str] = []
    candidates = _merge_unique(candidates, state.get("frameworks") or [])
    candidates = _merge_unique(candidates, state.get("databases") or [])
    candidates = _merge_unique(candidates, state.get("tools") or [])
    candidates = _merge_unique(candidates, [state.get("preferred_language") or ""])
    candidates = _merge_unique(candidates, selected_options)
    candidates = _merge_unique(candidates, _safe_list(role_blueprint.get("tech_stack")))
    candidates = _merge_unique(candidates, _safe_list(role_blueprint.get("core_areas")))
    if last_question:
        candidates = _merge_unique(candidates, [_normalize_text(last_question.get("topic_tag") or "")])
    return [item for item in candidates if item]


def _next_adaptive_track(state: Dict[str, Any]) -> str:
    if not state.get("include_hr"):
        return "technical"
    if int(state.get("hr_questions_answered", 0)) >= int(state.get("hr_question_target", 0)):
        return "technical"
    technical_before_hr = max(2, int(state.get("scored_question_target", 0)) - int(state.get("hr_question_target", 0)))
    if int(state.get("technical_questions_answered", 0)) >= technical_before_hr:
        return "hr"
    return "technical"


def _next_uncovered_topic(session: Dict[str, Any], last_question: Optional[Dict[str, Any]] = None) -> str:
    state = session.get("meta", {}).get("adaptive_state") or {}
    covered = {item.lower() for item in state.get("covered_topics") or []}
    last_topic = _normalize_text((last_question or {}).get("topic_tag") or "")
    for candidate in _adaptive_focus_candidates(session, last_question):
        lowered = candidate.lower()
        if lowered not in covered and lowered != last_topic.lower():
            return candidate
    return last_topic or _normalize_text(state.get("preferred_language") or "") or _normalize_text(session.get("context", {}).get("job_role") or "backend fundamentals")


def _fallback_adaptive_question(
    session: Dict[str, Any],
    last_question: Optional[Dict[str, Any]],
    evaluation: Optional[Dict[str, Any]],
    desired_track: str,
) -> Dict[str, Any]:
    role = _normalize_text(session.get("context", {}).get("job_role") or "the role")
    score = int((evaluation or {}).get("score") or 0)
    topic = _next_uncovered_topic(session, last_question)

    if desired_track == "hr":
        return {
            "assistant_reply": "Thank you. I’d also like to understand how you work with people, pressure, and ownership.",
            "question": (
                f"Tell me about a time you had to explain a technical decision, handle pressure, or coordinate with others while working as a {role}. "
                "What was the situation, what did you do, and what happened?"
            ),
            "question_type": "behavioral",
            "expected_points": [
                "clear situation",
                "specific actions taken",
                "communication or prioritization choices",
                "result and learning",
            ],
            "evaluation_focus": ["structure", "ownership", "communication"],
            "topic_tag": "behavioral ownership",
        }

    if score < 55:
        return {
            "assistant_reply": "Thanks, that helps. Let’s keep it a little more concrete and stay on the same stack for a moment.",
            "question": f"Can you walk me through a real backend example where you used {topic}, including what you built and the main trade-offs?",
            "question_type": "practical",
            "expected_points": [
                "clear project context",
                "specific implementation steps",
                "relevant backend concepts",
                "trade-offs or result",
            ],
            "evaluation_focus": ["specificity", "practical detail", "clarity"],
            "topic_tag": topic,
        }

    if score >= 80:
        return {
            "assistant_reply": "Nice, that was clear. Let’s go one level deeper there.",
            "question": f"What edge cases, failure modes, or production trade-offs do you watch for when working with {topic} in a backend system?",
            "question_type": "scenario",
            "expected_points": [
                "important edge cases",
                "failure handling or resilience",
                "trade-offs",
                "practical mitigation steps",
            ],
            "evaluation_focus": ["depth", "real-world awareness", "clarity"],
            "topic_tag": topic,
        }

    next_topic = _next_uncovered_topic(session, last_question)
    return {
        "assistant_reply": "Good. Let’s move to another area you’re likely to face in a real backend interview.",
        "question": f"How would you design, implement, or troubleshoot {next_topic} for a {role} service?",
        "question_type": "practical",
        "expected_points": [
            "clear approach",
            "relevant tools or concepts",
            "real implementation detail",
            "trade-offs or debugging awareness",
        ],
        "evaluation_focus": ["technical reasoning", "practicality", "clarity"],
        "topic_tag": next_topic,
    }


async def _generate_adaptive_question(
    session: Dict[str, Any],
    last_question: Optional[Dict[str, Any]],
    answer_text: str,
    evaluation: Optional[Dict[str, Any]],
) -> Tuple[Dict[str, Any], str]:
    state = session.get("meta", {}).get("adaptive_state") or {}
    variation = session.get("meta", {}).get("interview_variation") or {}
    desired_track = _next_adaptive_track(state)
    last_score = int((evaluation or {}).get("score") or 0)
    role = _normalize_text(session.get("context", {}).get("job_role") or "the selected role")
    prompt = f"""
You are running a live adaptive AI interview one question at a time.

Interview context:
{_context_summary(session.get("context", {}))}

Discovered candidate profile:
{_adaptive_state_summary(state)}

Recent turn:
- Previous question: {(last_question or {}).get("question") or "None"}
- Previous topic: {(last_question or {}).get("topic_tag") or "None"}
- Candidate answer: {answer_text or "No answer captured"}
- Last score: {last_score}
- Last feedback: {(evaluation or {}).get("feedback") or "Not available"}
- Last gaps: {json.dumps((evaluation or {}).get("gaps") or [], ensure_ascii=False)}

Remaining scored questions after the next turn: {max(0, int(state.get("scored_question_target", 0)) - int(state.get("scored_questions_answered", 0)) - 1)}
Desired next track: {desired_track}
Target role: {role}
Session variation:
{_variation_summary(variation)}

Return valid JSON with this exact shape:
{{
  "assistant_reply": "one short conversational bridge",
  "question": "exactly one next interview question",
  "question_type": "fundamental | conceptual | practical | scenario | behavioral",
  "expected_points": ["3 to 5 concise expected answer points"],
  "evaluation_focus": ["3 concise evaluation criteria"],
  "topic_tag": "short topic label"
}}

Rules:
- Ask exactly one question.
- Sound like a curious, calm, and supportive human interviewer.
- Keep assistant_reply gentle, natural, and short, like a real interviewer speaking conversationally.
- Make the wording feel fresh for this session instead of using stock repeated phrasing.
- If desired next track is technical, do not ask HR, self-introduction, motivation, or strengths and weaknesses questions.
- If desired next track is technical and the last score was below 55, ask a simpler follow-up or ask for a concrete example on the same stack.
- If desired next track is technical and the last score was 80 or above, go one level deeper on the same topic or a closely related backend concern.
- If desired next track is technical and the last score was between 55 and 79, move to the next relevant backend topic.
- If desired next track is hr, ask one realistic behavioral or communication question relevant to the role.
- Prefer the candidate's preferred language, frameworks, and tools when known.
- Avoid repeating covered topics unless you are intentionally following up on a weak answer.
- Keep it professional, specific, and natural.
- Do not use markdown.
"""

    try:
        generated, provider = await _generate_json_with_fallback(
            prompt,
            ["gemini", "ollama"],
            0.2,
            LIVE_AI_TIMEOUT_SECONDS,
        )
        question = {
            "assistant_reply": _normalize_text(generated.get("assistant_reply") or ""),
            "question": _normalize_text(generated.get("question") or ""),
            "question_type": _safe_question_type(generated.get("question_type") or ("behavioral" if desired_track == "hr" else "practical")),
            "expected_points": _safe_list(generated.get("expected_points"))[:5],
            "evaluation_focus": _safe_list(generated.get("evaluation_focus"))[:4],
            "topic_tag": _normalize_text(generated.get("topic_tag") or _next_uncovered_topic(session, last_question)),
        }
        if desired_track == "hr":
            question["question_type"] = "behavioral"
        elif question["question_type"] == "behavioral":
            question["question_type"] = "practical"
        if not question["question"] or not question["expected_points"]:
            raise ProviderError("Adaptive question generation returned incomplete data.")
        return question, provider
    except ProviderError:
        return _fallback_adaptive_question(session, last_question, evaluation, desired_track), "fallback"


async def _generate_adaptive_opening_turn(
    payload: Dict[str, Any],
    role_blueprint: Dict[str, Any],
    question_count: int,
    variation: Optional[Dict[str, str]] = None,
) -> Tuple[Dict[str, Any], str]:
    variation = variation or _build_interview_variation(payload)
    fallback = {
        "assistant_intro": _adaptive_intro(payload, question_count),
        "question": _adaptive_discovery_question(payload, variation),
        "question_type": "discovery",
        "expected_points": [
            "languages the candidate knows",
            "frameworks or backend tools used",
            "preferred stack to focus on",
        ],
        "evaluation_focus": ["clarity", "stack identification", "specificity"],
        "topic_tag": "stack discovery",
    }
    prompt = f"""
You are a highly experienced technical interviewer conducting a real-time interview.

Your behavior must be human-like, conversational, adaptive, and professional but friendly.

Interview context:
- Role: {_normalize_text(payload.get("job_role") or role_blueprint.get("role_label") or "the selected role")}
- Candidate skills: {json.dumps(_safe_list(payload.get("selected_options") or []), ensure_ascii=False)}
- Experience level: {_normalize_text(payload.get("experience") or "Not specified")}
- Interview type: {_normalize_text(payload.get("category") or "technical")}
- Inferred role blueprint: {json.dumps(role_blueprint, ensure_ascii=False)}
Session variation:
{_variation_summary(variation)}

Return valid JSON:
{{
  "assistant_intro": "short natural greeting like a real interviewer",
  "question": "exactly one opening discovery question",
  "question_type": "discovery",
  "expected_points": ["3 to 5 concise things the candidate should mention"],
  "evaluation_focus": ["3 concise discovery criteria"],
  "topic_tag": "stack discovery"
}}

Rules:
- Start naturally like a human interviewer.
- Ask only one question.
- Do not assume the candidate's backend language or framework.
- Ask the candidate which languages, frameworks, databases, or tools they are actually comfortable with.
- Keep the intro concise and warm.
- Make the wording fresh for this session and avoid stock repeated phrasing.
- If this is a mock interview, you may lightly mention that a short behavioral section can appear later.
- Keep the first question discovery-focused, not HR-focused.
- Avoid markdown.
"""
    try:
        opening, provider = await _generate_json_with_fallback(
            prompt,
            ["gemini", "ollama"],
            0.35,
            STARTUP_AI_TIMEOUT_SECONDS,
        )
        normalized = {
            "assistant_intro": _normalize_text(opening.get("assistant_intro") or fallback["assistant_intro"]),
            "question": _normalize_text(opening.get("question") or fallback["question"]),
            "question_type": "discovery",
            "expected_points": _safe_list(opening.get("expected_points"))[:5] or fallback["expected_points"],
            "evaluation_focus": _safe_list(opening.get("evaluation_focus"))[:4] or fallback["evaluation_focus"],
            "topic_tag": _normalize_text(opening.get("topic_tag") or fallback["topic_tag"]),
        }
        if not normalized["question"]:
            raise ProviderError("Adaptive opening turn returned an empty question.")
        return normalized, provider
    except ProviderError:
        return fallback, "fallback"


def _register_scored_turn(state: Dict[str, Any], question: Dict[str, Any]) -> None:
    if not question.get("count_towards_score", True):
        return
    state["scored_questions_answered"] = int(state.get("scored_questions_answered", 0)) + 1
    topic = _normalize_text(question.get("topic_tag") or "")
    if topic:
        state["covered_topics"] = _merge_unique(state.get("covered_topics") or [], [topic])
    if question.get("question_type") == "behavioral":
        state["hr_questions_answered"] = int(state.get("hr_questions_answered", 0)) + 1
    else:
        state["technical_questions_answered"] = int(state.get("technical_questions_answered", 0)) + 1


def _record_turn_result(
    session: Dict[str, Any],
    question_index: int,
    question: Dict[str, Any],
    answer_text: str,
    evaluation: Dict[str, Any],
    provider_used: str,
    next_question: Optional[Dict[str, Any]] = None,
    is_complete: bool = False,
) -> Dict[str, Any]:
    result = {
        "question_id": question["id"],
        "question": question["question"],
        "question_type": question.get("question_type", "practical"),
        "answer": answer_text,
        "score": max(0, min(100, int(evaluation.get("score", 0)))),
        "feedback": _normalize_text(evaluation.get("feedback") or ""),
        "strengths": _safe_list(evaluation.get("strengths"))[:3],
        "gaps": _safe_list(evaluation.get("gaps"))[:3],
        "matched_points": _safe_list(evaluation.get("matched_points"))[:4],
        "missed_points": _safe_list(evaluation.get("missed_points"))[:4],
        "suggested_answer": _normalize_text(evaluation.get("suggested_answer") or ""),
        "assistant_reply": _normalize_text(evaluation.get("assistant_reply") or "Thank you. Let us continue."),
        "relevance": _normalize_text(evaluation.get("relevance") or ""),
        "correctness": _normalize_text(evaluation.get("correctness") or ""),
        "clarity": _normalize_text(evaluation.get("clarity") or ""),
        "technical_depth": _normalize_text(evaluation.get("technical_depth") or ""),
        "logical_validity": _normalize_text(evaluation.get("logical_validity") or ""),
        "real_world_applicability": _normalize_text(evaluation.get("real_world_applicability") or ""),
        "suggestions": _safe_list(evaluation.get("suggestions"))[:3],
        "provider": provider_used,
        "count_towards_score": bool(question.get("count_towards_score", True)),
    }

    answers = session.setdefault("answers", [])
    evaluations = session.setdefault("evaluations", [])
    if len(answers) > question_index:
        answers[question_index] = answer_text
    else:
        answers.append(answer_text)

    if len(evaluations) > question_index:
        evaluations[question_index] = result
    else:
        evaluations.append(result)

    return {
        **result,
        "question_index": question_index,
        "is_complete": is_complete,
        "next_question": next_question["question"] if next_question else None,
        "next_question_type": next_question.get("question_type") if next_question else None,
        "progress": {
            "current": question_index + 1,
            "total": _adaptive_total_questions(session),
        },
        "providers": dict(session.get("providers", {})),
        "question_outline": session.get("question_outline", []),
    }


def _scored_evaluations(session: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        item
        for item in session.get("evaluations", [])
        if item.get("count_towards_score", True)
    ]


def _is_session_completed(session: Dict[str, Any]) -> bool:
    return bool(session.get("completed_at")) and isinstance(session.get("summary"), dict)


def _session_total_questions(session: Dict[str, Any]) -> int:
    adaptive_state = session.get("meta", {}).get("adaptive_state") or {}
    return (
        _adaptive_total_questions(session)
        if adaptive_state.get("enabled")
        else len(session.get("questions", []))
    )


def _build_session_status_payload(session: Dict[str, Any]) -> Dict[str, Any]:
    questions = session.get("questions", []) or []
    evaluations = session.get("evaluations", []) or []
    answers = session.get("answers", []) or []
    current_index = min(len(evaluations), max(0, len(questions) - 1)) if questions else 0
    current_question = questions[current_index]["question"] if questions else ""
    current_question_type = questions[current_index].get("question_type", "practical") if questions else "practical"

    return {
        "session_id": session.get("session_id"),
        "created_at": session.get("created_at"),
        "completed_at": session.get("completed_at"),
        "ended_early": bool(session.get("ended_early", False)),
        "is_complete": _is_session_completed(session),
        "assistant_intro": session.get("assistant_intro", ""),
        "providers": dict(session.get("providers", {})),
        "meta": dict(session.get("meta", {})),
        "context": dict(session.get("context", {})),
        "question_outline": session.get("question_outline", []),
        "questions": questions,
        "answers": answers,
        "evaluations": evaluations,
        "current_index": current_index,
        "current_question": current_question,
        "current_question_type": current_question_type,
        "questions_answered": len(evaluations),
        "total_questions": _session_total_questions(session),
        "summary": session.get("summary"),
        "saved_report_user_ids": list(session.get("saved_report_user_ids", [])),
    }


async def _create_adaptive_interview_session(
    payload: Dict[str, Any],
    question_count: int,
    difficulty: str,
    role_blueprint: Dict[str, Any],
    blueprint_provider: str,
    variation: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    session_id = str(uuid.uuid4())
    variation = variation or _build_interview_variation(payload)
    adaptive_state = _build_adaptive_state(payload, role_blueprint, question_count)
    opening_turn, opening_provider = await _generate_adaptive_opening_turn(payload, role_blueprint, question_count, variation)
    provider_meta = {
        "generation_provider": opening_provider,
        "evaluation_provider": "",
        "analysis_provider": blueprint_provider,
    }

    session = {
        "session_id": session_id,
        "created_at": time.time(),
        "context": payload,
        "assistant_intro": opening_turn["assistant_intro"],
        "questions": [],
        "answers": [],
        "evaluations": [],
        "providers": provider_meta,
        "meta": {
            "difficulty": difficulty,
            "config_mode": payload.get("config_mode") or "question",
            "practice_type": payload.get("practice_type") or "practice",
            "interview_mode_time": payload.get("interview_mode_time"),
            "time_mode_interval": payload.get("time_mode_interval"),
            "selected_mode": payload.get("selected_mode"),
            "role_blueprint": role_blueprint,
            "adaptive_state": adaptive_state,
            "interview_variation": variation,
        },
        "question_outline": [],
        "saved_report_user_ids": [],
    }

    first_question = _append_session_question(
        session,
        {
            "question": opening_turn["question"],
            "question_type": opening_turn["question_type"],
            "expected_points": opening_turn["expected_points"],
            "evaluation_focus": opening_turn["evaluation_focus"],
            "count_towards_score": False,
            "topic_tag": opening_turn["topic_tag"],
        },
    )

    INTERVIEW_SESSIONS[session_id] = session
    _persist_session(session)
    return {
        "session_id": session_id,
        "assistant_intro": session["assistant_intro"],
        "total_questions": _adaptive_total_questions(session),
        "current_question": first_question["question"],
        "current_question_type": first_question["question_type"],
        "providers": provider_meta,
        "meta": session["meta"],
        "question_outline": session["question_outline"],
    }


async def _evaluate_adaptive_interview_answer(
    session: Dict[str, Any],
    question_index: int,
    question: Dict[str, Any],
    answer_text: str,
) -> Dict[str, Any]:
    state = session.get("meta", {}).get("adaptive_state") or {}

    if question.get("question_type") == "discovery":
        analysis, provider_used = await _analyze_discovery_answer(session, answer_text)
        _apply_discovery_analysis(state, analysis)
        session["providers"]["analysis_provider"] = provider_used

        acknowledgement = _normalize_text(
            analysis.get("acknowledgement")
            or "Thanks, that gives me a clear direction for the rest of the interview."
        )
        matched_points = _merge_unique(_safe_list(analysis.get("languages")), _safe_list(analysis.get("frameworks")))
        matched_points = _merge_unique(matched_points, _safe_list(analysis.get("databases")))
        matched_points = _merge_unique(matched_points, _safe_list(analysis.get("tools")))

        evaluation = {
            "score": 0,
            "feedback": f"{acknowledgement} This discovery step is only to tailor the interview, so it does not affect your score.",
            "strengths": [
                "You clarified your preferred stack for the interviewer.",
                "The interview can now adapt to your real background.",
            ],
            "gaps": (
                ["Your preferred stack still needs one quick clarification."]
                if analysis.get("needs_clarification")
                else []
            ),
            "matched_points": matched_points[:4],
            "missed_points": [],
            "suggested_answer": "Discovery turns are used only to tailor the interview and do not affect scoring.",
            "assistant_reply": acknowledgement,
            "relevance": "Relevant",
            "correctness": "Correct",
            "clarity": "Needs Improvement" if analysis.get("needs_clarification") else "Clear",
            "technical_depth": "Moderate" if matched_points else "Weak",
            "logical_validity": "Logical",
            "real_world_applicability": "Applicable" if matched_points else "Partially Applicable",
            "suggestions": (
                ["Mention the exact language or framework you want me to focus on first."]
                if analysis.get("needs_clarification")
                else ["Keep later answers tied to the stack you just selected."]
            ),
        }

        next_question = None
        if analysis.get("needs_clarification") and int(state.get("clarification_turns", 0)) < 1:
            state["clarification_turns"] = int(state.get("clarification_turns", 0)) + 1
            state["discovery_questions_asked"] = int(state.get("discovery_questions_asked", 1)) + 1
            next_question = _append_session_question(
                session,
                {
                    "question": _normalize_text(
                        analysis.get("clarification_question")
                        or "Which language or framework would you like me to focus on first?"
                    ),
                    "question_type": "discovery",
                    "expected_points": [
                        "clear preferred language or framework",
                        "preferred backend direction",
                        "real experience reference",
                    ],
                    "evaluation_focus": ["clarity", "specificity", "focus"],
                    "count_towards_score": False,
                    "topic_tag": "stack clarification",
                },
            )
        else:
            state["discovery_complete"] = True
            discovery_transition = {
                "score": 70 if matched_points else 55,
                "feedback": evaluation["feedback"],
                "gaps": evaluation["gaps"],
            }
            generated_question, provider = await _generate_adaptive_question(
                session,
                question,
                answer_text,
                discovery_transition,
            )
            session["providers"]["generation_provider"] = provider
            evaluation["assistant_reply"] = _normalize_text(
                generated_question.get("assistant_reply") or acknowledgement
            )
            next_question = _append_session_question(
                session,
                {
                    **generated_question,
                    "count_towards_score": True,
                },
            )

        return _record_turn_result(
            session,
            question_index,
            question,
            answer_text,
            evaluation,
            provider_used,
            next_question=next_question,
            is_complete=False,
        )

    context_summary = _context_summary(session["context"])
    expected_points = question.get("expected_points") or []
    evaluation_focus = question.get("evaluation_focus") or []
    prompt = f"""
You are evaluating a spoken interview answer using approximate semantic matching.

Interview context:
{context_summary}

Discovered candidate profile:
{_adaptive_state_summary(state)}

Question:
{question["question"]}

Expected answer points:
{json.dumps(expected_points, ensure_ascii=False)}

Evaluation focus:
{json.dumps(evaluation_focus, ensure_ascii=False)}

Candidate answer:
{answer_text}

Return valid JSON:
{{
  "score": 0,
  "feedback": "2 to 4 sentence evaluation",
  "relevance": "Relevant | Partially Relevant | Not Relevant",
  "correctness": "Correct | Partially Correct | Incorrect",
  "clarity": "Clear | Needs Improvement",
  "technical_depth": "Good | Moderate | Weak",
  "logical_validity": "Logical | Partially Logical | Illogical",
  "real_world_applicability": "Applicable | Partially Applicable | Not Applicable",
  "strengths": ["up to 3 concise strengths"],
  "gaps": ["up to 3 concise gaps"],
  "matched_points": ["expected points that were covered"],
  "missed_points": ["expected points that were not covered"],
  "suggestions": ["up to 3 concise ways to improve"],
  "suggested_answer": "short improved answer guidance",
  "assistant_reply": "one short warm spoken response before the next question"
}}

Rules:
- Evaluate approximately, not by exact wording.
- Reward relevant meaning even if phrasing is imperfect.
- Be practical and interview-focused.
- If the answer is off-topic, say so gently and redirect to the topic.
- If the answer is vague, ask for more specificity.
- If the answer is too short, ask the candidate to expand on it.
- If the answer contains incorrect assumptions, correct them briefly but politely.
- Do not use markdown.
"""

    provider_used = session["providers"].get("evaluation_provider", "fallback")
    try:
        evaluation, provider_used = await _generate_json_with_fallback(
            prompt,
            ["gemini", "ollama"],
            0.2,
            LIVE_AI_TIMEOUT_SECONDS,
        )
    except ProviderError:
        evaluation = _heuristic_evaluation(question, answer_text)
        provider_used = "fallback"

    session["providers"]["evaluation_provider"] = provider_used
    if provider_used != "fallback":
        heuristic_defaults = _heuristic_evaluation(question, answer_text)
        evaluation = _normalize_evaluation_payload(evaluation, heuristic_defaults)

    _register_scored_turn(state, question)
    if int(state.get("scored_questions_answered", 0)) >= int(state.get("scored_question_target", 0)):
        return _record_turn_result(
            session,
            question_index,
            question,
            answer_text,
            evaluation,
            provider_used,
            next_question=None,
            is_complete=True,
        )

    if provider_used == "fallback":
        generated_question, provider = (
            _fallback_adaptive_question(session, question, evaluation, _next_adaptive_track(state)),
            "fallback",
        )
    else:
        generated_question, provider = await _generate_adaptive_question(session, question, answer_text, evaluation)
    session["providers"]["generation_provider"] = provider
    evaluation["assistant_reply"] = _normalize_text(
        generated_question.get("assistant_reply") or evaluation.get("assistant_reply") or "Thanks. Let’s continue."
    )
    next_question = _append_session_question(
        session,
        {
            **generated_question,
            "count_towards_score": True,
        },
    )

    return _record_turn_result(
        session,
        question_index,
        question,
        answer_text,
        evaluation,
        provider_used,
        next_question=next_question,
        is_complete=False,
    )


async def create_interview_session(payload: Dict[str, Any]) -> Dict[str, Any]:
    question_count = _resolve_question_count(payload)
    payload = {**payload, "question_count": question_count}
    interview_variation = _build_interview_variation(payload)
    difficulty = _difficulty_from_experience(payload.get("experience") or "")
    target_subject = payload.get("primary_language") if payload.get("selected_mode") == "language" else payload.get("job_role")
    target_subject = target_subject or payload.get("job_role") or payload.get("primary_language") or "the selected interview focus"
    if _adaptive_role_interview_enabled(payload):
        role_blueprint, blueprint_provider = await _infer_role_blueprint(payload)
        return await _create_adaptive_interview_session(
            payload,
            question_count,
            difficulty,
            role_blueprint,
            blueprint_provider,
            interview_variation,
        )
    role_profile = _match_role_profile(payload.get("job_role") or "")
    role_blueprint, blueprint_provider = await _infer_role_blueprint(payload)
    role_profile_summary = ""
    if role_profile:
        role_profile_summary = (
            f"\nMatched role profile: {role_profile['label']}\n"
            f"Core fields to draw from: {', '.join(role_profile['core_fields'])}\n"
            f"Representative examples: {', '.join(role_profile['question_seeds'])}\n"
        )
    role_blueprint_summary = (
        f"\nInferred role blueprint label: {role_blueprint.get('role_label') or target_subject}\n"
        f"Inferred core areas: {', '.join(role_blueprint.get('core_areas') or [])}\n"
        f"Inferred tech stack: {', '.join(role_blueprint.get('tech_stack') or [])}\n"
        f"Inferred question focus: {', '.join(role_blueprint.get('question_focus') or [])}\n"
        f"Inferred language focus: {role_blueprint.get('language_focus') or 'None'}\n"
    )

    prompt = f"""
You are building a tailored AI interview plan.

Interview context:
{_context_summary(payload)}
{role_profile_summary}
{role_blueprint_summary}
Session variation:
{_variation_summary(interview_variation)}

Return valid JSON with this exact shape:
{{
  "assistant_intro": "short spoken welcome from the assistant",
  "questions": [
    {{
      "question": "interview question text",
      "question_type": "introduction | fundamental | conceptual | practical | scenario | behavioral",
      "expected_points": ["3 to 5 concise bullet-like points"],
      "evaluation_focus": ["3 concise criteria"]
    }}
  ]
}}

Rules:
- Generate exactly {question_count} questions.
- Questions must match the category, selected mode, target subject, experience level, configuration mode, and interview context.
- Treat the expected difficulty as {difficulty}.
- Target the interview around {target_subject}.
- Use the inferred role blueprint as the primary source for deciding tech stacks, concepts, frameworks, databases, tools, and question areas.
- Include a balanced progression of questions: introductory, conceptual/fundamental, practical, and scenario-based where relevant.
- For technical or language-oriented interviews, include fundamentals and conceptual understanding before harder applied questions.
- Use the selected options as direct focus areas when they are provided.
- If selected mode is role-based, ask role-oriented questions.
- If selected mode is language-based, ask language-oriented questions with practical coding or engineering emphasis where relevant.
- If a job role matches a known technical role profile, ask from that role's core tech stack and concepts only.
- If the job role is not a known profile, still generate role-specific questions using the role title, selected options, language, and inferred responsibilities.
- Do not ask HR questions, self-introduction questions, motivation questions, strengths/weaknesses questions, or behavioral questions.
- Prefer technical fundamentals, conceptual understanding, implementation questions, architecture questions, debugging questions, APIs, databases, networking, operating systems, cloud, testing, or security depending on the selected job role.
- If configuration mode is time mode, make the question set fit naturally within the selected time interval.
- If practice type is interview mode, keep questions realistic and progressively challenging.
- Keep expected_points practical enough to support approximate answer evaluation.
- Make this question set feel fresh for this session instead of repeating stock wording.
- Vary the angles across fundamentals, debugging, design, trade-offs, and practical examples when relevant.
- Avoid markdown.
"""

    provider_meta = {"generation_provider": "fallback", "evaluation_provider": "fallback", "analysis_provider": blueprint_provider}
    try:
        blueprint, provider = await _generate_json_with_fallback(
            prompt,
            ["gemini", "ollama"],
            0.3,
            STARTUP_AI_TIMEOUT_SECONDS,
        )
        provider_meta["generation_provider"] = provider
    except ProviderError:
        blueprint = _default_questions(payload, interview_variation)

    assistant_intro = _normalize_text(blueprint.get("assistant_intro") or "")
    if not assistant_intro:
        assistant_intro = "Hello. I’m your AI interview assistant. Let’s begin whenever you’re ready."

    questions: List[Dict[str, Any]] = []
    for idx, raw_question in enumerate(blueprint.get("questions") or []):
        question_text = _normalize_text(raw_question.get("question") or "")
        if not question_text:
            continue
        questions.append(
            {
                "id": idx + 1,
                "question": question_text,
                "question_type": _safe_question_type(raw_question.get("question_type")),
                "expected_points": _safe_list(raw_question.get("expected_points"))[:5],
                "evaluation_focus": _safe_list(raw_question.get("evaluation_focus"))[:4],
            }
        )

    questions = questions[:question_count]

    if not questions:
        fallback = _default_questions(payload, interview_variation)
        assistant_intro = fallback["assistant_intro"]
        questions = [
            {
                "id": idx + 1,
                "question": item["question"],
                "question_type": _safe_question_type(item.get("question_type")),
                "expected_points": item["expected_points"],
                "evaluation_focus": item["evaluation_focus"],
            }
            for idx, item in enumerate(fallback["questions"])
        ]

    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "created_at": time.time(),
        "context": payload,
        "assistant_intro": assistant_intro,
        "questions": questions,
        "answers": [],
        "evaluations": [],
        "providers": provider_meta,
        "meta": {
            "difficulty": difficulty,
            "config_mode": payload.get("config_mode") or "question",
            "practice_type": payload.get("practice_type") or "practice",
            "interview_mode_time": payload.get("interview_mode_time"),
            "time_mode_interval": payload.get("time_mode_interval"),
            "selected_mode": payload.get("selected_mode"),
            "role_blueprint": role_blueprint,
            "interview_variation": interview_variation,
        },
        "question_outline": [
            {
                "id": question["id"],
                "question": question["question"],
                "question_type": question.get("question_type", "practical"),
            }
            for question in questions
        ],
        "saved_report_user_ids": [],
    }
    INTERVIEW_SESSIONS[session_id] = session
    _persist_session(session)

    return {
        "session_id": session_id,
        "assistant_intro": assistant_intro,
        "total_questions": len(questions),
        "current_question": questions[0]["question"],
        "providers": provider_meta,
        "meta": session["meta"],
        "question_outline": session["question_outline"],
    }


async def evaluate_interview_answer(
    session_id: str,
    question_index: int,
    answer: str
) -> Dict[str, Any]:
    session = _get_session(session_id)
    if not session:
        raise ProviderError("Interview session not found.")
    if _is_session_completed(session):
        raise ProviderError("Interview session is already complete.")

    questions = session["questions"]
    if question_index < 0 or question_index >= len(questions):
        raise ProviderError("Invalid question index.")

    question = questions[question_index]
    answer_text = _normalize_text(answer)
    if session.get("meta", {}).get("adaptive_state", {}).get("enabled"):
        result = await _evaluate_adaptive_interview_answer(
            session,
            question_index,
            question,
            answer_text,
        )
        _persist_session(session)
        return result

    context_summary = _context_summary(session["context"])
    expected_points = question.get("expected_points") or []
    evaluation_focus = question.get("evaluation_focus") or []

    prompt = f"""
You are evaluating a spoken interview answer using approximate semantic matching.

Interview context:
{context_summary}

Question:
{question["question"]}

Expected answer points:
{json.dumps(expected_points, ensure_ascii=False)}

Evaluation focus:
{json.dumps(evaluation_focus, ensure_ascii=False)}

Candidate answer:
{answer_text}

Return valid JSON:
{{
  "score": 0,
  "feedback": "2 to 4 sentence evaluation",
  "relevance": "Relevant | Partially Relevant | Not Relevant",
  "correctness": "Correct | Partially Correct | Incorrect",
  "clarity": "Clear | Needs Improvement",
  "technical_depth": "Good | Moderate | Weak",
  "logical_validity": "Logical | Partially Logical | Illogical",
  "real_world_applicability": "Applicable | Partially Applicable | Not Applicable",
  "strengths": ["up to 3 concise strengths"],
  "gaps": ["up to 3 concise gaps"],
  "matched_points": ["expected points that were covered"],
  "missed_points": ["expected points that were not covered"],
  "suggestions": ["up to 3 concise ways to improve"],
  "suggested_answer": "short improved answer guidance",
  "assistant_reply": "one short spoken response before the next question"
}}

Rules:
- Evaluate approximately, not by exact wording.
- Reward relevant meaning even if phrasing is imperfect.
- Be practical and interview-focused.
- If the answer is off-topic, say so gently and redirect to the topic.
- If the answer is vague, ask for more specificity.
- If the answer is too short, ask the candidate to expand on it.
- If the answer contains incorrect assumptions, correct them briefly but politely.
- Do not use markdown.
"""

    provider_used = session["providers"].get("evaluation_provider", "fallback")
    try:
        evaluation, provider_used = await _generate_json_with_fallback(
            prompt,
            ["gemini", "ollama"],
            0.2,
            LIVE_AI_TIMEOUT_SECONDS,
        )
    except ProviderError:
        evaluation = _heuristic_evaluation(question, answer_text)
        provider_used = "fallback"

    session["providers"]["evaluation_provider"] = provider_used

    if provider_used != "fallback":
        heuristic_defaults = _heuristic_evaluation(question, answer_text)
        evaluation = _normalize_evaluation_payload(evaluation, heuristic_defaults)

    result = {
        "question_id": question["id"],
        "question": question["question"],
        "question_type": question.get("question_type", "practical"),
        "answer": answer_text,
        "score": max(0, min(100, int(evaluation["score"]))),
        "feedback": evaluation["feedback"],
        "strengths": evaluation["strengths"][:3],
        "gaps": evaluation["gaps"][:3],
        "matched_points": evaluation["matched_points"][:4],
        "missed_points": evaluation["missed_points"][:4],
        "suggested_answer": evaluation["suggested_answer"],
        "assistant_reply": evaluation["assistant_reply"],
        "relevance": evaluation["relevance"],
        "correctness": evaluation["correctness"],
        "clarity": evaluation["clarity"],
        "technical_depth": evaluation["technical_depth"],
        "logical_validity": evaluation["logical_validity"],
        "real_world_applicability": evaluation["real_world_applicability"],
        "suggestions": evaluation["suggestions"][:3],
        "provider": provider_used,
    }

    answers = session["answers"]
    evaluations = session["evaluations"]
    if len(answers) > question_index:
        answers[question_index] = answer_text
    else:
        answers.append(answer_text)

    if len(evaluations) > question_index:
        evaluations[question_index] = result
    else:
        evaluations.append(result)
    _persist_session(session)

    is_complete = question_index >= len(questions) - 1
    next_question = None if is_complete else questions[question_index + 1]["question"]
    next_question_type = None if is_complete else questions[question_index + 1].get("question_type", "practical")

    return {
        **result,
        "question_index": question_index,
        "is_complete": is_complete,
        "next_question": next_question,
        "next_question_type": next_question_type,
        "providers": dict(session.get("providers", {})),
        "progress": {
            "current": question_index + 1,
            "total": len(questions),
        },
        "question_outline": session.get("question_outline", []),
    }


def _fallback_summary(session: Dict[str, Any]) -> Dict[str, Any]:
    evaluations = _scored_evaluations(session)
    if evaluations:
        average_score = int(round(sum(item["score"] for item in evaluations) / len(evaluations)))
    else:
        average_score = 0

    strong_answers = [
        item["question"]
        for item in evaluations
        if item["score"] >= 75
    ][:3]
    weak_answers = [
        item["question"]
        for item in evaluations
        if item["score"] < 60
    ][:3]

    return {
        "overall_score": average_score,
        "summary": (
            "You completed the interview. Focus on clearer structure, stronger examples, "
            "and tighter role alignment to improve further."
        ),
        "top_strengths": [
            "Completed the interview flow with spoken responses.",
            "Covered several expected points across the session.",
            "Showed willingness to explain experience verbally.",
        ],
        "improvement_areas": [
            "Make answers more specific and evidence-based.",
            "Use a clearer situation-action-result structure.",
            "Tie each answer back to the target role or language.",
        ],
        "strongest_questions": strong_answers,
        "needs_work_questions": weak_answers,
    }


async def complete_interview_session(session_id: str, ended_early: bool = False) -> Dict[str, Any]:
    session = _get_session(session_id)
    if not session:
        raise ProviderError("Interview session not found.")

    if _is_session_completed(session):
        cached_summary = dict(session.get("summary") or {})
        existing_ended_early = bool(session.get("ended_early", False))
        resolved_ended_early = bool(ended_early or existing_ended_early)
        session["ended_early"] = resolved_ended_early
        _persist_session(session)
        adaptive_state = session.get("meta", {}).get("adaptive_state") or {}
        evaluations = _scored_evaluations(session)
        return {
            **cached_summary,
            "session_id": session_id,
            "ended_early": resolved_ended_early,
            "questions_answered": len(session.get("evaluations", [])),
            "total_questions": _session_total_questions(session),
            "questions": [
                {
                    "question": item["question"],
                    "question_type": item.get("question_type", "practical"),
                    "score": item["score"],
                }
                for item in evaluations
            ],
            "providers": session.get("providers", {}),
        }

    evaluations = _scored_evaluations(session)
    context_summary = _context_summary(session.get("context", {}))
    adaptive_state = session.get("meta", {}).get("adaptive_state") or {}
    adaptive_summary = ""
    if adaptive_state.get("enabled"):
        adaptive_summary = f"\nDiscovered candidate profile:\n{_adaptive_state_summary(adaptive_state)}\n"
    prompt = f"""
You are summarizing an AI interview session.

Interview context:
{context_summary}
{adaptive_summary}

Per-question evaluations:
{json.dumps(evaluations, ensure_ascii=False)}

Return valid JSON:
{{
  "overall_score": 0,
  "summary": "3 to 5 sentence overall interview summary",
  "top_strengths": ["up to 3 concise strengths"],
  "improvement_areas": ["up to 3 concise areas to improve"],
  "strongest_questions": ["question texts with best performance"],
  "needs_work_questions": ["question texts with lowest performance"]
}}
"""

    try:
        summary, provider = await _generate_json_with_fallback(
            prompt,
            ["gemini", "ollama"],
            0.2,
            LIVE_AI_TIMEOUT_SECONDS,
        )
    except ProviderError:
        summary = _fallback_summary(session)
        provider = "fallback"

    if provider != "fallback":
        fallback = _fallback_summary(session)
        summary = {
            "overall_score": int(summary.get("overall_score", fallback["overall_score"])),
            "summary": _normalize_text(summary.get("summary") or fallback["summary"]),
            "top_strengths": _safe_list(summary.get("top_strengths")) or fallback["top_strengths"],
            "improvement_areas": _safe_list(summary.get("improvement_areas")) or fallback["improvement_areas"],
            "strongest_questions": _safe_list(summary.get("strongest_questions")) or fallback["strongest_questions"],
            "needs_work_questions": _safe_list(summary.get("needs_work_questions")) or fallback["needs_work_questions"],
        }

    session["summary"] = summary
    session["ended_early"] = bool(ended_early)
    session["completed_at"] = time.time()
    session["providers"]["summary_provider"] = provider
    _persist_session(session)
    return {
        **summary,
        "session_id": session_id,
        "ended_early": bool(ended_early),
        "questions_answered": len(session.get("evaluations", [])),
        "total_questions": _session_total_questions(session),
        "questions": [
            {
                "question": item["question"],
                "question_type": item.get("question_type", "practical"),
                "score": item["score"],
            }
            for item in evaluations
        ],
        "providers": session["providers"],
    }


def get_session_payload(session_id: str) -> Optional[Dict[str, Any]]:
    return _get_session(session_id)


def get_session_status(session_id: str) -> Optional[Dict[str, Any]]:
    session = _get_session(session_id)
    if not session:
        return None
    return _build_session_status_payload(session)


def mark_session_report_saved(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    session = _get_session(session_id)
    normalized_user_id = _normalize_text(user_id)
    if not session or not normalized_user_id:
        return session

    saved_user_ids = session.setdefault("saved_report_user_ids", [])
    if normalized_user_id not in saved_user_ids:
        saved_user_ids.append(normalized_user_id)
        _persist_session(session)
    return session
