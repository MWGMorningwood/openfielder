import { useState, useEffect } from 'react';
import { Users, UserPlus, MapPin, RefreshCw, ArrowRight, List, Map } from 'lucide-react';
import MapComponent from './components/MapComponent';
import AddPersonForm from './components/AddPersonForm';
import PairingComponent from './components/PairingComponent';
import { AuthWrapper } from './components/AuthWrapper';
import { AuthService } from './services/authService';
import type { Therapist, Client, CreateTherapistRequest, CreateClientRequest } from './types';
import { apiService } from './services/apiService';
import { geocodingService } from './services/geocodingService';
import './App.css';


function App() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState<'therapist' | 'client' | null>(null);
  const [showPairingModal, setShowPairingModal] = useState<Client | null>(null);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const authService = AuthService.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [therapistsData, clientsData] = await Promise.all([
        apiService.getTherapists(),
        apiService.getClients(),
      ]);
      setTherapists(therapistsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTherapist = async (data: CreateTherapistRequest) => {
    setIsSubmitting(true);
    try {
      const newTherapist = await apiService.createTherapist(data);
      setTherapists(prev => [...prev, newTherapist]);
      setShowAddForm(null);
      alert('Therapist added successfully!');
    } catch (error) {
      console.error('Error adding therapist:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddClient = async (data: CreateClientRequest) => {
    setIsSubmitting(true);
    try {
      const newClient = await apiService.createClient(data);
      setClients(prev => [...prev, newClient]);
      setShowAddForm(null);
      alert('Client added successfully!');
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTherapistClick = (therapist: Therapist) => {
    setSelectedTherapistId(therapist.id === selectedTherapistId ? '' : therapist.id);
    setSelectedClientId('');
  };

  const handleClientClick = (client: Client) => {
    setSelectedClientId(client.id === selectedClientId ? '' : client.id);
    setSelectedTherapistId('');
  };

  const handlePairClient = (client: Client) => {
    setShowPairingModal(client);
  };

  const handleUnpairTherapist = async (therapist: Therapist) => {
    if (!therapist.isPaired) return;
    
    if (confirm(`Are you sure you want to unpair ${therapist.name}?`)) {
      try {
        await apiService.unpairTherapist(therapist.id);
        await loadData(); // Refresh data
        alert('Therapist unpaired successfully!');
      } catch (error) {
        console.error('Error unpairing therapist:', error);
        alert('Failed to unpair therapist. Please try again.');
      }
    }
  };

  const handlePairSuccess = () => {
    setShowPairingModal(null);
    loadData(); // Refresh data
  };

  const getStats = () => {
    const availableTherapists = therapists.filter(t => !t.isPaired).length;
    const pairedTherapists = therapists.filter(t => t.isPaired).length;
    const unpairedClients = clients.filter(c => c.status === 'active').length;
    const pairedClients = clients.filter(c => c.status === 'paired').length;

    return {
      availableTherapists,
      pairedTherapists,
      unpairedClients,
      pairedClients,
    };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <RefreshCw className="spin" size={40} />
        <p>Loading OpenFielder...</p>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <div className="app">
        <header className="app-header">
        <div className="header-left">
          <h1>
            <MapPin size={24} />
            OpenFielder
          </h1>
          <p>Therapist-Client Mapping System</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-number">{stats.availableTherapists}</span>
            <span className="stat-label">Available Therapists</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.pairedTherapists}</span>
            <span className="stat-label">Paired Therapists</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.unpairedClients}</span>
            <span className="stat-label">Unmatched Clients</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.pairedClients}</span>
            <span className="stat-label">Paired Clients</span>
          </div>
        </div>

        <div className="header-tabs">
          <button 
            onClick={() => setActiveTab('list')}
            className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          >
            <List size={16} />
            List View
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`tab-button ${activeTab === 'map' ? 'active' : ''}`}
          >
            <Map size={16} />
            Map View
          </button>
        </div>

        <div className="header-actions">
          <button 
            onClick={() => setShowAddForm('therapist')}
            className="add-button therapist-button"
          >
            <UserPlus size={16} />
            Add Therapist
          </button>
          <button 
            onClick={() => setShowAddForm('client')}
            className="add-button client-button"
          >
            <Users size={16} />
            Add Client
          </button>
          <button onClick={loadData} className="refresh-button">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button onClick={() => authService.logout()} className="logout-button">
            Sign Out
          </button>
        </div>
      </header>

      <div className="app-content">
        {activeTab === 'list' ? (
          <div className="sidebar full-width">
            <div className="sidebar-section">
              <h3>
                <UserPlus size={16} />
                Therapists ({therapists.length})
              </h3>
              <div className="person-list">
                {therapists.map((therapist) => (
                  <div 
                    key={therapist.id}
                    className={`person-card therapist-card ${selectedTherapistId === therapist.id ? 'selected' : ''} ${therapist.isPaired ? 'paired' : ''}`}
                    onClick={() => handleTherapistClick(therapist)}
                  >
                    <div className="person-header">
                      <span className="person-name">{therapist.name}</span>
                      <span className={`status-indicator ${therapist.isPaired ? 'paired' : 'available'}`}>
                        {therapist.isPaired ? 'Paired' : 'Available'}
                      </span>
                    </div>
                    <div className="person-details">
                      <p className="person-address">{geocodingService.formatAddressForDisplay(therapist.address)}</p>
                      <p className="person-availability">{therapist.availability}</p>
                      {therapist.specializations && therapist.specializations.length > 0 && (
                        <div className="specializations">
                          {therapist.specializations.slice(0, 2).map((spec, index) => (
                            <span key={index} className="specialization-tag">{spec}</span>
                          ))}
                          {therapist.specializations.length > 2 && (
                            <span className="specialization-tag">+{therapist.specializations.length - 2}</span>
                          )}
                        </div>
                      )}
                      {therapist.isPaired && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnpairTherapist(therapist);
                          }}
                          className="unpair-button"
                        >
                          Unpair
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h3>
                <Users size={16} />
                Clients ({clients.length})
              </h3>
              <div className="person-list">
                {clients.map((client) => (
                  <div 
                    key={client.id}
                    className={`person-card client-card ${selectedClientId === client.id ? 'selected' : ''} priority-${client.priority}`}
                    onClick={() => handleClientClick(client)}
                  >
                    <div className="person-header">
                      <span className="person-name">{client.name}</span>
                      <span className={`priority-badge priority-${client.priority}`}>
                        {client.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="person-details">
                      <p className="person-address">{geocodingService.formatAddressForDisplay(client.address)}</p>
                      <p className="person-status">Status: {client.status}</p>
                      {client.status === 'active' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePairClient(client);
                          }}
                          className="pair-button"
                        >
                          <ArrowRight size={14} />
                          Find Therapist
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="map-area">
            <MapComponent
              therapists={therapists}
              clients={clients}
              onTherapistClick={handleTherapistClick}
              onClientClick={handleClientClick}
              selectedTherapistId={selectedTherapistId}
              selectedClientId={selectedClientId}
            />
          </div>
        )}
      </div>

      {showAddForm && (
        <AddPersonForm
          type={showAddForm}
          onSubmit={async (data: CreateTherapistRequest | CreateClientRequest) => {
            if (showAddForm === 'therapist') {
              await handleAddTherapist(data as CreateTherapistRequest);
            } else {
              await handleAddClient(data as CreateClientRequest);
            }
          }}
          onCancel={() => setShowAddForm(null)}
          isLoading={isSubmitting}
        />
      )}

      {showPairingModal && (
        <PairingComponent
          client={showPairingModal}
          therapists={therapists}
          onPairSuccess={handlePairSuccess}
          onClose={() => setShowPairingModal(null)}
        />
      )}
    </div>
    </AuthWrapper>
  );
}

export default App;
