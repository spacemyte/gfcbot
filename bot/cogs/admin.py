import discord
from discord import app_commands
from discord.ext import commands
import logging

logger = logging.getLogger('gfcbot.admin')


class Admin(commands.Cog):
    """Cog for general admin commands."""
    
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="help", description="Show help information for GFC Bot")
    async def help(self, interaction: discord.Interaction):
        """Display help information."""
        embed = discord.Embed(
            title="GFC Bot Help",
            description="A general purpose Discord bot for the GFC community",
            color=discord.Color.blue()
        )
        
        embed.add_field(
            name="📸 Instagram Embed",
            value="Automatically embeds Instagram URLs with configurable prefixes. "
                  "Just post an Instagram link and the bot will handle it!",
            inline=False
        )
        
        embed.add_field(
            name="𝕏 Twitter/X Embed",
            value="Automatically embeds Twitter/X URLs with configurable prefixes. "
                  "Just post a Twitter/X link and the bot will handle it!",
            inline=False
        )
        
        embed.add_field(
            name="🔐 Permission Commands (Admin)",
            value="`/setpermission` - Set role permissions for features\n"
                  "`/checkpermission` - Check if a role has a permission\n"
                  "`/clearcache` - Clear permission cache",
            inline=False
        )
        
        embed.add_field(
            name="⚙️ Admin Commands",
            value="`/status` - Show bot status and stats\n"
                  "`/help` - Show this help message",
            inline=False
        )
        
        embed.add_field(
            name="🌐 Web Dashboard",
            value="Manage bot settings, view URL history, and configure features at the web dashboard.",
            inline=False
        )
        
        embed.set_footer(text="GFC Bot • Private Community")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @app_commands.command(name="status", description="Show bot status and statistics")
    async def status(self, interaction: discord.Interaction):
        """Display bot status information."""
        embed = discord.Embed(
            title="🤖 GFC Bot Status",
            color=discord.Color.green()
        )
        
        # Bot info
        embed.add_field(
            name="Bot Info",
            value=f"**Servers:** {len(self.bot.guilds)}\n"
                  f"**Latency:** {round(self.bot.latency * 1000)}ms\n"
                  f"**Cache:** {'Enabled' if self.bot.feature_manager.cache_enabled else 'Disabled'}",
            inline=True
        )
        
        # Features
        features_list = "✅ Instagram Embed\n✅ Twitter/X Embed"
        embed.add_field(
            name="Active Features",
            value=features_list,
            inline=True
        )
        
        embed.set_footer(text=f"Requested by {interaction.user.display_name}")
        embed.timestamp = discord.utils.utcnow()
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @app_commands.command(name="ping", description="Check bot latency")
    async def ping(self, interaction: discord.Interaction):
        """Simple ping command to check bot responsiveness."""
        latency = round(self.bot.latency * 1000)
        await interaction.response.send_message(f"🏓 Pong! Latency: {latency}ms", ephemeral=True)


async def setup(bot):
    """Required function to add cog to bot."""
    await bot.add_cog(Admin(bot))
