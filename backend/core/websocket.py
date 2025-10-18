# core/websocket.py - WebSocket Connection Manager
"""
Управление WebSocket соединениями.
Thread-safe broadcast и connection management.
"""
import asyncio
import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger("websocket")


class ConnectionManager:
    """
    Менеджер WebSocket соединений с thread-safety.
    Поддерживает broadcast и selective messaging.
    """
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """Регистрация нового соединения"""
        await websocket.accept()
        
        async with self._lock:
            self.active_connections.append(websocket)
        
        logger.info(f"📡 WebSocket connected. Total: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        """Отключение соединения"""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        
        logger.info(f"📡 WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Отправка сообщения конкретному клиенту"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
            await self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        """Broadcast сообщения всем подключенным клиентам"""
        disconnected = []
        
        async with self._lock:
            for ws in list(self.active_connections):
                try:
                    await ws.send_text(message)
                except Exception as e:
                    logger.error(f"Broadcast error: {e}")
                    disconnected.append(ws)
        
        # Очистка отключенных
        for ws in disconnected:
            await self.disconnect(ws)
    
    def get_connection_count(self) -> int:
        """Количество активных соединений"""
        return len(self.active_connections)


# Singleton instance
manager = ConnectionManager()