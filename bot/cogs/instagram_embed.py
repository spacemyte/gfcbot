import discord
from discord.ext import commands
import re
import aiohttp
import asyncio
import logging
from typing import Optional, List, Dict
from datetime import datetime

logger = logging.getLogger('gfcbot.instagram_embed')

# Instagram URL pattern
INSTAGRAM_URL_PATTERN = re.compile(
    r'https?://(?:www\.)?instagram\.com/(?:p|reel|reels|tv)/([a-zA-Z0-9_-]+)/?',
    re.IGNORECASE
)


class InstagramEmbed(commands.Cog):
    """Cog for Instagram URL embedding functionality."""
    
    def __init__(self, bot):
        self.bot = bot
        self.validation_queue = asyncio.Queue()
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def cog_load(self):
        """Initialize aiohttp session when cog loads."""
        self.session = aiohttp.ClientSession()
        # Start validation worker
        self.bot.loop.create_task(self._validation_worker())
        logger.info('Instagram embed cog loaded')
    
    async def cog_unload(self):
        """Clean up aiohttp session when cog unloads."""
        if self.session:
            await self.session.close()
        logger.info('Instagram embed cog unloaded')
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """
        Listen for messages containing Instagram URLs.
        
        Args:
            message: Discord message object
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
        # Get embed configs for this server
        embed_configs = await self.bot.db.get_embed_configs(message.guild.id)
        
        if not embed_configs:
            logger.warning(f'No embed configs found for server {message.guild.id}')
            return
        
        # Try each prefix in priority order
        for config in embed_configs:
            prefix = config['prefix']
            embedded_url = original_url.replace('instagram.com', f'{prefix}instagram.com')
            
            logger.info(f'Trying prefix "{prefix}" for URL: {original_url}')
            
            # Validate the embedded URL
            is_valid, error = await self._validate_url(embedded_url)
            
            if is_valid:
                # Success! Suppress the original embed and send a reply with the embedded URL
                try:
                    # Suppress embeds on the original message
                    await message.edit(suppress=True)
                    
                    # Send reply with embedded URL
                    new_content = message.content.replace(original_url, embedded_url)
                    await message.reply(new_content, mention_author=False)
                    
                    # Log success to database
                    await self.bot.db.insert_message_data(
                        message_id=message.id,
                        channel_id=message.channel.id,
                        server_id=message.guild.id,
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
                    logger.error(f'Missing permissions to suppress embeds or send message in channel {message.channel.id}')
                    # Try to at least send the reply even if we can't suppress
                    try:
                        new_content = message.content.replace(original_url, embedded_url)
                        await message.reply(new_content, mention_author=False)
                        logger.info(f'Sent reply but could not suppress original embed')
                        return
                    except:
                        break
                except discord.HTTPException as e:
                    logger.error(f'Failed to suppress embed or send reply: {e}')
                    break
            else:
                logger.warning(f'Prefix "{prefix}" failed: {error}')
        
        # All prefixes failed - log and send reply
        await self._handle_failure(
            message=message,
            original_url=original_url,
            error='All embed prefixes failed validation'
        )
    
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
