// Force scroll restoration to manual and scroll to top immediately on load
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Canvas Setup & Configuration
const canvas = document.getElementById('scroll-canvas');
const ctx = canvas.getContext('2d');

const frameCount = 129;
const images = [];
let loadedCount = 0;

// Construct image paths
const currentFrame = index => {
    // Frames are 1-indexed: ezgif-frame-001.jpg to ezgif-frame-129.jpg
    const frameNum = index.toString().padStart(3, '0');
    return `ezgif-521bd3846cb70670-jpg/ezgif-frame-${frameNum}.jpg`;
};

// Lerp Easing Variables for Butter-Smooth Scrolling
let currentFrameIndex = 1;
let targetFrameIndex = 1;
const easing = 0.08; // Adjust to make the scroll transition slower/smoother (0.01 - 0.1)

// Preload all frames to memory with simulated minimum pacing to enjoy the loader animation
function preloadImages(callback) {
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    const loader = document.getElementById('loader');
    const loaderTitle = document.getElementById('loader-title-text');

    // 1. Split letters of loader title for the handwriting/typing fade-in animation
    if (loaderTitle) {
        const nameText = loaderTitle.textContent;
        loaderTitle.innerHTML = nameText.split('').map((char, index) => {
            const displayChar = char === ' ' ? '&nbsp;' : char;
            // Delay each letter by 120ms to slowly draw the name on screen
            return `<span style="animation-delay: ${index * 0.12}s">${displayChar}</span>`;
        }).join('');
    }

    let simulatedProgress = 0;
    let actualImagesLoaded = false;

    // Start fetching the 129 frames in background
    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        
        img.onload = () => {
            loadedCount++;
            if (loadedCount === frameCount) {
                actualImagesLoaded = true;
            }
        };

        img.onerror = () => {
            console.error(`Failed to load frame path: ${img.src}`);
            loadedCount++; // Increment to avoid blocking
            if (loadedCount === frameCount) {
                actualImagesLoaded = true;
            }
        };

        images.push(img);
    }

    // 2. Slow paced progress loop (increases progress smoothly over ~3.5 seconds)
    const paceInterval = setInterval(() => {
        let increment = 1;
        
        // Slow down the rate near 90% to simulate realistic server loading
        if (simulatedProgress >= 90) {
            increment = 0.45;
        }

        if (simulatedProgress < 100) {
            simulatedProgress += increment;
            const displayProgress = Math.min(100, Math.floor(simulatedProgress));
            if (loaderBar) loaderBar.style.width = `${displayProgress}%`;
            if (loaderText) loaderText.textContent = `Loading experience ${displayProgress}%`;
        }

        // Only transition to active page when simulated progress hits 100 AND frames are preloaded
        if (simulatedProgress >= 100 && actualImagesLoaded) {
            clearInterval(paceInterval);
            setTimeout(() => {
                if (loader) {
                    loader.classList.add('fade-out');
                }
                callback();
            }, 600); // 600ms visual buffer to enjoy the completed state
        }
    }, 28); // 28ms * 100 steps = 2800ms baseline (2.8s) + slowing down makes it ~3.5 seconds total!
}

// Draw Image Prop (CSS Object-Fit Cover behavior in Canvas)
function drawImageProp(ctx, img, x, y, w, h, offsetX = 0.5, offsetY = 0.5) {
    var iw = img.width,
        ih = img.height,
        r = Math.min(w / iw, h / ih),
        nw = iw * r,
        nh = ih * r,
        cx, cy, cw, ch, ar = 1;

    if (nw < w) ar = w / nw;                             
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;
    nw *= ar;
    nh *= ar;

    cw = iw / (nw / w);
    ch = ih / (nh / h);

    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
}

// Adjust Canvas sizing to prevent blurring on Retina / High-DPI screens
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    
    // Scale context drawing coordinates to CSS dimensions
    ctx.scale(dpr, dpr);
    
    // Draw current frame immediately to prevent blank flashing
    drawFrame(Math.round(currentFrameIndex));
}

// Draw specific frame
function drawFrame(index) {
    // Frame array is 0-indexed, so map frame number i (1-129) to index (0-128)
    const imgIndex = Math.max(0, Math.min(frameCount - 1, index - 1));
    const img = images[imgIndex];
    if (img && img.complete) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        drawImageProp(ctx, img, 0, 0, window.innerWidth, window.innerHeight);
    }
}

// Update Scroll Progress Mapping
function updateScrollProgress() {
    const html = document.documentElement;
    const scrollTop = window.scrollY || html.scrollTop;
    // We substract a bit of scroll height to ensure frame transitions match scroll distance
    const scrollHeight = html.scrollHeight - window.innerHeight;
    
    if (scrollHeight <= 0) return;
    
    const scrollFraction = scrollTop / scrollHeight;
    // Map scroll percentage (0.0 to 1.0) to frame index (1 to 129)
    targetFrameIndex = Math.max(1, Math.min(frameCount, Math.floor(scrollFraction * frameCount) + 1));
}

// Slowly glow timeline items as we scroll down
function updateTimelineGlow() {
    const items = document.querySelectorAll('.timeline-item');
    const triggerPoint = window.innerHeight * 0.75;
    
    items.forEach(item => {
        const top = item.getBoundingClientRect().top;
        if (top < triggerPoint) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Eased Animation Loop (runs at 60fps)
function animate() {
    // Lerp: value = value + (target - value) * easing
    currentFrameIndex += (targetFrameIndex - currentFrameIndex) * easing;
    
    // Only redraw if the rounded index changed to save GPU cycles
    drawFrame(Math.round(currentFrameIndex));
    
    requestAnimationFrame(animate);
}

// Start Application Lifecycle
preloadImages(() => {
    // Ensure we are scrolled to the top when the loading screen completes
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Initialize Canvas Dimensions
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Listen to scroll actions
    window.addEventListener('scroll', () => {
        updateScrollProgress();
        updateTimelineGlow();
    });
    updateScrollProgress();
    updateTimelineGlow();
    
    // Kickoff the frame rendering loop
    requestAnimationFrame(animate);
    
    // Set up Interaction Observers for beautiful section fade-ins
    setupIntersectionObservers();
});

// Setup Intersection Observers to trigger card reveals
function setupIntersectionObservers() {
    const sections = document.querySelectorAll('.scroll-section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    const observerOptions = {
        root: null,
        rootMargin: '-10% 0px -20% 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Highlight active nav item
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
        // Explicitly trigger active check for the first hero section
        if (section.id === 'hero') {
            section.classList.add('visible');
        }
    });
}

