// src/pages/Contact.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getProfile, sendContact } from "../lib/api.js";

/* Enhanced SVG Icons with subtle hover color (no underline text anywhere) */
const BrandIcon = {
  linkedin: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 transition-colors group-hover:text-blue-600">
      <path d="M4.983 3.5C4.983 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.483 1.12 2.483 2.5ZM.24 8.25h4.52v14.5H.24V8.25Zm7.727 0h4.332v1.982h.062c.603-1.143 2.078-2.35 4.28-2.35 4.58 0 5.422 3.015 5.422 6.936v7.932h-4.52v-7.04c0-1.68-.03-3.84-2.34-3.84-2.342 0-2.7 1.83-2.7 3.72v7.16H7.967V8.25Z" fill="currentColor"/>
    </svg>
  ),
  github: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 transition-colors group-hover:text-gray-800">
      <path d="M12 .5a11.5 11.5 0 0 0-3.638 22.425c.575.105.787-.25.787-.557 0-.275-.01-1.007-.016-1.978-3.202.696-3.878-1.542-3.878-1.542-.523-1.33-1.278-1.686-1.278-1.686-1.044-.714.08-.699.08-.699 1.155.082 1.764 1.187 1.764 1.187 1.027 1.76 2.695 1.252 3.35.957.104-.753.402-1.252.73-1.54-2.556-.29-5.245-1.278-5.245-5.688 0-1.256.45-2.283 1.187-3.088-.12-.29-.515-1.46.112-3.045 0 0 .966-.31 3.167 1.18A10.99 10.99 0 0 1 12 6.86c.98.004 1.967.133 2.89.392 2.2-1.49 3.165-1.18 3.165-1.18.628 1.585.233 2.755.114 3.045.74.805 1.185 1.832 1.185 3.088 0 4.42-2.693 5.395-5.258 5.678.413.357.78 1.06.78 2.136 0 1.543-.014 2.786-.014 3.166 0 .31.21.67.793.556A11.5 11.5 0 0 0 12 .5Z" fill="currentColor"/>
    </svg>
  ),
  facebook: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 transition-colors group-hover:text-blue-500">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 4.98 3.66 9.12 8.44 9.94v-7.03H7.9v-2.9h2.54v-2.21c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34v7.03C18.34 21.18 22 17.04 22 12.06Z" fill="currentColor"/>
    </svg>
  ),
};

const Icon = {
  mail: <span className="text-xl">📧</span>,
  phone: <span className="text-xl">📞</span>,
  location: <span className="text-xl">📍</span>,
  copy: <span className="text-base">📋</span>,
  check: <span className="text-base text-green-600">✅</span>,
  time: <span className="text-base">⏰</span>,
  online: <span className="text-green-500 animate-pulse">🟢</span>,
  away: <span className="text-yellow-500">🟡</span>,
  vacation: <span className="text-amber-500">🏝️</span>,
  offline: <span className="text-gray-400">⚪</span>,
  card: <span className="text-xl">💳</span>,
  qr: <span className="text-xl">📱</span>,
  pin: <span className="text-xl">📌</span>,
  wa: <span className="text-green-500">💬</span>,
  gear: <span className="text-base">⚙️</span>,
  send: <span className="text-base">🚀</span>,
  sparkles: <span className="text-yellow-500">✨</span>,
  magic: <span className="text-purple-500">🪄</span>,
  ai: <span className="text-blue-500">🤖</span>,
  writing: <span className="text-blue-600">✍️</span>,
  translate: <span className="text-indigo-500">🌐</span>,
  mood: <span className="text-pink-500">😊</span>,
  calendar: <span className="text-blue-500">📅</span>,
  download: <span className="text-purple-500">💾</span>,
};

/* ---------- Helpers & Hooks ---------- */
function useCopyFeedback() {
  const [copiedKey, setCopiedKey] = useState("");
  useEffect(() => {
    if (!copiedKey) return;
    const t = setTimeout(() => setCopiedKey(""), 2000);
    return () => clearTimeout(t);
  }, [copiedKey]);
  return [copiedKey, setCopiedKey];
}

