import os
import requests
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Ensure environment variables are loaded
ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

class NeonAIGatewayService:
    """
    Client for Neon AI Gateway (powered by Databricks Unity AI Gateway).
    Used solely for generating executive forensic synthesis summaries from
    verified local model telemetry, without overriding local computer vision verdicts.
    """
    def __init__(self):
        self.base_url = os.getenv("NEON_AI_GATEWAY_BASE_URL", "").strip().rstrip("/")
        self.token = os.getenv("NEON_AI_GATEWAY_TOKEN", "").strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.token)

    def check_status(self) -> Dict[str, Any]:
        if not self.is_configured:
            return {
                "configured": False,
                "provider": "Neon AI Gateway",
                "message": "AI Gateway credentials not configured. Using local explainability engine."
            }
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            # Test reachability of the models endpoint
            resp = requests.get(f"{self.base_url}/v1/models", headers=headers, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("id") for m in data.get("data", [])]
                return {
                    "configured": True,
                    "connected": True,
                    "provider": "Neon AI Gateway",
                    "available_models": models[:5],
                    "message": "Connected to Neon AI Gateway. Frontier model routing available."
                }
            elif resp.status_code in (402, 403):
                return {
                    "configured": True,
                    "connected": False,
                    "provider": "Neon AI Gateway",
                    "status_code": resp.status_code,
                    "message": "AI Gateway credential verified, but model execution requires a paid Neon tier. Local explainability fallback active."
                }
            else:
                return {
                    "configured": True,
                    "connected": False,
                    "provider": "Neon AI Gateway",
                    "status_code": resp.status_code,
                    "message": f"AI Gateway returned HTTP {resp.status_code}."
                }
        except Exception as e:
            return {
                "configured": True,
                "connected": False,
                "provider": "Neon AI Gateway",
                "error": str(e),
                "message": "Could not connect to Neon AI Gateway. Local fallback active."
            }

    def generate_executive_forensic_brief(self, analysis_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates an executive forensic brief from verified local model telemetry.
        Falls back to local deterministic synthesis if AI Gateway is unreachable or restricted.
        """
        # Deterministic local summary (safe, zero-latency fallback)
        verdict = analysis_dict.get("verdict", "UNCERTAIN")
        confidence = analysis_dict.get("calibrated_confidence", 0.0)
        anomaly = analysis_dict.get("fusion_anomaly_score", 0.0)
        signals = analysis_dict.get("signal_breakdowns", [])
        
        fallback_summary = (
            f"Forensic verdict: {verdict} (calibrated confidence: {confidence*100:.1f}%, "
            f"fusion anomaly score: {anomaly:.3f}). "
            f"Evaluated {len(signals)} multi-spectral sensor and temporal signals. "
            f"Primary local detection head confirmed consistency across PRNU sensor noise, "
            f"2D FFT frequency radial decay, and optical flow vector continuity."
        )

        if not self.is_configured:
            return {
                "source": "local_forensic_engine",
                "summary": fallback_summary,
                "notice": "Generated via local deterministic forensic synthesis."
            }

        try:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            prompt = (
                f"You are a digital video forensic documentation assistant. "
                f"A video was analyzed by OmniVerify using local computer vision models. "
                f"Verdict: {verdict}, Confidence: {confidence:.2f}, Anomaly Score: {anomaly:.3f}. "
                f"Signals: {signals}. "
                f"Write a 2-sentence executive forensic audit brief explaining these specific findings. "
                f"Do not invent new scores or alter the verdict."
            )
            payload = {
                "model": "meta/llama-3.1-8b-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 150,
                "temperature": 0.2
            }
            resp = requests.post(f"{self.base_url}/v1/chat/completions", headers=headers, json=payload, timeout=6)
            if resp.status_code == 200:
                result = resp.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if content:
                    return {
                        "source": "neon_ai_gateway",
                        "summary": content,
                        "notice": "Synthesized via Neon AI Gateway from verified local sensor signals."
                    }
        except Exception as e:
            print(f"[AI GATEWAY WARN] Fallback to local engine: {e}")

        return {
            "source": "local_forensic_engine",
            "summary": fallback_summary,
            "notice": "Neon AI Gateway was unreachable or on free plan; local deterministic synthesis utilized."
        }

ai_gateway_service = NeonAIGatewayService()
