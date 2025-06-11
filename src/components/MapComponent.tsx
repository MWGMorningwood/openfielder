import { useEffect, useRef, useState } from 'react';
import * as atlas from 'azure-maps-control';
import type { Therapist, Client } from '../types';

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

  // Initialize Azure Maps with SWA Entra authentication
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initializeMap = async () => {
      try {
        console.log('Initializing Azure Maps with SWA Entra authentication');
        
        // Use SWA authentication - Azure will handle token management automatically
        const map = new atlas.Map(mapRef.current!, {
          center: [-98.5795, 39.8283], // Center of US
          zoom: 4,
          style: 'road',
          // Azure Maps will automatically use the authenticated user context from SWA
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

        mapInstanceRef.current = map;
      } catch (error) {
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
      <div className="map-container">
        <div className="map-error">
          <h3>Map Error</h3>
          <p>{mapError}</p>
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