function useDebouncedCallback(fn, delay = 400) {
  const t = useRef(null);
  return (...args) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  };
}

function useTypingIndicator() {
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef(null);
  const handleTyping = () => {
    setIsTyping(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsTyping(false), 1000);
  };
  return [isTyping, handleTyping];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,}$/;
const telSan = (s) => (s || "").replace(/[^\d+]/g, "");

function validateContact(x) {
  if (!x) return "Please provide your email or phone number.";
  const t = x.trim();
  if (EMAIL_RE.test(t)) return "";
  if (PHONE_RE.test(t)) return "";
  return "Enter a valid email address or phone number.";
}

/* Basic language/mood helpers */
function useSmartSuggestions(message, contact) {
  return useMemo(() => {
    const suggestions = [];
    if ((message || "").length < 20) {
      suggestions.push({ type: "length", text: "Consider adding more details to your message" });
    }
    if (contact && !EMAIL_RE.test(contact) && !PHONE_RE.test(contact)) {
      suggestions.push({ type: "contact", text: "Please provide a valid email or phone number" });
    }
    const urgentWords = ["urgent", "asap", "immediately", "emergency"];
    if (urgentWords.some((w) => (message || "").toLowerCase().includes(w))) {
      suggestions.push({ type: "tone", text: "Consider mentioning your timeline for urgent requests" });
    }
    if ((message || "").length > 50 && !/thank|please/i.test(message)) {
      suggestions.push({ type: "politeness", text: 'Adding "please" or "thank you" makes messages more polite' });
    }
    return suggestions;
  }, [message, contact]);
}

function detectLanguage(text) {
  const jp = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
  const ko = /[\uac00-\ud7af]/;
  const zh = /[\u4e00-\u9fff]/;
  if (jp.test(text || "")) return "ja";
  if (ko.test(text || "")) return "ko";
  if (zh.test(text || "")) return "zh";
  return "en";
}

