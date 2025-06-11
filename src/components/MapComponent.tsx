import { useEffect, useRef, useState } from 'react';
import * as atlas from 'azure-maps-control';
import type { Therapist, Client } from '../types';
import { AuthService } from '../services/authService';

// Azure Maps configuration using Entra authentication directly
const AZURE_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID;

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
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<atlas.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string>('');
  const authService = AuthService.getInstance();

  // Function to get authentication token directly from AuthService
  const getAuthToken = async (): Promise<string> => {
    try {
      const token = await authService.getAzureMapsToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      return token;
    } catch (error) {
      console.error('Failed to get Azure Maps token:', error);
      throw error;
    }
  };  // Initialize Azure Maps with Entra authentication directly
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initializeMap = async () => {
      try {
        console.log('Getting Azure Maps token from AuthService...');
        console.log('Azure Client ID:', AZURE_CLIENT_ID);
        
        if (!AZURE_CLIENT_ID) {
          throw new Error('VITE_AZURE_CLIENT_ID environment variable is not set');
        }
        
        console.log('Initializing Azure Maps with Entra authentication');
        const map = new atlas.Map(mapRef.current!, {
          center: [-98.5795, 39.8283], // Center of US
          zoom: 4,
          style: 'road',
          authOptions: {
            authType: atlas.AuthenticationType.aad,
            clientId: AZURE_CLIENT_ID,
            getToken: (resolve: (value: string | undefined) => void, reject: (reason?: unknown) => void) => {
              getAuthToken()
                .then(token => resolve(token))
                .catch(error => reject(error));
            }
          } as atlas.AuthenticationOptions,
        });

        map.events.add('ready', () => {
          console.log('Azure Maps ready!');
          setIsMapReady(true);
        });

        map.events.add('error', (error) => {
          console.error('Azure Maps error:', error);
          const errorMessage = error instanceof Error 
            ? error.message 
            : typeof error === 'object' 
              ? `Map error: ${error.constructor?.name || 'Unknown error'}`
              : String(error);
          setMapError(`Map error: ${errorMessage}`);
        });

        mapInstanceRef.current = map;} catch (error) {
        console.error('Failed to initialize Azure Maps:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null
            ? `Failed to initialize map: ${error.constructor?.name || 'Unknown error'}`
            : String(error);
        setMapError(`Failed to initialize map: ${errorMessage}`);
      }
    };

    initializeMap();

    return () => {
      mapInstanceRef.current?.dispose();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;
    const dataSource = new atlas.source.DataSource();
    map.sources.add(dataSource);

    // Add therapist markers
    therapists.forEach((therapist) => {
      const point = new atlas.data.Point([therapist.longitude, therapist.latitude]);
      const feature = new atlas.data.Feature(point, {
        id: therapist.id,
        type: 'therapist',
        name: therapist.name,
        isPaired: therapist.isPaired,
        availability: therapist.availability,
        notes: therapist.notes,
      });
      dataSource.add(feature);
    });

    // Add client markers
    clients.forEach((client) => {
      const point = new atlas.data.Point([client.longitude, client.latitude]);
      const feature = new atlas.data.Feature(point, {
        id: client.id,
        type: 'client',
        name: client.name,
        status: client.status,
        priority: client.priority,
      });
      dataSource.add(feature);
    });

    // Create symbol layer for therapists
    const therapistLayer = new atlas.layer.SymbolLayer(dataSource, undefined, {
      filter: ['==', ['get', 'type'], 'therapist'],
      iconOptions: {
        image: 'pin-round-blue',
        size: 0.8,
        color: [
          'case',
          ['get', 'isPaired'], 'green',
          'blue'
        ],
      },
      textOptions: {
        textField: ['get', 'name'],
        offset: [0, 1.5],
        size: 12,
        color: 'black',
        haloColor: 'white',
        haloWidth: 1,
      },
    });

    // Create symbol layer for clients
    const clientLayer = new atlas.layer.SymbolLayer(dataSource, undefined, {
      filter: ['==', ['get', 'type'], 'client'],
      iconOptions: {
        image: 'pin-round-red',
        size: 0.8,
        color: [
          'case',
          ['==', ['get', 'priority'], 'high'], 'red',
          ['==', ['get', 'priority'], 'medium'], 'orange',
          'yellow'
        ],
      },
      textOptions: {
        textField: ['get', 'name'],
        offset: [0, 1.5],
        size: 12,
        color: 'black',
        haloColor: 'white',
        haloWidth: 1,
      },
    });

    map.layers.add([therapistLayer, clientLayer]);

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
    });

    // Cleanup function
    return () => {
      map.layers.remove([therapistLayer, clientLayer]);
      map.sources.remove(dataSource);
    };
  }, [therapists, clients, isMapReady, onTherapistClick, onClientClick]);

  // Handle selected items
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;
    
    // Focus on selected therapist or client
    if (selectedTherapistId) {
      const therapist = therapists.find(t => t.id === selectedTherapistId);
      if (therapist) {
        map.setCamera({
          center: [therapist.longitude, therapist.latitude],
          zoom: 12,
        });
      }
    } else if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        map.setCamera({
          center: [client.longitude, client.latitude],
          zoom: 12,
        });
      }
    }
  }, [selectedTherapistId, selectedClientId, therapists, clients, isMapReady]);

  // Show error if map failed to load
  if (mapError) {
    return (
      <div className="map-container">        <div className="map-error">
          <h3>Map Error</h3>
          <p>{mapError}</p>
          <p>Azure Client ID: {AZURE_CLIENT_ID}</p>
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
        </div>      </div>
    </div>
  );
}
