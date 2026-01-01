document.addEventListener('DOMContentLoaded', function() {
    // Blueprint upload form handling
    const form = document.getElementById('blueprintForm');
    const fileInput = document.querySelector('input[type="file"]');
    
    if (form) {
        // Add event listener for file selection to check file size before submission
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const fileName = file.name.toLowerCase();
                const validExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
                const fileExt = fileName.split('.').pop();
                
                let isValid = false;
                for (let ext of validExtensions) {
                    if (fileExt === ext) {
                        isValid = true;
                        break;
                    }
                }
                
                if (!isValid) {
                    alert('Please select a valid file (JPG, PNG, or PDF).');
                    fileInput.value = '';
                    return;
                }
                
                // Validate file size (max 5MB)
                const maxSize = 5 * 1024 * 1024; // 5MB in bytes
                if (file.size > maxSize) {
                    alert('File size exceeds the 5MB limit. Please select a smaller file.');
                    fileInput.value = '';
                    return;
                }
            }
        });
        
        // Add submit handler for AJAX upload (if needed)
        // Uncomment this section if you want to use AJAX for the upload
        /*
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
            submitBtn.disabled = true;
            
            fetch('/api/upload/', {
                method: 'POST',
                body: formData,
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Redirect to processing page
                window.location.href = `/processing/${data.blueprint_id}/`;
            })
            .catch(error => {
                // Handle errors
                console.error('Error:', error);
                alert('An error occurred during upload. Please try again.');
                
                // Reset button
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            });
        });
        */
    }
});