/* ---------- Component ---------- */
export default function EnhancedContact() {
  // Profile (so name/email can come from backend)
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, []);
  const fullName = profile?.full_name || "Naresh Singh Dhami";
  const primaryEmail = profile?.email || "ndhami74@gmail.com";

  // Hidden alternate email (never rendered in DOM)
  const altEmail = useMemo(() => {
    const codes = [101,114,46,110,100,104,97,109,105,49,57,57,53,64,103,109,97,105,108,46,99,111,109];
    return String.fromCharCode.apply(null, codes);
  }, []);

  // Contact data
  const phoneUi = "+81-70-3967-9981";
  const phoneClean = telSan(phoneUi);
  const postal = "3350013";
  const location = `Toda City, Saitama, Japan (${postal})`;
  const links = {
    linkedin: "https://www.linkedin.com/in/naresh-singh-dhami-461bb8132/",
    github: "https://github.com/07naresh07",
    facebook: "https://www.facebook.com/naresh.kshettri",
  };

  // Form state
  const [nameInput, setNameInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [prefReply, setPrefReply] = useState("email");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [serverMsg, setServerMsg] = useState("");

  // Enhanced state
  const [showQR, setShowQR] = useState(false);
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [messageLanguage, setMessageLanguage] = useState("en");
  const [wordCount, setWordCount] = useState(0);
  const [estimatedReadTime, setEstimatedReadTime] = useState(0);
  const [messageMood, setMessageMood] = useState("neutral");
  const [showTemplates, setShowTemplates] = useState(false);
  const [lastPayloadHash, setLastPayloadHash] = useState("");

  // Smart features
  const [isTyping, handleTyping] = useTypingIndicator();
  const smartSuggestions = useSmartSuggestions(messageInput, contactInput);
  const [copiedKey, setCopiedKey] = useCopyFeedback(); // ← keep ONLY this one

  // Derived helpers
  const waUrl = `https://wa.me/${phoneClean}`;

  // Templates
  const messageTemplates = {
    business: [
      { id: 1, title: "Project Inquiry", content: "I'm interested in discussing a potential project collaboration. Could we schedule a brief call to explore opportunities?" },
      { id: 2, title: "Freelance Work", content: "I came across your portfolio and I'm impressed by your work. I have a freelance opportunity that might interest you." },
      { id: 3, title: "Partnership", content: "I believe there's potential for a mutually beneficial partnership between our organizations." },
    ],
    personal: [
      { id: 4, title: "General Inquiry", content: "I hope you're doing well. I wanted to reach out regarding..." },
      { id: 5, title: "Networking", content: "I'd love to connect and learn more about your experience in the industry." },
      { id: 6, title: "Coffee Chat", content: "Would you be interested in grabbing coffee sometime to discuss ideas and experiences?" },
    ],
    feedback: [
      { id: 7, title: "Website Feedback", content: "I've been exploring your website and wanted to share some feedback..." },
      { id: 8, title: "Bug Report", content: "I noticed a potential issue on your site that I thought you should know about..." },
      { id: 9, title: "Suggestion", content: "I have a suggestion that might improve the user experience on your platform..." },
    ],
  };

  // Effects
  useEffect(() => {
    const words = (messageInput || "").trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
    setEstimatedReadTime(Math.ceil(words.length / 200));
    setMessageLanguage(detectLanguage(messageInput));

    const positiveWords = ["excited", "great", "awesome", "love", "amazing", "fantastic"];
    const negativeWords = ["problem", "issue", "bug", "error", "urgent", "critical"];
    const lower = (messageInput || "").toLowerCase();
    const hasPositive = positiveWords.some((w) => lower.includes(w));
    const hasNegative = negativeWords.some((w) => lower.includes(w));
    if (hasPositive && !hasNegative) setMessageMood("positive");
    else if (hasNegative && !hasPositive) setMessageMood("urgent");
    else setMessageMood("neutral");

    handleTyping();
  }, [messageInput, handleTyping]);

  // Auto-infer preferred reply from contact input
  useEffect(() => {
    const t = (contactInput || "").trim();
    if (EMAIL_RE.test(t)) setPrefReply("email");
    else if (PHONE_RE.test(t)) setPrefReply("phone");
  }, [contactInput]);

  // Form progression
  const getFormProgress = () => {
    let progress = 0;
    if ((nameInput || "").trim()) progress += 25;
    if ((contactInput || "").trim()) progress += 25;
    if ((messageInput || "").trim()) progress += 40;
    if (prefReply) progress += 10;
    return progress;
  };

  // Compose full email with proper greeting + closing
  const composeEmail = (body) => {
    const sender = (nameInput || "").trim() || "Your Name";
    const greeting = `Hello ${fullName.split(" ")[0]},`;
    return [greeting, "", body, "", "Regards,", sender].join("\n");
  };

  const handleTemplateInsert = (template) => {
    setMessageInput(composeEmail(template.content));
    setShowTemplates(false);
  };

  const enhanceMessage = (type) => {
    const base = (messageInput || "").trim() || "I wanted to reach out regarding...";
    const wrap = (b) => composeEmail(b);
    const variants = {
      formal: wrap(`I hope this message finds you well. ${base}\n\nI look forward to your response.`),
      casual: wrap(`Hey! ${base}\n\nThanks for taking the time to read this!`),
      urgent: wrap(`URGENT: ${base}\n\nPlease respond at your earliest convenience.`),
      polite: wrap(`${base}\n\nThank you for your time and consideration.`),
    };
    setMessageInput(variants[type] || wrap(base));
  };

  // Validation
  const [contactHint, setContactHint] = useState("");
  useEffect(() => {
    setContactHint(validateContact(contactInput));
  }, [contactInput]);

  const validate = () => {
    if (!(nameInput || "").trim()) return "Please enter your name.";
    const ch = validateContact(contactInput);
    if (ch) return ch;
    if (!(messageInput || "").trim()) return "Please write a message.";
    return "";
  };

  // Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setServerMsg("");

    const err = validate();
    if (err) return setFormError(err);

    const payload = {
      name: (nameInput || "").trim(),
      contact: (contactInput || "").trim(),
      message: (messageInput || "").trim(),
      deliverTo: [primaryEmail, altEmail],
      preferences: { reply: prefReply },
      meta: {
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
        ua: navigator.userAgent || "",
      },
    };

    const hash = JSON.stringify(payload);
    if (hash === lastPayloadHash) {
      return setFormError("You already sent this message. Try editing it a bit.");
    }

    try {
      setSending(true);
      await sendContact(payload);
      setLastPayloadHash(hash);
      setServerMsg("Message sent successfully! 🎉");
      setTimeout(() => {
        setNameInput("");
        setContactInput("");
        setMessageInput("");
        setServerMsg("");
      }, 1500);
    } catch (ex) {
      const subj = encodeURIComponent(`Website contact from ${payload.name}`);
      const body = encodeURIComponent(
        `Name: ${payload.name}\nContact: ${payload.contact}\nPreferred reply: ${prefReply}\n\nMessage:\n${payload.message}`
      );
      window.open(`mailto:${primaryEmail}?subject=${subj}&body=${body}`, "_blank");
      setFormError(`Sent via your mail client (fallback). Server response: ${ex.message}`);
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text || "");
      setCopiedKey(label);
    }
  };

  // Helper functions for proper contact actions
  const handleEmailClick = () => {
    window.open(`mailto:${primaryEmail}`, "_blank");
  };

  const handlePhoneClick = () => {
    window.open(`tel:${phoneClean}`, "_blank");
  };

  const downloadVCard = () => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${fullName}
