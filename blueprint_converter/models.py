from django.db import models
from django.contrib.auth.models import User
import os
import uuid
import json

def blueprint_image_path(instance, filename):
    """Generate file path for blueprint images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('blueprints', filename)

def model3d_file_path(instance, filename):
    """Generate file path for 3D model files"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('models', filename)

def furniture_image_path(instance, filename):
    """Generate file path for furniture images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('furniture', filename)

def material_image_path(instance, filename):
    """Generate file path for material images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('materials', filename)

class Blueprint(models.Model):
    """Blueprint image uploaded by user"""
    STATUS_CHOICES = (
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to=blueprint_image_path)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blueprints', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    error_message = models.TextField(blank=True, null=True)
    is_public = models.BooleanField(default=False, help_text="If enabled, the blueprint will be visible to all users")
    
    def __str__(self):
        return self.title

class Model3D(models.Model):
    """3D model generated from blueprint"""
    blueprint = models.OneToOneField(Blueprint, on_delete=models.CASCADE, related_name='model_3d')
    created_at = models.DateTimeField(auto_now_add=True)
    model_data = models.JSONField(default=dict)
    
    def __str__(self):
        return f"3D Model for {self.blueprint.title}"
    
    def save_model_data(self, data):
        """Save model data as JSON"""
        if isinstance(data, dict):
            self.model_data = data
        else:
            self.model_data = json.loads(data)
        self.save()


class UserProfile(models.Model):
    """Extended user profile for saving customization preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    saved_customizations = models.JSONField(default=list)
    
    def __str__(self):
        return f"Profile for {self.user.username}"


class FurnitureCategory(models.Model):
    """Categories for furniture items"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name


class Furniture(models.Model):
    """Furniture items that can be placed in a 3D model"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.ForeignKey(FurnitureCategory, on_delete=models.CASCADE, related_name='furniture_items')
    model_data = models.JSONField(default=dict)  # 3D model data in Three.js compatible format
    thumbnail = models.ImageField(upload_to=furniture_image_path)
    width = models.FloatField(help_text="Width in meters")
    depth = models.FloatField(help_text="Depth in meters")
    height = models.FloatField(help_text="Height in meters")
    
    def __str__(self):
        return self.name


class MaterialType(models.Model):
    """Types of materials (wall paint, flooring, etc.)"""
    MATERIAL_TYPES = (
        ('wall', 'Wall Paint'),
        ('floor', 'Flooring'),
        ('ceiling', 'Ceiling'),
        ('door', 'Door'),
        ('window', 'Window'),
        ('furniture', 'Furniture'),
    )
    
    name = models.CharField(max_length=50, choices=MATERIAL_TYPES)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.get_name_display()


class Material(models.Model):
    """Materials that can be applied to surfaces in a 3D model"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    material_type = models.ForeignKey(MaterialType, on_delete=models.CASCADE, related_name='materials')
    thumbnail = models.ImageField(upload_to=material_image_path)
    texture_map = models.ImageField(upload_to=material_image_path, blank=True, null=True)
    normal_map = models.ImageField(upload_to=material_image_path, blank=True, null=True)
    color_hex = models.CharField(max_length=7, help_text="Hex color code (e.g., #FFFFFF)")
    
    def __str__(self):
        return f"{self.name} ({self.material_type.get_name_display()})"


class LightingOption(models.Model):
    """Lighting options for customizing the 3D model"""
    LIGHT_TYPES = (
        ('ambient', 'Ambient Light'),
        ('directional', 'Directional Light'),
        ('point', 'Point Light'),
        ('spot', 'Spot Light'),
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    light_type = models.CharField(max_length=20, choices=LIGHT_TYPES)
    intensity = models.FloatField(default=1.0)
    color_hex = models.CharField(max_length=7, default="#FFFFFF")
    model_data = models.JSONField(default=dict)  # Additional properties specific to light type
    
    def __str__(self):
        return f"{self.name} ({self.get_light_type_display()})"


class ModelCustomization(models.Model):
    """Saved customization for a specific 3D model"""
    model_3d = models.ForeignKey(Model3D, on_delete=models.CASCADE, related_name='customizations')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='model_customizations')
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Customization data
    furniture_items = models.JSONField(default=list)  # List of furniture with position, rotation, etc.
    wall_materials = models.JSONField(default=dict)   # Wall ID to material ID mapping
    floor_materials = models.JSONField(default=dict)  # Floor ID to material ID mapping
    ceiling_materials = models.JSONField(default=dict)  # Ceiling ID to material ID mapping
    door_materials = models.JSONField(default=dict)   # Door ID to material ID mapping
    window_materials = models.JSONField(default=dict)  # Window ID to material ID mapping
    lighting_setup = models.JSONField(default=list)   # List of lighting options with position, etc.
    
    def __str__(self):
        return f"{self.name} - {self.model_3d.blueprint.title} by {self.user.username}"
