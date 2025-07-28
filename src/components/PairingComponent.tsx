import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, MapPin, Clock, User, Phone, Mail, X, Navigation, Route } from 'lucide-react';
import type { Client, Therapist, EnhancedDistanceCalculation } from '../types';
import { routeDistanceService } from '../services/routeDistanceService';
import { apiService } from '../services/apiService';
import { geocodingService } from '../services/geocodingService';

interface PairingComponentProps {
  client: Client;
  therapists: Therapist[];
  onPairSuccess: () => void;
  onClose: () => void;
}

export default function PairingComponent({
  client,
  therapists,
  onPairSuccess,
  onClose,
}: PairingComponentProps) {  const [nearestTherapists, setNearestTherapists] = useState<EnhancedDistanceCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('');

  const loadNearestTherapists = useCallback(async () => {
    setIsLoading(true);
    try {
      // Filter available therapists
      const availableTherapists = therapists.filter(t => !t.isPaired);
      
      // Create therapist address data for the route service
      const therapistAddresses = availableTherapists.map(t => ({
        id: t.id,
        name: t.name,
        address: t.address
      }));

      // Calculate enhanced distances using the new route service
      const enhancedDistances = await routeDistanceService.calculateDistancesToTherapists(
        client.address,
        therapistAddresses
      );

      // Fill in client information and sort by distance
      const distancesWithClientInfo = enhancedDistances.map(d => ({
        ...d,
        clientId: client.id,
        clientName: client.name
      })).sort((a, b) => a.distance - b.distance);

      setNearestTherapists(distancesWithClientInfo);
    } catch (error) {
      console.error('Error loading nearest therapists:', error);
      alert('Failed to load nearest therapists. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [client.id, client.address, client.name, therapists]);

  useEffect(() => {
    loadNearestTherapists();
  }, [loadNearestTherapists]);

  const handlePairTherapist = async () => {
    if (!selectedTherapistId) {
      alert('Please select a therapist to pair.');
      return;
    }

    setIsPairing(true);
    try {
      await apiService.pairTherapistWithClient(selectedTherapistId, client.id);
      alert('Successfully paired therapist with client!');
      onPairSuccess();
    } catch (error) {
      console.error('Error pairing therapist:', error);
      alert('Failed to pair therapist. Please try again.');
    } finally {
      setIsPairing(false);
    }
  };

  const getTherapistDetails = (therapistId: string): Therapist | undefined => {
    return therapists.find(t => t.id === therapistId);
  };
  const formatDistance = (distance: EnhancedDistanceCalculation): React.ReactNode => {
    const formatKm = (km: number) => {
      if (km < 1) {
        return `${Math.round(km * 1000)}m`;
      }
      return `${km.toFixed(1)}km`;
    };

    if (distance.routeCalculationSuccess && distance.routeDistance) {
      return (
        <div className="distance-info">
          <div className="route-distance">
            <Route size={12} />
            {formatKm(distance.routeDistance)}
            {distance.travelTimeMinutes && (
              <span className="travel-time"> ({Math.round(distance.travelTimeMinutes)}min)</span>
            )}
          </div>
          <div className="straight-distance">
            <Navigation size={12} />
            {formatKm(distance.straightLineDistance)} direct
          </div>
        </div>
      );
    } else {
      return (
        <div className="distance-info">
          <div className="straight-distance">
            <Navigation size={12} />
            {formatKm(distance.straightLineDistance)} direct
          </div>
          <div className="route-error">Route calc failed</div>
        </div>
      );
    }
  };

  return (
    <div className="pairing-overlay">
      <div className="pairing-modal">
        <div className="pairing-header">
          <h2>
            <ArrowRight size={20} />
            Pair Therapist with {client.name}
          </h2>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        <div className="client-info">
          <div className="client-card">
            <h3>
              <User size={16} />
              Client Details
            </h3>
            <div className="client-details">
              <p><strong>Name:</strong> {client.name}</p>
              <p><strong>Address:</strong> {geocodingService.formatAddressForDisplay(client.address)}</p>
              <p><strong>Priority:</strong> 
                <span className={`priority-badge priority-${client.priority}`}>
                  {client.priority.toUpperCase()}
                </span>
              </p>
              {client.email && (
                <p>
                  <Mail size={14} />
                  {client.email}
                </p>
              )}
              {client.phone && (
                <p>
                  <Phone size={14} />
                  {client.phone}
                </p>
              )}
              {client.needsAssessment && (
                <p><strong>Needs:</strong> {client.needsAssessment}</p>
              )}
            </div>
          </div>
        </div>

        <div className="therapists-section">
          <h3>
            <MapPin size={16} />
            Nearest Available Therapists
          </h3>
          
          {isLoading ? (
            <div className="loading">Loading nearest therapists...</div>
          ) : (
            <div className="therapists-list">
              {nearestTherapists.length === 0 ? (
                <div className="no-therapists">
                  No available therapists found nearby.
                </div>
              ) : (
                nearestTherapists.map((distance) => {
                  const therapist = getTherapistDetails(distance.therapistId);
                  if (!therapist) return null;

                  return (
                    <div 
                      key={therapist.id} 
                      className={`therapist-card ${selectedTherapistId === therapist.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTherapistId(therapist.id)}
                    >
                      <div className="therapist-header">
                        <div className="therapist-name">
                          <input
                            type="radio"
                            name="selectedTherapist"
                            value={therapist.id}
                            checked={selectedTherapistId === therapist.id}
                            onChange={(e) => setSelectedTherapistId(e.target.value)}
                          />
                          <strong>{therapist.name}</strong>                          <span className="distance-badge">
                            {formatDistance(distance)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="therapist-details">                        <p>
                          <MapPin size={14} />
                          {geocodingService.formatAddressForDisplay(therapist.address)}
                        </p>
                        
                        <p>
                          <Clock size={14} />
                          {therapist.availability}
                        </p>
                        
                        {therapist.email && (
                          <p>
                            <Mail size={14} />
                            {therapist.email}
                          </p>
                        )}
                        
                        {therapist.phone && (
                          <p>
                            <Phone size={14} />
                            {therapist.phone}
                          </p>
                        )}
                        
                        {therapist.specializations && therapist.specializations.length > 0 && (
                          <div className="specializations">
                            <strong>Specializations:</strong>
                            <div className="specialization-tags">
                              {therapist.specializations.map((spec, index) => (
                                <span key={index} className="specialization-tag">
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {therapist.notes && (
                          <p className="notes">
                            <strong>Notes:</strong> {therapist.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="pairing-actions">
          <button 
            onClick={onClose} 
            className="cancel-button"
          >
            Cancel
          </button>
          
          <button 
            onClick={handlePairTherapist}
            disabled={!selectedTherapistId || isPairing}
            className="pair-button"
          >
            {isPairing ? 'Pairing...' : 'Pair Selected Therapist'}
          </button>
        </div>
      </div>    </div>
  );
}