EMAIL:${primaryEmail}
TEL:${phoneClean}
ADR:;;${location};;;${postal};Japan
URL:${links.linkedin}
END:VCARD`;
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fullName.replace(/\s+/g, "_")}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-blue-50 via-white to-purple-50"}`}>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="relative inline-block">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Let&apos;s Connect
            </h1>
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              {Icon.sparkles}
            </motion.div>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Ready to collaborate? I&apos;d love to hear from you! Use the smart contact form below or reach out directly.
          </p>

          {/* Settings Bar */}
          <div className="flex justify-center gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode((v) => !v)}
              className={`px-4 py-2 rounded-full border ${darkMode ? "border-gray-600 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"} transition-colors`}
            >
              {darkMode ? "🌙 Dark" : "☀️ Light"} Mode
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAIFeatures((v) => !v)}
              className={`px-4 py-2 rounded-full border ${showAIFeatures ? "bg-blue-500 text-white border-blue-500" : "border-gray-300 hover:bg-gray-100"} transition-colors`}
            >
              {Icon.ai} AI Features
            </motion.button>
          </div>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-center mb-4">
            <div className={`w-full max-w-md h-2 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${getFormProgress()}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <p className="text-center text-sm text-gray-500">{getFormProgress()}% Complete</p>
        </motion.div>

        {/* Main Layout - Side by Side */}
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Side - Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Quick Contact Cards */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>

              {/* Email Card */}
              <motion.div
                className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white"} border shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer`}
                whileHover={{ y: -3, scale: 1.02 }}
                onClick={handleEmailClick}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">{Icon.mail}</div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(primaryEmail, "email"); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedKey === "email" ? Icon.check : Icon.copy}
                  </motion.button>
                </div>
                <h3 className="font-bold text-lg mb-2">Email</h3>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} mb-4`}>{primaryEmail}</p>
                <div className="flex gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Click to open Gmail</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Replies within 2-3 hours</span>
                </div>
              </motion.div>

              {/* Phone Card */}
              <motion.div
                className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white"} border shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer`}
                whileHover={{ y: -3, scale: 1.02 }}
                onClick={handlePhoneClick}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white">{Icon.phone}</div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(phoneUi, "phone"); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedKey === "phone" ? Icon.check : Icon.copy}
                  </motion.button>
                </div>
                <h3 className="font-bold text-lg mb-2">Phone</h3>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} mb-4`}>{phoneUi}</p>
                <div className="flex gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Click to call</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Best time: 7-10 PM JST</span>
                </div>
              </motion.div>

              {/* Contact Actions */}
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  onClick={downloadVCard}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} shadow-lg hover:shadow-xl transition-all duration-300 border`}
                >
                  {Icon.download}
                  <span className="font-semibold">Save Contact</span>
                </motion.button>

                <motion.a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} shadow-lg hover:shadow-xl transition-all duration-300 border`}
                >
                  {Icon.wa}
                  <span className="font-semibold">WhatsApp</span>
                </motion.a>
              </div>
            </div>

            {/* Social Links */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h3 className="text-lg font-semibold">Connect on Social</h3>
              <div className="flex gap-4">
                {Object.entries(links).map(([platform, href]) => (
                  <motion.a
                    key={platform}
                    whileHover={{ scale: 1.2, y: -3 }}
                    whileTap={{ scale: 0.9 }}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`group p-4 rounded-2xl ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} shadow-lg hover:shadow-xl transition-all duration-300`}
                    aria-label={platform}
                    title={platform[0].toUpperCase() + platform.slice(1)}
                  >
                    {BrandIcon[platform]}
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Location Information */}
            <motion.div
              className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white"} border shadow-lg`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl text-white">{Icon.location}</div>
                <div>
                  <h3 className="font-bold text-lg">Location</h3>
                  <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>{location}</p>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Remote friendly</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">JST Timezone</span>
              </div>
              <motion.a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                {Icon.pin} View on Google Maps
              </motion.a>
            </motion.div>

            {/* Availability Status */}
            <motion.div
              className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-green-50"} border`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center gap-2 mb-2">
                {Icon.online}
                <span className="font-semibold text-green-600">Usually Available</span>
              </div>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                7-10 PM JST (Working hours: 9 AM - 6 PM JST)
              </p>
            </motion.div>
          </motion.div>

          {/* Right Side - Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Smart Contact Form */}
            <div className={`p-8 rounded-3xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-2xl`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Send a Message</h2>
                  <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    {isTyping && messageInput ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        />
                        Analyzing your message...
                      </span>
                    ) : (
                      "I'll get back to you as soon as possible!"
                    )}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTemplates((v) => !v)}
                  className={`px-4 py-2 rounded-xl border ${showTemplates ? "bg-purple-500 text-white" : "border-gray-300 hover:bg-gray-100"} transition-colors`}
                >
                  {Icon.magic} Templates
                </motion.button>
              </div>

              {/* Message Templates */}
              <AnimatePresence>
                {showTemplates && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mb-8 p-6 rounded-2xl ${darkMode ? "bg-gray-700" : "bg-gray-50"} border`}
                  >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      {Icon.writing} Message Templates
                    </h3>
                    <div className="grid gap-6">
                      {Object.entries(messageTemplates).map(([category, templates]) => (
                        <div key={category}>
                          <h4 className="font-medium text-sm uppercase tracking-wider mb-3 text-gray-500">{category}</h4>
                          <div className="space-y-2">
                            {templates.map((template) => (
                              <motion.button
                                key={template.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleTemplateInsert(template)}
                                className={`w-full text-left p-3 rounded-lg ${darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-white hover:bg-gray-100"} border text-sm transition-colors`}
                              >
                                <div className="font-medium mb-1">{template.title}</div>
                                <div className="text-gray-500 text-xs truncate">{template.content}</div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and Contact Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                    <label className="block text-sm font-semibold mb-2">Your Name</label>
                    <input
                      type="text"
                      value={nameInput ?? ""}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="John Doe"
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? "bg-gray-700 border-gray-600 focus:border-blue-500" : "border-gray-300 focus:border-blue-500"} focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all`}
                      required
                    />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
                    <label className="block text-sm font-semibold mb-2">Contact Info</label>
                    <input
                      type="text"
                      value={contactInput ?? ""}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder="email@domain.com or +1-555-123-4567"
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? "bg-gray-700 border-gray-600 focus:border-blue-500" : "border-gray-300 focus:border-blue-500"} focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${contactInput && validateContact(contactInput) ? "border-red-300" : ""}`}
                      aria-describedby="contact-hint"
                      required
                    />
                    <p id="contact-hint" className={`mt-1 text-xs ${contactInput && validateContact(contactInput) ? "text-red-600" : "text-gray-500"}`}>
                      {contactInput ? validateContact(contactInput) || "Looks good." : "You can enter an email address or phone number."}
                    </p>
                  </motion.div>
                </div>

                {/* Reply Preference */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="flex flex-wrap gap-4 items-center">
                  <span className="font-semibold">Preferred Reply Method:</span>
                  {["email", "phone", "either"].map((method) => (
                    <motion.label
                      key={method}
                      whileHover={{ scale: 1.02 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${
                        prefReply === method ? "bg-blue-500 text-white border-blue-500" : darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input type="radio" name="prefReply" value={method} checked={prefReply === method} onChange={(e) => setPrefReply(e.target.value)} className="sr-only" />
                      <span className="capitalize">{method}</span>
                    </motion.label>
                  ))}
                </motion.div>

                {/* Message Area */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold">Your Message</label>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{wordCount} words</span>
                      <span>{estimatedReadTime} min read</span>
                      <span className="flex items-center gap-1">
                        {messageMood === "positive" && <span className="text-green-500">😊 Positive</span>}
                        {messageMood === "urgent" && <span className="text-red-500">⚡ Urgent</span>}
                        {messageMood === "neutral" && <span className="text-blue-500">💼 Professional</span>}
                      </span>
                      {messageLanguage !== "en" && (
                        <span className="flex items-center gap-1">
                          {Icon.translate} {messageLanguage.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={messageInput ?? ""}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Tell me about your project, question, or just say hello! I'm here to help..."
                      rows={6}
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? "bg-gray-700 border-gray-600 focus:border-blue-500" : "border-gray-300 focus:border-blue-500"} focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none`}
                      required
                    />

                    {/* Typing indicator */}
                    {isTyping && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-4 right-4 flex items-center gap-1 text-blue-500">
                        <motion.div className="w-1 h-1 bg-blue-500 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                        <motion.div className="w-1 h-1 bg-blue-500 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                        <motion.div className="w-1 h-1 bg-blue-500 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                      </motion.div>
                    )}
                  </div>

                  {/* Enhancement Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => enhanceMessage("formal")} className={`text-xs px-3 py-1 rounded-full border ${darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"} transition-colors`}>
                      ✨ Make it formal
                    </motion.button>
                    <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => enhanceMessage("casual")} className={`text-xs px-3 py-1 rounded-full border ${darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"} transition-colors`}>
                      😊 Make it casual
                    </motion.button>
                    <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => enhanceMessage("polite")} className={`text-xs px-3 py-1 rounded-full border ${darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"} transition-colors`}>
                      🙏 Add politeness
                    </motion.button>
                    <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => enhanceMessage("urgent")} className={`text-xs px-3 py-1 rounded-full border ${darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"} transition-colors`}>
                      ⚡ Mark urgent
                    </motion.button>
                  </div>
                </motion.div>

                {/* AI Suggestions */}
                <AnimatePresence>
                  {showAIFeatures && smartSuggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={`p-4 rounded-xl border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"}`}>
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-600">{Icon.ai} AI Suggestions</h4>
                      <div className="space-y-2">
                        {smartSuggestions.map((s, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className={`flex items-start gap-2 text-sm ${darkMode ? "text-gray-300" : "text-blue-700"}`}>
                            <span className="text-blue-500 mt-0.5">💡</span>
                            <span>{s.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error/Success */}
                <AnimatePresence>
                  {formError && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
                      <span className="flex items-center gap-2">❌ {formError}</span>
                    </motion.div>
                  )}
                  {serverMsg && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700">
                      <span className="flex items-center gap-2">✅ {serverMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit / Clear / Open in Email */}
                <motion.div className="flex flex-wrap gap-4 pt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
                  <motion.button
                    type="submit"
                    disabled={sending || !(nameInput || "").trim() || !(contactInput || "").trim() || !(messageInput || "").trim()}
                    whileHover={{ scale: sending ? 1 : 1.05 }}
                    whileTap={{ scale: sending ? 1 : 0.95 }}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${
                      sending ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {sending ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        Sending...
                      </>
                    ) : (
                      <>
                        {Icon.send} Send Message
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setNameInput("");
                      setContactInput("");
                      setMessageInput("");
                      setFormError("");
                      setServerMsg("");
                    }}
                    className={`px-6 py-4 rounded-2xl border font-semibold transition-colors ${darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"}`}
                  >
                    Clear
                  </motion.button>

                  <motion.a
                    href={`mailto:${primaryEmail}?subject=${encodeURIComponent("Hello from your website")}&body=${encodeURIComponent(messageInput || "Hi there!")}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-6 py-4 rounded-2xl border font-semibold transition-colors ${darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"}`}
                  >
                    📧 Open in Email App
                  </motion.a>
                </motion.div>

                {/* Pro Tips */}
                <motion.div className={`mt-8 p-6 rounded-2xl ${darkMode ? "bg-gray-700" : "bg-gray-50"} border`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">💡 Pro Tips for Better Communication</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Be specific about your project requirements and timeline</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Include your budget range for project inquiries</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Mention your preferred meeting times (JST timezone)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Share relevant links or documents if applicable</span>
                    </div>
                  </div>
                </motion.div>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions Footer */}
        <motion.div className="mt-12 text-center" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.6 }}>
          <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Prefer other ways to connect? Here are some quick options:</p>

          <div className="flex flex-wrap justify-center gap-4">
            <motion.button
              onClick={() => setShowQR((v) => !v)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} shadow-lg hover:shadow-xl transition-all duration-300 border`}
            >
              {Icon.qr}
              <span className="font-semibold">QR Code</span>
            </motion.button>

            <motion.a
              href="https://calendly.com/your-calendar"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} shadow-lg hover:shadow-xl transition-all duration-300 border`}
            >
              {Icon.calendar}
              <span className="font-semibold">Schedule Call</span>
            </motion.a>

            <motion.button
              onClick={() => copyToClipboard(primaryEmail, "email-footer")}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} shadow-lg hover:shadow-xl transition-all duration-300 border`}
            >
              {copiedKey === "email-footer" ? Icon.check : Icon.copy}
              <span className="font-semibold">Copy Email</span>
            </motion.button>
          </div>

          {/* QR Code Modal */}
          <AnimatePresence>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowQR(false)}
              >
                <motion.div className={`${darkMode ? "bg-gray-800" : "bg-white"} p-8 rounded-3xl shadow-2xl max-w-sm w-full`} onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-center mb-6">Quick Contact QR</h3>
                  <div className="text-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`mailto:${primaryEmail}?subject=Hello from QR code`)}`}
                      alt="QR Code for email contact"
                      className="mx-auto rounded-2xl shadow-lg"
                      loading="lazy"
                    />
                    <p className={`mt-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Scan to send me an email instantly</p>
                  </div>
                  <motion.button onClick={() => setShowQR(false)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full mt-6 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-semibold">
                    Close
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Status & Response Time */}
        <motion.div className="mt-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-3 h-3 bg-green-500 rounded-full" />
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Usually online 7–10 PM JST (Working hours: 9 AM–6 PM JST)
              </span>
            </div>
          </div>

          <div className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"} max-w-2xl mx-auto`}>
            <p>
              💡 <strong>Response Time:</strong> I can reply to email most times, and you can typically expect a response within about <strong>2–3 hours</strong>.
              For time-sensitive matters, please call or send a WhatsApp message during <strong>7–10 PM JST</strong> for the best chance to reach me live.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
