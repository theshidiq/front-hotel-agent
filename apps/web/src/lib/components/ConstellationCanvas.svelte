<script lang="ts">
    import { onMount } from "svelte";

    let canvas: HTMLCanvasElement;
    let animId: number;

    const NAVY_RGB = "26,39,68";
    const GOLD_RGB = "184,149,106";

    onMount(() => {
        const isMobile = window.innerWidth < 768;
        const NODE_COUNT = isMobile ? 40 : 85;
        const MAX_DIST = 140;
        const SPEED = 0.45;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            if (!canvas.parentElement) return;
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // build nodes — 15% are sparkle type
        const nodes = Array.from({ length: NODE_COUNT }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * SPEED,
            vy: (Math.random() - 0.5) * SPEED,
            r: Math.random() < 0.15 ? 3 : 1.5,
            isSparkle: Math.random() < 0.15,
        }));

        const drawSparkle = (x: number, y: number, r: number) => {
            const arm = r * 3.5;
            const diag = arm * 0.6;
            // gold cardinal arms
            ctx.strokeStyle = `rgba(${GOLD_RGB},0.65)`;
            ctx.lineWidth = 1;
            [
                [arm, 0],
                [0, arm],
                [-arm, 0],
                [0, -arm],
            ].forEach(([ex, ey]) => {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + ex, y + ey);
                ctx.stroke();
            });
            // navy diagonal arms
            ctx.strokeStyle = `rgba(${NAVY_RGB},0.45)`;
            [
                [diag, diag],
                [-diag, diag],
                [diag, -diag],
                [-diag, -diag],
            ].forEach(([ex, ey]) => {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + ex, y + ey);
                ctx.stroke();
            });
        };

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // lines
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dist = Math.hypot(
                        nodes[i].x - nodes[j].x,
                        nodes[i].y - nodes[j].y,
                    );
                    if (dist < MAX_DIST) {
                        const t = 1 - dist / MAX_DIST;
                        const op = (0.08 + t * 0.42).toFixed(2);
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(${NAVY_RGB},${op})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // nodes
            nodes.forEach((n) => {
                if (n.isSparkle) drawSparkle(n.x, n.y, n.r);

                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = n.isSparkle
                    ? `rgba(${GOLD_RGB},0.70)`
                    : `rgba(${NAVY_RGB},0.50)`;
                ctx.fill();

                // move + bounce
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
            });

            animId = requestAnimationFrame(tick);
        };

        tick();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    });
</script>

<canvas
    bind:this={canvas}
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;"
></canvas>
