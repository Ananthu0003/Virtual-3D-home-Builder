from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponseForbidden, HttpResponseRedirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.urls import reverse
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.decorators import login_required
from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics
from rest_framework.parsers import MultiPartParser, FormParser 

from .models import (
    Blueprint, Model3D, UserProfile, FurnitureCategory, Furniture,
    MaterialType, Material, LightingOption, ModelCustomization
)
from .forms import BlueprintUploadForm
from .serializers import (
    BlueprintSerializer, Model3DSerializer, FurnitureCategorySerializer,
    FurnitureSerializer, MaterialTypeSerializer, MaterialSerializer,
    LightingOptionSerializer, ModelCustomizationSerializer
)
from .ai_processor import process_blueprint

import os
import json
import logging
import threading

logger = logging.getLogger(__name__)

def home_view(request):
    """Home page with blueprint upload form"""
    form = BlueprintUploadForm()
    
    if request.method == 'POST':
        form = BlueprintUploadForm(request.POST, request.FILES)
        if form.is_valid():
            blueprint = form.save(commit=False)
            # Associate blueprint with logged-in user if authenticated
            if request.user.is_authenticated:
                blueprint.user = request.user
            blueprint.save()
            return redirect('processing', blueprint_id=blueprint.id)
    
    # Get public blueprints or user's blueprints
    if request.user.is_authenticated:
        # Show both the user's blueprints and public blueprints from others
        blueprints = Blueprint.objects.filter(
            Q(user=request.user) | Q(is_public=True)
        ).distinct().order_by('-created_at')[:10]
    else:
        # Show only public blueprints
        blueprints = Blueprint.objects.filter(is_public=True).order_by('-created_at')[:10]
    
    return render(request, 'home.html', {
        'form': form,
        'recent_blueprints': blueprints
    })

def processing_view(request, blueprint_id):
    """Processing page showing status of blueprint conversion"""
    blueprint = get_object_or_404(Blueprint, id=blueprint_id)
    
    # Start processing in background if not already started
    if blueprint.status == 'uploaded':
        blueprint.status = 'processing'
        blueprint.save()
        
        # Process blueprint in background thread
        def process_in_background(blueprint_id):
            try:
                blueprint = Blueprint.objects.get(id=blueprint_id)
                process_blueprint(blueprint)
            except Exception as e:
                logger.error(f"Error processing blueprint {blueprint_id}: {str(e)}")
                try:
                    blueprint.status = 'failed'
                    blueprint.error_message = str(e)
                    blueprint.save()
                except:
                    pass
        
        threading.Thread(target=process_in_background, args=(blueprint_id,)).start()
    
    return render(request, 'processing.html', {'blueprint': blueprint})

def check_status(request, blueprint_id):
    """API endpoint to check processing status"""
    blueprint = get_object_or_404(Blueprint, id=blueprint_id)
    
    data = {
        'status': blueprint.status,
        'error': blueprint.error_message,
    }
    
    if blueprint.status == 'completed':
        data['viewer_url'] = reverse('viewer', args=[blueprint_id])
    
    return JsonResponse(data)

def viewer_view(request, blueprint_id):
    """3D model viewer page"""
    blueprint = get_object_or_404(Blueprint, id=blueprint_id)
    
    # Check if user has permission to view this blueprint
    if blueprint.user and blueprint.user != request.user and not blueprint.is_public:
        messages.error(request, "You don't have permission to view this blueprint.")
        return redirect('home')
    
    # Redirect if processing not complete
    if blueprint.status != 'completed':
        return redirect('processing', blueprint_id=blueprint_id)
    
    try:
        model3d = blueprint.model_3d
        model_data = model3d.model_data
    except Model3D.DoesNotExist:
        return render(request, 'error.html', {
            'message': 'Model data not found. Please try processing the blueprint again.'
        })
    
    return render(request, 'viewer.html', {
        'blueprint': blueprint,
        'model_data_json': json.dumps(model_data)
    })

