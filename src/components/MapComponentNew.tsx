import { useState, useEffect, useRef, useCallback } from 'react';
import * as atlas from 'azure-maps-control';
import "azure-maps-control/dist/atlas.min.css";
import type { Therapist, Client, TherapistWithCoordinates, ClientWithCoordinates } from '../types';
import { mapGeocodingService, GeocodingError } from '../services/mapGeocodingService';
import { useError } from '../contexts/ErrorContext';

// Azure Maps configuration - simplest authentication
const AZURE_MAPS_ID = 'ba028836-3eda-4de5-97e6-a16e234bbeda';
const AZURE_TENANT_ID = 'b6e75610-9c5f-4a42-85a6-6f3738f10d03';
const AZURE_CLIENT_ID = 'eb61b451-ec10-4fea-aa48-35811e280fc0';

interface MapComponentProps {
  therapists: Therapist[];
  clients: Client[];
  onTherapistClick?: (therapist: Therapist) => void;
  onClientClick?: (client: Client) => void;
  selectedTherapistId?: string;
  selectedClientId?: string;
}

export default function MapComponent({
  therapists,
  clients,
  onTherapistClick,
  onClientClick,
  selectedTherapistId,
  selectedClientId,
}: MapComponentProps) {  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<atlas.Map | null>(null);
  const mapReadyPromiseRef = useRef<Promise<atlas.Map> | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string>('');
  const [therapistsWithCoords, setTherapistsWithCoords] = useState<TherapistWithCoordinates[]>([]);
  const [clientsWithCoords, setClientsWithCoords] = useState<ClientWithCoordinates[]>([]);
  const [isLoadingCoordinates, setIsLoadingCoordinates] = useState(false);
  const { showError } = useError();

  // Geocode therapists and clients when data changes
  useEffect(() => {
    async function geocodeData() {
      if (therapists.length === 0 && clients.length === 0) return;
      
      setIsLoadingCoordinates(true);
      try {
        console.log('🗺️  Geocoding therapists and clients...');
        
        const [therapistsWithCoordinates, clientsWithCoordinates] = await Promise.all([
          mapGeocodingService.addCoordinatesToTherapists(therapists),
          mapGeocodingService.addCoordinatesToClients(clients)
        ]);
        
        setTherapistsWithCoords(therapistsWithCoordinates);
        setClientsWithCoords(clientsWithCoordinates);
          console.log(`✅ Geocoded ${therapistsWithCoordinates.length} therapists and ${clientsWithCoordinates.length} clients`);
      } catch (error) {
        console.error('❌ Failed to geocode data:', error);
        
        // Show user-friendly error modal
        if (error instanceof GeocodingError) {
          showError({
            title: 'Address Lookup Failed',
            message: `We couldn't find the location for "${mapGeocodingService.formatAddressForDisplay ? mapGeocodingService.formatAddressForDisplay(error.address) : 'an address'}"`,
            details: error.details,
            type: 'geocoding',
            actions: [
              {
                label: 'Retry',
                action: () => geocodeData(),
                variant: 'primary'
              },
              {
                label: 'Clear Cache',
                action: () => {
                  mapGeocodingService.clearCache();
                  geocodeData();
                },
                variant: 'secondary'
              }
            ]
          });
        } else {
          showError({
            title: 'Map Loading Error',
            message: 'Failed to load address locations for the map',
            details: error instanceof Error ? error.message : String(error),
            type: 'api',
            actions: [
              {
                label: 'Retry',
                action: () => geocodeData(),
                variant: 'primary'
              }
            ]
          });
        }
        
        setMapError(`Failed to geocode addresses: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoadingCoordinates(false);
      }
    }    geocodeData();
  }, [therapists, clients, showError]);

  // Calculate optimal map center and zoom based on data points
  const getOptimalMapView = useCallback(() => {
    const allPoints = [...therapistsWithCoords, ...clientsWithCoords];
    
    if (allPoints.length === 0) {
      return { center: [-98.5795, 39.8283], zoom: 4 }; // Default to center of US
    }

    // Calculate bounding box of all points
    const lats = allPoints.map(p => p.latitude);
    const lons = allPoints.map(p => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    
    // Calculate span to determine appropriate zoom level
    const latSpan = maxLat - minLat;
    const lonSpan = maxLon - minLon;
    const maxSpan = Math.max(latSpan, lonSpan);
    
    // Determine zoom level based on span (rough approximation)
    let zoom = 10;
    if (maxSpan > 10) zoom = 4;
    else if (maxSpan > 5) zoom = 6;
    else if (maxSpan > 2) zoom = 8;
    else if (maxSpan > 1) zoom = 10;
    else if (maxSpan > 0.5) zoom = 12;
    else zoom = 14;
    
    return { center: [centerLon, centerLat], zoom };
  }, [therapistsWithCoords, clientsWithCoords]);

  // Initialize Azure Maps with simple Entra authentication
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initializeMap = () => {
      try {
        console.log('Initializing Azure Maps...');
        
        const { center, zoom } = getOptimalMapView();

        const map = new atlas.Map(mapRef.current!, {
          center,
          zoom,
          style: 'road',
          authOptions: {
            authType: atlas.AuthenticationType.aad,
            clientId: AZURE_MAPS_ID,
            aadAppId: AZURE_CLIENT_ID,
            aadTenant: AZURE_TENANT_ID || 'common'
          }
        });        map.events.add('ready', () => {
          console.log('Azure Maps ready!');
          // Set ready state immediately
          setIsMapReady(true);
        });

        map.events.add('error', (error) => {
          console.error('Azure Maps error:', error);
          setMapError(`Map initialization failed: ${error}`);
        });

        mapInstanceRef.current = map;

      } catch (error) {
        console.error('Failed to initialize Azure Maps:', error);
        setMapError(`Failed to initialize map: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    initializeMap();

    return () => {
      mapInstanceRef.current?.dispose();
      mapInstanceRef.current = null;
    };
  }, [getOptimalMapView]);  // Update map markers when geocoded data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || (therapistsWithCoords.length === 0 && clientsWithCoords.length === 0)) return;

    const addSourcesAndLayers = async () => {
      try {
        // Wait for the map ready promise if it exists
        if (mapReadyPromiseRef.current) {
          await mapReadyPromiseRef.current;
        }

        const map = mapInstanceRef.current;
        if (!map) return;

        // Add an additional delay to ensure the map is completely ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Triple-check the map is truly ready for sources
        if (!map.sources) {
          console.log('⏳ Map sources not available yet, skipping...');
          return;
        }console.log('🗺️ Adding sources and layers to map...');

        const dataSource = new atlas.source.DataSource();
        
        try {
          // Additional safety check - ensure the map sources collection exists
          if (!map.sources || typeof map.sources.add !== 'function') {
            console.warn('⚠️ Map sources not ready, skipping source addition');
            return;
          }
          
          map.sources.add(dataSource);
          console.log('✅ Data source added successfully');
        } catch (error) {
          console.error('❌ Failed to add data source to map:', error);
          return;
        }

        // Create popup for hover information
        const popup = new atlas.Popup({
          pixelOffset: [0, -18],
          closeButton: false
        });

    // Add therapist markers with enhanced data
    therapistsWithCoords.forEach((therapist) => {
      console.log(`🩺 Adding therapist "${therapist.name}" at coordinates:`, {
        latitude: therapist.latitude,
        longitude: therapist.longitude,
        address: `${therapist.address.street1}, ${therapist.address.city}, ${therapist.address.state}`
      });
      
      // Debug Farmington Hills address specifically
      if (therapist.address.city?.toLowerCase().includes('farmington')) {
        console.warn('🔍 FARMINGTON HILLS COORDINATES (ON-DEMAND GEOCODING):', {
          therapistName: therapist.name,
          geocodedLatitude: therapist.latitude,
          geocodedLongitude: therapist.longitude,
          expectedLat: 'Should be around 42.4814', // Farmington Hills is around 42.4814, -83.3753
          expectedLon: 'Should be around -83.3753',
          actualAddress: `${therapist.address.street1}, ${therapist.address.city}, ${therapist.address.state} ${therapist.address.zipCode}`,
          isCorrect: Math.abs(therapist.latitude - 42.4814) < 1 && Math.abs(therapist.longitude - (-83.3753)) < 1 ? '✅ Correct location' : '❌ Wrong location'
        });
      }
      
      const point = new atlas.data.Point([therapist.longitude, therapist.latitude]);
      const feature = new atlas.data.Feature(point, {
        id: therapist.id,
        type: 'therapist',
        name: therapist.name,
        isPaired: therapist.isPaired,
        availability: therapist.availability,
        notes: therapist.notes || '',
        specializations: therapist.specializations?.join(', ') || '',
        email: therapist.email || '',
        phone: therapist.phone || '',
        address: `${therapist.address.street1}, ${therapist.address.city}, ${therapist.address.state}`,
        status: therapist.isPaired ? 'Paired' : 'Available'
      });
      dataSource.add(feature);
    });

    // Add client markers with enhanced data
    clientsWithCoords.forEach((client) => {
      console.log(`👤 Adding client "${client.name}" at coordinates:`, {
        latitude: client.latitude,
        longitude: client.longitude,
        address: `${client.address.street1}, ${client.address.city}, ${client.address.state}`
      });
      
      const point = new atlas.data.Point([client.longitude, client.latitude]);
      const feature = new atlas.data.Feature(point, {
        id: client.id,
        type: 'client',
        name: client.name,
        status: client.status,
        priority: client.priority,
        needsAssessment: client.needsAssessment || '',
        email: client.email || '',
        phone: client.phone || '',
        address: `${client.address.street1}, ${client.address.city}, ${client.address.state}`,
        priorityLabel: client.priority.toUpperCase()
      });
      dataSource.add(feature);
    });

    // Create symbol layer for therapists with enhanced styling
    const therapistLayer = new atlas.layer.SymbolLayer(dataSource, undefined, {
      filter: ['==', ['get', 'type'], 'therapist'],
      iconOptions: {
        image: 'pin-round-blue',
        size: 0.9,
        color: [
          'case',
          ['get', 'isPaired'], '#22c55e', // green for paired
          '#3b82f6' // blue for available
        ],
      },
      textOptions: {
        textField: ['get', 'name'],
        offset: [0, 1.8],
        size: 12,
        color: '#1f2937',
        haloColor: 'white',
        haloWidth: 2,
        font: ['StandardFont-Bold']
      },
    });

    // Create symbol layer for clients with enhanced styling
    const clientLayer = new atlas.layer.SymbolLayer(dataSource, undefined, {
      filter: ['==', ['get', 'type'], 'client'],
      iconOptions: {
        image: 'pin-round-red',
        size: 0.9,
        color: [
          'case',
          ['==', ['get', 'priority'], 'high'], '#ef4444', // red for high priority
          ['==', ['get', 'priority'], 'medium'], '#f97316', // orange for medium priority
          '#eab308' // yellow for low priority
        ],
      },
      textOptions: {
        textField: ['get', 'name'],
        offset: [0, 1.8],
        size: 12,
        color: '#1f2937',
        haloColor: 'white',
        haloWidth: 2,
        font: ['StandardFont-Bold']
      },    });

    try {
      map.layers.add([therapistLayer, clientLayer]);
    } catch (error) {
      console.error('❌ Failed to add layers to map:', error);
      // Clean up the data source if layer add failed
      try {
        map.sources.remove(dataSource);
      } catch (cleanupError) {
        console.error('❌ Failed to clean up data source:', cleanupError);
      }
      return;
    }

    // Add hover events for therapists
    map.events.add('mouseenter', therapistLayer, (e: atlas.MapMouseEvent) => {
      if (e.shapes && e.shapes.length > 0) {
        const shape = e.shapes[0] as atlas.data.Feature<atlas.data.Point, Record<string, unknown>>;
        const properties = shape.properties;
        
        const content = `
          <div style="padding: 10px; min-width: 250px;">
            <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
              🩺 ${properties?.name}
            </h4>
            <div style="font-size: 14px; color: #4b5563; line-height: 1.4;">
              <p style="margin: 4px 0;"><strong>Status:</strong> ${properties?.status}</p>
              <p style="margin: 4px 0;"><strong>Availability:</strong> ${properties?.availability}</p>
              ${properties?.specializations ? `<p style="margin: 4px 0;"><strong>Specializations:</strong> ${properties.specializations}</p>` : ''}
              <p style="margin: 4px 0;"><strong>Location:</strong> ${properties?.address}</p>
              ${properties?.email ? `<p style="margin: 4px 0;"><strong>Email:</strong> ${properties.email}</p>` : ''}
              ${properties?.phone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${properties.phone}</p>` : ''}
              ${properties?.notes ? `<p style="margin: 4px 0;"><strong>Notes:</strong> ${properties.notes}</p>` : ''}
            </div>
          </div>
        `;
        
        popup.setOptions({
          content,
          position: shape.geometry.coordinates
        });
        popup.open(map);
      }
    });

    // Add hover events for clients
    map.events.add('mouseenter', clientLayer, (e: atlas.MapMouseEvent) => {
      if (e.shapes && e.shapes.length > 0) {
        const shape = e.shapes[0] as atlas.data.Feature<atlas.data.Point, Record<string, unknown>>;
        const properties = shape.properties;
        
        const content = `
          <div style="padding: 10px; min-width: 250px;">
            <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
              👤 ${properties?.name}
            </h4>
            <div style="font-size: 14px; color: #4b5563; line-height: 1.4;">
              <p style="margin: 4px 0;"><strong>Priority:</strong> 
                <span style="background: ${
                  properties?.priority === 'high' ? '#fecaca' : 
                  properties?.priority === 'medium' ? '#fed7aa' : '#fef3c7'
                }; color: ${
                  properties?.priority === 'high' ? '#991b1b' : 
                  properties?.priority === 'medium' ? '#9a3412' : '#92400e'
                }; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
                  ${properties?.priorityLabel}
                </span>
              </p>
              <p style="margin: 4px 0;"><strong>Status:</strong> ${properties?.status}</p>
              <p style="margin: 4px 0;"><strong>Location:</strong> ${properties?.address}</p>
              ${properties?.needsAssessment ? `<p style="margin: 4px 0;"><strong>Needs:</strong> ${properties.needsAssessment}</p>` : ''}
              ${properties?.email ? `<p style="margin: 4px 0;"><strong>Email:</strong> ${properties.email}</p>` : ''}
              ${properties?.phone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${properties.phone}</p>` : ''}
            </div>
          </div>
        `;
        
        popup.setOptions({
          content,
          position: shape.geometry.coordinates
        });
        popup.open(map);
      }
    });

    // Hide popup when mouse leaves
    map.events.add('mouseleave', therapistLayer, () => {
      popup.close();
    });

    map.events.add('mouseleave', clientLayer, () => {
      popup.close();
    });

    // Add click events
    map.events.add('click', therapistLayer, (e: atlas.MapMouseEvent) => {
      if (e.shapes && e.shapes.length > 0) {
        const shape = e.shapes[0] as atlas.data.Feature<atlas.data.Point, Record<string, unknown>>;
        const properties = shape.properties;
        const therapist = therapists.find((t: Therapist) => t.id === properties?.id);
        if (therapist && onTherapistClick) {
          onTherapistClick(therapist);
        }
      }
    });

    map.events.add('click', clientLayer, (e: atlas.MapMouseEvent) => {
      if (e.shapes && e.shapes.length > 0) {
        const shape = e.shapes[0] as atlas.data.Feature<atlas.data.Point, Record<string, unknown>>;
        const properties = shape.properties;
        const client = clients.find((c: Client) => c.id === properties?.id);
        if (client && onClientClick) {
          onClientClick(client);
        }
      }
    });    // Cleanup function
    return () => {
      try {
        popup.close();
        if (map.layers) {
          map.layers.remove([therapistLayer, clientLayer]);
        }
        if (map.sources) {
          map.sources.remove(dataSource);
        }
      } catch (error) {        console.warn('⚠️ Error during map cleanup:', error);
      }
    };

    } catch (error) {
      console.error('❌ Failed to add sources and layers:', error);
    }
  };
  // Call the async function
  addSourcesAndLayers();
}, [therapistsWithCoords, clientsWithCoords, isMapReady, onTherapistClick, onClientClick, therapists, clients]);

  // Handle selected items and fit map to data bounds
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;
    
    try {
      // Focus on selected therapist or client
      if (selectedTherapistId) {
        const therapist = therapistsWithCoords.find(t => t.id === selectedTherapistId);
        if (therapist) {
          map.setCamera({
            center: [therapist.longitude, therapist.latitude],
            zoom: 15,
            duration: 1000
          });
        }
      } else if (selectedClientId) {
        const client = clientsWithCoords.find(c => c.id === selectedClientId);
        if (client) {
          map.setCamera({
            center: [client.longitude, client.latitude],
            zoom: 15,
            duration: 1000
          });
        }
      } else {        // No specific item selected, fit to all data
        const allPoints = [...therapistsWithCoords, ...clientsWithCoords];
        if (allPoints.length > 1) {
          // Calculate bounds manually for Azure Maps
          let minLon = Infinity, maxLon = -Infinity;
          let minLat = Infinity, maxLat = -Infinity;
          
          allPoints.forEach(point => {
            if (typeof point.longitude === 'number' && typeof point.latitude === 'number' &&
                !isNaN(point.longitude) && !isNaN(point.latitude)) {
              minLon = Math.min(minLon, point.longitude);
              maxLon = Math.max(maxLon, point.longitude);
              minLat = Math.min(minLat, point.latitude);
              maxLat = Math.max(maxLat, point.latitude);
            }
          });
          
          // Ensure we have valid bounds
          if (minLon !== Infinity && maxLon !== -Infinity && minLat !== Infinity && maxLat !== -Infinity) {
            // Azure Maps bounds format: [west, south, east, north]
            const bounds = [minLon, minLat, maxLon, maxLat];
            console.log('📏 Setting map bounds:', bounds);
            
            map.setCamera({
              bounds: bounds,
              padding: 50,
              duration: 1000
            });
          }
        }
      }
    } catch (error) {
      console.error('Error setting map camera:', error);
      // Don't crash the component, just log the error
    }
  }, [selectedTherapistId, selectedClientId, therapistsWithCoords, clientsWithCoords, isMapReady]);

  // Show loading indicator while geocoding
  if (isLoadingCoordinates) {
    return (
      <div className="map-container">
        <div className="map-loading">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Geocoding addresses...</p>
        </div>
      </div>
    );
  }

  // Show error if map failed to load
  if (mapError) {
    return (
      <div className="map-container">
        <div className="map-error">
          <h3>Map Error</h3>
          <p>{mapError}</p>
          <p>Azure Client ID: {AZURE_CLIENT_ID ? 'Set' : 'Not Set'}</p>
          <p>Check console for more details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div ref={mapRef} className="azure-map" />
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color legend-color-blue"></div>
          <span>Available Therapists</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-color-green"></div>
          <span>Paired Therapists</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-color-red"></div>
          <span>High Priority Clients</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-color-orange"></div>
          <span>Medium Priority Clients</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-color-yellow"></div>
          <span>Low Priority Clients</span>
        </div>
      </div>
    </div>
  );
}
