import asyncpg  # type: ignore
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger('gfcbot.database')


class Database:
    """Database interface for GFC Bot using asyncpg."""

    async def upsert_user(self, user_id: int, username: str):
        """
        Upsert Discord user ID and username into users table.
        """
        await self.connect()
        async with self.pool.acquire() as conn:  # type: ignore
            await conn.execute(
                """
                INSERT INTO users (id, username, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, updated_at = NOW()
                """,
                user_id, username
            )

    async def upsert_channel(self, channel_id: int, channel_name: str):
        """
        Upsert Discord channel ID and name into channels table.
        """
        await self.connect()
        async with self.pool.acquire() as conn:  # type: ignore
            await conn.execute(
                """
                INSERT INTO channels (id, name, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
                """,
                channel_id, channel_name
            )

    def __init__(self, database_url: str):
        """
        Initialize database connection.
        
        Args:
            database_url: PostgreSQL connection string (from Supabase)
        """
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is not set!")
        self.connection_string = database_url
        # Log connection details (without password)
        if "://" in database_url:
            parts = database_url.split("@")
            if len(parts) > 1:
                logger.info(f"Initializing database connection to: {parts[-1]}")
            else:
                logger.info("Initializing database connection")
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Create database connection pool."""
        if not self.pool:
            try:
                logger.info(f"Attempting to connect to database with connection string...")
                # Create pool with minimal caching to avoid schema caching issues
                self.pool = await asyncpg.create_pool(
                    self.connection_string,
                    statement_cache_size=0,  # Disable statement cache
                    max_inactive_connection_lifetime=60,  # Recycle connections every minute
                    max_cached_statement_lifetime=0,  # Don't cache statements
                    max_cacheable_statement_size=0  # Don't cache any statements
                )
                logger.info('Database connection pool created successfully')
            except Exception as e:
                logger.error(f"Failed to create database connection pool: {e}")
                raise
    
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
        async with self.pool.acquire() as conn:  # type: ignore
            await conn.execute(
                """
                INSERT INTO pruning_config (server_id, enabled, max_days)
                VALUES ($1, true, 90)
                ON CONFLICT (server_id) DO NOTHING
                """,
                server_id
            )
    
    async def get_embed_configs(self, server_id: int, feature_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all active embed configurations for a server, optionally scoped to a feature, ordered by priority.
        """
        await self.connect()
        async with self.pool.acquire() as conn:  # type: ignore
            if feature_id:
                rows = await conn.fetch(
                    """
                    SELECT id, prefix, priority, active, embed_type, feature_id
                    FROM embed_configs
                    WHERE server_id = $1 AND feature_id = $2 AND active = true
                    ORDER BY priority ASC
                    """,
                    server_id,
                    feature_id
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, prefix, priority, active, embed_type, feature_id
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
        validation_error: Optional[str],
        webhook_message_id: Optional[int] = None
    ):
        """
        Insert message transformation data.
        
        Args:
            message_id: Discord message ID (original message)
            channel_id: Discord channel ID
            server_id: Discord server ID
            user_id: Discord user ID
            original_url: Original Instagram URL
            embedded_url: Embedded URL if successful
            embed_prefix_used: Prefix that worked
            validation_status: 'success', 'failed', or 'timeout'
            validation_error: Error message if failed
            webhook_message_id: ID of webhook message if reposted
        """
        await self.connect()
        async with self.pool.acquire() as conn:  # type: ignore
            await conn.execute(
                """
                INSERT INTO message_data (
                    message_id, channel_id, server_id, user_id,
                    original_url, embedded_url, embed_prefix_used,
                    validation_status, validation_error, checked_at, webhook_message_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (message_id) DO NOTHING
                """,
                message_id, channel_id, server_id, user_id,
                original_url, embedded_url, embed_prefix_used,
                validation_status, validation_error, datetime.utcnow(), webhook_message_id
            )
    
    async def get_original_user_from_webhook(self, webhook_message_id: int) -> Optional[int]:
        """
        Get the original user ID from a webhook message ID.
        
        Args:
            webhook_message_id: ID of the webhook message
            
        Returns:
            Original user ID if found, None otherwise
        """
        await self.connect()
        async with self.pool.acquire() as conn:  # type: ignore
            row = await conn.fetchrow(
                """
                SELECT user_id FROM message_data 
                WHERE webhook_message_id = $1
                """,
                webhook_message_id
            )
            return row['user_id'] if row else None
    
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
        async with self.pool.acquire() as conn:  # type: ignore
            await conn.execute(
                """
                INSERT INTO audit_logs (server_id, user_id, action, target_type, target_id, details)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                server_id, user_id, action, target_type, target_id, details
            )

    async def get_bot_setting(self, key: str) -> Optional[str]:
        """
        Get a bot setting value.
        
        Args:
            key: Setting key (e.g., 'bot_status')
            
        Returns:
            Setting value or None if not found
        """
        await self.connect()
        async with self.pool.acquire() as conn:  # type: ignore
            row = await conn.fetchrow(
                "SELECT value FROM bot_settings WHERE key = $1",
                key
            )
            return row['value'] if row else None

    async def set_bot_setting(self, key: str, value: str):
        """
        Set a bot setting value.
        
        Args:
            key: Setting key (e.g., 'bot_status')
            value: Setting value
        """
        await self.connect()
        async with self.pool.acquire() as conn:  # type: ignore
            await conn.execute(
                """
                INSERT INTO bot_settings (key, value, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                """,
                key, value
            )
