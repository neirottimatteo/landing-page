document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('logo-animation-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // --- NUOVA LOGICA DI SCALING (Base + Densità) ---
    // Non usiamo più solo PARTICLE_DENSITY.
    // Garantiamo un numero minimo di pallini, e ne aggiungiamo altri in base allo spazio.
    const MIN_PARTICLES_BASE = 12; // Numero minimo garantito di pallini (per schermi piccoli/iPhone)
    const PARTICLE_DENSITY_FACTOR = 70000; // Aggiungi 1 pallino ogni 70.000 pixel di area (sopra la base)
    let targetParticleCount = 0; 
    // --- FINE NUOVA LOGICA ---

    const particles = []; 
    const LINE_FADE_SPEED = 0.004; 
    const PARTICLE_BASE_SPEED = 0.75; 
    const PARTICLE_SPEED_VARIANCE = 0.4; 
    const MAX_ANGULAR_VELOCITY = 0.04; 
    const ANGULAR_CHANGE_RATE = 0.007; 

    const particleColors = [
        'rgba(0, 114, 255, 1)', 
        'rgba(0, 150, 255, 1)', 
        'rgba(0, 198, 255, 1)', 
        'rgba(0, 100, 200, 1)'  
    ];

    let repulsionZones = []; 

    function updateRepulsionZone() {
        repulsionZones = []; 
        const textElements = document.querySelectorAll('.hero-content .gradient-text');

        textElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0) { 
                repulsionZones.push({
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    centerX: rect.left + rect.width / 2,
                    centerY: rect.top + rect.height / 2,
                    influenceRadius: (Math.max(rect.width, rect.height) / 2) + 60 
                });
            }
        });
    }

    // Questa funzione ora calcola anche il numero di particelle necessarie
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const area = canvas.width * canvas.height;
        
        // --- CALCOLO AGGIORNATO (Base + Scalabilità) ---
        targetParticleCount = MIN_PARTICLES_BASE + Math.floor(area / PARTICLE_DENSITY_FACTOR);
        // --- FINE CALCOLO ---

        updateRepulsionZone();
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Chiamata iniziale

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            const side = Math.floor(Math.random() * 4);
            switch (side) {
                case 0: // Top
                    this.x = Math.random() * canvas.width;
                    this.y = -5; 
                    break;
                case 1: // Right
                    this.x = canvas.width + 5; 
                    this.y = Math.random() * canvas.height;
                    break;
                case 2: // Bottom
                    this.x = Math.random() * canvas.width;
                    this.y = canvas.height + 5; 
                    break;
                case 3: // Left
                    this.x = -5; 
                    this.y = Math.random() * canvas.height;
                    break;
            }

            this.radius = 3.5 + Math.random() * 1.5; 
            this.color = particleColors[Math.floor(Math.random() * particleColors.length)]; 

            this.speed = PARTICLE_BASE_SPEED + Math.random() * PARTICLE_SPEED_VARIANCE;

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const angleToCenter = Math.atan2(centerY - this.y, centerX - this.x);
            const spread = Math.PI; 
            this.angle = angleToCenter + (Math.random() - 0.5) * spread;

            this.angularVelocity = (Math.random() - 0.5) * MAX_ANGULAR_VELOCITY * 0.5; 

            this.trail = [];
            this.maxTrailLength = 300 + Math.random() * 100; 
            this.lineThickness = 1.5 + Math.random() * 0.5; 
        }

        update() {
            // Logica di repulsione
            if (repulsionZones.length > 0) {
                repulsionZones.forEach(zone => {
                    const dx = this.x - zone.centerX;
                    const dy = this.y - zone.centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < zone.influenceRadius) {
                        const repulsionForce = (1 - dist / zone.influenceRadius) * 0.15; 
                        this.angle += (Math.atan2(dy, dx) - this.angle) * repulsionForce; 
                    }
                });
            }

            // Logica movimento curvo
            if (Math.random() < ANGULAR_CHANGE_RATE) {
                this.angularVelocity = (Math.random() - 0.5) * MAX_ANGULAR_VELOCITY;
            }
            this.angle += this.angularVelocity;

            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

            this.trail.push({ x: this.x, y: this.y, opacity: 1 });

            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
            this.trail.forEach(segment => {
                segment.opacity -= LINE_FADE_SPEED;
            });
            this.trail = this.trail.filter(segment => segment.opacity > 0);

            if (this.x < -100 || this.x > canvas.width + 100 || this.y < -100 || this.y > canvas.height + 100) {
                this.reset();
            }
        }

        draw() {
            // Disegna scia
            if (this.trail.length > 1) {
                for (let i = 0; i < this.trail.length - 1; i++) {
                    const p1 = this.trail[i];
                    const p2 = this.trail[i + 1];

                    const lineGradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                    lineGradient.addColorStop(0, `rgba(0, 114, 255, ${p1.opacity * 0.7})`); 
                    lineGradient.addColorStop(1, `rgba(0, 198, 255, ${p1.opacity * 0.7})`); 

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    
                    ctx.strokeStyle = lineGradient;
                    ctx.lineWidth = this.lineThickness;
                    ctx.stroke();
                }
            }

            // Disegna pallino
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }


    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 

        // Gestione dinamica dei pallini
        while (particles.length < targetParticleCount) {
            particles.push(new Particle());
        }
        while (particles.length > targetParticleCount) {
            particles.pop();
        }

        // Aggiorna e disegna i pallini esistenti
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        animationFrameId = requestAnimationFrame(animate); 
    }

    animate(); 

    const heroSection = document.querySelector('.hero-bg');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animationFrameId) animate(); 
            } else {
                cancelAnimationFrame(animationFrameId); 
                animationFrameId = null;
            }
        });
    }, { threshold: 0.1 }); 
    observer.observe(heroSection);
});