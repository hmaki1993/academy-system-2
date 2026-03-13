
/**
 * Utility to extract the dominant color from an image URL using Canvas.
 * Useful for building "AI-driven" dynamic themes.
 */
export async function getDominantColor(imageUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let r = 0, g = 0, b = 0, count = 0;

                // Sample every 10th pixel for performance
                for (let i = 0; i < imageData.length; i += 40) {
                    const alpha = imageData[i + 3];
                    // Skip transparent/too dark/too light pixels for better "brand" color
                    if (alpha > 128) {
                        const pr = imageData[i];
                        const pg = imageData[i + 1];
                        const pb = imageData[i + 2];
                        
                        // Heuristic to ignore extreme whites/blacks
                        const brightness = (pr + pg + pb) / 3;
                        if (brightness > 30 && brightness < 230) {
                            r += pr;
                            g += pg;
                            b += pb;
                            count++;
                        }
                    }
                }

                if (count === 0) return resolve(null);

                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);

                const toHex = (c: number) => c.toString(16).padStart(2, '0');
                resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
            } catch (e) {
                console.warn('Could not extract image data (CORS?)', e);
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
}

/**
 * Adjusts a hex color's lightness.
 */
export function adjustColor(color: string, amount: number): string {
    return '#' + color.replace(/^#/, '').replace(/../g, color => 
        ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}
