import { useRef, useState } from "react";

type SwipeHandlers = {
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
};

/** Manages left-reveal mobile row actions with a matching close-on-right-swipe gesture. */
export function useSwipeActions(actionWidth: number) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startOffset = useRef(0);
  const axis = useRef<"x" | "y" | null>(null);
  const snapThreshold = actionWidth / 2;

  const handleTouchStart = (event: React.TouchEvent) => {
    startX.current = event.touches[0].clientX;
    startY.current = event.touches[0].clientY;
    startOffset.current = offset;
    axis.current = null;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const deltaX = event.touches[0].clientX - startX.current;
    const deltaY = event.touches[0].clientY - startY.current;

    if (axis.current == null) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      axis.current = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
      if (axis.current === "x") {
        setIsDragging(true);
      }
    }

    if (axis.current !== "x") return;
    const nextOffset = Math.max(Math.min(startOffset.current + deltaX, 0), -actionWidth);
    setOffset(nextOffset);
  };

  const handleTouchEnd = () => {
    if (axis.current === "x") {
      setIsDragging(false);
      setOffset((currentOffset) => (currentOffset < -snapThreshold ? -actionWidth : 0));
    }
    startX.current = null;
    startY.current = null;
    axis.current = null;
  };

  const bind: SwipeHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
  };

  return { offset, isDragging, bind };
}