def customize_view(request, blueprint_id):
    """Interior customization page for a 3D model"""
    blueprint = get_object_or_404(Blueprint, id=blueprint_id)
    
    # Check if user has permission to view this blueprint
    if blueprint.user and blueprint.user != request.user and not blueprint.is_public:
        messages.error(request, "You don't have permission to customize this blueprint.")
        return redirect('home')
    
    # Redirect if processing not complete
    if blueprint.status != 'completed':
        return redirect('processing', blueprint_id=blueprint_id)
    
    try:
        model3d = blueprint.model_3d
    except Model3D.DoesNotExist:
        return render(request, 'error.html', {
            'message': 'Model data not found. Please try processing the blueprint again.'
        })
    
    # Get furniture categories and materials
    furniture_categories = FurnitureCategory.objects.all()
    wall_materials = Material.objects.filter(material_type__name='wall')
    floor_materials = Material.objects.filter(material_type__name='floor')
    ceiling_materials = Material.objects.filter(material_type__name='ceiling')
    door_materials = Material.objects.filter(material_type__name='door')
    window_materials = Material.objects.filter(material_type__name='window')
    lighting_options = LightingOption.objects.all()
    
    # Get user's saved customizations if authenticated
    user_customizations = []
    if request.user.is_authenticated:
        user_customizations = ModelCustomization.objects.filter(
            model_3d=model3d, 
            user=request.user
        )
    
    context = {
        'blueprint': blueprint,
        'model_data_json': json.dumps(model3d.model_data),
        'furniture_categories': furniture_categories,
        'wall_materials': wall_materials,
        'floor_materials': floor_materials,
        'ceiling_materials': ceiling_materials,
        'door_materials': door_materials,
        'window_materials': window_materials,
        'lighting_options': lighting_options,
        'user_customizations': user_customizations,
    }
    
    return render(request, 'customize.html', context)


@login_required
def save_customization(request, blueprint_id):
    """Save a customization for a 3D model"""
    blueprint = get_object_or_404(Blueprint, id=blueprint_id)
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        name = data.get('name', f"Customization for {blueprint.title}")
        
        model3d = blueprint.model_3d
        
        # Create or update customization
        customization_id = data.get('customization_id')
        if customization_id:
            # Update existing customization
            customization = get_object_or_404(
                ModelCustomization, 
                id=customization_id, 
                model_3d=model3d, 
                user=request.user
            )
        else:
            # Create new customization
            customization = ModelCustomization(
                model_3d=model3d,
                user=request.user,
                name=name
            )
        
        # Update customization data
        customization.furniture_items = data.get('furniture_items', [])
        customization.wall_materials = data.get('wall_materials', {})
        customization.floor_materials = data.get('floor_materials', {})
        customization.ceiling_materials = data.get('ceiling_materials', {})
        customization.door_materials = data.get('door_materials', {})
        customization.window_materials = data.get('window_materials', {})
        customization.lighting_setup = data.get('lighting_setup', [])
        customization.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Customization saved successfully',
            'customization_id': customization.id
        })
    
    except Exception as e:
        logger.error(f"Error saving customization: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)


@login_required
def load_customization(request, blueprint_id, customization_id):
    """Load a saved customization"""
    blueprint = get_object_or_404(Blueprint, id=blueprint_id)
    
    try:
        model3d = blueprint.model_3d
        customization = get_object_or_404(
            ModelCustomization, 
            id=customization_id, 
            model_3d=model3d
        )
        
        # Check if the user has permission to view this customization
        if customization.user != request.user and not request.user.is_staff:
            return HttpResponseForbidden("You don't have permission to view this customization")
        
        customization_data = {
            'id': customization.id,
            'name': customization.name,
            'furniture_items': customization.furniture_items,
            'wall_materials': customization.wall_materials,
            'floor_materials': customization.floor_materials,
            'ceiling_materials': customization.ceiling_materials,
            'door_materials': customization.door_materials,
            'window_materials': customization.window_materials,
            'lighting_setup': customization.lighting_setup,
        }
        
        return JsonResponse(customization_data)
    
    except Exception as e:
        logger.error(f"Error loading customization: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)


class BlueprintUploadAPI(APIView):
    """API for uploading blueprints"""
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, format=None):
        form = BlueprintUploadForm(request.POST, request.FILES)
        if form.is_valid():
            blueprint = form.save(commit=False)
            
            # Associate blueprint with logged-in user if authenticated
            if request.user.is_authenticated:
                blueprint.user = request.user
            
            # Start processing in background
            blueprint.status = 'processing'
            blueprint.save()
            
            # Process blueprint in background thread
            def process_in_background(blueprint_id):
                try:
                    blueprint = Blueprint.objects.get(id=blueprint_id)
                    process_blueprint(blueprint)
                except Exception as e:
                    logger.error(f"Error processing blueprint {blueprint_id}: {str(e)}")
                    try:
                        blueprint.status = 'failed'
                        blueprint.error_message = str(e)
                        blueprint.save()
                    except:
                        pass
            
            threading.Thread(target=process_in_background, args=(blueprint.id,)).start()
            
            return Response({
                'message': 'Blueprint uploaded successfully',
                'blueprint_id': blueprint.id,
                'status_url': request.build_absolute_uri(reverse('check_status', args=[blueprint.id])),
            }, status=status.HTTP_201_CREATED)
        
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)


