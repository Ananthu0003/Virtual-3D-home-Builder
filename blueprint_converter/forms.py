from django import forms
from .models import Blueprint

class BlueprintUploadForm(forms.ModelForm):
    class Meta:
        model = Blueprint
        fields = ['title', 'image']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter a title for your blueprint'}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
        }

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            # Check file extension
            ext = image.name.split('.')[-1].lower()
            if ext not in ['jpg', 'jpeg', 'png', 'pdf']:
                raise forms.ValidationError("Only JPG, PNG, and PDF files are allowed.")
            
            # Check file size (limit to 5MB)
            if image.size > 5 * 1024 * 1024:
                raise forms.ValidationError("File size must be under 5MB.")
                
        return image
