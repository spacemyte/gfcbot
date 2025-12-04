import asyncpg
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger('gfcbot.database')


class Database:
    """Database interface for GFC Bot using asyncpg."""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Initialize database connection.
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
        """
        # Extract database connection info from Supabase URL
        # Supabase URL format: https://<project-ref>.supabase.co
        project_ref = supabase_url.replace('https://', '').replace('.supabase.co', '')
        
        # Construct PostgreSQL connection string
        self.connection_string = (
            f"postgresql://postgres:{supabase_key}@"
            f"db.{project_ref}.supabase.co:5432/postgres"
        )
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Create database connection pool."""
        if not self.pool:
            self.pool = await asyncpg.create_pool(self.connection_string)
            logger.info('Database connection pool created')
    
    async def close(self):
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info('Database connection pool closed')
    
    async def ensure_pruning_config(self, server_id: int):
        """
        Ensure pruning config exists for a server.
        
        Args:
            server_id: Discord server ID
        """
        await self.connect()
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO pruning_config (server_id, enabled, max_days)
                VALUES ($1, true, 90)
                ON CONFLICT (server_id) DO NOTHING
                """,
                server_id
            )
    
    async def get_embed_configs(self, server_id: int) -> List[Dict[str, Any]]:
        """
        Get all active embed configurations for a server, ordered by priority.
        
        Args:
            server_id: Discord server ID
            
        Returns:
            List of embed config dictionaries
        """
        await self.connect()
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, prefix, priority, active
                FROM embed_configs
                WHERE server_id = $1 AND active = true
                ORDER BY priority ASC
                """,
                server_id
            )
            return [dict(row) for row in rows]
    
    async def insert_message_data(
        self,
        message_id: int,
        channel_id: int,
        server_id: int,
        user_id: int,
        original_url: str,
        embedded_url: Optional[str],
        embed_prefix_used: Optional[str],
        validation_status: str,
        validation_error: Optional[str]
    ):
        """
        Insert message transformation data.
        
        Args:
            message_id: Discord message ID
            channel_id: Discord channel ID
            server_id: Discord server ID
            user_id: Discord user ID
            original_url: Original Instagram URL
            embedded_url: Embedded URL if successful
            embed_prefix_used: Prefix that worked
            validation_status: 'success', 'failed', or 'timeout'
            validation_error: Error message if failed
        """
        await self.connect()
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO message_data (
                    message_id, channel_id, server_id, user_id,
                    original_url, embedded_url, embed_prefix_used,
                    validation_status, validation_error, checked_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (message_id) DO NOTHING
                """,
                message_id, channel_id, server_id, user_id,
                original_url, embedded_url, embed_prefix_used,
                validation_status, validation_error, datetime.utcnow()
            )
    
    async def insert_audit_log(
        self,
        server_id: int,
        user_id: int,
        action: str,
        target_type: str,
        target_id: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Insert audit log entry.
        
        Args:
            server_id: Discord server ID
            user_id: Discord user ID
            action: Action performed
            target_type: Type of target (e.g., 'embed_config', 'permission')
            target_id: ID of target
            details: Additional details as JSON
        """
        await self.connect()
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO audit_logs (server_id, user_id, action, target_type, target_id, details)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                server_id, user_id, action, target_type, target_id, details
            )
