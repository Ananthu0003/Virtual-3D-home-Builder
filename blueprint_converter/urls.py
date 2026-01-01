from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    # Web views
    path('', views.home_view, name='home'),
    path('processing/<int:blueprint_id>/', views.processing_view, name='processing'),
    path('check-status/<int:blueprint_id>/', views.check_status, name='check_status'),
    path('viewer/<int:blueprint_id>/', views.viewer_view, name='viewer'),
    path('customize/<int:blueprint_id>/', views.customize_view, name='customize'),
    path('customize/<int:blueprint_id>/save/', views.save_customization, name='save_customization'),
    path('customize/<int:blueprint_id>/load/<int:customization_id>/', views.load_customization, name='load_customization'),
    
    # Authentication & User pages
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('change-password/', views.change_password_view, name='change_password'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('blueprint/<int:blueprint_id>/delete/', views.delete_blueprint, name='delete_blueprint'),
    path('blueprint/<int:blueprint_id>/toggle-public/', views.toggle_public, name='toggle_public'),
    
    # API endpoints
    path('api/upload/', views.BlueprintUploadAPI.as_view(), name='api_upload'),
    path('api/furniture/categories/', views.FurnitureCategoryListAPI.as_view(), name='api_furniture_categories'),
    path('api/furniture/', views.FurnitureListAPI.as_view(), name='api_furniture_list'),
    path('api/furniture/<int:category_id>/', views.FurnitureByCategoryAPI.as_view(), name='api_furniture_by_category'),
    path('api/materials/types/', views.MaterialTypeListAPI.as_view(), name='api_material_types'),
    path('api/materials/<str:material_type>/', views.MaterialsByTypeAPI.as_view(), name='api_materials_by_type'),
    path('api/lighting/', views.LightingOptionsAPI.as_view(), name='api_lighting_options'),
    path('api/customizations/<int:blueprint_id>/', views.CustomizationListAPI.as_view(), name='api_customization_list'),
    path('api/customizations/<int:blueprint_id>/<int:customization_id>/', views.CustomizationDetailAPI.as_view(), name='api_customization_detail'),
]
