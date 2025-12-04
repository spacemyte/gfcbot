import os
import discord
from discord.ext import commands
from dotenv import load_dotenv
import logging
from utils.database import Database
from utils.feature_manager import FeatureManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('gfcbot')

# Bot configuration
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(
    command_prefix=os.getenv('COMMAND_PREFIX', '!'),
    intents=intents,
    help_command=None
)

# Initialize database and feature manager
database_url = os.getenv('DATABASE_URL')
if not database_url:
    logger.error("DATABASE_URL environment variable is not set!")
    raise ValueError("DATABASE_URL environment variable is required but not set!")
    
logger.info(f"DATABASE_URL environment variable found")
db = Database(
    database_url=database_url
)

feature_manager = FeatureManager(
    db=db,
    cache_enabled=os.getenv('ENABLE_PERMISSION_CACHE', 'false').lower() == 'true'
)

# Store instances for access by cogs
bot.db = db
bot.feature_manager = feature_manager


@bot.event
async def on_ready():
    """Event handler for bot ready state."""
    logger.info(f'{bot.user} has connected to Discord!')
    logger.info(f'Connected to {len(bot.guilds)} guilds')
    
    # Sync slash commands
    try:
        synced = await bot.tree.sync()
        logger.info(f'Synced {len(synced)} command(s)')
    except Exception as e:
        logger.error(f'Failed to sync commands: {e}')
    
    # Set bot status
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching,
            name="Patrolling for Instagram URLs"
        )
    )


@bot.event
async def on_guild_join(guild):
    """Event handler for when bot joins a new guild."""
    logger.info(f'Joined new guild: {guild.name} (ID: {guild.id})')
    
    # Initialize default pruning config for new server
    await db.ensure_pruning_config(guild.id)


@bot.event
async def on_command_error(ctx, error):
    """Global error handler for commands."""
    if isinstance(error, commands.CommandNotFound):
        return
    elif isinstance(error, commands.MissingPermissions):
        await ctx.send("❌ You don't have permission to use this command.")
    elif isinstance(error, commands.BotMissingPermissions):
        await ctx.send("❌ I don't have the required permissions to execute this command.")
    else:
        logger.error(f'Command error: {error}', exc_info=error)
        await ctx.send("❌ An error occurred while executing the command.")


async def load_cogs():
    """Load all cog modules."""
    cogs = [
        'cogs.instagram_embed',
        'cogs.permissions',
        'cogs.admin'
    ]
    
    for cog in cogs:
        try:
            await bot.load_extension(cog)
            logger.info(f'Loaded cog: {cog}')
        except Exception as e:
            logger.error(f'Failed to load cog {cog}: {e}')


async def main():
    """Main entry point for the bot."""
    async with bot:
        # Load all cogs
        await load_cogs()
        
        # Start the bot
        token = os.getenv('DISCORD_TOKEN')
        if not token:
            logger.error('DISCORD_TOKEN not found in environment variables')
            return
        
        await bot.start(token)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
