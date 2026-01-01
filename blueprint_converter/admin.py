from django.contrib import admin
from .models import (
    Blueprint, Model3D, UserProfile, FurnitureCategory, 
    Furniture, MaterialType, Material, LightingOption, ModelCustomization
)

class BlueprintAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'created_at', 'status')
    list_filter = ('status', 'created_at')
    search_fields = ('title',)
    readonly_fields = ('created_at',)

class Model3DAdmin(admin.ModelAdmin):
    list_display = ('id', 'blueprint', 'created_at')
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user')
    search_fields = ('user__username',)

class FurnitureCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

class FurnitureAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'width', 'depth', 'height')
    list_filter = ('category',)
    search_fields = ('name', 'description')

class MaterialTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

class MaterialAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'material_type', 'color_hex')
    list_filter = ('material_type',)
    search_fields = ('name', 'description')

class LightingOptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'light_type', 'intensity', 'color_hex')
    list_filter = ('light_type',)
    search_fields = ('name', 'description')

class ModelCustomizationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'model_3d', 'user', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'user__username', 'model_3d__blueprint__title')
    readonly_fields = ('created_at', 'updated_at')

admin.site.register(Blueprint, BlueprintAdmin)
admin.site.register(Model3D, Model3DAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(FurnitureCategory, FurnitureCategoryAdmin)
admin.site.register(Furniture, FurnitureAdmin)
admin.site.register(MaterialType, MaterialTypeAdmin)
admin.site.register(Material, MaterialAdmin)
admin.site.register(LightingOption, LightingOptionAdmin)
admin.site.register(ModelCustomization, ModelCustomizationAdmin)
