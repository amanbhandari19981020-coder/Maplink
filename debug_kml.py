#!/usr/bin/env python3

from fastkml import kml
from lxml import etree
import traceback

def debug_kml_parsing():
    try:
        # Read the KML file
        with open('/tmp/sample_field.kml', 'rb') as f:
            kml_content = f.read()
        
        print("KML Content:")
        print(kml_content.decode('utf-8'))
        print("\n" + "="*50 + "\n")
        
        # Parse with fastkml
        k = kml.KML()
        k.from_string(kml_content)
        
        print("KML parsed successfully")
        
        coordinates = []
        
        # Iterate through KML features
        for feature in k.features:
            print(f"Feature: {feature}")
            print(f"Feature type: {type(feature)}")
            
            for placemark in feature.features:
                print(f"Placemark: {placemark}")
                print(f"Placemark type: {type(placemark)}")
                
                if hasattr(placemark, 'geometry') and placemark.geometry:
                    geom = placemark.geometry
                    print(f"Geometry: {geom}")
                    print(f"Geometry type: {geom.geom_type}")
                    
                    # Handle Polygon
                    if geom.geom_type == 'Polygon':
                        print("Processing Polygon")
                        print(f"Exterior: {geom.exterior}")
                        print(f"Exterior type: {type(geom.exterior)}")
                        
                        coords = geom.exterior.coords
                        print(f"Coords: {coords}")
                        print(f"Coords type: {type(coords)}")
                        
                        for i, coord in enumerate(coords):
                            print(f"Coord {i}: {coord} (type: {type(coord)})")
                            coordinates.append({'lat': coord[1], 'lng': coord[0]})
        
        print(f"\nFinal coordinates: {coordinates}")
        return coordinates
        
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        return []

if __name__ == "__main__":
    debug_kml_parsing()