class FurnitureCategoryListAPI(APIView):
    """API endpoint for furniture categories"""
    def get(self, request, format=None):
        categories = FurnitureCategory.objects.all()
        serializer = FurnitureCategorySerializer(categories, many=True)
        return Response(serializer.data)


class FurnitureListAPI(APIView):
    """API endpoint for all furniture items"""
    def get(self, request, format=None):
        furniture = Furniture.objects.all()
        serializer = FurnitureSerializer(furniture, many=True)
        return Response(serializer.data)


class FurnitureByCategoryAPI(APIView):
    """API endpoint for furniture items by category"""
    def get(self, request, category_id, format=None):
        furniture = Furniture.objects.filter(category_id=category_id)
        serializer = FurnitureSerializer(furniture, many=True)
        return Response(serializer.data)


class MaterialTypeListAPI(APIView):
    """API endpoint for material types"""
    def get(self, request, format=None):
        material_types = MaterialType.objects.all()
        serializer = MaterialTypeSerializer(material_types, many=True)
        return Response(serializer.data)


class MaterialsByTypeAPI(APIView):
    """API endpoint for materials by type"""
    def get(self, request, material_type, format=None):
        materials = Material.objects.filter(material_type__name=material_type)
        serializer = MaterialSerializer(materials, many=True)
        return Response(serializer.data)


class LightingOptionsAPI(APIView):
    """API endpoint for lighting options"""
    def get(self, request, format=None):
        lighting = LightingOption.objects.all()
        serializer = LightingOptionSerializer(lighting, many=True)
        return Response(serializer.data)


class CustomizationListAPI(APIView):
    """API endpoint for user's customizations"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, blueprint_id, format=None):
        model3d = get_object_or_404(Model3D, blueprint_id=blueprint_id)
        customizations = ModelCustomization.objects.filter(model_3d=model3d, user=request.user)
        serializer = ModelCustomizationSerializer(customizations, many=True)
        return Response(serializer.data)
    
    def post(self, request, blueprint_id, format=None):
        model3d = get_object_or_404(Model3D, blueprint_id=blueprint_id)
        
        # Add model_3d and user to the data
        data = request.data.copy()
        data['model_3d'] = model3d.id
        data['user'] = request.user.id
        
        serializer = ModelCustomizationSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomizationDetailAPI(APIView):
    """API endpoint for a specific customization"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, blueprint_id, customization_id, format=None):
        model3d = get_object_or_404(Model3D, blueprint_id=blueprint_id)
        customization = get_object_or_404(ModelCustomization, id=customization_id, model_3d=model3d)
        
        # Check if the user has permission to view this customization
        if customization.user != request.user and not request.user.is_staff:
            return Response({"detail": "You do not have permission to view this customization."}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        serializer = ModelCustomizationSerializer(customization)
        return Response(serializer.data)
    
    def put(self, request, blueprint_id, customization_id, format=None):
        model3d = get_object_or_404(Model3D, blueprint_id=blueprint_id)
        customization = get_object_or_404(
            ModelCustomization, 
            id=customization_id, 
            model_3d=model3d,
            user=request.user
        )
        
        serializer = ModelCustomizationSerializer(customization, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, blueprint_id, customization_id, format=None):
        model3d = get_object_or_404(Model3D, blueprint_id=blueprint_id)
        customization = get_object_or_404(
            ModelCustomization, 
            id=customization_id, 
            model_3d=model3d,
            user=request.user
        )
        
        customization.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Authentication and User Account Views
def register_view(request):
    """User registration page"""
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        # Extract form data
        username = request.POST.get('username')
        email = request.POST.get('email')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')
        
        errors = {}
        
        # Validate username
        if not username:
            errors['username'] = ['Username is required.']
        elif User.objects.filter(username=username).exists():
            errors['username'] = ['This username is already taken.']
        
        # Validate email
        if not email:
            errors['email'] = ['Email address is required.']
        elif User.objects.filter(email=email).exists():
            errors['email'] = ['This email is already in use.']
        
        # Validate passwords
        if not password1:
            errors['password1'] = ['Password is required.']
        elif len(password1) < 8:
            errors['password1'] = ['Password must be at least 8 characters long.']
        elif password1.isdigit():
            errors['password1'] = ['Password cannot be entirely numeric.']
        
        if not password2:
            errors['password2'] = ['Please confirm your password.']
        elif password1 != password2:
            errors['password2'] = ['Passwords do not match.']
        
        # If no errors, create user
        if not errors:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password1
            )
            
            # Create user profile
            UserProfile.objects.create(user=user)
            
            # Log in the user
            login(request, user)
            
            messages.success(request, f'Account created for {username}!')
            return redirect('dashboard')
        
        # If there are errors, re-render the form with error messages
        return render(request, 'auth/register.html', {
            'form': {'errors': errors}
        })
    
    return render(request, 'auth/register.html')


