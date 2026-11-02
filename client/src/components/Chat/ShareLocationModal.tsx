import React, { useState } from 'react';
import { X, MapPin, Navigation, Send, Building2 } from 'lucide-react';
import { getSocket } from '../../services/socket';
import { useStore } from '../../store/useStore';

interface ShareLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
}

const PRESET_LOCATIONS = [
  { title: 'Klea Global Headquarters', address: '100 Silicon Way, Tech Park', lat: 37.7749, lng: -122.4194 },
  { title: 'Downtown Innovation Hub', address: '450 Innovation Ave, Suite 12', lat: 40.7128, lng: -74.0060 },
  { title: 'Engineering & Operations Lab', address: '88 Cyber Boulevard', lat: 51.5074, lng: -0.1278 },
];

export const ShareLocationModal: React.FC<ShareLocationModalProps> = ({ isOpen, onClose, chatId }) => {
  const { token, theme } = useStore();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0);
  const [customTitle, setCustomTitle] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  if (!isOpen) return null;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedPreset(null);
        setCustomTitle('My Live Location');
        setCustomAddress(`${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`);
        setIsLocating(false);
      },
      (err) => {
        console.error('Geo error:', err);
        alert('Could not determine current location. Please check browser permissions or select a preset.');
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSendLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    let title = '';
    let address = '';
    let lat = 0;
    let lng = 0;

    if (selectedPreset !== null) {
      const p = PRESET_LOCATIONS[selectedPreset];
      title = p.title;
      address = p.address;
      lat = p.lat;
      lng = p.lng;
    } else if (currentCoords) {
      title = customTitle.trim() || 'Shared Location';
      address = customAddress.trim() || `${currentCoords.lat}, ${currentCoords.lng}`;
      lat = currentCoords.lat;
      lng = currentCoords.lng;
    } else if (customTitle.trim()) {
      title = customTitle.trim();
      address = customAddress.trim() || 'Coordinates not provided';
      lat = 37.7749;
      lng = -122.4194;
    } else {
      return;
    }

    const locationPayload = {
      type: 'LOCATION',
      title,
      address,
      lat,
      lng,
      mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
    };

    const content = JSON.stringify(locationPayload);

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('send_message', {
        chatId,
        content,
      });
    } else {
      try {
        await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chatId, content }),
        });
      } catch (err) {
        console.error('Failed to send location via fallback HTTP:', err);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border animate-in zoom-in-95 duration-150 transition-colors ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#17212b] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b mb-4 ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Share Location</h3>
              <p className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'}`}>
                Send coordinates or venue to chat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
              theme === 'light'
                ? 'text-gray-400 hover:bg-gray-200 hover:text-gray-800'
                : 'text-[#7f91a4] hover:bg-white/10 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSendLocation} className="space-y-4">
          {/* Quick GPS Button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              theme === 'light'
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 border-blue-500/30 text-blue-300'
            }`}
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Determining GPS Coordinates...' : 'Share My Real-Time Location'}</span>
          </button>

          {/* Preset Locations */}
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-2 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Company Venues & Presets
            </label>
            <div className="space-y-2">
              {PRESET_LOCATIONS.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedPreset(idx);
                    setCurrentCoords(null);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    selectedPreset === idx
                      ? theme === 'light'
                        ? 'bg-[#5288c1]/10 border-[#5288c1] text-gray-900'
                        : 'bg-[#5288c1]/20 border-[#5288c1] text-white'
                      : theme === 'light'
                      ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      : 'bg-white/5 border-white/5 text-[#7f91a4] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Building2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      selectedPreset === idx ? 'text-[#5288c1]' : theme === 'light' ? 'text-gray-400' : 'text-[#7f91a4]'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold">{p.title}</div>
                    <div className={`text-[11px] ${theme === 'light' ? 'text-gray-500' : 'opacity-75'}`}>
                      {p.address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Location Inputs */}
          <div>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                theme === 'light' ? 'text-gray-500' : 'text-[#7f91a4]'
              }`}
            >
              Custom Location or Coordinates
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  setSelectedPreset(null);
                }}
                placeholder="Venue / Spot Name (e.g. Cafe Nero Meeting Room)"
                className={`w-full px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] transition border ${
                  theme === 'light'
                    ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                    : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                }`}
              />
              <input
                type="text"
                value={customAddress}
                onChange={(e) => {
                  setCustomAddress(e.target.value);
                  setSelectedPreset(null);
                }}
                placeholder="Street address or latitude, longitude"
                className={`w-full px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] transition border ${
                  theme === 'light'
                    ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400'
                    : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                }`}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#5288c1] hover:bg-[#5d9ad8] text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Location</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
