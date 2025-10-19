# services/tts_service.py
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

class TTSService:
    """Text-to-Speech service using OpenAI-compatible API"""
    
    def __init__(self, url: str, api_key: str, mock_mode: bool = False):
        self.url = url.rstrip('/')
        self.api_key = api_key
        self.mock_mode = mock_mode
        self.timeout = 30.0
        
    async def text_to_speech(
        self, 
        text: str, 
        voice: str = "alloy",
        model: str = "tts-1",
        speed: float = 1.0
    ) -> bytes:
        """Convert text to speech audio"""
        if self.mock_mode:
            logger.info("🎭 MOCK: TTS request")
            return b"mock_audio_data"
            
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.url}/v1/audio/speech",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "input": text,
                        "voice": voice,
                        "speed": speed
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"✅ TTS successful, audio size: {len(response.content)} bytes")
                    return response.content
                else:
                    logger.error(f"❌ TTS failed: {response.status_code}")
                    raise Exception(f"TTS API error: {response.status_code}")
                    
        except Exception as e:
            logger.exception(f"💥 TTS error: {e}")
            raise