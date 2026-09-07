import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CART_FLY_EVENT, getVisibleCartTarget, type CartAnimationRect, type CartFlyEventDetail } from "../lib/cartAnimation";

interface CartFlight extends CartFlyEventDetail {
  id: number;
  endRect: CartAnimationRect;
}

const buildTargetRect = (targetRect: DOMRect): CartAnimationRect => {
  const size = Math.max(Math.min(targetRect.width, targetRect.height) * 0.34, 28);

  return {
    left: targetRect.left + targetRect.width / 2 - size / 2,
    top: targetRect.top + targetRect.height / 2 - size / 2,
    width: size,
    height: size,
  };
};

export function CartFlyToIcon() {
  const [flights, setFlights] = useState<CartFlight[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const handleFlight = (event: Event) => {
      const detail = (event as CustomEvent<CartFlyEventDetail>).detail;
      if (!detail?.imageUrl) return;

      const target = getVisibleCartTarget();
      if (!target) return;

      const id = Date.now() + Math.random();
      const endRect = buildTargetRect(target.getBoundingClientRect());

      setFlights((current) => [
        ...current,
        {
          ...detail,
          id,
          endRect,
        },
      ]);

      const timer = window.setTimeout(() => {
        setFlights((current) => current.filter((flight) => flight.id !== id));
      }, 1500);

      timersRef.current.push(timer);
    };

    window.addEventListener(CART_FLY_EVENT, handleFlight as EventListener);

    return () => {
      window.removeEventListener(CART_FLY_EVENT, handleFlight as EventListener);
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      <AnimatePresence>
        {flights.map((flight) => {
          const deltaX = flight.endRect.left - flight.startRect.left;
          const deltaY = flight.endRect.top - flight.startRect.top;
          const travelDistance = Math.hypot(deltaX, deltaY);
          const duration = Math.min(Math.max(travelDistance / 760, 0.95), 1.28);
          const arcLift = -Math.min(Math.max(travelDistance * 0.12, 46), 118);
          const scale = Math.max(
            Math.min(
              flight.endRect.width / Math.max(flight.startRect.width, 1),
              flight.endRect.height / Math.max(flight.startRect.height, 1),
            ),
            0.16,
          );

          return (
            <motion.div
              key={flight.id}
              initial={{ x: 0, y: 0, scale: 1, opacity: 0.96 }}
              animate={{
                x: deltaX,
                y: deltaY,
                scale,
                opacity: [0.96, 0.98, 0.18],
              }}
              exit={{ opacity: 0 }}
              transition={{
                x: { duration, ease: [0.18, 0.84, 0.24, 1] },
                y: { duration, ease: [0.18, 0.84, 0.24, 1] },
                scale: { duration, ease: [0.16, 0.84, 0.22, 1] },
                opacity: { duration, times: [0, 0.72, 1], ease: "linear" },
              }}
              className="absolute will-change-transform"
              style={{
                left: flight.startRect.left,
                top: flight.startRect.top,
                width: flight.startRect.width,
                height: flight.startRect.height,
                transformOrigin: "top left",
              }}
            >
              <motion.div
                animate={{
                  y: [0, arcLift, 0],
                  rotate: [0, -7, 9],
                  scale: [1, 1.04, 0.94],
                }}
                transition={{
                  y: { duration, times: [0, 0.56, 1], ease: [0.28, 0.02, 0.2, 1] },
                  rotate: { duration, times: [0, 0.55, 1], ease: "easeInOut" },
                  scale: { duration, times: [0, 0.52, 1], ease: [0.22, 1, 0.36, 1] },
                }}
                className="relative h-full w-full"
              >
                <div className="absolute inset-0 rounded-[1.6rem] bg-white/50 blur-[1px]" />
                <img
                  src={flight.imageUrl}
                  alt=""
                  className="relative h-full w-full rounded-[1.45rem] object-cover shadow-[0_22px_44px_rgba(16,35,23,0.24)]"
                />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
