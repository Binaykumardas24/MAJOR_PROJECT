import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

const ImageCropModal = ({ image, onClose, onSave }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    // You would use a utility to get the cropped image from the canvas
    // For now, just pass the original image
    onSave(image);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Edit Profile Image</h3>
        <div style={{ position: 'relative', width: 300, height: 300, background: '#222' }}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Zoom: <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
          <label style={{ marginLeft: 16 }}>Rotate: <input type="range" min={0} max={360} value={rotation} onChange={e => setRotation(Number(e.target.value))} /></label>
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} style={{ background: '#4b6cb7', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px' }}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
