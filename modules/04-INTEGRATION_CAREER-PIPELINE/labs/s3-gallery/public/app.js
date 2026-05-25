document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadProgressList = document.getElementById('upload-progress-list');
  const galleryGrid = document.getElementById('gallery-grid');
  const emptyState = document.getElementById('empty-state');
  const imageCount = document.getElementById('image-count');
  const refreshBtn = document.getElementById('refresh-btn');
  
  // Lightbox Elements
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const downloadLink = document.getElementById('download-link');
  const modalDeleteBtn = document.getElementById('modal-delete-btn');
  const closeModal = document.querySelector('.close-modal');

  let currentImages = [];
  let activeImageKey = null;

  // Initialize
  fetchImages();

  // Event Listeners
  refreshBtn.addEventListener('click', fetchImages);

  // Click on drop zone triggers file input
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = ''; // Reset uploader input
  });

  // Drag & Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  });

  // Lightbox Close Events
  closeModal.addEventListener('click', hideLightbox);
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) hideLightbox();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal.classList.contains('show')) {
      hideLightbox();
    }
  });

  modalDeleteBtn.addEventListener('click', () => {
    if (activeImageKey) {
      if (confirm(`Are you sure you want to delete this image from S3?`)) {
        deleteImage(activeImageKey);
        hideLightbox();
      }
    }
  });

  // Functions

  // Fetch all images from Bun server
  async function fetchImages() {
    refreshBtn.disabled = true;
    const syncIcon = refreshBtn.querySelector('.refresh-icon');
    if (syncIcon) syncIcon.style.transform = 'rotate(360deg)';

    try {
      const response = await fetch('/api/images');
      if (!response.ok) throw new Error('Failed to fetch images from server');
      
      const data = await response.json();
      currentImages = data.images || [];
      renderGallery(currentImages);
      showToast(`Successfully synced with S3 bucket`, 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Error connecting to backend', 'error');
    } finally {
      refreshBtn.disabled = false;
      if (syncIcon) syncIcon.style.transform = '';
    }
  }

  // Render gallery grid
  function renderGallery(images) {
    galleryGrid.innerHTML = '';
    imageCount.textContent = `${images.length} object${images.length === 1 ? '' : 's'}`;

    if (images.length === 0) {
      emptyState.style.display = 'flex';
      galleryGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    galleryGrid.style.display = 'grid';

    images.forEach(img => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      
      // We will parse key to show a user-friendly name
      const displayName = img.key.split('/').pop();

      card.innerHTML = `
        <div class="image-wrapper">
          <img src="${img.url}" alt="${displayName}" class="gallery-image" loading="lazy">
          <div class="gallery-card-overlay">
            <div class="card-details">
              <span class="image-name" title="${img.key}">${displayName}</span>
              <div class="image-actions">
                <button class="card-icon-btn delete-btn" data-key="${img.key}">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Click card to open lightbox
      card.addEventListener('click', (e) => {
        // Prevent click if clicking the delete button
        if (e.target.closest('.delete-btn')) return;
        showLightbox(img);
      });

      // Delete action
      const deleteBtn = card.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete image "${displayName}" from S3?`)) {
          deleteImage(img.key);
        }
      });

      galleryGrid.appendChild(card);
    });
  }

  // Handle files selected/dropped
  function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast(`File "${file.name}" is not an image`, 'error');
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File "${file.name}" exceeds 10MB limit`, 'error');
        return;
      }
      
      uploadFile(file);
    });
  }

  // Upload file using XMLHttpRequest for progress tracking
  function uploadFile(file) {
    // Generate unique ID for progress element
    const uploadId = 'up-' + Math.random().toString(36).substr(2, 9);
    
    // Create progress list item
    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';
    progressItem.id = uploadId;
    
    progressItem.innerHTML = `
      <div class="progress-info">
        <span class="file-name">${file.name}</span>
        <span class="file-status">0%</span>
      </div>
      <div class="progress-bar-wrapper">
        <div class="progress-bar"></div>
      </div>
    `;
    
    uploadProgressList.appendChild(progressItem);
    
    const progressBar = progressItem.querySelector('.progress-bar');
    const fileStatus = progressItem.querySelector('.file-status');

    // Create Form Data
    const formData = new FormData();
    formData.append('file', file);

    // XHR Request
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percentComplete + '%';
        fileStatus.textContent = percentComplete + '%';
      }
    });

    // Request completed
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        progressItem.classList.add('complete');
        fileStatus.textContent = 'Uploaded';
        showToast(`Successfully uploaded "${file.name}" to S3`, 'success');
        
        // Remove progress item after a short delay and refresh gallery
        setTimeout(() => {
          progressItem.remove();
          fetchImages();
        }, 1500);
      } else {
        let errMsg = 'Upload failed';
        try {
          const response = JSON.parse(xhr.responseText);
          errMsg = response.error || errMsg;
        } catch(e) {}
        
        handleUploadError(progressItem, fileStatus, progressBar, errMsg);
      }
    });

    // Request failed
    xhr.addEventListener('error', () => {
      handleUploadError(progressItem, fileStatus, progressBar, 'Network error during upload');
    });

    xhr.send(formData);
  }

  function handleUploadError(item, statusEl, progressEl, message) {
    item.classList.add('error');
    statusEl.textContent = 'Failed';
    progressEl.style.width = '100%';
    showToast(message, 'error');
    
    // Remove failed item after 4 seconds
    setTimeout(() => {
      item.remove();
    }, 4000);
  }

  // Delete image from S3
  async function deleteImage(key) {
    try {
      const response = await fetch(`/api/images?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete object from S3');
      }

      showToast(`Deleted object "${key.split('/').pop()}" from S3`, 'success');
      fetchImages();
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    }
  }

  // Lightbox controls
  function showLightbox(img) {
    activeImageKey = img.key;
    const displayName = img.key.split('/').pop();
    
    lightboxImg.src = img.url;
    lightboxCaption.textContent = displayName;
    downloadLink.href = img.url;
    downloadLink.setAttribute('download', displayName);
    
    lightboxModal.classList.add('show');
  }

  function hideLightbox() {
    lightboxModal.classList.remove('show');
    activeImageKey = null;
    // Clear src after fade out to avoid flashing old image on next open
    setTimeout(() => {
      lightboxImg.src = '';
    }, 250);
  }

  // Toast notifications
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '✨';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    toastContainer.appendChild(toast);
    
    // Trigger transition
    setTimeout(() => toast.classList.add('show'), 50);

    // Remove toast after 4 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      // Wait for exit transition to complete before removing from DOM
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }
});
