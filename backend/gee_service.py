"""
Google Earth Engine Service
Handles satellite imagery processing and health index calculations
"""
import os
import ee
import logging
from typing import Dict, List, Tuple
import numpy as np
from PIL import Image
import io
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class GEEService:
    """Service for Google Earth Engine operations"""
    
    def __init__(self):
        self.initialized = False
        self.credentials_path = os.environ.get('GEE_SERVICE_ACCOUNT_KEY', '/app/backend/gee-credentials.json')
        
    def initialize(self):
        """Initialize Earth Engine with service account credentials"""
        if self.initialized:
            return True
            
        try:
            if not os.path.exists(self.credentials_path):
                logger.warning(f"GEE credentials not found at {self.credentials_path}")
                logger.info("GEE service will run in mock mode until credentials are provided")
                return False
            
            # Load service account credentials
            with open(self.credentials_path, 'r') as f:
                credentials_info = json.load(f)
            
            credentials = ee.ServiceAccountCredentials(
                credentials_info['client_email'],
                self.credentials_path
            )
            
            ee.Initialize(credentials)
            self.initialized = True
            logger.info("Google Earth Engine initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize GEE: {str(e)}")
            return False
    
    def get_sentinel_imagery(self, coordinates: List[Dict], buffer_meters: int = 10):
        """
        Fetch latest Sentinel-1 and Sentinel-2 imagery for field coordinates
        
        Args:
            coordinates: List of {lat, lng} dictionaries defining field boundary
            buffer_meters: Buffer around field boundary in meters
            
        Returns:
            Dict containing Sentinel-1 and Sentinel-2 images
        """
        if not self.initialized and not self.initialize():
            return self._mock_imagery_response(coordinates)
        
        try:
            # Convert coordinates to ee.Geometry
            coords_list = [[coord['lng'], coord['lat']] for coord in coordinates]
            coords_list.append(coords_list[0])  # Close the polygon
            
            geometry = ee.Geometry.Polygon(coords_list).buffer(buffer_meters)
            
            # Get latest Sentinel-2 (optical)
            s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(geometry) \
                .filterDate(ee.Date.fromYMD(2024, 1, 1), ee.Date(Date.now())) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
                .sort('system:time_start', False) \
                .first()
            
            # Get latest Sentinel-1 (SAR)
            s1 = ee.ImageCollection('COPERNICUS/S1_GRD') \
                .filterBounds(geometry) \
                .filterDate(ee.Date.fromYMD(2024, 1, 1), ee.Date(Date.now())) \
                .filter(ee.Filter.eq('instrumentMode', 'IW')) \
                .select(['VV', 'VH']) \
                .sort('system:time_start', False) \
                .first()
            
            return {
                'sentinel_2': s2,
                'sentinel_1': s1,
                'geometry': geometry
            }
            
        except Exception as e:
            logger.error(f"Error fetching Sentinel imagery: {str(e)}")
            return None
    
    def calculate_indices(self, s2_image, geometry):
        """
        Calculate vegetation and health indices from Sentinel-2 image
        
        Indices calculated:
        - NDVI: Normalized Difference Vegetation Index
        - NDWI: Normalized Difference Water Index
        - EVI: Enhanced Vegetation Index
        - SAVI: Soil Adjusted Vegetation Index
        - NDRE: Normalized Difference Red Edge
        - GNDVI: Green Normalized Difference Vegetation Index
        """
        if not self.initialized:
            return self._mock_indices_response()
        
        try:
            # Band selection
            nir = s2_image.select('B8')   # Near Infrared
            red = s2_image.select('B4')   # Red
            green = s2_image.select('B3')  # Green
            blue = s2_image.select('B2')   # Blue
            red_edge = s2_image.select('B5')  # Red Edge
            swir = s2_image.select('B11')  # SWIR
            
            # NDVI: (NIR - Red) / (NIR + Red)
            ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
            
            # NDWI: (Green - NIR) / (Green + NIR)
            ndwi = green.subtract(nir).divide(green.add(nir)).rename('NDWI')
            
            # EVI: 2.5 * ((NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1))
            evi = nir.subtract(red).divide(
                nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1)
            ).multiply(2.5).rename('EVI')
            
            # SAVI: ((NIR - Red) / (NIR + Red + 0.5)) * 1.5
            savi = nir.subtract(red).divide(
                nir.add(red).add(0.5)
            ).multiply(1.5).rename('SAVI')
            
            # NDRE: (NIR - RedEdge) / (NIR + RedEdge)
            ndre = nir.subtract(red_edge).divide(nir.add(red_edge)).rename('NDRE')
            
            # GNDVI: (NIR - Green) / (NIR + Green)
            gndvi = nir.subtract(green).divide(nir.add(green)).rename('GNDVI')
            
            # Clip to geometry
            indices = {
                'ndvi': ndvi.clip(geometry),
                'ndwi': ndwi.clip(geometry),
                'evi': evi.clip(geometry),
                'savi': savi.clip(geometry),
                'ndre': ndre.clip(geometry),
                'gndvi': gndvi.clip(geometry)
            }
            
            return indices
            
        except Exception as e:
            logger.error(f"Error calculating indices: {str(e)}")
            return None
    
    def generate_tile_url(self, image, vis_params):
        """Generate tile URL for displaying on map"""
        if not self.initialized:
            return None
            
        try:
            map_id = image.getMapId(vis_params)
            return map_id['tile_fetcher'].url_format
        except Exception as e:
            logger.error(f"Error generating tile URL: {str(e)}")
            return None
    
    def _mock_imagery_response(self, coordinates):
        """Return mock response when GEE is not initialized"""
        logger.info("Returning mock imagery response - GEE not initialized")
        return {
            'mock': True,
            'message': 'GEE credentials not configured. Please add credentials to enable real-time satellite analysis.'
        }
    
    def _mock_indices_response(self):
        """Return mock indices response"""
        return {
            'mock': True,
            'indices': ['NDVI', 'NDWI', 'EVI', 'SAVI', 'NDRE', 'GNDVI'],
            'message': 'Mock data - configure GEE credentials for real analysis'
        }
    
    def get_field_analysis(self, field_id: str, coordinates: List[Dict]) -> Dict:
        """
        Complete analysis pipeline for a field
        
        Returns tile URLs for each index layer that can be displayed on frontend map
        """
        if not self.initialized and not self.initialize():
            return {
                'status': 'pending',
                'message': 'GEE service not available. Add credentials at: /app/backend/gee-credentials.json',
                'required_format': {
                    'type': 'service_account',
                    'project_id': 'your-project-id',
                    'private_key': 'your-private-key',
                    'client_email': 'your-service-account@your-project.iam.gserviceaccount.com'
                }
            }
        
        try:
            # Fetch imagery
            imagery = self.get_sentinel_imagery(coordinates)
            if not imagery or 'sentinel_2' not in imagery:
                return {'status': 'error', 'message': 'Failed to fetch satellite imagery'}
            
            # Calculate indices
            indices = self.calculate_indices(imagery['sentinel_2'], imagery['geometry'])
            if not indices:
                return {'status': 'error', 'message': 'Failed to calculate indices'}
            
            # Generate tile URLs for each index
            tile_urls = {}
            
            # Visualization parameters for each index (Red to Green gradient)
            vis_params = {
                'ndvi': {'min': -1, 'max': 1, 'palette': ['red', 'yellow', 'green']},
                'ndwi': {'min': -1, 'max': 1, 'palette': ['red', 'yellow', 'blue']},
                'evi': {'min': -1, 'max': 1, 'palette': ['red', 'yellow', 'green']},
                'savi': {'min': -1, 'max': 1, 'palette': ['red', 'yellow', 'green']},
                'ndre': {'min': -1, 'max': 1, 'palette': ['red', 'yellow', 'green']},
                'gndvi': {'min': -1, 'max': 1, 'palette': ['red', 'yellow', 'green']}
            }
            
            for index_name, index_image in indices.items():
                tile_url = self.generate_tile_url(index_image, vis_params[index_name])
                if tile_url:
                    tile_urls[index_name] = tile_url
            
            return {
                'status': 'success',
                'field_id': field_id,
                'tile_urls': tile_urls,
                'indices': list(indices.keys())
            }
            
        except Exception as e:
            logger.error(f"Error in field analysis: {str(e)}")
            return {'status': 'error', 'message': str(e)}


# Global instance
gee_service = GEEService()
