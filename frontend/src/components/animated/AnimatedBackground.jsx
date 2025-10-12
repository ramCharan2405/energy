import { useEffect, useRef } from "react";

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Particle class
    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.color = Math.random() > 0.5 ? "0, 255, 65" : "0, 240, 255"; // neon-green or neon-cyan
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around edges
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${this.color}, ${this.opacity})`;
      }
    }

    // Create particles
    const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    let animationFrameId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.strokeStyle = `rgba(0, 255, 65, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      {/* Animated gradient background */}
      <div className="fixed inset-0 z-0 animated-gradient" />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ opacity: 0.6 }}
      />

      {/* Animated waves */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div
          className="absolute top-0 left-0 w-[200%] h-full wave"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.1), transparent)",
          }}
        />
        <div
          className="absolute top-0 left-0 w-[200%] h-full wave"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.1), transparent)",
          }}
        />
        <div
          className="absolute top-0 left-0 w-[200%] h-full wave"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(179, 0, 255, 0.05), transparent)",
          }}
        />
      </div>

      {/* Radial gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 animate-pulse-slow"
          style={{
            background:
              "radial-gradient(circle, rgba(0, 255, 65, 0.3), transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-10 animate-pulse-slow"
          style={{
            background:
              "radial-gradient(circle, rgba(0, 240, 255, 0.3), transparent 70%)",
            filter: "blur(60px)",
            animationDelay: "1s",
          }}
        />
      </div>
    </>
  );
};

export default AnimatedBackground;
