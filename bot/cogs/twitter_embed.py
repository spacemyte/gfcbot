import discord
from discord.ext import commands
import re
import aiohttp
import asyncio
import logging
import os
from typing import Optional, List, Dict
from datetime import datetime

logger = logging.getLogger('gfcbot.twitter_embed')

# Twitter/X URL pattern - matches both twitter.com and x.com URLs with optional prefixes
TWITTER_URL_PATTERN = re.compile(
    r'https?://(?:www\.)?(?:[a-z]+)?(?:twitter\.com|x\.com)/\w+/status/(\d+)',
    re.IGNORECASE
)


class TwitterEmbed(commands.Cog):
    """Cog for Twitter/X URL embedding functionality."""
    
    def __init__(self, bot):
        self.bot = bot
        self.validation_queue = asyncio.Queue()
        self.session: Optional[aiohttp.ClientSession] = None
        self.config_cache: Dict[int, Dict] = {}  # guild_id -> config
        self.api_url = os.getenv('API_URL', 'http://localhost:3001')  # Set your backend API URL here
        self.twitter_feature_id: Optional[str] = None

    async def get_twitter_embed_config(self, guild_id: int) -> Dict:
        if not self.session:
            self.session = aiohttp.ClientSession()
        # Cache for 60 seconds per guild (faster config updates)
        now = datetime.utcnow().timestamp()
        cache_entry = self.config_cache.get(guild_id)
        if cache_entry and (now - cache_entry.get('fetched_at', 0) < 60):
            return cache_entry['config']
        # Fetch from bot-accessible endpoint (no auth required)
        url = f"{self.api_url}/api/bot/twitter-embed-config/{guild_id}"
        try:
            async with self.session.get(url, timeout=5) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.config_cache[guild_id] = {'config': data, 'fetched_at': now}
                    return data
                else:
                    logger.warning(f"Failed to fetch Twitter embed config for guild {guild_id}: HTTP {resp.status}")
        except Exception as e:
            logger.error(f"Error fetching Twitter embed config for guild {guild_id}: {e}")
        # Fallback defaults
        return {
            'webhook_repost_enabled': False,
            'pruning_enabled': True,
            'pruning_max_days': 90,
            'webhook_reply_notifications': True,
            'notify_self_replies': False,
            'suppress_original_embed': True,
            'reaction_enabled': True,
            'reaction_emoji': '🙏'
        }
        
    async def cog_load(self):
        """Initialize aiohttp session when cog loads."""
        self.session = aiohttp.ClientSession()
        try:
            self.twitter_feature_id = await self.bot.feature_manager.get_feature_id('twitter_embed')
            logger.info(f"Loaded twitter feature id: {self.twitter_feature_id}")
        except Exception as e:
            logger.warning(f"Failed to load twitter feature id: {e}")
        # Start validation worker
        self.bot.loop.create_task(self._validation_worker())
        logger.info('Twitter embed cog loaded')
    
    def clear_config_cache(self, guild_id: Optional[int] = None):
        """Clear the config cache for a guild or all guilds."""
        if guild_id:
            if guild_id in self.config_cache:
                del self.config_cache[guild_id]
                logger.info(f'Cleared Twitter embed config cache for guild {guild_id}')
        else:
            self.config_cache.clear()
            logger.info('Cleared Twitter embed config cache for all guilds')
    
    async def cog_unload(self):
        """Clean up aiohttp session when cog unloads."""
        if self.session:
            await self.session.close()
        logger.info('Twitter embed cog unloaded')
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """
        Listen for messages containing Twitter/X URLs.
        React with 👍 if the message already uses a configured prefix.
        Also detect replies to webhook messages and notify original poster.
        """
        # Upsert user info (Discord ID and username)
        try:
            await self.bot.db.upsert_user(message.author.id, str(message.author))
        except Exception as e:
            logger.warning(f'Failed to upsert user info: {e}')
        
        # Upsert channel info (Discord channel ID and name)
        try:
            channel_name = getattr(message.channel, 'name', 'unknown-channel')
            await self.bot.db.upsert_channel(message.channel.id, channel_name)
        except Exception as e:
            logger.warning(f'Failed to upsert channel info: {e}')
        
        # Ignore bot messages
        if message.author.bot:
            return
        # Ignore DMs
        if not message.guild:
            return
        
        # Check if this is a reply to a webhook message
        if message.reference and message.reference.message_id:
            logger.info(f'Detected reply from {message.author.id} to message {message.reference.message_id}')
            await self._handle_webhook_reply(message)
        
        # Check for Twitter URLs
        urls = TWITTER_URL_PATTERN.findall(message.content)
        if not urls:
            return
        # Get original URL from message
        match = TWITTER_URL_PATTERN.search(message.content)
        if not match:
            return
        original_url = match.group(0)

        # Log audit: URL detected
        try:
            await self.bot.db.insert_audit_log(
                server_id=message.guild.id,
                user_id=message.author.id,
                action='url_detected',
                target_type='message',
                target_id=str(message.id),
                details={
                    'original_url': original_url,
                    'message_id': message.id
                }
            )
        except Exception as e:
            logger.warning(f'Failed to log audit event for url_detected: {e}')
        
        # Get all embed configs for this server for twitter feature
        if not self.twitter_feature_id:
            self.twitter_feature_id = await self.bot.feature_manager.get_feature_id('twitter_embed')
        if not self.twitter_feature_id:
            logger.warning('twitter_embed feature id not found; skipping embed processing')
            return
        embed_configs = await self.bot.db.get_embed_configs(message.guild.id, self.twitter_feature_id)
        
        # Check if URL already uses a configured embed (prefix or replacement)
        already_embedded = False
        if embed_configs:
            for embed_config in embed_configs:
                prefix = embed_config['prefix']
                embed_type = embed_config.get('embed_type', 'prefix')
                
                if embed_type == 'replacement':
                    # For replacement mode, check if the URL contains the replacement domain
                    if prefix.lower() in original_url.lower():
                        already_embedded = True
                        break
                else:
                    # For prefix mode, check if prefix is added before twitter.com or x.com
                    if (f'{prefix}twitter.com' in original_url.lower() or 
                        f'{prefix}x.com' in original_url.lower()):
                        already_embedded = True
                        break
        
        if already_embedded:
            # Get reaction emoji from config
            config = await self.get_twitter_embed_config(message.guild.id)
            if not config.get('reaction_enabled', True):
                return
            reaction_emoji = config.get('reaction_emoji', '🙏')
            try:
                await message.add_reaction(reaction_emoji)
                logger.info(f'Reacted with {reaction_emoji} to already-embedded URL: {original_url}')
                # Log audit: already embedded
                await self.bot.db.insert_audit_log(
                    server_id=message.guild.id,
                    user_id=message.author.id,
                    action='already_embedded',
                    target_type='message',
                    target_id=str(message.id),
                    details={
                        'original_url': original_url,
                        'message_id': message.id
                    }
                )
            except Exception as e:
                logger.warning(f'Failed to react to message: {e}')
            return
        # Add to validation queue
        await self.validation_queue.put({
            'message': message,
            'original_url': original_url,
            'post_id': urls[0]
        })
    
    async def _handle_webhook_reply(self, message: discord.Message):
        """
        Handle replies to webhook messages by notifying the original poster.
        """
        if not message.reference or not message.reference.message_id:
            return
        
        # Check if the replied-to message is a webhook message we track
        webhook_message_id = message.reference.message_id
        original_user_id = await self.bot.db.get_original_user_from_webhook(webhook_message_id)
        
        logger.info(f'Lookup webhook message {webhook_message_id}: original_user_id={original_user_id}')
        
        if not original_user_id:
            # Not a tracked webhook message
            logger.info(f'Message {webhook_message_id} is not a tracked webhook message')
            return
        
        # Check if message is in a guild
        if not message.guild:
            logger.warning('Message has no guild, skipping webhook reply notification')
            return
        
        # Get the server config to check webhook reply notification settings
        config = await self.get_twitter_embed_config(message.guild.id)
        webhook_notifications_enabled = config.get('webhook_reply_notifications', True)
        notify_self = config.get('notify_self_replies', False)
        
        # Skip if webhook reply notifications are disabled overall
        if not webhook_notifications_enabled:
            logger.info(f'Webhook reply notifications disabled for guild {message.guild.id}, skipping')
            return
        
        # Don't notify if replying to their own message (unless notify_self_replies is enabled)
        if message.author.id == original_user_id and not notify_self:
            logger.info(f'User {message.author.id} replied to their own webhook message, skipping notification (notify_self_replies={notify_self})')
            return
        
        try:
            # Reply to the reply and mention the original user
            original_user = await self.bot.fetch_user(original_user_id)
            if not original_user:
                logger.warning(f'Could not fetch user {original_user_id} for reply notification')
                return
            
            # Reply to the user's message and tag the original poster
            await message.reply(
                f"{original_user.mention}",
                mention_author=False
            )
            logger.info(f'Notified user {original_user_id} about reply from {message.author.id} via reply')
            
        except Exception as e:
            logger.error(f'Failed to notify user {original_user_id} about reply: {e}')
    
    async def _validation_worker(self):
        """Background worker to process URL validation queue with delays."""
        while True:
            try:
                # Get item from queue
                item = await self.validation_queue.get()
                
                # Process the URL
                await self._process_twitter_url(
                    message=item['message'],
                    original_url=item['original_url'],
                    post_id=item['post_id']
                )
                
                # Delay between validations (1-2 seconds)
                await asyncio.sleep(1.5)
                
                self.validation_queue.task_done()
            except Exception as e:
                logger.error(f'Error in validation worker: {e}', exc_info=True)
    
    async def _process_twitter_url(
        self,
        message: discord.Message,
        original_url: str,
        post_id: str
    ):
        """
        Process Twitter/X URL with priority-based fallback.
        
        Args:
            message: Discord message containing the URL
            original_url: Original Twitter/X URL
            post_id: Twitter post ID
        """
        # Get per-server Twitter embed config
        guild = message.guild
        if not guild:
            logger.warning('Message has no guild (DM or system message); skipping embed config.')
            return
        config = await self.get_twitter_embed_config(guild.id)
        webhook_mode = config.get('webhook_repost_enabled', False)
        logger.info(f'Twitter embed config for guild {guild.id}: webhook_repost_enabled={webhook_mode}')
        if not self.twitter_feature_id:
            self.twitter_feature_id = await self.bot.feature_manager.get_feature_id('twitter_embed')
        if not self.twitter_feature_id:
            logger.warning('twitter_embed feature id not found; cannot fetch embed configs')
            return
        embed_configs = await self.bot.db.get_embed_configs(guild.id, self.twitter_feature_id)
        if not embed_configs:
            logger.warning(f'No embed configs found for server {guild.id}')
            return
        for embed_config in embed_configs:
            prefix = embed_config['prefix']
            embed_type = embed_config.get('embed_type', 'prefix')  # Default to 'prefix' for backward compatibility
            
            # Handle both prefix and replacement modes
            if embed_type == 'replacement':
                # Full domain replacement (e.g., x.com -> fxtwitter.com)
                if 'x.com' in original_url.lower():
                    embedded_url = original_url.replace('x.com', prefix).replace('X.com', prefix)
                else:
                    embedded_url = original_url.replace('twitter.com', prefix).replace('Twitter.com', prefix)
            else:
                # Prefix mode: add prefix to domain (e.g., x.com -> ggx.com)
                if 'x.com' in original_url.lower():
                    embedded_url = original_url.replace('x.com', f'{prefix}x.com').replace('X.com', f'{prefix}x.com')
                else:
                    embedded_url = original_url.replace('twitter.com', f'{prefix}twitter.com').replace('Twitter.com', f'{prefix}twitter.com')
            
            logger.info(f'Trying {embed_type} "{prefix}" for URL: {original_url}')
            is_valid, error = await self._validate_url(embedded_url)
            if is_valid:
                try:
                    if webhook_mode and isinstance(message.channel, discord.TextChannel):
                        logger.info(f'Using webhook repost mode for message {message.id}')
                        try:
                            webhook_msg = await self._repost_with_webhook(message, embedded_url)
                            await self.bot.db.insert_message_data(
                                message_id=message.id,
                                channel_id=message.channel.id,
                                server_id=guild.id,
                                user_id=message.author.id,
                                original_url=original_url,
                                embedded_url=embedded_url,
                                embed_prefix_used=prefix,
                                validation_status='success',
                                validation_error=None,
                                webhook_message_id=webhook_msg.id
                            )
                            # Log audit: reposted with webhook
                            await self.bot.db.insert_audit_log(
                                server_id=guild.id,
                                user_id=message.author.id,
                                action='webhook_repost',
                                target_type='webhook_message',
                                target_id=str(webhook_msg.id),
                                details={
                                    'original_url': original_url,
                                    'embedded_url': embedded_url,
                                    'prefix_used': prefix,
                                    'webhook_message_id': webhook_msg.id
                                }
                            )
                            return
                        except Exception as e:
                            logger.error(f'Error reposting with webhook: {e}', exc_info=True)
                    else:
                        logger.info(f'Using regular mode for message {message.id}')
                        try:
                            if config.get('suppress_original_embed', True):
                                try:
                                    await message.edit(suppress=True)
                                except Exception as suppress_error:
                                    logger.warning(f'Failed to suppress original Twitter embed: {suppress_error}')
                            await message.reply(embedded_url, mention_author=False)
                            await self.bot.db.insert_message_data(
                                message_id=message.id,
                                channel_id=message.channel.id,
                                server_id=guild.id,
                                user_id=message.author.id,
                                original_url=original_url,
                                embedded_url=embedded_url,
                                embed_prefix_used=prefix,
                                validation_status='success',
                                validation_error=None,
                                webhook_message_id=None
                            )
                            # Log audit: embedded URL
                            await self.bot.db.insert_audit_log(
                                server_id=guild.id,
                                user_id=message.author.id,
                                action='url_embedded',
                                target_type='message',
                                target_id=str(message.id),
                                details={
                                    'original_url': original_url,
                                    'embedded_url': embedded_url,
                                    'prefix_used': prefix
                                }
                            )
                            return
                        except Exception as e:
                            logger.error(f'Error replying with embedded URL: {e}', exc_info=True)
                except Exception as e:
                    logger.error(f'Error processing embedded URL: {e}', exc_info=True)
                    # Continue to next prefix if this one failed
                    continue
        
        # If we get here, no prefixes worked
        logger.warning(f'No valid embed prefix found for URL: {original_url}')
        try:
            await self.bot.db.insert_message_data(
                message_id=message.id,
                channel_id=message.channel.id,
                server_id=guild.id,
                user_id=message.author.id,
                original_url=original_url,
                embedded_url=None,
                embed_prefix_used=None,
                validation_status='failed',
                validation_error='No valid embed prefix found',
                webhook_message_id=None
            )
            # Log audit: validation failed
            await self.bot.db.insert_audit_log(
                server_id=guild.id,
                user_id=message.author.id,
                action='validation_failed',
                target_type='message',
                target_id=str(message.id),
                details={
                    'original_url': original_url,
                    'error': 'No valid embed prefix found'
                }
            )
        except Exception as e:
            logger.warning(f'Failed to log failed validation: {e}')
    
    async def _validate_url(self, url: str) -> tuple:
        """
        Validate if a URL can be accessed successfully.
        
        Args:
            url: URL to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            async with self.session.head(url, timeout=5, allow_redirects=True) as resp:
                if resp.status < 400:
                    logger.info(f'URL validation successful: {url} (status: {resp.status})')
                    return True, None
                else:
                    error = f'HTTP {resp.status}'
                    logger.warning(f'URL validation failed: {url} ({error})')
                    return False, error
        except asyncio.TimeoutError:
            error = 'Timeout'
            logger.warning(f'URL validation timeout: {url}')
            return False, error
        except Exception as e:
            error = str(e)
            logger.warning(f'URL validation error: {url} ({error})')
            return False, error
    
    async def _repost_with_webhook(
        self,
        original_message: discord.Message,
        embedded_url: str
    ) -> discord.Message:
        """
        Repost a message using a webhook with the original author's avatar and name.
        
        Args:
            original_message: Original Discord message
            embedded_url: URL to post
            
        Returns:
            The webhook message object
        """
        channel = original_message.channel
        if not isinstance(channel, discord.TextChannel):
            raise ValueError('Can only use webhooks in text channels')
        
        # Get or create webhook
        webhooks = await channel.webhooks()
        webhook = None
        for wh in webhooks:
            if wh.name == 'gfcbot-embeds':
                webhook = wh
                break
        
        if not webhook:
            webhook = await channel.create_webhook(name='gfcbot-embeds')
        
        # Suppress the original embed if configured
        guild = original_message.guild
        if not guild:
            raise ValueError('Message has no guild')
        config = await self.get_twitter_embed_config(guild.id)
        suppress_embed = config.get('suppress_original_embed', True)
        
        # Send via webhook
        msg = await webhook.send(
            embedded_url,
            username=original_message.author.display_name,
            avatar_url=original_message.author.display_avatar.url,
            wait=True
        )
        
        # Suppress original message embed if configured
        if suppress_embed:
            try:
                await original_message.edit(suppress=True)
            except Exception as e:
                logger.warning(f'Failed to suppress original message embed: {e}')
        
        return msg


async def setup(bot):
    """Load the cog."""
    await bot.add_cog(TwitterEmbed(bot))
