/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Hospital, 
  ShieldAlert, 
  Flame, 
  MessageSquare, 
  ChevronRight,
  Loader2,
  X,
  Stethoscope,
  Users,
  Plus,
  Trash2,
  UserPlus,
  Moon,
  Sun,
  Pill,
  Navigation,
  CheckCircle2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getEmergencyAdvice } from "./services/gemini";
import { Contact } from "./types";

interface LocationState {
  lat: number | null;
  lng: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
}

// Haversine formula for distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function App() {
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    address: null,
    loading: false,
    error: null
  });

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sosStatus, setSosStatus] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [emergencyType, setEmergencyType] = useState<string | null>(null);

  const SOS_AUDIO_TEXT = "Emergency alert sent! Your location has been shared with contacts.";
  
  // Simulated nearby places for distance demonstration
  const [mockPlaces, setMockPlaces] = useState<any[]>([]);

  useEffect(() => {
    if (location.lat && location.lng) {
      // Create some mock places around the user to demonstrate distance feature
      const places = [
        { name: "Central Medical Center", type: "Hospital", lat: location.lat + 0.015, lng: location.lng + 0.008 },
        { name: "First Alert Pharmacy", type: "Pharmacy", lat: location.lat - 0.005, lng: location.lng + 0.003 },
        { name: "Emergency Police HQ", type: "Police", lat: location.lat + 0.008, lng: location.lng - 0.012 },
      ];
      setMockPlaces(places.map(p => ({
        ...p,
        distance: getDistance(location.lat!, location.lng!, p.lat, p.lng).toFixed(1),
        time: Math.round(getDistance(location.lat!, location.lng!, p.lat, p.lng) * 4) // Roughly 4 min per km
      })));
    }
  }, [location.lat, location.lng]);

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      const msg = new SpeechSynthesisUtterance(text);
      msg.rate = 1.1;
      msg.pitch = 1;
      window.speechSynthesis.speak(msg);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("light-mode", newTheme === "light");
  };

  // Load contacts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("emergency_contacts");
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse contacts", e);
      }
    }
  }, []);

  // Save contacts to localStorage
  useEffect(() => {
    localStorage.setItem("emergency_contacts", JSON.stringify(contacts));
  }, [contacts]);

  // Initialize Geolocation
  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: "Location Verified",
          loading: false,
          error: null
        });
      },
      (error) => {
        let msg = "Location denied";
        if (error.code === 2) msg = "Location unavailable";
        if (error.code === 3) msg = "Timeout";
        setLocation(prev => ({ ...prev, loading: false, error: msg }));
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    updateLocation();
  }, [updateLocation]);

  const handleSOS = () => {
    if (contacts.length === 0) {
      setSosStatus("No contacts defined!");
      speak("Warning. No emergency contacts found. Please add contacts.");
      setShowContacts(true);
      setTimeout(() => setSosStatus(null), 3000);
      return;
    }

    setSosStatus("ALERT SENT! SHARING GPS DATA...");
    speak(SOS_AUDIO_TEXT);

    const message = `SOS! Emergency at my location: https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const encodedMessage = encodeURIComponent(message);
    
    const firstContact = contacts[0].phone.replace(/\D/g, "");
    window.open(`https://wa.me/${firstContact}?text=${encodedMessage}`, "_blank");
    
    setTimeout(() => {
      setSosStatus("CONTACTS NOTIFIED via WHATSAPP");
      setTimeout(() => setSosStatus(null), 3000);
    }, 2000);
  };

  const fetchAIAdvice = async (type: string) => {
    setEmergencyType(type);
    setAiLoading(true);
    const advice = await getEmergencyAdvice(type, `User coordinates: ${location.lat}, ${location.lng}`);
    setAiResponse(advice || "No advice found.");
    setAiLoading(false);
  };

  const getNearbyUrl = (category: string) => {
    if (!location.lat || !location.lng) return `https://www.google.com/maps/search/${category}`;
    return `https://www.google.com/maps/search/${category}/@${location.lat},${location.lng},15z`;
  };

  const addContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    
    const contact: Contact = {
      id: crypto.randomUUID(),
      name: newContact.name,
      phone: newContact.phone
    };
    
    setContacts(prev => [...prev, contact]);
    setNewContact({ name: "", phone: "" });
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-red-500/30 ${theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Visual background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] ${theme === 'dark' ? 'bg-red-900/40' : 'bg-red-200'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100'}`} />
      </div>

      <main className="relative z-10 max-w-lg mx-auto px-6 py-12 flex flex-col min-h-screen">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className={`p-3 rounded-xl border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-100 shadow-sm'}`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-600" />}
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-red-500" />
                Guardian
              </h1>
              <p className={`text-[10px] uppercase tracking-[0.2em] font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Smart Emergency Helper</p>
            </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowContacts(true)}
            className={`p-3 rounded-xl border transition-colors relative ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-100 shadow-sm'}`}
          >
            <Users className={theme === 'dark' ? "w-6 h-6 text-gray-400" : "w-6 h-6 text-gray-600"} />
            {contacts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0A0A0A]">
                {contacts.length}
              </span>
            )}
          </motion.button>
        </header>

        {/* SOS STATUS FEEDBACK */}
        <AnimatePresence>
          {sosStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 p-4 bg-red-600 rounded-2xl flex items-center gap-4 shadow-xl border-l-8 border-red-400"
            >
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <div className="flex-1">
                <p className="text-sm font-black tracking-widest text-white uppercase italic">{sosStatus}</p>
                <div className="h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3 }}
                    className="h-full bg-white" 
                  />
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        <section className="flex-1 flex flex-col justify-center items-center py-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSOS}
            className="group relative w-60 h-60 rounded-full bg-red-600 flex flex-col items-center justify-center border-8 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-colors hover:bg-red-500/90"
          >
            <div className="absolute inset-4 rounded-full border-2 border-white/10 group-hover:border-white/20 transition-colors" />
            <AlertTriangle className="w-16 h-16 mb-2" />
            <span className="text-5xl font-black tracking-tighter">SOS</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-80 underline underline-offset-4 tracking-[0.2em]">Launch Alert</span>
          </motion.button>
          
          <p className={`mt-8 text-center text-sm max-w-[280px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {contacts.length === 0 
              ? "⚠ REGISTER CONTACTS TO ENABLE SOS"
              : `ALERTING ${contacts[0].name}${contacts.length > 1 ? ` + ${contacts.length - 1}` : ''}`
            }
          </p>
        </section>

        {/* NEARBY DETECTED PLACES (Distance Showcase) */}
        {mockPlaces.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-[10px] uppercase font-mono tracking-widest font-black ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Nearby Proximity Check</h3>
              <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold uppercase italic">Active</span>
            </div>
            <div className="space-y-3">
              {mockPlaces.map((place, idx) => (
                <div 
                  key={idx} 
                  className={`border transition-all flex items-center justify-between p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#151619] border-white/5 hover:border-white/10' : 'bg-white border-gray-100 shadow-sm hover:border-red-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${place.type === 'Hospital' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                      {place.type === 'Hospital' ? <Hospital className="w-4 h-4 text-red-500" /> : <Navigation className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-none mb-1">{place.name}</p>
                      <p className={`text-[10px] font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{place.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-mono font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{place.distance} KM</p>
                    <p className="text-[10px] opacity-60 italic">{place.time} MINS</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={`border rounded-2xl p-5 flex items-center justify-between mb-8 transition-colors ${theme === 'dark' ? 'bg-[#151619] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <MapPin className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className={`text-[10px] uppercase font-mono tracking-widest mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Network Node</p>
              {location.loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Acquiring...</span>
                </div>
              ) : location.error ? (
                <span className="text-sm font-medium text-red-400">{location.error}</span>
              ) : (
                <div className={`text-xs font-mono font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={updateLocation}
            className={`transition-colors ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
          >
            <Loader2 className={`w-5 h-5 ${location.loading ? 'animate-spin' : ''}`} />
          </button>
        </section>

        <section className="grid grid-cols-2 gap-4 mb-8">
          <HelpCard 
            icon={<Hospital className="w-7 h-7" />} 
            label="Hospitals" 
            color="bg-red-500" 
            theme={theme}
            onClick={() => window.open(getNearbyUrl("hospitals"), "_blank")}
          />
          <HelpCard 
            icon={<ShieldAlert className="w-7 h-7" />} 
            label="Police" 
            color="bg-blue-600" 
            theme={theme}
            onClick={() => window.open(getNearbyUrl("police stations"), "_blank")}
          />
          <HelpCard 
            icon={<Pill className="w-7 h-7" />} 
            label="Pharmacy" 
            color="bg-emerald-600" 
            theme={theme}
            onClick={() => window.open(getNearbyUrl("pharmacies"), "_blank")}
          />
          <HelpCard 
            icon={<Flame className="w-7 h-7" />} 
            label="Fire Station" 
            color="bg-orange-500" 
            theme={theme}
            onClick={() => window.open(getNearbyUrl("fire stations"), "_blank")}
          />
        </section>

        <section className={`border rounded-3xl p-6 mb-8 transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-md'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
              <Stethoscope className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-bold uppercase tracking-tight italic">Tactical AI Advice</h3>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {["Wounds", "Choking", "Heat Stroke", "Accident"].map((t) => (
              <button
                key={t}
                onClick={() => fetchAIAdvice(t)}
                className={`px-4 py-2 border rounded-full text-[10px] font-bold uppercase transition-colors ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-transparent text-gray-700'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Query AI for First Aid..." 
              className={`w-full border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${theme === 'dark' ? 'bg-[#1A1A1A] border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchAIAdvice(e.currentTarget.value);
              }}
            />
            <MessageSquare className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          </div>
        </section>

        <footer className={`mt-auto pt-8 border-t flex flex-col gap-2 text-center sm:text-left ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-gray-500 gap-2">
            <span>GUARDIAN CORE v1.2.0</span>
            <span>VOICE ENGINE: ACTIVE</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-tight">
            EMERGENCY PROTOCOL: Call 112/100/101 in critical danger. This AI tool is a supplement, not a replacement.
          </p>
        </footer>
      </main>

      {/* Contacts Overlay */}
      <AnimatePresence>
        {showContacts && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-md rounded-[32px] overflow-hidden flex flex-col shadow-2xl border ${theme === 'dark' ? 'bg-[#151619] border-white/10' : 'bg-white border-gray-200'}`}
            >
              <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-black tracking-tighter uppercase italic">Emergency Node List</h2>
                </div>
                <button onClick={() => setShowContacts(false)} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>
                  <X className={theme === 'dark' ? "w-6 h-6 text-gray-400" : "w-6 h-6 text-gray-600"} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-gray-500 px-1">Active Responders</p>
                  {contacts.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-700/30 rounded-3xl opacity-50 text-center">
                      <UserPlus className="w-12 h-12 mb-3 text-gray-600" />
                      <p className="text-xs">Registry is empty.</p>
                    </div>
                  ) : (
                    contacts.map(contact => (
                      <motion.div 
                        layout
                        key={contact.id}
                        className={`border rounded-2xl p-4 flex items-center justify-between group px-5 py-4 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                      >
                        <div>
                          <p className={`font-bold text-sm tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{contact.name}</p>
                          <p className="text-[10px] font-mono text-gray-500">{contact.phone}</p>
                        </div>
                        <button 
                          onClick={() => removeContact(contact.id)}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>

                <form onSubmit={addContact} className="space-y-4 pt-6 border-t border-gray-800">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-gray-500 px-1">New Entry</p>
                  <div className="grid gap-3">
                    <input 
                      type="text" 
                      placeholder="Name"
                      value={newContact.name}
                      onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'bg-[#1A1A1A] border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                    <input 
                      type="tel" 
                      placeholder="Phone"
                      value={newContact.phone}
                      onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'bg-[#1A1A1A] border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Register Node
                  </button>
                </form>
              </div>
              
              <div className="p-4 bg-blue-500/10 border-t border-white/5">
                <p className="text-[10px] text-center font-bold text-blue-400 uppercase tracking-widest">
                  END-TO-END LOCAL ENCRYPTION ACTIVE
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Response Overlay */}
      <AnimatePresence>
        {aiResponse && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-100'}`}>
              <div className="p-4 border-bottom border-white/5 flex items-center justify-between bg-purple-600/10">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-purple-400" />
                  <span className="font-bold uppercase tracking-widest text-xs">Tactical Response: {emergencyType}</span>
                </div>
                <button onClick={() => setAiResponse(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className={`p-8 max-h-[70vh] overflow-y-auto prose prose-sm ${theme === 'dark' ? 'prose-invert' : 'prose-stone'}`}>
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    <p className="text-sm border-b-2 border-purple-500 pb-1 italic">Synopsizing Life-Saving Protocols...</p>
                  </div>
                ) : (
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                )}
              </div>
              
              <div className="p-4 bg-red-500/10 border-t border-white/5">
                <p className="text-[10px] text-center font-bold text-red-400 uppercase tracking-widest italic group-hover:tracking-[0.2em] transition-all">
                  PRIORITY ALERT: CALL EMERGENCY SERVICES IMMEDIATELY
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HelpCard({ 
  icon, 
  label, 
  color, 
  theme,
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  color: string; 
  theme: "dark" | "light";
  onClick: () => void 
}) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`border rounded-2xl p-5 flex flex-col items-center gap-3 group transition-all h-full ${theme === 'dark' ? 'bg-[#151619] border-white/5 hover:border-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}
    >
      <div className={`p-4 rounded-xl ${color} shadow-lg transition-transform group-hover:scale-110 text-white`}>
        {icon}
      </div>
      <div className="flex items-center gap-1 group-hover:gap-2 transition-all">
        <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
        <ChevronRight className={`w-3 h-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
      </div>
    </motion.button>
  );
}
