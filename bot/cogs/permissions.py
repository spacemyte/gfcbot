import discord
from discord import app_commands
from discord.ext import commands
import logging
from typing import List

logger = logging.getLogger('gfcbot.permissions')


class Permissions(commands.Cog):
    """Cog for managing feature permissions."""
    
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="setpermission", description="Set role permissions for a feature")
    @app_commands.describe(
        role="The role to set permissions for",
        feature="The feature name (e.g., instagram_embed)",
        read="Grant read permission",
        manage="Grant manage permission",
        delete="Grant delete permission"
    )
    @app_commands.default_permissions(administrator=True)
    async def set_permission(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
        feature: str,
        read: bool = False,
        manage: bool = False,
        delete: bool = False
    ):
        """
        Set permissions for a role on a feature.
        
        Permission inheritance: delete > manage > read
        """
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
        
        # Check if user has admin permissions
        if not isinstance(interaction.user, discord.Member) or not interaction.user.guild_permissions.administrator:
            await interaction.response.send_message("❌ You need administrator permissions to use this command.", ephemeral=True)
            return
        
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Set permissions
            await self.bot.feature_manager.set_role_permissions(
                server_id=interaction.guild.id,
                role_id=role.id,
                feature_name=feature,
                read=read,
                manage=manage,
                delete=delete
            )
            
            # Log to audit trail
            await self.bot.db.insert_audit_log(
                server_id=interaction.guild.id,
                user_id=interaction.user.id,
                action='permission_updated',
                target_type='role',
                target_id=str(role.id),
                details={
                    'feature': feature,
                    'permissions': {'read': read, 'manage': manage, 'delete': delete}
                }
            )
            
            # Build response message
            perms_list = []
            if delete:
                perms_list.append("delete (includes manage + read)")
            elif manage:
                perms_list.append("manage (includes read)")
            elif read:
                perms_list.append("read")
            
            permissions_str = ", ".join(perms_list) if perms_list else "none"
            
            await interaction.followup.send(
                f"✅ Updated permissions for {role.mention} on feature `{feature}`:\n"
                f"Permissions: {permissions_str}",
                ephemeral=True
            )
            
        except ValueError as e:
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
        except Exception as e:
            logger.error(f'Error setting permissions: {e}', exc_info=True)
            await interaction.followup.send("❌ An error occurred while setting permissions.", ephemeral=True)
    
    @app_commands.command(name="checkpermission", description="Check if a role has permission for a feature")
    @app_commands.describe(
        role="The role to check",
        feature="The feature name",
        action="The action to check (read, manage, or delete)"
    )
    async def check_permission(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
        feature: str,
        action: str
    ):
        """Check if a role has a specific permission."""
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
        
        if action not in ['read', 'manage', 'delete']:
            await interaction.response.send_message("❌ Action must be 'read', 'manage', or 'delete'.", ephemeral=True)
            return
        
        await interaction.response.defer(ephemeral=True)
        
        try:
            has_permission = await self.bot.feature_manager.check_permission(
                server_id=interaction.guild.id,
                role_ids=[role.id],
                feature_name=feature,
                action=action
            )
            
            if has_permission:
                await interaction.followup.send(
                    f"✅ {role.mention} has `{action}` permission for feature `{feature}`.",
                    ephemeral=True
                )
            else:
                await interaction.followup.send(
                    f"❌ {role.mention} does not have `{action}` permission for feature `{feature}`.",
                    ephemeral=True
                )
                
        except Exception as e:
            logger.error(f'Error checking permission: {e}', exc_info=True)
            await interaction.followup.send("❌ An error occurred while checking permissions.", ephemeral=True)
    
    @app_commands.command(name="clearcache", description="Clear the permission cache (admin only)")
    @app_commands.default_permissions(administrator=True)
    async def clear_cache(self, interaction: discord.Interaction):
        """Clear the permission cache."""
        if not isinstance(interaction.user, discord.Member) or not interaction.user.guild_permissions.administrator:
            await interaction.response.send_message("❌ You need administrator permissions to use this command.", ephemeral=True)
            return
        
        self.bot.feature_manager.invalidate_cache()
        
        await interaction.response.send_message(
            "✅ Permission cache cleared successfully.",
            ephemeral=True
        )


async def setup(bot):
    """Required function to add cog to bot."""
    await bot.add_cog(Permissions(bot))