def login_view(request):
    """User login page"""
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            messages.success(request, f'Welcome back, {username}!')
            
            # Redirect to requested page or dashboard
            next_page = request.GET.get('next')
            if next_page:
                return redirect(next_page)
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid username or password.')
    
    return render(request, 'auth/login.html')


def logout_view(request):
    """Log out the user"""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('home')


@login_required
def profile_view(request):
    """User profile page"""
    if request.method == 'POST':
        email = request.POST.get('email')
        
        # Update email if changed
        if email and email != request.user.email:
            # Check if email is already in use
            if User.objects.filter(email=email).exclude(id=request.user.id).exists():
                messages.error(request, 'This email is already in use by another account.')
            else:
                request.user.email = email
                request.user.save()
                messages.success(request, 'Your profile has been updated successfully.')
        
        return redirect('profile')
    
    # Get user statistics
    total_blueprints = Blueprint.objects.filter(user=request.user).count()
    total_customizations = ModelCustomization.objects.filter(user=request.user).count()
    public_blueprints = Blueprint.objects.filter(user=request.user, is_public=True).count()
    
    context = {
        'total_blueprints': total_blueprints,
        'total_customizations': total_customizations,
        'public_blueprints': public_blueprints
    }
    
    return render(request, 'auth/profile.html', context)


@login_required
def change_password_view(request):
    """Change user password"""
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            # Update the session to prevent the user from being logged out
            update_session_auth_hash(request, user)
            messages.success(request, 'Your password has been changed successfully.')
            return redirect('profile')
        else:
            errors = {}
            for field in form.errors:
                errors[field] = form.errors[field]
            
            messages.error(request, 'Please correct the errors below.')
            
            # Get user statistics for the profile page
            total_blueprints = Blueprint.objects.filter(user=request.user).count()
            total_customizations = ModelCustomization.objects.filter(user=request.user).count()
            public_blueprints = Blueprint.objects.filter(user=request.user, is_public=True).count()
            
            context = {
                'total_blueprints': total_blueprints,
                'total_customizations': total_customizations,
                'public_blueprints': public_blueprints,
                'password_errors': errors
            }
            
            return render(request, 'auth/profile.html', context)
    
    return redirect('profile')


@login_required
def dashboard_view(request):
    """User dashboard showing their blueprints"""
    blueprints = Blueprint.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'auth/dashboard.html', {'blueprints': blueprints})


@login_required
def delete_blueprint(request, blueprint_id):
    """Delete a blueprint"""
    try:
        # Log the incoming request information
        print(f"Delete request received for blueprint ID: {blueprint_id}, Method: {request.method}")
        
        if request.method == 'POST':
            try:
                # Try to get the blueprint
                blueprint = get_object_or_404(Blueprint, id=blueprint_id, user=request.user)
                title = blueprint.title
                
                # Delete the blueprint and associated data
                blueprint.delete()
                
                # Add success message
                messages.success(request, f'Blueprint "{title}" has been deleted successfully.')
                print(f"Blueprint {blueprint_id} deleted successfully")
            except Exception as e:
                # Log any errors that occur during deletion
                print(f"Error deleting blueprint {blueprint_id}: {str(e)}")
                messages.error(request, f"Error deleting blueprint: {str(e)}")
        else:
            # If not POST, add a warning message
            messages.warning(request, "Invalid request method for deletion.")
            print(f"Invalid request method for deletion: {request.method}")
    except Exception as e:
        # Catch any other exceptions
        print(f"Unexpected error in delete_blueprint: {str(e)}")
        messages.error(request, f"An unexpected error occurred: {str(e)}")
    
    # Redirect back to dashboard in all cases
    return redirect('dashboard')


@login_required
def toggle_public(request, blueprint_id):
    """Toggle a blueprint's public status"""
    if request.method == 'POST':
        blueprint = get_object_or_404(Blueprint, id=blueprint_id, user=request.user)
        blueprint.is_public = not blueprint.is_public
        blueprint.save()
        
        status = "public" if blueprint.is_public else "private"
        messages.success(request, f'Blueprint "{blueprint.title}" is now {status}.')
    
    return redirect('dashboard')
