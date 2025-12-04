import discord
from discord.ext import commands
import re
import aiohttp
import asyncio
import logging
import os
from typing import Optional, List, Dict
from datetime import datetime

logger = logging.getLogger('gfcbot.instagram_embed')

# Instagram URL pattern - matches both regular and prefixed Instagram URLs
INSTAGRAM_URL_PATTERN = re.compile(
    r'https?://(?:www\.)?(?:[a-z]{2,5})?instagram\.com/(?:p|reel|reels|tv)/([a-zA-Z0-9_-]+)/?',
    re.IGNORECASE
)


class InstagramEmbed(commands.Cog):
    """Cog for Instagram URL embedding functionality."""
    
    def __init__(self, bot):
        self.bot = bot
        self.validation_queue = asyncio.Queue()
        self.session: Optional[aiohttp.ClientSession] = None
        self.config_cache: Dict[int, Dict] = {}  # guild_id -> config
        self.api_url = os.getenv('API_URL', 'http://localhost:3001')  # Set your backend API URL here

    async def get_instagram_embed_config(self, guild_id: int) -> Dict:
        if not self.session:
            self.session = aiohttp.ClientSession()
        # Cache for 60 seconds per guild (faster config updates)
        now = datetime.utcnow().timestamp()
        cache_entry = self.config_cache.get(guild_id)
        if cache_entry and (now - cache_entry.get('fetched_at', 0) < 60):
            return cache_entry['config']
        # Fetch from bot-accessible endpoint (no auth required)
        url = f"{self.api_url}/api/bot/instagram-embed-config/{guild_id}"
        try:
            async with self.session.get(url, timeout=5) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.config_cache[guild_id] = {'config': data, 'fetched_at': now}
                    return data
                else:
                    logger.warning(f"Failed to fetch embed config for guild {guild_id}: HTTP {resp.status}")
        except Exception as e:
            logger.error(f"Error fetching embed config for guild {guild_id}: {e}")
        # Fallback defaults
        return {
            'webhook_repost_enabled': False,
            'pruning_enabled': True,
            'pruning_max_days': 90
        }
        
    async def cog_load(self):
        """Initialize aiohttp session when cog loads."""
        self.session = aiohttp.ClientSession()
        # Start validation worker
        self.bot.loop.create_task(self._validation_worker())
        logger.info('Instagram embed cog loaded')
    
    def clear_config_cache(self, guild_id: Optional[int] = None):
        """Clear the config cache for a guild or all guilds."""
        if guild_id:
            if guild_id in self.config_cache:
                del self.config_cache[guild_id]
                logger.info(f'Cleared Instagram embed config cache for guild {guild_id}')
        else:
            self.config_cache.clear()
            logger.info('Cleared Instagram embed config cache for all guilds')
    
    async def cog_unload(self):
        """Clean up aiohttp session when cog unloads."""
        if self.session:
            await self.session.close()
        logger.info('Instagram embed cog unloaded')
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """
        Listen for messages containing Instagram URLs.
        React with 👍 if the message already uses a configured prefix.
        """
        # Ignore bot messages
        if message.author.bot:
            return
        # Ignore DMs
        if not message.guild:
            return
        # Check for Instagram URLs
        urls = INSTAGRAM_URL_PATTERN.findall(message.content)
        if not urls:
            return
        # Get original URL from message
        match = INSTAGRAM_URL_PATTERN.search(message.content)
        if not match:
            return
        original_url = match.group(0)
        
        # Get all embed configs for this server
        embed_configs = await self.bot.db.get_embed_configs(message.guild.id)
        prefixes = [c['prefix'] for c in embed_configs] if embed_configs else []
        
        # Check if URL already uses a configured prefix
        already_embedded = False
        for prefix in prefixes:
            if f'{prefix}instagram.com' in original_url.lower():
                already_embedded = True
                break
        
        if already_embedded:
            try:
                await message.add_reaction('👍')
                logger.info(f'Reacted with thumbs up to already-embedded URL: {original_url}')
            except Exception as e:
                logger.warning(f'Failed to react to message: {e}')
            return
        # Add to validation queue
        await self.validation_queue.put({
            'message': message,
            'original_url': original_url,
            'post_id': urls[0]
        })
    
    async def _validation_worker(self):
        """Background worker to process URL validation queue with delays."""
        while True:
            try:
                # Get item from queue
                item = await self.validation_queue.get()
                
                # Process the URL
                await self._process_instagram_url(
                    message=item['message'],
                    original_url=item['original_url'],
                    post_id=item['post_id']
                )
                
                # Delay between validations (1-2 seconds)
                await asyncio.sleep(1.5)
                
                self.validation_queue.task_done()
            except Exception as e:
                logger.error(f'Error in validation worker: {e}', exc_info=True)
    
    async def _process_instagram_url(
        self,
        message: discord.Message,
        original_url: str,
        post_id: str
    ):
        """
        Process Instagram URL with priority-based fallback.
        
        Args:
            message: Discord message containing the URL
            original_url: Original Instagram URL
            post_id: Instagram post ID
        """
        # Get per-server Instagram embed config
        guild = message.guild
        if not guild:
            logger.warning('Message has no guild (DM or system message); skipping embed config.')
            return
        config = await self.get_instagram_embed_config(guild.id)
        webhook_mode = config.get('webhook_repost_enabled', False)
        logger.info(f'Instagram embed config for guild {guild.id}: webhook_repost_enabled={webhook_mode}')
        embed_configs = await self.bot.db.get_embed_configs(guild.id)
        if not embed_configs:
            logger.warning(f'No embed configs found for server {guild.id}')
            return
        for embed_config in embed_configs:
            prefix = embed_config['prefix']
            embedded_url = original_url.replace('instagram.com', f'{prefix}instagram.com')
            logger.info(f'Trying prefix "{prefix}" for URL: {original_url}')
            is_valid, error = await self._validate_url(embedded_url)
            if is_valid:
                try:
                    if webhook_mode and isinstance(message.channel, discord.TextChannel):
                        logger.info(f'Using webhook repost mode for message {message.id}')
                        try:
                            await self._repost_with_webhook(message, embedded_url)
                            await self.bot.db.insert_message_data(
                                message_id=message.id,
                                channel_id=message.channel.id,
                                server_id=guild.id,
                                user_id=message.author.id,
                                original_url=original_url,
                                embedded_url=embedded_url,
                                embed_prefix_used=prefix,
                                validation_status='success',
                                validation_error=None
                            )
                            logger.info(f'Successfully reposted with webhook for prefix "{prefix}"')
                            return
                        except Exception as e:
                            # Webhook repost failed - fall back to normal reply mode
                            logger.warning(f'Webhook repost failed ({e}), falling back to reply mode')
                            await message.edit(suppress=True)
                            new_content = message.content.replace(original_url, embedded_url)
                            await message.reply(new_content, mention_author=False)
                            await self.bot.db.insert_message_data(
                                message_id=message.id,
                                channel_id=message.channel.id,
                                server_id=guild.id,
                                user_id=message.author.id,
                                original_url=original_url,
                                embedded_url=embedded_url,
                                embed_prefix_used=prefix,
                                validation_status='success',
                                validation_error=None
                            )
                            logger.info(f'Successfully embedded URL with prefix "{prefix}" (reply mode)')
                            return
                    else:
                        await message.edit(suppress=True)
                        new_content = message.content.replace(original_url, embedded_url)
                        await message.reply(new_content, mention_author=False)
                        await self.bot.db.insert_message_data(
                            message_id=message.id,
                            channel_id=message.channel.id,
                            server_id=guild.id,
                            user_id=message.author.id,
                            original_url=original_url,
                            embedded_url=embedded_url,
                            embed_prefix_used=prefix,
                            validation_status='success',
                            validation_error=None
                        )
                        logger.info(f'Successfully embedded URL with prefix "{prefix}"')
                        return
                except discord.Forbidden:
                    logger.error(f'Missing permissions to suppress embeds/send message in channel {message.channel.id}')
                    try:
                        new_content = message.content.replace(original_url, embedded_url)
                        await message.reply(new_content, mention_author=False)
                        logger.info(f'Sent reply but could not suppress original embed')
                        return
                    except:
                        break
                except discord.HTTPException as e:
                    logger.error(f'Failed to suppress embed/send reply: {e}')
                    break
            else:
                logger.warning(f'Prefix "{prefix}" failed: {error}')
        await self._handle_failure(
            message=message,
            original_url=original_url,
            error='All embed prefixes failed validation'
        )

    async def _repost_with_webhook(self, message: discord.Message, embedded_url: str):
        """
        Delete the original message and repost as the user using a webhook (only in text channels).
        """
        # Only allow in text channels
        if not isinstance(message.channel, discord.TextChannel):
            logger.warning('Webhook repost attempted in non-text channel; skipping.')
            raise ValueError('Webhook repost only works in text channels')
        
        guild = message.guild
        if not guild:
            logger.warning('Webhook repost attempted in message with no guild; skipping.')
            raise ValueError('Webhook repost requires a guild')
        
        try:
            # Delete the original message
            await message.delete()
            logger.info(f'Deleted original message {message.id}')
        except discord.Forbidden:
            logger.error(f"Missing 'Manage Messages' permission to delete message {message.id}")
            raise
        except Exception as e:
            logger.error(f"Failed to delete message {message.id}: {e}")
            raise
        
        try:
            # Find or create webhook
            webhooks = await message.channel.webhooks()
            webhook = None
            for wh in webhooks:
                if wh.user and wh.user.id == guild.me.id:
                    webhook = wh
                    break
            
            if not webhook:
                webhook = await message.channel.create_webhook(name="GFCBot")
                logger.info(f'Created new webhook in channel {message.channel.id}')
            
            # Send message via webhook
            await webhook.send(
                content=embedded_url,
                username=message.author.display_name,
                avatar_url=message.author.display_avatar.url
            )
            logger.info(f'Successfully reposted message via webhook with user {message.author.display_name}')
        except discord.Forbidden as e:
            logger.error(f"Missing 'Manage Webhooks' permission: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to repost with webhook: {e}")
            raise
    
    async def _validate_url(self, url: str, timeout: int = 5) -> tuple[bool, Optional[str]]:
        """
        Validate if a URL is accessible.
        
        Args:
            url: URL to validate
            timeout: Timeout in seconds
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.session:
            return False, 'HTTP session not initialized'
        
        try:
            # Try HEAD request first
            async with self.session.head(url, timeout=timeout, allow_redirects=True) as response:
                if response.status < 400:
                    return True, None
                else:
                    # Try GET as fallback
                    async with self.session.get(url, timeout=timeout, allow_redirects=True) as get_response:
                        if get_response.status < 400:
                            return True, None
                        return False, f'HTTP {get_response.status}'
                        
        except asyncio.TimeoutError:
            return False, 'Request timeout'
        except aiohttp.ClientError as e:
            return False, f'Client error: {str(e)}'
        except Exception as e:
            return False, f'Unexpected error: {str(e)}'
    
    async def _handle_failure(
        self,
        message: discord.Message,
        original_url: str,
        error: str
    ):
        """
        Handle failed URL embedding.
        
        Args:
            message: Discord message
            original_url: Original Instagram URL
            error: Error message
        """
        # Log failure to database
        await self.bot.db.insert_message_data(
            message_id=message.id,
            channel_id=message.channel.id,
            server_id=message.guild.id,
            user_id=message.author.id,
            original_url=original_url,
            embedded_url=None,
            embed_prefix_used=None,
            validation_status='failed',
            validation_error=error
        )
        
        # Send reply with original URL
        try:
            await message.reply(
                f'⚠️ Could not embed the Instagram URL. Original: {original_url}',
                mention_author=False
            )
        except discord.HTTPException as e:
            logger.error(f'Failed to send reply: {e}')


async def setup(bot):
    """Required function to add cog to bot."""
    await bot.add_cog(InstagramEmbed(bot))
