import discord
from discord import app_commands
from discord.ext import commands
import logging

logger = logging.getLogger('gfcbot.admin')


class Admin(commands.Cog):
    """Cog for general admin commands."""
    
    def __init__(self, bot):
        self.bot = bot
    
    def is_admin(self, member: discord.Member) -> bool:
        """Check if a member has admin permissions."""
        return member.guild_permissions.administrator or member.guild_permissions.manage_guild
    
    @app_commands.command(name="help", description="Show help information for GFC Bot")
    async def help(self, interaction: discord.Interaction):
        """Display help information based on user permissions."""
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
        
        member = interaction.guild.get_member(interaction.user.id)
        if not member:
            await interaction.response.send_message("Could not verify your permissions.", ephemeral=True)
            return
        
        # Check if user is admin
        is_admin = self.is_admin(member)
        
        if is_admin:
            await self._send_admin_help(interaction)
        else:
            await self._send_user_help(interaction)
    
    async def _send_user_help(self, interaction: discord.Interaction):
        """Send help message for regular users."""
        embed = discord.Embed(
            title="GFC Bot Help",
            description="Automatic social media link embedding for the GFC community",
            color=discord.Color.blue()
        )
        
        embed.add_field(
            name="📸 Instagram Links",
            value="Post any Instagram link and the bot will automatically embed it with a better preview!",
            inline=False
        )
        
        embed.add_field(
            name="𝕏 Twitter/X Links",
            value="Post any Twitter/X link and the bot will automatically embed it with a better preview!",
            inline=False
        )
        
        embed.add_field(
            name="💡 How It Works",
            value="Just paste a link from Instagram or Twitter/X in any channel where the bot is active. "
                  "The bot will detect it and respond with an enhanced embed!",
            inline=False
        )
        
        embed.set_footer(text="GFC Bot • Questions? Contact a server admin")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    async def _send_admin_help(self, interaction: discord.Interaction):
        """Send help message for administrators."""
        embed = discord.Embed(
            title="GFC Bot Help (Admin)",
            description="A general purpose Discord bot for the GFC community",
            color=discord.Color.gold()
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
                  "`/ping` - Check bot latency\n"
                  "`/help` - Show this help message",
            inline=False
        )
        
        embed.add_field(
            name="🌐 Web Dashboard",
            value="Manage bot settings, view URL history, and configure features at the web dashboard.",
            inline=False
        )
        
        embed.set_footer(text="GFC Bot • Admin Panel")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @app_commands.command(name="status", description="Show bot status and statistics")
    @app_commands.default_permissions(administrator=True)
    async def status(self, interaction: discord.Interaction):
        """Display bot status information."""
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
        
        member = interaction.guild.get_member(interaction.user.id)
        if not member or not self.is_admin(member):
            await interaction.response.send_message("❌ You need administrator permissions to use this command.", ephemeral=True)
            return
        
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
    @app_commands.default_permissions(administrator=True)
    async def ping(self, interaction: discord.Interaction):
        """Simple ping command to check bot responsiveness."""
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
        
        member = interaction.guild.get_member(interaction.user.id)
        if not member or not self.is_admin(member):
            await interaction.response.send_message("❌ You need administrator permissions to use this command.", ephemeral=True)
            return
        
        latency = round(self.bot.latency * 1000)
        await interaction.response.send_message(f"🏓 Pong! Latency: {latency}ms", ephemeral=True)


async def setup(bot):
    """Required function to add cog to bot."""
    await bot.add_cog(Admin(bot))
