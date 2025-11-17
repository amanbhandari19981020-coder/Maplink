"""
Satellite Imagery Processing Service
Processes Planet SkySat GeoTIFF imagery from Google Drive
"""
import os
import logging
import numpy as np
from PIL import Image
import rasterio
from rasterio.warp import transform_bounds
import requests
import tempfile
from typing import Dict, List, Optional, Tuple
import io
import base64

logger = logging.getLogger(__name__)

class ImageryService:
    """Service for processing satellite imagery from Google Drive"""
    
    def __init__(self):
        # Base Google Drive folder URL (set via environment variable)
        self.drive_folder_url = os.environ.get('GDRIVE_IMAGERY_FOLDER', '')
        self.imagery_cache = {}
        
    def get_field_imagery_url(self, field_id: str) -> str:
        """
        Construct Google Drive direct download URL for field imagery
        Expected filename format: {field_id}.tif
        """
        # If user provides a folder link, we'll need the file ID
        # For now, expect direct file links in database or construct from folder
        return f"{self.drive_folder_url}/{field_id}.tif"
    
    def download_imagery(self, drive_url: str) -> Optional[str]:
        """
        Download GeoTIFF from Google Drive
        
        Args:
            drive_url: Google Drive sharing URL or direct download URL
            
        Returns:
            Path to downloaded temporary file
        """
        try:
            # Convert sharing URL to direct download URL if needed
            if 'drive.google.com' in drive_url and '/file/d/' in drive_url:
                file_id = drive_url.split('/file/d/')[1].split('/')[0]
                download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
            else:
                download_url = drive_url
            
            logger.info(f"Downloading imagery from: {download_url}")
            
            # Download with requests
            response = requests.get(download_url, stream=True, timeout=60)
            response.raise_for_status()
            
            # Save to temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.tif')
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
            
            temp_file.close()
            logger.info(f"Imagery downloaded to: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Error downloading imagery: {str(e)}")
            return None
    
    def read_geotiff(self, file_path: str) -> Optional[Dict]:
        """
        Read Planet SkySat GeoTIFF and extract bands
        
        Planet SkySat bands:
        Band 1: Blue
        Band 2: Green  
        Band 3: Red
        Band 4: NIR (Near Infrared)
        
        Returns:
            Dict with band arrays and metadata
        """
        try:
            with rasterio.open(file_path) as src:
                # Read all bands
                bands = src.read()
                
                # Planet SkySat has 4 bands
                if bands.shape[0] < 4:
                    logger.error(f"Expected 4 bands, got {bands.shape[0]}")
                    return None
                
                blue = bands[0].astype(float)
                green = bands[1].astype(float)
                red = bands[2].astype(float)
                nir = bands[3].astype(float)
                
                metadata = {
                    'bounds': src.bounds,
                    'crs': str(src.crs),
                    'transform': src.transform,
                    'width': src.width,
                    'height': src.height
                }
                
                logger.info(f"Read GeoTIFF: {src.width}x{src.height}, {bands.shape[0]} bands")
                
                return {
                    'blue': blue,
                    'green': green,
                    'red': red,
                    'nir': nir,
                    'metadata': metadata
                }
                
        except Exception as e:
            logger.error(f"Error reading GeoTIFF: {str(e)}")
            return None
    
    def calculate_indices(self, bands: Dict) -> Dict[str, np.ndarray]:
        """
        Calculate all vegetation and health indices
        
        Returns dict with index name as key and numpy array as value
        """
        try:
            blue = bands['blue']
            green = bands['green']
            red = bands['red']
            nir = bands['nir']
            
            # Avoid division by zero
            epsilon = 1e-10
            
            # NDVI: (NIR - Red) / (NIR + Red)
            ndvi = (nir - red) / (nir + red + epsilon)
            
            # NDWI: (Green - NIR) / (Green + NIR)
            ndwi = (green - nir) / (green + nir + epsilon)
            
            # EVI: 2.5 * ((NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1))
            evi = 2.5 * ((nir - red) / (nir + 6*red - 7.5*blue + 1 + epsilon))
            
            # SAVI: ((NIR - Red) / (NIR + Red + 0.5)) * 1.5
            savi = ((nir - red) / (nir + red + 0.5 + epsilon)) * 1.5
            
            # NDRE: For Planet SkySat, we approximate using Red and NIR
            # True NDRE needs Red Edge band which Planet SkySat doesn't have
            # Using NIR and Red as approximation
            ndre = (nir - red) / (nir + red + epsilon)
            
            # GNDVI: (NIR - Green) / (NIR + Green)
            gndvi = (nir - green) / (nir + green + epsilon)
            
            logger.info("Calculated all vegetation indices")
            
            return {
                'ndvi': ndvi,
                'ndwi': ndwi,
                'evi': evi,
                'savi': savi,
                'ndre': ndre,
                'gndvi': gndvi
            }
            
        except Exception as e:
            logger.error(f"Error calculating indices: {str(e)}")
            return {}
    
    def create_colored_overlay(self, index_array: np.ndarray, index_name: str) -> str:
        """
        Create colored image overlay from index array
        Red (bad/low) to Green (good/high) gradient
        
        Returns:
            Base64 encoded PNG image
        """
        try:
            # Normalize to 0-1 range
            # Most indices range from -1 to 1
            normalized = (index_array + 1) / 2  # Map -1,1 to 0,1
            normalized = np.clip(normalized, 0, 1)
            
            # Create RGB image with Red-Yellow-Green gradient
            # Red (low) -> Yellow (medium) -> Green (high)
            height, width = normalized.shape
            rgb_image = np.zeros((height, width, 4), dtype=np.uint8)  # RGBA
            
            # Red channel: high at low values, low at high values
            rgb_image[:, :, 0] = ((1 - normalized) * 255).astype(np.uint8)
            
            # Green channel: increases with value
            rgb_image[:, :, 1] = (normalized * 255).astype(np.uint8)
            
            # Blue channel: stay at 0
            rgb_image[:, :, 2] = 0
            
            # Alpha channel: 180 for semi-transparency
            rgb_image[:, :, 3] = 180
            
            # Convert to PIL Image
            img = Image.fromarray(rgb_image, mode='RGBA')
            
            # Resize for reasonable file size (max 1024px)
            max_dimension = 1024
            if max(width, height) > max_dimension:
                scale = max_dimension / max(width, height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG', optimize=True)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            logger.info(f"Created colored overlay for {index_name}: {img.size}")
            return img_base64
            
        except Exception as e:
            logger.error(f"Error creating colored overlay: {str(e)}")
            return ""
    
    def process_field_imagery(self, field_id: str, drive_url: str) -> Dict:
        """
        Complete processing pipeline for field imagery
        
        Args:
            field_id: Field ID
            drive_url: Google Drive URL to GeoTIFF
            
        Returns:
            Dict with base64 encoded overlays for each index
        """
        try:
            # Download imagery
            file_path = self.download_imagery(drive_url)
            if not file_path:
                return {
                    'status': 'error',
                    'message': f'Failed to download imagery for field {field_id}. Please check the Google Drive URL.'
                }
            
            # Read GeoTIFF
            bands = self.read_geotiff(file_path)
            if not bands:
                os.unlink(file_path)
                return {
                    'status': 'error',
                    'message': f'Failed to read GeoTIFF. Ensure the file is a valid Planet SkySat image with 4 bands.'
                }
            
            # Calculate indices
            indices = self.calculate_indices(bands)
            if not indices:
                os.unlink(file_path)
                return {
                    'status': 'error',
                    'message': 'Failed to calculate vegetation indices.'
                }
            
            # Create colored overlays for each index
            overlays = {}
            for index_name, index_array in indices.items():
                overlay_base64 = self.create_colored_overlay(index_array, index_name)
                if overlay_base64:
                    overlays[index_name] = f"data:image/png;base64,{overlay_base64}"
            
            # Cleanup temporary file
            os.unlink(file_path)
            
            logger.info(f"Successfully processed imagery for field {field_id}")
            
            return {
                'status': 'success',
                'field_id': field_id,
                'overlays': overlays,
                'metadata': bands['metadata'],
                'indices': list(overlays.keys())
            }
            
        except Exception as e:
            logger.error(f"Error processing field imagery: {str(e)}")
            return {
                'status': 'error',
                'message': f'Unexpected error: {str(e)}'
            }


# Global instance
imagery_service = ImageryService()
