import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Simple icons using emoji
const Icon = {
  mail: "📧",
  phone: "📞",
  location: "📍",
  send: "🚀",
  sun: "☀️",
  moon: "🌙",
  check: "✅",
  error: "❌",
  online: "🟢",
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

  // Form state
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Dark mode with persistence - fixed implementation
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

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const error = validateForm(name, contact, message);
    if (error) {
      setFormError(error);
      return;
    }

    setSending(true);

    try {
      // Simulate sending (replace with your actual API call)
      // For now, we'll just open the email client with the form data
      const subject = encodeURIComponent(`Website Contact from ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nContact: ${contact}\n\nMessage:\n${message}\n\n---\nSent from contact form`
      );
      
      // Try to send via email client
      window.open(`mailto:${primaryEmail}?subject=${subject}&body=${body}`, '_blank');
      
      setSuccessMessage("Message prepared! Your email client should open shortly.");
      
      // Clear form after success
      setTimeout(() => {
        setName("");
        setContact("");
        setMessage("");
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
  };

  const themeClasses = darkMode 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
    : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900';

  const cardClasses = darkMode 
    ? 'bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600' 
    : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300';

  const inputClasses = darkMode 
    ? 'bg-gray-700 border-gray-600 focus:border-blue-500 text-white' 
    : 'bg-white border-gray-300 focus:border-blue-500';

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
                onClick={handleEmailClick}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 ${cardClasses} shadow-lg hover:shadow-xl`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl">
                    {Icon.mail}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">Email</h3>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                      {primaryEmail}
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Click to compose
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Response within 2-3 hours
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Phone Card */}
              <motion.div
                onClick={handlePhoneClick}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 ${cardClasses} shadow-lg hover:shadow-xl`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl">
                    {Icon.phone}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">Phone</h3>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                      {phoneDisplay}
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Click to call
                      </span>
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
              } shadow-lg`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
                  {Icon.location}
                </div>
                <div>
                  <h3 className="font-bold text-lg">Location</h3>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{location}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      Remote friendly
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      JST Timezone
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

            {/* Availability Status */}
            <motion.div
              className={`p-4 rounded-xl ${
                darkMode 
                  ? 'bg-green-900/30 border border-green-700/50' 
                  : 'bg-green-50 border border-green-200'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-lg"
                >
                  {Icon.online}
                </motion.span>
                <div>
                  <span className="font-semibold text-green-600">Usually Available</span>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    7-10 PM JST • Working hours: 9 AM - 6 PM JST
                  </p>
                </div>
              </div>
            </motion.div>
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
                <h2 className="text-3xl font-bold mb-2">Send a Message</h2>
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
                      className={`w-full px-4 py-3 rounded-xl border ${inputClasses} focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all`}
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
                      className={`w-full px-4 py-3 rounded-xl border ${
                        contact && validateContact(contact) 
                          ? 'border-red-300 focus:border-red-500' 
                          : inputClasses
                      } focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all`}
                      required
                    />
                    {contact && (
                      <p className={`mt-1 text-xs ${
                        validateContact(contact) ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {validateContact(contact) || "Looks good!"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Your Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell me about your project, question, or just say hello! I'm here to help..."
                    rows={6}
                    className={`w-full px-4 py-3 rounded-xl border ${inputClasses} focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none`}
                    required
                  />
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
                    disabled={sending || !name.trim() || !contact.trim() || !message.trim() || validateContact(contact)}
                    whileHover={{ scale: sending ? 1 : 1.02 }}
                    whileTap={{ scale: sending ? 1 : 0.98 }}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${
                      sending || !name.trim() || !contact.trim() || !message.trim() || validateContact(contact)
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
                        <span className="text-lg">{Icon.send}</span>
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

              {/* Tips */}
              <motion.div
                className={`mt-8 p-6 rounded-2xl ${
                  darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  💡 Tips for Better Communication
                </h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Be specific about your project requirements</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Include your budget range for projects</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Mention your preferred meeting times (JST)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Share relevant links or documents</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

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