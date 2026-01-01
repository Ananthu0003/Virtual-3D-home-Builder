from rest_framework import serializers
from .models import (
    Blueprint, Model3D, FurnitureCategory, Furniture, 
    MaterialType, Material, LightingOption, ModelCustomization
)

class BlueprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blueprint
        fields = ['id', 'title', 'image', 'created_at', 'status']

class Model3DSerializer(serializers.ModelSerializer):
    class Meta:
        model = Model3D
        fields = ['id', 'blueprint', 'created_at', 'model_data']

class FurnitureCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FurnitureCategory
        fields = ['id', 'name', 'description']

class FurnitureSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    
    class Meta:
        model = Furniture
        fields = ['id', 'name', 'description', 'category', 'category_name', 
                  'model_data', 'thumbnail', 'width', 'depth', 'height']

class MaterialTypeSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField(source='get_name_display')
    
    class Meta:
        model = MaterialType
        fields = ['id', 'name', 'display_name', 'description']

class MaterialSerializer(serializers.ModelSerializer):
    material_type_name = serializers.ReadOnlyField(source='material_type.get_name_display')
    
    class Meta:
        model = Material
        fields = ['id', 'name', 'description', 'material_type', 'material_type_name',
                  'thumbnail', 'texture_map', 'normal_map', 'color_hex']

class LightingOptionSerializer(serializers.ModelSerializer):
    light_type_display = serializers.ReadOnlyField(source='get_light_type_display')
    
    class Meta:
        model = LightingOption
        fields = ['id', 'name', 'description', 'light_type', 'light_type_display',
                  'intensity', 'color_hex', 'model_data']

class ModelCustomizationSerializer(serializers.ModelSerializer):
    blueprint_title = serializers.ReadOnlyField(source='model_3d.blueprint.title')
    username = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = ModelCustomization
        fields = ['id', 'model_3d', 'user', 'name', 'created_at', 'updated_at',
                  'blueprint_title', 'username', 'furniture_items', 'wall_materials',
                  'floor_materials', 'ceiling_materials', 'door_materials',
                  'window_materials', 'lighting_setup']

    def create(self, validated_data):
        # Set the user to the current authenticated user if not provided
        if 'user' not in validated_data and self.context.get('request'):
            validated_data['user'] = self.context['request'].user
        return super().create(validated_data)