import { useState } from 'react';
import { Plus, X, MapPin, User, Phone, Mail, Clock, FileText, Tag, Navigation } from 'lucide-react';
import type { CreateTherapistRequest, CreateClientRequest, Address } from '../types';

interface AddPersonFormProps {
  type: 'therapist' | 'client';
  onSubmit: (data: CreateTherapistRequest | CreateClientRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function AddPersonForm({
  type,
  onSubmit,
  onCancel,
  isLoading = false,
}: AddPersonFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
    } as Address,
    availability: type === 'therapist' ? '' : undefined,
    notes: type === 'therapist' ? '' : undefined,
    specializations: type === 'therapist' ? [] as string[] : undefined,
    needsAssessment: type === 'client' ? '' : undefined,
    priority: type === 'client' ? 'medium' as const : undefined,
  });

  const [specializationInput, setSpecializationInput] = useState('');
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [name]: value }
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsGeocodingAddress(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // In a real implementation, we would reverse geocode the coordinates to get an address
        // For now, we'll just show a message that location was detected
        alert(`Location detected: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}. Please enter the address manually for now.`);
        setIsGeocodingAddress(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get current location. Please enter address manually.');
        setIsGeocodingAddress(false);
      }
    );
  };

  const handleAddSpecialization = () => {
    if (specializationInput.trim() && formData.specializations) {
      setFormData(prev => ({
        ...prev,
        specializations: [...(prev.specializations || []), specializationInput.trim()],
      }));
      setSpecializationInput('');
    }
  };

  const handleRemoveSpecialization = (index: number) => {
    if (formData.specializations) {
      setFormData(prev => ({
        ...prev,
        specializations: prev.specializations?.filter((_, i) => i !== index),
      }));
    }
  };

  const validateAddress = (address: Address): boolean => {
    return !!(address.street1 && address.city && address.state && address.zipCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !validateAddress(formData.address)) {
      alert('Please fill in all required fields including complete address.');
      return;
    }

    if (type === 'therapist' && !formData.availability) {
      alert('Please specify availability for therapist.');
      return;
    }

    try {
      if (type === 'therapist') {
        const therapistData: CreateTherapistRequest = {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address,
          availability: formData.availability!,
          notes: formData.notes || undefined,
          specializations: formData.specializations?.length ? formData.specializations : undefined,
        };
        await onSubmit(therapistData);
      } else {
        const clientData: CreateClientRequest = {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address,
          needsAssessment: formData.needsAssessment || undefined,
          priority: formData.priority!,
        };
        await onSubmit(clientData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to save. Please try again.');
    }
  };

  return (
    <div className="add-person-form-overlay">
      <div className="add-person-form">
        <div className="form-header">
          <h2>
            <Plus size={20} />
            Add New {type === 'therapist' ? 'Therapist' : 'Client'}
          </h2>          <button onClick={onCancel} className="close-button" title="Close form">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <User size={16} />
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter full name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <Mail size={16} />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
              />
            </div>

            <div className="form-group">
              <label>
                <Phone size={16} />
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="address-section">
            <div className="section-header">
              <label>
                <MapPin size={16} />
                Address *
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isGeocodingAddress}
                className="location-button"
              >
                <Navigation size={14} />
                {isGeocodingAddress ? 'Detecting...' : 'Use Current Location'}
              </button>
            </div>

            <div className="form-group">
              <input
                type="text"
                name="street1"
                value={formData.address.street1}
                onChange={handleAddressChange}
                required
                placeholder="Street Address *"
              />
            </div>

            <div className="form-group">
              <input
                type="text"
                name="street2"
                value={formData.address.street2}
                onChange={handleAddressChange}
                placeholder="Apartment, suite, etc. (optional)"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <input
                  type="text"
                  name="city"
                  value={formData.address.city}
                  onChange={handleAddressChange}
                  required
                  placeholder="City *"
                />
              </div>

              <div className="form-group">
                <input
                  type="text"
                  name="state"
                  value={formData.address.state}
                  onChange={handleAddressChange}
                  required
                  placeholder="State *"
                  maxLength={2}
                />
              </div>

              <div className="form-group">
                <input
                  type="text"
                  name="zipCode"
                  value={formData.address.zipCode}
                  onChange={handleAddressChange}
                  required
                  placeholder="ZIP Code *"
                  pattern="[0-9]{5}(-[0-9]{4})?"
                />
              </div>
            </div>
          </div>

          {type === 'therapist' && (
            <>
              <div className="form-group">
                <label>
                  <Clock size={16} />
                  Availability *
                </label>
                <input
                  type="text"
                  name="availability"
                  value={formData.availability || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Mon-Fri 9AM-5PM"
                />
              </div>

              <div className="form-group">
                <label>
                  <Tag size={16} />
                  Specializations
                </label>
                <div className="specializations-input">
                  <input
                    type="text"
                    value={specializationInput}
                    onChange={(e) => setSpecializationInput(e.target.value)}
                    placeholder="Add specialization"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialization())}
                  />
                  <button type="button" onClick={handleAddSpecialization}>
                    Add
                  </button>
                </div>
                <div className="specializations-list">
                  {formData.specializations?.map((spec, index) => (
                    <span key={index} className="specialization-tag">
                      {spec}
                      <button type="button" onClick={() => handleRemoveSpecialization(index)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>
                  <FileText size={16} />
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  placeholder="Additional notes about availability, preferences, etc."
                  rows={3}
                />
              </div>
            </>
          )}

          {type === 'client' && (
            <>              <div className="form-group">
                <label htmlFor="priority">Priority *</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority || 'medium'}
                  onChange={handleInputChange}
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <FileText size={16} />
                  Needs Assessment
                </label>
                <textarea
                  name="needsAssessment"
                  value={formData.needsAssessment || ''}
                  onChange={handleInputChange}
                  placeholder="Describe client's specific needs and requirements"
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="submit-button">
              {isLoading ? 'Saving...' : `Add ${type === 'therapist' ? 'Therapist' : 'Client'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
