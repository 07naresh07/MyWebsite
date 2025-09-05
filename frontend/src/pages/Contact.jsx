import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Official SVG Icons
const Icon = {
  mail: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
  ),
  location: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,15.31L23.31,12L20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31Z"/>
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  ),
  online: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="currentColor"/>
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z"/>
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
    </svg>
  ),
  template: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>
  ),
};

// Real social media icons as SVG components
const SocialIcon = {
  linkedin: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
};

// Better checkmark icon as SVG
const CheckmarkIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 20 20" className={className} fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

// Validation helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,}$/;

function validateContact(contact) {
  if (!contact) return "Please provide your email or phone number.";
  const trimmed = contact.trim();
  if (EMAIL_RE.test(trimmed)) return "";
  if (PHONE_RE.test(trimmed)) return "";
  return "Enter a valid email address or phone number.";
}

function validateForm(name, contact, message) {
  if (!name?.trim()) return "Please enter your name.";
  const contactError = validateContact(contact);
  if (contactError) return contactError;
  if (!message?.trim()) return "Please write a message.";
  return "";
}

export default function EnhancedContact() {
  // Contact info
  const fullName = "Naresh Singh Dhami";
  const primaryEmail = "ndhami74@gmail.com";
  const phoneDisplay = "+81-70-3967-9981";
  const phoneClean = "+817039679981";
  const location = "Toda City, Saitama, Japan";
  
  const socialLinks = {
    linkedin: "https://www.linkedin.com/in/naresh-singh-dhami-461bb8132/",
    github: "https://github.com/07naresh07",
    facebook: "https://www.facebook.com/naresh.kshettri",
  };

  // Message templates
  const messageTemplates = [
    "Hi! I'd like to discuss a project opportunity with you.",
    "Hi Naresh! I have a question about your work.",
    "Hello! I'd like to schedule a consultation call.",
  ];

  // Form state
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoSaved, setAutoSaved] = useState(false);

  // Dark mode with persistence
  const [darkMode, setDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }
  }, [darkMode, isLoaded]);

  // Auto-save form data
  useEffect(() => {
    const savedForm = localStorage.getItem('contactFormDraft');
    if (savedForm) {
      const { name: savedName, contact: savedContact, message: savedMessage } = JSON.parse(savedForm);
      if (savedName || savedContact || savedMessage) {
        setName(savedName || "");
        setContact(savedContact || "");
        setMessage(savedMessage || "");
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 3000);
      }
    }
  }, []);

  useEffect(() => {
    if (name || contact || message) {
      localStorage.setItem('contactFormDraft', JSON.stringify({ name, contact, message }));
    }
  }, [name, contact, message]);

  // Real-time clock for availability
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Get current time in JST
  const getJSTTime = () => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(currentTime);
  };

  // Check availability status
  const getAvailabilityStatus = () => {
    const jstTime = new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"});
    const hour = new Date(jstTime).getHours();
    
    if (hour >= 9 && hour < 18) {
      return { status: "working", message: "Working Hours - Usually available", color: "green" };
    } else if (hour >= 19 && hour < 22) {
      return { status: "available", message: "Personal Time - Available for calls", color: "blue" };
    } else {
      return { status: "offline", message: "Offline - Will respond within 2-3 hours", color: "gray" };
    }
  };

  // Copy to clipboard functionality
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(""), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Message character counter
  const messageLength = message.length;
  const maxLength = 1000;

  // Smart email opening - Gmail app on mobile, Gmail web on desktop
  const handleEmailClick = () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try Gmail app first, fallback to default mail client
      const gmailAppUrl = `googlegmail://co?to=${primaryEmail}`;
      const mailtoFallback = `mailto:${primaryEmail}`;
      
      // Try Gmail app
      window.location.href = gmailAppUrl;
      
      // Fallback to mailto after a brief delay
      setTimeout(() => {
        window.location.href = mailtoFallback;
      }, 500);
    } else {
      // Desktop - open Gmail web
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${primaryEmail}`, '_blank');
    }
  };

  const handlePhoneClick = () => {
    window.open(`tel:${phoneClean}`, '_self');
  };

  const handleSocialClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Form submission - now shows platform selection
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const error = validateForm(name, contact, message);
    if (error) {
      setFormError(error);
      return;
    }

    // Show platform selection modal
    setShowPlatformModal(true);
  };

  // Handle platform-specific messaging
  const handlePlatformSelect = (platform) => {
    setShowPlatformModal(false);
    setSending(true);

    const messageContent = `Hi! I'm ${name}.\n\nContact: ${contact}\n\nMessage: ${message}\n\n---\nSent from your website contact form`;

    try {
      switch (platform) {
        case 'facebook':
          // Open Facebook Messenger
          const fbMessage = encodeURIComponent(messageContent);
          window.open(`https://m.me/naresh.kshettri?text=${fbMessage}`, '_blank');
          setSuccessMessage("Opening Facebook Messenger...");
          break;

        case 'linkedin':
          // Open LinkedIn messaging (will go to profile, user needs to click message)
          const linkedinMessage = encodeURIComponent(messageContent);
          window.open(`https://www.linkedin.com/messaging/compose/?recipient=naresh-singh-dhami-461bb8132&subject=Website Contact from ${encodeURIComponent(name)}&body=${linkedinMessage}`, '_blank');
          setSuccessMessage("Opening LinkedIn Messenger...");
          break;

        case 'email':
          // Always open Gmail - never traditional mail clients
          const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const subject = encodeURIComponent(`Website Contact from ${name}`);
          const body = encodeURIComponent(messageContent);
          
          if (isMobile) {
            // Try Gmail app first
            const gmailAppUrl = `googlegmail://co?to=${primaryEmail}&subject=${subject}&body=${body}`;
            
            // Create a test to see if Gmail app opens
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = gmailAppUrl;
            document.body.appendChild(iframe);
            
            // If Gmail app doesn't open, use Gmail web
            setTimeout(() => {
              if (document.visibilityState === 'visible') {
                window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${primaryEmail}&subject=${subject}&body=${body}`, '_blank');
              }
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          } else {
            // Desktop - always Gmail web
            window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${primaryEmail}&subject=${subject}&body=${body}`, '_blank');
          }
          
          setSuccessMessage("Opening Gmail...");
          break;

        default:
          setFormError("Please select a messaging platform.");
          return;
      }

      // Clear success message after delay, but keep form data
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

    } catch (error) {
      setFormError("Something went wrong. Please try again or contact me directly.");
    } finally {
      setSending(false);
    }
  };

  const clearForm = () => {
    setName("");
    setContact("");
    setMessage("");
    setFormError("");
    setSuccessMessage("");
    localStorage.removeItem('contactFormDraft');
  };

  const themeClasses = darkMode 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
    : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900';

  const cardClasses = darkMode 
    ? 'bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600' 
    : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300';

  // Fixed input classes to maintain background in all states
  const getInputClasses = (hasError = false, isValid = false) => {
    const baseClasses = darkMode 
      ? 'bg-gray-700 text-white focus:ring-blue-200' 
      : 'bg-white focus:ring-blue-200';
    
    if (hasError) {
      return `${baseClasses} border-red-400 focus:border-red-500`;
    } else if (isValid) {
      return `${baseClasses} border-green-400 focus:border-green-500`;
    } else {
      return `${baseClasses} ${darkMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-300 focus:border-blue-500'}`;
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${themeClasses}`}>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        
        {/* Header with Dark Mode Toggle */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center items-center gap-4 mb-6">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Get In Touch
            </h1>
            <motion.button
              onClick={() => setDarkMode(!darkMode)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-full border-2 transition-all duration-300 ${
                darkMode 
                  ? 'border-gray-600 hover:border-gray-500 bg-gray-800 hover:bg-gray-700' 
                  : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl">{darkMode ? Icon.sun : Icon.moon}</span>
            </motion.button>
          </div>
          
          <p className={`text-xl max-w-2xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Ready to collaborate? I'd love to hear from you! Reach out directly or use the form below.
          </p>
        </motion.div>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-5 gap-12">
          
          {/* Contact Information - Left Side */}
          <motion.div
            className="lg:col-span-2 space-y-8"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            
            {/* Direct Contact Cards */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Direct Contact</h2>

              {/* Email Card */}
              <motion.div
                className={`p-6 rounded-2xl transition-all duration-300 ${cardClasses} shadow-lg hover:shadow-xl group`}
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    onClick={handleEmailClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl cursor-pointer"
                  >
                    {Icon.mail}
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">Email</h3>
                      <motion.button
                        onClick={() => copyToClipboard(primaryEmail, "Email")}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        {Icon.copy}
                      </motion.button>
                    </div>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                      {primaryEmail}
                    </p>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={handleEmailClick}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
                      >
                        Compose Email
                      </motion.button>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Response within 2-3 hours
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Phone Card */}
              <motion.div
                className={`p-6 rounded-2xl transition-all duration-300 ${cardClasses} shadow-lg hover:shadow-xl group`}
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    onClick={handlePhoneClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl cursor-pointer"
                  >
                    {Icon.phone}
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">Phone</h3>
                      <motion.button
                        onClick={() => copyToClipboard(phoneClean, "Phone")}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        {Icon.copy}
                      </motion.button>
                    </div>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                      {phoneDisplay}
                    </p>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={handlePhoneClick}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
                      >
                        Call Now
                      </motion.button>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Best: 7-10 PM JST
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Location */}
            <motion.div
              className={`p-6 rounded-2xl ${
                darkMode 
                  ? 'bg-gray-800 border border-gray-700' 
                  : 'bg-white border border-gray-200'
              } shadow-lg group`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                  {Icon.location}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">Location</h3>
                    <motion.button
                      onClick={() => copyToClipboard(location, "Location")}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                        darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                      }`}
                    >
                      {Icon.copy}
                    </motion.button>
                  </div>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>{location}</p>
                  <div className="flex gap-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      Remote friendly
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                      {Icon.clock}
                      JST: {getJSTTime()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-semibold mb-4">Connect on Social</h3>
              <div className="flex gap-4">
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <motion.button
                    key={platform}
                    onClick={() => handleSocialClick(url)}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`w-14 h-14 rounded-xl ${
                      darkMode 
                        ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white' 
                        : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-800'
                    } shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center`}
                  >
                    {SocialIcon[platform]}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Enhanced Availability Status */}
            <motion.div
              className={`p-4 rounded-xl ${(() => {
                const status = getAvailabilityStatus();
                const baseColor = status.color === 'green' ? 'green' : status.color === 'blue' ? 'blue' : 'gray';
                return darkMode 
                  ? `bg-${baseColor}-900/30 border border-${baseColor}-700/50` 
                  : `bg-${baseColor}-50 border border-${baseColor}-200`;
              })()}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-3 h-3 rounded-full ${(() => {
                    const status = getAvailabilityStatus();
                    return status.color === 'green' ? 'bg-green-500' : 
                           status.color === 'blue' ? 'bg-blue-500' : 'bg-gray-500';
                  })()}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${(() => {
                      const status = getAvailabilityStatus();
                      return status.color === 'green' ? 'text-green-600' : 
                             status.color === 'blue' ? 'text-blue-600' : 'text-gray-600';
                    })()}`}>
                      {getAvailabilityStatus().message}
                    </span>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Current JST: {getJSTTime()} • Working hours: 9 AM - 6 PM JST
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Copy Success Notification */}
            <AnimatePresence>
              {copySuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2"
                >
                  {Icon.check}
                  {copySuccess} copied to clipboard!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Contact Form - Right Side */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className={`p-8 rounded-3xl ${
              darkMode 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-white border border-gray-200'
            } shadow-2xl`}>
              
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-3xl font-bold">Send a Message</h2>
                  {autoSaved && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 text-sm text-green-600"
                    >
                      {Icon.save}
                      Draft restored
                    </motion.div>
                  )}
                </div>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  I'll get back to you as soon as possible!
                </p>
              </div>

              <div className="space-y-6">
                
                {/* Name and Contact Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Your Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className={`w-full px-4 py-3 rounded-xl border ${getInputClasses()} focus:outline-none focus:ring-2 transition-all`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Contact Info</label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="email@domain.com or +1-555-123-4567"
                      className={`w-full px-4 py-3 rounded-xl border ${getInputClasses(
                        contact && validateContact(contact),
                        contact && !validateContact(contact)
                      )} focus:outline-none focus:ring-2 transition-all`}
                      required
                    />
                    {contact && (
                      <p className={`mt-1 text-xs flex items-center gap-1 ${
                        validateContact(contact) ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {validateContact(contact) ? (
                          validateContact(contact)
                        ) : (
                          <CheckmarkIcon className="w-4 h-4" />
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message Templates */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold">Your Message</label>
                    <motion.button
                      onClick={() => setShowTemplates(!showTemplates)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                        darkMode 
                          ? 'border-gray-600 hover:bg-gray-700' 
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {Icon.template}
                      Quick Templates
                    </motion.button>
                  </div>

                  {/* Template Selection */}
                  <AnimatePresence>
                    {showTemplates && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 space-y-2"
                      >
                        {messageTemplates.map((template, index) => (
                          <motion.button
                            key={index}
                            onClick={() => {
                              setMessage(template);
                              setShowTemplates(false);
                            }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                              darkMode 
                                ? 'border-gray-600 hover:bg-gray-700 hover:border-gray-500' 
                                : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            {template}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell me about your project, question, or just say hello! I'm here to help..."
                    rows={6}
                    maxLength={maxLength}
                    className={`w-full px-4 py-3 rounded-xl border ${getInputClasses()} focus:outline-none focus:ring-2 transition-all resize-none`}
                    required
                  />
                  
                  {/* Character Counter */}
                  <div className="flex justify-between items-center mt-2">
                    <div className={`text-xs ${
                      messageLength > maxLength * 0.9 ? 'text-orange-600' : 
                      messageLength > maxLength * 0.8 ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {messageLength}/{maxLength} characters
                    </div>
                  </div>
                </div>

                {/* Error/Success Messages */}
                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700"
                    >
                      <span className="flex items-center gap-2">
                        {Icon.error} {formError}
                      </span>
                    </motion.div>
                  )}
                  
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700"
                    >
                      <span className="flex items-center gap-2">
                        {Icon.check} {successMessage}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <motion.button
                    onClick={handleSubmit}
                    disabled={sending || !name.trim() || !contact.trim() || !message.trim() || validateContact(contact) || messageLength > maxLength}
                    whileHover={{ scale: sending ? 1 : 1.02 }}
                    whileTap={{ scale: sending ? 1 : 0.98 }}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 flex-1 justify-center ${
                      sending || !name.trim() || !contact.trim() || !message.trim() || validateContact(contact) || messageLength > maxLength
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {sending ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        {Icon.send}
                        Send Message
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    onClick={clearForm}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-6 py-4 rounded-2xl border font-semibold transition-colors ${
                      darkMode 
                        ? 'border-gray-600 hover:bg-gray-700' 
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Clear
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Platform Selection Modal */}
        <AnimatePresence>
          {showPlatformModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPlatformModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } border rounded-3xl p-8 max-w-md w-full shadow-2xl`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Choose Messaging Platform</h3>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    How would you like to send your message?
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Facebook Messenger */}
                  <motion.button
                    onClick={() => handlePlatformSelect('facebook')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 ${
                      darkMode 
                        ? 'border-gray-600 hover:border-blue-500 bg-gray-700 hover:bg-gray-600' 
                        : 'border-gray-200 hover:border-blue-500 bg-gray-50 hover:bg-blue-50'
                    } flex items-center gap-4`}
                  >
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                      {SocialIcon.facebook}
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold">Facebook Messenger</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Instant messaging • Fast response
                      </p>
                    </div>
                  </motion.button>

                  {/* LinkedIn Messenger */}
                  <motion.button
                    onClick={() => handlePlatformSelect('linkedin')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 ${
                      darkMode 
                        ? 'border-gray-600 hover:border-blue-500 bg-gray-700 hover:bg-gray-600' 
                        : 'border-gray-200 hover:border-blue-500 bg-gray-50 hover:bg-blue-50'
                    } flex items-center gap-4`}
                  >
                    <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-white">
                      {SocialIcon.linkedin}
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold">LinkedIn Messenger</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Professional networking • Business inquiries
                      </p>
                    </div>
                  </motion.button>

                  {/* Email */}
                  <motion.button
                    onClick={() => handlePlatformSelect('email')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 ${
                      darkMode 
                        ? 'border-gray-600 hover:border-blue-500 bg-gray-700 hover:bg-gray-600' 
                        : 'border-gray-200 hover:border-blue-500 bg-gray-50 hover:bg-blue-50'
                    } flex items-center gap-4`}
                  >
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white">
                      {Icon.mail}
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold">Email</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Traditional email • Detailed conversations
                      </p>
                    </div>
                  </motion.button>
                </div>

                <motion.button
                  onClick={() => setShowPlatformModal(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full mt-6 py-3 rounded-2xl border font-semibold ${
                    darkMode 
                      ? 'border-gray-600 hover:bg-gray-700' 
                      : 'border-gray-300 hover:bg-gray-100'
                  } transition-colors`}
                >
                  Cancel
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Response Info */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className={`max-w-2xl mx-auto p-6 rounded-2xl ${
            darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white/50 border border-gray-200'
          } backdrop-blur-sm`}>
            <h3 className="font-semibold mb-2">Response Time</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              I typically respond to emails within <strong>2-3 hours</strong> during working hours (9 AM - 6 PM JST). 
              For urgent matters, please call during <strong>7-10 PM JST</strong> for the best chance to reach me directly.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}