import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from utils.database import Database

logger = logging.getLogger('gfcbot.feature_manager')


class FeatureManager:
    """Manages feature permissions with caching support."""
    
    def __init__(self, db: Database, cache_enabled: bool = False):
        """
        Initialize feature manager.
        
        Args:
            db: Database instance
            cache_enabled: Whether to enable permission caching
        """
        self.db = db
        self.cache_enabled = cache_enabled
        self.cache: Dict[str, Any] = {}
        self.cache_ttl = timedelta(minutes=15)
        self.last_cache_update: Optional[datetime] = None
    
    async def check_permission(
        self,
        server_id: int,
        role_ids: List[int],
        feature_name: str,
        action: str
    ) -> bool:
        """
        Check if any of the provided roles has permission for a feature action.
        
        Implements permission inheritance: delete > manage > read
        
        Args:
            server_id: Discord server ID
            role_ids: List of role IDs to check
            feature_name: Name of the feature
            action: Action to check ('read', 'manage', or 'delete')
            
        Returns:
            True if permission granted, False otherwise
        """
        cache_key = f"{server_id}:{','.join(map(str, role_ids))}:{feature_name}:{action}"
        
        # Check cache if enabled
        if self.cache_enabled:
            if self._is_cache_valid() and cache_key in self.cache:
                logger.debug(f'Cache hit for permission check: {cache_key}')
                return self.cache[cache_key]
        
        # Query database
        await self.db.connect()
        async with self.db.pool.acquire() as conn:  # type: ignore
            result = await conn.fetchval(
                """
                SELECT check_permission($1, $2, $3, $4)
                """,
                server_id,
                role_ids,
                feature_name,
                action
            )
        
        # Store in cache if enabled
        if self.cache_enabled:
            self.cache[cache_key] = result
            if not self.last_cache_update:
                self.last_cache_update = datetime.utcnow()
        
        return result if result else False
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid based on TTL."""
        if not self.last_cache_update:
            return False
        return datetime.utcnow() - self.last_cache_update < self.cache_ttl
    
    def invalidate_cache(self):
        """Clear the permission cache."""
        self.cache.clear()
        self.last_cache_update = None
        logger.info('Permission cache invalidated')
    
    async def get_feature_id(self, feature_name: str) -> Optional[str]:
        """
        Get feature ID by name.
        
        Args:
            feature_name: Name of the feature
            
        Returns:
            Feature UUID or None if not found
        """
        await self.db.connect()
        async with self.db.pool.acquire() as conn:  # type: ignore
            result = await conn.fetchrow(
                """
                SELECT id FROM features WHERE name = $1 AND active = true
                """,
                feature_name
            )
            return str(result['id']) if result else None
    
    async def set_role_permissions(
        self,
        server_id: int,
        role_id: int,
        feature_name: str,
        read: bool = False,
        manage: bool = False,
        delete: bool = False
    ):
        """
        Set permissions for a role on a feature.
        
        Args:
            server_id: Discord server ID
            role_id: Discord role ID
            feature_name: Name of the feature
            read: Grant read permission
            manage: Grant manage permission
            delete: Grant delete permission
        """
        feature_id = await self.get_feature_id(feature_name)
        if not feature_id:
            raise ValueError(f'Feature not found: {feature_name}')
        
        actions = {
            'read': read,
            'manage': manage,
            'delete': delete
        }
        
        await self.db.connect()
        async with self.db.pool.acquire() as conn:  # type: ignore
            await conn.execute(
                """
                INSERT INTO feature_permissions (server_id, role_id, feature_id, actions)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (server_id, role_id, feature_id)
                DO UPDATE SET actions = $4, updated_at = NOW()
                """,
                server_id,
                role_id,
                feature_id,
                actions
            )
        
        # Invalidate cache after permission change
        if self.cache_enabled:
            self.invalidate_cache()
        
        logger.info(f'Updated permissions for role {role_id} on feature {feature_name}')
