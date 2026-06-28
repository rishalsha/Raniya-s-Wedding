import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Sparkles, 
  Check, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Gift, 
  Info,
  Compass
} from "lucide-react";
import { collection, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<"idle" | "yes" | "no">("idle");
  const [guestCount, setGuestCount] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(() => {
    const a = new Audio("https://assets.mixkit.co/music/preview/mixkit-beautiful-dream-2436.mp3");
    a.loop = true;
    return a;
  });

  // Copied address state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Time remaining state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Response live statistics
  const [stats, setStats] = useState({
    yesCount: 0,
    noCount: 0,
    totalGuests: 0
  });

  // Handle countdown calculation
  useEffect(() => {
    const targetDate = new Date("2026-08-15T16:00:00");
    
    const updateCountdown = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync play/pause state with audio element
  useEffect(() => {
    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, audio]);

  // Try to start music on first user interaction to bypass browser autoplay blocks
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!isPlaying) {
        setIsPlaying(true);
      }
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [isPlaying]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audio.pause();
    };
  }, [audio]);

  // Canvas confetti effect for RSVPs
  useEffect(() => {
    if (!isSubmitted || rsvpStatus !== "yes") return;

    const canvas = document.getElementById("confetti-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ["#D4AF37", "#8B754E", "#FAF8F5", "#E1D7C5", "#F3E5AB"];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 5 + 3,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0
      });
    }

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      let active = false;
      particles.forEach(p => {
        if (p.y < canvas.height) active = true;
      });

      if (active) {
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isSubmitted, rsvpStatus]);

  const handleCopyAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Set up real-time listener for wedding responses
  useEffect(() => {
    const rsvpCollection = collection(db, "rsvps");
    
    const unsubscribe = onSnapshot(rsvpCollection, (snapshot) => {
      let yes = 0;
      let no = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.attending === true) {
          yes += 1;
        } else if (data.attending === false) {
          no += 1;
        }
      });
      
      setStats({
        yesCount: yes,
        noCount: no,
        totalGuests: yes
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "rsvps");
    });
    
    return () => unsubscribe();
  }, []);

  // Automatically fade out splash screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4500); // 4.5 seconds for elegant, readable introduction
    return () => clearTimeout(timer);
  }, []);

  const handleRSVPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rsvpStatus === "idle") return;

    setIsSubmitting(true);
    try {
      const rsvpCollection = collection(db, "rsvps");
      await addDoc(rsvpCollection, {
        attending: rsvpStatus === "yes",
        createdAt: serverTimestamp(),
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting response:", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, "rsvps");
      } catch (formattedError) {
        // Log formatted error details
      }
      alert("Could not save your response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C2925] font-sans selection:bg-[#E8DFD3] selection:text-[#8B754E] relative overflow-x-hidden">
      
      {/* Decorative Top Accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] fixed top-0 left-0 z-50" />

      <AnimatePresence mode="wait">
        {showSplash ? (
          /* Elegant Bismillah Intro Splash Screen */
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 bg-[#FAF8F5] z-50 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="max-w-xl flex flex-col items-center justify-center space-y-8">
              {/* Gold Ornament Frame top */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 1 }}
                className="w-16 h-16 flex items-center justify-center text-[#D4AF37]"
              >
                <svg viewBox="0 0 100 100" className="w-12 h-12 fill-current">
                  <path d="M50 0 C60 25 75 40 100 50 C75 60 60 75 50 100 C40 75 25 60 0 50 C25 40 40 25 50 0 Z" />
                </svg>
              </motion.div>

              {/* Bismillah Calligraphy */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 1.2 }}
                className="space-y-4"
              >
                <p className="font-arabic text-3xl md:text-5xl text-[#8B754E] tracking-wide leading-relaxed">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <div className="h-[1px] w-24 bg-[#D4AF37] mx-auto opacity-60" />
                <p className="font-serif italic text-sm md:text-lg text-[#5C564E] tracking-wider font-light mt-4 px-4 leading-relaxed">
                  "In the name of Allah, the Most Gracious, the Most Merciful"
                </p>
              </motion.div>

              {/* Graceful footer tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.8, duration: 1 }}
                className="font-cinzel text-xs tracking-[0.2em] text-[#8B754E] pt-12 uppercase"
              >
                You are warmly invited to witness our union
              </motion.p>
            </div>
          </motion.div>
        ) : (
          /* Main Beautiful Wedding Invitation */
          <motion.div
            key="main-invitation"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pb-24 pt-12 px-4 max-w-4xl mx-auto flex flex-col items-center"
          >
            {/* Header Ornament decoration */}
            <div className="flex flex-col items-center text-center space-y-4 mb-8 w-full max-w-2xl">
              <span className="font-cinzel text-xs md:text-sm tracking-[0.3em] text-[#8B754E] font-medium uppercase">
                بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
              </span>
              <div className="flex items-center space-x-3 text-[#D4AF37]">
                <div className="h-[1px] w-12 bg-[#D4AF37]/50" />
                <Sparkles className="w-4 h-4" />
                <div className="h-[1px] w-12 bg-[#D4AF37]/50" />
              </div>
            </div>

            {/* Sacred Quranic Love Verse */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/60 border border-[#EBE6DD]/60 rounded-2xl p-6 md:p-8 text-center max-w-2xl shadow-sm mb-12 relative overflow-hidden backdrop-blur-sm"
            >
              {/* Corner delicate golden frames */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-[#D4AF37]/40" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-[#D4AF37]/40" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#D4AF37]/40" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#D4AF37]/40" />

              <p className="font-arabic text-xl md:text-2xl text-[#8B754E] leading-loose mb-4">
                وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا لِتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً ۚ
              </p>
              <p className="font-serif italic text-xs md:text-sm text-[#6E675E] leading-relaxed max-w-xl mx-auto">
                "And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy. Indeed in that are signs for a people who give thought."
              </p>
              <p className="font-sans text-[10px] text-[#A69C8E] uppercase tracking-wider mt-3">
                — Surah Ar-Rum [30:21]
              </p>
            </motion.div>

            {/* Wedding Hosts & Announcement */}
            <div className="text-center space-y-4 max-w-2xl mb-12">
              <span className="font-serif italic text-base text-[#8B754E] block">
                With the divine grace & blessings of Almighty Allah
              </span>
              <h3 className="font-cinzel text-xl md:text-2xl text-[#2C2925] tracking-wide font-medium">
                Sulaikha &amp; Abdul Rasheed
              </h3>
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#8B754E]">
                Cordially invite you to celebrate the wedding of their beloved daughter
              </p>
            </div>

            {/* Bride & Groom Centerpiece Card */}
            <div className="w-full max-w-2xl bg-[#FFFDF9] border border-[#EAE3D5] rounded-3xl p-8 md:p-12 shadow-md relative text-center mb-16 overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1.2px,transparent_1.2px)] [background-size:16px_16px]" />
              
              <div className="relative space-y-6">
                
                {/* Sis Name (Bride) */}
                <div className="space-y-1">
                  <span className="font-cinzel text-xs tracking-[0.25em] text-[#A69C8E] uppercase block">The Bride</span>
                  <h1 className="font-serif text-3xl md:text-5xl font-semibold text-[#8B754E] tracking-wide">
                    Raniya Parveen
                  </h1>
                </div>

                {/* Elegant separator */}
                <div className="flex items-center justify-center space-x-4 my-2">
                  <div className="h-[1px] w-16 bg-[#E1D7C5]" />
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="p-2.5 bg-[#FAF8F5] border border-[#EAE3D5] rounded-full text-[#D4AF37]"
                  >
                    <Heart className="w-5 h-5 fill-current" />
                  </motion.div>
                  <div className="h-[1px] w-16 bg-[#E1D7C5]" />
                </div>

                {/* Groom Name */}
                <div className="space-y-1">
                  <span className="font-cinzel text-xs tracking-[0.25em] text-[#A69C8E] uppercase block">The Groom</span>
                  <h1 className="font-serif text-3xl md:text-5xl font-semibold text-[#8B754E] tracking-wide">
                    Ismail
                  </h1>
                </div>

                <div className="pt-6">
                  <div className="inline-flex items-center space-x-2 bg-[#FAF8F5] border border-[#EBE6DD] px-5 py-2 rounded-full">
                    <Calendar className="w-4 h-4 text-[#8B754E]" />
                    <span className="font-cinzel text-xs md:text-sm tracking-wider text-[#5C564E] font-medium">
                      August 15 &amp; 16, 2026
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Real-time Countdown Timer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-2xl bg-white/60 border border-[#EAE3D5] rounded-2xl p-6 shadow-sm mb-16 relative overflow-hidden backdrop-blur-sm text-center"
            >
              <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                <div className="bg-[#FFFDF9] border border-[#EAE3D5] rounded-xl p-2.5 shadow-sm">
                  <span className="font-serif text-xl md:text-3xl font-semibold text-[#8B754E] block">{timeLeft.days}</span>
                  <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-[#A69C8E] font-medium block">Days</span>
                </div>
                <div className="bg-[#FFFDF9] border border-[#EAE3D5] rounded-xl p-2.5 shadow-sm">
                  <span className="font-serif text-xl md:text-3xl font-semibold text-[#8B754E] block">{timeLeft.hours}</span>
                  <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-[#A69C8E] font-medium block">Hours</span>
                </div>
                <div className="bg-[#FFFDF9] border border-[#EAE3D5] rounded-xl p-2.5 shadow-sm">
                  <span className="font-serif text-xl md:text-3xl font-semibold text-[#8B754E] block">{timeLeft.minutes}</span>
                  <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-[#A69C8E] font-medium block">Mins</span>
                </div>
                <div className="bg-[#FFFDF9] border border-[#EAE3D5] rounded-xl p-2.5 shadow-sm">
                  <span className="font-serif text-xl md:text-3xl font-semibold text-[#8B754E] block">{timeLeft.seconds}</span>
                  <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-[#A69C8E] font-medium block">Secs</span>
                </div>
              </div>
              <p className="font-cinzel text-[10px] tracking-widest text-[#8B754E] uppercase font-semibold mt-3">
                Remaining until the Nikah Ceremony
              </p>
            </motion.div>


            {/* Event Timeline Header */}
            <div className="text-center space-y-2 mb-10">
              <h2 className="font-cinzel text-2xl text-[#2C2925] tracking-wider font-semibold">
                Celebration Details
              </h2>
              <p className="font-serif italic text-sm text-[#8B754E]">
                Two Days of Joy and Sacred Blessings
              </p>
              <div className="h-0.5 w-16 bg-[#D4AF37]/50 mx-auto mt-2" />
            </div>

            {/* Celebration Grid timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mb-16">
              
              {/* Day 1 Card: August 15 (Nikah & Night) */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white border border-[#EBE6DD] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="bg-[#FAF8F5] text-[#8B754E] border border-[#EAE3D5] text-[11px] font-cinzel tracking-wider px-3 py-1 rounded-full font-medium">
                      Day 1 · Saturday
                    </span>
                    <span className="font-serif text-sm font-semibold text-[#8B754E]">
                      August 15
                    </span>
                  </div>

                  <h3 className="font-cinzel text-lg text-[#2C2925] font-semibold tracking-wide border-b border-[#FAF8F5] pb-3 mb-4">
                    The Nikah Ceremony
                  </h3>

                  <div className="space-y-5">
                    {/* Event 1: Nikah */}
                    <div className="flex items-start space-x-3">
                      <div className="p-1.5 bg-[#FAF8F5] rounded-lg text-[#8B754E] mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#8B754E] uppercase tracking-wider">Nikah In the Evening</p>
                        <p className="font-serif text-sm text-[#2C2925] font-semibold mt-0.5">4:00 PM</p>
                        <p className="text-xs text-[#6E675E] mt-0.5 font-sans">
                          Irinave Juma Masjid
                        </p>
                        {/* Map & Copy Address Buttons */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <a 
                            href="https://maps.app.goo.gl/fNEXAay2Kgb7h7Ek7"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 text-xs text-[#8B754E] hover:text-[#2C2925] font-medium bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#EBE6DD] transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Masjid Location</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyAddress("Irinave Juma Masjid, Irinave, Kannur, Kerala", "masjid")}
                            className="inline-flex items-center space-x-1.5 text-xs text-[#8B754E] hover:text-[#2C2925] font-medium bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#EBE6DD] transition-colors"
                          >
                            {copiedId === "masjid" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-green-600 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Compass className="w-3.5 h-3.5" />
                                <span>Copy Address</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="h-[1px] w-full bg-[#FAF8F5]" />

                    {/* Event 2: Night celebration */}
                    <div className="flex items-start space-x-3">
                      <div className="p-1.5 bg-[#FAF8F5] rounded-lg text-[#8B754E] mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#8B754E] uppercase tracking-wider">Night Celebration</p>
                        <p className="font-serif text-sm text-[#2C2925] font-semibold mt-0.5">7:00 PM Onwards</p>
                        <p className="text-xs text-[#6E675E] mt-0.5 font-sans">
                          Our Home (Near Irinave Juma Masjid)
                        </p>
                        {/* Map & Copy Address Buttons */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <a 
                            href="https://maps.app.goo.gl/A22VZZfvej7sUYqNA?g_st=ac"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 text-xs text-[#8B754E] hover:text-[#2C2925] font-medium bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#EBE6DD] transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Wedding Venue Direction</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyAddress("Near Irinave Juma Masjid, Irinave, Kannur, Kerala", "home1")}
                            className="inline-flex items-center space-x-1.5 text-xs text-[#8B754E] hover:text-[#2C2925] font-medium bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#EBE6DD] transition-colors"
                          >
                            {copiedId === "home1" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-green-600 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Compass className="w-3.5 h-3.5" />
                                <span>Copy Address</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>

              {/* Day 2 Card: August 16 (Lunch) */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white border border-[#EBE6DD] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="bg-[#FAF8F5] text-[#8B754E] border border-[#EAE3D5] text-[11px] font-cinzel tracking-wider px-3 py-1 rounded-full font-medium">
                      Day 2 · Sunday
                    </span>
                    <span className="font-serif text-sm font-semibold text-[#8B754E]">
                      August 16
                    </span>
                  </div>

                  <h3 className="font-cinzel text-lg text-[#2C2925] font-semibold tracking-wide border-b border-[#FAF8F5] pb-3 mb-4">
                    The Wedding Feast
                  </h3>

                  <div className="space-y-5">
                    {/* Event: Lunch Feast */}
                    <div className="flex items-start space-x-3">
                      <div className="p-1.5 bg-[#FAF8F5] rounded-lg text-[#8B754E] mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#8B754E] uppercase tracking-wider">Traditional Lunch Feast</p>
                        <p className="font-serif text-sm text-[#2C2925] font-semibold mt-0.5">12:00 PM Onwards</p>
                        <p className="text-xs text-[#6E675E] mt-0.5 font-sans">
                          Our Home (Near Irinave Juma Masjid)
                        </p>
                        <p className="text-[11px] text-[#A69C8E] mt-1 italic font-serif">
                          Followed by celebration wrap-up
                        </p>
                        {/* Map & Copy Address Buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <a 
                            href="https://maps.app.goo.gl/A22VZZfvej7sUYqNA?g_st=ac"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 text-xs text-[#8B754E] hover:text-[#2C2925] font-medium bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#EBE6DD] transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Wedding Venue Direction</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyAddress("Near Irinave Juma Masjid, Irinave, Kannur, Kerala", "home2")}
                            className="inline-flex items-center space-x-1.5 text-xs text-[#8B754E] hover:text-[#2C2925] font-medium bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#EBE6DD] transition-colors"
                          >
                            {copiedId === "home2" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-green-600 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Compass className="w-3.5 h-3.5" />
                                <span>Copy Address</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 text-center mt-6 border-t border-[#FAF8F5]">
                  <p className="font-serif italic text-xs text-[#8B754E]">
                    Your presence and prayers are our greatest gift.
                  </p>
                </div>
              </motion.div>

            </div>

            {/* Interactive Response Area */}
            <div id="rsvp-section" className="w-full max-w-2xl bg-white border border-[#EBE6DD] rounded-3xl p-8 md:p-12 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 text-[#D4AF37]/5 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                  <path d="M50 0 C60 25 75 40 100 50 C75 60 60 75 50 100 C40 75 25 60 0 50 C25 40 40 25 50 0 Z" />
                </svg>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleRSVPSubmit} className="space-y-8">
                  <div className="text-center space-y-2">
                    <span className="font-cinzel text-xs tracking-widest text-[#8B754E] uppercase font-semibold">
                      Honor us with your reply
                    </span>
                    <h2 className="font-serif text-2xl md:text-3xl font-medium text-[#2C2925]">
                      Will you join our celebrations?
                    </h2>
                    <p className="font-sans text-xs text-[#8B754E] italic">
                      Please let us know so we can prepare to receive you warmheartedly
                    </p>
                  </div>

                  {/* Attendance Toggle Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRsvpStatus("yes")}
                      className={`py-4 px-6 rounded-2xl font-cinzel text-xs tracking-wider font-semibold border-2 transition-all duration-300 flex flex-col items-center justify-center space-y-1 ${
                        rsvpStatus === "yes"
                          ? "bg-[#8B754E] text-white border-[#8B754E] shadow-sm scale-[1.02]"
                          : "bg-[#FFFDF9] text-[#5C564E] border-[#EBE6DD] hover:border-[#8B754E]/40"
                      }`}
                    >
                      <span className="text-sm">Yes, In Sha Allah</span>
                      <span className="text-[10px] opacity-80">I will attend</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRsvpStatus("no")}
                      className={`py-4 px-6 rounded-2xl font-cinzel text-xs tracking-wider font-semibold border-2 transition-all duration-300 flex flex-col items-center justify-center space-y-1 ${
                        rsvpStatus === "no"
                          ? "bg-[#5C564E] text-white border-[#5C564E] shadow-sm scale-[1.02]"
                          : "bg-[#FFFDF9] text-[#5C564E] border-[#EBE6DD] hover:border-[#5C564E]/40"
                      }`}
                    >
                      <span className="text-sm">No, Sadly I cannot</span>
                      <span className="text-[10px] opacity-80">I cannot make it</span>
                    </button>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={rsvpStatus === "idle" || isSubmitting}
                      className={`w-full py-4 rounded-2xl font-cinzel text-xs tracking-[0.2em] font-semibold transition-all duration-300 ${
                        rsvpStatus === "idle"
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-[#8B754E] text-white hover:bg-[#725F3E] cursor-pointer shadow-md active:scale-[0.99]"
                      }`}
                    >
                      {isSubmitting ? "Sending reply..." : "Send Blessings & Response"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Thank you screen upon successful reply submission */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8 space-y-6"
                >
                  <div className="w-16 h-16 bg-[#FAF8F5] border border-[#EBE6DD] text-[#8B754E] rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Check className="w-8 h-8" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-serif text-2xl font-medium text-[#2C2925]">
                      {rsvpStatus === "yes" ? "Alhamdulillah! Welcome" : "Thank you for your response"}
                    </h3>
                    <p className="font-serif italic text-sm text-[#8B754E] max-w-md mx-auto">
                      {rsvpStatus === "yes" 
                        ? "Barakallahu lakum! We are overjoyed that you will be sharing this blessed day with us. May Allah bless your path."
                        : "We appreciate you letting us know. We request your precious prayers for Raniya and Ismail as they embark on this sacred journey."
                      }
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitted(false);
                        setRsvpStatus("idle");
                      }}
                      className="font-cinzel text-[10px] tracking-widest text-[#8B754E] uppercase border border-[#EBE6DD] px-4 py-2 rounded-xl hover:bg-[#FAF8F5] transition-colors"
                    >
                      Change response
                    </button>
                  </div>
                </motion.div>
              )}

              {/* LIVE RSVP STATISTICS DISPLAY */}
              <div className="mt-12 pt-8 border-t border-[#FAF8F5] text-center">
                <div className="inline-flex flex-col items-center space-y-2 bg-[#FAF8F5] border border-[#EAE3D5] rounded-2xl px-6 py-4">
                  <div className="flex items-center space-x-2 text-[#8B754E]">
                    <Users className="w-4 h-4" />
                    <span className="font-cinzel text-[10px] tracking-wider uppercase font-semibold">
                      Current Guest Attendance
                    </span>
                  </div>
                  <p className="font-serif text-sm text-[#5C564E]">
                    Alhamdulillah, <strong className="text-[#8B754E] font-semibold">{stats.totalGuests} guests</strong> have responded to attend so far.
                  </p>
                </div>
              </div>

            </div>

            {/* Footer / Warm Greetings */}
            <footer className="mt-20 text-center space-y-6 max-w-md">
              <div className="h-[1px] w-24 bg-[#E1D7C5] mx-auto" />
              <div className="space-y-2">
                <span className="font-cinzel text-[10px] tracking-widest text-[#8B754E] uppercase block">
                  A Prayer for the Union
                </span>
                <p className="font-serif italic text-xs text-[#6E675E] leading-relaxed">
                  "Barakallahu laka wa baraka 'alayka wa jama'a baynakuma fee khayr."<br/>
                  <span className="opacity-75">(May Allah bless you, shower His blessings upon you, and unite you in goodness.)</span>
                </p>
              </div>

              <p className="text-[10px] text-[#A69C8E] uppercase tracking-wider">
                We await your presence and prayers · Sulaikha &amp; Abdul Rasheed
              </p>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Audio Play/Pause Control Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setIsPlaying(!isPlaying)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-white/80 hover:bg-white border border-[#EAE3D5] rounded-full text-[#8B754E] hover:text-[#2C2925] shadow-lg backdrop-blur-md transition-all duration-300 active:scale-95 flex items-center justify-center group"
        aria-label="Toggle background music"
      >
        {isPlaying ? (
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#D4AF37]/20 animate-ping" />
            <Volume2 className="w-5 h-5 relative group-hover:scale-110 transition-transform" />
          </div>
        ) : (
          <VolumeX className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}
      </motion.button>

      {/* Lightweight canvas confetti for RSVP 'Yes' submission */}
      <canvas id="confetti-canvas" className="fixed inset-0 pointer-events-none z-50 w-full h-full" />
    </div>
  );
}
