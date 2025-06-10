import { useEffect, useRef, useState } from 'react';
import * as atlas from 'azure-maps-control';
import type { Therapist, Client } from '../types';

// Azure Maps configuration
const AZURE_MAPS_KEY = import.meta.env.VITE_AZURE_MAPS_KEY || 'your-azure-maps-key';
const IS_LOCAL_DEV = AZURE_MAPS_KEY === 'local-development-key';

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

  // Initialize Azure Maps
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new atlas.Map(mapRef.current, {
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      style: 'road',
      authOptions: {
        authType: atlas.AuthenticationType.subscriptionKey,
        subscriptionKey: AZURE_MAPS_KEY,
      },
    });

    map.events.add('ready', () => {
      setIsMapReady(true);
    });

    mapInstanceRef.current = map;

    return () => {
      map?.dispose();
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
    });    map.layers.add([therapistLayer, clientLayer]);    // Add click events
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
    }  }, [selectedTherapistId, selectedClientId, therapists, clients, isMapReady]);

  // Render mock map for local development
  if (IS_LOCAL_DEV) {
    return (
      <div className="map-container">
        <div className="mock-map">
          <div className="mock-map-header">
            <h3>Local Development - Mock Map</h3>
            <p>Azure Maps integration will work when deployed to Azure</p>
          </div>
          <div className="mock-map-content">
            <div className="mock-data-section">
              <h4>Therapists ({therapists.length})</h4>
              {therapists.map((therapist) => (
                <div
                  key={therapist.id}
                  className={`mock-pin therapist-pin ${therapist.isPaired ? 'paired' : 'available'} ${
                    selectedTherapistId === therapist.id ? 'selected' : ''
                  }`}
                  onClick={() => onTherapistClick?.(therapist)}
                >
                  📍 {therapist.name} - {therapist.address}
                  {therapist.isPaired && ' (Paired)'}
                </div>
              ))}
            </div>
            <div className="mock-data-section">
              <h4>Clients ({clients.length})</h4>
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={`mock-pin client-pin priority-${client.priority} ${
                    selectedClientId === client.id ? 'selected' : ''
                  }`}
                  onClick={() => onClientClick?.(client)}
                >
                  📍 {client.name} - {client.address} ({client.priority} priority)
                </div>
              ))}
            </div>
          </div>
        </div>
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
